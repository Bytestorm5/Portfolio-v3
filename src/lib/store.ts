import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Metrics } from "./collector";

const FILENAME = "github-metrics.json";

/**
 * Where the collector writes at runtime. Defaults to the repo's data/ dir,
 * which is what the container deployment uses (mount a volume there to keep
 * snapshots across restarts). On a read-only filesystem, point
 * METRICS_DATA_DIR at a writable path.
 */
function runtimePath(): string {
  const dir = process.env.METRICS_DATA_DIR ?? join(process.cwd(), "data");
  return join(dir, FILENAME);
}

/** The snapshot committed to the repo, used until a collection has run. */
function bundledPath(): string {
  return join(process.cwd(), "data", FILENAME);
}

/**
 * Snapshots written before the public/private split have no `pub`/`priv`
 * buckets. Rather than let those render as NaN, treat their commits as public
 * — the collector that produced them only ever read public repos, so that is
 * what they are. The next collection replaces the file outright.
 */
function normalize(raw: Metrics): Metrics {
  if (raw.weekly[0]?.cumPub !== undefined) return raw;

  let cumPub = 0;
  const weekly = raw.weekly.map((p) => {
    cumPub += p.c;
    return { w: p.w, pub: p.c, priv: 0, c: p.c, cumPub, cumPriv: 0, cum: cumPub };
  });

  return {
    ...raw,
    totals: {
      ...raw.totals,
      publicCommits: raw.totals.publicCommits ?? raw.totals.commits,
      privateCommits: raw.totals.privateCommits ?? 0,
      publicRepos: raw.totals.publicRepos ?? raw.totals.repos,
      privateRepos: raw.totals.privateRepos ?? 0,
    },
    weekly,
  };
}

async function readFrom(path: string): Promise<Metrics | null> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Metrics;
    return parsed?.weekly?.length ? normalize(parsed) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the freshest snapshot available, or null when nothing has ever been
 * collected — callers render an explicit empty state rather than a chart with
 * no data in it.
 */
export async function readSnapshot(): Promise<Metrics | null> {
  return (await readFrom(runtimePath())) ?? (await readFrom(bundledPath()));
}

export type PersistResult = {
  backend: "github" | "filesystem";
  /** False when the data was unchanged and no write was needed. */
  written: boolean;
  detail?: string;
};

const REPO_PATH = "data/github-metrics.json";

/** Everything except the timestamp — two snapshots of the same data match. */
function sameData(a: Metrics, b: Metrics): boolean {
  const strip = (m: Metrics) =>
    JSON.stringify({ ...m, generatedAt: null } satisfies Record<string, unknown>);
  return strip(a) === strip(b);
}

const serialize = (metrics: Metrics) => `${JSON.stringify(metrics, null, 2)}\n`;

/**
 * Commits the snapshot back to the repo through the GitHub contents API.
 *
 * Serverless platforms give functions a read-only filesystem, so there is
 * nowhere durable to write. Committing keeps the data versioned and lets the
 * resulting deploy serve it, which is how the site reads it — no runtime
 * fetch on the render path.
 */
async function writeToGitHub(metrics: Metrics, repo: string): Promise<PersistResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("METRICS_REPO is set but GITHUB_TOKEN is not");

  const branch = process.env.METRICS_GIT_BRANCH ?? "main";
  const base = `https://api.github.com/repos/${repo}/contents/${REPO_PATH}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  let sha: string | undefined;
  const existing = await fetch(`${base}?ref=${encodeURIComponent(branch)}`, { headers });
  if (existing.ok) {
    const body = (await existing.json()) as { sha: string; content: string };
    sha = body.sha;
    try {
      const current = JSON.parse(
        Buffer.from(body.content, "base64").toString("utf8"),
      ) as Metrics;
      // Only the timestamp moved: committing would trigger a pointless
      // rebuild every single day.
      if (sameData(current, metrics)) {
        return { backend: "github", written: false, detail: "data unchanged" };
      }
    } catch {
      // Unparseable existing file — fall through and overwrite it.
    }
  } else if (existing.status !== 404) {
    throw new Error(`GitHub ${existing.status} reading ${REPO_PATH}`);
  }

  const res = await fetch(base, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "chore(metrics): refresh GitHub commit snapshot",
      content: Buffer.from(serialize(metrics)).toString("base64"),
      branch,
      sha,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub ${res.status} writing ${REPO_PATH}: ${await res.text()}`);
  }

  return { backend: "github", written: true, detail: `committed to ${repo}@${branch}` };
}

/** Writes via a temp file + rename so a reader never sees a half-written file. */
async function writeToFile(metrics: Metrics): Promise<PersistResult> {
  const target = runtimePath();
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, serialize(metrics));
  await rename(tmp, target);
  return { backend: "filesystem", written: true, detail: target };
}

/**
 * Persists the snapshot. Set METRICS_REPO (e.g. "Bytestorm5/Portfolio-v3") on
 * a read-only host to commit instead of writing to disk; without it, the
 * filesystem path is used, which suits the container deployment.
 */
export async function writeSnapshot(metrics: Metrics): Promise<PersistResult> {
  const repo = process.env.METRICS_REPO;
  return repo ? writeToGitHub(metrics, repo) : writeToFile(metrics);
}

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

/** Writes via a temp file + rename so a reader never sees a half-written file. */
export async function writeSnapshot(metrics: Metrics): Promise<void> {
  const target = runtimePath();
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(metrics, null, 2)}\n`);
  await rename(tmp, target);
}

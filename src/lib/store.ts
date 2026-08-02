import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { metricsUser, type Metrics } from "./collector.ts";
import { COMMITS_COLLECTION, getDb, mongoConfigured } from "./mongo.ts";

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

/** One document per collected user, upserted in place. */
async function readFromMongo(): Promise<Metrics | null> {
  const db = await getDb();
  return db
    .collection<Metrics>(COMMITS_COLLECTION)
    .findOne(
      { _id: metricsUser() } as Record<string, unknown>,
      // _id is storage bookkeeping, not part of the snapshot the site serves.
      { projection: { _id: 0 } },
    ) as Promise<Metrics | null>;
}

/**
 * Returns the freshest snapshot available, or null when nothing has ever been
 * collected — callers render an explicit empty state rather than a chart with
 * no data in it.
 *
 * Mongo is the source of truth once configured, but a read failure must never
 * break a render or a build: it falls through to the snapshot committed in
 * data/, so the site degrades to slightly stale rather than empty.
 */
export async function readSnapshot(): Promise<Metrics | null> {
  if (mongoConfigured()) {
    try {
      const doc = await readFromMongo();
      if (doc?.weekly?.length) return normalize(doc);
    } catch (error) {
      console.error("[metrics] Mongo read failed, falling back to bundle:", error);
    }
  }
  return (await readFrom(runtimePath())) ?? (await readFrom(bundledPath()));
}

export type PersistResult = {
  backend: "mongodb" | "filesystem";
  written: boolean;
  /** Whether this run actually changed the numbers, for observability. */
  dataChanged?: boolean;
  detail?: string;
};

/** Everything except the timestamp — two snapshots of the same data match. */
function sameData(a: Metrics, b: Metrics): boolean {
  const strip = (m: Metrics) =>
    JSON.stringify({ ...m, generatedAt: null } satisfies Record<string, unknown>);
  return strip(a) === strip(b);
}

const serialize = (metrics: Metrics) => `${JSON.stringify(metrics, null, 2)}\n`;

/**
 * Upserts the snapshot into PortfolioSite.metrics.commits, keyed by user, so
 * repeated collections replace the document rather than accumulating copies.
 * The weekly series inside the document is itself the history, so nothing is
 * lost by keeping exactly one.
 */
async function writeToMongo(metrics: Metrics): Promise<PersistResult> {
  const db = await getDb();
  const collection = db.collection<Metrics>(COMMITS_COLLECTION);
  const key = { _id: metricsUser() } as Record<string, unknown>;

  const previous = (await collection.findOne(key, {
    projection: { _id: 0 },
  })) as Metrics | null;

  await collection.replaceOne(key, { ...key, ...metrics } as Metrics, {
    upsert: true,
  });

  return {
    backend: "mongodb",
    written: true,
    // generatedAt always advances so the idempotency window tracks the last
    // successful collection, not the last time the numbers moved.
    dataChanged: !previous || !sameData(previous, metrics),
    detail: `${db.databaseName}.${COMMITS_COLLECTION}`,
  };
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
 * Persists the snapshot to Mongo when MONGODB_URI is set — required on hosts
 * with a read-only filesystem — and to disk otherwise, which suits local runs
 * and the container deployment.
 */
export async function writeSnapshot(metrics: Metrics): Promise<PersistResult> {
  return mongoConfigured() ? writeToMongo(metrics) : writeToFile(metrics);
}

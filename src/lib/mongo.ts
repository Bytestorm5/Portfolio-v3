import { MongoClient, type Db } from "mongodb";

/** The URI's own default database is ignored — the target is explicit. */
const DB_NAME = process.env.MONGODB_DB ?? "PortfolioSite";

export const COMMITS_COLLECTION = "metrics.commits";

/**
 * Serverless invocations reuse module scope, so the client is cached rather
 * than opening a fresh connection pool per request.
 */
let clientPromise: Promise<MongoClient> | null = null;

export function mongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  clientPromise ??= new MongoClient(uri, {
    // Keep a render from hanging on an unreachable cluster.
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 5,
  })
    .connect()
    .catch((err) => {
      // Without this reset, one failed connect would poison every later
      // request with the same rejected promise.
      clientPromise = null;
      throw err;
    });

  return (await clientPromise).db(DB_NAME);
}

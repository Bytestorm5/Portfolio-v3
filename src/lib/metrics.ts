import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type WeeklyPoint = {
  /** ISO date of the Sunday that starts the week. */
  w: string;
  /** Commits authored that week. */
  c: number;
  /** Running total through that week. */
  cum: number;
};

export type RepoStat = {
  name: string;
  url: string;
  homepage: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  commits: number;
  firstWeek: string;
  lastWeek: string;
};

export type Metrics = {
  generatedAt: string;
  user: string;
  totals: {
    commits: number;
    repos: number;
    activeWeeks: number;
    spanWeeks: number;
    firstCommitWeek: string;
    commitsLast365: number;
    busiestWeek: { week: string; commits: number };
    languages: { language: string; commits: number }[];
  };
  weekly: WeeklyPoint[];
  repos: RepoStat[];
};

const SNAPSHOT = join(process.cwd(), "data", "github-metrics.json");

/**
 * Reads the snapshot committed by the daily collection workflow. Returns null
 * when it has never run — callers render an explicit empty state rather than
 * a chart with no data in it.
 */
export async function getMetrics(): Promise<Metrics | null> {
  try {
    const raw = await readFile(SNAPSHOT, "utf8");
    const parsed = JSON.parse(raw) as Metrics;
    if (!parsed?.weekly?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export { daysSince, formatFreshness, formatWeek } from "./formatters";

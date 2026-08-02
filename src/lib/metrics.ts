import { readSnapshot } from "./store.ts";

export type { Metrics, RepoStat, WeeklyPoint } from "./collector.ts";
export { daysSince, formatFreshness, formatWeek } from "./formatters.ts";

/** The snapshot backing every metric on the site. Null until first collection. */
export const getMetrics = readSnapshot;

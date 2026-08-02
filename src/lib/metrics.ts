import { readSnapshot } from "./store";

export type { Metrics, RepoStat, WeeklyPoint } from "./collector";
export { daysSince, formatFreshness, formatWeek } from "./formatters";

/** The snapshot backing every metric on the site. Null until first collection. */
export const getMetrics = readSnapshot;

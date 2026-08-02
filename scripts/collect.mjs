#!/usr/bin/env node
/**
 * CLI wrapper around the same collector the /api/metrics/collect endpoint uses.
 * Node strips the types from the .ts import at runtime (Node >= 22.18).
 *
 *   GITHUB_TOKEN=<token> npm run metrics
 *   METRICS_REPOS=PortfolioSite,Portfolio-v3 npm run metrics
 */

const { collectMetrics } = await import("../src/lib/collector.ts");
const { writeSnapshot } = await import("../src/lib/store.ts");

const repos = process.env.METRICS_REPOS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

try {
  const metrics = await collectMetrics({
    repos,
    log: (message) => console.log("[metrics]", message),
  });
  await writeSnapshot(metrics);

  const { commits, publicCommits, privateCommits, repos: repoCount } = metrics.totals;
  console.log(
    `[metrics] wrote snapshot: ${commits} commits ` +
      `(${publicCommits} public / ${privateCommits} private) across ${repoCount} repos`,
  );
} catch (error) {
  console.error("[metrics] failed:", error);
  process.exit(1);
}

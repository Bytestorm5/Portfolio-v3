import CommitChart from "./CommitChart";
import MetricCarousel, { type MetricSlide } from "./MetricCarousel";
import { getMetrics } from "@/lib/metrics";
import { formatFreshness, formatWeek } from "@/lib/formatters";

export default async function HeroMetrics() {
  const metrics = await getMetrics();

  if (!metrics) {
    return (
      <section
        aria-label="Live activity metrics"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-xs text-[var(--text-secondary)]"
      >
        No snapshot yet — call{" "}
        <code className="text-[var(--accent)]">/api/metrics/collect</code> to build one.
      </section>
    );
  }

  const { totals, weekly, generatedAt } = metrics;

  const slides: MetricSlide[] = [
    {
      id: "commits",
      label: "Commits",
      title: "Commits over time",
      subtitle: `${totals.repos} repos · since ${formatWeek(totals.firstCommitWeek)}`,
      node: <CommitChart data={weekly} />,
    },
  ];

  return (
    <MetricCarousel
      slides={slides}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
          <span>Collected from the GitHub API · updated {formatFreshness(generatedAt)}</span>
          <a href="/api/metrics" className="underline underline-offset-2">
            Raw JSON
          </a>
        </div>
      }
    />
  );
}

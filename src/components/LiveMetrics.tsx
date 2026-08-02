import CommitChart from "./CommitChart";
import StatTile from "./StatTile";
import { getMetrics } from "@/lib/metrics";
import { formatFreshness, formatWeek } from "@/lib/formatters";
import { profile } from "@/data/profile";

export default async function LiveMetrics() {
  const metrics = await getMetrics();

  if (!metrics) {
    return (
      <section id="activity" className="scroll-mt-20">
        <SectionHead />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-secondary)]">
          No snapshot yet. The collection workflow writes{" "}
          <code className="text-[var(--accent)]">data/github-metrics.json</code> on its first
          run — trigger it from the Actions tab, or run{" "}
          <code className="text-[var(--accent)]">npm run metrics</code> locally.
        </div>
      </section>
    );
  }

  const { totals, weekly, generatedAt } = metrics;
  const years = Math.max(1, Math.round(totals.spanWeeks / 52));

  return (
    <section id="activity" className="scroll-mt-20">
      <SectionHead />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Cumulative commits to repositories I own
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {totals.repos} public repos · since {formatWeek(totals.firstCommitWeek)}
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Updated {formatFreshness(generatedAt)}
          </p>
        </div>

        <CommitChart data={weekly} generatedAt={generatedAt} />

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Total commits"
            value={totals.commits.toLocaleString()}
            detail={`Across ~${years} year${years === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Commits in the last year"
            value={totals.commitsLast365.toLocaleString()}
            detail="Rolling 365 days"
          />
          <StatTile
            label="Weeks with commits"
            value={totals.activeWeeks.toLocaleString()}
            detail={`Of ${totals.spanWeeks.toLocaleString()} elapsed`}
          />
          <StatTile
            label="Busiest week"
            value={totals.busiestWeek.commits.toLocaleString()}
            detail={formatWeek(totals.busiestWeek.week)}
          />
        </div>

        {totals.languages.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Most commits by language:</span>
            {totals.languages.slice(0, 5).map((l) => (
              <span
                key={l.language}
                className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-secondary)]"
              >
                {l.language}{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {l.commits.toLocaleString()}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* The chart's values must be reachable without hovering. */}
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            View as table
          </summary>
          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-[var(--border)]">
            <table className="w-full border-collapse text-xs">
              <caption className="sr-only">
                Weekly and cumulative commit counts for repositories owned by {profile.name}
              </caption>
              <thead className="sticky top-0 bg-[var(--surface-2)]">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Week of
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Commits
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Running total
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                {[...weekly].reverse().map((p) => (
                  <tr key={p.w} className="border-t border-[var(--border)]">
                    <td className="px-3 py-1.5 text-[var(--text-secondary)]">
                      {formatWeek(p.w)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[var(--text-secondary)]">
                      {p.c}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[var(--text-primary)]">
                      {p.cum.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

function SectionHead() {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold sm:text-2xl">Live activity</h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        A GitHub Action runs daily, walks every public repo I own via the contributor-stats
        API, aggregates the weekly commit buckets, and commits the snapshot back to this
        site&apos;s repo. Nothing here is typed by hand.{" "}
        <a href="/api/metrics" className="underline underline-offset-2">
          Raw JSON
        </a>
        .
      </p>
    </div>
  );
}

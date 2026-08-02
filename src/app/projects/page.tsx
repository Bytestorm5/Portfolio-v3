import type { Metadata } from "next";
import ProjectGrid from "@/components/ProjectGrid";
import { alsoBuilt } from "@/data/projects";
import { getMetrics } from "@/lib/metrics";
import { formatMonthYear } from "@/lib/formatters";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Research, ML systems, tools and simulations built by Kamil Arif — with live commit activity pulled from GitHub.",
};

export const revalidate = 3600;

export default async function ProjectsPage() {
  const metrics = await getMetrics();

  /* Commit counts for the smaller projects come from the snapshot, so this
     page never restates a number that the collector already owns. */
  const commitsByRepo = new Map(
    metrics?.repos.map((r) => [r.name.toLowerCase(), r]) ?? [],
  );

  const topRepos = metrics?.repos.slice(0, 10) ?? [];

  return (
    <div className="flex flex-col gap-16 py-10 sm:py-14">
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Projects.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          Research replications, reinforcement learning agents, generative worldbuilding
          tools, and a few things built because the alternative was doing them by hand.
          Everything below is mine end to end unless noted.
        </p>
      </section>

      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="mb-4 text-xl font-semibold sm:text-2xl">
          Featured
        </h2>
        <ProjectGrid />
      </section>

      {/* ---- Smaller shipped work --------------------------------------- */}
      <section aria-labelledby="also-heading">
        <h2 id="also-heading" className="text-xl font-semibold sm:text-2xl">
          Also built
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Smaller tools and experiments. Commit counts come from the live snapshot.
        </p>
        <ul className="mt-5 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {alsoBuilt.map((item) => {
            const stat = commitsByRepo.get(
              item.href.split("/").pop()?.toLowerCase() ?? "",
            );
            return (
              <li
                key={item.name}
                className="rounded-xl border border-[var(--border)] bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold no-underline hover:underline"
                  >
                    {item.name} ↗
                  </a>
                  {stat && (
                    <span
                      className="shrink-0 text-[10px] text-[var(--text-muted)]"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {stat.commits.toLocaleString()} commits
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                  {item.language && <span>{item.language}</span>}
                  {item.language && item.live && <span aria-hidden>·</span>}
                  {item.live && (
                    <a href={item.live} target="_blank" rel="noreferrer">
                      Live demo ↗
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Snapshot-driven repo activity ------------------------------ */}
      {topRepos.length > 0 && (
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-xl font-semibold sm:text-2xl">
            Most active repositories
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Pulled straight from the daily GitHub snapshot — ranked by commits I authored.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Repositories owned by {profile.name}, ranked by commits authored
              </caption>
              <thead className="bg-[var(--surface-2)] text-xs">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">
                    Repository
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">
                    Language
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Commits
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">
                    Last commit
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                {topRepos.map((repo) => (
                  <tr key={repo.name} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2.5">
                      <a href={repo.url} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                        {repo.name}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">
                      {repo.language ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">
                      {repo.commits.toLocaleString()}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right text-[var(--text-muted)] sm:table-cell">
                      {formatMonthYear(repo.lastWeek)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

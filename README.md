# Portfolio v3

Next.js rebuild of [PortfolioSite](https://github.com/Bytestorm5/PortfolioSite) (Flask).
Two pages — a home page aimed at employers, and a projects page — plus a live GitHub
activity graph that collects its own data.

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- No charting library: the commit graph is hand-rolled SVG (see `src/components/CommitChart.tsx`)
- System monospace throughout, carrying over the v2 look

## Live metrics

The "Live activity" section on the home page is fed by a snapshot at
`data/github-metrics.json`, produced by `scripts/collect-github-metrics.mjs`:

1. Lists every non-fork public repo owned by the user.
2. Calls `/repos/{owner}/{repo}/stats/contributors` for each — that endpoint returns
   a contributor's **entire** history bucketed by week, so one request per repo
   reconstructs the full timeline without walking commits. It answers `202` while
   GitHub warms the cache, so the script retries with backoff.
3. Keeps only commits authored by the user, sums the weekly buckets across repos,
   and fills in the quiet weeks so the x-axis stays real time rather than
   collapsing gaps.
4. Writes totals, the weekly series, and a per-repo breakdown.

`.github/workflows/collect-metrics.yml` runs this daily and commits the snapshot back
when the data actually changed — the `generatedAt` timestamp alone is ignored, so
quiet days don't produce empty commits.

### Running it manually

```bash
GITHUB_TOKEN=<a token> npm run metrics
```

| Env var | Purpose |
| --- | --- |
| `METRICS_GITHUB_TOKEN` / `GITHUB_TOKEN` | Auth. Without one you get 60 requests/hour, which is not enough. |
| `METRICS_USER` | Defaults to `Bytestorm5`. |
| `METRICS_REPOS` | Comma-separated list to pin collection to specific repos instead of discovering all of them. |
| `METRICS_INCLUDE_PRIVATE=1` | Include private repos (needs a PAT with `repo`). Off by default so no repo name leaks onto the public site. |

The snapshot is also served at `/api/metrics`.

> **Note:** the committed snapshot currently only covers `PortfolioSite` and
> `Portfolio-v3` — it was seeded from an environment whose GitHub credential was
> scoped to those two repos. The first workflow run replaces it with the full set.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Deployment

Works as-is on Vercel. The `Dockerfile` builds a standalone image for the
container-to-droplet path the v2 site used; note it copies `data/` into the image,
since the snapshot is read at runtime.

## Layout

```
data/github-metrics.json   collected snapshot (committed)
scripts/                   the collector
src/app/                   routes: /, /projects, /api/metrics
src/components/            chart, cards, header/footer, rotator
src/data/                  résumé content — experience, projects, profile
src/lib/                   snapshot loader + formatters
```

Content lives in `src/data/*.ts`, so updating the résumé means editing data, not JSX.

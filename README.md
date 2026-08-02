# Portfolio v3

Next.js rebuild of [PortfolioSite](https://github.com/Bytestorm5/PortfolioSite) (Flask).
Two pages — a home page aimed at employers, and a projects page — with a live GitHub
activity chart in the hero that collects its own data.

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- anime.js for the typewriter tagline and the heading reveal
- No charting library: the commit graph is hand-rolled SVG (`src/components/CommitChart.tsx`)
- System monospace throughout, carrying over the v2 look

## Live metrics

The hero panel is fed by a snapshot produced by `src/lib/collector.ts`:

1. Lists every non-fork repo the user owns. When the token belongs to that user it
   asks via `/user/repos`, which includes private repositories; otherwise it falls
   back to the public-only `/users/{user}/repos`.
2. Calls `/repos/{owner}/{repo}/stats/contributors` for each — that endpoint returns
   a contributor's **entire** history bucketed by week, so one request per repo
   reconstructs the full timeline without walking commits. It answers `202` while
   GitHub warms the cache, so the collector retries with backoff.
3. Keeps only commits authored by the user, splits each week into public and private
   buckets, and fills in the quiet weeks so the x-axis stays real time rather than
   collapsing gaps.
4. Upserts the result into MongoDB (see Persistence below).

The GitHub token only ever reads — nothing is written back to GitHub — so a
read-only token is all this needs.

**Private repositories are counted but never named.** Only their commit totals reach
the snapshot — no name, URL, or description — so the public/private split can be shown
without leaking anything.

### The collection endpoint

`POST` (or `GET`) `/api/metrics/collect`, meant to be driven by cron:

```bash
curl -X POST -H "Authorization: Bearer $METRICS_CRON_SECRET" \
  https://kamilarif.com/api/metrics/collect
```

It is **idempotent within a window**: if the stored snapshot is younger than
`METRICS_MIN_INTERVAL_HOURS` (default 20), the request is a no-op that reports the
current state and when the next collection is allowed:

```json
{ "status": "skipped", "reason": "within minimum collection interval",
  "generatedAt": "…", "ageSeconds": 151, "nextEligibleAt": "…" }
```

So a stray, retried, or duplicated request cannot pull the cadence forward or
double-write the snapshot. Add `?force=1` to override the window deliberately.
Concurrent requests share a single in-flight collection rather than each starting
their own, and a failed collection leaves the previous snapshot in place — the site
keeps serving the last good data and the response says so.

| Env var | Purpose |
| --- | --- |
| `METRICS_CRON_SECRET` / `CRON_SECRET` | Bearer token the endpoint requires. Without one set, the endpoint refuses to run in production. Vercel Cron sends `CRON_SECRET` automatically. |
| `MONGODB_URI` | Connection string. When set, Mongo is both the read and write path. |
| `MONGODB_DB` | Database name. Defaults to `PortfolioSite`. The URI's own default database is ignored. |
| `GITHUB_TOKEN` | GitHub auth. **Read-only is sufficient** — nothing is ever written back to GitHub. Needs read access to private repo contents/metadata to include them in the split. |
| `METRICS_USER` | Defaults to `Bytestorm5`. Also the `_id` the snapshot is stored under. |
| `METRICS_MIN_INTERVAL_HOURS` | Idempotency window. Default 20. |
| `METRICS_DATA_DIR` | Filesystem write path when `MONGODB_URI` is unset. Defaults to `data/`. |

The snapshot itself is served at `/api/metrics`.

### Running it locally

```bash
GITHUB_TOKEN=<token> npm run metrics                       # collect everything
METRICS_REPOS=PortfolioSite,Portfolio-v3 npm run metrics    # pin to specific repos
```

### Persistence

Two backends, picked by whether `MONGODB_URI` is set:

- **MongoDB (`MONGODB_URI` set).** The snapshot is upserted into
  `PortfolioSite.metrics.commits` as a single document keyed by `_id: <user>`, so
  repeated collections replace it rather than accumulating copies — the weekly series
  inside the document is itself the history, so keeping one loses nothing. Required on
  serverless hosts, where the function filesystem is read-only and `/tmp` is
  per-instance and ephemeral. Reads go to Mongo too: without a deploy to bake in new
  data, the bundled file would never change.
- **Filesystem (default).** Writes to `METRICS_DATA_DIR`, default `data/`. Suits local
  runs and the container deployment — mount a volume at `data/` to keep snapshots
  across restarts.

A Mongo read failure never breaks a render or a build: it logs and falls through to
the snapshot committed in `data/`, so the site degrades to slightly stale rather than
empty. `_id` is projected out, so it never reaches `/api/metrics`. Snapshots predating
the public/private split are upgraded on read rather than rendering as gaps.

`generatedAt` advances on every successful collection, including ones where the
numbers didn't move, so the idempotency window tracks the last run rather than the
last change. The response reports `dataChanged` separately.

> **Note:** the committed fallback snapshot only covers `PortfolioSite` and
> `Portfolio-v3`, and shows no private commits — it was seeded from an environment
> whose GitHub credential was scoped to those two repos. It is only used until the
> first collection populates Mongo.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Deployment

**Vercel.** `vercel.json` schedules the collection at `0 10 * * *` — Vercel Cron runs
on UTC with no timezone support, so this is 05:00 EST in winter and 06:00 EDT in
summer. Adjust to `0 9 * * *` if you would rather it track EDT. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set.

Required project env vars: `CRON_SECRET`, `GITHUB_TOKEN` (read-only is fine), and
`MONGODB_URI` (see Persistence above — without it the function will try to write to a
read-only filesystem). Set these for the Build environment too, so prerenders read
live data rather than the committed fallback.

**Container.** The `Dockerfile` builds a standalone image for the
container-to-droplet path v2 used; note it copies `data/` into the image, since the
snapshot is read at runtime. Leave `MONGODB_URI` unset there to use the filesystem
backend (mount a volume at `data/`), and drive the endpoint from any cron runner.

## Layout

```
data/github-metrics.json   collected snapshot (committed as a seed)
scripts/collect.mjs        CLI wrapper around the collector
src/app/                   routes: /, /projects, /api/metrics[/collect]
src/components/            chart, metric carousel, cards, header/footer, rotator
src/data/                  résumé content — experience, projects, profile
src/lib/                   collector, snapshot store, formatters
```

Content lives in `src/data/*.ts`, so updating the résumé means editing data, not JSX.
The hero panel is a `MetricCarousel`; adding a second metric means appending a slide
in `src/components/HeroMetrics.tsx` — the picker appears once there is more than one.

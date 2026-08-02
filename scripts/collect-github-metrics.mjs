#!/usr/bin/env node
/**
 * Collects commit activity across every repo the user owns and writes a
 * snapshot to data/github-metrics.json.
 *
 * GitHub's /stats/contributors endpoint returns each contributor's entire
 * history bucketed into weeks, so one request per repo is enough to
 * reconstruct a full commit timeline without walking individual commits.
 *
 * Run locally with `npm run metrics`; in CI this runs on a daily cron and
 * commits the snapshot back to the repo.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USER = process.env.METRICS_USER ?? "Bytestorm5";
const TOKEN = process.env.METRICS_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "github-metrics.json",
);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** /stats/* endpoints return 202 while GitHub computes the cache. */
const STATS_RETRIES = 6;

function log(...args) {
  console.log("[metrics]", ...args);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gh(path, { retries = 3 } = {}) {
  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${USER}-portfolio-metrics`,
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers });

    // Secondary rate limit / abuse detection: back off and retry.
    if ((res.status === 403 || res.status === 429) && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
      log(`rate limited on ${path}, waiting ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (!res.ok && res.status !== 202 && res.status !== 204) {
      if (attempt < retries) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      throw new Error(`GitHub ${res.status} ${res.statusText} for ${path}`);
    }
    return res;
  }
}

/** Walks Link-header pagination and concatenates every page. */
async function ghPaginated(path) {
  const out = [];
  let next = path;
  while (next) {
    const res = await gh(next);
    out.push(...(await res.json()));
    const link = res.headers.get("link") ?? "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? match[1] : null;
  }
  return out;
}

/**
 * Contributor stats are computed lazily: a 202 means "come back shortly".
 * Returns null for repos with no commit history (204).
 */
async function fetchContributorStats(repo) {
  for (let attempt = 0; attempt < STATS_RETRIES; attempt++) {
    const res = await gh(`/repos/${repo.full_name}/stats/contributors`);
    if (res.status === 204) return null;
    if (res.status === 202) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    const body = await res.json();
    // GitHub occasionally hands back {} alongside a 200 while still computing.
    if (!Array.isArray(body)) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    return body;
  }
  log(`! stats never became ready for ${repo.full_name}, skipping`);
  return null;
}

/** Sunday-anchored week key, matching GitHub's own bucketing. */
const weekKey = (unixSeconds) =>
  new Date(unixSeconds * 1000).toISOString().slice(0, 10);

async function main() {
  if (!TOKEN) {
    log("warning: no GITHUB_TOKEN set, using unauthenticated limits (60/hr)");
  }

  // METRICS_REPOS pins collection to an explicit comma-separated list instead
  // of discovering everything the user owns — useful for testing, and for
  // environments where the token can only see certain repos.
  const pinned = process.env.METRICS_REPOS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let allRepos;
  if (pinned?.length) {
    log(`collecting ${pinned.length} pinned repos`);
    allRepos = await Promise.all(
      pinned.map(async (name) => {
        const full = name.includes("/") ? name : `${USER}/${name}`;
        return (await gh(`/repos/${full}`)).json();
      }),
    );
  } else {
    log(`collecting repos owned by ${USER}`);
    allRepos = await ghPaginated(
      `/users/${USER}/repos?per_page=100&type=owner&sort=pushed`,
    );
  }

  // Forks carry upstream history that isn't the author's work. Private repos
  // are excluded by default so nothing on the public site leaks a repo name —
  // opt in with METRICS_INCLUDE_PRIVATE=1 when running against a personal PAT.
  const includePrivate = process.env.METRICS_INCLUDE_PRIVATE === "1";
  const repos = allRepos.filter(
    (r) => !r.fork && (includePrivate || !r.private),
  );
  log(
    `${repos.length} of ${allRepos.length} repos in scope ` +
      `(forks${includePrivate ? "" : " and private repos"} skipped)`,
  );

  /** @type {Map<string, number>} week -> commits */
  const weeks = new Map();
  const perRepo = [];

  for (const repo of repos) {
    const stats = await fetchContributorStats(repo);
    if (!stats) {
      log(`- ${repo.name}: no stats`);
      continue;
    }

    const mine = stats.find(
      (s) => s.author?.login?.toLowerCase() === USER.toLowerCase(),
    );
    if (!mine) {
      log(`- ${repo.name}: no commits authored by ${USER}`);
      continue;
    }

    let total = 0;
    let firstWeek = null;
    let lastWeek = null;

    for (const bucket of mine.weeks) {
      if (!bucket.c) continue;
      const key = weekKey(bucket.w);
      weeks.set(key, (weeks.get(key) ?? 0) + bucket.c);
      total += bucket.c;
      firstWeek ??= key;
      lastWeek = key;
    }

    if (total === 0) {
      log(`- ${repo.name}: 0 commits`);
      continue;
    }

    perRepo.push({
      name: repo.name,
      url: repo.html_url,
      homepage: repo.homepage || null,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      commits: total,
      firstWeek,
      lastWeek,
      private: repo.private,
    });
    log(`+ ${repo.name}: ${total} commits`);
  }

  if (weeks.size === 0) throw new Error("no commit data collected");

  // Fill every week between first and now so the x-axis is real time.
  // Without this, quiet stretches would collapse and the slope would lie.
  const sorted = [...weeks.keys()].sort();
  const start = new Date(`${sorted[0]}T00:00:00Z`).getTime();
  const now = Date.now();

  const weekly = [];
  let cumulative = 0;
  for (let t = start; t <= now; t += WEEK_MS) {
    const key = new Date(t).toISOString().slice(0, 10);
    const commits = weeks.get(key) ?? 0;
    cumulative += commits;
    weekly.push({ w: key, c: commits, cum: cumulative });
  }

  const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const commitsLast365 = weekly
    .filter((p) => new Date(`${p.w}T00:00:00Z`).getTime() >= yearAgo)
    .reduce((sum, p) => sum + p.c, 0);

  const busiest = weekly.reduce((best, p) => (p.c > best.c ? p : best), weekly[0]);

  perRepo.sort((a, b) => b.commits - a.commits);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    user: USER,
    totals: {
      commits: cumulative,
      repos: perRepo.length,
      activeWeeks: weeks.size,
      spanWeeks: weekly.length,
      firstCommitWeek: sorted[0],
      commitsLast365,
      busiestWeek: { week: busiest.w, commits: busiest.c },
      languages: [
        ...perRepo.reduce((map, r) => {
          if (!r.language) return map;
          return map.set(r.language, (map.get(r.language) ?? 0) + r.commits);
        }, new Map()),
      ]
        .sort((a, b) => b[1] - a[1])
        .map(([language, commits]) => ({ language, commits })),
    },
    weekly,
    repos: perRepo,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);

  log(
    `wrote ${OUT}: ${cumulative} commits across ${perRepo.length} repos, ` +
      `${weekly.length} weeks from ${sorted[0]}`,
  );
}

main().catch((err) => {
  console.error("[metrics] failed:", err);
  process.exit(1);
});

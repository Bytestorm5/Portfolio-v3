/**
 * Collects commit activity across every repo the user owns, split into public
 * and private buckets.
 *
 * GitHub's /stats/contributors endpoint returns each contributor's entire
 * history bucketed into weeks, so one request per repo is enough to
 * reconstruct a full commit timeline without walking individual commits.
 *
 * Private repositories are counted but never named: only their commit totals
 * reach the snapshot, so nothing on the public site leaks a repo name.
 */

export type WeeklyPoint = {
  /** ISO date of the Sunday that starts the week. */
  w: string;
  /** Commits to public repos that week. */
  pub: number;
  /** Commits to private repos that week. */
  priv: number;
  /** Total commits that week. */
  c: number;
  cumPub: number;
  cumPriv: number;
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
    publicCommits: number;
    privateCommits: number;
    repos: number;
    publicRepos: number;
    privateRepos: number;
    activeWeeks: number;
    spanWeeks: number;
    firstCommitWeek: string;
    commitsLast365: number;
    busiestWeek: { week: string; commits: number };
    languages: { language: string; commits: number }[];
  };
  weekly: WeeklyPoint[];
  /** Public repos only — private ones are aggregated but never listed. */
  repos: RepoStat[];
};

type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  homepage: string | null;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  private: boolean;
};

type ContributorWeek = { w: number; c: number };
type ContributorStat = { author: { login: string } | null; weeks: ContributorWeek[] };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** /stats/* endpoints answer 202 while GitHub computes the cache. */
const STATS_RETRIES = 6;

export type CollectOptions = {
  user?: string;
  token?: string;
  /** Restrict collection to an explicit list (mainly for testing). */
  repos?: string[];
  log?: (message: string) => void;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sunday-anchored week key, matching GitHub's own bucketing. */
const weekKey = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toISOString().slice(0, 10);

export async function collectMetrics(options: CollectOptions = {}): Promise<Metrics> {
  const user = options.user ?? process.env.METRICS_USER ?? "Bytestorm5";
  const token =
    options.token ?? process.env.METRICS_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const log = options.log ?? (() => {});

  async function gh(path: string, retries = 3): Promise<Response> {
    const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `${user}-portfolio-metrics`,
    };
    if (token) headers.Authorization = `Bearer ${token}`;

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
  async function ghPaginated<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = path;
    while (next) {
      const res: Response = await gh(next);
      out.push(...((await res.json()) as T[]));
      const link = res.headers.get("link") ?? "";
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      next = match ? match[1] : null;
    }
    return out;
  }

  /** Returns null for repos with no commit history (204). */
  async function fetchContributorStats(
    repo: GitHubRepo,
  ): Promise<ContributorStat[] | null> {
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
      return body as ContributorStat[];
    }
    log(`! stats never became ready for ${repo.full_name}, skipping`);
    return null;
  }

  /**
   * /users/{user}/repos only ever returns public repos. To see private ones we
   * have to ask as the authenticated user, which only works when the token
   * actually belongs to the user we're collecting for.
   */
  async function listRepos(): Promise<GitHubRepo[]> {
    if (options.repos?.length) {
      log(`collecting ${options.repos.length} pinned repos`);
      return Promise.all(
        options.repos.map(async (name) => {
          const full = name.includes("/") ? name : `${user}/${name}`;
          return (await gh(`/repos/${full}`)).json() as Promise<GitHubRepo>;
        }),
      );
    }

    if (token) {
      const me = (await (await gh("/user")).json()) as { login?: string };
      if (me.login?.toLowerCase() === user.toLowerCase()) {
        log(`authenticated as ${me.login}; including private repos`);
        return ghPaginated<GitHubRepo>(
          "/user/repos?per_page=100&affiliation=owner&sort=pushed",
        );
      }
      log(
        `token belongs to ${me.login ?? "another account"}, not ${user}; ` +
          "public repos only",
      );
    }

    return ghPaginated<GitHubRepo>(`/users/${user}/repos?per_page=100&type=owner&sort=pushed`);
  }

  if (!token) log("warning: no token set, using unauthenticated limits (60/hr)");

  const allRepos = await listRepos();
  // Forks carry upstream history that isn't the author's work.
  const repos = allRepos.filter((r) => !r.fork);
  log(`${repos.length} owned repos (${allRepos.length - repos.length} forks skipped)`);

  const weeks = new Map<string, { pub: number; priv: number }>();
  const publicRepos: RepoStat[] = [];
  let privateRepoCount = 0;
  let publicCommits = 0;
  let privateCommits = 0;

  for (const repo of repos) {
    const stats = await fetchContributorStats(repo);
    if (!stats) continue;

    const mine = stats.find(
      (s) => s.author?.login?.toLowerCase() === user.toLowerCase(),
    );
    if (!mine) continue;

    let total = 0;
    let firstWeek: string | null = null;
    let lastWeek = "";

    for (const bucket of mine.weeks) {
      if (!bucket.c) continue;
      const key = weekKey(bucket.w);
      const entry = weeks.get(key) ?? { pub: 0, priv: 0 };
      if (repo.private) entry.priv += bucket.c;
      else entry.pub += bucket.c;
      weeks.set(key, entry);

      total += bucket.c;
      firstWeek ??= key;
      lastWeek = key;
    }

    if (total === 0) continue;

    if (repo.private) {
      privateRepoCount++;
      privateCommits += total;
      // Deliberately not recording the name, URL or description.
      log(`+ (private repo): ${total} commits`);
    } else {
      publicCommits += total;
      publicRepos.push({
        name: repo.name,
        url: repo.html_url,
        homepage: repo.homepage || null,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        commits: total,
        firstWeek: firstWeek!,
        lastWeek,
      });
      log(`+ ${repo.name}: ${total} commits`);
    }
  }

  if (weeks.size === 0) throw new Error("no commit data collected");

  // Fill every week between first and now so the x-axis is real time.
  // Without this, quiet stretches would collapse and the slope would lie.
  const sorted = [...weeks.keys()].sort();
  const start = new Date(`${sorted[0]}T00:00:00Z`).getTime();
  const now = Date.now();

  const weekly: WeeklyPoint[] = [];
  let cumPub = 0;
  let cumPriv = 0;
  for (let t = start; t <= now; t += WEEK_MS) {
    const key = new Date(t).toISOString().slice(0, 10);
    const { pub = 0, priv = 0 } = weeks.get(key) ?? {};
    cumPub += pub;
    cumPriv += priv;
    weekly.push({ w: key, pub, priv, c: pub + priv, cumPub, cumPriv, cum: cumPub + cumPriv });
  }

  const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const commitsLast365 = weekly
    .filter((p) => new Date(`${p.w}T00:00:00Z`).getTime() >= yearAgo)
    .reduce((sum, p) => sum + p.c, 0);

  const busiest = weekly.reduce((best, p) => (p.c > best.c ? p : best), weekly[0]);

  publicRepos.sort((a, b) => b.commits - a.commits);

  const languages = [
    ...publicRepos.reduce((map, r) => {
      if (!r.language) return map;
      return map.set(r.language, (map.get(r.language) ?? 0) + r.commits);
    }, new Map<string, number>()),
  ]
    .sort((a, b) => b[1] - a[1])
    .map(([language, commits]) => ({ language, commits }));

  return {
    generatedAt: new Date().toISOString(),
    user,
    totals: {
      commits: cumPub + cumPriv,
      publicCommits,
      privateCommits,
      repos: publicRepos.length + privateRepoCount,
      publicRepos: publicRepos.length,
      privateRepos: privateRepoCount,
      activeWeeks: weeks.size,
      spanWeeks: weekly.length,
      firstCommitWeek: sorted[0],
      commitsLast365,
      busiestWeek: { week: busiest.w, commits: busiest.c },
      languages,
    },
    weekly,
    repos: publicRepos,
  };
}

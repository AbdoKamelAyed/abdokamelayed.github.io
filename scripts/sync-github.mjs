import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GITHUB_DIR = path.join(ROOT, "public", "data", "github");
const SETTINGS_PATH = path.join(ROOT, "public", "data", "settings", "github-sync.json");

const USERNAME = process.env.GITHUB_USERNAME || "AbdoKamelAyed";
const REST_TOKEN = process.env.GH_METRICS_TOKEN || process.env.GITHUB_TOKEN || "";
const GRAPHQL_TOKEN = process.env.GH_METRICS_TOKEN || process.env.GITHUB_TOKEN || "";

const API_BASE = "https://api.github.com";
const GRAPHQL_URL = "https://api.github.com/graphql";
const MAX_RETRIES = 3;
const MAX_COMMIT_REPOS = 12;

const errors = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildHeaders(token, extra = {}) {
  const headers = {
    "User-Agent": "ABDO-Personal-Digital-Hub-Sync/1.0",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithRetry(url, options = {}, attempt = 1) {
  try {
    const res = await fetch(url, options);
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");

    if (res.status === 403 && remaining === "0" && reset) {
      const waitMs = Math.max(0, Number(reset) * 1000 - Date.now()) + 1000;
      if (waitMs <= 60000 && attempt <= MAX_RETRIES) {
        await sleep(waitMs);
        return fetchWithRetry(url, options, attempt + 1);
      }
      throw new Error(`GitHub rate limit exhausted for ${url}`);
    }

    if ((res.status === 429 || res.status >= 500) && attempt <= MAX_RETRIES) {
      await sleep(1000 * 2 ** (attempt - 1));
      return fetchWithRetry(url, options, attempt + 1);
    }

    return res;
  } catch (err) {
    if (attempt <= MAX_RETRIES) {
      await sleep(1000 * 2 ** (attempt - 1));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

async function fetchRestJson(endpoint, { allowStatuses = [] } = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetchWithRetry(url, {
    headers: buildHeaders(REST_TOKEN),
  });

  if (allowStatuses.includes(res.status)) {
    return { status: res.status, data: null, headers: res.headers };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`REST ${res.status} on ${endpoint}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

async function fetchPaginatedRest(endpoint, maxPages = 10) {
  const results = [];
  let page = 1;
  while (page <= maxPages) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const { data } = await fetchRestJson(`${endpoint}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page += 1;
  }
  return results;
}

async function fetchContributionsGraphQL(username) {
  if (!GRAPHQL_TOKEN) {
    return {
      available: false,
      reason: "GitHub GraphQL contribution calendar requires a read-only GH_METRICS_TOKEN secret in GitHub Actions.",
      totals: null,
      calendar: null,
    };
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                weekday
                color
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetchWithRetry(GRAPHQL_URL, {
      method: "POST",
      headers: buildHeaders(GRAPHQL_TOKEN, { "Content-Type": "application/json" }),
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL HTTP ${res.status}`);
    }

    const payload = await res.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((e) => e.message).join("; "));
    }

    const col = payload?.data?.user?.contributionsCollection;
    if (!col) {
      throw new Error("Empty contributionsCollection in GraphQL response.");
    }

    return {
      available: true,
      reason: null,
      totals: {
        totalContributions: col.contributionCalendar?.totalContributions ?? null,
        totalCommitContributions: col.totalCommitContributions ?? null,
        totalIssueContributions: col.totalIssueContributions ?? null,
        totalPullRequestContributions: col.totalPullRequestContributions ?? null,
        totalPullRequestReviewContributions: col.totalPullRequestReviewContributions ?? null,
      },
      calendar: col.contributionCalendar,
    };
  } catch (err) {
    errors.push(`GraphQL contributions fallback: ${err.message}`);
    return {
      available: false,
      reason: err.message,
      totals: null,
      calendar: null,
    };
  }
}

function computeStreaks(calendar) {
  if (!calendar?.weeks?.length) {
    return { currentStreak: null, longestStreak: null, mostActiveDay: null, weeklyTotals: [] };
  }
  const days = calendar.weeks
    .flatMap((w) => w.contributionDays || [])
    .sort((a, b) => a.date.localeCompare(b.date));

  let longest = 0;
  let running = 0;
  let mostActive = null;

  for (const d of days) {
    if (d.contributionCount > 0) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
    if (!mostActive || d.contributionCount > mostActive.contributionCount) {
      mostActive = d;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].contributionCount > 0) {
      current += 1;
    } else if (i === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  const weeklyTotals = calendar.weeks.map((w) => ({
    weekStart: w.contributionDays?.[0]?.date || null,
    count: (w.contributionDays || []).reduce((sum, d) => sum + (d.contributionCount || 0), 0),
  }));

  return { currentStreak: current, longestStreak: longest, mostActiveDay: mostActive, weeklyTotals };
}

function normalizeEvent(ev) {
  const repoName = ev.repo?.name || "";
  const baseRepoUrl = repoName ? `https://github.com/${repoName}` : null;
  let url = baseRepoUrl;
  let summary = ev.type;

  if (ev.type === "PushEvent") {
    const count = ev.payload?.size ?? ev.payload?.commits?.length ?? 0;
    summary = count > 0 ? `Pushed ${count} commit(s) to ${repoName}` : `Pushed updates to ${repoName}`;
  } else if (ev.type === "CreateEvent") {
    summary = `Created ${ev.payload?.ref_type || "resource"} in ${repoName}`;
  } else if (ev.type === "ReleaseEvent" && ev.payload?.release) {
    summary = `Released ${ev.payload.release.tag_name || ev.payload.release.name} in ${repoName}`;
    url = ev.payload.release.html_url || baseRepoUrl;
  } else if (ev.type === "PullRequestEvent" && ev.payload?.pull_request) {
    summary = `${ev.payload.action} PR #${ev.payload.number} in ${repoName}`;
    url = ev.payload.pull_request.html_url || baseRepoUrl;
  } else if (ev.type === "IssuesEvent" && ev.payload?.issue) {
    summary = `${ev.payload.action} issue #${ev.payload.issue.number} in ${repoName}`;
    url = ev.payload.issue.html_url || baseRepoUrl;
  } else if (ev.type === "WatchEvent") {
    summary = `Starred ${repoName}`;
  } else if (ev.type === "ForkEvent") {
    summary = `Forked ${repoName}`;
    url = ev.payload?.forkee?.html_url || baseRepoUrl;
  }

  return {
    id: `gh-event-${ev.id}`,
    type: ev.type,
    repo: repoName,
    summary,
    url,
    createdAt: ev.created_at,
    updatedAt: ev.created_at,
    status: "public",
    source: "github-rest-events",
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const syncConfig = await readJsonSafe(SETTINGS_PATH, {
    username: USERNAME,
    excludedRepos: [],
    featuredRepos: [],
    includeForksInLanguageStats: false,
  });

  const targetUser = syncConfig.username || USERNAME;
  const excluded = new Set((syncConfig.excludedRepos || []).map((r) => r.toLowerCase()));
  const featured = new Set((syncConfig.featuredRepos || []).map((r) => r.toLowerCase()));

  const { data: rawUser } = await fetchRestJson(`/users/${encodeURIComponent(targetUser)}`);
  const profile = {
    id: `gh-profile-${rawUser.id}`,
    username: rawUser.login,
    name: (rawUser.name || rawUser.login).trim(),
    avatarUrl: rawUser.avatar_url,
    bio: rawUser.bio ? rawUser.bio.trim() : null,
    company: rawUser.company ? rawUser.company.trim() : null,
    location: rawUser.location ? rawUser.location.trim() : null,
    blog: rawUser.blog ? rawUser.blog.trim() : null,
    twitterUsername: rawUser.twitter_username || null,
    publicRepos: rawUser.public_repos ?? null,
    publicGists: rawUser.public_gists ?? null,
    followers: rawUser.followers ?? null,
    following: rawUser.following ?? null,
    profileUrl: rawUser.html_url,
    createdAt: rawUser.created_at,
    updatedAt: rawUser.updated_at || startedAt,
    status: "active",
    source: "github-rest-api",
  };

  const rawRepos = await fetchPaginatedRest(`/users/${encodeURIComponent(targetUser)}/repos?sort=updated`);
  const filteredRepos = rawRepos.filter((r) => !excluded.has(r.name.toLowerCase()));

  const languagesByRepo = {};
  const languageTotalsBytes = {};
  const recentCommits = [];
  const releases = [];

  const sortedByPush = [...filteredRepos].sort(
    (a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at)
  );

  for (const repo of filteredRepos) {
    try {
      const { data: langs } = await fetchRestJson(`/repos/${repo.full_name}/languages`);
      languagesByRepo[repo.name] = langs || {};
      if (!repo.fork || syncConfig.includeForksInLanguageStats) {
        for (const [lang, bytes] of Object.entries(langs || {})) {
          languageTotalsBytes[lang] = (languageTotalsBytes[lang] || 0) + bytes;
        }
      }
    } catch (err) {
      errors.push(`Languages failed for ${repo.name}: ${err.message}`);
      languagesByRepo[repo.name] = {};
    }
  }

  for (const repo of sortedByPush.slice(0, MAX_COMMIT_REPOS)) {
    try {
      const { data: repoCommits } = await fetchRestJson(
        `/repos/${repo.full_name}/commits?per_page=8`,
        { allowStatuses: [404, 409] }
      );
      if (Array.isArray(repoCommits)) {
        for (const c of repoCommits) {
          recentCommits.push({
            id: `gh-commit-${c.sha}`,
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            repo: repo.name,
            repoUrl: repo.html_url,
            message: (c.commit?.message || "").split("\n")[0],
            authorName: c.commit?.author?.name || c.author?.login || "Unknown",
            authorLogin: c.author?.login || null,
            url: c.html_url,
            createdAt: c.commit?.author?.date || repo.pushed_at,
            updatedAt: c.commit?.author?.date || repo.pushed_at,
            status: "recorded",
            source: "github-rest-repos",
          });
        }
      }
    } catch (err) {
      errors.push(`Commits failed for ${repo.name}: ${err.message}`);
    }

    try {
      const { data: repoReleases } = await fetchRestJson(
        `/repos/${repo.full_name}/releases?per_page=5`,
        { allowStatuses: [404] }
      );
      if (Array.isArray(repoReleases)) {
        for (const rel of repoReleases) {
          releases.push({
            id: `gh-release-${rel.id}`,
            repo: repo.name,
            tagName: rel.tag_name,
            name: rel.name || rel.tag_name,
            prerelease: Boolean(rel.prerelease),
            url: rel.html_url,
            createdAt: rel.published_at || rel.created_at,
            updatedAt: rel.published_at || rel.created_at,
            status: rel.draft ? "draft" : "published",
            source: "github-rest-releases",
          });
        }
      }
    } catch (err) {
      errors.push(`Releases failed for ${repo.name}: ${err.message}`);
    }
  }

  recentCommits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  releases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const repositories = filteredRepos.map((r) => ({
    id: `gh-repo-${r.id}`,
    name: r.name,
    fullName: r.full_name,
    description: r.description || null,
    primaryLanguage: r.language || null,
    languages: languagesByRepo[r.name] || {},
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    openIssues: r.open_issues_count ?? 0,
    sizeKb: r.size ?? 0,
    defaultBranch: r.default_branch || "main",
    license: r.license?.spdx_id || r.license?.name || null,
    topics: Array.isArray(r.topics) ? r.topics : [],
    url: r.html_url,
    homepage: r.homepage || null,
    isArchived: Boolean(r.archived),
    isFork: Boolean(r.fork),
    isFeatured: featured.has(r.name.toLowerCase()),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    status: r.archived ? "archived" : "active",
    source: "github-rest-api",
  }));

  const totalLangBytes = Object.values(languageTotalsBytes).reduce((a, b) => a + b, 0);
  const languageDistribution = Object.entries(languageTotalsBytes)
    .map(([language, bytes]) => ({
      id: `gh-lang-${language.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      language,
      bytes,
      percentage: totalLangBytes > 0 ? Number(((bytes / totalLangBytes) * 100).toFixed(2)) : 0,
      repoCount: repositories.filter((r) => Object.prototype.hasOwnProperty.call(r.languages, language)).length,
      createdAt: startedAt,
      updatedAt: startedAt,
      status: "computed",
      source: "github-rest-languages",
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const languagesPayload = {
    id: "gh-languages-summary",
    disclaimer:
      "Language statistics reflect byte sizes reported by GitHub's Linguist API across public repositories, not actual development time.",
    totalBytes: totalLangBytes,
    languages: languageDistribution,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "computed",
    source: "github-rest-languages",
  };

  let activity = [];
  try {
    const rawEvents = await fetchPaginatedRest(`/users/${encodeURIComponent(targetUser)}/events/public`, 3);
    activity = rawEvents.map(normalizeEvent);
  } catch (err) {
    errors.push(`Events failed: ${err.message}`);
  }

  const gqlContrib = await fetchContributionsGraphQL(targetUser);
  const streaks = computeStreaks(gqlContrib.calendar);
  const contributions = {
    id: "gh-contributions-summary",
    note: "GitHub contribution calendar metrics (via GraphQL) are distinct from raw commit records collected from public repository endpoints.",
    available: gqlContrib.available,
    unavailableReason: gqlContrib.reason,
    totals: gqlContrib.totals,
    streaks,
    calendar: gqlContrib.calendar,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: gqlContrib.available ? "synced" : "partial",
    source: "github-graphql-api",
  };

  const activeCount = repositories.filter((r) => !r.isArchived).length;
  const archivedCount = repositories.filter((r) => r.isArchived).length;
  const creationByYear = {};
  for (const r of repositories) {
    const yr = String(new Date(r.createdAt).getUTCFullYear());
    creationByYear[yr] = (creationByYear[yr] || 0) + 1;
  }

  const statistics = {
    id: "gh-statistics-summary",
    totalPublicRepositories: profile.publicRepos,
    syncedRepositoryCount: repositories.length,
    totalStarsReceived: repositories.reduce((s, r) => s + r.stars, 0),
    totalForks: repositories.reduce((s, r) => s + r.forks, 0),
    totalAvailableCommitsSampled: recentCommits.length,
    activeRepositoryCount: activeCount,
    archivedRepositoryCount: archivedCount,
    creationByYear,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "computed",
    source: "github-derived-analytics",
  };

  const syncMeta = {
    id: "gh-sync-meta",
    username: targetUser,
    syncStatus: errors.length ? "completed_with_warnings" : "success",
    lastSuccessfulSync: startedAt,
    errorCount: errors.length,
    errors,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "active",
    source: "github-actions-sync",
  };

  await writeJson(path.join(GITHUB_DIR, "profile.json"), profile);
  await writeJson(path.join(GITHUB_DIR, "repositories.json"), {
    id: "gh-repositories-collection",
    items: repositories,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "synced",
    source: "github-rest-api",
  });
  await writeJson(path.join(GITHUB_DIR, "contributions.json"), contributions);
  await writeJson(path.join(GITHUB_DIR, "activity.json"), {
    id: "gh-activity-collection",
    items: activity,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "synced",
    source: "github-rest-events",
  });
  await writeJson(path.join(GITHUB_DIR, "commits.json"), {
    id: "gh-commits-collection",
    note: "Recent commits sampled from top recently pushed public repositories.",
    items: recentCommits,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "synced",
    source: "github-rest-repos",
  });
  await writeJson(path.join(GITHUB_DIR, "languages.json"), languagesPayload);
  await writeJson(path.join(GITHUB_DIR, "statistics.json"), statistics);
  await writeJson(path.join(GITHUB_DIR, "releases.json"), {
    id: "gh-releases-collection",
    items: releases,
    createdAt: startedAt,
    updatedAt: startedAt,
    status: "synced",
    source: "github-rest-releases",
  });
  await writeJson(path.join(GITHUB_DIR, "sync-meta.json"), syncMeta);

  console.log(`GitHub sync complete for ${targetUser}. Repos: ${repositories.length}, Commits sampled: ${recentCommits.length}, Events: ${activity.length}, Warnings: ${errors.length}`);
}

main().catch(async (err) => {
  console.error("Fatal sync error:", err);
  await writeJson(path.join(GITHUB_DIR, "sync-meta.json"), {
    id: "gh-sync-meta",
    username: USERNAME,
    syncStatus: "failed",
    lastAttempt: new Date().toISOString(),
    errorCount: 1,
    errors: [err.message],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "error",
    source: "github-actions-sync",
  });
  process.exit(1);
});

import type {
  GitHubActivity,
  GitHubCommit,
  GitHubProfile,
  GitHubRepo,
  HubDatasets,
} from "../types/hub";

const CACHE_PREFIX = "abdo_hub_cache_v1:";
export const DRAFT_PREFIX = "abdo_hub_admin_draft:";

export function saveLocalDraft(datasetPath: string, payload: unknown): void {
  localStorage.setItem(`${DRAFT_PREFIX}${datasetPath}`, JSON.stringify(payload));
}

export function clearLocalDrafts(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(DRAFT_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

export function getLocalDraftCount(): number {
  return Object.keys(localStorage).filter((k) => k.startsWith(DRAFT_PREFIX)).length;
}

async function fetchJsonWithCache<T>(path: string, fallback: T): Promise<T> {
  const draftKey = `${DRAFT_PREFIX}${path}`;
  try {
    const draftRaw = localStorage.getItem(draftKey);
    if (draftRaw) return JSON.parse(draftRaw) as T;
  } catch {
    // Ignore malformed localStorage
  }

  try {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    try {
      localStorage.setItem(`${CACHE_PREFIX}${path}`, JSON.stringify(data));
    } catch {
      // Ignore quota exceeded
    }
    return data;
  } catch {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${path}`);
      if (cached) return JSON.parse(cached) as T;
    } catch {
      // Ignore
    }
    return fallback;
  }
}

export async function loadAllDatasets(): Promise<HubDatasets> {
  const [
    website,
    profileSettings,
    githubSyncSettings,
    ghProfile,
    ghRepos,
    ghContributions,
    ghActivity,
    ghCommits,
    ghLanguages,
    ghStats,
    ghReleases,
    ghSyncMeta,
    projects,
    projectCategories,
    experience,
    articles,
    journalCategories,
    knowledge,
    knowledgeCategories,
  ] = await Promise.all([
    fetchJsonWithCache<HubDatasets["website"]>("./data/settings/website.json", {
      id: "settings-website",
      siteName: "ABDO — Personal Digital Hub",
      shortTitle: "ABDO",
      domain: "https://abdokamelayed.github.io",
      defaultLanguage: "en",
      supportedLanguages: ["en", "ar"],
      defaultTheme: "light",
      defaultGlassMode: false,
      primaryAccent: "#0f172a",
      secondaryAccent: "#2563eb",
      seoDescription: { en: "", ar: "" },
      createdAt: "",
      updatedAt: "",
      status: "active",
      source: "fallback",
      version: "1.0.0",
    }),
    fetchJsonWithCache<HubDatasets["profileSettings"]>("./data/settings/profile.json", {
      id: "settings-profile",
      fullName: { en: "Abdo Kamel", ar: "عبدو كامل" },
      githubUsername: "AbdoKamelAyed",
      headline: { en: "", ar: "" },
      shortBio: { en: "", ar: "" },
      mission: { en: "", ar: "" },
      careerDirection: { en: "", ar: "" },
      technicalInterests: [],
      selectedAchievements: [],
      contact: { email: "", github: "https://github.com/AbdoKamelAyed", linkedin: "", website: "", otherLinks: [] },
      createdAt: "",
      updatedAt: "",
      status: "active",
      source: "fallback",
    }),
    fetchJsonWithCache<HubDatasets["githubSyncSettings"]>("./data/settings/github-sync.json", {
      id: "settings-github-sync",
      username: "AbdoKamelAyed",
      schedule: "daily",
      excludedRepos: [],
      featuredRepos: [],
      includeForksInLanguageStats: false,
      createdAt: "",
      updatedAt: "",
      status: "active",
      source: "fallback",
    }),
    fetchJsonWithCache<GitHubProfile>("./data/github/profile.json", {
      id: "gh-profile-fallback",
      username: "AbdoKamelAyed",
      name: "Abdo Kamel",
      avatarUrl: null,
      bio: null,
      company: null,
      location: null,
      blog: null,
      publicRepos: null,
      publicGists: null,
      followers: null,
      following: null,
      profileUrl: "https://github.com/AbdoKamelAyed",
      createdAt: "",
      updatedAt: "",
      status: "unavailable",
      source: "fallback",
    }),
    fetchJsonWithCache<{ items: GitHubRepo[] }>("./data/github/repositories.json", { items: [] }),
    fetchJsonWithCache<HubDatasets["github"]["contributions"]>("./data/github/contributions.json", {
      id: "gh-contributions-summary",
      note: "",
      available: false,
      unavailableReason: "Unavailable",
      totals: null,
      streaks: { currentStreak: null, longestStreak: null, mostActiveDay: null, weeklyTotals: [] },
      calendar: null,
      createdAt: "",
      updatedAt: "",
      status: "unavailable",
      source: "fallback",
    }),
    fetchJsonWithCache<{ items: GitHubActivity[] }>("./data/github/activity.json", { items: [] }),
    fetchJsonWithCache<{ items: GitHubCommit[] }>("./data/github/commits.json", { items: [] }),
    fetchJsonWithCache<HubDatasets["github"]["languages"]>("./data/github/languages.json", {
      disclaimer: "",
      totalBytes: 0,
      languages: [],
    }),
    fetchJsonWithCache<HubDatasets["github"]["statistics"]>("./data/github/statistics.json", {
      id: "gh-statistics-summary",
      totalPublicRepositories: null,
      syncedRepositoryCount: null,
      totalStarsReceived: null,
      totalForks: null,
      totalAvailableCommitsSampled: null,
      activeRepositoryCount: null,
      archivedRepositoryCount: null,
      creationByYear: {},
    }),
    fetchJsonWithCache<{ items: HubDatasets["github"]["releases"] }>("./data/github/releases.json", { items: [] }),
    fetchJsonWithCache<HubDatasets["github"]["syncMeta"]>("./data/github/sync-meta.json", {
      id: "gh-sync-meta",
      username: "AbdoKamelAyed",
      syncStatus: "unavailable",
      lastSuccessfulSync: null,
      errorCount: 0,
      errors: [],
    }),
    fetchJsonWithCache<{ items: HubDatasets["projects"] }>("./data/projects/projects.json", { items: [] }),
    fetchJsonWithCache<{ items: HubDatasets["projectCategories"] }>("./data/projects/categories.json", { items: [] }),
    fetchJsonWithCache<HubDatasets["experience"]>("./data/experience/experience.json", {
      id: "experience-collection",
      items: [],
      skills: [],
      knowledgeAreas: [],
      researchInterests: [],
      caseStudies: [],
      professionalDevelopment: [],
      createdAt: "",
      updatedAt: "",
      status: "active",
      source: "fallback",
    }),
    fetchJsonWithCache<{ items: HubDatasets["allArticlesRaw"] }>("./data/journal/articles.json", { items: [] }),
    fetchJsonWithCache<{ items: HubDatasets["journalCategories"] }>("./data/journal/categories.json", { items: [] }),
    fetchJsonWithCache<{ items: HubDatasets["allKnowledgeRaw"] }>("./data/knowledge/entries.json", { items: [] }),
    fetchJsonWithCache<{ items: HubDatasets["knowledgeCategories"] }>("./data/knowledge/categories.json", { items: [] }),
  ]);

  const rawArticles = articles.items || [];
  const rawKnowledge = knowledge.items || [];

  return {
    website,
    profileSettings,
    githubSyncSettings,
    github: {
      profile: ghProfile,
      repositories: ghRepos.items || [],
      contributions: ghContributions,
      activity: ghActivity.items || [],
      commits: ghCommits.items || [],
      languages: ghLanguages,
      statistics: ghStats,
      releases: ghReleases.items || [],
      syncMeta: ghSyncMeta,
    },
    projects: projects.items || [],
    projectCategories: projectCategories.items || [],
    experience,
    articles: rawArticles.filter((a) => a.status === "published"),
    allArticlesRaw: rawArticles,
    journalCategories: journalCategories.items || [],
    knowledge: rawKnowledge.filter((k) => k.status === "published"),
    allKnowledgeRaw: rawKnowledge,
    knowledgeCategories: knowledgeCategories.items || [],
  };
}

/**
 * Unauthenticated client-side public GitHub refresh (strictly optional, zero tokens, graceful fallback).
 */
export async function refreshPublicGithubLive(username: string): Promise<{
  ok: boolean;
  message: string;
  publicRepos?: number;
  followers?: number;
}> {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      return { ok: false, message: `GitHub API returned HTTP ${res.status}. Using cached JSON datasets.` };
    }
    const raw = await res.json();
    return {
      ok: true,
      message: `Live public check succeeded (${raw.public_repos} public repositories, ${raw.followers} followers). Full deep sync runs via GitHub Actions.`,
      publicRepos: raw.public_repos,
      followers: raw.followers,
    };
  } catch {
    return { ok: false, message: "Network unavailable for live GitHub check. Cached JSON datasets remain active." };
  }
}

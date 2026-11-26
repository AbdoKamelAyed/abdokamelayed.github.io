import type {
  ArticleRecord,
  GitHubRepo,
  HubDatasets,
  JournalIssueRecord,
  KnowledgeEntry,
  MediaAssetRecord,
  MediaAssetType,
  ProjectRecord,
} from "../types/hub";

export interface MonthlyTimelinePoint {
  month: string;
  articles: number;
  projects: number;
  issues: number;
  knowledge: number;
  total: number;
}

export interface MediaMixBucket {
  type: MediaAssetType;
  count: number;
  bytes: number;
  sharePercent: number;
}

export interface TopRepoMetric {
  id: string;
  name: string;
  stars: number;
  forks: number;
  sizeKb: number;
  primaryLanguage: string;
}

export interface AdminChartMetrics {
  timeline: MonthlyTimelinePoint[];
  mediaMix: MediaMixBucket[];
  topRepos: TopRepoMetric[];
  publishHealth: {
    label: string;
    published: number;
    draft: number;
  }[];
}

function extractMonthKey(iso?: string | null): string | null {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

export function computeEditorialTimeline(
  articles: ArticleRecord[],
  projects: ProjectRecord[],
  issues: JournalIssueRecord[],
  knowledge: KnowledgeEntry[],
  maxMonths = 8
): MonthlyTimelinePoint[] {
  const buckets = new Map<string, MonthlyTimelinePoint>();

  const ensure = (month: string) => {
    let existing = buckets.get(month);
    if (!existing) {
      existing = { month, articles: 0, projects: 0, issues: 0, knowledge: 0, total: 0 };
      buckets.set(month, existing);
    }
    return existing;
  };

  for (const a of articles) {
    const key = extractMonthKey(a.publishedAt || a.createdAt);
    if (key) {
      const b = ensure(key);
      b.articles += 1;
      b.total += 1;
    }
  }
  for (const p of projects) {
    const key = extractMonthKey(p.updatedAt || p.createdAt);
    if (key) {
      const b = ensure(key);
      b.projects += 1;
      b.total += 1;
    }
  }
  for (const iss of issues) {
    const key = extractMonthKey(iss.publishedAt || iss.createdAt);
    if (key) {
      const b = ensure(key);
      b.issues += 1;
      b.total += 1;
    }
  }
  for (const k of knowledge) {
    const key = extractMonthKey(k.updatedAt || k.createdAt);
    if (key) {
      const b = ensure(key);
      b.knowledge += 1;
      b.total += 1;
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-maxMonths);
}

export function computeMediaMixBreakdown(mediaAssets: MediaAssetRecord[]): MediaMixBucket[] {
  const types: MediaAssetType[] = ["pdf", "image", "video", "audio", "code"];
  const map = new Map<MediaAssetType, { count: number; bytes: number }>(
    types.map((t) => [t, { count: 0, bytes: 0 }])
  );

  for (const asset of mediaAssets) {
    const entry = map.get(asset.mediaType);
    if (entry) {
      entry.count += 1;
      entry.bytes += asset.sizeBytes || 0;
    }
  }

  const total = mediaAssets.length;
  return types.map((t) => {
    const entry = map.get(t) || { count: 0, bytes: 0 };
    return {
      type: t,
      count: entry.count,
      bytes: entry.bytes,
      sharePercent: total > 0 ? Math.round((entry.count / total) * 100) : 0,
    };
  });
}

export function computeTopRepoMetrics(repos: GitHubRepo[], limit = 6): TopRepoMetric[] {
  return [...repos]
    .sort((a, b) => b.stars - a.stars || b.forks - a.forks || b.sizeKb - a.sizeKb)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      name: r.name,
      stars: r.stars,
      forks: r.forks,
      sizeKb: r.sizeKb,
      primaryLanguage: r.primaryLanguage || "Other",
    }));
}

export function computeAdminChartMetrics(data: HubDatasets): AdminChartMetrics {
  const timeline = computeEditorialTimeline(
    data.allArticlesRaw,
    data.projects,
    data.allIssuesRaw,
    data.allKnowledgeRaw
  );
  const mediaMix = computeMediaMixBreakdown(data.mediaAssets);
  const topRepos = computeTopRepoMetrics(data.github.repositories);

  const publishHealth = [
    {
      label: "Articles",
      published: data.allArticlesRaw.filter((a) => a.status === "published").length,
      draft: data.allArticlesRaw.filter((a) => a.status !== "published").length,
    },
    {
      label: "Issues",
      published: data.allIssuesRaw.filter((i) => i.status === "published").length,
      draft: data.allIssuesRaw.filter((i) => i.status !== "published").length,
    },
    {
      label: "Knowledge",
      published: data.allKnowledgeRaw.filter((k) => k.status === "published").length,
      draft: data.allKnowledgeRaw.filter((k) => k.status !== "published").length,
    },
    {
      label: "Projects",
      published: data.projects.filter((p) => p.status !== "Archived").length,
      draft: data.projects.filter((p) => p.status === "Archived").length,
    },
  ];

  return {
    timeline,
    mediaMix,
    topRepos,
    publishHealth,
  };
}

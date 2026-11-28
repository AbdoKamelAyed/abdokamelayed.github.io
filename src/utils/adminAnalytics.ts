import type {
  ArticleRecord,
  GitHubRepo,
  HubDatasets,
  JournalIssueRecord,
  KnowledgeEntry,
  Lang,
  LocalizedText,
  MediaAssetRecord,
  MediaAssetType,
  ProjectRecord,
} from "../types/hub";
import type { AdminAccountRecord, AdminAuditEntry } from "./adminAuth";
import {
  ADMIN_WORKSPACE_MODULES,
  resolveEffectiveModules,
  type AdminRole,
} from "./adminPermissions";
import { calculateReadingTimeMinutes, countWords } from "./analytics";
import { loc } from "./i18n";
import { calculateIssueStats, resolveIssueArticles } from "./issues";
import { analyzeSeoAudit } from "./seoEngine";

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

export interface RoleDashboardMetrics {
  role: AdminRole;
  articleDepths: {
    id: string;
    title: string;
    words: number;
    minutes: number;
    status: "published" | "draft";
  }[];
  topTopics: { topic: string; count: number }[];
  formatBreakdown: { format: string; count: number }[];
  roleDistribution: { role: AdminRole; count: number }[];
  auditBreakdown: { category: string; count: number }[];
}

export interface PositionChartsBundle {
  editor: {
    wordBars: { id: string; title: string; words: number; minutes: number; status: "published" | "draft" }[];
    formatCounts: { label: string; count: number }[];
    publishedCount: number;
    draftCount: number;
    bilingualCount: number;
    totalCount: number;
  };
  media: {
    storageMix: { id: "local" | "drive" | "github"; label: string; count: number; bytes: number }[];
    typeMix: MediaMixBucket[];
    totalBytes: number;
  };
  issues: {
    cadenceCounts: { cadence: string; count: number }[];
    editionBars: { id: string; issueNumber: string; title: string; articleCount: number; minutes: number }[];
  };
  projects: {
    statusCounts: { status: string; count: number }[];
    techCounts: { tech: string; count: number }[];
    featuredCount: number;
    totalCount: number;
  };
  knowledge: {
    personalCount: number;
    verifiedCount: number;
    categoryCounts: { category: string; count: number }[];
    experienceCounts: { kind: string; count: number }[];
  };
  github: {
    monthlyActivity: { month: string; count: number }[];
    topLanguages: { language: string; percentage: number }[];
    topRepos: TopRepoMetric[];
  };
  settings: {
    seoCounts: { pass: number; warn: number; fail: number; total: number };
    seoChecks: { id: string; label: string; status: "pass" | "warn" | "fail" }[];
    profileReadiness: { label: string; ready: boolean }[];
  };
  access: {
    roleCounts: { role: AdminRole; count: number }[];
    operatorCoverage: {
      id: string;
      username: string;
      displayName: string;
      role: AdminRole;
      moduleCount: number;
      totalModules: number;
    }[];
    auditBuckets: { label: string; count: number }[];
  };
}

function extractMonthKey(iso?: string | null): string | null {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

function hasLocalizedLang(value: LocalizedText | undefined, code: "en" | "ar"): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value[code]?.trim());
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

function summarizeAuditBuckets(auditLog: AdminAuditEntry[]): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const entry of auditLog) {
    const verb = (entry.action || "Other").split(/\s+/)[0] || "Other";
    map.set(verb, (map.get(verb) || 0) + 1);
  }
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function computeRoleDashboardMetrics(
  data: HubDatasets,
  role: AdminRole,
  lang: Lang,
  accounts: AdminAccountRecord[] = [],
  auditLog: AdminAuditEntry[] = []
): RoleDashboardMetrics {
  const articleDepths = [...data.allArticlesRaw]
    .map((a) => {
      const body = loc(a.content, lang);
      const words = countWords(body);
      return {
        id: a.id,
        title: loc(a.title, lang) || a.slug,
        words,
        minutes: calculateReadingTimeMinutes(body),
        status: a.status === "published" ? ("published" as const) : ("draft" as const),
      };
    })
    .sort((a, b) => b.words - a.words)
    .slice(0, 6);

  const topicMap = new Map<string, number>();
  for (const a of data.allArticlesRaw) {
    for (const tag of a.tags || []) {
      topicMap.set(tag, (topicMap.get(tag) || 0) + 1);
    }
  }
  for (const k of data.allKnowledgeRaw) {
    for (const tag of k.tags || []) {
      topicMap.set(tag, (topicMap.get(tag) || 0) + 1);
    }
  }
  const topTopics = [...topicMap.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, 6);

  const formatMap = new Map<string, number>();
  for (const a of data.allArticlesRaw) {
    formatMap.set(a.type, (formatMap.get(a.type) || 0) + 1);
  }
  const formatBreakdown = [...formatMap.entries()]
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  const roles: AdminRole[] = ["Owner", "Managing Editor", "Author"];
  const roleDistribution = roles.map((r) => ({
    role: r,
    count: accounts.filter((a) => a.role === r).length,
  }));

  return {
    role,
    articleDepths,
    topTopics,
    formatBreakdown,
    roleDistribution,
    auditBreakdown: summarizeAuditBuckets(auditLog),
  };
}

export function computePositionSectionMetrics(
  data: HubDatasets,
  lang: Lang,
  accounts: AdminAccountRecord[] = [],
  auditLog: AdminAuditEntry[] = []
): PositionChartsBundle {
  // 1. Editor metrics
  const wordBars = [...data.allArticlesRaw]
    .map((a) => {
      const body = loc(a.content, lang);
      return {
        id: a.id,
        title: loc(a.title, lang) || a.slug,
        words: countWords(body),
        minutes: calculateReadingTimeMinutes(body),
        status: a.status === "published" ? ("published" as const) : ("draft" as const),
      };
    })
    .sort((a, b) => b.words - a.words)
    .slice(0, 6);

  const formatMap = new Map<string, number>();
  let bilingualCount = 0;
  for (const a of data.allArticlesRaw) {
    formatMap.set(a.type, (formatMap.get(a.type) || 0) + 1);
    const hasEn = hasLocalizedLang(a.title, "en") && hasLocalizedLang(a.content, "en");
    const hasAr = hasLocalizedLang(a.title, "ar") && hasLocalizedLang(a.content, "ar");
    if (hasEn && hasAr) bilingualCount += 1;
  }

  // 2. Media metrics (Storage Provider + Media Type)
  const storageMap: Record<"local" | "drive" | "github", { count: number; bytes: number }> = {
    local: { count: 0, bytes: 0 },
    drive: { count: 0, bytes: 0 },
    github: { count: 0, bytes: 0 },
  };
  let totalBytes = 0;
  for (const m of data.mediaAssets) {
    const bytes = m.sizeBytes || 0;
    totalBytes += bytes;
    if (m.source === "google-drive" || m.url.includes("drive.google.com")) {
      storageMap.drive.count += 1;
      storageMap.drive.bytes += bytes;
    } else if (m.source === "github-repo" || m.url.includes("raw.githubusercontent.com") || m.url.includes("github.com")) {
      storageMap.github.count += 1;
      storageMap.github.bytes += bytes;
    } else {
      storageMap.local.count += 1;
      storageMap.local.bytes += bytes;
    }
  }

  // 3. Issues metrics
  const cadences = ["weekly", "monthly", "annual", "curated"];
  const cadenceCounts = cadences.map((cadence) => ({
    cadence,
    count: data.allIssuesRaw.filter((i) => i.cadence === cadence).length,
  }));
  const editionBars = data.allIssuesRaw.slice(0, 6).map((iss) => {
    const resolved = resolveIssueArticles(iss, data.allArticlesRaw);
    const st = calculateIssueStats(resolved, lang);
    return {
      id: iss.id,
      issueNumber: iss.issueNumber,
      title: loc(iss.title, lang) || iss.slug,
      articleCount: st.articleCount,
      minutes: st.totalReadingMinutes,
    };
  });

  // 4. Projects metrics
  const statusMap = new Map<string, number>();
  const techMap = new Map<string, number>();
  let featuredCount = 0;
  for (const p of data.projects) {
    statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
    if (p.featured) featuredCount += 1;
    for (const tech of p.techStack || []) {
      techMap.set(tech, (techMap.get(tech) || 0) + 1);
    }
  }

  // 5. Knowledge & Work metrics
  let personalCount = 0;
  let verifiedCount = 0;
  const kCatMap = new Map<string, number>();
  for (const k of data.allKnowledgeRaw) {
    if (k.entryType === "verified-reference") verifiedCount += 1;
    else personalCount += 1;
    kCatMap.set(k.category, (kCatMap.get(k.category) || 0) + 1);
  }
  const expMap = new Map<string, number>();
  for (const ex of data.experience.items) {
    expMap.set(ex.kind, (expMap.get(ex.kind) || 0) + 1);
  }

  // 6. GitHub metrics
  const ghMonthMap = new Map<string, number>();
  const weeks = data.github.contributions?.calendar?.weeks || [];
  for (const w of weeks) {
    for (const d of w.contributionDays || []) {
      const m = extractMonthKey(d.date);
      if (m) ghMonthMap.set(m, (ghMonthMap.get(m) || 0) + d.contributionCount);
    }
  }
  if (ghMonthMap.size === 0) {
    for (const c of data.github.commits || []) {
      const m = extractMonthKey(c.createdAt);
      if (m) ghMonthMap.set(m, (ghMonthMap.get(m) || 0) + 1);
    }
  }
  const monthlyActivity = [...ghMonthMap.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // 7. Settings & SEO metrics
  const seoAudit = analyzeSeoAudit(data, lang);
  const seoCounts = {
    pass: seoAudit.filter((c) => c.status === "pass").length,
    warn: seoAudit.filter((c) => c.status === "warn").length,
    fail: seoAudit.filter((c) => c.status === "fail").length,
    total: seoAudit.length,
  };
  const profileReadiness = [
    { label: "Headline", ready: Boolean(loc(data.profileSettings.headline, lang)) },
    { label: "Bio", ready: Boolean(loc(data.profileSettings.shortBio, lang)) },
    { label: "Avatar", ready: Boolean(data.profileSettings.avatarUrl) },
    { label: "GitHub", ready: Boolean(data.profileSettings.githubUsername) },
    { label: "Email", ready: Boolean(data.profileSettings.contact?.email) },
    { label: "SEO OG", ready: Boolean(data.website.ogImage) },
  ];

  // 8. Access & Governance metrics
  const roles: AdminRole[] = ["Owner", "Managing Editor", "Author"];
  const totalModules = ADMIN_WORKSPACE_MODULES.length;
  const roleCounts = roles.map((role) => ({
    role,
    count: accounts.filter((a) => a.role === role).length,
  }));
  const operatorCoverage = accounts.map((acc) => ({
    id: acc.id,
    username: acc.username,
    displayName: acc.displayName,
    role: acc.role,
    moduleCount: resolveEffectiveModules({
      role: acc.role,
      allowedModules: acc.allowedModules,
    }).length,
    totalModules,
  }));

  return {
    editor: {
      wordBars,
      formatCounts: [...formatMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      publishedCount: data.allArticlesRaw.filter((a) => a.status === "published").length,
      draftCount: data.allArticlesRaw.filter((a) => a.status !== "published").length,
      bilingualCount,
      totalCount: data.allArticlesRaw.length,
    },
    media: {
      storageMix: [
        { id: "local", label: "Local / Bundled", ...storageMap.local },
        { id: "drive", label: "Google Drive", ...storageMap.drive },
        { id: "github", label: "GitHub Repo", ...storageMap.github },
      ],
      typeMix: computeMediaMixBreakdown(data.mediaAssets),
      totalBytes,
    },
    issues: {
      cadenceCounts,
      editionBars,
    },
    projects: {
      statusCounts: [...statusMap.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      techCounts: [...techMap.entries()]
        .map(([tech, count]) => ({ tech, count }))
        .sort((a, b) => b.count - a.count || a.tech.localeCompare(b.tech))
        .slice(0, 6),
      featuredCount,
      totalCount: data.projects.length,
    },
    knowledge: {
      personalCount,
      verifiedCount,
      categoryCounts: [...kCatMap.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      experienceCounts: [...expMap.entries()]
        .map(([kind, count]) => ({ kind, count }))
        .sort((a, b) => b.count - a.count),
    },
    github: {
      monthlyActivity,
      topLanguages: data.github.languages.languages.slice(0, 6).map((l) => ({
        language: l.language,
        percentage: l.percentage,
      })),
      topRepos: computeTopRepoMetrics(data.github.repositories),
    },
    settings: {
      seoCounts,
      seoChecks: seoAudit.map((c) => ({ id: c.id, label: c.title, status: c.status })),
      profileReadiness,
    },
    access: {
      roleCounts,
      operatorCoverage,
      auditBuckets: summarizeAuditBuckets(auditLog).map((b) => ({
        label: b.category,
        count: b.count,
      })),
    },
  };
}

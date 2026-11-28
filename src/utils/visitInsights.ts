import type { ArticleRecord, HubDatasets, Lang, ProjectRecord } from "../types/hub";
import { loc } from "./i18n";

export const VISIT_INSIGHTS_STORAGE_KEY = "abdo_hub_visit_insights_v1";
const SESSION_ID_KEY = "abdo_hub_visit_session_id";
const MAX_RECENT_EVENTS = 500;
const DEDUPE_WINDOW_MS = 2000;

export type VisitorDeviceType = "mobile" | "tablet" | "desktop";

export interface VisitEventRecord {
  id: string;
  path: string;
  section: string;
  targetId?: string;
  title: string;
  timestamp: string;
  dateKey: string;
  device: VisitorDeviceType;
  referrerHost: string;
  lang: Lang;
  sessionId: string;
}

export interface VisitInsightsStore {
  version: number;
  totalVisits: number;
  uniqueSessionIds: string[];
  dailyCounts: Record<string, number>;
  sectionCounts: Record<string, number>;
  routeCounts: Record<string, number>;
  articleViews: Record<string, number>;
  projectViews: Record<string, number>;
  deviceCounts: Record<VisitorDeviceType, number>;
  langCounts: Record<Lang, number>;
  referrerCounts: Record<string, number>;
  recentEvents: VisitEventRecord[];
  lastRecordedPath?: string;
  lastRecordedAtMs?: number;
}

export interface VisitRecordInput {
  path: string;
  section: string;
  targetId?: string | null;
  title?: string;
  timestamp?: string;
  device?: VisitorDeviceType;
  referrerHost?: string;
  lang?: Lang;
  sessionId?: string;
}

export interface PublicVisitInsightsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  topArticle: { id: string; title: string; views: number; href: string } | null;
  topSection: { section: string; label: string; visits: number } | null;
}

export interface AdminVisitAnalytics {
  totalVisits: number;
  uniqueSessions: number;
  todayVisits: number;
  avgDailyVisits: number;
  dailyTrend: { dateKey: string; label: string; count: number }[];
  topRoutes: { path: string; section: string; count: number; sharePercent: number }[];
  topArticles: { slugOrId: string; title: string; views: number }[];
  topProjects: { slugOrId: string; title: string; views: number }[];
  deviceSplit: { device: VisitorDeviceType; count: number; sharePercent: number }[];
  languageSplit: { lang: Lang; count: number; sharePercent: number }[];
  referrerSplit: { host: string; count: number; sharePercent: number }[];
  recentEvents: VisitEventRecord[];
}

export function createEmptyVisitStore(): VisitInsightsStore {
  return {
    version: 1,
    totalVisits: 0,
    uniqueSessionIds: [],
    dailyCounts: {},
    sectionCounts: {},
    routeCounts: {},
    articleViews: {},
    projectViews: {},
    deviceCounts: { mobile: 0, tablet: 0, desktop: 0 },
    langCounts: { en: 0, ar: 0 },
    referrerCounts: {},
    recentEvents: [],
  };
}

export function detectVisitorDevice(viewportWidth?: number, userAgent = ""): VisitorDeviceType {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(ua)) return "mobile";
  if (typeof viewportWidth === "number" && viewportWidth > 0) {
    if (viewportWidth < 640) return "mobile";
    if (viewportWidth < 1024) return "tablet";
  }
  return "desktop";
}

export function extractReferrerHost(referrer?: string, currentHost?: string): string {
  const raw = (referrer || "").trim();
  if (!raw) return "direct";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (!host) return "direct";
    if (currentHost && host === currentHost.toLowerCase()) return "internal";
    return host;
  } catch {
    return "direct";
  }
}

function getDateKey(iso: string): string {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function recordVisitEvent(
  prevStore: VisitInsightsStore,
  input: VisitRecordInput
): VisitInsightsStore {
  const cleanSection = (input.section || "home").trim().toLowerCase();
  // Never track Admin workspace traffic into public visitor insights
  if (cleanSection === "admin" || cleanSection === "not-found") {
    return prevStore;
  }

  const ts = input.timestamp || new Date().toISOString();
  const parsedMs = Date.parse(ts);
  const nowMs = Number.isNaN(parsedMs) ? Date.now() : parsedMs;
  const cleanPath = (input.path || "#/").trim() || "#/";

  if (
    prevStore.lastRecordedPath === cleanPath &&
    typeof prevStore.lastRecordedAtMs === "number" &&
    Math.abs(nowMs - prevStore.lastRecordedAtMs) < DEDUPE_WINDOW_MS
  ) {
    return prevStore;
  }

  const dateKey = getDateKey(ts);
  const device: VisitorDeviceType = input.device || "desktop";
  const lang: Lang = input.lang === "ar" ? "ar" : "en";
  const referrerHost = (input.referrerHost || "direct").trim() || "direct";
  const sessionId = (input.sessionId || "anon").trim() || "anon";
  const targetId = input.targetId?.trim() || undefined;

  const uniqueSessionIds = prevStore.uniqueSessionIds.includes(sessionId)
    ? prevStore.uniqueSessionIds
    : [...prevStore.uniqueSessionIds.slice(-999), sessionId];

  const nextArticleViews = { ...prevStore.articleViews };
  if ((cleanSection === "article-detail" || (cleanSection === "journal" && targetId && targetId !== "issues")) && targetId) {
    nextArticleViews[targetId] = (nextArticleViews[targetId] || 0) + 1;
  }

  const nextProjectViews = { ...prevStore.projectViews };
  if ((cleanSection === "project-detail" || (cleanSection === "projects" && targetId)) && targetId) {
    nextProjectViews[targetId] = (nextProjectViews[targetId] || 0) + 1;
  }

  const event: VisitEventRecord = {
    id: `vis-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
    path: cleanPath,
    section: cleanSection,
    targetId,
    title: (input.title || cleanPath).trim(),
    timestamp: ts,
    dateKey,
    device,
    referrerHost,
    lang,
    sessionId,
  };

  return {
    version: 1,
    totalVisits: prevStore.totalVisits + 1,
    uniqueSessionIds,
    dailyCounts: {
      ...prevStore.dailyCounts,
      [dateKey]: (prevStore.dailyCounts[dateKey] || 0) + 1,
    },
    sectionCounts: {
      ...prevStore.sectionCounts,
      [cleanSection]: (prevStore.sectionCounts[cleanSection] || 0) + 1,
    },
    routeCounts: {
      ...prevStore.routeCounts,
      [cleanPath]: (prevStore.routeCounts[cleanPath] || 0) + 1,
    },
    articleViews: nextArticleViews,
    projectViews: nextProjectViews,
    deviceCounts: {
      ...prevStore.deviceCounts,
      [device]: (prevStore.deviceCounts[device] || 0) + 1,
    },
    langCounts: {
      ...prevStore.langCounts,
      [lang]: (prevStore.langCounts[lang] || 0) + 1,
    },
    referrerCounts: {
      ...prevStore.referrerCounts,
      [referrerHost]: (prevStore.referrerCounts[referrerHost] || 0) + 1,
    },
    recentEvents: [event, ...prevStore.recentEvents].slice(0, MAX_RECENT_EVENTS),
    lastRecordedPath: cleanPath,
    lastRecordedAtMs: nowMs,
  };
}

function getSectionDisplayLabel(section: string, lang: Lang): string {
  const labels: Record<string, { en: string; ar: string }> = {
    home: { en: "Home", ar: "الرئيسية" },
    projects: { en: "Projects", ar: "المشاريع" },
    "project-detail": { en: "Project Details", ar: "تفاصيل المشروع" },
    github: { en: "GitHub Intelligence", ar: "تحليلات GitHub" },
    work: { en: "Experience & Work", ar: "الخبرات" },
    now: { en: "Working On Now", ar: "ما أعمل عليه الآن" },
    journal: { en: "Journal", ar: "المدونة" },
    "article-detail": { en: "Articles", ar: "المقالات" },
    issues: { en: "Journal Issues", ar: "أعداد المجلة" },
    "issue-detail": { en: "Issue Editions", ar: "الأعداد" },
    knowledge: { en: "Knowledge", ar: "المعرفة" },
    about: { en: "About", ar: "عني" },
    contact: { en: "Contact", ar: "تواصل" },
  };
  const entry = labels[section];
  if (!entry) return section;
  return lang === "ar" ? entry.ar : entry.en;
}

export function getArticleViewCount(
  store: VisitInsightsStore,
  slugOrId: string,
  fallbackId?: string
): number {
  const bySlug = store.articleViews[slugOrId] || 0;
  const byId = fallbackId && fallbackId !== slugOrId ? store.articleViews[fallbackId] || 0 : 0;
  return bySlug + byId;
}

export function getPublicVisitInsights(
  store: VisitInsightsStore,
  articles: ArticleRecord[],
  lang: Lang,
  todayKey = new Date().toISOString().slice(0, 10)
): PublicVisitInsightsSummary {
  const todayVisits = store.dailyCounts[todayKey] || 0;

  let topArticle: PublicVisitInsightsSummary["topArticle"] = null;
  const articleEntries = Object.entries(store.articleViews).sort((a, b) => b[1] - a[1]);
  if (articleEntries.length > 0) {
    const [key, views] = articleEntries[0];
    const matched = articles.find((a) => a.slug === key || a.id === key);
    if (matched) {
      topArticle = {
        id: matched.id,
        title: loc(matched.title, lang),
        views,
        href: `#/journal/${encodeURIComponent(matched.slug || matched.id)}`,
      };
    }
  }

  let topSection: PublicVisitInsightsSummary["topSection"] = null;
  const sectionEntries = Object.entries(store.sectionCounts).sort((a, b) => b[1] - a[1]);
  if (sectionEntries.length > 0) {
    const [section, visits] = sectionEntries[0];
    topSection = {
      section,
      label: getSectionDisplayLabel(section, lang),
      visits,
    };
  }

  return {
    totalVisits: store.totalVisits,
    uniqueVisitors: store.uniqueSessionIds.length,
    todayVisits,
    topArticle,
    topSection,
  };
}

export function getAdminVisitAnalytics(
  store: VisitInsightsStore,
  articles: ArticleRecord[],
  projects: ProjectRecord[],
  lang: Lang,
  days = 7,
  anchorDateIso = new Date().toISOString().slice(0, 10)
): AdminVisitAnalytics {
  const anchor = new Date(`${anchorDateIso}T00:00:00Z`);
  const dailyTrend: { dateKey: string; label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyTrend.push({
      dateKey: key,
      label: key.slice(5),
      count: store.dailyCounts[key] || 0,
    });
  }

  const total = Math.max(1, store.totalVisits);
  const todayVisits = store.dailyCounts[anchorDateIso] || 0;
  const activeDayValues = Object.values(store.dailyCounts);
  const avgDailyVisits =
    activeDayValues.length > 0
      ? Math.round((activeDayValues.reduce((s, v) => s + v, 0) / activeDayValues.length) * 10) / 10
      : 0;

  const topRoutes = Object.entries(store.routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => {
      const matched = store.recentEvents.find((ev) => ev.path === path);
      return {
        path,
        section: matched?.section || "page",
        count,
        sharePercent: Math.round((count / total) * 100),
      };
    });

  const topArticles = Object.entries(store.articleViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([slugOrId, views]) => {
      const art = articles.find((a) => a.slug === slugOrId || a.id === slugOrId);
      return {
        slugOrId,
        title: art ? loc(art.title, lang) : slugOrId,
        views,
      };
    });

  const topProjects = Object.entries(store.projectViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([slugOrId, views]) => {
      const proj = projects.find((p) => p.slug === slugOrId || p.id === slugOrId);
      return {
        slugOrId,
        title: proj ? loc(proj.name, lang) : slugOrId,
        views,
      };
    });

  const devices: VisitorDeviceType[] = ["desktop", "mobile", "tablet"];
  const deviceSplit = devices.map((device) => {
    const count = store.deviceCounts[device] || 0;
    return {
      device,
      count,
      sharePercent: store.totalVisits > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const langs: Lang[] = ["en", "ar"];
  const languageSplit = langs.map((l) => {
    const count = store.langCounts[l] || 0;
    return {
      lang: l,
      count,
      sharePercent: store.totalVisits > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const referrerSplit = Object.entries(store.referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([host, count]) => ({
      host,
      count,
      sharePercent: store.totalVisits > 0 ? Math.round((count / total) * 100) : 0,
    }));

  return {
    totalVisits: store.totalVisits,
    uniqueSessions: store.uniqueSessionIds.length,
    todayVisits,
    avgDailyVisits,
    dailyTrend,
    topRoutes,
    topArticles,
    topProjects,
    deviceSplit,
    languageSplit,
    referrerSplit,
    recentEvents: store.recentEvents.slice(0, 20),
  };
}

export function exportVisitsCsv(store: VisitInsightsStore): string {
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const header = "timestamp,section,path,targetId,title,device,lang,referrerHost,sessionId";
  const rows = store.recentEvents.map((ev) =>
    [
      escapeCsv(ev.timestamp),
      escapeCsv(ev.section),
      escapeCsv(ev.path),
      escapeCsv(ev.targetId || ""),
      escapeCsv(ev.title),
      escapeCsv(ev.device),
      escapeCsv(ev.lang),
      escapeCsv(ev.referrerHost),
      escapeCsv(ev.sessionId),
    ].join(",")
  );
  return `${header}\n${rows.join("\n")}\n`;
}

export function loadVisitStore(): VisitInsightsStore {
  try {
    const raw = localStorage.getItem(VISIT_INSIGHTS_STORAGE_KEY);
    if (!raw) return createEmptyVisitStore();
    const parsed = JSON.parse(raw) as Partial<VisitInsightsStore>;
    if (!parsed || typeof parsed !== "object") return createEmptyVisitStore();
    const base = createEmptyVisitStore();
    return {
      ...base,
      ...parsed,
      uniqueSessionIds: Array.isArray(parsed.uniqueSessionIds) ? parsed.uniqueSessionIds : [],
      dailyCounts: parsed.dailyCounts || {},
      sectionCounts: parsed.sectionCounts || {},
      routeCounts: parsed.routeCounts || {},
      articleViews: parsed.articleViews || {},
      projectViews: parsed.projectViews || {},
      deviceCounts: { ...base.deviceCounts, ...(parsed.deviceCounts || {}) },
      langCounts: { ...base.langCounts, ...(parsed.langCounts || {}) },
      referrerCounts: parsed.referrerCounts || {},
      recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : [],
    };
  } catch {
    return createEmptyVisitStore();
  }
}

export function saveVisitStore(store: VisitInsightsStore): void {
  try {
    localStorage.setItem(VISIT_INSIGHTS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore full or restricted storage
  }
}

export function resetVisitStore(): VisitInsightsStore {
  const empty = createEmptyVisitStore();
  saveVisitStore(empty);
  return empty;
}

function getOrCreateVisitorSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return "sess-browser";
  }
}

export function trackRouteVisit(input: Omit<VisitRecordInput, "sessionId" | "device" | "referrerHost">): VisitInsightsStore {
  if (typeof window === "undefined") return createEmptyVisitStore();
  const current = loadVisitStore();
  const next = recordVisitEvent(current, {
    ...input,
    device: detectVisitorDevice(window.innerWidth, window.navigator?.userAgent || ""),
    referrerHost: extractReferrerHost(document.referrer, window.location.hostname),
    sessionId: getOrCreateVisitorSessionId(),
  });
  if (next !== current) {
    saveVisitStore(next);
  }
  return next;
}

export function resolveRouteVisitTitle(
  data: HubDatasets,
  route: { section: string; param?: string | null; subParam?: string | null },
  lang: Lang
): string {
  if (route.section === "journal" && route.param === "issues" && route.subParam) {
    const issue = data.issues.find((i) => i.slug === route.subParam || i.id === route.subParam);
    return issue ? loc(issue.title, lang) : route.subParam;
  }
  if (route.section === "journal" && route.param) {
    const art = data.articles.find((a) => a.slug === route.param || a.id === route.param);
    return art ? loc(art.title, lang) : route.param;
  }
  if (route.section === "projects" && route.param) {
    const proj = data.projects.find((p) => p.slug === route.param || p.id === route.param);
    return proj ? loc(proj.name, lang) : route.param;
  }
  return getSectionDisplayLabel(route.section, lang);
}

import type {
  ArticleRecord,
  JournalIssueCadence,
  JournalIssueRecord,
  JournalIssueSelectionMode,
  Lang,
} from "../types/hub";
import { calculateReadingTimeMinutes, countWords } from "./analytics";
import { loc } from "./i18n";

export function getIsoWeekKey(dateStr: string | null | undefined): string {
  if (!dateStr) return "Undated";
  const parsed = new Date(dateStr.trim().length === 10 ? `${dateStr.trim()}T12:00:00Z` : dateStr);
  if (Number.isNaN(parsed.getTime())) return "Undated";
  const d = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getPeriodKeyForCadence(
  dateStr: string | null | undefined,
  cadence: JournalIssueCadence
): string {
  if (!dateStr) return "curated";
  if (cadence === "curated") return "curated";
  if (cadence === "weekly") return getIsoWeekKey(dateStr);
  const clean = dateStr.trim();
  if (cadence === "monthly") return clean.slice(0, 7) || "Undated";
  return clean.slice(0, 4) || "Undated";
}

export function formatCadenceLabel(cadence: JournalIssueCadence, lang: Lang): string {
  const map: Record<JournalIssueCadence, { en: string; ar: string }> = {
    weekly: { en: "Weekly", ar: "أسبوعي" },
    monthly: { en: "Monthly", ar: "شهري" },
    annual: { en: "Annual", ar: "سنوي" },
    curated: { en: "Curated", ar: "مختار" },
  };
  return map[cadence]?.[lang] || cadence;
}

export function computeAutoIssueBuckets(
  articles: ArticleRecord[],
  cadence: Exclude<JournalIssueCadence, "curated">
): { periodKey: string; count: number; articleIds: string[] }[] {
  const map = new Map<string, ArticleRecord[]>();
  for (const art of articles) {
    const key = getPeriodKeyForCadence(art.publishedAt, cadence);
    const list = map.get(key) || [];
    list.push(art);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([periodKey, list]) => ({
      periodKey,
      count: list.length,
      articleIds: list.map((x) => x.id),
    }));
}

export function selectArticlesForIssue(
  articles: ArticleRecord[],
  opts: {
    cadence: JournalIssueCadence;
    selectionMode: JournalIssueSelectionMode;
    periodKey?: string;
    topics?: string[];
    manualArticleIds?: string[];
  }
): ArticleRecord[] {
  const sorted = [...articles].sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  if (opts.selectionMode === "manual") {
    const byId = new Map(sorted.map((a) => [a.id, a]));
    const picked: ArticleRecord[] = [];
    for (const id of opts.manualArticleIds || []) {
      const match = byId.get(id);
      if (match) picked.push(match);
    }
    return picked;
  }

  const normalizedTopics = new Set((opts.topics || []).map((t) => t.trim().toLowerCase()).filter(Boolean));
  const matchesTopic = (art: ArticleRecord): boolean => {
    if (normalizedTopics.size === 0) return true;
    const bag = [...(art.tags || []), ...(art.categories || []), art.type].map((x) => x.toLowerCase());
    return bag.some((item) => normalizedTopics.has(item));
  };

  if (opts.selectionMode === "topic") {
    return sorted.filter((art) => {
      if (!matchesTopic(art)) return false;
      if (opts.cadence !== "curated" && opts.periodKey && opts.periodKey !== "all") {
        return getPeriodKeyForCadence(art.publishedAt, opts.cadence) === opts.periodKey;
      }
      return true;
    });
  }

  // selectionMode === "period"
  return sorted.filter((art) => {
    if (opts.cadence !== "curated" && opts.periodKey && opts.periodKey !== "all") {
      if (getPeriodKeyForCadence(art.publishedAt, opts.cadence) !== opts.periodKey) {
        return false;
      }
    }
    return matchesTopic(art);
  });
}

export function resolveIssueArticles(
  issue: JournalIssueRecord,
  allArticles: ArticleRecord[]
): ArticleRecord[] {
  const byId = new Map(allArticles.map((a) => [a.id, a]));
  const explicit: ArticleRecord[] = [];
  for (const id of issue.articleIds || []) {
    const match = byId.get(id);
    if (match) explicit.push(match);
  }
  if (explicit.length > 0 || issue.selectionMode === "manual") {
    return explicit;
  }
  return selectArticlesForIssue(allArticles, {
    cadence: issue.cadence,
    selectionMode: issue.selectionMode,
    periodKey: issue.periodKey,
    topics: issue.topics,
    manualArticleIds: issue.articleIds,
  });
}

export function calculateIssueStats(
  articles: ArticleRecord[],
  lang: Lang
): { articleCount: number; totalWords: number; totalReadingMinutes: number; combinedTopics: string[] } {
  const totalWords = articles.reduce((sum, a) => sum + countWords(loc(a.content, lang)), 0);
  const totalReadingMinutes = articles.reduce(
    (sum, a) => sum + calculateReadingTimeMinutes(loc(a.content, lang)),
    0
  );
  const combinedTopics = Array.from(new Set(articles.flatMap((a) => a.tags || []))).slice(0, 8);
  return {
    articleCount: articles.length,
    totalWords,
    totalReadingMinutes: Math.max(articles.length > 0 ? 1 : 0, totalReadingMinutes),
    combinedTopics,
  };
}

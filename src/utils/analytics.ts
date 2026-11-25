import type {
  ArticleRecord,
  ExperienceDataset,
  GitHubContributions,
  GitHubRepo,
  HubDatasets,
  KnowledgeEntry,
  Lang,
  ProjectRecord,
} from "../types/hub";
import { loc } from "./i18n";
import { parseMarkdownBlocks, tokenizeInlineMarkdown } from "./markdown";

export function safeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("#/") || trimmed.startsWith("./") || trimmed.startsWith("/")) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

export function safeMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("idb://")) return trimmed;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  return safeUrl(trimmed);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function filterAndSortProjects(
  projects: ProjectRecord[],
  opts: { query: string; category: string; status: string; sort: "featured" | "updated" | "name"; lang: Lang }
): ProjectRecord[] {
  const q = opts.query.trim().toLowerCase();
  const filtered = projects.filter((p) => {
    if (opts.category !== "all" && p.category !== opts.category) return false;
    if (opts.status !== "all" && p.status !== opts.status) return false;
    if (q) {
      const hay = `${loc(p.name, opts.lang)} ${loc(p.shortDescription, opts.lang)} ${p.techStack.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (opts.sort === "updated") {
    return [...filtered].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }
  if (opts.sort === "name") {
    return [...filtered].sort((a, b) => loc(a.name, opts.lang).localeCompare(loc(b.name, opts.lang)));
  }
  return [...filtered].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (a.sortOrder || 99) - (b.sortOrder || 99)
  );
}

export function filterAndSortRepos(
  repos: GitHubRepo[],
  opts: { query: string; language: string; state: "all" | "active" | "archived" | "original"; sort: "updated" | "stars" | "forks" }
): GitHubRepo[] {
  const q = opts.query.trim().toLowerCase();
  const filtered = repos.filter((r) => {
    if (opts.language !== "all" && r.primaryLanguage !== opts.language) return false;
    if (opts.state === "active" && r.isArchived) return false;
    if (opts.state === "archived" && !r.isArchived) return false;
    if (opts.state === "original" && r.isFork) return false;
    if (q) {
      const hay = `${r.name} ${r.description || ""} ${(r.topics || []).join(" ")} ${r.primaryLanguage || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (opts.sort === "stars") return [...filtered].sort((a, b) => b.stars - a.stars);
  if (opts.sort === "forks") return [...filtered].sort((a, b) => b.forks - a.forks);
  return [...filtered].sort((a, b) => (b.pushedAt || b.updatedAt || "").localeCompare(a.pushedAt || a.updatedAt || ""));
}

export function summarizeMonthlyContributions(contributions: GitHubContributions): { month: string; count: number }[] {
  const weeks = contributions?.calendar?.weeks;
  if (!weeks?.length) return [];
  const buckets = new Map<string, number>();
  for (const w of weeks) {
    for (const d of w.contributionDays || []) {
      const ym = String(d.date || "").slice(0, 7);
      if (!ym) continue;
      buckets.set(ym, (buckets.get(ym) || 0) + (d.contributionCount || 0));
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([month, count]) => ({ month, count }));
}

export interface SearchHit {
  type: "project" | "repository" | "article" | "knowledge" | "experience";
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  route: string;
}

export function buildSearchIndex(data: HubDatasets, lang: Lang): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const p of data.projects) {
    hits.push({
      type: "project",
      id: p.id,
      title: loc(p.name, lang),
      subtitle: loc(p.shortDescription, lang),
      meta: [p.category, p.status, ...p.techStack].join(" "),
      route: `#/projects/${encodeURIComponent(p.slug || p.id)}`,
    });
  }

  for (const r of data.github.repositories) {
    hits.push({
      type: "repository",
      id: r.id,
      title: r.name,
      subtitle: r.description || "",
      meta: [r.primaryLanguage || "", ...(r.topics || [])].join(" "),
      route: "#/github",
    });
  }

  for (const a of data.articles) {
    hits.push({
      type: "article",
      id: a.id,
      title: loc(a.title, lang),
      subtitle: loc(a.subtitle, lang),
      meta: [...a.categories, ...a.tags].join(" "),
      route: `#/journal/${encodeURIComponent(a.slug || a.id)}`,
    });
  }

  for (const k of data.knowledge) {
    hits.push({
      type: "knowledge",
      id: k.id,
      title: loc(k.title, lang),
      subtitle: loc(k.summary, lang),
      meta: [k.category, ...k.tags, k.sourceAttribution].join(" "),
      route: "#/knowledge",
    });
  }

  for (const e of data.experience.items || []) {
    hits.push({
      type: "experience",
      id: e.id,
      title: loc(e.role, lang),
      subtitle: `${loc(e.organization, lang)} — ${loc(e.summary, lang)}`,
      meta: (e.skills || []).join(" "),
      route: "#/work",
    });
  }

  return hits;
}

export function searchDocuments(hits: SearchHit[], query: string, category: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  return hits
    .filter((h) => category === "all" || h.type === category)
    .filter((h) => {
      if (!q) return true;
      return `${h.title} ${h.subtitle} ${h.meta}`.toLowerCase().includes(q);
    })
    .slice(0, 24);
}

export function validateCollectionSchema(
  collection: { id?: string; items?: object[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!collection || typeof collection !== "object") {
    return { valid: false, errors: ["Collection must be an object"] };
  }
  const required = ["id", "createdAt", "updatedAt", "status", "source"];
  const seen = new Set<string>();
  const items = Array.isArray(collection.items) ? collection.items : [];
  items.forEach((rawItem, idx) => {
    const item = rawItem as Record<string, unknown>;
    for (const key of required) {
      if (item[key] === undefined || item[key] === null || item[key] === "") {
        errors.push(`Item #${idx + 1} missing required field "${key}"`);
      }
    }
    if (typeof item.id === "string") {
      if (seen.has(item.id)) errors.push(`Duplicate ID "${item.id}"`);
      seen.add(item.id);
    }
  });
  return { valid: errors.length === 0, errors };
}

export function groupArticlesByMonth(articles: ArticleRecord[]): { month: string; items: ArticleRecord[] }[] {
  const sorted = [...articles].sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const map = new Map<string, ArticleRecord[]>();
  for (const a of sorted) {
    const m = (a.publishedAt || "").slice(0, 7) || "Undated";
    const list = map.get(m) || [];
    list.push(a);
    map.set(m, list);
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }));
}

export function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function calculateReadingTimeMinutes(
  text: string | null | undefined,
  wordsPerMinute = 200
): number {
  const words = countWords(text);
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function calculateArticleScrollProgress(
  scrollY: number,
  articleBottomInDoc: number,
  viewportHeight: number,
  documentScrollHeight: number
): number {
  const docMax = Math.max(0, documentScrollHeight - viewportHeight);
  const articleMax = Math.max(0, articleBottomInDoc - viewportHeight);
  const targetMax = articleMax > 0 ? Math.min(articleMax, docMax || articleMax) : docMax;
  if (targetMax <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, scrollY / targetMax));
  return Math.round(clamped * 100);
}

export function getRelatedArticles(
  article: ArticleRecord,
  articles: ArticleRecord[],
  limit = 3
): ArticleRecord[] {
  const targetTags = new Set(article.tags || []);
  const targetCats = new Set([...(article.categories || []), article.type].filter(Boolean));

  return articles
    .filter((candidate) => candidate.id !== article.id)
    .map((candidate) => {
      const candidateCats = new Set([...(candidate.categories || []), candidate.type].filter(Boolean));
      const sharedTags = (candidate.tags || []).filter((tag) => targetTags.has(tag)).length;
      let sharedCategories = 0;
      for (const cat of candidateCats) {
        if (targetCats.has(cat)) sharedCategories += 1;
      }
      const score = sharedTags * 2 + sharedCategories;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.candidate.publishedAt || "").localeCompare(a.candidate.publishedAt || "")
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export interface ArticleSummaryResult {
  text: string;
  source: "abstract" | "excerpt";
}

function stripInlineMarkdown(text: string): string {
  return tokenizeInlineMarkdown(text)
    .map((token) => token.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSummary(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || clean.length <= maxLength) return clean;

  const slice = clean.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("؟ "),
    slice.lastIndexOf("۔ ")
  );
  if (sentenceEnd >= Math.floor(maxLength * 0.45)) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLength * 0.5)) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }
  return `${slice.trim()}…`;
}

export function extractArticleSummary(
  article: Pick<ArticleRecord, "abstract" | "content">,
  lang: Lang,
  maxLength = 220
): ArticleSummaryResult | null {
  const rawAbstract = article.abstract ? loc(article.abstract, lang) : "";
  const cleanAbstract = rawAbstract ? stripInlineMarkdown(rawAbstract) : "";
  if (cleanAbstract) {
    return {
      text: truncateSummary(cleanAbstract, Math.round(maxLength * 1.4)),
      source: "abstract",
    };
  }

  const rawContent = loc(article.content, lang);
  if (!rawContent || !rawContent.trim()) return null;

  const blocks = parseMarkdownBlocks(rawContent);
  const firstProse =
    blocks.find((b) => b.type === "p") ||
    blocks.find((b) => b.type === "blockquote") ||
    blocks.find((b) => b.type === "ul");

  if (!firstProse) return null;

  const rawText =
    firstProse.type === "ul"
      ? firstProse.items.join(" · ")
      : firstProse.type === "p" || firstProse.type === "blockquote"
        ? firstProse.text
        : "";

  const cleanExcerpt = stripInlineMarkdown(rawText);
  if (!cleanExcerpt) return null;

  return {
    text: truncateSummary(cleanExcerpt, maxLength),
    source: "excerpt",
  };
}

export type { ExperienceDataset, KnowledgeEntry };


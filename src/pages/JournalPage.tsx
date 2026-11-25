import React, { useMemo, useState } from "react";
import type { HubDatasets, Lang } from "../types/hub";
import { calculateReadingTimeMinutes, groupArticlesByMonth } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";
import { ArticleCard } from "../components/Cards";

export const JournalPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("all");
  const [viewMode, setViewMode] = useState<"editorial" | "archive">("editorial");

  const allTags = useMemo(
    () => Array.from(new Set(data.articles.flatMap((a) => a.tags))).sort(),
    [data.articles]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.articles.filter((a) => {
      if (category !== "all" && a.type !== category && !a.categories.includes(category)) return false;
      if (tag !== "all" && !a.tags.includes(tag)) return false;
      if (q) {
        const hay = `${loc(a.title, lang)} ${loc(a.subtitle, lang)} ${loc(a.content, lang)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.articles, query, category, tag, lang]);

  const archived = useMemo(() => groupArticlesByMonth(filtered), [filtered]);

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--hub-border)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t("journal.title", lang)}
          </h1>
          <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
            {t("journal.subtitle", lang)}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-[var(--hub-border)] p-1 hub-subtle shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("editorial")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              viewMode === "editorial" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
            }`}
          >
            {L("Editorial Grid", "عرض المجلة", lang)}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("archive")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              viewMode === "archive" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
            }`}
          >
            {L("Archive", "الأرشيف", lang)}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L("Search publications...", "ابحث في المنشورات...", lang)}
          aria-label={L("Search publications", "بحث في المنشورات", lang)}
          className="px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={L("Filter by category", "تصفية حسب الفئة", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Categories", "الفئات", lang)}</option>
          {data.journalCategories.map((c) => (
            <option key={c.id} value={c.slug}>{loc(c.name, lang)}</option>
          ))}
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label={L("Filter by tag", "تصفية حسب الوسم", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Tags", "الوسوم", lang)}</option>
          {allTags.map((tg) => (
            <option key={tg} value={tg}>#{tg}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 text-center text-sm text-[var(--hub-text-muted)]">
          {t("common.empty", lang)}
        </div>
      ) : viewMode === "editorial" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => (
            <ArticleCard key={a.id} article={a} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {archived.map((group) => (
            <section key={group.month} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
              <h2 className="font-mono text-sm font-semibold text-[var(--hub-text-muted)]">{group.month}</h2>
              <ul className="divide-y divide-[var(--hub-border)]">
                {group.items.map((art) => (
                  <li key={art.id} className="py-3 flex flex-wrap items-baseline justify-between gap-3">
                    <a href={`#/journal/${encodeURIComponent(art.slug || art.id)}`} className="font-semibold hover:underline">
                      {loc(art.title, lang)}
                    </a>
                    <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                      {art.type} · {formatDate(art.publishedAt, lang)} · {calculateReadingTimeMinutes(loc(art.content, lang))} {L("min read", "دقيقة قراءة", lang)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BookMarked, FileDown } from "lucide-react";
import type { HubDatasets, JournalIssueCadence, Lang } from "../types/hub";
import { calculateReadingTimeMinutes, groupArticlesByMonth, safeMediaUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";
import { calculateIssueStats, formatCadenceLabel, resolveIssueArticles } from "../utils/issues";
import { buildIssuePdfInput, generatePdfBytes, triggerPdfDownload } from "../utils/pdfMaker";
import { ArticleCard } from "../components/Cards";
import { ReadingProgressBar } from "../components/ReadingProgressBar";

export const JournalPage: React.FC<{
  data: HubDatasets;
  lang: Lang;
  initialView?: "editorial" | "issues" | "archive";
}> = ({ data, lang, initialView = "editorial" }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("all");
  const [viewMode, setViewMode] = useState<"editorial" | "issues" | "archive">(initialView);
  const [cadenceFilter, setCadenceFilter] = useState<"all" | JournalIssueCadence>("all");
  const journalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

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

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.issues.filter((issue) => {
      if (cadenceFilter !== "all" && issue.cadence !== cadenceFilter) return false;
      if (tag !== "all" && !issue.topics.includes(tag)) return false;
      if (q) {
        const hay = `${issue.issueNumber} ${issue.periodKey} ${loc(issue.title, lang)} ${loc(issue.subtitle, lang)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.issues, cadenceFilter, tag, query, lang]);

  const archived = useMemo(() => groupArticlesByMonth(filtered), [filtered]);

  return (
    <div ref={journalRef} className="space-y-8">
      {data.website.showReadingProgress !== false && (
        <ReadingProgressBar
          targetRef={journalRef}
          contentKey={`${viewMode}-${filtered.length}-${filteredIssues.length}`}
          showOnlyWhenScrollable
          label={L("Journal reading progress", "تقدم قراءة المدونة", lang)}
        />
      )}
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
              viewMode === "editorial" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
            }`}
          >
            {L("Editorial Grid", "عرض المجلة", lang)}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("issues")}
            data-testid="tab-journal-issues"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "issues" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>
              {L("Journal Issues", "أعداد المجلة", lang)} ({data.issues.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("archive")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
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
          placeholder={
            viewMode === "issues"
              ? L("Search editions by period, title, or number...", "ابحث في الأعداد...", lang)
              : L("Search publications...", "ابحث في المنشورات...", lang)
          }
          aria-label={L("Search publications", "بحث في المنشورات", lang)}
          className="px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        />

        {viewMode === "issues" ? (
          <select
            value={cadenceFilter}
            onChange={(e) => setCadenceFilter(e.target.value as "all" | JournalIssueCadence)}
            aria-label={L("Filter issue cadence", "تصفية الدورية", lang)}
            className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
          >
            <option value="all">{t("common.all", lang)} — {L("Weekly / Monthly / Annual", "جميع الدوريات", lang)}</option>
            <option value="weekly">{L("Weekly Issues", "الأعداد الأسبوعية", lang)}</option>
            <option value="monthly">{L("Monthly Issues", "الأعداد الشهرية", lang)}</option>
            <option value="annual">{L("Annual Editions", "الإصدارات السنوية", lang)}</option>
            <option value="curated">{L("Curated / Topic Collections", "مجموعات المواضيع", lang)}</option>
          </select>
        ) : (
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
        )}

        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label={L("Filter by tag", "تصفية حسب الوسم", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Topics & Tags", "المواضيع والوسوم", lang)}</option>
          {allTags.map((tg) => (
            <option key={tg} value={tg}>#{tg}</option>
          ))}
        </select>
      </div>

      {viewMode === "issues" ? (
        filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 text-center text-sm text-[var(--hub-text-muted)]">
            {L("No published journal issues match this filter.", "لا توجد أعداد منشورة مطابقة.", lang)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIssues.map((issue) => {
              const arts = resolveIssueArticles(issue, data.articles);
              const stats = calculateIssueStats(arts, lang);
              const cover =
                safeMediaUrl(issue.coverImage) || "/src/assets/images/journal_issue_cover_1795606693391.jpg";
              const href = `#/journal/issues/${encodeURIComponent(issue.slug || issue.id)}`;

              return (
                <article
                  key={issue.id}
                  data-testid={`issue-card-${issue.slug}`}
                  className="rounded-2xl border border-[var(--hub-border)] hub-surface overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-[var(--hub-border)]">
                    <img
                      src={cover}
                      alt={loc(issue.title, lang)}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--hub-text-muted)]">
                        <span className="font-semibold text-[var(--hub-secondary)]">{issue.issueNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatCadenceLabel(issue.cadence, lang)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{issue.periodKey}</span>
                      </div>

                      <h2 className="font-display text-lg font-semibold leading-snug">
                        <a href={href} className="hover:underline">
                          {loc(issue.title, lang)}
                        </a>
                      </h2>

                      <p className="text-sm text-[var(--hub-text-muted)] line-clamp-3">
                        {loc(issue.subtitle, lang)}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[var(--hub-border)]">
                      <div className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
                        <span>{stats.articleCount} {L("articles", "مقالات", lang)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{stats.totalReadingMinutes} {L("min read", "دقيقة قراءة", lang)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(issue.publishedAt, lang)}</span>
                      </div>

                      {issue.topics.length > 0 && (
                        <div className="text-xs font-mono text-[var(--hub-text-muted)] truncate">
                          {issue.topics.map((tg) => `#${tg}`).join(" · ")}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={href}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--hub-secondary)] hover:underline"
                        >
                          <span>{L("Read Issue", "تصفح العدد", lang)}</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const input = buildIssuePdfInput(
                              issue,
                              arts,
                              lang,
                              data.website.siteName || "ABDO Digital Hub"
                            );
                            triggerPdfDownload(`${issue.slug}.pdf`, generatePdfBytes(input));
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
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

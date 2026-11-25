import React, { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";

export const KnowledgePage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [entryType, setEntryType] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.knowledge.filter((k) => {
      if (category !== "all" && k.category !== category) return false;
      if (entryType !== "all" && k.entryType !== entryType) return false;
      if (q) {
        const hay = `${loc(k.title, lang)} ${loc(k.summary, lang)} ${k.sourceAttribution} ${k.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.knowledge, query, category, entryType, lang]);

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--hub-border)] pb-6 space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("knowledge.title", lang)}
        </h1>
        <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
          {t("knowledge.subtitle", lang)}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L("Search notes, references, sources...", "ابحث في الملاحظات والمراجع...", lang)}
          aria-label={L("Search knowledge archive", "بحث في أرشيف المعرفة", lang)}
          className="px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={L("Filter knowledge category", "تصفية فئة المعرفة", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Categories", "الفئات", lang)}</option>
          {data.knowledgeCategories.map((c) => (
            <option key={c.id} value={c.slug}>{loc(c.name, lang)}</option>
          ))}
        </select>
        <select
          value={entryType}
          onChange={(e) => setEntryType(e.target.value)}
          aria-label={L("Filter source distinction", "تصفية نوع المصدر", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Source Types", "أنواع المصادر", lang)}</option>
          <option value="personal-note">{L("Personal Notes", "ملاحظات شخصية", lang)}</option>
          <option value="verified-reference">{L("Verified References", "مراجع موثقة", lang)}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 text-center text-sm text-[var(--hub-text-muted)]">
          {t("common.empty", lang)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((entry) => {
            const refUrl = safeUrl(entry.sourceUrl);
            return (
              <article key={entry.id} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="text-xs text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {entry.entryType === "verified-reference"
                        ? L("Verified Reference", "مرجع موثق", lang)
                        : L("Personal Note", "ملاحظة شخصية", lang)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDate(entry.updatedAt, lang)}</span>
                  </div>
                  <h2 className="font-display text-lg font-semibold">{loc(entry.title, lang)}</h2>
                  <p className="text-sm text-[var(--hub-text)] leading-relaxed">{loc(entry.summary, lang)}</p>
                </div>

                <div className="pt-3 border-t border-[var(--hub-border)] space-y-2 text-xs">
                  <div className="text-[var(--hub-text-muted)]">
                    <span className="font-semibold text-[var(--hub-text)]">{t("common.source", lang)}:</span>{" "}
                    {entry.sourceAttribution}{" "}
                    {refUrl && (
                      <a
                        href={refUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline ms-1"
                      >
                        <span>{L("Source Link", "رابط المصدر", lang)}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {entry.tags.length > 0 && (
                    <div className="font-mono text-[var(--hub-text-muted)]">
                      {entry.tags.map((tg) => `#${tg}`).join(" · ")}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

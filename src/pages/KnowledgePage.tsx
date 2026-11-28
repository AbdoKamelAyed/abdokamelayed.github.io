import React, { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowUpRight, Printer } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { calculateReadingTimeMinutes, safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";
import {
  buildKnowledgeArchiveCoverMeta,
  buildKnowledgePrintCoverMeta,
  formatReadingTimeLabel,
} from "../utils/printMetadata";
import { PrintCoverPage } from "../components/PrintCoverPage";

export const KnowledgePage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [entryType, setEntryType] = useState("all");
  const [printingEntryId, setPrintingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingEntryId(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

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

  const printingEntry = useMemo(
    () => (printingEntryId ? data.knowledge.find((k) => k.id === printingEntryId) ?? null : null),
    [data.knowledge, printingEntryId]
  );

  const siteName = data.website.siteName || "ABDO Digital Hub";

  const archiveCoverMeta = useMemo(
    () =>
      buildKnowledgeArchiveCoverMeta({
        entries: filtered,
        siteName,
        formattedDate: formatDate(data.website.updatedAt || new Date().toISOString(), lang),
        lang,
      }),
    [filtered, siteName, data.website.updatedAt, lang]
  );

  const singleEntryCoverMeta = useMemo(() => {
    if (!printingEntry) return null;
    return buildKnowledgePrintCoverMeta({
      entry: printingEntry,
      siteName,
      formattedDate: formatDate(printingEntry.updatedAt || printingEntry.createdAt, lang),
      lang,
    });
  }, [printingEntry, siteName, lang]);

  const handlePrintEntry = (entryId: string) => {
    flushSync(() => {
      setPrintingEntryId(entryId);
    });
    window.print();
  };

  const handlePrintArchive = () => {
    flushSync(() => {
      setPrintingEntryId(null);
    });
    window.print();
  };

  return (
    <div
      className="knowledge-page space-y-8"
      data-printing-entry={printingEntry ? "true" : "false"}
    >
      {/* Dedicated single-entry printable view with cover page */}
      {printingEntry && singleEntryCoverMeta && (
        <div className="hidden print:block knowledge-single-print" data-testid="knowledge-single-print-view">
          <PrintCoverPage meta={singleEntryCoverMeta} lang={lang} />
          <article className="max-w-3xl mx-auto space-y-5 pt-4">
            <header className="space-y-2 border-b border-[var(--hub-border)] pb-4">
              <div className="text-xs font-mono text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
                <span>{singleEntryCoverMeta.sectionLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{singleEntryCoverMeta.dateLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{singleEntryCoverMeta.readingTimeLabel}</span>
              </div>
              <h2 className="font-display text-2xl font-bold">{singleEntryCoverMeta.title}</h2>
            </header>
            <p className="text-base leading-relaxed">{loc(printingEntry.summary, lang)}</p>
            <footer className="pt-4 border-t border-[var(--hub-border)] text-xs space-y-1.5">
              <div>
                <strong>{t("common.source", lang)}:</strong> {printingEntry.sourceAttribution}
                {safeUrl(printingEntry.sourceUrl) && (
                  <span className="ms-2 font-mono">({safeUrl(printingEntry.sourceUrl)})</span>
                )}
              </div>
              {printingEntry.tags.length > 0 && (
                <div className="font-mono text-[var(--hub-text-muted)]">
                  {printingEntry.tags.map((tg) => `#${tg}`).join(" · ")}
                </div>
              )}
            </footer>
          </article>
        </div>
      )}

      {/* Main Knowledge screen view + full-archive print cover */}
      <div className="knowledge-screen-archive space-y-8">
        {!printingEntry && <PrintCoverPage meta={archiveCoverMeta} lang={lang} />}

        <header className="border-b border-[var(--hub-border)] pb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              {t("knowledge.title", lang)}
            </h1>
            <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
              {t("knowledge.subtitle", lang)}
            </p>
          </div>
          <button
            type="button"
            data-testid="print-knowledge-archive-btn"
            onClick={handlePrintArchive}
            className="print:hidden px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--hub-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{L("Print Archive", "طباعة الأرشيف", lang)}</span>
          </button>
        </header>

        <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              const titleText = loc(entry.title, lang);
              const summaryText = loc(entry.summary, lang);
              const readMinutes = calculateReadingTimeMinutes(`${titleText} ${summaryText}`);
              const readLabel = formatReadingTimeLabel(readMinutes, lang);

              return (
                <article
                  key={entry.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-[var(--hub-border)] hub-surface p-5 sm:p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="text-xs text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-semibold text-[var(--hub-secondary)]">
                          {entry.entryType === "verified-reference"
                            ? L("Verified Reference", "مرجع موثق", lang)
                            : L("Personal Note", "ملاحظة شخصية", lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="break-words">{entry.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDate(entry.updatedAt, lang)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{readLabel}</span>
                      </div>

                      <button
                        type="button"
                        data-testid={`print-knowledge-${entry.id}`}
                        onClick={() => handlePrintEntry(entry.id)}
                        aria-label={`${L("Print", "طباعة", lang)}: ${titleText}`}
                        title={L("Print entry with cover page", "طباعة المدخل مع صفحة غلاف", lang)}
                        className="print:hidden h-7 px-2 inline-flex items-center gap-1 rounded-md border border-[var(--hub-border)] text-[11px] font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:border-[var(--hub-secondary)] cursor-pointer shrink-0"
                      >
                        <Printer className="w-3 h-3" aria-hidden="true" />
                        <span>{L("Print", "طباعة", lang)}</span>
                      </button>
                    </div>
                    <h2 className="font-display text-lg font-semibold break-words [overflow-wrap:anywhere]">{titleText}</h2>
                    <p className="text-sm text-[var(--hub-text)] leading-relaxed break-words">{summaryText}</p>
                  </div>

                  <div className="pt-3 border-t border-[var(--hub-border)] space-y-2 text-xs min-w-0">
                    <div className="text-[var(--hub-text-muted)] break-words">
                      <span className="font-semibold text-[var(--hub-text)]">{t("common.source", lang)}:</span>{" "}
                      {entry.sourceAttribution}{" "}
                      {refUrl && (
                        <a
                          href={refUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[var(--hub-secondary)] hover:underline ms-1"
                        >
                          <span>{L("Source Link", "رابط المصدر", lang)}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="font-mono text-[var(--hub-text-muted)] break-words [overflow-wrap:anywhere]">
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
    </div>
  );
};

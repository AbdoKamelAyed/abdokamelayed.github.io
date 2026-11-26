import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Download, FileDown, Maximize2, Printer, X } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { calculateReadingTimeMinutes, safeMediaUrl, safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";
import { calculateIssueStats, formatCadenceLabel, resolveIssueArticles } from "../utils/issues";
import { buildIssuePdfInput, generatePdfBytes, triggerPdfDownload } from "../utils/pdfMaker";
import { AuthorAvatar, AuthorProfileCard } from "../components/AuthorProfileCard";
import { ReadingProgressBar } from "../components/ReadingProgressBar";
import { RichContentView } from "../components/RichContentView";

export const IssueDetailPage: React.FC<{
  data: HubDatasets;
  slugOrId: string;
  lang: Lang;
}> = ({ data, slugOrId, lang }) => {
  const target = decodeURIComponent(slugOrId);
  const issue = data.issues.find((i) => i.slug === target || i.id === target);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const chaptersRef = useRef<HTMLDivElement | null>(null);

  const issueArticles = useMemo(
    () => (issue ? resolveIssueArticles(issue, data.articles) : []),
    [issue, data.articles]
  );

  const stats = useMemo(
    () => calculateIssueStats(issueArticles, lang),
    [issueArticles, lang]
  );

  useEffect(() => {
    setLightboxImage(null);
  }, [issue?.id]);

  useEffect(() => {
    if (!lightboxImage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      lastTriggerRef.current?.focus();
    };
  }, [lightboxImage]);

  const openLightbox = (src: string, alt: string) => {
    lastTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLightboxImage({ src, alt });
  };

  if (!issue) {
    return (
      <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 space-y-4">
        <h1 className="font-display text-2xl font-bold">{L("Journal issue not found", "العدد غير موجود", lang)}</h1>
        <a
          href="#/journal/issues"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--hub-border)] text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{L("Back to Journal Issues", "العودة إلى أعداد المجلة", lang)}</span>
        </a>
      </div>
    );
  }

  const cover = safeMediaUrl(issue.coverImage) || "/src/assets/images/journal_issue_cover_1795606693391.jpg";
  const p = data.profileSettings;
  const authorName = data.website.defaultAuthor || loc(p.fullName, lang) || "Abdo Kamel";

  const handleDownloadPdf = () => {
    const input = buildIssuePdfInput(issue, issueArticles, lang, data.website.siteName || "ABDO Digital Hub");
    const bytes = generatePdfBytes(input);
    triggerPdfDownload(`${issue.slug || "journal-issue"}.pdf`, bytes);
  };

  return (
    <div className="space-y-12 issue-edition-sheet">
      {data.website.showReadingProgress !== false && (
        <ReadingProgressBar
          targetRef={chaptersRef}
          contentKey={issue.id}
          label={L("Journal issue reading progress", "تقدم قراءة العدد", lang)}
        />
      )}

      <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
        <a
          href="#/journal/issues"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{L("All Journal Issues", "جميع أعداد المجلة", lang)}</span>
        </a>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            data-testid="download-issue-pdf"
            className="px-4 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{L("Download Issue PDF", "تنزيل العدد PDF", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{L("Print / Bilingual PDF", "طباعة / PDF", lang)}</span>
          </button>
        </div>
      </div>

      {/* Edition Cover Header */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-[var(--hub-border)] pb-10">
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-mono text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--hub-secondary)]">{issue.issueNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{formatCadenceLabel(issue.cadence, lang)}</span>
            <span aria-hidden="true">·</span>
            <span>{issue.periodKey}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(issue.publishedAt, lang)}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            {loc(issue.title, lang)}
          </h1>

          <p className="text-base sm:text-lg text-[var(--hub-text-muted)] leading-relaxed">
            {loc(issue.subtitle, lang)}
          </p>

          <div className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)] flex flex-wrap items-center gap-3 pt-1">
            <span>
              {stats.articleCount} {L("chapters", "مقالات", lang)}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {stats.totalWords.toLocaleString()} {L("words", "كلمة", lang)}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {stats.totalReadingMinutes} {L("min total read", "دقيقة قراءة", lang)}
            </span>
          </div>

          {loc(issue.editorialNote, lang) && (
            <aside className="mt-4 rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--hub-secondary)]">
                {L("Editorial Foreword", "افتتاحية العدد", lang)}
              </div>
              <p className="text-sm leading-relaxed">{loc(issue.editorialNote, lang)}</p>
            </aside>
          )}
        </div>

        <div className="lg:col-span-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900">
          <img
            src={cover}
            alt={loc(issue.title, lang)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      {/* Chapters Index */}
      <nav
        aria-label={L("Issue Contents", "فهرس العدد", lang)}
        className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Inside This Edition", "محتويات هذا العدد", lang)}</span>
          </h2>
          {issue.topics.length > 0 && (
            <span className="text-xs font-mono text-[var(--hub-text-muted)]">
              {issue.topics.map((tg) => `#${tg}`).join(" · ")}
            </span>
          )}
        </div>

        <ol className="divide-y divide-[var(--hub-border)]">
          {issueArticles.map((art, idx) => {
            const readMin = calculateReadingTimeMinutes(loc(art.content, lang));
            return (
              <li key={art.id} className="py-3 flex flex-wrap items-baseline justify-between gap-3">
                <a
                  href={`#/journal/issues/${encodeURIComponent(issue.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`chapter-${art.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-sm font-semibold hover:text-[var(--hub-secondary)] flex items-baseline gap-2.5 cursor-pointer"
                >
                  <span className="font-mono text-xs text-[var(--hub-secondary)] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{loc(art.title, lang)}</span>
                </a>
                <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {art.author || authorName} · {readMin} {L("min", "د", lang)}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Bound Sequential Chapters */}
      <div ref={chaptersRef} className="space-y-16">
        {issueArticles.map((art, idx) => {
          const content = loc(art.content, lang);
          const readMin = calculateReadingTimeMinutes(content);
          const artCover = safeUrl(art.coverImage);
          const artAuthor = art.author || authorName;
          const artAvatar = art.authorAvatar || p.avatarUrl;
          return (
            <article
              key={art.id}
              id={`chapter-${art.id}`}
              className="issue-chapter max-w-3xl mx-auto space-y-6 pt-8 border-t border-[var(--hub-border)]"
            >
              <header className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--hub-text-muted)]">
                  <span className="font-semibold text-[var(--hub-secondary)]">
                    {L("Chapter", "الفصل", lang)} {String(idx + 1).padStart(2, "0")} · {art.type}
                  </span>
                  <div className="flex items-center gap-3 print:hidden">
                    <a
                      href={`#/journal/${encodeURIComponent(art.slug || art.id)}`}
                      className="text-[var(--hub-secondary)] hover:underline"
                    >
                      {L("Standalone View →", "فتح منفرداً ←", lang)}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const pdfBytes = generatePdfBytes({
                          kicker: `${issue.issueNumber} | ${art.type}`,
                          title: loc(art.title, lang),
                          subtitle: loc(art.subtitle, lang),
                          metadataLine: `By ${artAuthor} | ${art.publishedAt} | ${readMin} min read`,
                          sections: [{ title: loc(art.title, lang), markdownContent: content, tags: art.tags }],
                        });
                        triggerPdfDownload(`${art.slug}.pdf`, pdfBytes);
                      }}
                      className="inline-flex items-center gap-1 hover:text-[var(--hub-text)] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                  {loc(art.title, lang)}
                </h2>
                <p className="text-base text-[var(--hub-text-muted)]">{loc(art.subtitle, lang)}</p>

                <div className="flex items-center gap-2.5 pt-1 text-xs text-[var(--hub-text-muted)]">
                  <AuthorAvatar src={artAvatar} name={artAuthor} sizeClass="w-8 h-8" />
                  <span>
                    <strong className="text-[var(--hub-text)]">{artAuthor}</strong>
                    {art.authorHandle ? ` (${art.authorHandle})` : ""} · {formatDate(art.publishedAt, lang)} · {readMin}{" "}
                    {L("min read", "دقيقة قراءة", lang)}
                  </span>
                </div>
              </header>

              {artCover && (
                <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => openLightbox(artCover, loc(art.title, lang))}
                    aria-label={L("View chapter figure full screen", "عرض صورة الفصل بملء الشاشة", lang)}
                    className="group relative block w-full h-full cursor-zoom-in"
                  >
                    <img
                      src={artCover}
                      alt={loc(art.title, lang)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span
                      aria-hidden="true"
                      className="print:hidden absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-lg bg-slate-950/75 text-white px-2.5 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>{L("Expand", "تكبير", lang)}</span>
                    </span>
                  </button>
                </div>
              )}

              <RichContentView
                content={content}
                mediaAssets={data.mediaAssets}
                lang={lang}
                onImageClick={openLightbox}
              />
            </article>
          );
        })}
      </div>

      {/* Author Profile Footer */}
      <div className="max-w-3xl mx-auto pt-4">
        <AuthorProfileCard
          name={authorName}
          handle={p.githubUsername ? `@${p.githubUsername}` : undefined}
          roleTitle={loc(p.roleTitle, lang) || loc(p.headline, lang)}
          avatarUrl={p.avatarUrl}
          bio={loc(p.shortBio, lang)}
          location={loc(p.location, lang)}
          githubUrl={p.contact.github}
          websiteUrl={p.contact.website}
          lang={lang}
        />
      </div>

      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.alt}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxImage(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <div className="w-full max-w-6xl flex items-center justify-between gap-4 pb-3 text-slate-200">
            <span className="text-xs sm:text-sm font-medium truncate">{lightboxImage.alt}</span>
            <button
              type="button"
              autoFocus
              onClick={() => setLightboxImage(null)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 text-white text-xs font-semibold cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{L("Close", "إغلاق", lang)}</span>
            </button>
          </div>
          <div className="flex-1 w-full max-w-6xl min-h-0 flex items-center justify-center">
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

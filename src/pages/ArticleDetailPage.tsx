import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileDown, Maximize2, Printer, X } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import {
  calculateReadingTimeMinutes,
  extractArticleSummary,
  getRelatedArticles,
  safeUrl,
} from "../utils/analytics";
import { formatDateTime, L, loc, t } from "../utils/i18n";
import { extractTableOfContents } from "../utils/markdown";
import { buildArticlePdfInput, generatePdfBytes, triggerPdfDownload } from "../utils/pdfMaker";
import { buildJournalPrintCoverMeta } from "../utils/printMetadata";
import type { FontScale } from "../utils/typography";
import { getArticleViewCount, type VisitInsightsStore } from "../utils/visitInsights";
import { ArticleFontSizeControls } from "../components/ArticleFontSizeControls";
import { AuthorAvatar, AuthorProfileCard } from "../components/AuthorProfileCard";
import { ArticleCard } from "../components/Cards";
import { PrintCoverPage } from "../components/PrintCoverPage";
import { ReadingProgressBar } from "../components/ReadingProgressBar";
import { RichContentView } from "../components/RichContentView";
import { SocialSharePanel } from "../components/SocialSharePanel";
import { TableOfContents } from "../components/TableOfContents";

export const ArticleDetailPage: React.FC<{
  data: HubDatasets;
  slugOrId: string;
  lang: Lang;
  fontScale: FontScale;
  visitStore: VisitInsightsStore;
  onStepFontScale: (delta: -1 | 1) => void;
  onSelectFontScale: (scale: FontScale) => void;
}> = ({
  data,
  slugOrId,
  lang,
  fontScale,
  visitStore,
  onStepFontScale,
  onSelectFontScale,
}) => {
  const target = decodeURIComponent(slugOrId);
  const article = data.articles.find((a) => a.slug === target || a.id === target);
  const articleRef = useRef<HTMLElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    setLightboxImage(null);
  }, [article?.id]);

  useEffect(() => {
    if (!lightboxImage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
      }
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

  if (!article) {
    return (
      <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 space-y-4">
        <h1 className="font-display text-2xl font-bold">{L("Article not found", "المقال غير موجود", lang)}</h1>
        <a
          href="#/journal"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--hub-border)] text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back", lang)}</span>
        </a>
      </div>
    );
  }

  const rawContent = loc(article.content, lang);
  const readingMinutes = calculateReadingTimeMinutes(rawContent);
  const summary = extractArticleSummary(article, lang);
  const tocItems = extractTableOfContents(rawContent);
  const hasToc = tocItems.length > 0;
  const related = getRelatedArticles(article, data.articles, 3);
  const cover = safeUrl(article.coverImage);
  const authorName = article.author || data.website.defaultAuthor || loc(data.profileSettings.fullName, lang) || "Abdo Kamel";
  const authorHandle = article.authorHandle || (data.profileSettings.githubUsername ? `@${data.profileSettings.githubUsername}` : "");
  const authorAvatar = article.authorAvatar || data.profileSettings.avatarUrl;
  const authorBio = (article.authorBio ? loc(article.authorBio, lang) : "") || loc(data.profileSettings.shortBio, lang);
  const publishedDisplay = formatDateTime(article.publishedAt, lang);
  const updatedDisplay = formatDateTime(article.updatedAt, lang);
  const showUpdated = Boolean(article.updatedAt && updatedDisplay !== publishedDisplay);
  const printCoverMeta = buildJournalPrintCoverMeta({
    article,
    siteName: data.website.siteName || "ABDO Digital Hub",
    authorName,
    authorHandle: authorHandle || undefined,
    formattedDate: showUpdated ? `${publishedDisplay} (${updatedDisplay})` : publishedDisplay,
    summaryText: summary?.text,
    lang,
  });

  const handleDownloadArticlePdf = () => {
    const input = buildArticlePdfInput(article, lang, data.website.siteName || "ABDO Digital Hub", summary?.text);
    const bytes = generatePdfBytes(input);
    triggerPdfDownload(`${article.slug || "article"}.pdf`, bytes);
  };

  return (
    <div className="space-y-12">
      {data.website.showReadingProgress !== false && (
        <ReadingProgressBar
          targetRef={articleRef}
          contentKey={article.id}
          label={L("Article reading progress", "تقدم قراءة المقال", lang)}
        />
      )}

      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <a
          href="#/journal"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("journal.title", lang)}</span>
        </a>

        <div className="flex flex-wrap items-center gap-2">
          <ArticleFontSizeControls
            fontScale={fontScale}
            lang={lang}
            onStepFontScale={onStepFontScale}
            onSelectFontScale={onSelectFontScale}
          />
          <button
            type="button"
            onClick={handleDownloadArticlePdf}
            data-testid="download-article-pdf"
            className="px-3.5 py-1.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{L("Download PDF", "تنزيل PDF", lang)}</span>
          </button>
          <button
            type="button"
            data-testid="print-article-btn"
            onClick={() => window.print()}
            aria-label={L("Print Article", "طباعة المقال", lang)}
            title={L("Print article cleanly without navigation chrome", "طباعة المقال بدون قوائم التنقل", lang)}
            className="print:hidden px-3.5 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-[var(--hub-secondary)] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{L("Print Article", "طباعة المقال", lang)}</span>
          </button>
        </div>
      </div>

      <article ref={articleRef} className={`${hasToc ? "max-w-5xl" : "max-w-3xl"} mx-auto space-y-6`}>
        <PrintCoverPage meta={printCoverMeta} lang={lang} />
        <header className="max-w-3xl space-y-3 border-b border-[var(--hub-border)] pb-6">
          <div className="text-xs text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{article.type}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{publishedDisplay}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {readingMinutes} {L("min read", "دقيقة قراءة", lang)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-mono" data-testid="article-view-count">
              {getArticleViewCount(visitStore, article.slug || article.id, article.id)}{" "}
              {L("views", "مشاهدة", lang)}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {loc(article.title, lang)}
          </h1>
          <p className="text-lg text-[var(--hub-text-muted)]">{loc(article.subtitle, lang)}</p>
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--hub-text-muted)]">
            <div className="flex items-center gap-2.5">
              <AuthorAvatar src={authorAvatar} name={authorName} sizeClass="w-9 h-9" />
              <div>
                <div>
                  {L("By", "بقلم", lang)}{" "}
                  <strong className="font-semibold text-[var(--hub-text)]">{authorName}</strong>
                  {authorHandle && (
                    <span dir="ltr" className="font-mono ms-1.5">
                      {authorHandle}
                    </span>
                  )}
                </div>
                {showUpdated && (
                  <div className="tabular-nums text-[11px]">
                    {t("common.updated", lang)}: <span className="font-mono">{updatedDisplay}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {summary && (
            <aside
              data-testid="article-summary"
              aria-label={summary.source === "abstract" ? L("Article Abstract", "ملخص المقال", lang) : L("Article Summary", "خلاصة المقال", lang)}
              className="mt-3 rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-1.5"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {summary.source === "abstract"
                  ? L("Abstract", "ملخص المقال", lang)
                  : L("Key Summary", "الخلاصة", lang)}
              </div>
              <p className="text-sm leading-relaxed text-[var(--hub-text)]">{summary.text}</p>
            </aside>
          )}
        </header>

        {cover && (
          <div className="max-w-3xl aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => openLightbox(cover, loc(article.title, lang))}
              aria-label={L("View article image full screen", "عرض صورة المقال بملء الشاشة", lang)}
              data-testid="article-cover-button"
              className="group relative block w-full h-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <img
                src={cover}
                alt={loc(article.title, lang)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
              />
              <span
                aria-hidden="true"
                className="print:hidden absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-950/75 text-white px-2.5 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{L("Expand", "تكبير", lang)}</span>
              </span>
            </button>
          </div>
        )}

        {hasToc ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,48rem)_250px] gap-8 lg:gap-10">
            <div className="order-1 lg:order-2">
              <TableOfContents items={tocItems} lang={lang} />
            </div>
            <div className="order-2 lg:order-1 min-w-0">
              <RichContentView
                content={rawContent}
                mediaAssets={data.mediaAssets}
                lang={lang}
                onImageClick={openLightbox}
              />
            </div>
          </div>
        ) : (
          <RichContentView
            content={rawContent}
            mediaAssets={data.mediaAssets}
            lang={lang}
            onImageClick={openLightbox}
          />
        )}

        <footer className="max-w-3xl pt-6 border-t border-[var(--hub-border)] text-xs font-mono text-[var(--hub-text-muted)]">
          {article.tags.map((tg) => `#${tg}`).join(" · ")}
        </footer>

        <div className="max-w-3xl">
          <SocialSharePanel
            lang={lang}
            domain={data.website.domain}
            hashPath={`#/journal/${encodeURIComponent(article.slug || article.id)}`}
            title={loc(article.title, lang)}
            summary={article.seo?.description || loc(article.subtitle, lang)}
            previewImageCandidate={article.coverImage}
            fallbackPreviewImage={data.website.ogImage || data.profileSettings.avatarUrl}
            tags={article.tags}
            siteName={data.website.siteName}
          />
        </div>

        <div className="max-w-3xl pt-2">
          <AuthorProfileCard
            name={authorName}
            handle={authorHandle}
            roleTitle={loc(data.profileSettings.roleTitle, lang) || loc(data.profileSettings.headline, lang)}
            avatarUrl={authorAvatar}
            bio={authorBio}
            location={loc(data.profileSettings.location, lang)}
            githubUrl={data.profileSettings.contact.github}
            websiteUrl={data.profileSettings.contact.website}
            lang={lang}
          />
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="related-reading-heading"
          className="max-w-5xl mx-auto space-y-5 pt-8 border-t border-[var(--hub-border)]"
        >
          <h2 id="related-reading-heading" className="font-display text-xl font-semibold">
            {L("Related Reading", "قراءات ذات صلة", lang)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((r) => (
              <ArticleCard key={r.id} article={r} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.alt || L("Full-screen image viewer", "عارض الصور بملء الشاشة", lang)}
          data-testid="article-lightbox"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxImage(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <div className="w-full max-w-6xl flex items-center justify-between gap-4 pb-3 text-slate-200">
            <span className="text-xs sm:text-sm font-medium truncate">
              {lightboxImage.alt}
            </span>
            <button
              type="button"
              autoFocus
              onClick={() => setLightboxImage(null)}
              aria-label={L("Close full-screen image", "إغلاق عرض الصورة", lang)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 text-white text-xs font-semibold hover:bg-white/20 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span>{L("Close", "إغلاق", lang)}</span>
            </button>
          </div>

          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxImage(null);
            }}
            className="flex-1 w-full max-w-6xl min-h-0 flex items-center justify-center"
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
            />
          </div>

          <div className="pt-3 text-[11px] font-mono text-slate-400">
            {L("Press Esc or click outside the image to close", "اضغط Esc أو انقر خارج الصورة للإغلاق", lang)}
          </div>
        </div>
      )}
    </div>
  );
};

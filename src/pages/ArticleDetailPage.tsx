import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import {
  calculateArticleScrollProgress,
  calculateReadingTimeMinutes,
  getRelatedArticles,
  safeUrl,
} from "../utils/analytics";
import { formatDateTime, L, loc, t } from "../utils/i18n";
import { ArticleCard } from "../components/Cards";
import { RichContentView } from "../components/RichContentView";

export const ArticleDetailPage: React.FC<{
  data: HubDatasets;
  slugOrId: string;
  lang: Lang;
}> = ({ data, slugOrId, lang }) => {
  const target = decodeURIComponent(slugOrId);
  const article = data.articles.find((a) => a.slug === target || a.id === target);
  const articleRef = useRef<HTMLElement | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    if (!article) {
      setReadingProgress(0);
      return;
    }

    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const el = articleRef.current;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const articleBottomInDoc = el
        ? el.getBoundingClientRect().bottom + scrollY
        : document.documentElement.scrollHeight;
      const next = calculateArticleScrollProgress(
        scrollY,
        articleBottomInDoc,
        window.innerHeight,
        document.documentElement.scrollHeight
      );
      setReadingProgress(next);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [article?.id]);

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
  const related = getRelatedArticles(article, data.articles, 3);
  const cover = safeUrl(article.coverImage);
  const authorName = article.author || data.website.defaultAuthor || loc(data.profileSettings.fullName, lang) || "Abdo Kamel";
  const authorHandle = article.authorHandle || (data.profileSettings.githubUsername ? `@${data.profileSettings.githubUsername}` : "");
  const publishedDisplay = formatDateTime(article.publishedAt, lang);
  const updatedDisplay = formatDateTime(article.updatedAt, lang);
  const showUpdated = Boolean(article.updatedAt && updatedDisplay !== publishedDisplay);

  return (
    <div className="space-y-12">
      <div
        role="progressbar"
        aria-label={L("Article reading progress", "تقدم قراءة المقال", lang)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readingProgress}
        data-testid="reading-progress-bar"
        className="fixed top-0 inset-x-0 h-[3px] z-50 bg-slate-200/50 dark:bg-slate-800/60 pointer-events-none"
      >
        <div
          className="h-full transition-[width] duration-100 ease-out"
          style={{ width: `${readingProgress}%`, backgroundColor: "var(--hub-secondary)" }}
        />
      </div>

      <div>
        <a
          href="#/journal"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("journal.title", lang)}</span>
        </a>
      </div>

      <article ref={articleRef} className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-3 border-b border-[var(--hub-border)] pb-6">
          <div className="text-xs text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{article.type}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{publishedDisplay}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {readingMinutes} {L("min read", "دقيقة قراءة", lang)}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {loc(article.title, lang)}
          </h1>
          <p className="text-lg text-[var(--hub-text-muted)]">{loc(article.subtitle, lang)}</p>
          <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--hub-text-muted)]">
            <span>
              {L("By", "بقلم", lang)}{" "}
              <strong className="font-semibold text-[var(--hub-text)]">{authorName}</strong>
              {authorHandle && (
                <span dir="ltr" className="font-mono ms-1.5">
                  {authorHandle}
                </span>
              )}
            </span>
            {showUpdated && (
              <span className="tabular-nums">
                {t("common.updated", lang)}: <span className="font-mono">{updatedDisplay}</span>
              </span>
            )}
          </div>
        </header>

        {cover && (
          <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900">
            <img
              src={cover}
              alt={loc(article.title, lang)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <RichContentView content={rawContent} />

        <footer className="pt-6 border-t border-[var(--hub-border)] text-xs font-mono text-[var(--hub-text-muted)]">
          {article.tags.map((tg) => `#${tg}`).join(" · ")}
        </footer>
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
    </div>
  );
};

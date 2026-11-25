import React from "react";
import { ArrowLeft } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";
import { ArticleCard } from "../components/Cards";

export const ArticleDetailPage: React.FC<{
  data: HubDatasets;
  slugOrId: string;
  lang: Lang;
}> = ({ data, slugOrId, lang }) => {
  const target = decodeURIComponent(slugOrId);
  const article = data.articles.find((a) => a.slug === target || a.id === target);

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

  const paragraphs = loc(article.content, lang).split(/\n\n+/).filter(Boolean);
  const related = data.articles
    .filter((x) => x.id !== article.id && x.tags.some((tg) => article.tags.includes(tg)))
    .slice(0, 2);
  const cover = safeUrl(article.coverImage);

  return (
    <div className="space-y-12">
      <div>
        <a
          href="#/journal"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("journal.title", lang)}</span>
        </a>
      </div>

      <article className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-3 border-b border-[var(--hub-border)] pb-6">
          <div className="text-xs text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{article.type}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(article.publishedAt, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {article.readingTimeMinutes || 1} {L("min read", "دقيقة قراءة", lang)}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {loc(article.title, lang)}
          </h1>
          <p className="text-lg text-[var(--hub-text-muted)]">{loc(article.subtitle, lang)}</p>
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

        <div className="space-y-5 text-base sm:text-lg leading-relaxed text-[var(--hub-text)]">
          {paragraphs.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        <footer className="pt-6 border-t border-[var(--hub-border)] text-xs font-mono text-[var(--hub-text-muted)]">
          {article.tags.map((tg) => `#${tg}`).join(" · ")}
        </footer>
      </article>

      {related.length > 0 && (
        <section className="max-w-5xl mx-auto space-y-4 pt-6 border-t border-[var(--hub-border)]">
          <h2 className="font-display text-xl font-semibold">
            {L("Related Publications", "منشورات ذات صلة", lang)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {related.map((r) => (
              <ArticleCard key={r.id} article={r} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

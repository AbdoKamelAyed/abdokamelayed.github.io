import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { ArticleRecord, GitHubRepo, Lang, ProjectRecord } from "../types/hub";
import { calculateReadingTimeMinutes, safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";

export const ProjectCard: React.FC<{
  project: ProjectRecord;
  linkedRepo?: GitHubRepo;
  lang: Lang;
}> = ({ project, linkedRepo, lang }) => {
  const href = `#/projects/${encodeURIComponent(project.slug || project.id)}`;
  const cover = safeUrl(project.screenshots?.[0]);

  return (
    <article className="rounded-2xl border border-[var(--hub-border)] hub-surface overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
      {cover ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-[var(--hub-border)]">
          <img
            src={cover}
            alt={loc(project.name, lang)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <div className="p-6 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--hub-text-muted)]">
            <span className="font-semibold text-[var(--hub-secondary)]">{project.status}</span>
            <span aria-hidden="true">·</span>
            <span>{project.category}</span>
            {project.featured && (
              <>
                <span aria-hidden="true">·</span>
                <span>{L("Featured", "مميز", lang)}</span>
              </>
            )}
          </div>

          <h3 className="font-display text-lg font-semibold leading-snug">
            <a href={href} className="hover:underline">
              {loc(project.name, lang)}
            </a>
          </h3>

          <p className="text-sm text-[var(--hub-text-muted)] line-clamp-3">
            {loc(project.shortDescription, lang)}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-[var(--hub-border)]">
          {project.techStack.length > 0 && (
            <div className="text-xs text-[var(--hub-text-muted)] font-mono">
              {project.techStack.slice(0, 5).join(" · ")}
            </div>
          )}

          {linkedRepo && (
            <div className="text-xs text-[var(--hub-text-muted)] font-mono tabular-nums">
              GitHub: {linkedRepo.stars} {L("stars", "نجمة", lang)} · {linkedRepo.forks} {L("forks", "تفرع", lang)} · {linkedRepo.primaryLanguage || t("common.na", lang)}
            </div>
          )}

          <div>
            <a
              href={href}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--hub-secondary)] hover:underline"
            >
              <span>{t("common.readMore", lang)}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};

export const ArticleCard: React.FC<{
  article: ArticleRecord;
  lang: Lang;
}> = ({ article, lang }) => {
  const href = `#/journal/${encodeURIComponent(article.slug || article.id)}`;
  const cover = safeUrl(article.coverImage);
  const readingMinutes = calculateReadingTimeMinutes(loc(article.content, lang));

  return (
    <article className="rounded-2xl border border-[var(--hub-border)] hub-surface overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
      {cover ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-[var(--hub-border)]">
          <img
            src={cover}
            alt={loc(article.title, lang)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <div className="p-6 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--hub-text-muted)]">
            <span className="font-semibold text-[var(--hub-secondary)]">{article.type}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(article.publishedAt, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {readingMinutes} {L("min read", "دقيقة قراءة", lang)}
            </span>
          </div>

          <h3 className="font-display text-lg font-semibold leading-snug">
            <a href={href} className="hover:underline">
              {loc(article.title, lang)}
            </a>
          </h3>

          <p className="text-sm text-[var(--hub-text-muted)] line-clamp-3">
            {loc(article.subtitle, lang)}
          </p>
        </div>

        <div className="pt-3 border-t border-[var(--hub-border)] flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--hub-text-muted)] truncate">
            {article.author ? `${article.author} · ` : ""}
            {article.tags.map((tg) => `#${tg}`).join(" · ")}
          </span>
          <a
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--hub-secondary)] hover:underline shrink-0"
          >
            <span>{t("common.readMore", lang)}</span>
          </a>
        </div>
      </div>
    </article>
  );
};

import React, { useMemo } from "react";
import { ArrowRight, Compass, Cpu, GitBranch, Layers } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { formatDate, L, t } from "../utils/i18n";
import { buildWorkingNowItems, type WorkingNowItem } from "../utils/workingNow";

const KIND_LABELS: Record<WorkingNowItem["kind"], { en: string; ar: string }> = {
  focus: { en: "Current Focus", ar: "التركيز الحالي" },
  project: { en: "Active Build", ar: "مشروع نشط" },
  role: { en: "Engineering Role", ar: "الدور الهندسي" },
  repository: { en: "Repository Momentum", ar: "مستودع نشط" },
};

export const NowPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const items = useMemo(() => buildWorkingNowItems(data, lang), [data, lang]);

  const projectItems = items.filter((i) => i.kind === "project" || i.kind === "focus");
  const roleItems = items.filter((i) => i.kind === "role");
  const repoItems = items.filter((i) => i.kind === "repository");

  return (
    <div className="space-y-12" data-testid="now-page">
      <header className="border-b border-[var(--hub-border)] pb-6 space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[var(--hub-secondary)]">
          <Compass className="w-4 h-4" />
          <span>#/now · {L("Updated", "آخر تحديث", lang)} {formatDate(data.website.updatedAt, lang)}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("now.title", lang)}
        </h1>
        <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
          {t("now.subtitle", lang)}
        </p>
      </header>

      {/* Active Builds & Current Focus */}
      <section aria-labelledby="now-builds-heading" className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--hub-border)] pb-3">
          <h2 id="now-builds-heading" className="font-display text-xl font-semibold inline-flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--hub-secondary)]" />
            <span>{L("Active Software Builds & Focus", "المشاريع والتركيز الهندسي الحالي", lang)}</span>
          </h2>
          <a href="#/projects" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline">
            {t("common.viewAll", lang)}
          </a>
        </div>

        {projectItems.length === 0 ? (
          <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectItems.map((item) => (
              <article
                key={item.id}
                className="min-w-0 rounded-2xl border border-[var(--hub-border)] hub-surface p-5 sm:p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--hub-text-muted)]">
                    <span className="font-semibold text-[var(--hub-secondary)]">{item.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>{KIND_LABELS[item.kind][lang]}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold leading-snug break-words">
                    <a href={item.href} className="hover:underline">
                      {item.title}
                    </a>
                  </h3>
                  <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed break-words">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--hub-border)] space-y-2.5">
                  {item.tags.length > 0 && (
                    <div className="text-xs font-mono text-[var(--hub-text-muted)] break-words [overflow-wrap:anywhere]">
                      {item.tags.join(" · ")}
                    </div>
                  )}
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hub-secondary)] hover:underline"
                  >
                    <span>{L("Open workspace / project", "فتح التفاصيل", lang)}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Current Roles & Repository Momentum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-6 min-w-0 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold inline-flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[var(--hub-secondary)]" />
              <span>{L("Ongoing Engineering Roles", "الأدوار الهندسية الجارية", lang)}</span>
            </h2>
            <a href="#/work" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline shrink-0">
              {t("nav.work", lang)}
            </a>
          </div>
          {roleItems.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)]">
              {roleItems.map((role) => (
                <li key={role.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{role.title}</h3>
                    <span className="text-xs font-mono text-[var(--hub-secondary)]">{role.status}</span>
                  </div>
                  <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">{role.summary}</p>
                  {role.tags.length > 0 && (
                    <div className="text-xs font-mono text-[var(--hub-text-muted)]">{role.tags.join(" · ")}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-6 min-w-0 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold inline-flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[var(--hub-secondary)]" />
              <span>{L("Active Repositories", "المستودعات النشطة", lang)}</span>
            </h2>
            <a href="#/github" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline shrink-0">
              {t("nav.github", lang)}
            </a>
          </div>
          {repoItems.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)]">
              {repoItems.map((repo) => (
                <li key={repo.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <a href={repo.href} className="font-display text-base font-semibold hover:underline">
                      {repo.title}
                    </a>
                    <span className="text-xs font-mono text-[var(--hub-text-muted)]">
                      {repo.focusArea} · {formatDate(repo.updatedAt, lang)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--hub-text-muted)]">{repo.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

import React from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";

export const ProjectDetailPage: React.FC<{
  data: HubDatasets;
  slugOrId: string;
  lang: Lang;
}> = ({ data, slugOrId, lang }) => {
  const target = decodeURIComponent(slugOrId);
  const project = data.projects.find((p) => p.slug === target || p.id === target);

  if (!project) {
    return (
      <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 space-y-4">
        <h1 className="font-display text-2xl font-bold">{L("Project not found", "المشروع غير موجود", lang)}</h1>
        <a
          href="#/projects"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--hub-border)] text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back", lang)}</span>
        </a>
      </div>
    );
  }

  const linkedRepo = project.githubRepoSlug
    ? data.github.repositories.find((r) => r.name.toLowerCase() === project.githubRepoSlug!.toLowerCase())
    : undefined;
  const repoUrl = safeUrl(project.githubRepoUrl || linkedRepo?.url);
  const demoUrl = safeUrl(project.liveDemoUrl);

  return (
    <article className="space-y-10">
      <div>
        <a
          href="#/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("projects.title", lang)}</span>
        </a>
      </div>

      <header className="border-b border-[var(--hub-border)] pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--hub-text-muted)]">
          <span className="font-semibold text-[var(--hub-secondary)]">{project.status}</span>
          <span aria-hidden="true">·</span>
          <span>{project.category}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t("common.created", lang)}: {formatDate(project.createdAt, lang)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t("common.updated", lang)}: {formatDate(project.updatedAt, lang)}
          </span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {loc(project.name, lang)}
        </h1>
        <p className="text-lg text-[var(--hub-text-muted)] max-w-3xl">
          {loc(project.shortDescription, lang)}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)]"
            >
              <span>{L("GitHub Repository", "مستودع GitHub", lang)}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--hub-border)]"
            >
              <span>{L("Live Demo", "معاينة حية", lang)}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </header>

      {(project.screenshots || []).length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {project.screenshots!.map((src, i) => {
            const safe = safeUrl(src);
            if (!safe) return null;
            return (
              <div key={i} className="rounded-2xl overflow-hidden border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900">
                <img
                  src={safe}
                  alt={`${loc(project.name, lang)} screenshot ${i + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">{L("Overview & Context", "نظرة عامة والسياق", lang)}</h2>
            <p className="text-sm sm:text-base leading-relaxed text-[var(--hub-text)]">
              {loc(project.fullDescription, lang)}
            </p>
            {project.problemStatement && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-1">{L("Problem Statement", "بيان المشكلة", lang)}</h3>
                <p className="text-sm text-[var(--hub-text-muted)]">{project.problemStatement}</p>
              </div>
            )}
            {project.architectureOverview && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-1">{L("Architecture Overview", "نظرة معمارية", lang)}</h3>
                <p className="text-sm text-[var(--hub-text-muted)]">{project.architectureOverview}</p>
              </div>
            )}
            {project.documentation && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-1">{L("Documentation", "التوثيق", lang)}</h3>
                <p className="text-sm text-[var(--hub-text-muted)]">{project.documentation}</p>
              </div>
            )}
          </section>

          {(project.developmentHistory || []).length > 0 && (
            <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
              <h2 className="font-display text-xl font-semibold">{L("Development History", "سجل التطوير", lang)}</h2>
              <ul className="space-y-2 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                {project.developmentHistory!.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">{L("Technical Stack & Scope", "التقنيات والنطاق", lang)}</h2>
            <p className="text-sm font-mono text-[var(--hub-text-muted)]">
              {project.techStack.join(" · ") || t("common.na", lang)}
            </p>

            {(project.features || []).length > 0 && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-2">{L("Key Features", "المزايا الرئيسية", lang)}</h3>
                <ul className="space-y-1.5 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                  {project.features!.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {(project.objectives || []).length > 0 && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-2">{L("Objectives", "الأهداف", lang)}</h3>
                <ul className="space-y-1.5 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                  {project.objectives!.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}

            {(project.releases || []).length > 0 && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-2">{L("Releases", "الإصدارات", lang)}</h3>
                <ul className="space-y-1.5 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                  {project.releases!.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {(project.roadmap || []).length > 0 && (
              <div className="pt-4 border-t border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold mb-2">{L("Roadmap", "خارطة الطريق", lang)}</h3>
                <ul className="space-y-1.5 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                  {project.roadmap!.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {linkedRepo && (
            <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-2">
              <h2 className="font-display text-lg font-semibold">
                {L("Linked GitHub Repository Data", "بيانات مستودع GitHub المرتبط", lang)}
              </h2>
              <p className="text-xs text-[var(--hub-text-muted)]">
                {L(
                  "Automatically synced telemetry (read-only; never overwrites manual project descriptions).",
                  "بيانات مزامنة آلياً (للقراءة فقط ولا تستبدل الوصف اليدوي للمشروع).",
                  lang
                )}
              </p>
              <div className="pt-2 text-sm font-mono tabular-nums space-y-1">
                <div>{linkedRepo.fullName}</div>
                <div className="text-[var(--hub-text-muted)]">
                  ★ {linkedRepo.stars} · Forks {linkedRepo.forks} · Issues {linkedRepo.openIssues} · {linkedRepo.license || "No License"}
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
};

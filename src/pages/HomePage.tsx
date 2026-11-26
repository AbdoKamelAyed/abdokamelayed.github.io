import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { formatDate, L, loc, t } from "../utils/i18n";
import { AuthorAvatar } from "../components/AuthorProfileCard";
import { ArticleCard, ProjectCard } from "../components/Cards";

export const HomePage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const p = data.profileSettings;
  const gh = data.github;
  const repoMap = new Map(gh.repositories.map((r) => [r.name.toLowerCase(), r]));
  const featured = data.projects.filter((pr) => pr.featured).slice(0, 3);
  const recentActivity = gh.activity.slice(0, 6);
  const latestArticles = [...data.articles]
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, 3);

  const valOrNA = (v: number | null | undefined) =>
    v === null || v === undefined ? t("common.na", lang) : String(v);

  return (
    <div className="space-y-16">
      {/* Split Editorial Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-6 py-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <AuthorAvatar src={p.avatarUrl} name={loc(p.fullName, lang)} sizeClass="w-12 h-12" />
              <p className="text-xs font-mono tracking-wide text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
                <span dir="ltr">@{p.githubUsername || "AbdoKamelAyed"}</span>
                <span aria-hidden="true">·</span>
                <span>{gh.profile.location || loc(p.location, lang) || L("Egypt", "مصر", lang)}</span>
                <span aria-hidden="true">·</span>
                <span>{gh.profile.company || "Suefco"}</span>
              </p>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[1.12]">
              {loc(p.fullName, lang)} — {loc(p.headline, lang)}
            </h1>
            <p className="text-base sm:text-lg text-[var(--hub-text-muted)] max-w-2xl leading-relaxed">
              {loc(p.shortBio, lang)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#/projects"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {L("Explore Projects", "استعراض المشاريع", lang)}
            </a>
            <a
              href="#/github"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-[var(--hub-border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {t("github.title", lang)}
            </a>
            <a
              href="#/journal"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-[var(--hub-border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {t("journal.title", lang)}
            </a>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900 min-h-[240px]">
          <img
            src="/src/assets/images/abdo_editorial_workspace_1795599463678.jpg"
            alt={L("Abdo Kamel engineering workspace", "مساحة عمل عبدو كامل الهندسية", lang)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Full-width KPI Strip */}
      <section aria-labelledby="home-stats-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hub-border)] pb-3">
          <h2 id="home-stats-heading" className="font-display text-xl font-semibold">
            {t("home.githubStats", lang)}
          </h2>
          <a href="#/github" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline">
            {t("common.viewAll", lang)}
          </a>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Public Repositories", "المستودعات العامة", lang)}</div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums">
              {valOrNA(gh.statistics.totalPublicRepositories)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Stars Received", "إجمالي النجوم", lang)}</div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums">
              {valOrNA(gh.statistics.totalStarsReceived)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Total Forks", "إجمالي التفرعات", lang)}</div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums">
              {valOrNA(gh.statistics.totalForks)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Active / Archived", "النشطة / المؤرشفة", lang)}</div>
            <div className="mt-2 text-2xl font-bold font-mono tabular-nums">
              {valOrNA(gh.statistics.activeRepositoryCount)} / {valOrNA(gh.statistics.archivedRepositoryCount)}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section aria-labelledby="home-projects-heading" className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hub-border)] pb-3">
          <h2 id="home-projects-heading" className="font-display text-xl font-semibold">
            {t("home.featuredProjects", lang)}
          </h2>
          <a href="#/projects" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline">
            {t("common.viewAll", lang)}
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.length > 0 ? (
            featured.map((pr) => (
              <ProjectCard
                key={pr.id}
                project={pr}
                linkedRepo={pr.githubRepoSlug ? repoMap.get(pr.githubRepoSlug.toLowerCase()) : undefined}
                lang={lang}
              />
            ))
          ) : (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          )}
        </div>
      </section>

      {/* Recent GitHub Activity & Interests/Achievements */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">{t("home.recentGithub", lang)}</h2>
            <a href="#/github" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline">
              {t("common.viewAll", lang)}
            </a>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)]">
              {recentActivity.map((ev) => {
                const url = safeUrl(ev.url);
                return (
                  <li key={ev.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{ev.summary}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium">{ev.summary}</span>
                      )}
                      <div className="text-xs text-[var(--hub-text-muted)] mt-0.5">
                        {ev.type} · {formatDate(ev.createdAt, lang)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
          <h2 className="font-display text-xl font-semibold">{t("home.interests", lang)}</h2>
          <div>
            <h3 className="text-xs font-semibold text-[var(--hub-text-muted)] mb-2">
              {L("Technical Focus", "الاهتمامات التقنية", lang)}
            </h3>
            <p className="text-sm text-[var(--hub-text)] leading-relaxed">
              {p.technicalInterests.length > 0 ? p.technicalInterests.join(" · ") : t("common.empty", lang)}
            </p>
          </div>
          <div className="pt-4 border-t border-[var(--hub-border)]">
            <h3 className="text-xs font-semibold text-[var(--hub-text-muted)] mb-2">
              {L("Selected Achievements", "أبرز الإنجازات", lang)}
            </h3>
            {p.selectedAchievements.length > 0 ? (
              <ul className="space-y-2 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                {p.selectedAchievements.map((ach, i) => (
                  <li key={i}>{loc(ach, lang)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
            )}
          </div>
        </div>
      </section>

      {/* Latest Publications */}
      <section aria-labelledby="home-journal-heading" className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hub-border)] pb-3">
          <h2 id="home-journal-heading" className="font-display text-xl font-semibold">
            {t("home.latestJournal", lang)}
          </h2>
          <a href="#/journal" className="text-sm font-medium text-[var(--hub-secondary)] hover:underline">
            {t("common.viewAll", lang)}
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestArticles.length > 0 ? (
            latestArticles.map((art) => <ArticleCard key={art.id} article={art} lang={lang} />)
          ) : (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          )}
        </div>
      </section>
    </div>
  );
};

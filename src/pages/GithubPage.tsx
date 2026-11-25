import React, { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { filterAndSortRepos, safeUrl } from "../utils/analytics";
import { formatDate, L, t } from "../utils/i18n";
import {
  ContributionCalendarPanel,
  LanguageDistributionChart,
  RepoCreationChart,
} from "../components/Charts";

export const GithubPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const gh = data.github;
  const p = gh.profile;
  const st = gh.statistics;

  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [state, setState] = useState<"all" | "active" | "archived" | "original">("all");
  const [sort, setSort] = useState<"updated" | "stars" | "forks">("updated");

  const availableLanguages = useMemo(
    () =>
      Array.from(
        new Set(gh.repositories.map((r) => r.primaryLanguage).filter((x): x is string => Boolean(x)))
      ).sort(),
    [gh.repositories]
  );

  const repos = useMemo(
    () => filterAndSortRepos(gh.repositories, { query, language, state, sort }),
    [gh.repositories, query, language, state, sort]
  );

  const valOrNA = (v: number | null | undefined) =>
    v === null || v === undefined ? t("common.na", lang) : String(v);

  return (
    <div className="space-y-12">
      <header className="border-b border-[var(--hub-border)] pb-6 space-y-2">
        <div className="text-xs font-mono text-[var(--hub-text-muted)]">
          {L("Sync Status:", "حالة المزامنة:", lang)} {gh.syncMeta.syncStatus} · {t("common.updated", lang)}:{" "}
          {formatDate(gh.syncMeta.lastSuccessfulSync, lang)}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("github.title", lang)}
        </h1>
        <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
          {t("github.subtitle", lang)}
        </p>
      </header>

      {/* Profile Overview */}
      <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {safeUrl(p.avatarUrl) ? (
            <img
              src={safeUrl(p.avatarUrl)}
              alt={p.username}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full border border-[var(--hub-border)] object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border border-[var(--hub-border)] flex items-center justify-center font-display font-bold text-xl shrink-0">
              A
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-xl font-bold truncate">
              {p.name || p.username} <span className="font-mono text-sm font-normal text-[var(--hub-text-muted)]">@{p.username}</span>
            </h2>
            <p className="text-sm text-[var(--hub-text-muted)]">{p.bio || t("common.na", lang)}</p>
            <div className="text-xs text-[var(--hub-text-muted)] font-mono tabular-nums flex flex-wrap gap-x-3 gap-y-1">
              <span>{L("Repos", "المستودعات", lang)}: {valOrNA(p.publicRepos)}</span>
              <span>{L("Gists", "مقتطفات", lang)}: {valOrNA(p.publicGists)}</span>
              <span>{L("Followers", "متابعون", lang)}: {valOrNA(p.followers)}</span>
              <span>{L("Following", "يتابع", lang)}: {valOrNA(p.following)}</span>
              {p.company && <span>{p.company}</span>}
              {p.location && <span>{p.location}</span>}
              <span>{L("Joined", "انضم في", lang)}: {formatDate(p.createdAt, lang)}</span>
            </div>
          </div>
        </div>
        <a
          href={safeUrl(p.profileUrl) || "https://github.com/AbdoKamelAyed"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] whitespace-nowrap shrink-0"
        >
          <span>{L("GitHub Profile", "ملف GitHub", lang)}</span>
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </section>

      {/* Repository Analytics KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Synced Public Repos", "المستودعات المزمنة", lang)}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums">{valOrNA(st.syncedRepositoryCount)}</div>
        </div>
        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Total Stars Received", "مجموع النجوم", lang)}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums">{valOrNA(st.totalStarsReceived)}</div>
        </div>
        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Total Forks", "مجموع التفرعات", lang)}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums">{valOrNA(st.totalForks)}</div>
        </div>
        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-5">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Sampled Commits", "الالتزامات المرصودة", lang)}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums">{valOrNA(st.totalAvailableCommitsSampled)}</div>
        </div>
      </section>

      {/* Contribution Calendar */}
      <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {L("Contribution Intelligence", "تحليلات المساهمات", lang)}
          </h2>
          <p className="text-xs text-[var(--hub-text-muted)] mt-1">{t("github.disclaimerContrib", lang)}</p>
        </div>
        <ContributionCalendarPanel contributions={gh.contributions} lang={lang} />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {L("Language Distribution", "توزيع لغات البرمجة", lang)}
            </h2>
            <p className="text-xs text-[var(--hub-text-muted)] mt-1">{t("github.disclaimerLang", lang)}</p>
          </div>
          <LanguageDistributionChart
            languages={gh.languages.languages || []}
            totalBytes={gh.languages.totalBytes || 0}
            lang={lang}
          />
        </div>

        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {L("Repository Creation Trends", "وتيرة إنشاء المستودعات", lang)}
            </h2>
            <p className="text-xs text-[var(--hub-text-muted)] mt-1">
              {L("Public repositories created per year.", "عدد المستودعات العامة المنشأة سنوياً.", lang)}
            </p>
          </div>
          <RepoCreationChart creationByYear={st.creationByYear || {}} lang={lang} />
        </div>
      </section>

      {/* Repository Explorer */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hub-border)] pb-3">
          <h2 className="font-display text-2xl font-semibold">
            {L("Repository Explorer", "مستكشف المستودعات", lang)} ({repos.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("Search repositories...", "ابحث في المستودعات...", lang)}
            aria-label={L("Search repositories", "بحث في المستودعات", lang)}
            className="px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={L("Filter by language", "تصفية حسب اللغة", lang)}
            className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
          >
            <option value="all">{t("common.all", lang)} — {L("Languages", "اللغات", lang)}</option>
            {availableLanguages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value as "all" | "active" | "archived" | "original")}
            aria-label={L("Filter repository status", "تصفية حالة المستودع", lang)}
            className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
          >
            <option value="all">{L("Active & Archived", "النشطة والمؤرشفة", lang)}</option>
            <option value="active">{L("Active Only", "النشطة فقط", lang)}</option>
            <option value="archived">{L("Archived Only", "المؤرشفة فقط", lang)}</option>
            <option value="original">{L("Non-Forks Only", "الأصلية فقط", lang)}</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "updated" | "stars" | "forks")}
            aria-label={L("Sort repositories", "ترتيب المستودعات", lang)}
            className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
          >
            <option value="updated">{L("Recently Updated", "الأحدث تحديثاً", lang)}</option>
            <option value="stars">{L("Most Starred", "الأكثر نجوماً", lang)}</option>
            <option value="forks">{L("Most Forked", "الأكثر تفرعاً", lang)}</option>
          </select>
        </div>

        {repos.length === 0 ? (
          <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {repos.map((r) => (
              <article key={r.id} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-semibold text-base min-w-0">
                    <a
                      href={safeUrl(r.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      <span className="truncate">{r.name}</span>
                      <ArrowUpRight className="w-4 h-4 shrink-0" />
                    </a>
                  </h3>
                  <span className="text-xs font-mono text-[var(--hub-text-muted)] shrink-0">
                    {r.isArchived ? L("Archived", "مؤرشف", lang) : L("Active", "نشط", lang)}
                    {r.isFork ? ` · ${L("Fork", "متفرع", lang)}` : ""}
                  </span>
                </div>

                <p className="text-sm text-[var(--hub-text-muted)]">
                  {r.description || L("No repository description provided.", "لا يوجد وصف للمستودع.", lang)}
                </p>

                <div className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)] flex flex-wrap gap-x-3 gap-y-1">
                  <span>{r.primaryLanguage || t("common.na", lang)}</span>
                  <span>★ {r.stars}</span>
                  <span>{L("Forks", "تفرعات", lang)} {r.forks}</span>
                  <span>{L("Issues", "مشكلات", lang)} {r.openIssues}</span>
                  <span>{r.sizeKb} KB</span>
                  <span>{r.defaultBranch}</span>
                  <span>{r.license || L("No License", "دون رخصة", lang)}</span>
                </div>

                <div className="text-xs text-[var(--hub-text-muted)]">
                  {t("common.created", lang)}: {formatDate(r.createdAt, lang)} · {t("common.updated", lang)}: {formatDate(r.pushedAt || r.updatedAt, lang)}
                </div>

                {r.topics.length > 0 && (
                  <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    {r.topics.map((tp) => `#${tp}`).join(" · ")}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Commits & Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">
            {L("Recent Commits (Public Repos)", "أحدث الالتزامات (المستودعات العامة)", lang)}
          </h2>
          {gh.commits.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)]">
              {gh.commits.slice(0, 12).map((c) => (
                <li key={c.id} className="py-3 space-y-1">
                  <a
                    href={safeUrl(c.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline block"
                  >
                    {c.message}
                  </a>
                  <div className="text-xs font-mono text-[var(--hub-text-muted)]">
                    {c.repo} · {c.shortSha} · {c.authorName} · {formatDate(c.createdAt, lang)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">
            {L("Development Activity Timeline", "الخط الزمني لنشاط التطوير", lang)}
          </h2>
          {gh.activity.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)]">
              {gh.activity.slice(0, 14).map((ev) => (
                <li key={ev.id} className="py-3 space-y-1">
                  <a
                    href={safeUrl(ev.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline block"
                  >
                    {ev.summary}
                  </a>
                  <div className="text-xs font-mono text-[var(--hub-text-muted)]">
                    {ev.type} · {formatDate(ev.createdAt, lang)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {gh.releases.length > 0 && (
        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">{L("Published Releases", "الإصدارات المنشورة", lang)}</h2>
          <ul className="divide-y divide-[var(--hub-border)]">
            {gh.releases.slice(0, 10).map((rel) => (
              <li key={rel.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <a href={safeUrl(rel.url)} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {rel.repo} — {rel.tagName} ({rel.name})
                </a>
                <span className="text-xs font-mono text-[var(--hub-text-muted)]">{formatDate(rel.createdAt, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

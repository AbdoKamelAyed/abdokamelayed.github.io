import React, { useMemo, useState } from "react";
import type { HubDatasets, Lang } from "../types/hub";
import { filterAndSortProjects } from "../utils/analytics";
import { L, loc, t } from "../utils/i18n";
import { ProjectCard } from "../components/Cards";

const PROJECT_STATUSES = [
  "Planning",
  "Research",
  "In Development",
  "Experimental",
  "Beta",
  "Active",
  "Completed",
  "Archived",
];

export const ProjectsPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"featured" | "updated" | "name">("featured");

  const repoMap = useMemo(
    () => new Map(data.github.repositories.map((r) => [r.name.toLowerCase(), r])),
    [data.github.repositories]
  );

  const filtered = useMemo(
    () => filterAndSortProjects(data.projects, { query, category, status, sort, lang }),
    [data.projects, query, category, status, sort, lang]
  );

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--hub-border)] pb-6 space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("projects.title", lang)}
        </h1>
        <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
          {t("projects.subtitle", lang)}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L("Search projects or tech stack...", "ابحث في المشاريع أو التقنيات...", lang)}
          aria-label={L("Search projects", "بحث في المشاريع", lang)}
          className="px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={L("Filter by category", "تصفية حسب الفئة", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Categories", "الفئات", lang)}</option>
          {data.projectCategories.map((c) => (
            <option key={c.id} value={c.slug}>
              {loc(c.name, lang)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={L("Filter by status", "تصفية حسب الحالة", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="all">{t("common.all", lang)} — {L("Statuses", "الحالات", lang)}</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "featured" | "updated" | "name")}
          aria-label={L("Sort projects", "ترتيب المشاريع", lang)}
          className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
        >
          <option value="featured">{L("Featured & Order", "المميزة والترتيب", lang)}</option>
          <option value="updated">{L("Recently Updated", "الأحدث تحديثاً", lang)}</option>
          <option value="name">{L("Name (A–Z)", "الاسم (أ–ي)", lang)}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-8 text-center text-sm text-[var(--hub-text-muted)]">
          {t("common.empty", lang)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pr) => (
            <ProjectCard
              key={pr.id}
              project={pr}
              linkedRepo={pr.githubRepoSlug ? repoMap.get(pr.githubRepoSlug.toLowerCase()) : undefined}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
};

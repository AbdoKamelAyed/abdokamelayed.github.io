import type { HubDatasets, Lang } from "../types/hub";
import { L, loc } from "./i18n";

export interface WorkingNowItem {
  id: string;
  kind: "project" | "role" | "focus" | "repository";
  title: string;
  summary: string;
  status: string;
  focusArea: string;
  href: string;
  updatedAt: string;
  tags: string[];
}

const ACTIVE_PROJECT_STATUSES = new Set([
  "Active",
  "In Development",
  "Beta",
  "Experimental",
  "Research",
  "Planning",
]);

export function buildWorkingNowItems(
  data: HubDatasets,
  lang: Lang,
  limit?: number
): WorkingNowItem[] {
  const items: WorkingNowItem[] = [];
  const seenTitles = new Set<string>();

  // 1. Custom website "nowItems" if configured in Admin settings
  for (const custom of data.website.nowItems || []) {
    const title = loc(custom.title, lang).trim();
    if (!title) continue;
    seenTitles.add(title.toLowerCase());
    items.push({
      id: custom.id,
      kind: "focus",
      title,
      summary: loc(custom.summary, lang),
      status: loc(custom.status, lang) || L("Active", "نشط الآن", lang),
      focusArea: loc(custom.focusArea, lang) || L("Current Focus", "تركيز حالي", lang),
      href: custom.href || "#/now",
      updatedAt: custom.updatedAt || data.website.updatedAt,
      tags: custom.tags || [],
    });
  }

  // 2. Active / In Development curated projects
  const activeProjects = [...data.projects]
    .filter((p) => ACTIVE_PROJECT_STATUSES.has(String(p.status)))
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

  for (const proj of activeProjects) {
    const title = loc(proj.name, lang);
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());
    items.push({
      id: `now-proj-${proj.id}`,
      kind: "project",
      title,
      summary: loc(proj.shortDescription, lang),
      status: String(proj.status),
      focusArea: proj.category,
      href: `#/projects/${encodeURIComponent(proj.slug || proj.id)}`,
      updatedAt: proj.updatedAt,
      tags: proj.techStack.slice(0, 4),
    });
  }

  // 3. Current active work / role milestones ("Present")
  const currentRoles = data.experience.items.filter((exp) =>
    /present|current|now|الآن|حالي/i.test(`${exp.period} ${exp.status}`)
  );
  for (const role of currentRoles) {
    const title = `${loc(role.role, lang)} — ${loc(role.organization, lang)}`;
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());
    items.push({
      id: `now-role-${role.id}`,
      kind: "role",
      title,
      summary: loc(role.summary, lang),
      status: role.period,
      focusArea: role.kind,
      href: "#/work",
      updatedAt: role.updatedAt,
      tags: role.skills.slice(0, 4),
    });
  }

  // 4. Recently pushed GitHub repositories (excluding already linked slugs)
  const linkedRepoSlugs = new Set(
    data.projects.map((p) => (p.githubRepoSlug || "").toLowerCase()).filter(Boolean)
  );
  const recentRepos = [...data.github.repositories]
    .filter((r) => !r.isArchived && !r.isFork && !linkedRepoSlugs.has(r.name.toLowerCase()))
    .sort((a, b) => (b.pushedAt || "").localeCompare(a.pushedAt || ""))
    .slice(0, 3);

  for (const repo of recentRepos) {
    if (seenTitles.has(repo.name.toLowerCase())) continue;
    seenTitles.add(repo.name.toLowerCase());
    items.push({
      id: `now-repo-${repo.id}`,
      kind: "repository",
      title: repo.name,
      summary:
        repo.description ||
        L(
          `Active development in ${repo.fullName} (${repo.primaryLanguage || "TypeScript"}).`,
          `تطوير مستمر في مستودع ${repo.fullName}.`,
          lang
        ),
      status: L("Active Repo", "مستودع نشط", lang),
      focusArea: repo.primaryLanguage || "Software",
      href: "#/github",
      updatedAt: repo.pushedAt || repo.updatedAt,
      tags: repo.topics.length > 0 ? repo.topics.slice(0, 4) : [repo.primaryLanguage || "Code"],
    });
  }

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

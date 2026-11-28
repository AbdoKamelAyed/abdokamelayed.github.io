import type { HubDatasets, Lang } from "../types/hub";
import { L, loc, t } from "./i18n";

import { getAdminModuleLabel, isAdminWorkspaceSection } from "./adminPermissions";

export type HubRouteSection =
  | "home"
  | "now"
  | "projects"
  | "github"
  | "work"
  | "journal"
  | "knowledge"
  | "about"
  | "contact"
  | "admin"
  | "not-found";

export interface HubRoute {
  section: HubRouteSection;
  param?: string | null;
  subParam?: string | null;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  href: string;
  current: boolean;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildBreadcrumbs(
  route: HubRoute,
  data: HubDatasets,
  lang: Lang
): BreadcrumbItem[] {
  if (route.section === "home") {
    return [];
  }

  const items: BreadcrumbItem[] = [
    {
      id: "home",
      label: t("nav.home", lang),
      href: "#/",
      current: false,
    },
  ];

  const param = route.param ? safeDecode(route.param) : null;
  const subParam = route.subParam ? safeDecode(route.subParam) : null;

  switch (route.section) {
    case "projects": {
      items.push({
        id: "projects",
        label: t("nav.projects", lang),
        href: "#/projects",
        current: !param,
      });
      if (param) {
        const project = data.projects.find((p) => p.slug === param || p.id === param);
        items.push({
          id: `project-${param}`,
          label: project ? loc(project.name, lang) : param,
          href: `#/projects/${encodeURIComponent(param)}`,
          current: true,
        });
      }
      break;
    }

    case "journal": {
      items.push({
        id: "journal",
        label: t("nav.journal", lang),
        href: "#/journal",
        current: !param,
      });
      if (param === "issues") {
        items.push({
          id: "journal-issues",
          label: L("Editions & Issues", "الأعداد والإصدارات", lang),
          href: "#/journal/issues",
          current: !subParam,
        });
        if (subParam) {
          const issue = (data.issues || []).find(
            (iss) => iss.slug === subParam || iss.id === subParam
          );
          const issueLabel = issue
            ? `${issue.issueNumber} — ${loc(issue.title, lang)}`
            : subParam;
          items.push({
            id: `issue-${subParam}`,
            label: issueLabel,
            href: `#/journal/issues/${encodeURIComponent(subParam)}`,
            current: true,
          });
        }
      } else if (param) {
        const article = data.articles.find((a) => a.slug === param || a.id === param);
        items.push({
          id: `article-${param}`,
          label: article ? loc(article.title, lang) : param,
          href: `#/journal/${encodeURIComponent(param)}`,
          current: true,
        });
      }
      break;
    }

    case "github":
      items.push({
        id: "github",
        label: t("nav.github", lang),
        href: "#/github",
        current: true,
      });
      break;

    case "now":
      items.push({
        id: "now",
        label: t("nav.now", lang),
        href: "#/now",
        current: true,
      });
      break;

    case "work":
      items.push({
        id: "work",
        label: t("nav.work", lang),
        href: "#/work",
        current: true,
      });
      break;

    case "knowledge":
      items.push({
        id: "knowledge",
        label: t("nav.knowledge", lang),
        href: "#/knowledge",
        current: true,
      });
      break;

    case "about":
      items.push({
        id: "about",
        label: t("nav.about", lang),
        href: "#/about",
        current: true,
      });
      break;

    case "contact":
      items.push({
        id: "contact",
        label: t("nav.contact", lang),
        href: "#/contact",
        current: true,
      });
      break;

    case "admin":
      items.push({
        id: "admin",
        label: L("Admin Workspace", "مساحة الإدارة", lang),
        href: "#/admin",
        current: !param || param === "overview",
      });
      if (param && param !== "overview" && isAdminWorkspaceSection(param)) {
        items.push({
          id: `admin-${param}`,
          label: getAdminModuleLabel(param, lang),
          href: `#/admin/${param}`,
          current: true,
        });
      }
      break;

    case "not-found":
      items.push({
        id: "not-found",
        label: L("Not Found", "غير موجود", lang),
        href: "#/",
        current: true,
      });
      break;
  }

  return items;
}

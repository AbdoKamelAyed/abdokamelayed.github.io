import {
  isAdminWorkspaceSection,
  type AdminWorkspaceSection,
} from "./adminPermissions";
import type { HubRoute, HubRouteSection } from "./breadcrumbs";

export type PublicRouteId =
  | "home"
  | "now"
  | "projects"
  | "github"
  | "work"
  | "journal"
  | "knowledge"
  | "about"
  | "contact";

export interface PublicRouteDef {
  id: PublicRouteId;
  href: string;
  i18nKey: string;
  showInHeader: boolean;
  showInFooter: boolean;
}

export const PUBLIC_ROUTE_DEFS: PublicRouteDef[] = [
  { id: "home", href: "#/", i18nKey: "nav.home", showInHeader: true, showInFooter: false },
  { id: "now", href: "#/now", i18nKey: "nav.now", showInHeader: false, showInFooter: true },
  { id: "projects", href: "#/projects", i18nKey: "nav.projects", showInHeader: true, showInFooter: true },
  { id: "github", href: "#/github", i18nKey: "nav.github", showInHeader: true, showInFooter: false },
  { id: "work", href: "#/work", i18nKey: "nav.work", showInHeader: true, showInFooter: false },
  { id: "journal", href: "#/journal", i18nKey: "nav.journal", showInHeader: true, showInFooter: true },
  { id: "knowledge", href: "#/knowledge", i18nKey: "nav.knowledge", showInHeader: true, showInFooter: false },
  { id: "about", href: "#/about", i18nKey: "nav.about", showInHeader: true, showInFooter: true },
  { id: "contact", href: "#/contact", i18nKey: "nav.contact", showInHeader: true, showInFooter: true },
];

export type AppRoute =
  | { kind: "home"; path: string }
  | { kind: "now"; path: string }
  | { kind: "projects"; path: string }
  | { kind: "project-detail"; slugOrId: string; path: string }
  | { kind: "github"; path: string }
  | { kind: "work"; path: string }
  | { kind: "journal"; path: string }
  | { kind: "article-detail"; slugOrId: string; path: string }
  | { kind: "issues"; path: string }
  | { kind: "issue-detail"; slugOrId: string; path: string }
  | { kind: "knowledge"; path: string }
  | { kind: "about"; path: string }
  | { kind: "contact"; path: string }
  | { kind: "admin"; adminSection: AdminWorkspaceSection; invalidSubSection?: string; path: string }
  | { kind: "not-found"; rawHash: string; path: string };

function safeDecodeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export function buildAdminRouteHref(section: AdminWorkspaceSection = "overview"): string {
  return section === "overview" ? "#/admin" : `#/admin/${section}`;
}

export function buildProjectRouteHref(slugOrId: string): string {
  return `#/projects/${encodeURIComponent(slugOrId)}`;
}

export function buildArticleRouteHref(slugOrId: string): string {
  return `#/journal/${encodeURIComponent(slugOrId)}`;
}

export function buildIssueRouteHref(slugOrId: string): string {
  return `#/journal/issues/${encodeURIComponent(slugOrId)}`;
}

export function parseAppRoute(hash: string): AppRoute {
  const withoutHash = (hash || "").replace(/^#/, "");
  const [rawPath] = withoutHash.split("?");
  const cleaned = rawPath.replace(/^\/+|\/+$/g, "");

  if (!cleaned || cleaned === "home") {
    return { kind: "home", path: "#/" };
  }

  const parts = cleaned.split("/").filter(Boolean);
  const head = parts[0].toLowerCase();
  const second = parts[1] ? safeDecodeSegment(parts[1]) : null;
  const third = parts[2] ? safeDecodeSegment(parts[2]) : null;

  switch (head) {
    case "now":
      if (parts.length > 1) {
        return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
      }
      return { kind: "now", path: "#/now" };

    case "projects":
      if (second) {
        return {
          kind: "project-detail",
          slugOrId: second,
          path: buildProjectRouteHref(second),
        };
      }
      return { kind: "projects", path: "#/projects" };

    case "github":
      if (parts.length > 1) {
        return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
      }
      return { kind: "github", path: "#/github" };

    case "work":
      if (parts.length > 1) {
        return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
      }
      return { kind: "work", path: "#/work" };

    case "journal":
      if (second === "issues") {
        if (third) {
          return {
            kind: "issue-detail",
            slugOrId: third,
            path: buildIssueRouteHref(third),
          };
        }
        return { kind: "issues", path: "#/journal/issues" };
      }
      if (second) {
        return {
          kind: "article-detail",
          slugOrId: second,
          path: buildArticleRouteHref(second),
        };
      }
      return { kind: "journal", path: "#/journal" };

    case "knowledge":
      if (parts.length > 1) {
        return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
      }
      return { kind: "knowledge", path: "#/knowledge" };

    case "about":
      if (parts.length > 1) {
        return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
      }
      return { kind: "about", path: "#/about" };

    case "contact":
      if (parts.length > 1) {
        return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
      }
      return { kind: "contact", path: `#/contact` };

    case "admin": {
      if (!second) {
        return { kind: "admin", adminSection: "overview", path: "#/admin" };
      }
      const normalized = second.toLowerCase();
      if (isAdminWorkspaceSection(normalized)) {
        return {
          kind: "admin",
          adminSection: normalized,
          path: buildAdminRouteHref(normalized),
        };
      }
      return {
        kind: "admin",
        adminSection: "overview",
        invalidSubSection: second,
        path: "#/admin",
      };
    }

    default:
      return { kind: "not-found", rawHash: hash, path: `#/${cleaned}` };
  }
}

export function getPublicSectionForRoute(route: AppRoute): HubRouteSection {
  switch (route.kind) {
    case "home":
      return "home";
    case "now":
      return "now";
    case "projects":
    case "project-detail":
      return "projects";
    case "github":
      return "github";
    case "work":
      return "work";
    case "journal":
    case "article-detail":
    case "issues":
    case "issue-detail":
      return "journal";
    case "knowledge":
      return "knowledge";
    case "about":
      return "about";
    case "contact":
      return "contact";
    case "admin":
      return "admin";
    case "not-found":
      return "not-found";
  }
}

export function toLegacyRoute(route: AppRoute): HubRoute {
  switch (route.kind) {
    case "project-detail":
      return { section: "projects", param: route.slugOrId, subParam: null };
    case "issues":
      return { section: "journal", param: "issues", subParam: null };
    case "issue-detail":
      return { section: "journal", param: "issues", subParam: route.slugOrId };
    case "article-detail":
      return { section: "journal", param: route.slugOrId, subParam: null };
    case "admin":
      return { section: "admin", param: route.adminSection, subParam: null };
    case "not-found":
      return { section: "not-found", param: route.rawHash || null, subParam: null };
    default:
      return { section: getPublicSectionForRoute(route), param: null, subParam: null };
  }
}

export function navigateToHash(href: string): void {
  if (typeof window === "undefined") return;
  const target = href.startsWith("#") ? href : `#/${href.replace(/^\/+/, "")}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

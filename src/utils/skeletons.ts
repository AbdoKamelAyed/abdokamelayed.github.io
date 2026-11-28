import type { HubRoute } from "./breadcrumbs";

export type SkeletonVariant =
  | "home"
  | "now"
  | "projects-grid"
  | "project-detail"
  | "github"
  | "work"
  | "journal-list"
  | "journal-issues"
  | "article-detail"
  | "issue-detail"
  | "knowledge"
  | "about"
  | "contact"
  | "admin";

export function resolveSkeletonVariant(route: HubRoute): SkeletonVariant {
  switch (route.section) {
    case "home":
      return "home";
    case "now":
      return "now";
    case "projects":
      return route.param ? "project-detail" : "projects-grid";
    case "github":
      return "github";
    case "work":
      return "work";
    case "journal":
      if (route.param === "issues") {
        return route.subParam ? "issue-detail" : "journal-issues";
      }
      return route.param ? "article-detail" : "journal-list";
    case "knowledge":
      return "knowledge";
    case "about":
      return "about";
    case "contact":
      return "contact";
    case "admin":
      return "admin";
    case "not-found":
      return "home";
  }
}

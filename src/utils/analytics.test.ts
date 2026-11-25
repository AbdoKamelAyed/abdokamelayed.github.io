import test from "node:test";
import assert from "node:assert/strict";
import {
  filterAndSortProjects,
  filterAndSortRepos,
  formatBytesCompact,
  safeUrl,
  searchDocuments,
  slugify,
  summarizeMonthlyContributions,
  validateCollectionSchema,
} from "./analytics";
import type { GitHubContributions, GitHubRepo, ProjectRecord } from "../types/hub";

test("safeUrl allows safe schemes and blocks javascript/data URIs", () => {
  assert.equal(safeUrl("https://github.com/AbdoKamelAyed"), "https://github.com/AbdoKamelAyed");
  assert.equal(safeUrl("mailto:abdo@example.com"), "mailto:abdo@example.com");
  assert.equal(safeUrl("#/projects/demo"), "#/projects/demo");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,<script>alert(1)</script>"), "");
});

test("slugify creates clean URL slugs", () => {
  assert.equal(slugify("ABDO — Personal Digital Hub"), "abdo-personal-digital-hub");
});

test("filterAndSortProjects filters by category/status/query and sorts featured first", () => {
  const sample: ProjectRecord[] = [
    {
      id: "p1",
      slug: "p1",
      name: { en: "Alpha Tool", ar: "ألفا" },
      shortDescription: { en: "CLI helper", ar: "أداة" },
      fullDescription: { en: "", ar: "" },
      category: "software-tools",
      status: "Beta",
      featured: false,
      sortOrder: 2,
      techStack: ["TypeScript"],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
      source: "manual",
    },
    {
      id: "p2",
      slug: "p2",
      name: { en: "Beta Hub", ar: "بيتا" },
      shortDescription: { en: "Web platform", ar: "منصة" },
      fullDescription: { en: "", ar: "" },
      category: "web-applications",
      status: "Active",
      featured: true,
      sortOrder: 1,
      techStack: ["React"],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
      source: "manual",
    },
  ];

  const allFeatured = filterAndSortProjects(sample, { query: "", category: "all", status: "all", sort: "featured", lang: "en" });
  assert.equal(allFeatured[0].id, "p2");

  const filtered = filterAndSortProjects(sample, { query: "TypeScript", category: "software-tools", status: "Beta", sort: "name", lang: "en" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "p1");
});

test("filterAndSortRepos handles active/archived/forks and star sorting", () => {
  const repos: GitHubRepo[] = [
    {
      id: "r1",
      name: "archived-lib",
      fullName: "AbdoKamelAyed/archived-lib",
      description: "Old lib",
      primaryLanguage: "JavaScript",
      languages: { JavaScript: 500 },
      stars: 10,
      forks: 2,
      openIssues: 0,
      sizeKb: 40,
      defaultBranch: "main",
      license: "MIT",
      topics: [],
      url: "https://github.com/AbdoKamelAyed/archived-lib",
      homepage: null,
      isArchived: true,
      isFork: false,
      isFeatured: false,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-05-01T00:00:00Z",
      pushedAt: "2024-05-01T00:00:00Z",
      status: "archived",
      source: "github",
    },
    {
      id: "r2",
      name: "active-app",
      fullName: "AbdoKamelAyed/active-app",
      description: "Active TypeScript app",
      primaryLanguage: "TypeScript",
      languages: { TypeScript: 2000 },
      stars: 25,
      forks: 5,
      openIssues: 1,
      sizeKb: 120,
      defaultBranch: "main",
      license: "MIT",
      topics: ["web"],
      url: "https://github.com/AbdoKamelAyed/active-app",
      homepage: null,
      isArchived: false,
      isFork: false,
      isFeatured: true,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      pushedAt: "2026-01-01T00:00:00Z",
      status: "active",
      source: "github",
    },
  ];

  const activeOnly = filterAndSortRepos(repos, { query: "", language: "all", state: "active", sort: "stars" });
  assert.equal(activeOnly.length, 1);
  assert.equal(activeOnly[0].name, "active-app");
});

test("summarizeMonthlyContributions aggregates calendar weeks cleanly", () => {
  const contrib: GitHubContributions = {
    id: "c",
    note: "",
    available: true,
    unavailableReason: null,
    totals: null,
    streaks: { currentStreak: 2, longestStreak: 2, mostActiveDay: null, weeklyTotals: [] },
    calendar: {
      totalContributions: 7,
      weeks: [
        {
          contributionDays: [
            { date: "2026-10-01", contributionCount: 3, weekday: 4 },
            { date: "2026-10-02", contributionCount: 2, weekday: 5 },
            { date: "2026-11-01", contributionCount: 2, weekday: 0 },
          ],
        },
      ],
    },
    createdAt: "",
    updatedAt: "",
    status: "synced",
    source: "graphql",
  };
  const monthly = summarizeMonthlyContributions(contrib);
  assert.deepEqual(monthly, [
    { month: "2026-11", count: 2 },
    { month: "2026-10", count: 5 },
  ]);
});

test("validateCollectionSchema catches missing fields and duplicate IDs", () => {
  const res = validateCollectionSchema({
    items: [
      { id: "dup", createdAt: "2026-01-01", updatedAt: "2026-01-01", status: "active", source: "manual" },
      { id: "dup", createdAt: "2026-01-01", updatedAt: "2026-01-01", status: "active", source: "" },
    ],
  });
  assert.equal(res.valid, false);
  assert.equal(res.errors.length, 2);
});

test("searchDocuments filters by category and query", () => {
  const hits = [
    { type: "project" as const, id: "1", title: "Suefco Portal", subtitle: "Industrial", meta: "React", route: "#/projects/1" },
    { type: "article" as const, id: "2", title: "GitHub Sync", subtitle: "Actions", meta: "CI", route: "#/journal/2" },
  ];
  assert.equal(searchDocuments(hits, "Suefco", "all").length, 1);
  assert.equal(searchDocuments(hits, "Suefco", "article").length, 0);
  assert.equal(formatBytesCompact(2048), "2.0 KB");
});

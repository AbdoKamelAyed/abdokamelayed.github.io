import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateArticleScrollProgress,
  calculateReadingTimeMinutes,
  countWords,
  extractArticleSummary,
  filterAndSortProjects,
  filterAndSortRepos,
  formatBytesCompact,
  getRelatedArticles,
  safeUrl,
  searchDocuments,
  slugify,
  summarizeMonthlyContributions,
  validateCollectionSchema,
} from "./analytics";
import {
  constantTimeEqual,
  evaluatePassphraseStrength,
  hashPassphrase,
  hashPassphrasePbkdf2,
} from "./adminAuth";
import {
  calculateIssueStats,
  getIsoWeekKey,
  getPeriodKeyForCadence,
  selectArticlesForIssue,
} from "./issues";
import { generatePdfBytes } from "./pdfMaker";
import { analyzeSeoAudit, generateRobotsTxt, generateSitemapXml } from "./seoEngine";
import { extractTableOfContents, parseMarkdownBlocks, tokenizeInlineMarkdown } from "./markdown";
import type { ArticleRecord, GitHubContributions, GitHubRepo, HubDatasets, ProjectRecord } from "../types/hub";

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

test("countWords and calculateReadingTimeMinutes compute reading time at 200 WPM", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   hello   world \n\n test "), 3);
  assert.equal(calculateReadingTimeMinutes(""), 1);
  assert.equal(calculateReadingTimeMinutes(Array(200).fill("word").join(" ")), 1);
  assert.equal(calculateReadingTimeMinutes(Array(201).fill("word").join(" ")), 2);
  assert.equal(calculateReadingTimeMinutes(Array(650).fill("كلمة").join(" ")), 4);
});

test("calculateArticleScrollProgress maps article scroll position to 0-100 percentage", () => {
  assert.equal(calculateArticleScrollProgress(0, 1500, 900, 1800), 0);
  assert.equal(calculateArticleScrollProgress(300, 1500, 900, 1800), 50);
  assert.equal(calculateArticleScrollProgress(600, 1500, 900, 1800), 100);
  assert.equal(calculateArticleScrollProgress(900, 1500, 900, 1800), 100);
  assert.equal(calculateArticleScrollProgress(0, 700, 900, 900), 0);
});

test("getRelatedArticles suggests up to 3 articles sharing tags or categories ranked by overlap", () => {
  const makeArt = (
    id: string,
    type: string,
    categories: string[],
    tags: string[],
    publishedAt: string
  ): ArticleRecord => ({
    id,
    slug: id,
    type,
    title: { en: id, ar: id },
    subtitle: { en: "", ar: "" },
    content: { en: "word ".repeat(50), ar: "كلمة ".repeat(50) },
    publishedAt,
    categories,
    tags,
    readingTimeMinutes: 1,
    featured: false,
    createdAt: "2026-11-25T00:00:00Z",
    updatedAt: "2026-11-25T00:00:00Z",
    status: "published",
    source: "manual",
  });

  const base = makeArt("base", "development-logs", ["development-logs"], ["architecture", "github-actions"], "2026-11-25");
  const list = [
    base,
    makeArt("a1", "technical-notes", ["technical-notes"], ["architecture", "github-actions"], "2026-11-20"),
    makeArt("a2", "development-logs", ["development-logs"], ["typescript"], "2026-11-24"),
    makeArt("a3", "articles", ["articles"], ["architecture"], "2026-11-22"),
    makeArt("a4", "development-logs", ["development-logs"], ["github-actions", "ci"], "2026-11-23"),
    makeArt("unrelated", "tutorials", ["tutorials"], ["css"], "2026-11-25"),
  ];

  const related = getRelatedArticles(base, list, 3);
  assert.equal(related.length, 3);
  assert.deepEqual(related.map((r) => r.id), ["a1", "a4", "a3"]);
  assert.equal(related.some((r) => r.id === "base" || r.id === "unrelated"), false);
});

test("parseMarkdownBlocks parses headings, lists, quotes, code fences, images, embeds, and inline tokens", () => {
  const md = "## Architecture\n\n[[embed:asset-code-pipeline|Pipeline Script]]\n\n![System diagram](/assets/diagram.png)\n\n> Clean separation.\n\n- Item **one**\n- Item [two](https://abdokamelayed.github.io)\n\n```ts\nconst x = 1;\n```";
  const blocks = parseMarkdownBlocks(md);
  assert.deepEqual(blocks.map((b) => b.type), ["h2", "embed", "img", "blockquote", "ul", "code"]);
  assert.deepEqual(blocks[1], { type: "embed", assetId: "asset-code-pipeline", caption: "Pipeline Script" });
  const tokens = tokenizeInlineMarkdown("Hello **bold** and `code`");
  assert.equal(tokens.length, 4);
  assert.equal(tokens[1].type, "bold");
  assert.equal(tokens[3].type, "code");
});

test("PBKDF2-SHA-256 hashing, passphrase strength check, and constantTimeEqual work reliably", async () => {
  const h1 = await hashPassphrase("secret-pass", "salt123");
  const h2 = await hashPassphrase("secret-pass", "salt123");
  assert.equal(h1.length, 64);
  assert.equal(constantTimeEqual(h1, h2), true);
  assert.equal(constantTimeEqual(h1, "short"), false);

  const p1 = await hashPassphrasePbkdf2("StrongPass!2026", "salthex123", 1000);
  const p2 = await hashPassphrasePbkdf2("StrongPass!2026", "salthex123", 1000);
  const p3 = await hashPassphrasePbkdf2("Different!2026", "salthex123", 1000);
  assert.equal(p1.length, 64);
  assert.equal(p1, p2);
  assert.notEqual(p1, p3);

  assert.equal(evaluatePassphraseStrength("short").valid, false);
  assert.equal(evaluatePassphraseStrength("AbdoHub#2026").valid, true);
});

test("extractArticleSummary prefers abstract property and falls back to stripped first paragraph", () => {
  const withAbstract = extractArticleSummary(
    {
      abstract: { en: "Concise **dataset** abstract.", ar: "ملخص **بيانات**." },
      content: { en: "Body paragraph here.", ar: "فقرة." },
    },
    "en"
  );
  assert.deepEqual(withAbstract, { text: "Concise dataset abstract.", source: "abstract" });

  const fromFirstPara = extractArticleSummary(
    {
      content: {
        en: "## Heading\n\n[[embed:asset-pdf-brief]]\n\nFirst **key** insight from [the docs](https://example.com) with `code`.\n\nSecond paragraph.",
        ar: "الفقرة الأولى هنا.",
      },
    },
    "en"
  );
  assert.deepEqual(fromFirstPara, {
    text: "First key insight from the docs with code.",
    source: "excerpt",
  });
});

test("extractTableOfContents extracts H2/H3 headings with deduplicated anchor IDs", () => {
  const md = [
    "## **System** Overview",
    "",
    "Some prose.",
    "",
    "### Data Pipeline",
    "",
    "```bash",
    "## Not a heading inside code fence",
    "```",
    "",
    "### Data Pipeline",
  ].join("\n");

  const toc = extractTableOfContents(md);
  assert.deepEqual(toc, [
    { id: "system-overview", level: 2, title: "System Overview" },
    { id: "data-pipeline", level: 3, title: "Data Pipeline" },
    { id: "data-pipeline-2", level: 3, title: "Data Pipeline" },
  ]);
});

test("Journal Issues logic buckets Weekly/Monthly/Annual periods and filters by topic or manual list", () => {
  assert.equal(getIsoWeekKey("2026-11-25"), "2026-W48");
  assert.equal(getPeriodKeyForCadence("2026-11-25", "monthly"), "2026-11");
  assert.equal(getPeriodKeyForCadence("2026-11-25", "annual"), "2026");

  const arts: ArticleRecord[] = [
    {
      id: "a1",
      slug: "a1",
      type: "development-logs",
      title: { en: "One", ar: "١" },
      subtitle: { en: "", ar: "" },
      content: { en: "word ".repeat(220), ar: "كلمة" },
      publishedAt: "2026-11-25",
      categories: ["development-logs"],
      tags: ["architecture", "ci"],
      readingTimeMinutes: 2,
      featured: false,
      createdAt: "",
      updatedAt: "",
      status: "published",
      source: "manual",
    },
    {
      id: "a2",
      slug: "a2",
      type: "articles",
      title: { en: "Two", ar: "٢" },
      subtitle: { en: "", ar: "" },
      content: { en: "word ".repeat(50), ar: "كلمة" },
      publishedAt: "2026-10-12",
      categories: ["articles"],
      tags: ["css"],
      readingTimeMinutes: 1,
      featured: false,
      createdAt: "",
      updatedAt: "",
      status: "published",
      source: "manual",
    },
  ];

  const monthly = selectArticlesForIssue(arts, { cadence: "monthly", selectionMode: "period", periodKey: "2026-11" });
  assert.deepEqual(monthly.map((a) => a.id), ["a1"]);

  const byTopic = selectArticlesForIssue(arts, { cadence: "annual", selectionMode: "topic", periodKey: "2026", topics: ["architecture"] });
  assert.deepEqual(byTopic.map((a) => a.id), ["a1"]);

  const stats = calculateIssueStats(arts, "en");
  assert.equal(stats.articleCount, 2);
  assert.equal(stats.totalWords, 270);
  assert.equal(stats.totalReadingMinutes, 3);
});

test("PDF Maker generates valid PDF 1.4 binary bytes and SEO Engine emits XML sitemap", () => {
  const bytes = generatePdfBytes({
    kicker: "ABDO HUB | EDITION 01",
    title: "Zero-Backend Engineering Monograph",
    subtitle: "Technical brief",
    metadataLine: "By Abdo Kamel | 2026-11-25",
    editorialNote: "Foreword paragraph summarizing this edition.",
    sections: [
      {
        title: "Chapter One",
        markdownContent: "## Section\n\nParagraph text with `inline` code.\n\n- Bullet one\n- Bullet two",
        tags: ["architecture"],
      },
    ],
  });
  const text = new TextDecoder().decode(bytes);
  assert.equal(text.startsWith("%PDF-1.4"), true);
  assert.equal(text.includes("%%EOF"), true);
  assert.equal(text.includes("Zero-Backend Engineering Monograph"), true);

  const mockData = {
    website: {
      id: "w",
      siteName: "ABDO — Personal Digital Hub & Intelligence",
      shortTitle: "ABDO",
      domain: "https://abdokamelayed.github.io",
      defaultLanguage: "en",
      supportedLanguages: ["en", "ar"],
      defaultTheme: "light",
      defaultGlassMode: false,
      primaryAccent: "#0f172a",
      secondaryAccent: "#2563eb",
      seoDescription: { en: "Comprehensive developer portfolio and technical journal by Abdo Kamel covering software systems.", ar: "موقع ووصف تعريفي كامل باللغة العربية لتوثيق المشاريع والمقالات الهندسية." },
      createdAt: "",
      updatedAt: "2026-11-25",
      status: "active",
      source: "test",
      version: "1.0.0",
    },
    profileSettings: {
      id: "p",
      fullName: { en: "Abdo Kamel", ar: "عبدو كامل" },
      githubUsername: "AbdoKamelAyed",
      avatarUrl: "/src/assets/images/author_abdo_portrait_1795606693025.jpg",
      headline: { en: "Software Architect", ar: "مهندس" },
      shortBio: { en: "Bio", ar: "نبذة" },
      mission: { en: "", ar: "" },
      careerDirection: { en: "", ar: "" },
      technicalInterests: [],
      selectedAchievements: [],
      contact: { email: "", github: "", linkedin: "", website: "", otherLinks: [] },
      createdAt: "",
      updatedAt: "2026-11-25",
      status: "active",
      source: "test",
    },
    projects: [],
    articles: [],
    issues: [],
  } as unknown as HubDatasets;

  const audit = analyzeSeoAudit(mockData, "en");
  assert.equal(audit.some((c) => c.id === "seo-canonical" && c.status === "pass"), true);
  const xml = generateSitemapXml(mockData);
  assert.equal(xml.includes("<urlset"), true);
  assert.equal(generateRobotsTxt(mockData.website.domain).includes("Sitemap: https://abdokamelayed.github.io/sitemap.xml"), true);
});




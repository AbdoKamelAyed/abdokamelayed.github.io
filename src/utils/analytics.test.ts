import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchIndex,
  calculateArticleScrollProgress,
  calculateReadingTimeMinutes,
  calculateScrollProgressState,
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
  registerAdminAccount,
  resetAdminCredential,
} from "./adminAuth";
import {
  canAccessAdminModule,
  getDefaultModulesForRole,
  resolveEffectiveModules,
} from "./adminPermissions";
import { buildAdminRouteHref, parseAppRoute, toLegacyRoute } from "./router";
import {
  calculateIssueStats,
  getIsoWeekKey,
  getPeriodKeyForCadence,
  selectArticlesForIssue,
} from "./issues";
import { generatePdfBytes } from "./pdfMaker";
import { analyzeSeoAudit, applyPageSeoMetadata, generateRobotsTxt, generateSitemapXml } from "./seoEngine";
import { extractTableOfContents, parseMarkdownBlocks, tokenizeInlineMarkdown } from "./markdown";
import {
  DEFAULT_DESIGN_THEME_ID,
  DESIGN_THEMES,
  getDesignThemeById,
  getPairedPolarityThemeId,
} from "./designThemes";
import {
  applyArticleFontScale,
  canStepFontScale,
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  getFontScaleDefinition,
  getFontScaleLabel,
  getNextFontScale,
  normalizeFontScale,
  stepFontScale,
} from "./typography";
import { buildBreadcrumbs } from "./breadcrumbs";
import { resolveSkeletonVariant } from "./skeletons";
import { normalizeCodeLanguage, tokenizeCode, tokenizeCodeLine } from "./codeHighlight";
import {
  computeAdminChartMetrics,
  computePositionSectionMetrics,
  computeRoleDashboardMetrics,
} from "./adminAnalytics";
import {
  base64ToUtf8,
  buildGitHubRawUrl,
  resolveGitHubSyncTargetFromSettings,
  sanitizeRepoStoragePath,
  splitRepoPath,
  uploadFileToGitHubRepo,
  utf8ToBase64,
  validateGitHubRepoTarget,
} from "../services/githubStorageService";
import { mapDatasetPathToRepoPath } from "../services/dataService";
import {
  buildDriveMultipartBody,
  formatDriveFilesQuery,
  mapDriveFileToMediaAsset,
} from "./googleDriveHelpers";
import {
  createInitialNetworkState,
  getNetworkNoticeCopy,
  reduceNetworkStatus,
} from "./networkStatus";
import {
  buildJournalPrintCoverMeta,
  buildKnowledgeArchiveCoverMeta,
  buildKnowledgePrintCoverMeta,
  formatReadingTimeLabel,
} from "./printMetadata";
import {
  buildGitHubHeatmapModel,
  computeIntensityThresholds,
  quantizeActivityLevel,
} from "./githubHeatmap";
import {
  createEmptyVisitStore,
  exportVisitsCsv,
  getAdminVisitAnalytics,
  getArticleViewCount,
  getPublicVisitInsights,
  recordVisitEvent,
} from "./visitInsights";
import {
  buildSocialShareLinks,
  resolveAbsoluteShareUrl,
  resolveLinkPreviewImage,
} from "./socialShare";
import { buildWorkingNowItems } from "./workingNow";
import type { ArticleRecord, GitHubActivity, GitHubCommit, GitHubContributions, GitHubRepo, HubDatasets, KnowledgeEntry, ProjectRecord } from "../types/hub";

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

test("calculateArticleScrollProgress and calculateScrollProgressState map scroll position and scrollability", () => {
  assert.equal(calculateArticleScrollProgress(0, 1500, 900, 1800), 0);
  assert.equal(calculateArticleScrollProgress(300, 1500, 900, 1800), 50);
  assert.equal(calculateArticleScrollProgress(600, 1500, 900, 1800), 100);
  assert.equal(calculateArticleScrollProgress(900, 1500, 900, 1800), 100);
  assert.equal(calculateArticleScrollProgress(0, 700, 900, 900), 0);

  assert.deepEqual(calculateScrollProgressState(0, 700, 900, 900), {
    progress: 0,
    scrollable: false,
  });
  assert.deepEqual(calculateScrollProgressState(450, 2400, 900, 2600), {
    progress: 30,
    scrollable: true,
  });
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

test("15 Design Directions registry provides 15 unique, valid, contrast-paired themes", () => {
  assert.equal(DESIGN_THEMES.length, 15);
  const ids = new Set(DESIGN_THEMES.map((t) => t.id));
  const orders = new Set(DESIGN_THEMES.map((t) => t.order));
  assert.equal(ids.size, 15);
  assert.equal(orders.size, 15);

  const hexPattern = /^#[0-9a-f]{6}$/i;
  for (const theme of DESIGN_THEMES) {
    assert.ok(theme.name.en && theme.name.ar);
    assert.ok(theme.directionGuide.en.length > 20 && theme.directionGuide.ar.length > 15);
    assert.ok(hexPattern.test(theme.tokens.bg));
    assert.ok(hexPattern.test(theme.tokens.surfaceElevated));
    assert.ok(hexPattern.test(theme.tokens.text));
    assert.ok(hexPattern.test(theme.tokens.secondary));

    const opposite = theme.polarity === "dark" ? "light" : "dark";
    const paired = getDesignThemeById(getPairedPolarityThemeId(theme.id, opposite));
    assert.equal(paired.polarity, opposite);
  }

  assert.equal(getDesignThemeById("non-existent-id").id, DEFAULT_DESIGN_THEME_ID);
});

test("Font scale helpers normalize inputs and cycle small -> medium -> large -> small", () => {
  assert.equal(normalizeFontScale(null), DEFAULT_FONT_SCALE);
  assert.equal(normalizeFontScale("invalid"), "medium");
  assert.equal(normalizeFontScale("small"), "small");
  assert.equal(normalizeFontScale("large"), "large");

  assert.equal(getNextFontScale("small"), "medium");
  assert.equal(getNextFontScale("medium"), "large");
  assert.equal(getNextFontScale("large"), "small");

  assert.equal(FONT_SCALES.small.rootFontSizePx < FONT_SCALES.medium.rootFontSizePx, true);
  assert.equal(FONT_SCALES.medium.rootFontSizePx < FONT_SCALES.large.rootFontSizePx, true);
  assert.equal(getFontScaleDefinition("large").rootFontSizePx, 18);
  assert.equal(getFontScaleLabel("small", "en"), "Small");
  assert.equal(getFontScaleLabel("large", "ar"), "كبير");
});

test("buildSearchIndex and searchDocuments rank title hits first and support multi-word queries across articles, projects, knowledge, and issues", () => {
  const sampleHub = {
    projects: [
      {
        id: "proj-portal",
        slug: "suefco-portal",
        name: { en: "Architecture Hub Portal", ar: "بوابة" },
        shortDescription: { en: "Modular frontend system", ar: "نظام" },
        fullDescription: { en: "Detailed portal implementation notes", ar: "تفاصيل" },
        category: "web-applications",
        status: "Active",
        featured: true,
        sortOrder: 1,
        techStack: ["TypeScript", "React"],
        createdAt: "",
        updatedAt: "",
        source: "manual",
      },
    ],
    articles: [
      {
        id: "art-body",
        slug: "deploy-log",
        type: "development-logs",
        title: { en: "Deployment Notes", ar: "ملاحظات" },
        subtitle: { en: "Static releases", ar: "إصدارات" },
        abstract: { en: "Notes on zero-backend pages deployment.", ar: "ملخص" },
        content: { en: "We use a clean architecture pattern for pages.", ar: "محتوى" },
        publishedAt: "2026-11-25",
        categories: ["development-logs"],
        tags: ["ci"],
        readingTimeMinutes: 2,
        featured: false,
        createdAt: "",
        updatedAt: "",
        status: "published",
        source: "manual",
      },
      {
        id: "art-title",
        slug: "architecture-manifesto",
        type: "articles",
        title: { en: "System Architecture Guide", ar: "دليل المعمارية" },
        subtitle: { en: "Zero-backend pages", ar: "صفحات" },
        content: { en: "Deep dive into modular static hubs.", ar: "شرح" },
        publishedAt: "2026-11-24",
        categories: ["articles"],
        tags: ["architecture"],
        readingTimeMinutes: 3,
        featured: true,
        createdAt: "",
        updatedAt: "",
        status: "published",
        source: "manual",
      },
    ],
    knowledge: [
      {
        id: "know-1",
        title: { en: "Incremental Simplicity", ar: "البساطة التدريجية" },
        summary: { en: "Design systems with clear boundaries and architecture.", ar: "ملخص" },
        category: "systems-engineering",
        entryType: "principle",
        tags: ["architecture", "design"],
        sourceAttribution: "Internal Handbook",
        createdAt: "",
        updatedAt: "",
        status: "active",
        source: "manual",
      },
    ],
    issues: [
      {
        id: "iss-1",
        slug: "edition-01",
        issueNumber: "ISSUE #01",
        title: { en: "November Architecture Digest", ar: "نشرة" },
        subtitle: { en: "Monthly compilation", ar: "تجميع" },
        cadence: "monthly",
        selectionMode: "period",
        periodKey: "2026-11",
        articleIds: ["art-title"],
        topics: ["architecture"],
        editorialNote: { en: "Curated monthly readings.", ar: "قراءات" },
        publishedAt: "2026-11-25",
        createdAt: "",
        updatedAt: "",
        status: "published",
        source: "manual",
      },
    ],
    github: { repositories: [] },
    experience: { items: [] },
  } as unknown as HubDatasets;

  const index = buildSearchIndex(sampleHub, "en");
  assert.equal(index.length, 5);

  // Title match ("System Architecture Guide") must outrank body-only match ("Deployment Notes")
  const archHits = searchDocuments(index, "architecture", "all");
  assert.equal(archHits.length, 5);
  assert.equal(archHits[0].title.includes("Architecture"), true);
  assert.equal(archHits[archHits.length - 1].id, "art-body");

  // Multi-word AND query matching across abstract/subtitle & body
  const multiWord = searchDocuments(index, "zero-backend pages", "article");
  assert.equal(multiWord.length, 2);
  assert.equal(multiWord[0].id, "art-title");

  // Category filtering works for knowledge & issues
  const knowHits = searchDocuments(index, "simplicity", "knowledge");
  assert.equal(knowHits.length, 1);
  assert.equal(knowHits[0].route, "#/knowledge");

  const issueHits = searchDocuments(index, "november", "issue");
  assert.equal(issueHits.length, 1);
  assert.equal(issueHits[0].route, "#/journal/issues/edition-01");
});

test("buildBreadcrumbs builds dynamic bilingual hierarchy trails for sections, projects, articles, and journal issues", () => {
  const hub = {
    projects: [
      {
        id: "p1",
        slug: "abdo-hub",
        name: { en: "ABDO Hub", ar: "منصة عبدو" },
      },
    ],
    articles: [
      {
        id: "a1",
        slug: "zero-backend-pages",
        title: { en: "Zero-Backend Architecture", ar: "معمارية بدون خادم" },
      },
    ],
    issues: [
      {
        id: "i1",
        slug: "week-48",
        issueNumber: "ED. 03",
        title: { en: "Modular Systems Digest", ar: "نشرة الأنظمة" },
      },
    ],
  } as unknown as HubDatasets;

  // Home omits breadcrumb trail
  assert.deepEqual(buildBreadcrumbs({ section: "home" }, hub, "en"), []);

  // Top-level section
  assert.deepEqual(buildBreadcrumbs({ section: "projects" }, hub, "en"), [
    { id: "home", label: "Home", href: "#/", current: false },
    { id: "projects", label: "Projects", href: "#/projects", current: true },
  ]);

  // Project detail resolves localized title
  assert.deepEqual(buildBreadcrumbs({ section: "projects", param: "abdo-hub" }, hub, "en"), [
    { id: "home", label: "Home", href: "#/", current: false },
    { id: "projects", label: "Projects", href: "#/projects", current: false },
    { id: "project-abdo-hub", label: "ABDO Hub", href: "#/projects/abdo-hub", current: true },
  ]);

  // Article detail
  assert.deepEqual(buildBreadcrumbs({ section: "journal", param: "zero-backend-pages" }, hub, "en"), [
    { id: "home", label: "Home", href: "#/", current: false },
    { id: "journal", label: "Journal", href: "#/journal", current: false },
    { id: "article-zero-backend-pages", label: "Zero-Backend Architecture", href: "#/journal/zero-backend-pages", current: true },
  ]);

  // Journal Issues index & nested Issue Edition in Arabic (RTL)
  assert.deepEqual(buildBreadcrumbs({ section: "journal", param: "issues" }, hub, "ar"), [
    { id: "home", label: "الرئيسية", href: "#/", current: false },
    { id: "journal", label: "المدونة", href: "#/journal", current: false },
    { id: "journal-issues", label: "الأعداد والإصدارات", href: "#/journal/issues", current: true },
  ]);

  assert.deepEqual(buildBreadcrumbs({ section: "journal", param: "issues", subParam: "week-48" }, hub, "ar"), [
    { id: "home", label: "الرئيسية", href: "#/", current: false },
    { id: "journal", label: "المدونة", href: "#/journal", current: false },
    { id: "journal-issues", label: "الأعداد والإصدارات", href: "#/journal/issues", current: false },
    { id: "issue-week-48", label: "ED. 03 — نشرة الأنظمة", href: "#/journal/issues/week-48", current: true },
  ]);

  // Unknown or malformed encoded param falls back cleanly without throwing
  const fallback = buildBreadcrumbs({ section: "journal", param: "%E0%A4%A" }, hub, "en");
  assert.equal(fallback.length, 3);
  assert.equal(fallback[2].label, "%E0%A4%A");
  assert.equal(fallback[2].current, true);
});

test("resolveSkeletonVariant maps every route and sub-route to a dedicated section skeleton", () => {
  assert.equal(resolveSkeletonVariant({ section: "home" }), "home");
  assert.equal(resolveSkeletonVariant({ section: "projects" }), "projects-grid");
  assert.equal(resolveSkeletonVariant({ section: "projects", param: "abdo-hub" }), "project-detail");
  assert.equal(resolveSkeletonVariant({ section: "journal" }), "journal-list");
  assert.equal(resolveSkeletonVariant({ section: "journal", param: "zero-backend" }), "article-detail");
  assert.equal(resolveSkeletonVariant({ section: "journal", param: "issues" }), "journal-issues");
  assert.equal(resolveSkeletonVariant({ section: "journal", param: "issues", subParam: "week-48" }), "issue-detail");
  assert.equal(resolveSkeletonVariant({ section: "github" }), "github");
  assert.equal(resolveSkeletonVariant({ section: "work" }), "work");
  assert.equal(resolveSkeletonVariant({ section: "knowledge" }), "knowledge");
  assert.equal(resolveSkeletonVariant({ section: "about" }), "about");
  assert.equal(resolveSkeletonVariant({ section: "contact" }), "contact");
  assert.equal(resolveSkeletonVariant({ section: "admin" }), "admin");
});

test("stepFontScale and canStepFontScale clamp cleanly at small and large bounds", () => {
  assert.equal(stepFontScale("small", -1), "small");
  assert.equal(stepFontScale("small", 1), "medium");
  assert.equal(stepFontScale("medium", 1), "large");
  assert.equal(stepFontScale("large", 1), "large");
  assert.equal(stepFontScale("large", -1), "medium");

  assert.equal(canStepFontScale("small", -1), false);
  assert.equal(canStepFontScale("small", 1), true);
  assert.equal(canStepFontScale("medium", -1), true);
  assert.equal(canStepFontScale("medium", 1), true);
  assert.equal(canStepFontScale("large", 1), false);
  assert.equal(canStepFontScale("large", -1), true);
});

test("tokenizeCode highlights keywords, strings, numbers, multi-line block comments, Python comments, and JSON property keys", () => {
  assert.equal(normalizeCodeLanguage("tsx"), "typescript");
  assert.equal(normalizeCodeLanguage("sh"), "bash");

  const tsResult = tokenizeCode('/* header\n   note */\nconst total: number = 42;\nreturn "ok";', "ts");
  assert.equal(tsResult.normalizedLanguage, "typescript");
  assert.equal(tsResult.lines.length, 4);
  assert.equal(tsResult.lines[0][0].type, "comment");
  assert.equal(tsResult.lines[1][0].type, "comment");
  assert.equal(tsResult.lines[2].some((t) => t.type === "keyword" && t.value === "const"), true);
  assert.equal(tsResult.lines[2].some((t) => t.type === "type" && t.value === "number"), true);
  assert.equal(tsResult.lines[2].some((t) => t.type === "number" && t.value === "42"), true);
  assert.equal(tsResult.lines[3].some((t) => t.type === "string" && t.value === '"ok"'), true);

  const pyTokens = tokenizeCodeLine("def sync(): # comment", "python");
  assert.equal(pyTokens.some((t) => t.type === "keyword" && t.value === "def"), true);
  assert.equal(pyTokens.some((t) => t.type === "function" && t.value === "sync"), true);
  assert.equal(pyTokens.some((t) => t.type === "comment" && t.value === "# comment"), true);

  const jsonTokens = tokenizeCodeLine('  "siteName": "ABDO Hub"', "json");
  assert.equal(jsonTokens.some((t) => t.type === "property" && t.value === '"siteName"'), true);
  assert.equal(jsonTokens.some((t) => t.type === "string" && t.value === '"ABDO Hub"'), true);
});

test("computeAdminChartMetrics aggregates timeline, media mix, top repos, and publish health", () => {
  const sample = {
    allArticlesRaw: [
      { id: "a1", publishedAt: "2026-10-12", createdAt: "2026-10-12", status: "published" },
      { id: "a2", publishedAt: "2026-11-05", createdAt: "2026-11-05", status: "draft" },
    ],
    projects: [
      { id: "p1", createdAt: "2026-11-01", updatedAt: "2026-11-10", status: "Active" },
    ],
    allIssuesRaw: [
      { id: "i1", publishedAt: "2026-11-20", createdAt: "2026-11-20", status: "published" },
    ],
    allKnowledgeRaw: [
      { id: "k1", createdAt: "2026-11-22", updatedAt: "2026-11-22", status: "published" },
    ],
    mediaAssets: [
      { id: "m1", mediaType: "pdf", sizeBytes: 1000 },
      { id: "m2", mediaType: "code", sizeBytes: 500 },
    ],
    github: {
      repositories: [
        { id: "r1", name: "alpha", stars: 15, forks: 2, sizeKb: 100, primaryLanguage: "TypeScript" },
        { id: "r2", name: "beta", stars: 3, forks: 1, sizeKb: 40, primaryLanguage: "Python" },
      ],
    },
  } as unknown as HubDatasets;

  const metrics = computeAdminChartMetrics(sample);
  assert.equal(metrics.timeline.length, 2);
  assert.equal(metrics.timeline[1].month, "2026-11");
  assert.equal(metrics.timeline[1].total, 4);

  const pdfBucket = metrics.mediaMix.find((b) => b.type === "pdf");
  assert.equal(pdfBucket?.count, 1);
  assert.equal(pdfBucket?.sharePercent, 50);

  assert.equal(metrics.topRepos[0].name, "alpha");
  assert.equal(metrics.publishHealth.find((p) => p.label === "Articles")?.published, 1);
  assert.equal(metrics.publishHealth.find((p) => p.label === "Articles")?.draft, 1);
});

test("GitHub storage path sanitizer and repo validator reject traversal and build valid raw URLs", () => {
  assert.equal(validateGitHubRepoTarget({ owner: "AbdoKamelAyed", repo: "hub-assets", branch: "main" }).valid, true);
  assert.equal(validateGitHubRepoTarget({ owner: "bad/owner", repo: "hub", branch: "main" }).valid, false);
  assert.equal(validateGitHubRepoTarget({ owner: "Abdo", repo: "hub", branch: "feat/../bad" }).valid, false);

  assert.equal(sanitizeRepoStoragePath("/media/guides/", "diagram v1.png"), "media/guides/diagram v1.png");
  assert.equal(sanitizeRepoStoragePath("media/../secrets", "key.txt"), null);
  assert.equal(sanitizeRepoStoragePath("media\\bad", "a.png"), null);

  assert.equal(
    buildGitHubRawUrl("AbdoKamelAyed", "hub", "main", "media/hello world.png"),
    "https://raw.githubusercontent.com/AbdoKamelAyed/hub/main/media/hello%20world.png"
  );
});

test("networkStatus state machine transitions cleanly across offline, dismiss, online, and auto-clear", () => {
  const initialOnline = createInitialNetworkState(true);
  assert.deepEqual(initialOnline, { isOnline: true, notice: "none", dismissed: false });

  // Staying online when already online does not show a reconnected banner
  const stillOnline = reduceNetworkStatus(initialOnline, "online");
  assert.equal(stillOnline.notice, "none");

  // Going offline shows offline banner even if previously dismissed
  const wentOffline = reduceNetworkStatus(initialOnline, "offline");
  assert.deepEqual(wentOffline, { isOnline: false, notice: "offline", dismissed: false });

  const dismissedOffline = reduceNetworkStatus(wentOffline, "dismiss");
  assert.equal(dismissedOffline.dismissed, true);

  // Going offline again resets dismissed flag
  const offlineAgain = reduceNetworkStatus(dismissedOffline, "offline");
  assert.equal(offlineAgain.dismissed, false);

  // Coming back online from offline surfaces reconnected notice until auto-cleared
  const reconnected = reduceNetworkStatus(dismissedOffline, "online");
  assert.deepEqual(reconnected, { isOnline: true, notice: "reconnected", dismissed: false });

  // Duplicate browser "online" event does not prematurely clear reconnected banner
  const reconnectedTwice = reduceNetworkStatus(reconnected, "online");
  assert.deepEqual(reconnectedTwice, { isOnline: true, notice: "reconnected", dismissed: false });

  const cleared = reduceNetworkStatus(reconnectedTwice, "auto-clear");
  assert.deepEqual(cleared, { isOnline: true, notice: "none", dismissed: false });

  assert.equal(getNetworkNoticeCopy("offline", "en")?.title, "Connection lost");
  assert.equal(getNetworkNoticeCopy("reconnected", "ar")?.title, "تمت استعادة الاتصال");
  assert.equal(getNetworkNoticeCopy("none", "en"), null);
});

test("printMetadata builders format Journal and Knowledge cover page title, date, and reading time", () => {
  const sampleArticle = {
    id: "art-1",
    slug: "test-article",
    type: "articles",
    title: { en: "Print Architecture", ar: "معمارية الطباعة" },
    subtitle: { en: "Clean stylesheets", ar: "أنماط نظيفة" },
    content: { en: "word ".repeat(450), ar: "كلمة ".repeat(250) },
    publishedAt: "2026-11-26",
    categories: ["articles"],
    tags: ["css", "print"],
    readingTimeMinutes: 3,
    featured: true,
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26",
    status: "published",
    source: "manual",
  } as ArticleRecord;

  const journalCover = buildJournalPrintCoverMeta({
    article: sampleArticle,
    siteName: "ABDO Hub",
    authorName: "Abdo Kamel",
    authorHandle: "@AbdoKamelAyed",
    formattedDate: "Nov 26, 2026",
    summaryText: "A concise abstract.",
    lang: "en",
  });
  assert.equal(journalCover.title, "Print Architecture");
  assert.equal(journalCover.dateLabel, "Nov 26, 2026");
  assert.equal(journalCover.readingTimeMinutes, 3);
  assert.equal(journalCover.readingTimeLabel, "3 min read");
  assert.equal(journalCover.authorLabel, "Abdo Kamel (@AbdoKamelAyed)");

  const sampleKnowledge = {
    id: "know-1",
    title: { en: "Zero-Allocation Parsers", ar: "محللات بدون تخصيص" },
    summary: { en: "word ".repeat(220), ar: "ملخص ".repeat(220) },
    category: "systems",
    entryType: "verified-reference",
    tags: ["performance"],
    sourceAttribution: "Engineering Notes",
    createdAt: "2026-11-20",
    updatedAt: "2026-11-25",
    status: "published",
    source: "manual",
  } as KnowledgeEntry;

  const knowledgeCover = buildKnowledgePrintCoverMeta({
    entry: sampleKnowledge,
    siteName: "ABDO Hub",
    formattedDate: "Nov 25, 2026",
    lang: "en",
  });
  assert.equal(knowledgeCover.title, "Zero-Allocation Parsers");
  assert.equal(knowledgeCover.dateLabel, "Nov 25, 2026");
  assert.equal(knowledgeCover.readingTimeMinutes, 2);
  assert.equal(knowledgeCover.readingTimeLabel, "2 min read");

  const archiveCover = buildKnowledgeArchiveCoverMeta({
    entries: [sampleKnowledge],
    siteName: "ABDO Hub",
    formattedDate: "Nov 26, 2026",
    lang: "ar",
  });
  assert.equal(archiveCover.readingTimeMinutes, 2);
  assert.equal(formatReadingTimeLabel(2, "ar"), "2 دقيقة قراءة");
});

test("Google Drive multipart builder, query escaping, and MediaAssetRecord mapper work reliably", () => {
  assert.equal(formatDriveFilesQuery(), "trashed = false");
  assert.equal(formatDriveFilesQuery("abdo's file"), "trashed = false and name contains 'abdo\\'s file'");

  const bytes = new TextEncoder().encode("hello-drive");
  const { bodyBytes, contentTypeHeader } = buildDriveMultipartBody({
    fileName: "report.pdf",
    mimeType: "application/pdf",
    fileBytes: bytes,
    boundary: "test_boundary",
  });
  assert.equal(contentTypeHeader, "multipart/related; boundary=test_boundary");
  const textBody = new TextDecoder().decode(bodyBytes);
  assert.equal(textBody.includes('"name":"report.pdf"'), true);
  assert.equal(textBody.includes("hello-drive"), true);

  const asset = mapDriveFileToMediaAsset({
    driveFile: {
      id: "drv123456",
      name: "diagram.png",
      mimeType: "image/png",
      size: "4096",
      webViewLink: "https://drive.google.com/file/d/drv123456/view",
      modifiedTime: "2026-11-28T00:00:00Z",
    },
    captionOverride: "System chart",
  });
  assert.equal(asset.mediaType, "image");
  assert.equal(asset.source, "google-drive");
  assert.equal(asset.url, "https://drive.google.com/file/d/drv123456/view");
  assert.equal(asset.sizeBytes, 4096);
});

test("GitHub dataset path mapping, splitRepoPath, and UTF-8 base64 round-trip cleanly", () => {
  assert.equal(mapDatasetPathToRepoPath("./data/projects/projects.json"), "public/data/projects/projects.json");
  assert.equal(mapDatasetPathToRepoPath("public/data/settings/website.json"), "public/data/settings/website.json");
  assert.deepEqual(splitRepoPath("public/data/projects/projects.json"), {
    folder: "public/data/projects",
    fileName: "projects.json",
  });

  const sampleJson = JSON.stringify({ title: "منصة عبدو — ABDO Hub" });
  assert.equal(base64ToUtf8(utf8ToBase64(sampleJson)), sampleJson);
});

test("Central router parses public, nested, admin workspace, and not-found routes cleanly", () => {
  assert.deepEqual(parseAppRoute(""), { kind: "home", path: "#/" });
  assert.deepEqual(parseAppRoute("#/projects/abdo%20hub"), {
    kind: "project-detail",
    slugOrId: "abdo hub",
    path: "#/projects/abdo%20hub",
  });
  assert.deepEqual(parseAppRoute("#/journal/issues/issue-01"), {
    kind: "issue-detail",
    slugOrId: "issue-01",
    path: "#/journal/issues/issue-01",
  });
  assert.deepEqual(parseAppRoute("#/admin"), {
    kind: "admin",
    adminSection: "overview",
    path: "#/admin",
  });
  assert.deepEqual(parseAppRoute("#/admin/access"), {
    kind: "admin",
    adminSection: "access",
    path: "#/admin/access",
  });
  assert.equal(buildAdminRouteHref("github"), "#/admin/github");
  assert.equal(buildAdminRouteHref("overview"), "#/admin");

  const unknownTop = parseAppRoute("#/unknown-section");
  assert.equal(unknownTop.kind, "not-found");
  assert.equal(toLegacyRoute(unknownTop).section, "not-found");

  const unknownAdmin = parseAppRoute("#/admin/bogus");
  assert.equal(unknownAdmin.kind, "admin");
  if (unknownAdmin.kind === "admin") {
    assert.equal(unknownAdmin.adminSection, "overview");
    assert.equal(unknownAdmin.invalidSubSection, "bogus");
  }
});

test("Admin workspace permissions enforce Owner-only modules and custom per-administrator overrides", () => {
  const ownerMods = getDefaultModulesForRole("Owner");
  assert.equal(ownerMods.includes("access"), true);
  assert.equal(ownerMods.includes("settings"), true);

  const authorMods = getDefaultModulesForRole("Author");
  assert.deepEqual(authorMods, ["overview", "editor", "media", "knowledge"]);
  assert.equal(canAccessAdminModule({ role: "Author" }, "access"), false);
  assert.equal(canAccessAdminModule({ role: "Author" }, "settings"), false);
  assert.equal(canAccessAdminModule({ role: "Author" }, "editor"), true);

  // Custom override grants an Author access to Projects, while ownerOnly "access" stays blocked
  const customAuthor = {
    role: "Author" as const,
    allowedModules: ["editor" as const, "projects" as const, "access" as const],
  };
  const resolved = resolveEffectiveModules(customAuthor);
  assert.equal(resolved.includes("overview"), true);
  assert.equal(resolved.includes("projects"), true);
  assert.equal(resolved.includes("access"), false);
  assert.equal(canAccessAdminModule(customAuthor, "projects"), true);
  assert.equal(canAccessAdminModule(customAuthor, "access"), false);
});

test("registerAdminAccount disables public registration after Owner bootstrap unless authorizedByOwner is set", async () => {
  const mem = new Map<string, string>();
  const origLocal = (globalThis as Record<string, unknown>).localStorage;
  const origSession = (globalThis as Record<string, unknown>).sessionStorage;
  const makeStore = () => ({
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  });
  (globalThis as Record<string, unknown>).localStorage = makeStore();
  (globalThis as Record<string, unknown>).sessionStorage = makeStore();

  try {
    resetAdminCredential();
    // First-time setup always provisions an Owner even if another role is passed
    const ownerRes = await registerAdminAccount({
      username: "root.owner",
      passphrase: "OwnerPass#2026",
      role: "Author",
    });
    assert.equal(ownerRes.ok, true);
    assert.equal(ownerRes.account?.role, "Owner");

    // Subsequent unauthenticated registration without authorizedByOwner is blocked
    const publicAttempt = await registerAdminAccount({
      username: "stranger",
      passphrase: "StrangerPass#2026",
      role: "Owner",
    });
    assert.equal(publicAttempt.ok, false);
    assert.equal(Boolean(publicAttempt.error?.includes("Public administrator registration is disabled")), true);

    // Owner-authorized provisioning succeeds
    const ownerGranted = await registerAdminAccount({
      username: "jane.author",
      passphrase: "AuthorPass#2026",
      role: "Author",
      authorizedByOwner: true,
    });
    assert.equal(ownerGranted.ok, true);
    assert.equal(ownerGranted.account?.role, "Author");
  } finally {
    (globalThis as Record<string, unknown>).localStorage = origLocal;
    (globalThis as Record<string, unknown>).sessionStorage = origSession;
  }
});

test("computeRoleDashboardMetrics and computePositionSectionMetrics produce tailored metrics for every position", () => {
  const sample = {
    website: {
      id: "w",
      siteName: "ABDO Hub",
      shortTitle: "ABDO",
      domain: "https://abdokamelayed.github.io",
      defaultLanguage: "en",
      supportedLanguages: ["en", "ar"],
      defaultTheme: "light",
      defaultGlassMode: false,
      primaryAccent: "#0f172a",
      secondaryAccent: "#2563eb",
      seoDescription: { en: "Detailed engineering hub description for verification testing.", ar: "وصف كامل باللغة العربية لاختبار التحقق." },
      ogImage: "/img.jpg",
      createdAt: "",
      updatedAt: "2026-11-28",
      status: "active",
      source: "test",
      version: "1.0.0",
    },
    profileSettings: {
      id: "p",
      fullName: { en: "Abdo Kamel", ar: "عبدو كامل" },
      githubUsername: "AbdoKamelAyed",
      avatarUrl: "/avatar.jpg",
      headline: { en: "Engineer", ar: "مهندس" },
      shortBio: { en: "Bio", ar: "نبذة" },
      mission: { en: "", ar: "" },
      careerDirection: { en: "", ar: "" },
      technicalInterests: [],
      selectedAchievements: [],
      contact: { email: "a@example.com", github: "", linkedin: "", website: "", otherLinks: [] },
      createdAt: "",
      updatedAt: "2026-11-28",
      status: "active",
      source: "test",
    },
    allArticlesRaw: [
      {
        id: "a1",
        slug: "a1",
        type: "articles",
        title: { en: "Systems Guide", ar: "دليل الأنظمة" },
        subtitle: { en: "", ar: "" },
        content: { en: "word ".repeat(300), ar: "كلمة ".repeat(200) },
        publishedAt: "2026-11-20",
        categories: ["articles"],
        tags: ["architecture", "systems"],
        readingTimeMinutes: 2,
        featured: true,
        createdAt: "2026-11-20",
        updatedAt: "2026-11-20",
        status: "published",
        source: "manual",
      },
    ],
    articles: [],
    projects: [
      {
        id: "p1",
        slug: "p1",
        name: { en: "Hub", ar: "منصة" },
        shortDescription: { en: "App", ar: "تطبيق" },
        fullDescription: { en: "", ar: "" },
        category: "web-applications",
        status: "Active",
        featured: true,
        sortOrder: 1,
        techStack: ["TypeScript", "React"],
        createdAt: "2026-11-01",
        updatedAt: "2026-11-10",
        source: "manual",
      },
    ],
    allIssuesRaw: [
      {
        id: "i1",
        slug: "iss-1",
        issueNumber: "ED. 01",
        title: { en: "Nov Issue", ar: "عدد نوفمبر" },
        subtitle: { en: "", ar: "" },
        cadence: "monthly",
        selectionMode: "manual",
        periodKey: "2026-11",
        articleIds: ["a1"],
        topics: ["architecture"],
        editorialNote: { en: "Note", ar: "ملاحظة" },
        publishedAt: "2026-11-25",
        createdAt: "2026-11-25",
        updatedAt: "2026-11-25",
        status: "published",
        source: "manual",
      },
    ],
    issues: [],
    allKnowledgeRaw: [
      {
        id: "k1",
        title: { en: "Zero Trust", ar: "انعدام الثقة" },
        summary: { en: "Security note", ar: "ملاحظة أمان" },
        category: "security",
        entryType: "personal-note",
        tags: ["security"],
        sourceAttribution: "Self",
        createdAt: "2026-11-22",
        updatedAt: "2026-11-22",
        status: "published",
        source: "manual",
      },
    ],
    experience: { items: [{ id: "e1", kind: "Professional" }] },
    mediaAssets: [
      { id: "m1", mediaType: "pdf", sizeBytes: 2048, url: "https://drive.google.com/file/d/1/view", source: "google-drive" },
      { id: "m2", mediaType: "image", sizeBytes: 1024, url: "https://raw.githubusercontent.com/a/b/main/x.png", source: "github-repo" },
    ],
    github: {
      repositories: [{ id: "r1", name: "hub", stars: 10, forks: 2, sizeKb: 120, primaryLanguage: "TypeScript" }],
      languages: { languages: [{ id: "l1", language: "TypeScript", percentage: 85 }] },
      contributions: { calendar: { weeks: [{ contributionDays: [{ date: "2026-11-01", contributionCount: 4 }] }] } },
      commits: [],
    },
  } as unknown as HubDatasets;

  const accounts = [
    { id: "u1", username: "owner", displayName: "Owner", role: "Owner" as const, salt: "s", hash: "h", iterations: 1, algorithm: "PBKDF2-SHA-256" as const, createdAt: "", updatedAt: "" },
    { id: "u2", username: "author", displayName: "Author", role: "Author" as const, salt: "s", hash: "h", iterations: 1, algorithm: "PBKDF2-SHA-256" as const, createdAt: "", updatedAt: "" },
  ];

  const roleMetrics = computeRoleDashboardMetrics(sample, "Author", "en", accounts, []);
  assert.equal(roleMetrics.articleDepths[0].words, 300);
  assert.equal(roleMetrics.topTopics[0].topic, "architecture");
  assert.equal(roleMetrics.roleDistribution.find((r) => r.role === "Owner")?.count, 1);

  const bundle = computePositionSectionMetrics(sample, "en", accounts, []);
  assert.equal(bundle.editor.bilingualCount, 1);
  assert.equal(bundle.media.storageMix.find((s) => s.id === "drive")?.count, 1);
  assert.equal(bundle.media.storageMix.find((s) => s.id === "github")?.count, 1);
  assert.equal(bundle.issues.editionBars[0].articleCount, 1);
  assert.equal(bundle.projects.statusCounts[0].status, "Active");
  assert.equal(bundle.knowledge.personalCount, 1);
  assert.equal(bundle.github.monthlyActivity[0].count, 4);
  assert.equal(bundle.settings.seoCounts.total > 0, true);
  assert.equal(bundle.access.operatorCoverage.length, 2);
});

test("buildGitHubHeatmapModel merges GraphQL calendar days with sampled commits, computes D3 quantile thresholds, and aggregates weekday rhythm", () => {
  const thresholds = computeIntensityThresholds([1, 2, 4, 8, 20, 47]);
  assert.equal(quantizeActivityLevel(0, thresholds), 0);
  assert.equal(quantizeActivityLevel(1, thresholds), 1);
  assert.equal(quantizeActivityLevel(47, thresholds), 4);

  const contributions: GitHubContributions = {
    id: "c",
    note: "",
    available: true,
    unavailableReason: null,
    totals: {
      totalContributions: 55,
      totalCommitContributions: 55,
      totalIssueContributions: 0,
      totalPullRequestContributions: 0,
      totalPullRequestReviewContributions: 0,
    },
    streaks: { currentStreak: 2, longestStreak: 4, mostActiveDay: null, weeklyTotals: [] },
    calendar: {
      totalContributions: 55,
      weeks: [
        {
          contributionDays: [
            { date: "2026-11-15", weekday: 0, contributionCount: 0 },
            { date: "2026-11-16", weekday: 1, contributionCount: 8 },
            { date: "2026-11-17", weekday: 2, contributionCount: 47 },
          ],
        },
      ],
    },
    createdAt: "",
    updatedAt: "",
    status: "synced",
    source: "graphql",
  };

  const commits: GitHubCommit[] = [
    {
      id: "c1",
      sha: "abcdef123456",
      shortSha: "abcdef1",
      repo: "abdo",
      repoUrl: "https://github.com/AbdoKamelAyed/abdo",
      message: "feat: build heatmap",
      authorName: "Abdo",
      authorLogin: "AbdoKamelAyed",
      url: "https://github.com/AbdoKamelAyed/abdo/commit/abcdef123456",
      createdAt: "2026-11-17T08:24:49Z",
      updatedAt: "2026-11-17T08:24:49Z",
      status: "recorded",
      source: "github-rest-repos",
    },
  ];

  const activity: GitHubActivity[] = [
    {
      id: "ev1",
      type: "PushEvent",
      repo: "AbdoKamelAyed/abdo",
      summary: "Pushed updates",
      url: "https://github.com/AbdoKamelAyed/abdo",
      createdAt: "2026-11-17T08:24:51Z",
      updatedAt: "2026-11-17T08:24:51Z",
      status: "public",
      source: "github-rest-events",
    },
  ];

  const combined = buildGitHubHeatmapModel({
    contributions,
    commits,
    activity,
    mode: "combined",
    lang: "en",
  });
  assert.equal(combined.sourceKind, "graphql-calendar");
  assert.equal(combined.totalCount, 55);
  assert.equal(combined.activeDaysCount, 2);
  assert.equal(combined.peakDay?.date, "2026-11-17");
  assert.equal(combined.peakDay?.commits.length, 1);
  assert.equal(combined.peakDay?.pushCount, 1);
  assert.equal(combined.mostActiveWeekday?.weekday, 2);

  // Commits-only mode isolates sampled commits & pushes
  const commitsMode = buildGitHubHeatmapModel({
    contributions,
    commits,
    activity,
    mode: "commits",
    lang: "en",
  });
  assert.equal(commitsMode.totalCount, 1);
  assert.equal(commitsMode.activeDaysCount, 1);

  // Fallback mode generates a clean multi-week calendar grid when GraphQL calendar is unavailable
  const fallback = buildGitHubHeatmapModel({
    contributions: { ...contributions, available: false, calendar: null },
    commits,
    activity,
    mode: "combined",
    lang: "ar",
    fallbackWeeks: 10,
  });
  assert.equal(fallback.sourceKind, "commits-fallback");
  assert.equal(fallback.weeks.length, 10);
  assert.equal(fallback.totalDaysCount, 70);
  assert.equal(fallback.peakDay?.date, "2026-11-17");
});

test("visitInsights separates admin traffic, dedupes bursts, computes public vs admin analytics, and exports CSV", () => {
  let store = createEmptyVisitStore();

  // Admin & not-found routes must never enter visitor telemetry
  store = recordVisitEvent(store, {
    path: "#/admin/visits",
    section: "admin",
    title: "Admin Workspace",
    timestamp: "2026-11-28T10:00:00Z",
    sessionId: "s-admin",
  });
  store = recordVisitEvent(store, {
    path: "#/missing",
    section: "not-found",
    title: "404",
    timestamp: "2026-11-28T10:00:05Z",
    sessionId: "s-404",
  });
  assert.equal(store.totalVisits, 0);

  // Public Home visit
  store = recordVisitEvent(store, {
    path: "#/",
    section: "home",
    title: "Home",
    timestamp: "2026-11-28T10:01:00Z",
    device: "desktop",
    lang: "en",
    referrerHost: "github.com",
    sessionId: "s1",
  });
  // Immediate duplicate mount within 2s is ignored
  store = recordVisitEvent(store, {
    path: "#/",
    section: "home",
    title: "Home",
    timestamp: "2026-11-28T10:01:01Z",
    device: "desktop",
    lang: "en",
    referrerHost: "github.com",
    sessionId: "s1",
  });
  assert.equal(store.totalVisits, 1);

  // Article & Project visits
  store = recordVisitEvent(store, {
    path: "#/journal/edge-architecture",
    section: "article-detail",
    targetId: "edge-architecture",
    title: "Edge Architecture",
    timestamp: "2026-11-28T10:05:00Z",
    device: "mobile",
    lang: "ar",
    referrerHost: "linkedin.com",
    sessionId: "s2",
  });
  store = recordVisitEvent(store, {
    path: "#/projects/hub-core",
    section: "project-detail",
    targetId: "hub-core",
    title: "Hub Core",
    timestamp: "2026-11-28T10:06:00Z",
    device: "mobile",
    lang: "en",
    referrerHost: "direct",
    sessionId: "s2",
  });

  assert.equal(store.totalVisits, 3);
  assert.equal(getArticleViewCount(store, "edge-architecture"), 1);

  const sampleArticles = [
    { id: "a1", slug: "edge-architecture", title: { en: "Edge Architecture", ar: "معمارية الطرفية" } },
  ] as unknown as ArticleRecord[];
  const sampleProjects = [
    { id: "p1", slug: "hub-core", name: { en: "Hub Core", ar: "نواة المنصة" } },
  ] as unknown as ProjectRecord[];

  const pub = getPublicVisitInsights(store, sampleArticles, "en", "2026-11-28");
  assert.equal(pub.totalVisits, 3);
  assert.equal(pub.uniqueVisitors, 2);
  assert.equal(pub.todayVisits, 3);
  assert.equal(pub.topArticle?.title, "Edge Architecture");
  assert.equal(pub.topArticle?.views, 1);

  const admin = getAdminVisitAnalytics(store, sampleArticles, sampleProjects, "en", 7, "2026-11-28");
  assert.equal(admin.totalVisits, 3);
  assert.equal(admin.uniqueSessions, 2);
  assert.equal(admin.dailyTrend.length, 7);
  assert.equal(admin.dailyTrend[6].count, 3);
  assert.equal(admin.topArticles[0].views, 1);
  assert.equal(admin.topProjects[0].title, "Hub Core");
  assert.equal(admin.deviceSplit.find((d) => d.device === "mobile")?.count, 2);
  assert.equal(admin.languageSplit.find((l) => l.lang === "ar")?.count, 1);

  const csv = exportVisitsCsv(store);
  assert.equal(csv.includes("edge-architecture"), true);
  assert.equal(csv.includes("timestamp,section,path"), true);
});

test("socialShare resolves canonical URLs, absolute OG preview images, and multi-platform share intents", () => {
  assert.equal(resolveAbsoluteShareUrl("https://abdokamelayed.github.io/", "#/"), "https://abdokamelayed.github.io/");
  assert.equal(
    resolveAbsoluteShareUrl("https://abdokamelayed.github.io", "#/journal/systems-design"),
    "https://abdokamelayed.github.io/#/journal/systems-design"
  );

  const fallbackImg = resolveLinkPreviewImage("", "", "https://abdokamelayed.github.io/");
  assert.equal(fallbackImg.absoluteUrl, "https://abdokamelayed.github.io/og-cover.jpg");
  assert.equal(fallbackImg.displaySrc, "/og-cover.jpg");

  const relImg = resolveLinkPreviewImage("./assets/cover.png", null, "https://abdokamelayed.github.io");
  assert.equal(relImg.absoluteUrl, "https://abdokamelayed.github.io/assets/cover.png");
  assert.equal(relImg.displaySrc, "/assets/cover.png");

  const remoteImg = resolveLinkPreviewImage("https://cdn.example.com/pic.jpg", "/og-cover.jpg", "https://abdokamelayed.github.io");
  assert.equal(remoteImg.absoluteUrl, "https://cdn.example.com/pic.jpg");

  const links = buildSocialShareLinks({
    url: "https://abdokamelayed.github.io/#/journal/test",
    title: "Architecture Digest",
    summary: "Deep dive on static hubs.",
    tags: ["architecture", "static-web"],
  });
  assert.equal(links.length, 6);
  assert.equal(links.some((l) => l.id === "x" && l.href.includes("twitter.com/intent/tweet")), true);
  assert.equal(links.some((l) => l.id === "linkedin" && l.href.includes("linkedin.com/sharing")), true);
  assert.equal(links.some((l) => l.id === "whatsapp" && l.href.includes("wa.me")), true);
  assert.equal(links.some((l) => l.id === "telegram" && l.href.includes("t.me/share/url")), true);
  assert.equal(links.some((l) => l.id === "facebook" && l.href.includes("facebook.com/sharer")), true);
  assert.equal(links.some((l) => l.id === "email" && l.href.startsWith("mailto:?subject=")), true);
});

test("buildWorkingNowItems prioritizes custom focus items, active projects, current roles, and active repos without duplicates", () => {
  const sample = {
    website: {
      updatedAt: "2026-11-28",
      nowItems: [
        {
          id: "now-custom-1",
          title: { en: "Hub v2", ar: "المنصة 2" },
          summary: { en: "Shipping now hub.", ar: "إطلاق التحديث." },
          status: { en: "Active", ar: "نشط" },
          focusArea: { en: "Platform", ar: "المنصة" },
          tags: ["React", "TypeScript"],
        },
      ],
    },
    projects: [
      {
        id: "p1",
        slug: "hub-v2",
        name: { en: "Hub v2", ar: "المنصة 2" },
        shortDescription: { en: "Duplicate title project", ar: "مكرر" },
        category: "web",
        status: "Active",
        sortOrder: 1,
        techStack: ["React"],
        updatedAt: "2026-11-25",
      },
      {
        id: "p2",
        slug: "edge-cli",
        name: { en: "Edge CLI", ar: "أداة الطرفية" },
        shortDescription: { en: "Fast builder CLI", ar: "أداة بناء سريعة" },
        category: "cli",
        status: "In Development",
        sortOrder: 2,
        techStack: ["Node", "TypeScript"],
        githubRepoSlug: "edge-cli",
        updatedAt: "2026-11-26",
      },
    ],
    experience: {
      items: [
        {
          id: "e1",
          role: { en: "Systems Engineer", ar: "مهندس أنظمة" },
          organization: { en: "Independent", ar: "مستقل" },
          kind: "Engineering",
          period: "2025 – Present",
          status: "active",
          summary: { en: "Building local-first tools.", ar: "بناء أدوات محلية." },
          skills: ["TS", "D3"],
          updatedAt: "2026-11-20",
        },
      ],
    },
    github: {
      repositories: [
        {
          id: "r1",
          name: "edge-cli",
          fullName: "AbdoKamelAyed/edge-cli",
          description: "Already linked to p2",
          primaryLanguage: "TypeScript",
          isArchived: false,
          isFork: false,
          pushedAt: "2026-11-27T00:00:00Z",
          updatedAt: "2026-11-27T00:00:00Z",
          topics: ["cli"],
        },
        {
          id: "r2",
          name: "astro-notes",
          fullName: "AbdoKamelAyed/astro-notes",
          description: "Static knowledge notes",
          primaryLanguage: "Markdown",
          isArchived: false,
          isFork: false,
          pushedAt: "2026-11-26T00:00:00Z",
          updatedAt: "2026-11-26T00:00:00Z",
          topics: ["docs"],
        },
      ],
    },
  } as unknown as HubDatasets;

  const items = buildWorkingNowItems(sample, "en");
  assert.equal(items[0].kind, "focus");
  assert.equal(items[0].title, "Hub v2");
  assert.equal(items.some((i) => i.title === "Edge CLI" && i.kind === "project"), true);
  assert.equal(items.some((i) => i.kind === "role" && i.title.includes("Systems Engineer")), true);
  assert.equal(items.some((i) => i.title === "edge-cli" && i.kind === "repository"), false);
  assert.equal(items.some((i) => i.title === "astro-notes" && i.kind === "repository"), true);
  assert.equal(buildWorkingNowItems(sample, "en", 2).length, 2);

  assert.deepEqual(parseAppRoute("#/now"), { kind: "now", path: "#/now" });
  assert.equal(toLegacyRoute({ kind: "now", path: "#/now" }).section, "now");
});

test("applyArticleFontScale scopes typography CSS variable without mutating root html fontSize", () => {
  const props = new Map<string, string>();
  const attrs = new Map<string, string>();
  const origDoc = (globalThis as Record<string, unknown>).document;
  let rootFontSizeRemoved = false;

  (globalThis as Record<string, unknown>).document = {
    documentElement: {
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      style: {
        fontSize: "20px",
        removeProperty: (k: string) => {
          if (k === "font-size") rootFontSizeRemoved = true;
        },
        setProperty: (k: string, v: string) => props.set(k, v),
      },
    },
  };

  try {
    const def = applyArticleFontScale("large");
    assert.equal(def.rootFontSizePx, 18);
    assert.equal(rootFontSizeRemoved, true);
    assert.equal(props.get("--hub-article-font-size"), "18px");
    assert.equal(attrs.get("data-article-font-scale"), "large");
  } finally {
    (globalThis as Record<string, unknown>).document = origDoc;
  }
});

test("seoEngine generates sitemap with #/now and injects absolute og:image & twitter:image metadata", () => {
  const metas = new Map<string, string>();
  const links = new Map<string, string>();
  let scriptElRef: Record<string, unknown> | null = null;
  const origDoc = (globalThis as Record<string, unknown>).document;

  const makeEl = (tag: string) => {
    const el: Record<string, unknown> = {
      tagName: tag,
      attributes: {} as Record<string, string>,
      textContent: "",
      setAttribute(k: string, v: string) {
        (this.attributes as Record<string, string>)[k] = v;
        if (tag === "meta") {
          const key = (this.attributes as Record<string, string>).name || (this.attributes as Record<string, string>).property;
          if (key && k === "content") metas.set(key, v);
        }
        if (tag === "link" && (this.attributes as Record<string, string>).rel && k === "href") {
          links.set((this.attributes as Record<string, string>).rel, v);
        }
      },
      remove() {},
    };
    return el;
  };

  const head = {
    appendChild(node: Record<string, unknown>) {
      if (node.tagName === "script") {
        scriptElRef = node;
      }
      if (node.tagName === "meta") {
        const a = node.attributes as Record<string, string>;
        const key = a.name || a.property;
        if (key && a.content !== undefined) metas.set(key, a.content);
      }
      if (node.tagName === "link") {
        const a = node.attributes as Record<string, string>;
        if (a.rel && a.href !== undefined) links.set(a.rel, a.href);
      }
    },
  };

  const canonicalMock = makeEl("link");
  canonicalMock.setAttribute("rel", "canonical");

  (globalThis as Record<string, unknown>).document = {
    title: "",
    head,
    querySelector: (selector: string) =>
      selector === 'link[rel="canonical"]' ? canonicalMock : null,
    getElementById: () => null,
    createElement: (tag: string) => makeEl(tag),
  };

  try {
    const sample = {
      website: {
        siteName: "ABDO Hub",
        shortTitle: "ABDO",
        domain: "https://abdokamelayed.github.io",
        ogImage: "/og-cover.jpg",
        seoDescription: { en: "Personal digital hub", ar: "المنصة الشخصية" },
        updatedAt: "2026-11-28",
      },
      profileSettings: {
        fullName: { en: "Abdo Kamel", ar: "عبدو كامل" },
        githubUsername: "AbdoKamelAyed",
        avatarUrl: "/avatar.jpg",
        shortBio: { en: "Engineer", ar: "مهندس" },
        contact: { github: "", linkedin: "" },
      },
      articles: [],
      projects: [],
      issues: [],
      knowledge: [],
    } as unknown as HubDatasets;

    const xml = generateSitemapXml(sample);
    assert.equal(xml.includes("https://abdokamelayed.github.io/#/now"), true);

    applyPageSeoMetadata(sample, { section: "now", param: null, subParam: null }, "en");
    assert.equal(metas.get("og:image"), "https://abdokamelayed.github.io/og-cover.jpg");
    assert.equal(metas.get("twitter:image"), "https://abdokamelayed.github.io/og-cover.jpg");
    assert.equal(metas.get("og:url"), "https://abdokamelayed.github.io/#/now");
    assert.equal(links.get("canonical"), "https://abdokamelayed.github.io/#/now");
    const finalLd = String(scriptElRef ? (scriptElRef as { textContent?: string }).textContent || "" : "");
    assert.equal(finalLd.includes("https://abdokamelayed.github.io/og-cover.jpg"), true);
  } finally {
    (globalThis as Record<string, unknown>).document = origDoc;
  }
});

test("uploadFileToGitHubRepo retries once on 409 Conflict with fresh SHA and surfaces clear 403 error", async () => {
  const target = resolveGitHubSyncTargetFromSettings({
    storageOwner: "",
    username: "AbdoKamelAyed",
    storageRepo: "",
    storageBranch: "",
  });
  assert.deepEqual(target, {
    owner: "AbdoKamelAyed",
    repo: "AbdoKamelAyed.github.io",
    branch: "main",
  });

  let getCount = 0;
  let putCount = 0;
  const putShas: (string | undefined)[] = [];

  const mockFetch = (async (_url: string, init?: RequestInit) => {
    const method = (init?.method || "GET").toUpperCase();
    if (method === "GET") {
      getCount += 1;
      const sha = getCount === 1 ? "stale-sha-1" : "fresh-sha-2";
      return new Response(JSON.stringify({ sha }), { status: 200 });
    }
    putCount += 1;
    const body = JSON.parse(String(init?.body || "{}")) as { sha?: string };
    putShas.push(body.sha);
    if (putCount === 1) {
      return new Response(JSON.stringify({ message: "does not match" }), { status: 409 });
    }
    return new Response(
      JSON.stringify({
        content: {
          path: "public/data/journal/articles.json",
          sha: "committed-sha-3",
          html_url: "https://github.com/AbdoKamelAyed/abdokamelayed.github.io/blob/main/public/data/journal/articles.json",
          download_url: "https://raw.githubusercontent.com/AbdoKamelAyed/abdokamelayed.github.io/main/public/data/journal/articles.json",
        },
      }),
      { status: 200 }
    );
  }) as unknown as typeof fetch;

  const res = await uploadFileToGitHubRepo({
    token: "ghp_test",
    owner: "AbdoKamelAyed",
    repo: "abdokamelayed.github.io",
    branch: "main",
    folder: "public/data/journal",
    fileName: "articles.json",
    contentBase64: utf8ToBase64('{"items":[]}'),
    allowOverwrite: true,
    fetchImpl: mockFetch,
  });

  assert.equal(getCount, 2);
  assert.equal(putCount, 2);
  assert.deepEqual(putShas, ["stale-sha-1", "fresh-sha-2"]);
  assert.equal(res.sha, "committed-sha-3");

  const forbiddenFetch = (async (_url: string, init?: RequestInit) => {
    const method = (init?.method || "GET").toUpperCase();
    if (method === "GET") return new Response("", { status: 404 });
    return new Response(JSON.stringify({ message: "Resource not accessible by personal access token" }), { status: 403 });
  }) as unknown as typeof fetch;

  await assert.rejects(
    () =>
      uploadFileToGitHubRepo({
        token: "ghp_bad",
        owner: "AbdoKamelAyed",
        repo: "abdokamelayed.github.io",
        branch: "main",
        folder: "public/data/journal",
        fileName: "articles.json",
        contentBase64: utf8ToBase64('{"items":[]}'),
        allowOverwrite: true,
        fetchImpl: forbiddenFetch,
      }),
    /Contents: Read & write/
  );
});





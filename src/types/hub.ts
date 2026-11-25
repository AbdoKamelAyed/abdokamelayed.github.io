export type Lang = "en" | "ar";

export type LocalizedText = string | { en: string; ar: string };

export type ProjectStatus =
  | "Planning"
  | "Research"
  | "In Development"
  | "Experimental"
  | "Beta"
  | "Active"
  | "Completed"
  | "Archived";

export interface CategoryRecord {
  id: string;
  slug: string;
  name: LocalizedText;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface ProjectRecord {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  fullDescription: LocalizedText;
  category: string;
  projectStatus?: ProjectStatus;
  status: ProjectStatus | string;
  featured: boolean;
  sortOrder: number;
  techStack: string[];
  githubRepoSlug?: string;
  githubRepoUrl?: string;
  liveDemoUrl?: string;
  screenshots?: string[];
  features?: string[];
  objectives?: string[];
  problemStatement?: string;
  developmentHistory?: string[];
  architectureOverview?: string;
  releases?: string[];
  roadmap?: string[];
  documentation?: string;
  createdAt: string;
  updatedAt: string;
  source: string;
}

export interface GitHubProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitterUsername?: string | null;
  publicRepos: number | null;
  publicGists: number | null;
  followers: number | null;
  following: number | null;
  profileUrl: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  openIssues: number;
  sizeKb: number;
  defaultBranch: string;
  license: string | null;
  topics: string[];
  url: string;
  homepage: string | null;
  isArchived: boolean;
  isFork: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  status: string;
  source: string;
}

export interface ContributionDay {
  contributionCount: number;
  date: string;
  weekday: number;
  color?: string;
}

export interface GitHubContributions {
  id: string;
  note: string;
  available: boolean;
  unavailableReason: string | null;
  totals: {
    totalContributions: number | null;
    totalCommitContributions: number | null;
    totalIssueContributions: number | null;
    totalPullRequestContributions: number | null;
    totalPullRequestReviewContributions: number | null;
  } | null;
  streaks: {
    currentStreak: number | null;
    longestStreak: number | null;
    mostActiveDay: ContributionDay | null;
    weeklyTotals: { weekStart: string | null; count: number }[];
  };
  calendar: {
    totalContributions: number;
    weeks: { contributionDays: ContributionDay[] }[];
  } | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface GitHubActivity {
  id: string;
  type: string;
  repo: string;
  summary: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface GitHubCommit {
  id: string;
  sha: string;
  shortSha: string;
  repo: string;
  repoUrl: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface GitHubLanguageEntry {
  id: string;
  language: string;
  bytes: number;
  percentage: number;
  repoCount: number;
}

export interface GitHubRelease {
  id: string;
  repo: string;
  tagName: string;
  name: string;
  prerelease: boolean;
  url: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface GitHubStatistics {
  id: string;
  totalPublicRepositories: number | null;
  syncedRepositoryCount: number | null;
  totalStarsReceived: number | null;
  totalForks: number | null;
  totalAvailableCommitsSampled: number | null;
  activeRepositoryCount: number | null;
  archivedRepositoryCount: number | null;
  creationByYear: Record<string, number>;
}

export interface GitHubSyncMeta {
  id: string;
  username: string;
  syncStatus: string;
  lastSuccessfulSync: string | null;
  errorCount: number;
  errors: string[];
}

export interface ExperienceItem {
  id: string;
  role: LocalizedText;
  organization: LocalizedText;
  kind: string;
  period: string;
  location: LocalizedText;
  summary: LocalizedText;
  skills: string[];
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface ExperienceDataset {
  id: string;
  items: ExperienceItem[];
  skills: { group: LocalizedText; items: string[] }[];
  knowledgeAreas: string[];
  researchInterests: string[];
  caseStudies: { id: string; title: LocalizedText; summary: LocalizedText }[];
  professionalDevelopment: { id: string; title: LocalizedText; year: string }[];
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface ArticleRecord {
  id: string;
  slug: string;
  type: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  abstract?: LocalizedText;
  content: LocalizedText;
  coverImage?: string;
  author?: string;
  authorHandle?: string;
  authorAvatar?: string;
  authorBio?: LocalizedText;
  publishedAt: string;
  categories: string[];
  tags: string[];
  readingTimeMinutes: number;
  featured: boolean;
  seo?: { description?: string; keywords?: string[] };
  createdAt: string;
  updatedAt: string;
  status: "published" | "draft";
  source: string;
}

export type MediaAssetType = "pdf" | "image" | "video" | "code" | "audio";

export interface MediaAssetRecord {
  id: string;
  title: LocalizedText;
  mediaType: MediaAssetType;
  mimeType: string;
  url: string;
  storageMode: "url" | "indexeddb" | "inline-code";
  codeContent?: string;
  codeLanguage?: string;
  fileName?: string;
  sizeBytes?: number;
  caption?: LocalizedText;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status: "published" | "draft";
  source: string;
}

export type JournalIssueCadence = "weekly" | "monthly" | "annual" | "curated";
export type JournalIssueSelectionMode = "manual" | "topic" | "period";

export interface JournalIssueRecord {
  id: string;
  slug: string;
  issueNumber: string;
  cadence: JournalIssueCadence;
  selectionMode: JournalIssueSelectionMode;
  periodKey: string;
  topics: string[];
  title: LocalizedText;
  subtitle: LocalizedText;
  editorialNote?: LocalizedText;
  coverImage?: string;
  articleIds: string[];
  publishedAt: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  status: "published" | "draft";
  source: string;
}

export interface KnowledgeEntry {
  id: string;
  title: LocalizedText;
  category: string;
  entryType: "personal-note" | "verified-reference";
  sourceAttribution: string;
  sourceUrl?: string;
  summary: LocalizedText;
  tags: string[];
  relatedIds: string[];
  createdAt: string;
  updatedAt: string;
  status: "published" | "draft";
  source: string;
}

export interface ProfileSettings {
  id: string;
  fullName: LocalizedText;
  githubUsername: string;
  avatarUrl?: string;
  roleTitle?: LocalizedText;
  location?: LocalizedText;
  headline: LocalizedText;
  shortBio: LocalizedText;
  mission: LocalizedText;
  careerDirection: LocalizedText;
  technicalInterests: string[];
  selectedAchievements: LocalizedText[];
  contact: {
    email: string;
    github: string;
    linkedin: string;
    website: string;
    otherLinks: { label: string; url: string }[];
  };
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface WebsiteSettings {
  id: string;
  siteName: string;
  shortTitle: string;
  domain: string;
  defaultAuthor?: string;
  ogImage?: string;
  twitterHandle?: string;
  seoKeywords?: string[];
  defaultLanguage: Lang;
  supportedLanguages: Lang[];
  defaultTheme: "light" | "dark";
  defaultGlassMode: boolean;
  primaryAccent: string;
  secondaryAccent: string;
  seoDescription: LocalizedText;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
  version: string;
}

export interface GitHubSyncSettings {
  id: string;
  username: string;
  schedule: string;
  excludedRepos: string[];
  featuredRepos: string[];
  includeForksInLanguageStats: boolean;
  createdAt: string;
  updatedAt: string;
  status: string;
  source: string;
}

export interface HubDatasets {
  website: WebsiteSettings;
  profileSettings: ProfileSettings;
  githubSyncSettings: GitHubSyncSettings;
  github: {
    profile: GitHubProfile;
    repositories: GitHubRepo[];
    contributions: GitHubContributions;
    activity: GitHubActivity[];
    commits: GitHubCommit[];
    languages: { disclaimer: string; totalBytes: number; languages: GitHubLanguageEntry[] };
    statistics: GitHubStatistics;
    releases: GitHubRelease[];
    syncMeta: GitHubSyncMeta;
  };
  projects: ProjectRecord[];
  projectCategories: CategoryRecord[];
  experience: ExperienceDataset;
  articles: ArticleRecord[];
  allArticlesRaw: ArticleRecord[];
  journalCategories: CategoryRecord[];
  issues: JournalIssueRecord[];
  allIssuesRaw: JournalIssueRecord[];
  mediaAssets: MediaAssetRecord[];
  knowledge: KnowledgeEntry[];
  allKnowledgeRaw: KnowledgeEntry[];
  knowledgeCategories: CategoryRecord[];
}

import React, { useState } from "react";
import { ArrowLeft, GitCommitHorizontal, Globe, Moon, ShieldAlert, Sun } from "lucide-react";
import type {
  ExperienceItem,
  HubDatasets,
  KnowledgeEntry,
  Lang,
  ProjectRecord,
  ProjectStatus,
} from "../types/hub";
import {
  hasLocalDraft,
  refreshPublicGithubLive,
  removeLocalDraft,
  saveLocalDraft,
  updateDatasetCache,
} from "../services/dataService";
import { syncLocalDraftsToGitHubRepo } from "../services/githubStorageService";
import { googleDriveSignOut } from "../services/googleDriveService";
import {
  appendAuditEntry,
  clearAdminSession,
  getActiveAdminSession,
  getAuditLog,
  touchAdminSession,
  type AdminAuditEntry,
  type AdminSessionRecord,
} from "../utils/adminAuth";
import {
  canAccessAdminModule,
  getAdminModuleLabel,
  type AdminWorkspaceSection,
} from "../utils/adminPermissions";
import { slugify, validateCollectionSchema } from "../utils/analytics";
import { formatDateTime, L, loc } from "../utils/i18n";
import type { VisitInsightsStore } from "../utils/visitInsights";
import { AdminAccessPanel } from "../components/admin/AdminAccessPanel";
import { AdminLoginGate } from "../components/admin/AdminLoginGate";
import { AdminOverview } from "../components/admin/AdminOverview";
import { AdminSectionCharts } from "../components/admin/AdminSectionCharts";
import { AdminVisitInsightsPanel } from "../components/admin/AdminVisitInsightsPanel";
import { AdminWorkspaceShell } from "../components/admin/AdminWorkspaceShell";
import { ArticleRichEditor } from "../components/admin/ArticleRichEditor";
import { GitHubRepoStoragePanel } from "../components/admin/GitHubRepoStoragePanel";
import { IssueBuilderPanel } from "../components/admin/IssueBuilderPanel";
import { MediaLibraryPanel } from "../components/admin/MediaLibraryPanel";
import { SiteSettingsPanel } from "../components/admin/SiteSettingsPanel";
import { NetworkStatusToast } from "../components/NetworkStatusToast";

const PROJECT_STATUSES: ProjectStatus[] = [
  "Planning",
  "Research",
  "In Development",
  "Experimental",
  "Beta",
  "Active",
  "Completed",
  "Archived",
];

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const AdminPage: React.FC<{
  data: HubDatasets;
  lang: Lang;
  theme: "light" | "dark";
  activeSection?: AdminWorkspaceSection;
  invalidSubSection?: string;
  visitStore: VisitInsightsStore;
  onResetVisits: () => void;
  onNavigateSection?: (section: AdminWorkspaceSection) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onReloadFromSource: () => Promise<void>;
  onApplyWebsiteTheme: (website: HubDatasets["website"]) => void;
}> = ({
  data,
  lang,
  theme,
  activeSection = "overview",
  invalidSubSection,
  visitStore,
  onResetVisits,
  onNavigateSection,
  onToggleTheme,
  onToggleLang,
  onUpdateData,
  onReloadFromSource,
  onApplyWebsiteTheme,
}) => {
  const [session, setSession] = useState<AdminSessionRecord | null>(() => getActiveAdminSession());
  const [localTab, setLocalTab] = useState<AdminWorkspaceSection>(activeSection);
  const tab = onNavigateSection ? activeSection : localTab;

  const [statusBanner, setStatusBanner] = useState("");
  const [liveGhResult, setLiveGhResult] = useState("");
  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>(() => getAuditLog());

  // Project form state
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [projNameEn, setProjNameEn] = useState("");
  const [projNameAr, setProjNameAr] = useState("");
  const [projShortEn, setProjShortEn] = useState("");
  const [projFullEn, setProjFullEn] = useState("");
  const [projCategory, setProjCategory] = useState(data.projectCategories[0]?.slug || "web-applications");
  const [projStatus, setProjStatus] = useState<ProjectStatus>("Active");
  const [projTech, setProjTech] = useState("");
  const [projRepoSlug, setProjRepoSlug] = useState("");
  const [projRepoUrl, setProjRepoUrl] = useState("");
  const [projDemoUrl, setProjDemoUrl] = useState("");
  const [projScreenshot, setProjScreenshot] = useState("");
  const [projFeatured, setProjFeatured] = useState(false);

  // Knowledge form state
  const [knowTitleEn, setKnowTitleEn] = useState("");
  const [knowCat, setKnowCat] = useState(data.knowledgeCategories[0]?.slug || "technical-knowledge");
  const [knowType, setKnowType] = useState<"personal-note" | "verified-reference">("personal-note");
  const [knowSourceAttr, setKnowSourceAttr] = useState("");
  const [knowSourceUrl, setKnowSourceUrl] = useState("");
  const [knowSummaryEn, setKnowSummaryEn] = useState("");

  // Work Experience form state
  const [expRoleEn, setExpRoleEn] = useState("");
  const [expOrgEn, setExpOrgEn] = useState("");
  const [expPeriod, setExpPeriod] = useState("");
  const [expSummaryEn, setExpSummaryEn] = useState("");

  // GitHub Sync settings & session-only PAT (strictly in React memory)
  const [excludedInput, setExcludedInput] = useState(data.githubSyncSettings.excludedRepos.join(", "));
  const [featuredInput, setFeaturedInput] = useState(data.githubSyncSettings.featuredRepos.join(", "));
  const [githubToken, setGithubToken] = useState("");

  const recordAudit = (action: string, target: string) => {
    const refreshed = touchAdminSession();
    if (!refreshed) {
      setSession(null);
      return;
    }
    setSession(refreshed);
    const next = appendAuditEntry(action, target, refreshed.username);
    setAuditLog(next);
  };

  const navigateSection = (nextSection: AdminWorkspaceSection) => {
    const refreshed = touchAdminSession();
    if (!refreshed) {
      setSession(null);
      return;
    }
    setSession(refreshed);
    if (onNavigateSection) {
      onNavigateSection(nextSection);
    } else {
      setLocalTab(nextSection);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col hub-canvas text-[var(--hub-text)]">
        <header className="border-b border-[var(--hub-border)] hub-surface px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a
            href="#/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{L("Back to Public Hub", "العودة إلى الموقع العام", lang)}</span>
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={L("Toggle light or dark mode", "تبديل المظهر", lang)}
              className="h-9 px-3 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === "dark" ? L("Light", "فاتح", lang) : L("Dark", "داكن", lang)}</span>
            </button>
            <button
              type="button"
              onClick={onToggleLang}
              className="h-9 px-3 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "EN" : "العربية"}</span>
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-5xl">
            <AdminLoginGate
              lang={lang}
              defaultUsername={data.profileSettings.githubUsername || "AbdoKamelAyed"}
              defaultAvatarUrl={data.profileSettings.avatarUrl}
              onAuthenticated={(newSession) => {
                setStatusBanner("");
                setLiveGhResult("");
                setSession(newSession);
                const next = appendAuditEntry(
                  "Signed In",
                  `Admin Workspace (${newSession.role})`,
                  newSession.username
                );
                setAuditLog(next);
                if (!canAccessAdminModule(newSession, tab)) {
                  if (onNavigateSection) {
                    onNavigateSection("overview");
                  } else {
                    setLocalTab("overview");
                  }
                }
              }}
            />
          </div>
        </main>
        <NetworkStatusToast lang={lang} />
      </div>
    );
  }

  const nowIso = () => new Date().toISOString();

  const persistProjects = (items: ProjectRecord[]) => {
    const payload = {
      id: "projects-collection",
      items,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: nowIso(),
      status: "active",
      source: "manual-portfolio",
    };
    const check = validateCollectionSchema(payload);
    if (!check.valid) {
      setStatusBanner(`Schema warning: ${check.errors.join("; ")}`);
      return null;
    }
    saveLocalDraft("./data/projects/projects.json", payload);
    onUpdateData((prev) => ({ ...prev, projects: items }));
    return payload;
  };

  const resetProjectForm = () => {
    setEditingProjId(null);
    setProjNameEn("");
    setProjNameAr("");
    setProjShortEn("");
    setProjFullEn("");
    setProjTech("");
    setProjRepoSlug("");
    setProjRepoUrl("");
    setProjDemoUrl("");
    setProjScreenshot("");
    setProjFeatured(false);
  };

  const handleLoadProjectForEdit = (p: ProjectRecord) => {
    setEditingProjId(p.id);
    setProjNameEn(loc(p.name, "en"));
    setProjNameAr(loc(p.name, "ar"));
    setProjShortEn(loc(p.shortDescription, "en"));
    setProjFullEn(loc(p.fullDescription, "en"));
    setProjCategory(p.category);
    setProjStatus((p.status as ProjectStatus) || "Active");
    setProjTech(p.techStack.join(", "));
    setProjRepoSlug(p.githubRepoSlug || "");
    setProjRepoUrl(p.githubRepoUrl || "");
    setProjDemoUrl(p.liveDemoUrl || "");
    setProjScreenshot(p.screenshots?.[0] || "");
    setProjFeatured(Boolean(p.featured));
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projNameEn.trim() || !projShortEn.trim()) return;
    const slug = slugify(projNameEn);
    const ts = nowIso();

    let next: ProjectRecord[];
    if (editingProjId) {
      next = data.projects.map((p) =>
        p.id === editingProjId
          ? {
              ...p,
              slug,
              name: { en: projNameEn.trim(), ar: projNameAr.trim() || projNameEn.trim() },
              shortDescription: { en: projShortEn.trim(), ar: projShortEn.trim() },
              fullDescription: { en: projFullEn.trim() || projShortEn.trim(), ar: projFullEn.trim() || projShortEn.trim() },
              category: projCategory,
              status: projStatus,
              featured: projFeatured,
              techStack: projTech.split(",").map((s) => s.trim()).filter(Boolean),
              githubRepoSlug: projRepoSlug.trim() || undefined,
              githubRepoUrl: projRepoUrl.trim() || undefined,
              liveDemoUrl: projDemoUrl.trim() || undefined,
              screenshots: projScreenshot.trim() ? [projScreenshot.trim()] : p.screenshots,
              updatedAt: ts,
            }
          : p
      );
    } else {
      const created: ProjectRecord = {
        id: `proj-${slug}-${Date.now()}`,
        slug,
        name: { en: projNameEn.trim(), ar: projNameAr.trim() || projNameEn.trim() },
        shortDescription: { en: projShortEn.trim(), ar: projShortEn.trim() },
        fullDescription: { en: projFullEn.trim() || projShortEn.trim(), ar: projFullEn.trim() || projShortEn.trim() },
        category: projCategory,
        status: projStatus,
        featured: projFeatured,
        sortOrder: data.projects.length + 1,
        techStack: projTech.split(",").map((s) => s.trim()).filter(Boolean),
        githubRepoSlug: projRepoSlug.trim() || undefined,
        githubRepoUrl: projRepoUrl.trim() || undefined,
        liveDemoUrl: projDemoUrl.trim() || undefined,
        screenshots: projScreenshot.trim() ? [projScreenshot.trim()] : [],
        createdAt: ts,
        updatedAt: ts,
        source: "manual-portfolio",
      };
      next = [...data.projects, created];
    }

    if (persistProjects(next)) {
      recordAudit(editingProjId ? "Updated Project" : "Created Project", projNameEn.trim());
      setStatusBanner(L("Project saved to local browser draft.", "تم حفظ المشروع في المسودة المحلية.", lang));
      resetProjectForm();
    }
  };

  const handleSaveKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowTitleEn.trim() || !knowSummaryEn.trim()) return;
    const ts = nowIso();
    const created: KnowledgeEntry = {
      id: `know-${slugify(knowTitleEn)}-${Date.now()}`,
      title: { en: knowTitleEn.trim(), ar: knowTitleEn.trim() },
      category: knowCat,
      entryType: knowType,
      sourceAttribution: knowSourceAttr.trim() || (knowType === "personal-note" ? "Personal Note" : "External Reference"),
      sourceUrl: knowSourceUrl.trim(),
      summary: { en: knowSummaryEn.trim(), ar: knowSummaryEn.trim() },
      tags: [],
      relatedIds: [],
      createdAt: ts,
      updatedAt: ts,
      status: "published",
      source: knowType === "verified-reference" ? "external-reference" : "personal-note",
    };
    const nextRaw = [created, ...data.allKnowledgeRaw];
    saveLocalDraft("./data/knowledge/entries.json", {
      id: "knowledge-entries-collection",
      items: nextRaw,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: ts,
      status: "active",
      source: "manual-knowledge",
    });
    onUpdateData((prev) => ({
      ...prev,
      allKnowledgeRaw: nextRaw,
      knowledge: nextRaw.filter((k) => k.status === "published"),
    }));
    recordAudit("Added Knowledge Entry", knowTitleEn.trim());
    setKnowTitleEn("");
    setKnowSourceAttr("");
    setKnowSourceUrl("");
    setKnowSummaryEn("");
    setStatusBanner(L("Knowledge entry saved to local draft.", "تم حفظ إدخال المعرفة في المسودة المحلية.", lang));
  };

  const handleSaveExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expRoleEn.trim() || !expOrgEn.trim()) return;
    const ts = nowIso();
    const created: ExperienceItem = {
      id: `exp-${slugify(expRoleEn)}-${Date.now()}`,
      role: { en: expRoleEn.trim(), ar: expRoleEn.trim() },
      organization: { en: expOrgEn.trim(), ar: expOrgEn.trim() },
      kind: "Professional",
      period: expPeriod.trim() || "Present",
      location: { en: "", ar: "" },
      summary: { en: expSummaryEn.trim(), ar: expSummaryEn.trim() },
      skills: [],
      createdAt: ts,
      updatedAt: ts,
      status: "active",
      source: "manual-portfolio",
    };
    const nextExp = { ...data.experience, items: [created, ...data.experience.items], updatedAt: ts };
    saveLocalDraft("./data/experience/experience.json", nextExp);
    onUpdateData((prev) => ({ ...prev, experience: nextExp }));
    recordAudit("Added Experience", `${expRoleEn.trim()} @ ${expOrgEn.trim()}`);
    setExpRoleEn("");
    setExpOrgEn("");
    setExpPeriod("");
    setExpSummaryEn("");
    setStatusBanner(L("Experience entry saved to local draft.", "تم حفظ الخبرة في المسودة المحلية.", lang));
  };

  const hasModuleAccess = canAccessAdminModule(session, tab);

  return (
    <AdminWorkspaceShell
      data={data}
      lang={lang}
      theme={theme}
      session={session}
      activeSection={tab}
      onSelectSection={navigateSection}
      onToggleTheme={onToggleTheme}
      onToggleLang={onToggleLang}
      onSignOut={() => {
        setGithubToken("");
        setStatusBanner("");
        setLiveGhResult("");
        resetProjectForm();
        googleDriveSignOut().catch(() => {});
        clearAdminSession();
        setSession(null);
        if (onNavigateSection) {
          onNavigateSection("overview");
        } else {
          setLocalTab("overview");
        }
      }}
    >
      <div className="space-y-6">
        {invalidSubSection && (
          <div className="rounded-xl border border-amber-500/40 hub-subtle px-4 py-3 text-xs font-mono text-amber-700 dark:text-amber-300">
            {L(
              `Unknown admin route "${invalidSubSection}" — showing Command Dashboard.`,
              `مسار الإدارة "${invalidSubSection}" غير معروف — تم عرض لوحة التحكم.`,
              lang
            )}
          </div>
        )}

        {statusBanner && (
          <div className="rounded-xl border border-blue-600/40 hub-subtle px-4 py-3 text-sm flex items-center justify-between gap-4">
            <span className="break-words min-w-0">{statusBanner}</span>
            <button type="button" onClick={() => setStatusBanner("")} className="text-xs underline cursor-pointer shrink-0">
              {L("Dismiss", "إخفاء", lang)}
            </button>
          </div>
        )}

        {!hasModuleAccess ? (
          <section
            data-testid="admin-access-restricted"
            className="rounded-2xl border border-red-500/40 hub-surface p-8 max-w-xl space-y-4"
          >
            <div className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>{L("Administrator Access Restricted", "الوصول مقيد حسب الصلاحية", lang)}</span>
            </div>
            <h2 className="font-display text-2xl font-bold">
              {getAdminModuleLabel(tab, lang)}
            </h2>
            <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
              {L(
                `Your current role (${session.role}) does not include permission to open this workspace module. Request elevated module access from an Owner administrator.`,
                `دورك الحالي (${session.role}) لا يتضمن صلاحية الوصول إلى هذا القسم. اطلب من مالك النظام تفعيل الصلاحية.`,
                lang
              )}
            </p>
            <button
              type="button"
              onClick={() => navigateSection("overview")}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer"
            >
              {L("Return to Command Dashboard", "العودة إلى لوحة التحكم", lang)}
            </button>
          </section>
        ) : (
          <>
            {tab !== "overview" && tab !== "visits" && (
              <AdminSectionCharts
                section={tab}
                data={data}
                lang={lang}
                auditLog={auditLog}
              />
            )}

            {tab === "overview" && (
              <AdminOverview
                data={data}
                lang={lang}
                auditLog={auditLog}
                session={session}
                visitStore={visitStore}
                onNavigateTab={navigateSection}
                onReloadFromSource={onReloadFromSource}
                onNotify={setStatusBanner}
                onExportBundle={() => {
                  downloadJson(`abdo-hub-backup-${nowIso().slice(0, 10)}.json`, {
                    exportedAt: nowIso(),
                    website: data.website,
                    profileSettings: data.profileSettings,
                    githubSyncSettings: data.githubSyncSettings,
                    projects: data.projects,
                    articles: data.allArticlesRaw,
                    issues: data.allIssuesRaw,
                    mediaAssets: data.mediaAssets,
                    knowledge: data.allKnowledgeRaw,
                    experience: data.experience,
                  });
                  recordAudit("Exported Full Backup", "All Datasets");
                }}
              />
            )}

            {tab === "visits" && (
              <AdminVisitInsightsPanel
                data={data}
                lang={lang}
                visitStore={visitStore}
                onResetVisits={onResetVisits}
                onAudit={recordAudit}
                onNotify={setStatusBanner}
              />
            )}

      {tab === "editor" && (
        <ArticleRichEditor
          data={data}
          lang={lang}
          adminUsername={session.username}
          githubToken={githubToken}
          onChangeGithubToken={setGithubToken}
          onUpdateData={onUpdateData}
          onNotify={setStatusBanner}
          onAudit={recordAudit}
          onDownloadJson={downloadJson}
        />
      )}

      {tab === "media" && (
        <MediaLibraryPanel
          data={data}
          lang={lang}
          githubToken={githubToken}
          onChangeGithubToken={setGithubToken}
          onUpdateData={onUpdateData}
          onNotify={setStatusBanner}
          onAudit={recordAudit}
          onDownloadJson={downloadJson}
        />
      )}

      {tab === "issues" && (
        <IssueBuilderPanel
          data={data}
          lang={lang}
          onUpdateData={onUpdateData}
          onNotify={setStatusBanner}
          onAudit={recordAudit}
          onDownloadJson={downloadJson}
        />
      )}

      {tab === "projects" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSaveProject} className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold">
              {editingProjId ? L("Edit Project", "تعديل المشروع", lang) : L("Create Project", "إضافة مشروع", lang)}
            </h2>
            <input
              type="text"
              required
              value={projNameEn}
              onChange={(e) => setProjNameEn(e.target.value)}
              placeholder={L("Project Name (EN)", "اسم المشروع (EN)", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              value={projNameAr}
              onChange={(e) => setProjNameAr(e.target.value)}
              placeholder={L("Project Name (AR)", "اسم المشروع (AR)", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              required
              value={projShortEn}
              onChange={(e) => setProjShortEn(e.target.value)}
              placeholder={L("Short Description", "وصف مختصر", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <textarea
              rows={3}
              value={projFullEn}
              onChange={(e) => setProjFullEn(e.target.value)}
              placeholder={L("Full Description", "الوصف الكامل", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={projCategory}
                onChange={(e) => setProjCategory(e.target.value)}
                aria-label={L("Project Category", "فئة المشروع", lang)}
                className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              >
                {data.projectCategories.map((c) => (
                  <option key={c.id} value={c.slug}>{loc(c.name, lang)}</option>
                ))}
              </select>
              <select
                value={projStatus}
                onChange={(e) => setProjStatus(e.target.value as ProjectStatus)}
                aria-label={L("Project Status", "حالة المشروع", lang)}
                className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={projTech}
              onChange={(e) => setProjTech(e.target.value)}
              placeholder={L("Tech stack (comma separated)", "التقنيات (مفصولة بفاصلة)", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <select
              value={projRepoSlug}
              onChange={(e) => {
                setProjRepoSlug(e.target.value);
                const match = data.github.repositories.find((r) => r.name === e.target.value);
                if (match && !projRepoUrl) setProjRepoUrl(match.url);
              }}
              aria-label={L("Link GitHub Repository", "ربط مستودع GitHub", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value="">{L("Link GitHub Repository (Optional)", "ربط مستودع GitHub (اختياري)", lang)}</option>
              {data.github.repositories.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
            <input
              type="url"
              value={projRepoUrl}
              onChange={(e) => setProjRepoUrl(e.target.value)}
              placeholder={L("GitHub Repository URL", "رابط مستودع GitHub", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="url"
              value={projDemoUrl}
              onChange={(e) => setProjDemoUrl(e.target.value)}
              placeholder={L("Live Demo URL", "رابط المعاينة الحية", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              value={projScreenshot}
              onChange={(e) => setProjScreenshot(e.target.value)}
              placeholder={L("Screenshot URL / Path", "رابط أو مسار صورة المشروع", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={projFeatured}
                onChange={(e) => setProjFeatured(e.target.checked)}
              />
              <span>{L("Featured on Homepage", "عرض في المشاريع المميزة", lang)}</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer">
                {editingProjId ? L("Update Draft", "تحديث المسودة", lang) : L("Save Project Draft", "حفظ المسودة", lang)}
              </button>
              {editingProjId && (
                <button type="button" onClick={resetProjectForm} className="px-4 py-2 rounded-lg text-sm border border-[var(--hub-border)] cursor-pointer">
                  {L("Cancel", "إلغاء", lang)}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  downloadJson("projects.json", {
                    id: "projects-collection",
                    items: data.projects,
                    createdAt: "2026-11-25T00:00:00Z",
                    updatedAt: nowIso(),
                    status: "active",
                    source: "manual-portfolio",
                  })
                }
                className="px-4 py-2 rounded-lg text-sm border border-[var(--hub-border)] cursor-pointer"
              >
                {L("Export projects.json", "تصدير projects.json", lang)}
              </button>
              <button
                type="button"
                data-testid="sync-projects-github-btn"
                onClick={async () => {
                  const owner =
                    data.githubSyncSettings.storageOwner ||
                    data.githubSyncSettings.username ||
                    data.profileSettings.githubUsername ||
                    "AbdoKamelAyed";
                  const repo = data.githubSyncSettings.storageRepo || `${owner}.github.io`;
                  const branch = data.githubSyncSettings.storageBranch || "main";
                  if (!githubToken.trim()) {
                    navigateSection("github");
                    setStatusBanner(
                      L(
                        `Enter your session GitHub PAT below to commit local project updates to ${owner}/${repo}.`,
                        `أدخل رمز GitHub المؤقت للجلسة لدفع تحديثات المشاريع إلى ${owner}/${repo}.`,
                        lang
                      )
                    );
                    return;
                  }
                  const payload = {
                    id: "projects-collection",
                    items: data.projects,
                    createdAt: "2026-11-25T00:00:00Z",
                    updatedAt: nowIso(),
                    status: "active",
                    source: "manual-portfolio",
                  };
                  setStatusBanner(L(`Syncing projects.json to ${owner}/${repo}...`, "جارٍ مزامنة المشاريع مع GitHub...", lang));
                  const res = await syncLocalDraftsToGitHubRepo({
                    token: githubToken.trim(),
                    owner,
                    repo,
                    branch,
                    drafts: [
                      {
                        datasetPath: "./data/projects/projects.json",
                        repoPath: "public/data/projects/projects.json",
                        payload,
                      },
                    ],
                    commitMessagePrefix: "Update projects.json",
                    allowOverwrite: true,
                  });
                  if (res.synced.length > 0) {
                    updateDatasetCache("./data/projects/projects.json", payload);
                    removeLocalDraft("./data/projects/projects.json");
                    recordAudit("Synced Projects to GitHub", `${owner}/${repo}`);
                    setStatusBanner(
                      L(
                        `Synced projects.json directly to ${owner}/${repo} (${branch}).`,
                        `تمت مزامنة المشاريع بنجاح مع ${owner}/${repo}.`,
                        lang
                      )
                    );
                  } else {
                    setStatusBanner(res.failed[0]?.error || "Failed to sync projects to GitHub.");
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-secondary)] text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <GitCommitHorizontal className="w-4 h-4" />
                <span>{L("Sync Projects to GitHub", "مزامنة المشاريع مع GitHub", lang)}</span>
              </button>
            </div>
            {hasLocalDraft("./data/projects/projects.json") && (
              <p data-testid="projects-pending-sync-badge" className="text-xs font-mono text-amber-600 dark:text-amber-400">
                {L(
                  "Local project updates pending GitHub repository sync.",
                  "توجد تعديلات محلية للمشاريع بانتظار المزامنة مع GitHub.",
                  lang
                )}
              </p>
            )}
          </form>

          <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">
              {L("Managed Projects", "المشاريع الحالية", lang)} ({data.projects.length})
            </h2>
            <ul className="divide-y divide-[var(--hub-border)]">
              {data.projects.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{loc(p.name, lang)}</div>
                    <div className="text-xs text-[var(--hub-text-muted)]">
                      {p.status} · {p.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoadProjectForEdit(p)}
                      className="px-2.5 py-1 rounded border border-[var(--hub-border)] text-xs font-medium cursor-pointer"
                    >
                      {L("Edit", "تعديل", lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = data.projects.filter((x) => x.id !== p.id);
                        persistProjects(next);
                        recordAudit("Deleted Project", loc(p.name, "en"));
                      }}
                      className="px-2.5 py-1 rounded border border-red-600/40 text-xs font-medium text-red-700 dark:text-red-400 cursor-pointer"
                    >
                      {L("Delete", "حذف", lang)}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "knowledge" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSaveKnowledge} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold">{L("Knowledge Archive", "إدارة المعرفة", lang)}</h2>
            <input
              type="text"
              required
              value={knowTitleEn}
              onChange={(e) => setKnowTitleEn(e.target.value)}
              placeholder={L("Entry Title", "عنوان الإدخال", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <select
              value={knowCat}
              onChange={(e) => setKnowCat(e.target.value)}
              aria-label={L("Knowledge Category", "فئة المعرفة", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              {data.knowledgeCategories.map((c) => (
                <option key={c.id} value={c.slug}>{loc(c.name, lang)}</option>
              ))}
            </select>
            <select
              value={knowType}
              onChange={(e) => setKnowType(e.target.value as "personal-note" | "verified-reference")}
              aria-label={L("Source Type", "نوع المصدر", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value="personal-note">{L("Personal Note", "ملاحظة شخصية", lang)}</option>
              <option value="verified-reference">{L("Verified External Reference", "مرجع خارجي موثق", lang)}</option>
            </select>
            <input
              type="text"
              value={knowSourceAttr}
              onChange={(e) => setKnowSourceAttr(e.target.value)}
              placeholder={L("Source Attribution", "نسبة المصدر", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="url"
              value={knowSourceUrl}
              onChange={(e) => setKnowSourceUrl(e.target.value)}
              placeholder={L("Reference URL (optional)", "رابط المرجع (اختياري)", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <textarea
              required
              rows={3}
              value={knowSummaryEn}
              onChange={(e) => setKnowSummaryEn(e.target.value)}
              placeholder={L("Summary...", "ملخص المعلومة...", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer">
                {L("Save Knowledge Entry", "حفظ الإدخال", lang)}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadJson("entries.json", {
                    id: "knowledge-entries-collection",
                    items: data.allKnowledgeRaw,
                    createdAt: "2026-11-25T00:00:00Z",
                    updatedAt: nowIso(),
                    status: "active",
                    source: "manual-knowledge",
                  })
                }
                className="px-4 py-2 rounded-lg text-xs border border-[var(--hub-border)] cursor-pointer"
              >
                {L("Export entries.json", "تصدير entries.json", lang)}
              </button>
            </div>
          </form>

          <form onSubmit={handleSaveExperience} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold">{L("Work & Experience", "الخبرات المهنية", lang)}</h2>
            <input
              type="text"
              required
              value={expRoleEn}
              onChange={(e) => setExpRoleEn(e.target.value)}
              placeholder={L("Role / Position", "الدور أو المسمى", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              required
              value={expOrgEn}
              onChange={(e) => setExpOrgEn(e.target.value)}
              placeholder={L("Organization", "المؤسسة", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              value={expPeriod}
              onChange={(e) => setExpPeriod(e.target.value)}
              placeholder={L("Period (e.g. 2024 – Present)", "الفترة", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <textarea
              rows={3}
              value={expSummaryEn}
              onChange={(e) => setExpSummaryEn(e.target.value)}
              placeholder={L("Experience summary...", "ملخص الخبرة...", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer">
                {L("Add Experience", "إضافة خبرة", lang)}
              </button>
              <button
                type="button"
                onClick={() => downloadJson("experience.json", data.experience)}
                className="px-4 py-2 rounded-lg text-xs border border-[var(--hub-border)] cursor-pointer"
              >
                {L("Export experience.json", "تصدير experience.json", lang)}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "github" && (
        <div className="space-y-6">
          <GitHubRepoStoragePanel
            data={data}
            lang={lang}
            githubToken={githubToken}
            onChangeGithubToken={setGithubToken}
            onUpdateData={onUpdateData}
            onReloadFromSource={onReloadFromSource}
            onNotify={setStatusBanner}
            onAudit={recordAudit}
          />

          <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold">{L("GitHub Synchronization & Exclusions", "إدارة مزامنة GitHub", lang)}</h2>
            <div className="text-sm text-[var(--hub-text-muted)] space-y-1 font-mono">
              <div>Status: {data.github.syncMeta.syncStatus}</div>
              <div>Last Successful Sync: {formatDateTime(data.github.syncMeta.lastSuccessfulSync, lang)}</div>
              <div>Errors: {data.github.syncMeta.errorCount}</div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  setLiveGhResult(L("Checking public GitHub REST API...", "جارٍ فحص واجهة GitHub العامة...", lang));
                  const res = await refreshPublicGithubLive(data.githubSyncSettings.username || "AbdoKamelAyed");
                  setLiveGhResult(res.message);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer"
              >
                {L("Check Live Public GitHub API", "فحص واجهة GitHub الحية", lang)}
              </button>
              <a
                href="https://github.com/AbdoKamelAyed/abdokamelayed.github.io/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--hub-border)]"
              >
                {L("Open GitHub Actions", "فتح GitHub Actions", lang)}
              </a>
            </div>

            {liveGhResult && <p className="text-sm text-blue-600 dark:text-blue-400">{liveGhResult}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nextSync = {
                  ...data.githubSyncSettings,
                  excludedRepos: excludedInput.split(",").map((s) => s.trim()).filter(Boolean),
                  featuredRepos: featuredInput.split(",").map((s) => s.trim()).filter(Boolean),
                  updatedAt: nowIso(),
                };
                saveLocalDraft("./data/settings/github-sync.json", nextSync);
                onUpdateData((prev) => ({ ...prev, githubSyncSettings: nextSync }));
                recordAudit("Updated GitHub Sync Config", nextSync.username);
                setStatusBanner(L("Saved GitHub sync preferences.", "تم حفظ إعدادات مزامنة GitHub.", lang));
              }}
              className="space-y-3 pt-4 border-t border-[var(--hub-border)]"
            >
              <div>
                <label className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Excluded Repositories (comma separated)", "المستودعات المستبعدة", lang)}
                </label>
                <input
                  type="text"
                  value={excludedInput}
                  onChange={(e) => setExcludedInput(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Featured Repositories (comma separated)", "المستودعات المميزة", lang)}
                </label>
                <input
                  type="text"
                  value={featuredInput}
                  onChange={(e) => setFeaturedInput(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer">
                  {L("Save Sync Config", "حفظ الإعدادات", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson("github-sync.json", data.githubSyncSettings)}
                  className="px-4 py-2 rounded-lg text-sm border border-[var(--hub-border)] cursor-pointer"
                >
                  {L("Export github-sync.json", "تصدير github-sync.json", lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <SiteSettingsPanel
          data={data}
          lang={lang}
          adminUsername={session.username}
          onUpdateData={onUpdateData}
          onApplyWebsiteTheme={onApplyWebsiteTheme}
          onNotify={setStatusBanner}
          onAudit={recordAudit}
          onDownloadJson={downloadJson}
        />
      )}

      {tab === "access" && (
        <AdminAccessPanel
          lang={lang}
          session={session}
          defaultAvatarUrl={data.profileSettings.avatarUrl}
          auditLog={auditLog}
          onRefreshSession={() => {
            const refreshed = getActiveAdminSession();
            if (refreshed) setSession(refreshed);
          }}
          onNotify={setStatusBanner}
          onAudit={recordAudit}
        />
      )}
          </>
        )}
      </div>
    </AdminWorkspaceShell>
  );
};

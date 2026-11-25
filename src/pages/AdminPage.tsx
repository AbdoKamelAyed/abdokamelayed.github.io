import React, { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import type {
  ExperienceItem,
  HubDatasets,
  KnowledgeEntry,
  Lang,
  ProjectRecord,
  ProjectStatus,
} from "../types/hub";
import {
  refreshPublicGithubLive,
  saveLocalDraft,
} from "../services/dataService";
import {
  appendAuditEntry,
  clearAdminSession,
  getActiveAdminSession,
  getAuditLog,
  type AdminAuditEntry,
  type AdminSessionRecord,
} from "../utils/adminAuth";
import { slugify, validateCollectionSchema } from "../utils/analytics";
import { formatDateTime, L, loc, t } from "../utils/i18n";
import { AdminLoginGate } from "../components/admin/AdminLoginGate";
import { AdminOverview } from "../components/admin/AdminOverview";
import { ArticleRichEditor } from "../components/admin/ArticleRichEditor";
import { SiteSettingsPanel } from "../components/admin/SiteSettingsPanel";

type AdminTab = "overview" | "editor" | "projects" | "knowledge" | "github" | "settings";

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
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onReloadFromSource: () => Promise<void>;
  onApplyWebsiteTheme: (website: HubDatasets["website"]) => void;
}> = ({ data, lang, onUpdateData, onReloadFromSource, onApplyWebsiteTheme }) => {
  const [session, setSession] = useState<AdminSessionRecord | null>(() => getActiveAdminSession());
  const [tab, setTab] = useState<AdminTab>("overview");
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

  // GitHub Sync settings state
  const [excludedInput, setExcludedInput] = useState(data.githubSyncSettings.excludedRepos.join(", "));
  const [featuredInput, setFeaturedInput] = useState(data.githubSyncSettings.featuredRepos.join(", "));

  const recordAudit = (action: string, target: string) => {
    const next = appendAuditEntry(action, target, session?.username || "admin");
    setAuditLog(next);
  };

  if (!session) {
    return (
      <AdminLoginGate
        lang={lang}
        defaultUsername={data.profileSettings.githubUsername || "AbdoKamelAyed"}
        onAuthenticated={(newSession) => {
          setSession(newSession);
          const next = appendAuditEntry("Signed In", "Admin Portal", newSession.username);
          setAuditLog(next);
        }}
      />
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

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--hub-border)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {L("Authenticated Operator:", "المسؤول النشط:", lang)} {session.username} ·{" "}
              {L("Session expires", "تنتهي الجلسة", lang)} {formatDateTime(session.expiresAt, lang)}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("admin.title", lang)}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearAdminSession();
              setSession(null);
            }}
            className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{L("Lock & Sign Out", "قفل وتسجيل الخروج", lang)}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[var(--hub-border)] pb-3">
        {(
          [
            ["overview", L("Command Dashboard", "لوحة التحكم", lang)],
            ["editor", L("Rich Article Editor", "المحرر المتقدم", lang)],
            ["projects", L("Projects", "المشاريع", lang)],
            ["knowledge", L("Knowledge & Work", "المعرفة والخبرات", lang)],
            ["github", L("GitHub Sync", "مزامنة GitHub", lang)],
            ["settings", L("Site Settings", "إعدادات الموقع", lang)],
          ] as [AdminTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap ${
              tab === id
                ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]"
                : "border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {statusBanner && (
        <div className="rounded-xl border border-blue-600/40 hub-subtle px-4 py-3 text-sm flex items-center justify-between gap-4">
          <span>{statusBanner}</span>
          <button type="button" onClick={() => setStatusBanner("")} className="text-xs underline cursor-pointer">
            {L("Dismiss", "إخفاء", lang)}
          </button>
        </div>
      )}

      {tab === "overview" && (
        <AdminOverview
          data={data}
          lang={lang}
          auditLog={auditLog}
          onNavigateTab={(tId) => setTab(tId)}
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
              knowledge: data.allKnowledgeRaw,
              experience: data.experience,
            });
            recordAudit("Exported Full Backup", "All Datasets");
          }}
        />
      )}

      {tab === "editor" && (
        <ArticleRichEditor
          data={data}
          lang={lang}
          adminUsername={session.username}
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
            </div>
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
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5 max-w-3xl">
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
    </div>
  );
};

import React, { useMemo, useState } from "react";
import { BookMarked, Check, Download, FileDown, Layers, Plus, Trash2 } from "lucide-react";
import type {
  HubDatasets,
  JournalIssueCadence,
  JournalIssueRecord,
  JournalIssueSelectionMode,
  Lang,
} from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import { slugify } from "../../utils/analytics";
import { formatDate, L, loc } from "../../utils/i18n";
import {
  calculateIssueStats,
  computeAutoIssueBuckets,
  formatCadenceLabel,
  resolveIssueArticles,
  selectArticlesForIssue,
} from "../../utils/issues";
import { buildIssuePdfInput, generatePdfBytes, triggerPdfDownload } from "../../utils/pdfMaker";

const ISSUE_COVERS = [
  { label: "Edition Monograph", path: "/src/assets/images/journal_issue_cover_1795606693391.jpg" },
  { label: "Editorial Workspace", path: "/src/assets/images/abdo_editorial_workspace_1795599463678.jpg" },
  { label: "Systems Architecture", path: "/src/assets/images/project_systems_architecture_1795599465444.jpg" },
];

export const IssueBuilderPanel: React.FC<{
  data: HubDatasets;
  lang: Lang;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
  onDownloadJson: (filename: string, payload: unknown) => void;
}> = ({ data, lang, onUpdateData, onNotify, onAudit, onDownloadJson }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cadence, setCadence] = useState<JournalIssueCadence>("monthly");
  const [selectionMode, setSelectionMode] = useState<JournalIssueSelectionMode>("period");
  const [periodKey, setPeriodKey] = useState<string>("2026-11");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [manualIds, setManualIds] = useState<string[]>([]);

  const [issueNumber, setIssueNumber] = useState(`ED. ${String(data.allIssuesRaw.length + 1).padStart(2, "0")} · EDITION`);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");
  const [editorialNoteEn, setEditorialNoteEn] = useState("");
  const [coverImage, setCoverImage] = useState(ISSUE_COVERS[0].path);
  const [status, setStatus] = useState<"published" | "draft">("published");

  const allTopics = useMemo(
    () =>
      Array.from(
        new Set(data.allArticlesRaw.flatMap((a) => [...(a.tags || []), ...(a.categories || []), a.type]))
      ).sort(),
    [data.allArticlesRaw]
  );

  const periodBuckets = useMemo(() => {
    if (cadence === "curated") return [];
    return computeAutoIssueBuckets(data.allArticlesRaw, cadence);
  }, [data.allArticlesRaw, cadence]);

  const previewArticles = useMemo(
    () =>
      selectArticlesForIssue(data.allArticlesRaw, {
        cadence,
        selectionMode,
        periodKey,
        topics: selectedTopics,
        manualArticleIds: manualIds,
      }),
    [data.allArticlesRaw, cadence, selectionMode, periodKey, selectedTopics, manualIds]
  );

  const stats = useMemo(() => calculateIssueStats(previewArticles, lang), [previewArticles, lang]);

  const persistIssues = (nextRaw: JournalIssueRecord[], action: string, target: string) => {
    const ts = new Date().toISOString();
    saveLocalDraft("./data/journal/issues.json", {
      id: "journal-issues-collection",
      items: nextRaw,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: ts,
      status: "active",
      source: "manual-editorial",
    });
    onUpdateData((prev) => ({
      ...prev,
      allIssuesRaw: nextRaw,
      issues: nextRaw.filter((x) => x.status === "published"),
    }));
    onAudit(action, target);
  };

  const resetBuilder = () => {
    setEditingId(null);
    setTitleEn("");
    setTitleAr("");
    setSubtitleEn("");
    setEditorialNoteEn("");
    setIssueNumber(`ED. ${String(data.allIssuesRaw.length + 1).padStart(2, "0")} · ${cadence.toUpperCase()}`);
    setSelectedTopics([]);
    setManualIds([]);
  };

  const loadIssue = (issue: JournalIssueRecord) => {
    setEditingId(issue.id);
    setCadence(issue.cadence);
    setSelectionMode(issue.selectionMode);
    setPeriodKey(issue.periodKey);
    setSelectedTopics(issue.topics || []);
    setManualIds(issue.articleIds || []);
    setIssueNumber(issue.issueNumber);
    setTitleEn(loc(issue.title, "en"));
    setTitleAr(loc(issue.title, "ar"));
    setSubtitleEn(loc(issue.subtitle, "en"));
    setEditorialNoteEn(loc(issue.editorialNote, "en"));
    setCoverImage(issue.coverImage || ISSUE_COVERS[0].path);
    setStatus(issue.status);
  };

  const handleSaveIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) {
      onNotify(L("Enter an edition title.", "أدخل عنوان الإصدار.", lang));
      return;
    }
    if (previewArticles.length === 0) {
      onNotify(L("Select at least one article or matching topic/period.", "اختر مقالاً واحداً على الأقل أو موضوعاً مطابقاً.", lang));
      return;
    }

    const ts = new Date().toISOString();
    const slug = slugify(titleEn);
    const articleIds = previewArticles.map((a) => a.id);

    if (editingId) {
      const nextRaw = data.allIssuesRaw.map((item) =>
        item.id === editingId
          ? {
              ...item,
              slug,
              issueNumber: issueNumber.trim() || item.issueNumber,
              cadence,
              selectionMode,
              periodKey: periodKey || "curated",
              topics: selectedTopics,
              title: { en: titleEn.trim(), ar: titleAr.trim() || titleEn.trim() },
              subtitle: { en: subtitleEn.trim(), ar: subtitleEn.trim() },
              editorialNote: editorialNoteEn.trim() ? { en: editorialNoteEn.trim(), ar: editorialNoteEn.trim() } : undefined,
              coverImage: coverImage.trim() || ISSUE_COVERS[0].path,
              articleIds,
              updatedAt: ts,
              status,
            }
          : item
      );
      persistIssues(nextRaw, "Updated Journal Issue", titleEn.trim());
      onNotify(L("Journal Issue updated and published to Journal Issues.", "تم تحديث الإصدار وحفظه في أعداد المجلة.", lang));
    } else {
      const created: JournalIssueRecord = {
        id: `issue-${slug}-${Date.now().toString(36).slice(-4)}`,
        slug,
        issueNumber: issueNumber.trim() || `ED. ${String(data.allIssuesRaw.length + 1).padStart(2, "0")} · ${cadence.toUpperCase()}`,
        cadence,
        selectionMode,
        periodKey: cadence === "curated" ? "curated" : periodKey || "all",
        topics: selectedTopics,
        title: { en: titleEn.trim(), ar: titleAr.trim() || titleEn.trim() },
        subtitle: {
          en: subtitleEn.trim() || `Curated ${cadence} compendium of ${articleIds.length} engineering publications.`,
          ar: subtitleEn.trim() || `إصدار ${formatCadenceLabel(cadence, "ar")} يجمع ${articleIds.length} منشورات تقنية.`,
        },
        editorialNote: editorialNoteEn.trim() ? { en: editorialNoteEn.trim(), ar: editorialNoteEn.trim() } : undefined,
        coverImage: coverImage.trim() || ISSUE_COVERS[0].path,
        articleIds,
        publishedAt: ts.slice(0, 10),
        featured: true,
        createdAt: ts,
        updatedAt: ts,
        status,
        source: "manual-editorial",
      };
      const nextRaw = [created, ...data.allIssuesRaw];
      persistIssues(nextRaw, "Published Journal Issue", titleEn.trim());
      setEditingId(created.id);
      onNotify(L("New Journal Issue compiled and saved!", "تم تجميع وحفظ عدد المجلة الجديد!", lang));
    }
  };

  const handleMakeDraftPdf = () => {
    const tempIssue: JournalIssueRecord = {
      id: editingId || "preview-issue",
      slug: slugify(titleEn || "journal-edition"),
      issueNumber: issueNumber.trim() || "EDITION",
      cadence,
      selectionMode,
      periodKey,
      topics: selectedTopics,
      title: { en: titleEn.trim() || "Collected Journal Edition", ar: titleAr.trim() || titleEn.trim() || "إصدار المجلة" },
      subtitle: { en: subtitleEn.trim(), ar: subtitleEn.trim() },
      editorialNote: editorialNoteEn.trim() ? { en: editorialNoteEn.trim(), ar: editorialNoteEn.trim() } : undefined,
      articleIds: previewArticles.map((a) => a.id),
      publishedAt: new Date().toISOString().slice(0, 10),
      featured: true,
      createdAt: "",
      updatedAt: "",
      status,
      source: "manual-editorial",
    };
    const bytes = generatePdfBytes(
      buildIssuePdfInput(tempIssue, previewArticles, lang, data.website.siteName)
    );
    triggerPdfDownload(`${tempIssue.slug || "journal-issue"}.pdf`, bytes);
    onAudit("Generated Issue PDF", loc(tempIssue.title, "en"));
    onNotify(L("Compiled Issue PDF downloaded.", "تم إنشاء وتحميل ملف PDF للإصدار.", lang));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Existing Issues List */}
      <aside className="xl:col-span-4 rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{L("Journal Issues", "إصدارات المجلة", lang)} ({data.allIssuesRaw.length})</span>
          </h2>
          <button
            type="button"
            onClick={resetBuilder}
            className="px-3 py-1.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{L("New Issue", "إصدار جديد", lang)}</span>
          </button>
        </div>

        <ul className="divide-y divide-[var(--hub-border)]">
          {data.allIssuesRaw.map((issue) => {
            const arts = resolveIssueArticles(issue, data.allArticlesRaw);
            return (
              <li key={issue.id} className="py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => loadIssue(issue)}
                    className="text-start font-semibold text-sm hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  >
                    {loc(issue.title, lang)}
                  </button>
                  <span className="text-[11px] font-mono text-[var(--hub-text-muted)] shrink-0">
                    {formatCadenceLabel(issue.cadence, lang)}
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {issue.issueNumber} · {issue.periodKey} · {arts.length} {L("articles", "مقالات", lang)} · {formatDate(issue.publishedAt, lang)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => loadIssue(issue)}
                    className="px-2 py-1 rounded border border-[var(--hub-border)] cursor-pointer"
                  >
                    {L("Edit", "تعديل", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const bytes = generatePdfBytes(buildIssuePdfInput(issue, arts, lang, data.website.siteName));
                      triggerPdfDownload(`${issue.slug}.pdf`, bytes);
                      onAudit("Exported Issue PDF", loc(issue.title, "en"));
                    }}
                    className="px-2 py-1 rounded border border-[var(--hub-border)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                  <a
                    href={`#/journal/issues/${encodeURIComponent(issue.slug)}`}
                    className="px-2 py-1 rounded border border-[var(--hub-border)] text-blue-600 dark:text-blue-400"
                  >
                    {L("Open", "فتح", lang)}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const nextRaw = data.allIssuesRaw.filter((x) => x.id !== issue.id);
                      persistIssues(nextRaw, "Deleted Journal Issue", loc(issue.title, "en"));
                      if (editingId === issue.id) resetBuilder();
                    }}
                    aria-label={L("Delete issue", "حذف الإصدار", lang)}
                    className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() =>
            onDownloadJson("issues.json", {
              id: "journal-issues-collection",
              items: data.allIssuesRaw,
              createdAt: "2026-11-25T00:00:00Z",
              updatedAt: new Date().toISOString(),
              status: "active",
              source: "manual-editorial",
            })
          }
          className="w-full py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{L("Export issues.json", "تصدير issues.json", lang)}</span>
        </button>
      </aside>

      {/* Right: Issue Builder & PDF Maker */}
      <form onSubmit={handleSaveIssue} className="xl:col-span-8 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hub-border)] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold inline-flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>{L("Edition Compiler & PDF Maker", "صانع الإصدارات وملفات PDF", lang)}</span>
            </h2>
            <p className="text-xs text-[var(--hub-text-muted)] mt-0.5">
              {L(
                "Assemble multi-article editions by Weekly / Monthly / Annual periods, Topics, or custom manual selection and export as PDF.",
                "جمّع المقالات أسبوعياً أو شهرياً أو سنوياً أو حسب المواضيع أو يدوياً ثم صدّرها كعدد متكامل بصيغة PDF.",
                lang
              )}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
            {stats.articleCount} {L("articles", "مقالات", lang)} · {stats.totalWords} {L("words", "كلمة", lang)} · {stats.totalReadingMinutes} {L("min", "د", lang)}
          </div>
        </div>

        {/* Cadence & Assembly Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="issue-cadence" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Edition Cadence", "دورية الإصدار", lang)}
            </label>
            <select
              id="issue-cadence"
              value={cadence}
              onChange={(e) => {
                const nextCadence = e.target.value as JournalIssueCadence;
                setCadence(nextCadence);
                if (nextCadence === "curated") {
                  setSelectionMode("manual");
                } else {
                  const firstBucket = computeAutoIssueBuckets(data.allArticlesRaw, nextCadence)[0];
                  if (firstBucket) setPeriodKey(firstBucket.periodKey);
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value="weekly">{L("Weekly Edition", "إصدار أسبوعي", lang)}</option>
              <option value="monthly">{L("Monthly Edition", "إصدار شهري", lang)}</option>
              <option value="annual">{L("Annual Compendium", "إصدار سنوي", lang)}</option>
              <option value="curated">{L("Custom Curated Edition", "إصدار مختار", lang)}</option>
            </select>
          </div>

          <div>
            <label htmlFor="issue-selection-mode" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Article Collection Method", "طريقة تجميع المقالات", lang)}
            </label>
            <select
              id="issue-selection-mode"
              value={selectionMode}
              onChange={(e) => setSelectionMode(e.target.value as JournalIssueSelectionMode)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value="period">{L("Auto-Collect by Period", "تجميع تلقائي حسب الفترة", lang)}</option>
              <option value="topic">{L("Filter by Topics / Tags", "تصفية حسب الموضوعات", lang)}</option>
              <option value="manual">{L("Select Articles Manually", "اختيار المقالات يدوياً", lang)}</option>
            </select>
          </div>

          <div>
            <label htmlFor="issue-period" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Target Period", "الفترة الزمنية", lang)}
            </label>
            {cadence !== "curated" && periodBuckets.length > 0 ? (
              <select
                id="issue-period"
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              >
                <option value="all">{L("All Periods", "جميع الفترات", lang)}</option>
                {periodBuckets.map((b) => (
                  <option key={b.periodKey} value={b.periodKey}>
                    {b.periodKey} ({b.count})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="issue-period"
                type="text"
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            )}
          </div>
        </div>

        {/* Topics Picker (for Topic / Period modes) */}
        {selectionMode !== "manual" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
              {L("Filter Included Topics / Categories (leave empty for all)", "تصفية حسب الموضوعات أو الوسوم", lang)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTopics.map((topic) => {
                const active = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() =>
                      setSelectedTopics((prev) =>
                        prev.includes(topic) ? prev.filter((x) => x !== topic) : [...prev, topic]
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                      active
                        ? "border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-[var(--hub-border)] text-[var(--hub-text-muted)]"
                    }`}
                  >
                    #{topic}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual Article Picker */}
        {selectionMode === "manual" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
              {L("Select Articles for This Edition", "اختر المقالات المضمنة في هذا العدد", lang)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl border border-[var(--hub-border)] hub-subtle">
              {data.allArticlesRaw.map((art) => {
                const checked = manualIds.includes(art.id);
                return (
                  <label
                    key={art.id}
                    className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setManualIds((prev) =>
                          e.target.checked ? [...prev, art.id] : prev.filter((id) => id !== art.id)
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="font-semibold block">{loc(art.title, lang)}</span>
                      <span className="font-mono text-[10px] text-[var(--hub-text-muted)]">
                        {art.publishedAt} · {art.type}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Title, Issue Number, Cover */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="issue-title-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Edition Title (EN)", "عنوان العدد (EN)", lang)}
            </label>
            <input
              id="issue-title-en"
              type="text"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="December 2026 Systems & Robotics Review"
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-semibold"
            />
          </div>
          <div>
            <label htmlFor="issue-number" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Issue Code", "رقم الإصدار", lang)}
            </label>
            <input
              id="issue-number"
              type="text"
              dir="ltr"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="issue-title-ar" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Edition Title (AR)", "عنوان العدد (AR)", lang)}
            </label>
            <input
              id="issue-title-ar"
              type="text"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <div>
            <label htmlFor="issue-status" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Visibility", "حالة النشر", lang)}
            </label>
            <select
              id="issue-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "published" | "draft")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value="published">{L("Published in Journal Issues", "منشور في أعداد المجلة", lang)}</option>
              <option value="draft">{L("Draft (Admin Preview Only)", "مسودة", lang)}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="issue-subtitle" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Subtitle", "الوصف المختصر", lang)}
            </label>
            <input
              id="issue-subtitle"
              type="text"
              value={subtitleEn}
              onChange={(e) => setSubtitleEn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <div>
            <label htmlFor="issue-cover" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Cover Plate", "صورة غلاف الإصدار", lang)}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {ISSUE_COVERS.map((c) => (
                <button
                  key={c.path}
                  type="button"
                  onClick={() => setCoverImage(c.path)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    coverImage === c.path
                      ? "border-blue-600 bg-blue-600/10 font-semibold"
                      : "border-[var(--hub-border)] text-[var(--hub-text-muted)]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="issue-note" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
            {L("Editorial Foreword", "المقدمة التحريرية", lang)}
          </label>
          <textarea
            id="issue-note"
            rows={2}
            value={editorialNoteEn}
            onChange={(e) => setEditorialNoteEn(e.target.value)}
            placeholder={L("Opening editorial context printed on page 1 of this issue and its PDF...", "مقدمة تفتتح العدد ونسخة الـ PDF الخاصة به...", lang)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
          />
        </div>

        {/* Compiled Lineup Preview */}
        <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-2">
          <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
            {L("Compiled Edition Lineup", "المقالات المدرجة في هذا العدد", lang)} ({previewArticles.length})
          </div>
          {previewArticles.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {L("No articles match the selected period/topics yet.", "لا توجد مقالات مطابقة للفترة أو الموضوعات المختارة.", lang)}
            </p>
          ) : (
            <ol className="space-y-1 text-xs">
              {previewArticles.map((a, idx) => (
                <li key={a.id} className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">
                    {String(idx + 1).padStart(2, "0")}. {loc(a.title, lang)}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--hub-text-muted)] shrink-0">
                    {a.publishedAt}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--hub-border)]">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{editingId ? L("Update Journal Issue", "تحديث الإصدار", lang) : L("Publish Journal Issue", "نشر عدد المجلة", lang)}</span>
          </button>
          <button
            type="button"
            disabled={previewArticles.length === 0}
            onClick={handleMakeDraftPdf}
            className="px-4 py-2.5 rounded-lg border border-[var(--hub-border)] text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{L("Make Edition PDF (.pdf)", "تصدير PDF للعدد", lang)}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

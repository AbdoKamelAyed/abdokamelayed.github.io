import React, { useMemo, useState } from "react";
import { Activity, BookOpen, CheckCircle2, Download, FolderGit2, PenSquare, RotateCcw, Settings2 } from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { clearLocalDrafts, getLocalDraftCount } from "../../services/dataService";
import type { AdminAuditEntry } from "../../utils/adminAuth";
import { calculateReadingTimeMinutes, countWords, validateCollectionSchema } from "../../utils/analytics";
import { formatDateTime, L, loc } from "../../utils/i18n";

export const AdminOverview: React.FC<{
  data: HubDatasets;
  lang: Lang;
  auditLog: AdminAuditEntry[];
  onNavigateTab: (tab: "overview" | "projects" | "editor" | "knowledge" | "github" | "settings") => void;
  onReloadFromSource: () => Promise<void>;
  onNotify: (msg: string) => void;
  onExportBundle: () => void;
}> = ({ data, lang, auditLog, onNavigateTab, onReloadFromSource, onNotify, onExportBundle }) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const metrics = useMemo(() => {
    const publishedArticles = data.allArticlesRaw.filter((a) => a.status === "published");
    const draftArticles = data.allArticlesRaw.filter((a) => a.status !== "published");
    const totalWords = data.allArticlesRaw.reduce(
      (sum, a) => sum + countWords(loc(a.content, lang)),
      0
    );
    const avgRead =
      data.allArticlesRaw.length > 0
        ? Math.round(
            data.allArticlesRaw.reduce(
              (sum, a) => sum + calculateReadingTimeMinutes(loc(a.content, lang)),
              0
            ) / data.allArticlesRaw.length
          )
        : 0;
    const featuredProjects = data.projects.filter((p) => p.featured).length;
    const totalStars = data.github.statistics.totalStarsReceived ?? 0;

    const projCheck = validateCollectionSchema({ items: data.projects });
    const artCheck = validateCollectionSchema({ items: data.allArticlesRaw });
    const knowCheck = validateCollectionSchema({ items: data.allKnowledgeRaw });
    const expCheck = validateCollectionSchema({ items: data.experience.items });

    const allValid = projCheck.valid && artCheck.valid && knowCheck.valid && expCheck.valid;
    const totalErrors =
      projCheck.errors.length + artCheck.errors.length + knowCheck.errors.length + expCheck.errors.length;

    const categoryCounts = new Map<string, number>();
    for (const a of data.allArticlesRaw) {
      categoryCounts.set(a.type, (categoryCounts.get(a.type) || 0) + 1);
    }

    return {
      publishedCount: publishedArticles.length,
      draftCount: draftArticles.length,
      totalWords,
      avgRead,
      featuredProjects,
      totalStars,
      allValid,
      totalErrors,
      categoryCounts: [...categoryCounts.entries()],
    };
  }, [data, lang]);

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Published Articles", "مقالات منشورة", lang)}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{metrics.publishedCount}</div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5 tabular-nums">
            {metrics.draftCount} {L("drafts", "مسودات", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Total Words", "إجمالي الكلمات", lang)}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{metrics.totalWords.toLocaleString()}</div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5 tabular-nums">
            ~{metrics.avgRead} {L("min avg read", "د متوسط القراءة", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Projects", "المشاريع", lang)}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{data.projects.length}</div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5 tabular-nums">
            {metrics.featuredProjects} {L("featured", "مميزة", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Knowledge Base", "قاعدة المعرفة", lang)}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{data.allKnowledgeRaw.length}</div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5 tabular-nums">
            {data.experience.items.length} {L("roles", "خبرات", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("GitHub Repos", "مستودعات GitHub", lang)}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{data.github.repositories.length}</div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5 tabular-nums">
            {metrics.totalStars} {L("stars", "نجمة", lang)} · {data.github.syncMeta.syncStatus}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Local Drafts", "المسودات المحلية", lang)}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{getLocalDraftCount()}</div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5">
            {metrics.allValid ? L("Schemas clean", "المخططات سليمة", lang) : `${metrics.totalErrors} ${L("errors", "أخطاء", lang)}`}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="font-display text-base font-semibold">{L("Quick Operations", "العمليات السريعة", lang)}</h2>
          <p className="text-xs text-[var(--hub-text-muted)]">
            {L("Jump directly to editorial publishing, project management, or full JSON dataset backup.", "انتقل مباشرة إلى المحرر، إدارة المشاريع، أو تصدير نسخة احتياطية كاملة.", lang)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("editor")}
            className="px-3.5 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>{L("Open Rich Editor", "فتح المحرر المتقدم", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("projects")}
            className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>{L("Manage Projects", "إدارة المشاريع", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("settings")}
            className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{L("Site Settings", "إعدادات الموقع", lang)}</span>
          </button>
          <button
            type="button"
            onClick={onExportBundle}
            className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{L("Export Full Backup", "تصدير نسخة كاملة", lang)}</span>
          </button>
        </div>
      </div>

      {/* Main Analytics + Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Content Mix & Integrity */}
        <section className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{L("Editorial Mix & Schema Integrity", "توزيع المحتوى وسلامة البيانات", lang)}</span>
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {metrics.allValid ? L("All Valid", "الكل سليم", lang) : `${metrics.totalErrors} errors`}
            </span>
          </div>

          <div className="space-y-3">
            {metrics.categoryCounts.map(([cat, count]) => {
              const pct = data.allArticlesRaw.length > 0 ? Math.round((count / data.allArticlesRaw.length) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{cat}</span>
                    <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: "var(--hub-secondary)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[var(--hub-border)] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[var(--hub-text-muted)]">
              {L("Last GitHub Sync:", "آخر مزامنة GitHub:", lang)}{" "}
              <span className="font-mono text-[var(--hub-text)]">
                {formatDateTime(data.github.syncMeta.lastSuccessfulSync, lang)}
              </span>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-600/40 text-red-700 dark:text-red-400 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{L("Reset Local Drafts", "مسح المسودات المحلية", lang)}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-600 dark:text-red-400">{L("Revert all local edits?", "تأكيد المسح؟", lang)}</span>
                <button
                  type="button"
                  onClick={async () => {
                    clearLocalDrafts();
                    await onReloadFromSource();
                    setConfirmReset(false);
                    onNotify(L("Cleared local drafts and reloaded published JSON.", "تم مسح المسودات المحلية وإعادة تحميل البيانات.", lang));
                  }}
                  className="px-2.5 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                >
                  {L("Confirm", "تأكيد", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded border border-[var(--hub-border)] cursor-pointer"
                >
                  {L("Cancel", "إلغاء", lang)}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Audit Trail & Recent Commits */}
        <section className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{L("Admin Audit Trail & Activity", "سجل عمليات الإدارة والنشاط", lang)}</span>
          </h2>

          {auditLog.length > 0 ? (
            <ul className="divide-y divide-[var(--hub-border)]">
              {auditLog.slice(0, 6).map((entry) => (
                <li key={entry.id} className="py-2.5 flex items-baseline justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--hub-text)]">{entry.action}</span>
                    <span className="text-[var(--hub-text-muted)]"> — {entry.target}</span>
                    <span className="ms-2 font-mono text-[11px] text-[var(--hub-text-muted)]">({entry.actor})</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-[var(--hub-text-muted)] shrink-0">
                    {formatDateTime(entry.timestamp, lang)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--hub-text-muted)]">
              {L("No admin edits recorded in this browser yet. Recent repository commits:", "لا توجد تعديلات محلية مسجلة بعد. أحدث التزامات المستودع:", lang)}
            </p>
          )}

          {data.github.commits.length > 0 && (
            <div className="pt-3 border-t border-[var(--hub-border)] space-y-2">
              <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                {L("Latest GitHub Commits", "أحدث التزامات GitHub", lang)}
              </div>
              <ul className="space-y-1.5 text-xs">
                {data.github.commits.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">
                      <span className="font-mono text-blue-600 dark:text-blue-400">{c.shortSha}</span> {c.message}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--hub-text-muted)] shrink-0">{c.repo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

import React, { useMemo } from "react";
import {
  BarChart3,
  BookMarked,
  FolderGit2,
  GitBranch,
  Layers,
  Library,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { computePositionSectionMetrics } from "../../utils/adminAnalytics";
import { listAdminAccounts, type AdminAuditEntry } from "../../utils/adminAuth";
import type { AdminWorkspaceSection } from "../../utils/adminPermissions";
import { formatBytesCompact } from "../../utils/analytics";
import { L } from "../../utils/i18n";

interface AdminSectionChartsProps {
  section: Exclude<AdminWorkspaceSection, "overview" | "visits">;
  data: HubDatasets;
  lang: Lang;
  auditLog?: AdminAuditEntry[];
}

const HorizontalBarRow: React.FC<{
  label: string;
  valueLabel: string;
  pct: number;
  color: string;
}> = ({ label, valueLabel, pct, color }) => (
  <div className="space-y-1 text-xs min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-medium">{label}</span>
      <span className="font-mono tabular-nums text-[var(--hub-text-muted)] shrink-0">
        {valueLabel}
      </span>
    </div>
    <svg viewBox="0 0 280 8" preserveAspectRatio="none" className="w-full h-2 block rounded-full" aria-hidden="true">
      <rect x="0" y="0" width="280" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
      <rect
        x="0"
        y="0"
        width={pct > 0 ? Math.max(8, Math.min(280, (pct / 100) * 280)) : 0}
        height="8"
        rx="4"
        fill={color}
      />
    </svg>
  </div>
);

export const AdminSectionCharts: React.FC<AdminSectionChartsProps> = ({
  section,
  data,
  lang,
  auditLog = [],
}) => {
  const accounts = useMemo(() => listAdminAccounts(), [auditLog]);
  const bundle = useMemo(
    () => computePositionSectionMetrics(data, lang, accounts, auditLog),
    [data, lang, accounts, auditLog]
  );

  return (
    <section
      data-testid={`admin-position-chart-${section}`}
      className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 sm:p-6 space-y-5 min-w-0 overflow-hidden"
    >
      {section === "editor" && (() => {
        const m = bundle.editor;
        const maxWords = Math.max(1, ...m.wordBars.map((b) => b.words));
        const maxFmt = Math.max(1, ...m.formatCounts.map((f) => f.count));
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("Editorial Output & Word Volume", "إحصائيات المقالات وحجم الكلمات", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {m.publishedCount} {L("published", "منشور", lang)} · {m.draftCount} {L("draft", "مسودة", lang)} · {m.bilingualCount}/{m.totalCount} EN+AR
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Word Count & Reading Time (Top Articles)", "عدد الكلمات ووقت القراءة", lang)}
                </div>
                {m.wordBars.map((bar) => (
                  <HorizontalBarRow
                    key={bar.id}
                    label={bar.title}
                    valueLabel={`${bar.words.toLocaleString()} w · ${bar.minutes}m`}
                    pct={Math.round((bar.words / maxWords) * 100)}
                    color={bar.status === "published" ? "#2563eb" : "#f59e0b"}
                  />
                ))}
              </div>
              <div className="lg:col-span-5 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Articles by Category Format", "المقالات حسب التصنيف", lang)}
                </div>
                {m.formatCounts.map((fmt) => (
                  <HorizontalBarRow
                    key={fmt.label}
                    label={fmt.label}
                    valueLabel={String(fmt.count)}
                    pct={Math.round((fmt.count / maxFmt) * 100)}
                    color="#10b981"
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {section === "media" && (() => {
        const m = bundle.media;
        const totalAssets = Math.max(1, m.storageMix.reduce((s, x) => s + x.count, 0));
        const maxTypeCount = Math.max(1, ...m.typeMix.map((t) => t.count));
        const colors: Record<string, string> = {
          local: "#2563eb",
          drive: "#10b981",
          github: "#8b5cf6",
        };
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("Media Storage Providers & Type Breakdown", "توزيع مصادر التخزين وأنواع الوسائط", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {data.mediaAssets.length} {L("assets", "ملفات", lang)} · {formatBytesCompact(m.totalBytes)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Assets by Storage Backend", "الملفات حسب مزود التخزين", lang)}
                </div>
                {m.storageMix.map((src) => (
                  <HorizontalBarRow
                    key={src.id}
                    label={src.label}
                    valueLabel={`${src.count} (${src.bytes > 0 ? formatBytesCompact(src.bytes) : "URL"})`}
                    pct={Math.round((src.count / totalAssets) * 100)}
                    color={colors[src.id] || "#2563eb"}
                  />
                ))}
              </div>
              <div className="lg:col-span-6 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Assets by Media Type", "الملفات حسب النوع", lang)}
                </div>
                {m.typeMix.map((t) => (
                  <HorizontalBarRow
                    key={t.type}
                    label={t.type.toUpperCase()}
                    valueLabel={`${t.count} (${t.sharePercent}%)`}
                    pct={Math.round((t.count / maxTypeCount) * 100)}
                    color="#0ea5e9"
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {section === "issues" && (() => {
        const m = bundle.issues;
        const maxCadence = Math.max(1, ...m.cadenceCounts.map((c) => c.count));
        const maxMins = Math.max(1, ...m.editionBars.map((e) => e.minutes));
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("Journal Issue Cadence & Edition Volume", "توزيع الأعداد الدورية وحجم القراءة", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {data.allIssuesRaw.length} {L("editions", "أعداد", lang)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Editions by Cadence", "الأعداد حسب الدورية", lang)}
                </div>
                {m.cadenceCounts.map((c) => (
                  <HorizontalBarRow
                    key={c.cadence}
                    label={c.cadence}
                    valueLabel={String(c.count)}
                    pct={Math.round((c.count / maxCadence) * 100)}
                    color="#2563eb"
                  />
                ))}
              </div>
              <div className="lg:col-span-7 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Reading Time & Article Count per Issue", "وقت القراءة وعدد المقالات لكل عدد", lang)}
                </div>
                {m.editionBars.length > 0 ? (
                  m.editionBars.map((ed) => (
                    <HorizontalBarRow
                      key={ed.id}
                      label={`${ed.issueNumber} — ${ed.title}`}
                      valueLabel={`${ed.articleCount} art · ${ed.minutes}m`}
                      pct={Math.round((ed.minutes / maxMins) * 100)}
                      color="#10b981"
                    />
                  ))
                ) : (
                  <p className="text-xs text-[var(--hub-text-muted)]">
                    {L("No journal issues created yet.", "لا توجد أعداد بعد.", lang)}
                  </p>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {section === "projects" && (() => {
        const m = bundle.projects;
        const maxStatus = Math.max(1, ...m.statusCounts.map((s) => s.count));
        const maxTech = Math.max(1, ...m.techCounts.map((t) => t.count));
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("Project Portfolio Status & Stack Coverage", "حالة المشاريع وتوزيع التقنيات", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {m.totalCount} {L("total", "إجمالي", lang)} · {m.featuredCount} {L("featured", "مميزة", lang)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Projects by Lifecycle Status", "المشاريع حسب الحالة", lang)}
                </div>
                {m.statusCounts.map((st) => (
                  <HorizontalBarRow
                    key={st.status}
                    label={st.status}
                    valueLabel={String(st.count)}
                    pct={Math.round((st.count / maxStatus) * 100)}
                    color="#2563eb"
                  />
                ))}
              </div>
              <div className="lg:col-span-6 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Most Used Technologies", "أبرز التقنيات المستخدمة", lang)}
                </div>
                {m.techCounts.map((tc) => (
                  <HorizontalBarRow
                    key={tc.tech}
                    label={tc.tech}
                    valueLabel={`${tc.count} proj`}
                    pct={Math.round((tc.count / maxTech) * 100)}
                    color="#10b981"
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {section === "knowledge" && (() => {
        const m = bundle.knowledge;
        const totalKnow = Math.max(1, m.personalCount + m.verifiedCount);
        const maxCat = Math.max(1, ...m.categoryCounts.map((c) => c.count));
        const maxExp = Math.max(1, ...m.experienceCounts.map((e) => e.count));
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <Library className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("Knowledge Sources & Work Experience Mix", "مصادر المعرفة وسجل الخبرات", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {m.personalCount} {L("personal", "شخصي", lang)} · {m.verifiedCount} {L("verified", "موثق", lang)} · {data.experience.items.length} {L("roles", "خبرات", lang)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Source Provenance", "نسبة المصادر", lang)}
                </div>
                <HorizontalBarRow
                  label={L("Personal Notes", "ملاحظات شخصية", lang)}
                  valueLabel={String(m.personalCount)}
                  pct={Math.round((m.personalCount / totalKnow) * 100)}
                  color="#2563eb"
                />
                <HorizontalBarRow
                  label={L("Verified References", "مراجع موثقة", lang)}
                  valueLabel={String(m.verifiedCount)}
                  pct={Math.round((m.verifiedCount / totalKnow) * 100)}
                  color="#10b981"
                />
              </div>
              <div className="lg:col-span-4 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Knowledge Categories", "تصنيفات المعرفة", lang)}
                </div>
                {m.categoryCounts.slice(0, 5).map((cat) => (
                  <HorizontalBarRow
                    key={cat.category}
                    label={cat.category}
                    valueLabel={String(cat.count)}
                    pct={Math.round((cat.count / maxCat) * 100)}
                    color="#8b5cf6"
                  />
                ))}
              </div>
              <div className="lg:col-span-4 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Experience Timeline Types", "أنواع الخبرات", lang)}
                </div>
                {m.experienceCounts.map((exp) => (
                  <HorizontalBarRow
                    key={exp.kind}
                    label={exp.kind}
                    valueLabel={String(exp.count)}
                    pct={Math.round((exp.count / maxExp) * 100)}
                    color="#f59e0b"
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {section === "github" && (() => {
        const m = bundle.github;
        const maxAct = Math.max(1, ...m.monthlyActivity.map((x) => x.count));
        const maxLang = Math.max(1, ...m.topLanguages.map((l) => l.percentage));
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("GitHub Activity & Language Distribution", "نشاط GitHub وتوزيع اللغات", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {data.github.repositories.length} {L("repos", "مستودعات", lang)} · {data.github.statistics.totalStarsReceived ?? 0}★
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)] mb-2">
                  {L("Monthly Contribution Cadence", "المساهمات الشهرية", lang)}
                </div>
                {m.monthlyActivity.length > 0 ? (
                  <div dir="ltr">
                    <svg
                      role="img"
                      aria-label={L("Monthly GitHub activity bar chart", "رسم بياني لنشاط GitHub الشهري", lang)}
                      viewBox="0 0 460 150"
                      className="w-full h-36 overflow-visible"
                    >
                      {m.monthlyActivity.map((pt, idx) => {
                        const colW = 420 / m.monthlyActivity.length;
                        const barW = Math.min(34, colW * 0.55);
                        const x = 20 + idx * colW + (colW - barW) / 2;
                        const barH = Math.max(4, (pt.count / maxAct) * 100);
                        return (
                          <g key={pt.month}>
                            <rect x={x} y={118 - barH} width={barW} height={barH} rx="3" fill="#2563eb" />
                            <text
                              x={x + barW / 2}
                              y={112 - barH}
                              textAnchor="middle"
                              fontSize="10"
                              fill="currentColor"
                              fillOpacity={0.75}
                              className="font-mono"
                            >
                              {pt.count}
                            </text>
                            <text
                              x={x + barW / 2}
                              y="138"
                              textAnchor="middle"
                              fontSize="10"
                              fill="currentColor"
                              fillOpacity={0.65}
                              className="font-mono"
                            >
                              {pt.month.slice(2)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--hub-text-muted)] py-6">
                    {L("No contribution timeline cached yet.", "لا توجد بيانات مساهمات متاحة.", lang)}
                  </p>
                )}
              </div>
              <div className="lg:col-span-5 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Top Code Languages", "أكثر اللغات استخداماً", lang)}
                </div>
                {m.topLanguages.map((l) => (
                  <HorizontalBarRow
                    key={l.language}
                    label={l.language}
                    valueLabel={`${l.percentage.toFixed(1)}%`}
                    pct={Math.round((l.percentage / maxLang) * 100)}
                    color="#10b981"
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {section === "settings" && (() => {
        const m = bundle.settings;
        const totalSeo = Math.max(1, m.seoCounts.total);
        const readyCount = m.profileReadiness.filter((p) => p.ready).length;
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <SearchCheck className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("SEO Audit & Profile Configuration Health", "سلامة SEO واكتمال الإعدادات", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {m.seoCounts.pass}/{m.seoCounts.total} SEO {L("passed", "ناجح", lang)} · {readyCount}/{m.profileReadiness.length} {L("profile", "ملف", lang)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("SEO Audit Breakdown", "توزيع فحوصات SEO", lang)}
                </div>
                <HorizontalBarRow
                  label={L("Passed Checks", "فحوصات ناجحة", lang)}
                  valueLabel={`${m.seoCounts.pass}/${m.seoCounts.total}`}
                  pct={Math.round((m.seoCounts.pass / totalSeo) * 100)}
                  color="#16a34a"
                />
                <HorizontalBarRow
                  label={L("Warnings", "تحذيرات", lang)}
                  valueLabel={`${m.seoCounts.warn}/${m.seoCounts.total}`}
                  pct={Math.round((m.seoCounts.warn / totalSeo) * 100)}
                  color="#d97706"
                />
                <HorizontalBarRow
                  label={L("Needs Action", "أخطاء", lang)}
                  valueLabel={`${m.seoCounts.fail}/${m.seoCounts.total}`}
                  pct={Math.round((m.seoCounts.fail / totalSeo) * 100)}
                  color="#dc2626"
                />
              </div>
              <div className="lg:col-span-6 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Site & Profile Field Coverage", "اكتمال بيانات الهوية والموقع", lang)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {m.profileReadiness.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[var(--hub-border)] hub-subtle p-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="truncate">{item.label}</span>
                      <span
                        className={`font-mono font-semibold ${
                          item.ready
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {item.ready ? "OK" : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {section === "access" && (() => {
        const m = bundle.access;
        const maxOpCount = Math.max(1, accounts.length);
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
                <span>{L("Administrator Positions & Module Coverage", "صلاحيات الأدوار وتغطية الأقسام", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {accounts.length} {L("administrators", "مسؤولين", lang)} · {auditLog.length} {L("audit events", "أحداث تدقيق", lang)}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Accounts by Position", "الحسابات حسب الدور", lang)}
                </div>
                {m.roleCounts.map((r) => (
                  <HorizontalBarRow
                    key={r.role}
                    label={r.role}
                    valueLabel={String(r.count)}
                    pct={Math.round((r.count / maxOpCount) * 100)}
                    color={r.role === "Owner" ? "#2563eb" : r.role === "Managing Editor" ? "#10b981" : "#f59e0b"}
                  />
                ))}
              </div>
              <div className="lg:col-span-7 space-y-2.5 min-w-0">
                <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Workspace Module Access per Administrator", "الأقسام المتاحة لكل مسؤول", lang)}
                </div>
                {m.operatorCoverage.map((op) => (
                  <HorizontalBarRow
                    key={op.id}
                    label={`${op.displayName} (@${op.username} · ${op.role})`}
                    valueLabel={`${op.moduleCount}/${op.totalModules}`}
                    pct={Math.round((op.moduleCount / op.totalModules) * 100)}
                    color="#2563eb"
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}
    </section>
  );
};

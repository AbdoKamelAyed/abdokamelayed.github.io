import React, { useMemo } from "react";
import { BarChart3, BookOpen, Code2, GitBranch, Layers, ShieldCheck, Tag } from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import {
  computeAdminChartMetrics,
  computeRoleDashboardMetrics,
} from "../../utils/adminAnalytics";
import type { AdminAccountRecord, AdminAuditEntry } from "../../utils/adminAuth";
import type { AdminRole } from "../../utils/adminPermissions";
import { formatBytesCompact } from "../../utils/analytics";
import { L } from "../../utils/i18n";

const MEDIA_COLORS: Record<string, string> = {
  pdf: "#2563eb",
  image: "#0ea5e9",
  video: "#f59e0b",
  audio: "#10b981",
  code: "#8b5cf6",
};

const ROLE_COLORS: Record<AdminRole, string> = {
  Owner: "#2563eb",
  "Managing Editor": "#10b981",
  Author: "#f59e0b",
};

export const AdminCharts: React.FC<{
  data: HubDatasets;
  lang: Lang;
  role?: AdminRole;
  accounts?: AdminAccountRecord[];
  auditLog?: AdminAuditEntry[];
}> = ({ data, lang, role = "Owner", accounts = [], auditLog = [] }) => {
  const metrics = useMemo(() => computeAdminChartMetrics(data), [data]);
  const roleMetrics = useMemo(
    () => computeRoleDashboardMetrics(data, role, lang, accounts, auditLog),
    [data, role, lang, accounts, auditLog]
  );

  const maxTimeline = Math.max(1, ...metrics.timeline.map((t) => t.total));
  const topLanguages = data.github.languages.languages.slice(0, 6);
  const maxLangPct = Math.max(1, ...topLanguages.map((l) => l.percentage));
  const maxRepoMetric = Math.max(
    1,
    ...metrics.topRepos.map((r) => (r.stars > 0 ? r.stars : r.sizeKb))
  );
  const useStarsMetric = metrics.topRepos.some((r) => r.stars > 0);
  const totalMediaCount = metrics.mediaMix.reduce((s, m) => s + m.count, 0);
  const maxWords = Math.max(1, ...roleMetrics.articleDepths.map((a) => a.words));
  const maxTopic = Math.max(1, ...roleMetrics.topTopics.map((t) => t.count));
  const maxFormat = Math.max(1, ...roleMetrics.formatBreakdown.map((f) => f.count));
  const totalAccounts = Math.max(1, accounts.length);

  return (
    <section
      data-testid="admin-analytics-charts"
      data-role-charts={role}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Shared / Role-Relevant Publishing Timeline (All Positions) */}
      <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
            <span>
              {role === "Author"
                ? L("Authoring & Note Velocity", "وتيرة التأليف والملاحظات", lang)
                : role === "Managing Editor"
                ? L("Editorial Pipeline Velocity", "وتيرة النشر التحريري", lang)
                : L("Publishing & Content Timeline", "الخط الزمني للنشر والمحتوى", lang)}
            </span>
          </h2>
          <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--hub-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
              {L("Articles", "مقالات", lang)}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              {L("Projects", "مشاريع", lang)}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              {L("Other", "أخرى", lang)}
            </span>
          </div>
        </div>

        {metrics.timeline.length > 0 ? (
          <div dir="ltr" className="pt-2">
            <svg
              role="img"
              aria-label={L("Monthly content publishing chart", "رسم بياني للنشر الشهري", lang)}
              viewBox="0 0 520 190"
              className="w-full h-48 overflow-visible"
            >
              {[0, 0.5, 1].map((tick, idx) => {
                const y = 148 - tick * 124;
                const val = Math.round(maxTimeline * tick);
                return (
                  <g key={idx}>
                    <line
                      x1="32"
                      y1={y}
                      x2="510"
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.12}
                      strokeDasharray={tick === 0 ? undefined : "3 3"}
                    />
                    <text
                      x="26"
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="currentColor"
                      fillOpacity={0.6}
                      className="font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {metrics.timeline.map((point, idx) => {
                const colWidth = 468 / metrics.timeline.length;
                const barWidth = Math.min(34, colWidth * 0.56);
                const x = 40 + idx * colWidth + (colWidth - barWidth) / 2;
                const artH = (point.articles / maxTimeline) * 124;
                const projH = (point.projects / maxTimeline) * 124;
                const otherH = ((point.issues + point.knowledge) / maxTimeline) * 124;
                const baseY = 148;
                return (
                  <g key={point.month}>
                    <rect x={x} y={baseY - artH} width={barWidth} height={artH} rx="3" fill="#2563eb" />
                    <rect x={x} y={baseY - artH - projH} width={barWidth} height={projH} rx="2" fill="#10b981" />
                    <rect x={x} y={baseY - artH - projH - otherH} width={barWidth} height={otherH} rx="2" fill="#f59e0b" />
                    <text
                      x={x + barWidth / 2}
                      y={baseY - artH - projH - otherH - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      fillOpacity={0.75}
                      className="font-mono"
                    >
                      {point.total}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="168"
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      fillOpacity={0.65}
                      className="font-mono"
                    >
                      {point.month.slice(2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <p className="text-xs text-[var(--hub-text-muted)] py-8 text-center">
            {L("No timestamped records available yet.", "لا توجد بيانات مؤرخة للعرض بعد.", lang)}
          </p>
        )}

        <div className="pt-3 border-t border-[var(--hub-border)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {metrics.publishHealth.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="text-[var(--hub-text-muted)]">{row.label}</div>
              <div className="font-mono font-bold tabular-nums">
                {row.published}{" "}
                <span className="font-normal text-[var(--hub-text-muted)]">/ {row.published + row.draft}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Position-Specific Second Chart */}
      {role === "Owner" && (
        <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
              <span>{L("Repository & Language Telemetry", "تحليلات المستودعات واللغات", lang)}</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
              {useStarsMetric ? L("By stars", "حسب النجوم", lang) : L("By repository size", "حسب الحجم", lang)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2.5 min-w-0">
              <div className="text-xs font-semibold text-[var(--hub-text-muted)] inline-flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>{L("Code Languages Share", "نسب لغات البرمجة", lang)}</span>
              </div>
              <div className="space-y-2">
                {topLanguages.map((langItem) => {
                  const barPct = Math.round((langItem.percentage / maxLangPct) * 100);
                  return (
                    <div key={langItem.id} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono truncate">{langItem.language}</span>
                        <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">
                          {langItem.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="w-full h-2 block rounded-full" aria-hidden="true">
                        <rect x="0" y="0" width="200" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                        <rect x="0" y="0" width={Math.max(6, (barPct / 100) * 200)} height="8" rx="4" fill="var(--hub-secondary)" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 min-w-0">
              <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                {L("Top Repositories", "أبرز المستودعات", lang)}
              </div>
              <div className="space-y-2">
                {metrics.topRepos.slice(0, 6).map((repo) => {
                  const metricValue = useStarsMetric ? repo.stars : repo.sizeKb;
                  const pct = Math.max(8, Math.round((metricValue / maxRepoMetric) * 100));
                  return (
                    <div key={repo.id} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono truncate">{repo.name}</span>
                        <span className="font-mono tabular-nums text-[var(--hub-text-muted)] shrink-0">
                          {useStarsMetric ? `${repo.stars}★` : `${repo.sizeKb} KB`}
                        </span>
                      </div>
                      <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="w-full h-2 block rounded-full" aria-hidden="true">
                        <rect x="0" y="0" width="200" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                        <rect x="0" y="0" width={Math.max(6, (pct / 100) * 200)} height="8" rx="4" fill="#10b981" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {role === "Managing Editor" && (
        <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
              <span>{L("Article Depth & Reading Load", "عمق المقالات ووقت القراءة", lang)}</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
              {L("Top 6 by word count", "أطول 6 مقالات", lang)}
            </span>
          </div>
          <div className="space-y-3">
            {roleMetrics.articleDepths.map((art) => {
              const pct = Math.max(8, Math.round((art.words / maxWords) * 100));
              return (
                <div key={art.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{art.title}</span>
                    <span className="font-mono tabular-nums text-[var(--hub-text-muted)] shrink-0">
                      {art.words.toLocaleString()} w · {art.minutes}m
                    </span>
                  </div>
                  <svg viewBox="0 0 320 8" preserveAspectRatio="none" className="w-full h-2 block rounded-full" aria-hidden="true">
                    <rect x="0" y="0" width="320" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(10, (pct / 100) * 320)}
                      height="8"
                      rx="4"
                      fill={art.status === "published" ? "#2563eb" : "#f59e0b"}
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {role === "Author" && (
        <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
              <span>{L("Topic & Format Coverage", "تغطية المواضيع والصيغ", lang)}</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
              {roleMetrics.formatBreakdown.length} {L("formats", "صيغ", lang)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2.5 min-w-0">
              <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                {L("Recurring Tags", "أكثر الوسوم تكراراً", lang)}
              </div>
              <div className="space-y-2">
                {roleMetrics.topTopics.map((item) => {
                  const pct = Math.max(10, Math.round((item.count / maxTopic) * 100));
                  return (
                    <div key={item.topic} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono truncate">{item.topic}</span>
                        <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">{item.count}</span>
                      </div>
                      <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="w-full h-2 block rounded-full" aria-hidden="true">
                        <rect x="0" y="0" width="200" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                        <rect x="0" y="0" width={Math.max(8, (pct / 100) * 200)} height="8" rx="4" fill="#2563eb" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2.5 min-w-0">
              <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
                {L("Articles by Format", "المقالات حسب التصنيف", lang)}
              </div>
              <div className="space-y-2">
                {roleMetrics.formatBreakdown.map((f) => {
                  const pct = Math.max(10, Math.round((f.count / maxFormat) * 100));
                  return (
                    <div key={f.format} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono truncate">{f.format}</span>
                        <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">{f.count}</span>
                      </div>
                      <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="w-full h-2 block rounded-full" aria-hidden="true">
                        <rect x="0" y="0" width="200" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                        <rect x="0" y="0" width={Math.max(8, (pct / 100) * 200)} height="8" rx="4" fill="#10b981" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Owner Governance Chart + Media Mix across bottom row */}
      {role === "Owner" && (
        <div className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
              <span>{L("Administrator Position Mix", "توزيع الأدوار الإدارية", lang)}</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
              {accounts.length} {L("accounts", "حسابات", lang)}
            </span>
          </div>
          <div className="space-y-3">
            {roleMetrics.roleDistribution.map((item) => {
              const pct = accounts.length > 0 ? Math.round((item.count / totalAccounts) * 100) : 0;
              return (
                <div key={item.role} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{item.role}</span>
                    <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <svg viewBox="0 0 260 10" preserveAspectRatio="none" className="w-full h-2.5 block rounded-full" aria-hidden="true">
                    <rect x="0" y="0" width="260" height="10" rx="5" fill="currentColor" fillOpacity={0.1} />
                    <rect
                      x="0"
                      y="0"
                      width={pct > 0 ? Math.max(10, (pct / 100) * 260) : 0}
                      height="10"
                      rx="5"
                      fill={ROLE_COLORS[item.role]}
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Media Library Composition Chart (Full width for Editor/Author, 7 cols for Owner) */}
      <div
        className={`${
          role === "Owner" ? "lg:col-span-7" : "lg:col-span-12"
        } rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4 min-w-0 overflow-hidden`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
            <span>{L("Media Library & Storage Mix", "توزيع مكتبة الوسائط والتخزين", lang)}</span>
          </h2>
          <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
            {totalMediaCount} {L("total registered assets", "إجمالي العناصر المسجلة", lang)}
          </span>
        </div>

        <svg
          role="img"
          aria-label={L("Media library storage distribution bar", "توزيع أنواع الوسائط", lang)}
          viewBox="0 0 800 18"
          preserveAspectRatio="none"
          className="w-full h-4 rounded-lg overflow-hidden block"
        >
          <rect x="0" y="0" width="800" height="18" fill="currentColor" fillOpacity={0.08} />
          {(() => {
            let offsetX = 0;
            return metrics.mediaMix.map((bucket) => {
              const width = totalMediaCount > 0 ? (bucket.count / totalMediaCount) * 800 : 0;
              const x = offsetX;
              offsetX += width;
              if (width <= 0) return null;
              return (
                <rect
                  key={bucket.type}
                  x={x}
                  y="0"
                  width={width}
                  height="18"
                  fill={MEDIA_COLORS[bucket.type] || "#64748b"}
                />
              );
            });
          })()}
        </svg>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {metrics.mediaMix.map((bucket) => (
            <div
              key={bucket.type}
              className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono uppercase font-semibold">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: MEDIA_COLORS[bucket.type] || "#64748b" }}
                  />
                  {bucket.type}
                </span>
                <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {bucket.sharePercent}%
                </span>
              </div>
              <div className="font-mono text-base font-bold tabular-nums">{bucket.count}</div>
              <div className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)]">
                {bucket.bytes > 0 ? formatBytesCompact(bucket.bytes) : L("URL / Inline", "رابط / مضمن", lang)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

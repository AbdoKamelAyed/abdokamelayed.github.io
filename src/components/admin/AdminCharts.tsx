import React, { useMemo } from "react";
import { BarChart3, Code2, GitBranch, Layers } from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { computeAdminChartMetrics } from "../../utils/adminAnalytics";
import { formatBytesCompact } from "../../utils/analytics";
import { L } from "../../utils/i18n";

const MEDIA_COLORS: Record<string, string> = {
  pdf: "#2563eb",
  image: "#0ea5e9",
  video: "#f59e0b",
  audio: "#10b981",
  code: "#8b5cf6",
};

export const AdminCharts: React.FC<{
  data: HubDatasets;
  lang: Lang;
}> = ({ data, lang }) => {
  const metrics = useMemo(() => computeAdminChartMetrics(data), [data]);

  const maxTimeline = Math.max(
    1,
    ...metrics.timeline.map((t) => t.total)
  );
  const topLanguages = data.github.languages.languages.slice(0, 6);
  const maxLangPct = Math.max(1, ...topLanguages.map((l) => l.percentage));
  const maxRepoMetric = Math.max(
    1,
    ...metrics.topRepos.map((r) => (r.stars > 0 ? r.stars : r.sizeKb))
  );
  const useStarsMetric = metrics.topRepos.some((r) => r.stars > 0);
  const totalMediaCount = metrics.mediaMix.reduce((s, m) => s + m.count, 0);

  return (
    <section
      data-testid="admin-analytics-charts"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* 1. Monthly Publishing Velocity Stacked Bar Chart */}
      <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Publishing & Content Timeline", "الخط الزمني للنشر والمحتوى", lang)}</span>
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
                    <rect
                      x={x}
                      y={baseY - artH}
                      width={barWidth}
                      height={artH}
                      rx="3"
                      fill="#2563eb"
                    />
                    <rect
                      x={x}
                      y={baseY - artH - projH}
                      width={barWidth}
                      height={projH}
                      rx="2"
                      fill="#10b981"
                    />
                    <rect
                      x={x}
                      y={baseY - artH - projH - otherH}
                      width={barWidth}
                      height={otherH}
                      rx="2"
                      fill="#f59e0b"
                    />
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

        {/* Publication Readiness Bars */}
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

      {/* 2. GitHub Languages & Top Repository Telemetry Chart */}
      <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Repository & Language Telemetry", "تحليلات المستودعات واللغات", lang)}</span>
          </h2>
          <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
            {useStarsMetric ? L("By stars", "حسب النجوم", lang) : L("By repository size", "حسب الحجم", lang)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Languages Distribution */}
          <div className="space-y-2.5">
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
                    <svg viewBox="0 0 200 8" className="w-full h-2 block" aria-hidden="true">
                      <rect x="0" y="0" width="200" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                      <rect
                        x="0"
                        y="0"
                        width={Math.max(6, (barPct / 100) * 200)}
                        height="8"
                        rx="4"
                        fill="var(--hub-secondary)"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Repositories Bar Chart */}
          <div className="space-y-2.5">
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
                    <svg viewBox="0 0 200 8" className="w-full h-2 block" aria-hidden="true">
                      <rect x="0" y="0" width="200" height="8" rx="4" fill="currentColor" fillOpacity={0.1} />
                      <rect
                        x="0"
                        y="0"
                        width={Math.max(6, (pct / 100) * 200)}
                        height="8"
                        rx="4"
                        fill="#10b981"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Media Library Composition Bar Chart */}
      <div className="lg:col-span-12 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Media Library & Storage Mix", "توزيع مكتبة الوسائط والتخزين", lang)}</span>
          </h2>
          <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
            {totalMediaCount} {L("total registered assets", "إجمالي العناصر المسجلة", lang)}
          </span>
        </div>

        {/* Proportional SVG Stacked Strip */}
        <svg
          role="img"
          aria-label={L("Media library storage distribution bar", "توزيع أنواع الوسائط", lang)}
          viewBox="0 0 800 18"
          className="w-full h-4 rounded-lg overflow-hidden"
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
              <div className="font-mono text-base font-bold tabular-nums">
                {bucket.count}
              </div>
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

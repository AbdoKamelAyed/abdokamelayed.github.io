import React, { useMemo, useState } from "react";
import { Activity, Download, Globe, Laptop, RotateCcw, Users } from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { formatDateTime, L } from "../../utils/i18n";
import {
  exportVisitsCsv,
  getAdminVisitAnalytics,
  type VisitInsightsStore,
} from "../../utils/visitInsights";

interface AdminVisitInsightsPanelProps {
  data: HubDatasets;
  lang: Lang;
  visitStore: VisitInsightsStore;
  onResetVisits: () => void;
  onAudit: (action: string, target: string) => void;
  onNotify: (msg: string) => void;
}

export const AdminVisitInsightsPanel: React.FC<AdminVisitInsightsPanelProps> = ({
  data,
  lang,
  visitStore,
  onResetVisits,
  onAudit,
  onNotify,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const analytics = useMemo(
    () => getAdminVisitAnalytics(visitStore, data.allArticlesRaw, data.projects, lang, 7),
    [visitStore, data.allArticlesRaw, data.projects, lang]
  );

  const maxDaily = Math.max(1, ...analytics.dailyTrend.map((d) => d.count));

  const handleDownloadCsv = () => {
    const csv = exportVisitsCsv(visitStore);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `abdo-hub-visits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onAudit("Exported Visit Insights CSV", `${analytics.totalVisits} visits`);
  };

  return (
    <div className="space-y-6" data-testid="admin-visit-insights-panel">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">
            {L("Total Recorded Visits", "إجمالي الزيارات المسجلة", lang)}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums" data-testid="admin-visits-total">
            {analytics.totalVisits}
          </div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5">
            {L("Excludes Admin routes", "يستثني مسارات الإدارة", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">
            {L("Unique Reader Sessions", "جلسات الزوار الفريدة", lang)}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
            {analytics.uniqueSessions}
          </div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5">
            {L("Session-tracked visitors", "جلسات متصفح مميزة", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">
            {L("Today's Pageviews", "زيارات اليوم", lang)}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
            {analytics.todayVisits}
          </div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5">
            {L("Current UTC day", "اليوم الحالي", lang)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-surface p-4">
          <div className="text-xs text-[var(--hub-text-muted)]">
            {L("Average Visits / Active Day", "متوسط الزيارات يومياً", lang)}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
            {analytics.avgDailyVisits}
          </div>
          <div className="text-[11px] text-[var(--hub-text-muted)] mt-0.5">
            {analytics.topRoutes[0]?.path || "#/"} {L("top route", "أكثر مسار", lang)}
          </div>
        </div>
      </div>

      {/* Actions & 7-Day Trend Chart */}
      <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--hub-secondary)]" />
              <span>{L("7-Day Visitor Traffic Trend", "اتجاه الزيارات خلال آخر 7 أيام", lang)}</span>
            </h2>
            <p className="text-xs text-[var(--hub-text-muted)]">
              {L(
                "Detailed route hits, reader session distributions, devices, and referral sources.",
                "بيانات الزيارات التفصيلية، توزيع الجلسات، الأجهزة، ومصادر الإحالة.",
                lang
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="export-visits-csv-btn"
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--hub-secondary)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{L("Export CSV", "تصدير CSV", lang)}</span>
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3.5 py-2 rounded-lg border border-red-600/40 text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{L("Reset Visit Log", "تصفير سجل الزيارات", lang)}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onResetVisits();
                    setConfirmReset(false);
                    onAudit("Reset Visit Insights Store", "Cleared visitor telemetry");
                    onNotify(L("Visitor insights data reset.", "تم تصفير بيانات الزيارات.", lang));
                  }}
                  className="px-2.5 py-1.5 rounded bg-red-600 text-white font-semibold cursor-pointer"
                >
                  {L("Confirm Reset", "تأكيد التصفير", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1.5 rounded border border-[var(--hub-border)] cursor-pointer"
                >
                  {L("Cancel", "إلغاء", lang)}
                </button>
              </div>
            )}
          </div>
        </div>

        <div dir="ltr" className="pt-2">
          <svg
            role="img"
            aria-label={L("7-day visit trend chart", "مخطط الزيارات لسبعة أيام", lang)}
            viewBox="0 0 560 155"
            className="w-full h-40 overflow-visible"
          >
            {analytics.dailyTrend.map((pt, idx) => {
              const colW = 520 / analytics.dailyTrend.length;
              const barW = Math.min(42, colW * 0.56);
              const x = 20 + idx * colW + (colW - barW) / 2;
              const barH = pt.count > 0 ? Math.max(8, (pt.count / maxDaily) * 100) : 3;
              return (
                <g key={pt.dateKey}>
                  <rect
                    x={x}
                    y={118 - barH}
                    width={barW}
                    height={barH}
                    rx="4"
                    fill={pt.count > 0 ? "var(--hub-secondary)" : "currentColor"}
                    fillOpacity={pt.count > 0 ? 0.92 : 0.14}
                  />
                  <text
                    x={x + barW / 2}
                    y={111 - barH}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                    fillOpacity={0.8}
                    className="font-mono"
                  >
                    {pt.count}
                  </text>
                  <text
                    x={x + barW / 2}
                    y="139"
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    fillOpacity={0.65}
                    className="font-mono"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* Top Routes, Top Articles, Top Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3 min-w-0">
          <h3 className="font-display text-base font-semibold">
            {L("Top Visited Routes", "أكثر المسارات زيارة", lang)}
          </h3>
          {analytics.topRoutes.length === 0 ? (
            <p className="text-xs text-[var(--hub-text-muted)]">{L("No routes recorded yet.", "لا توجد مسارات مسجلة بعد.", lang)}</p>
          ) : (
            <ul className="space-y-2.5 text-xs">
              {analytics.topRoutes.map((r) => (
                <li key={r.path} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{r.path}</span>
                    <span className="font-mono tabular-nums text-[var(--hub-text-muted)] shrink-0">
                      {r.count} ({r.sharePercent}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--hub-secondary)]" style={{ width: `${r.sharePercent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3 min-w-0">
          <h3 className="font-display text-base font-semibold">
            {L("Most Read Articles", "المقالات الأكثر قراءة", lang)}
          </h3>
          {analytics.topArticles.length === 0 ? (
            <p className="text-xs text-[var(--hub-text-muted)]">{L("No article views recorded yet.", "لا توجد مشاهدات مقالات بعد.", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)] text-xs">
              {analytics.topArticles.map((art) => (
                <li key={art.slugOrId} className="py-2 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{art.title}</span>
                  <span className="font-mono tabular-nums text-[var(--hub-secondary)] shrink-0">
                    {art.views} {L("views", "مشاهدة", lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3 min-w-0">
          <h3 className="font-display text-base font-semibold">
            {L("Top Viewed Projects", "المشاريع الأكثر مشاهدة", lang)}
          </h3>
          {analytics.topProjects.length === 0 ? (
            <p className="text-xs text-[var(--hub-text-muted)]">{L("No project views recorded yet.", "لا توجد مشاهدات مشاريع بعد.", lang)}</p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)] text-xs">
              {analytics.topProjects.map((proj) => (
                <li key={proj.slugOrId} className="py-2 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{proj.title}</span>
                  <span className="font-mono tabular-nums text-[var(--hub-secondary)] shrink-0">
                    {proj.views} {L("views", "مشاهدة", lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Devices, Languages, Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold inline-flex items-center gap-1.5">
            <Laptop className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Device Breakdown", "توزيع الأجهزة", lang)}</span>
          </h3>
          <ul className="space-y-2 text-xs">
            {analytics.deviceSplit.map((d) => (
              <li key={d.device} className="flex items-center justify-between">
                <span className="capitalize">{d.device}</span>
                <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {d.count} ({d.sharePercent}%)
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold inline-flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Language Split", "توزيع اللغة", lang)}</span>
          </h3>
          <ul className="space-y-2 text-xs">
            {analytics.languageSplit.map((l) => (
              <li key={l.lang} className="flex items-center justify-between">
                <span>{l.lang === "ar" ? "العربية (AR)" : "English (EN)"}</span>
                <span className="font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {l.count} ({l.sharePercent}%)
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold inline-flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>{L("Referrer Sources", "مصادر الإحالة", lang)}</span>
          </h3>
          {analytics.referrerSplit.length === 0 ? (
            <p className="text-xs text-[var(--hub-text-muted)]">{L("No referrers logged yet.", "لا توجد إحالات مسجلة.", lang)}</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {analytics.referrerSplit.map((ref) => (
                <li key={ref.host} className="flex items-center justify-between gap-2">
                  <span className="font-mono truncate">{ref.host}</span>
                  <span className="font-mono tabular-nums text-[var(--hub-text-muted)] shrink-0">
                    {ref.count} ({ref.sharePercent}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent Visit Stream */}
      <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
        <h3 className="font-display text-base font-semibold">
          {L("Recent Public Visit Events", "أحدث أحداث الزيارة العامة", lang)}
        </h3>
        {analytics.recentEvents.length === 0 ? (
          <p className="text-xs text-[var(--hub-text-muted)]">{L("No visits recorded yet.", "لا توجد زيارات مسجلة بعد.", lang)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-[var(--hub-border)] text-[var(--hub-text-muted)]">
                  <th className="py-2 pe-3 font-medium text-start">{L("Time", "الوقت", lang)}</th>
                  <th className="py-2 pe-3 font-medium text-start">{L("Route", "المسار", lang)}</th>
                  <th className="py-2 pe-3 font-medium text-start">{L("Title", "العنوان", lang)}</th>
                  <th className="py-2 pe-3 font-medium text-start">{L("Device", "الجهاز", lang)}</th>
                  <th className="py-2 pe-3 font-medium text-start">{L("Lang", "اللغة", lang)}</th>
                  <th className="py-2 font-medium text-start">{L("Referrer", "المصدر", lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hub-border)]">
                {analytics.recentEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2 pe-3 font-mono whitespace-nowrap text-[var(--hub-text-muted)]">
                      {formatDateTime(ev.timestamp, lang)}
                    </td>
                    <td className="py-2 pe-3 font-mono whitespace-nowrap">{ev.path}</td>
                    <td className="py-2 pe-3 max-w-[240px] truncate">{ev.title}</td>
                    <td className="py-2 pe-3 capitalize">{ev.device}</td>
                    <td className="py-2 pe-3 font-mono uppercase">{ev.lang}</td>
                    <td className="py-2 font-mono">{ev.referrerHost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

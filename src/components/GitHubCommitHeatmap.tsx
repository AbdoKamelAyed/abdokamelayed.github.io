import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ArrowUpRight, Calendar, Flame, GitCommitHorizontal } from "lucide-react";
import type {
  GitHubActivity,
  GitHubCommit,
  GitHubContributions,
  Lang,
} from "../types/hub";
import {
  buildGitHubHeatmapModel,
  formatHeatmapDateLabel,
  getHeatmapSourceNote,
  type HeatmapDayCell,
  type HeatmapViewMode,
} from "../utils/githubHeatmap";
import { safeUrl, summarizeMonthlyContributions } from "../utils/analytics";
import { L, t } from "../utils/i18n";

const LIGHT_LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "#eef2f6",
  1: "#bbf7d0",
  2: "#4ade80",
  3: "#16a34a",
  4: "#166534",
};

const DARK_LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "#1a2230",
  1: "#064e3b",
  2: "#047857",
  3: "#10b981",
  4: "#34d399",
};

function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export const GitHubCommitHeatmap: React.FC<{
  contributions: GitHubContributions;
  commits: GitHubCommit[];
  activity: GitHubActivity[];
  lang: Lang;
}> = ({ contributions, commits, activity, lang }) => {
  const [mode, setMode] = useState<HeatmapViewMode>("combined");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDayCell | null>(null);

  const isDark = useIsDarkTheme();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);
  const weekdaySvgRef = useRef<SVGSVGElement | null>(null);

  const model = useMemo(
    () =>
      buildGitHubHeatmapModel({
        contributions,
        commits,
        activity,
        mode,
        lang,
      }),
    [contributions, commits, activity, mode, lang]
  );

  const monthly = useMemo(
    () => summarizeMonthlyContributions(contributions),
    [contributions]
  );

  // Default inspected day is either hovered, clicked/selected, or peak active day
  const selectedDay = useMemo(() => {
    if (selectedDate) {
      const match = model.days.find((d) => d.date === selectedDate);
      if (match) return match;
    }
    return model.peakDay ?? model.days[model.days.length - 1] ?? null;
  }, [model.days, model.peakDay, selectedDate]);

  const inspectedDay = hoveredDay ?? selectedDay;
  const activeDate = inspectedDay?.date ?? null;

  const palette = isDark ? DARK_LEVEL_COLORS : LIGHT_LEVEL_COLORS;

  // Render 2D Calendar Heatmap using D3.js
  useEffect(() => {
    const svgEl = heatmapSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const weekCount = Math.max(1, model.weeks.length);
    const cellSize = 12;
    const cellGap = 3;
    const step = cellSize + cellGap;
    const leftMargin = 34;
    const topMargin = 20;
    const rightMargin = 8;
    const bottomMargin = 6;

    const width = leftMargin + weekCount * step + rightMargin;
    const height = topMargin + 7 * step + bottomMargin;

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const textColor = isDark ? "#94a3b8" : "#64748b";
    const zeroStroke = isDark ? "#283244" : "#dce3ec";
    const focusStroke = isDark ? "#f8fafc" : "#0f172a";

    const colorScale = d3
      .scaleOrdinal<number, string>()
      .domain([0, 1, 2, 3, 4])
      .range([palette[0], palette[1], palette[2], palette[3], palette[4]]);

    // Month labels along top axis
    svg
      .append("g")
      .attr("class", "heatmap-months")
      .selectAll("text")
      .data(model.monthLabels)
      .join("text")
      .attr("x", (d) => leftMargin + d.weekIndex * step)
      .attr("y", 12)
      .attr("fill", textColor)
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-mono)")
      .text((d) => d.label);

    // Weekday guide labels (Mon, Wed, Fri) along left axis
    const weekdayGuideIndices = [1, 3, 5];
    const weekdayGuideLabels = weekdayGuideIndices
      .map((idx) => model.weekdayPatterns.find((w) => w.weekday === idx))
      .filter((w): w is NonNullable<typeof w> => Boolean(w));

    svg
      .append("g")
      .attr("class", "heatmap-weekdays")
      .selectAll("text")
      .data(weekdayGuideLabels)
      .join("text")
      .attr("x", leftMargin - 6)
      .attr("y", (d) => topMargin + d.weekday * step + cellSize - 2)
      .attr("text-anchor", "end")
      .attr("fill", textColor)
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-mono)")
      .text((d) => d.shortLabel.slice(0, 3));

    // Grid cells
    const cellsGroup = svg.append("g").attr("class", "heatmap-cells");

    const rects = cellsGroup
      .selectAll<SVGRectElement, HeatmapDayCell>("rect.heatmap-cell")
      .data(model.days, (d) => d.date)
      .join("rect")
      .attr("class", "heatmap-cell")
      .attr("x", (d) => leftMargin + d.weekIndex * step)
      .attr("y", (d) => topMargin + d.weekday * step)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 2.5)
      .attr("ry", 2.5)
      .attr("fill", (d) => colorScale(d.level))
      .attr("stroke", (d) => {
        if (d.date === activeDate) return focusStroke;
        return d.level === 0 ? zeroStroke : "transparent";
      })
      .attr("stroke-width", (d) => (d.date === activeDate ? 1.8 : 0.75))
      .attr("tabindex", 0)
      .attr("role", "gridcell")
      .attr("data-date", (d) => d.date)
      .attr("data-count", (d) => String(d.displayCount))
      .attr("data-level", (d) => String(d.level))
      .attr(
        "aria-label",
        (d) =>
          `${d.date}: ${d.displayCount} ${
            mode === "commits"
              ? L("commits/pushes", "التزام/دفع", lang)
              : L("contributions", "مساهمة", lang)
          }`
      )
      .style("cursor", "pointer")
      .on("mouseenter", (_event, d) => {
        setHoveredDay(d);
      })
      .on("mouseleave", () => {
        setHoveredDay(null);
      })
      .on("focus", (_event, d) => {
        setHoveredDay(d);
      })
      .on("blur", () => {
        setHoveredDay(null);
      })
      .on("click", (_event, d) => {
        setSelectedDate(d.date);
      })
      .on("keydown", (event: KeyboardEvent, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedDate(d.date);
        }
      });

    rects
      .append("title")
      .text(
        (d) =>
          `${d.date}: ${d.displayCount} ${
            mode === "commits"
              ? L("commits/pushes", "التزام/دفع", lang)
              : L("contributions", "مساهمة", lang)
          }`
      );
  }, [model, activeDate, isDark, palette, mode, lang]);

  // On narrow viewports with horizontal overflow, start scrolled to the latest active months
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [model.weeks.length]);

  // Render Weekday Cadence Bar Chart using D3.js
  useEffect(() => {
    const svgEl = weekdaySvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 320;
    const height = 112;
    const margin = { top: 16, right: 8, bottom: 22, left: 8 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3
      .scaleBand<string>()
      .domain(model.weekdayPatterns.map((d) => String(d.weekday)))
      .range([0, innerWidth])
      .padding(0.28);

    const maxVal = d3.max(model.weekdayPatterns, (d) => d.count) ?? 0;
    const y = d3
      .scaleLinear()
      .domain([0, Math.max(1, maxVal)])
      .range([innerHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const axisText = isDark ? "#94a3b8" : "#64748b";
    const emptyBar = isDark ? "#1a2230" : "#eef2f6";
    const peakWeekday = model.mostActiveWeekday?.weekday;

    g.selectAll("rect.weekday-bar")
      .data(model.weekdayPatterns)
      .join("rect")
      .attr("class", "weekday-bar")
      .attr("x", (d) => x(String(d.weekday)) ?? 0)
      .attr("y", (d) => (d.count > 0 ? y(d.count) : innerHeight - 3))
      .attr("width", x.bandwidth())
      .attr("height", (d) =>
        d.count > 0 ? Math.max(4, innerHeight - y(d.count)) : 3
      )
      .attr("rx", 3)
      .attr("fill", (d) => {
        if (d.count === 0) return emptyBar;
        return d.weekday === peakWeekday ? palette[4] : palette[2];
      })
      .append("title")
      .text((d) => `${d.fullLabel}: ${d.count} (${d.sharePercent}%)`);

    // Value labels above bars
    g.selectAll("text.weekday-val")
      .data(model.weekdayPatterns)
      .join("text")
      .attr("class", "weekday-val")
      .attr("x", (d) => (x(String(d.weekday)) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => (d.count > 0 ? y(d.count) - 4 : innerHeight - 6))
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "9.5px")
      .attr("font-family", "var(--font-mono)")
      .text((d) => (d.count > 0 ? String(d.count) : "0"));

    // Day labels below bars
    g.selectAll("text.weekday-label")
      .data(model.weekdayPatterns)
      .join("text")
      .attr("class", "weekday-label")
      .attr("x", (d) => (x(String(d.weekday)) ?? 0) + x.bandwidth() / 2)
      .attr("y", innerHeight + 14)
      .attr("text-anchor", "middle")
      .attr("fill", axisText)
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-mono)")
      .text((d) => d.shortLabel.slice(0, 3));
  }, [model.weekdayPatterns, model.mostActiveWeekday, isDark, palette]);

  const legendRanges = useMemo(() => {
    const [t1, t2, t3] = model.thresholds;
    return [
      { level: 0 as const, label: "0" },
      { level: 1 as const, label: `1–${t1}` },
      { level: 2 as const, label: `${t1 + 1}–${t2}` },
      { level: 3 as const, label: `${t2 + 1}–${t3}` },
      { level: 4 as const, label: `${t3 + 1}+` },
    ];
  }, [model.thresholds]);

  return (
    <div className="space-y-6 pt-2 border-t border-[var(--hub-border)]" data-testid="github-d3-heatmap">
      {/* Mode Switcher + Live Hover / Range Readout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p className="text-xs text-[var(--hub-text-muted)]">
          {getHeatmapSourceNote(model.sourceKind, mode, lang)}{" "}
          {model.dateRange.start && model.dateRange.end && (
            <span className="font-mono tabular-nums">
              ({model.dateRange.start} → {model.dateRange.end})
            </span>
          )}
        </p>

        <div
          className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] p-0.5 self-start md:self-auto shrink-0"
          role="group"
          aria-label={L("Heatmap metric mode", "وضع مقياس الخريطة الحرارية", lang)}
        >
          <button
            type="button"
            onClick={() => setMode("combined")}
            aria-pressed={mode === "combined"}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              mode === "combined"
                ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]"
                : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
            }`}
          >
            {L("All Contributions", "كل المساهمات", lang)}
          </button>
          <button
            type="button"
            onClick={() => setMode("commits")}
            aria-pressed={mode === "commits"}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              mode === "commits"
                ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]"
                : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
            }`}
          >
            {L("Commits & Pushes", "الالتزامات والدفع", lang)}
          </button>
        </div>
      </div>

      {/* D3 Calendar SVG Canvas */}
      <div className="space-y-3">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto pb-1"
          dir="ltr"
          aria-label={L("D3 GitHub contribution heatmap grid", "شبكة خريطة المساهمات الحرارية", lang)}
        >
          <svg
            ref={heatmapSvgRef}
            role="grid"
            aria-label={L("GitHub commit activity heatmap", "خريطة نشاط الالتزامات الحرارية", lang)}
            className="w-full min-w-[780px] h-auto block select-none"
          />
        </div>

        {/* Legend & Active Cell Preview */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--hub-text-muted)]">
          <div className="font-mono tabular-nums flex items-center gap-2 min-w-0">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {inspectedDay ? (
              <span className="truncate">
                <strong className="text-[var(--hub-text)] font-semibold">
                  {formatHeatmapDateLabel(inspectedDay.date, lang)}
                </strong>
                {" · "}
                {inspectedDay.displayCount}{" "}
                {mode === "commits"
                  ? L("sampled commits/pushes", "التزام/دفع مرصود", lang)
                  : L("contributions", "مساهمة", lang)}
                {inspectedDay.repos.length > 0 && ` · ${inspectedDay.repos.join(", ")}`}
              </span>
            ) : (
              <span>{L("Select a day cell to inspect commits.", "اختر خلية يوم لعرض الالتزامات.", lang)}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" aria-label={L("Activity intensity legend", "دليل شدة النشاط", lang)}>
            <span>{L("Less", "أقل", lang)}</span>
            {legendRanges.map((item) => (
              <span
                key={item.level}
                className="h-3 w-3 rounded-[2.5px] border border-black/10 dark:border-white/10 inline-block"
                style={{ backgroundColor: palette[item.level] }}
                title={`${L("Level", "المستوى", lang)} ${item.level}: ${item.label}`}
              />
            ))}
            <span>{L("More", "أكثر", lang)}</span>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--hub-border)]">
        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">
            {mode === "commits"
              ? L("Sampled Window Activity", "نشاط العينة في النافذة", lang)
              : L("Total Contributions", "إجمالي المساهمات", lang)}
          </div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums">
            {mode === "combined" && contributions.totals?.totalContributions != null
              ? contributions.totals.totalContributions
              : model.totalCount}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)] mt-0.5">
            {model.activeDaysCount} / {model.totalDaysCount} {L("active days", "يوم نشط", lang)}
          </div>
        </div>

        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Current Streak", "السلسلة الحالية", lang)}</div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums">
            {contributions.streaks?.currentStreak ?? t("common.na", lang)}{" "}
            {contributions.streaks?.currentStreak != null ? L("days", "يوم", lang) : ""}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)] mt-0.5">
            {L("Longest:", "الأطول:", lang)}{" "}
            {contributions.streaks?.longestStreak ?? t("common.na", lang)}{" "}
            {contributions.streaks?.longestStreak != null ? L("days", "يوم", lang) : ""}
          </div>
        </div>

        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Peak Day", "ذروة النشاط اليومي", lang)}</div>
          <div className="mt-1 text-sm font-semibold font-mono tabular-nums">
            {model.peakDay
              ? `${model.peakDay.date} (${model.peakDay.displayCount})`
              : t("common.na", lang)}
          </div>
          {model.peakDay && (
            <button
              type="button"
              onClick={() => setSelectedDate(model.peakDay!.date)}
              className="mt-1 text-[11px] text-[var(--hub-secondary)] hover:underline font-medium"
            >
              {L("Inspect peak day", "معاينة يوم الذروة", lang)}
            </button>
          )}
        </div>

        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Top Weekday", "أكثر أيام الأسبوع نشاطاً", lang)}</div>
          <div className="mt-1 text-sm font-semibold font-mono tabular-nums flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {model.mostActiveWeekday
                ? `${model.mostActiveWeekday.fullLabel} (${model.mostActiveWeekday.sharePercent}%)`
                : t("common.na", lang)}
            </span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)] mt-0.5">
            {model.mostActiveWeekday
              ? `${model.mostActiveWeekday.count} ${L("events", "نشاط", lang)}`
              : ""}
          </div>
        </div>
      </div>

      {/* Selected Day Inspector + D3 Weekday Pattern Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-[var(--hub-border)]">
        {/* Selected Day Commit & Repo Breakdown */}
        <div className="lg:col-span-7 space-y-3 min-w-0" data-testid="heatmap-day-inspector">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--hub-text-muted)] flex items-center gap-1.5">
              <GitCommitHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>
                {L("Day Commit Inspector", "تفاصيل التزامات اليوم", lang)}
                {selectedDay ? ` — ${selectedDay.date}` : ""}
              </span>
            </h3>
            {selectedDay && (
              <span className="font-mono tabular-nums text-xs text-[var(--hub-text-muted)]">
                {selectedDay.contributionCount} {L("contrib", "مساهمة", lang)} ·{" "}
                {selectedDay.commitCount} {L("commits", "التزامات", lang)} ·{" "}
                {selectedDay.pushCount} {L("pushes", "دفعات", lang)}
              </span>
            )}
          </div>

          {!selectedDay ? (
            <p className="text-xs text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : selectedDay.commits.length > 0 ? (
            <ul className="divide-y divide-[var(--hub-border)] border border-[var(--hub-border)] rounded-xl bg-[var(--hub-bg)] overflow-hidden">
              {selectedDay.commits.slice(0, 5).map((c) => (
                <li key={`${c.shortSha}-${c.createdAt}`} className="px-3.5 py-2.5 flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <a
                      href={safeUrl(c.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium hover:underline inline-flex items-start gap-1 max-w-full"
                    >
                      <span className="break-words [overflow-wrap:anywhere]">{c.message}</span>
                      <ArrowUpRight className="w-3 h-3 shrink-0 mt-0.5" />
                    </a>
                    <div className="text-[11px] font-mono text-[var(--hub-text-muted)] mt-0.5">
                      {c.repo} · {c.shortSha}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3.5 py-3 text-xs text-[var(--hub-text-muted)] space-y-1">
              <div>
                {selectedDay.displayCount > 0
                  ? L(
                      `${selectedDay.displayCount} contributions recorded on ${selectedDay.date} across ${selectedDay.repos.length > 0 ? selectedDay.repos.join(", ") : "GitHub repositories"}. Detailed commit messages for older dates are outside the recent REST sample window.`,
                      `تم تسجيل ${selectedDay.displayCount} مساهمة في ${selectedDay.date}. تفاصيل رسائل الالتزامات الأقدم تقع خارج نافذة العينة الحديثة.`,
                      lang
                    )
                  : L(
                      `No recorded GitHub activity on ${selectedDay.date}. Click any highlighted square in the heatmap to inspect commits.`,
                      `لا يوجد نشاط مسجل في ${selectedDay.date}. انقر على أي مربع نشط في الخريطة لعرض الالتزامات.`,
                      lang
                    )}
              </div>
            </div>
          )}
        </div>

        {/* D3 Weekday Commit Pattern Bar Chart */}
        <div className="lg:col-span-5 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--hub-text-muted)]">
              {L("Weekly Commit Rhythm", "وتيرة النشاط الأسبوعية", lang)}
            </h3>
            <span className="text-[11px] font-mono text-[var(--hub-text-muted)]">
              {L("Sun–Sat", "أحد–سبت", lang)}
            </span>
          </div>
          <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg)] p-3" dir="ltr">
            <svg
              ref={weekdaySvgRef}
              className="w-full h-28 block"
              role="img"
              aria-label={L("Weekday commit distribution bar chart", "مخطط توزيع الالتزامات حسب أيام الأسبوع", lang)}
            />
          </div>
        </div>
      </div>

      {/* Monthly Rollup */}
      {monthly.length > 0 && (
        <div className="pt-4 border-t border-[var(--hub-border)]">
          <h3 className="text-xs font-semibold text-[var(--hub-text-muted)] mb-2">
            {L("Monthly Activity Breakdown", "توزيع النشاط الشهري", lang)}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {monthly.slice(0, 6).map((m) => (
              <div key={m.month} className="text-xs">
                <div className="font-mono text-[var(--hub-text-muted)]">{m.month}</div>
                <div className="font-mono tabular-nums font-semibold mt-0.5">{m.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

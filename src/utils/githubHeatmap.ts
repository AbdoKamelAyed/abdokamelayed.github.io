import { quantileSorted } from "d3";
import type {
  ContributionDay,
  GitHubActivity,
  GitHubCommit,
  GitHubContributions,
  Lang,
} from "../types/hub";
import { L } from "./i18n";

export type HeatmapViewMode = "combined" | "commits";

export interface HeatmapCommitSample {
  shortSha: string;
  repo: string;
  message: string;
  url: string;
  createdAt: string;
}

export interface HeatmapDayCell {
  date: string;
  weekIndex: number;
  weekday: number;
  contributionCount: number;
  commitCount: number;
  pushCount: number;
  displayCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  repos: string[];
  commits: HeatmapCommitSample[];
}

export interface HeatmapMonthLabel {
  weekIndex: number;
  monthKey: string;
  label: string;
}

export interface WeekdayPatternRow {
  weekday: number;
  shortLabel: string;
  fullLabel: string;
  count: number;
  activeDays: number;
  sharePercent: number;
}

export interface GitHubHeatmapModel {
  weeks: HeatmapDayCell[][];
  days: HeatmapDayCell[];
  monthLabels: HeatmapMonthLabel[];
  weekdayPatterns: WeekdayPatternRow[];
  totalCount: number;
  activeDaysCount: number;
  totalDaysCount: number;
  maxDailyCount: number;
  peakDay: HeatmapDayCell | null;
  mostActiveWeekday: WeekdayPatternRow | null;
  thresholds: [number, number, number, number];
  sourceKind: "graphql-calendar" | "commits-fallback";
  dateRange: { start: string; end: string };
}

const WEEKDAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const WEEKDAY_SHORT_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_SHORT_AR = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];

function extractIsoDate(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function parseUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatUtcIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeIntensityThresholds(counts: number[]): [number, number, number, number] {
  const positive = counts
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (positive.length === 0) {
    return [1, 2, 4, 8];
  }

  const maxVal = positive[positive.length - 1];
  const q25 = Math.max(1, Math.ceil(quantileSorted(positive, 0.25) ?? 1));
  const q50 = Math.max(q25 + 1, Math.ceil(quantileSorted(positive, 0.5) ?? q25 + 1));
  const q75 = Math.max(q50 + 1, Math.ceil(quantileSorted(positive, 0.75) ?? q50 + 1));
  const top = Math.max(q75, maxVal);

  return [q25, q50, q75, top];
}

export function quantizeActivityLevel(
  count: number,
  thresholds: [number, number, number, number]
): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isFinite(count) || count <= 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}

export function formatHeatmapDateLabel(isoDate: string, lang: Lang): string {
  if (!isoDate) return "";
  const dt = parseUtcDate(isoDate);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function formatMonthLabel(monthKey: string, lang: Lang): string {
  const monthNum = Number(monthKey.slice(5, 7));
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return monthKey;
  return lang === "ar" ? MONTH_SHORT_AR[monthNum - 1] : MONTH_SHORT_EN[monthNum - 1];
}

export function buildGitHubHeatmapModel(opts: {
  contributions?: GitHubContributions | null;
  commits?: GitHubCommit[];
  activity?: GitHubActivity[];
  mode?: HeatmapViewMode;
  lang?: Lang;
  fallbackWeeks?: number;
}): GitHubHeatmapModel {
  const mode: HeatmapViewMode = opts.mode ?? "combined";
  const lang: Lang = opts.lang ?? "en";
  const commits = opts.commits ?? [];
  const activity = opts.activity ?? [];
  const fallbackWeeks = Math.max(8, opts.fallbackWeeks ?? 26);

  // Index sampled commits & public activity events by YYYY-MM-DD
  const commitsByDate = new Map<string, HeatmapCommitSample[]>();
  const reposByDate = new Map<string, Set<string>>();
  const pushCountByDate = new Map<string, number>();

  for (const c of commits) {
    const iso = extractIsoDate(c.createdAt);
    if (!iso) continue;
    const list = commitsByDate.get(iso) ?? [];
    list.push({
      shortSha: c.shortSha,
      repo: c.repo,
      message: c.message,
      url: c.url,
      createdAt: c.createdAt,
    });
    commitsByDate.set(iso, list);
    const repoSet = reposByDate.get(iso) ?? new Set<string>();
    if (c.repo) repoSet.add(c.repo);
    reposByDate.set(iso, repoSet);
  }

  for (const ev of activity) {
    const iso = extractIsoDate(ev.createdAt);
    if (!iso) continue;
    if (ev.type === "PushEvent" || ev.type === "CreateEvent") {
      pushCountByDate.set(iso, (pushCountByDate.get(iso) ?? 0) + 1);
    }
    const repoSet = reposByDate.get(iso) ?? new Set<string>();
    if (ev.repo) repoSet.add(ev.repo);
    reposByDate.set(iso, repoSet);
  }

  const rawWeeks = opts.contributions?.available ? opts.contributions.calendar?.weeks : undefined;
  const hasCalendar = Boolean(rawWeeks && rawWeeks.length > 0);
  const sourceKind: GitHubHeatmapModel["sourceKind"] = hasCalendar
    ? "graphql-calendar"
    : "commits-fallback";

  let weekSkeletons: ContributionDay[][] = [];
  if (hasCalendar && rawWeeks) {
    weekSkeletons = rawWeeks.map((w) => w.contributionDays || []);
  } else {
    // Build a clean rolling calendar grid ending at the most recent commit/activity date (or today UTC)
    const candidateDates = [...commitsByDate.keys(), ...pushCountByDate.keys()].sort();
    const anchorIso =
      candidateDates.length > 0
        ? candidateDates[candidateDates.length - 1]
        : formatUtcIsoDate(new Date());
    const anchorDate = parseUtcDate(anchorIso);
    const endSaturday = new Date(anchorDate);
    endSaturday.setUTCDate(endSaturday.getUTCDate() + (6 - endSaturday.getUTCDay()));

    const startSunday = new Date(endSaturday);
    startSunday.setUTCDate(startSunday.getUTCDate() - (fallbackWeeks * 7 - 1));

    const cursor = new Date(startSunday);
    for (let w = 0; w < fallbackWeeks; w += 1) {
      const weekDays: ContributionDay[] = [];
      for (let d = 0; d < 7; d += 1) {
        const iso = formatUtcIsoDate(cursor);
        weekDays.push({
          date: iso,
          weekday: cursor.getUTCDay(),
          contributionCount: (commitsByDate.get(iso)?.length ?? 0) + (pushCountByDate.get(iso) ?? 0),
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      weekSkeletons.push(weekDays);
    }
  }

  // First pass: calculate raw displayCounts so we can compute quantile thresholds
  const provisionalWeeks = weekSkeletons.map((daysInWeek, weekIndex) =>
    daysInWeek.map((day) => {
      const date = extractIsoDate(day.date) || day.date;
      const dayCommits = commitsByDate.get(date) ?? [];
      const commitCount = dayCommits.length;
      const pushCount = pushCountByDate.get(date) ?? 0;
      const contributionCount = Math.max(0, Number(day.contributionCount) || 0);
      const sampledActivityCount = Math.max(commitCount, pushCount);
      const displayCount =
        mode === "commits"
          ? sampledActivityCount
          : sourceKind === "graphql-calendar"
            ? contributionCount
            : sampledActivityCount;

      return {
        date,
        weekIndex,
        weekday: typeof day.weekday === "number" ? day.weekday : parseUtcDate(date).getUTCDay(),
        contributionCount,
        commitCount,
        pushCount,
        displayCount,
        repos: [...(reposByDate.get(date) ?? new Set<string>())],
        commits: dayCommits,
      };
    })
  );

  const allCounts = provisionalWeeks.flatMap((w) => w.map((d) => d.displayCount));
  const thresholds = computeIntensityThresholds(allCounts);

  const weeks: HeatmapDayCell[][] = provisionalWeeks.map((week) =>
    week.map((d) => ({
      ...d,
      level: quantizeActivityLevel(d.displayCount, thresholds),
    }))
  );

  const days = weeks.flat();

  // Month boundary labels positioned on first week introducing a new month
  const monthLabels: HeatmapMonthLabel[] = [];
  let lastMonthKey = "";
  let lastLabelWeek = -10;
  weeks.forEach((week, weekIndex) => {
    const firstDay = week[0];
    if (!firstDay?.date) return;
    const monthKey = firstDay.date.slice(0, 7);
    if (monthKey !== lastMonthKey) {
      // Avoid cramming a label on leading partial months (< 3 weeks before next month)
      const twoWeeksAheadMonth = weeks[weekIndex + 2]?.[0]?.date?.slice(0, 7);
      if (weekIndex === 0 && twoWeeksAheadMonth && twoWeeksAheadMonth !== monthKey) {
        lastMonthKey = monthKey;
        return;
      }
      if (weekIndex - lastLabelWeek < 3) {
        lastMonthKey = monthKey;
        return;
      }
      lastMonthKey = monthKey;
      lastLabelWeek = weekIndex;
      monthLabels.push({
        weekIndex,
        monthKey,
        label: formatMonthLabel(monthKey, lang),
      });
    }
  });

  // Weekday rhythm aggregation
  const weekdayTotals = Array.from({ length: 7 }, () => ({ count: 0, activeDays: 0 }));
  let totalCount = 0;
  let activeDaysCount = 0;
  let peakDay: HeatmapDayCell | null = null;

  for (const cell of days) {
    totalCount += cell.displayCount;
    if (cell.displayCount > 0) {
      activeDaysCount += 1;
      if (!peakDay || cell.displayCount > peakDay.displayCount) {
        peakDay = cell;
      }
    }
    const bucket = weekdayTotals[cell.weekday];
    if (bucket) {
      bucket.count += cell.displayCount;
      if (cell.displayCount > 0) bucket.activeDays += 1;
    }
  }

  const weekdayPatterns: WeekdayPatternRow[] = weekdayTotals.map((b, weekday) => ({
    weekday,
    shortLabel: lang === "ar" ? WEEKDAY_SHORT_AR[weekday] : WEEKDAY_SHORT_EN[weekday],
    fullLabel: lang === "ar" ? WEEKDAY_NAMES_AR[weekday] : WEEKDAY_NAMES_EN[weekday],
    count: b.count,
    activeDays: b.activeDays,
    sharePercent: totalCount > 0 ? Math.round((b.count / totalCount) * 100) : 0,
  }));

  const mostActiveWeekday =
    weekdayPatterns.reduce<WeekdayPatternRow | null>((best, row) => {
      if (row.count <= 0) return best;
      if (!best || row.count > best.count) return row;
      return best;
    }, null) ?? null;

  return {
    weeks,
    days,
    monthLabels,
    weekdayPatterns,
    totalCount,
    activeDaysCount,
    totalDaysCount: days.length,
    maxDailyCount: peakDay?.displayCount ?? 0,
    peakDay,
    mostActiveWeekday,
    thresholds,
    sourceKind,
    dateRange: {
      start: days[0]?.date ?? "",
      end: days[days.length - 1]?.date ?? "",
    },
  };
}

export function getHeatmapSourceNote(
  sourceKind: GitHubHeatmapModel["sourceKind"],
  mode: HeatmapViewMode,
  lang: Lang
): string {
  if (mode === "commits") {
    return L(
      "Public commit & push density sampled across synced repositories.",
      "كثافة الالتزامات والدفع العامة المرصودة عبر المستودعات المزمنة.",
      lang
    );
  }
  if (sourceKind === "graphql-calendar") {
    return L(
      "53-week GraphQL contribution calendar enriched with repository commit samples.",
      "تقويم مساهمات GraphQL لـ 53 أسبوعاً مع تفاصيل الالتزامات المرصودة.",
      lang
    );
  }
  return L(
    "Rolling commit & event activity calendar derived from synced public repositories.",
    "تقويم نشاط الالتزامات والأحداث المستخلص من المستودعات العامة المزمنة.",
    lang
  );
}

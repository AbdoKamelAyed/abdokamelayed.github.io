import React from "react";
import type { GitHubContributions, GitHubLanguageEntry, Lang } from "../types/hub";
import { formatBytesCompact, summarizeMonthlyContributions } from "../utils/analytics";
import { L, t } from "../utils/i18n";

const PALETTE = ["#2563eb", "#0f172a", "#0284c7", "#059669", "#d97706", "#4f46e5", "#64748b"];

export const LanguageDistributionChart: React.FC<{
  languages: GitHubLanguageEntry[];
  totalBytes: number;
  lang: Lang;
}> = ({ languages, totalBytes, lang }) => {
  if (!languages.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.empty", lang)}</p>;
  }
  const top = languages.slice(0, 7);

  return (
    <div className="space-y-4">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="img"
        aria-label={L("Language distribution bar", "شريط توزيع اللغات", lang)}
      >
        {top.map((item, idx) => (
          <div
            key={item.id}
            style={{ width: `${Math.max(item.percentage, 1)}%`, backgroundColor: PALETTE[idx % PALETTE.length] }}
            title={`${item.language}: ${item.percentage}%`}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        {top.map((item, idx) => (
          <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-xs"
                style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                aria-hidden="true"
              />
              <span className="font-medium truncate">{item.language}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {item.repoCount} {L("repos", "مستودع", lang)}
              </span>
            </div>
            <div className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 shrink-0">
              {item.percentage}% · {formatBytesCompact(item.bytes)}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {L("Total tracked Linguist volume:", "إجمالي الحجم المرصود:", lang)} {formatBytesCompact(totalBytes)}
      </p>
    </div>
  );
};

export const RepoCreationChart: React.FC<{
  creationByYear: Record<string, number>;
  lang: Lang;
}> = ({ creationByYear, lang }) => {
  const years = Object.keys(creationByYear || {}).sort();
  if (!years.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.empty", lang)}</p>;
  }
  const max = Math.max(...years.map((y) => creationByYear[y]), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 h-44 pt-4 border-b border-slate-200 dark:border-slate-800">
        {years.map((yr) => {
          const val = creationByYear[yr];
          const pct = Math.max(8, Math.round((val / max) * 100));
          return (
            <div key={yr} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-200">
                {val}
              </span>
              <div
                className="w-full max-w-11 rounded-t-md bg-blue-600 dark:bg-blue-500 transition-all"
                style={{ height: `${pct}%` }}
                title={`${yr}: ${val}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3">
        {years.map((yr) => (
          <div key={yr} className="flex-1 text-center font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
            {yr}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ContributionCalendarPanel: React.FC<{
  contributions: GitHubContributions;
  lang: Lang;
}> = ({ contributions, lang }) => {
  const monthly = summarizeMonthlyContributions(contributions);

  if (!contributions?.available || !contributions.calendar?.weeks?.length) {
    return (
      <div className="space-y-5 pt-2 border-t border-[var(--hub-border)]">
        <div className="text-sm">
          <div className="font-semibold text-[var(--hub-text)]">
            {L("GraphQL Contribution Calendar: N/A (Unauthenticated Sync)", "تقويم المساهمات (GraphQL): غير متاح دون مفتاح قراءة", lang)}
          </div>
          <p className="mt-1 text-[var(--hub-text-muted)]">
            {contributions?.unavailableReason ||
              L(
                "Add a read-only GH_METRICS_TOKEN secret in GitHub Actions to populate daily GraphQL contribution heatmaps. Public repository commit samples remain visible below.",
                "أضف سر GH_METRICS_TOKEN للقراءة فقط في GitHub Actions لتعبئة خريطة المساهمات اليومية. عينات الالتزامات من المستودعات العامة متاحة بالأسفل.",
                lang
              )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--hub-border)]">
          <div>
            <div className="text-xs text-[var(--hub-text-muted)]">{L("GraphQL Contributions", "مساهمات GraphQL", lang)}</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums">{t("common.na", lang)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Current Streak", "السلسلة الحالية", lang)}</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums">{t("common.na", lang)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Longest Streak", "أطول سلسلة", lang)}</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums">{t("common.na", lang)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--hub-text-muted)]">{L("Most Active Day", "أكثر يوم نشاطاً", lang)}</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums">{t("common.na", lang)}</div>
          </div>
        </div>
      </div>
    );
  }

  const weeks = contributions.calendar.weeks;
  return (
    <div className="space-y-5 pt-2 border-t border-[var(--hub-border)]">
      <div className="overflow-x-auto pb-2">
        <div
          className="grid grid-flow-col grid-rows-7 gap-1 w-max"
          role="grid"
          aria-label={L("Contribution heatmap", "خريطة المساهمات", lang)}
        >
          {weeks.flatMap((w) =>
            w.contributionDays.map((d) => {
              const c = d.contributionCount;
              const cls =
                c === 0
                  ? "bg-slate-100 dark:bg-slate-800"
                  : c <= 2
                    ? "bg-blue-200 dark:bg-blue-900"
                    : c <= 5
                      ? "bg-blue-400 dark:bg-blue-700"
                      : c <= 10
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-blue-800 dark:bg-blue-400";
              return (
                <div
                  key={d.date}
                  className={`h-3 w-3 rounded-xs ${cls}`}
                  title={`${d.date}: ${c}`}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--hub-border)]">
        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Total Contributions", "إجمالي المساهمات", lang)}</div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums">
            {contributions.totals?.totalContributions ?? t("common.na", lang)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Current Streak", "السلسلة الحالية", lang)}</div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums">
            {contributions.streaks.currentStreak ?? t("common.na", lang)} {L("days", "يوم", lang)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Longest Streak", "أطول سلسلة", lang)}</div>
          <div className="mt-1 text-xl font-semibold font-mono tabular-nums">
            {contributions.streaks.longestStreak ?? t("common.na", lang)} {L("days", "يوم", lang)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--hub-text-muted)]">{L("Most Active Day", "أكثر يوم نشاطاً", lang)}</div>
          <div className="mt-1 text-sm font-semibold font-mono tabular-nums">
            {contributions.streaks.mostActiveDay
              ? `${contributions.streaks.mostActiveDay.date} (${contributions.streaks.mostActiveDay.contributionCount})`
              : t("common.na", lang)}
          </div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="pt-4 border-t border-[var(--hub-border)]">
          <h4 className="text-xs font-semibold text-[var(--hub-text-muted)] mb-2">
            {L("Monthly Activity Breakdown", "توزيع النشاط الشهري", lang)}
          </h4>
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

import React from "react";
import type { Lang } from "../types/hub";
import type { PrintCoverMetadata } from "../utils/printMetadata";
import { L } from "../utils/i18n";

interface PrintCoverPageProps {
  meta: PrintCoverMetadata;
  lang: Lang;
}

export const PrintCoverPage: React.FC<PrintCoverPageProps> = ({ meta, lang }) => {
  return (
    <section
      data-testid="print-cover-page"
      aria-label={L("Printable cover page", "صفحة غلاف الطباعة", lang)}
      className="hidden print:flex print-cover-page flex-col justify-between"
    >
      <div className="print-cover-top flex items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <span className="print-cover-kicker font-mono text-xs uppercase tracking-widest text-slate-600">
          {meta.kicker}
        </span>
        <span className="font-mono text-xs text-slate-600">{meta.sectionLabel}</span>
      </div>

      <div className="print-cover-center my-auto py-10 space-y-5">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {L("Publication Print Edition", "نسخة مطبوعة", lang)}
        </div>
        <div
          data-testid="print-cover-title"
          className="print-cover-title font-display font-bold tracking-tight text-slate-950"
        >
          {meta.title}
        </div>
        {meta.subtitle && (
          <p className="print-cover-subtitle text-lg text-slate-700 leading-relaxed max-w-2xl">
            {meta.subtitle}
          </p>
        )}
        {meta.summaryText && (
          <div className="print-cover-abstract mt-4 rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed max-w-2xl">
            {meta.summaryText}
          </div>
        )}
      </div>

      <div className="print-cover-meta border-t-2 border-slate-900 pt-5 grid grid-cols-3 gap-6 text-xs">
        <div>
          <div className="font-mono uppercase tracking-wider text-slate-500 mb-1">
            {L("Published / Updated", "تاريخ النشر", lang)}
          </div>
          <div data-testid="print-cover-date" className="font-semibold text-slate-900 tabular-nums">
            {meta.dateLabel}
          </div>
        </div>

        <div>
          <div className="font-mono uppercase tracking-wider text-slate-500 mb-1">
            {L("Reading Time", "وقت القراءة", lang)}
          </div>
          <div data-testid="print-cover-reading-time" className="font-semibold text-slate-900 tabular-nums">
            {meta.readingTimeLabel}
          </div>
        </div>

        <div>
          <div className="font-mono uppercase tracking-wider text-slate-500 mb-1">
            {L("Author / Attribution", "المؤلف / المصدر", lang)}
          </div>
          <div className="font-semibold text-slate-900">{meta.authorLabel}</div>
        </div>

        {meta.tagsLine && (
          <div className="col-span-3 pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-600">
            {meta.tagsLine}
          </div>
        )}
      </div>
    </section>
  );
};

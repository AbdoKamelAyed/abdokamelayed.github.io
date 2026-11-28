import React from "react";
import type { Lang } from "../types/hub";
import { L } from "../utils/i18n";

export interface LoadingSpinnerProps {
  lang?: Lang;
  label?: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-11 h-11 border-[3px]",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  lang = "en",
  label,
  size = "md",
  inline = false,
  className = "",
}) => {
  const resolvedLabel = label || L("Loading content...", "جارٍ تحميل المحتوى...", lang);

  if (inline) {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label={resolvedLabel}
        data-testid="loading-spinner"
        className={`inline-flex items-center gap-2 ${className}`}
      >
        <span
          aria-hidden="true"
          className={`${SIZE_CLASSES[size]} rounded-full border-slate-300/80 dark:border-slate-700 border-t-[var(--hub-secondary)] animate-spin motion-reduce:animate-none shrink-0`}
        />
        {label && <span className="text-xs font-medium text-[var(--hub-text-muted)]">{label}</span>}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={resolvedLabel}
      data-testid="loading-spinner"
      className={`min-h-[42vh] flex flex-col items-center justify-center gap-3.5 py-12 px-4 text-center ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden="true"
          className={`${SIZE_CLASSES[size]} rounded-full border-slate-200 dark:border-slate-800 border-t-[var(--hub-secondary)] animate-spin motion-reduce:animate-none block`}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--hub-text)]">{resolvedLabel}</p>
        <p className="text-xs font-mono text-[var(--hub-text-muted)]">
          {L("Fetching structured hub datasets", "جارٍ جلب بيانات المنصة", lang)}
        </p>
      </div>
    </div>
  );
};

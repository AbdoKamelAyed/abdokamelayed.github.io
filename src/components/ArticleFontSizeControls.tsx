import React from "react";
import { Minus, Plus, RotateCcw, Type } from "lucide-react";
import type { Lang } from "../types/hub";
import { L } from "../utils/i18n";
import {
  canStepFontScale,
  DEFAULT_FONT_SCALE,
  getFontScaleDefinition,
  type FontScale,
} from "../utils/typography";

interface ArticleFontSizeControlsProps {
  fontScale: FontScale;
  lang: Lang;
  defaultScale?: FontScale;
  onStepFontScale: (delta: -1 | 1) => void;
  onSelectFontScale: (scale: FontScale) => void;
}

export const ArticleFontSizeControls: React.FC<ArticleFontSizeControlsProps> = ({
  fontScale,
  lang,
  defaultScale = DEFAULT_FONT_SCALE,
  onStepFontScale,
  onSelectFontScale,
}) => {
  const def = getFontScaleDefinition(fontScale);
  const canDecrease = canStepFontScale(fontScale, -1);
  const canIncrease = canStepFontScale(fontScale, 1);

  return (
    <div
      data-testid="article-font-size-controls"
      role="group"
      aria-label={L("Article reading font size", "حجم خط المقال", lang)}
      className="print:hidden inline-flex items-center gap-1 rounded-lg border border-[var(--hub-border)] hub-surface px-1.5 py-1 text-xs"
    >
      <span
        className="px-1.5 inline-flex items-center gap-1 text-[var(--hub-text-muted)] whitespace-nowrap"
        title={L("Adjust article prose font size", "تغيير حجم خط نص المقال", lang)}
      >
        <Type className="w-3.5 h-3.5 text-[var(--hub-secondary)]" aria-hidden="true" />
        <span className="hidden sm:inline font-medium">{L("Text", "الخط", lang)}</span>
      </span>

      <button
        type="button"
        data-testid="article-font-decrease-btn"
        disabled={!canDecrease}
        onClick={() => onStepFontScale(-1)}
        aria-label={L("Decrease article font size", "تصغير خط المقال", lang)}
        className="h-7 px-2 rounded-md border border-[var(--hub-border)] inline-flex items-center gap-0.5 font-mono font-semibold hover:border-[var(--hub-secondary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Minus className="w-3 h-3" aria-hidden="true" />
        <span>A-</span>
      </button>

      <span
        data-testid="article-font-scale-value"
        className="px-1.5 font-mono text-[11px] font-semibold tabular-nums text-[var(--hub-text)] whitespace-nowrap"
      >
        {def.rootFontSizePx}px
      </span>

      <button
        type="button"
        data-testid="article-font-increase-btn"
        disabled={!canIncrease}
        onClick={() => onStepFontScale(1)}
        aria-label={L("Increase article font size", "تكبير خط المقال", lang)}
        className="h-7 px-2 rounded-md border border-[var(--hub-border)] inline-flex items-center gap-0.5 font-mono font-semibold hover:border-[var(--hub-secondary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <span>A+</span>
        <Plus className="w-3 h-3" aria-hidden="true" />
      </button>

      {fontScale !== defaultScale && (
        <button
          type="button"
          data-testid="article-font-reset-btn"
          onClick={() => onSelectFontScale(defaultScale)}
          aria-label={L("Reset article font size", "استعادة حجم خط المقال", lang)}
          title={L("Reset font size", "استعادة الحجم الافتراضي", lang)}
          className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

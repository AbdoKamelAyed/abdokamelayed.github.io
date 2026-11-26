import React, { useMemo, useState } from "react";
import { Check, Palette, RotateCcw, X } from "lucide-react";
import type { Lang } from "../types/hub";
import {
  DESIGN_THEMES,
  getDesignThemeById,
  getDesignThemeCategoryLabel,
  type DesignThemeCategory,
} from "../utils/designThemes";
import { L, loc } from "../utils/i18n";

interface DesignThemeDrawerProps {
  open: boolean;
  lang: Lang;
  activeThemeId: string;
  siteDefaultThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onResetToSiteDefault: () => void;
  onClose: () => void;
}

const CATEGORIES: (DesignThemeCategory | "all")[] = [
  "all",
  "editorial",
  "minimal",
  "technical",
  "expressive",
];

export const DesignThemeDrawer: React.FC<DesignThemeDrawerProps> = ({
  open,
  lang,
  activeThemeId,
  siteDefaultThemeId,
  onSelectTheme,
  onResetToSiteDefault,
  onClose,
}) => {
  const [category, setCategory] = useState<DesignThemeCategory | "all">("all");
  const [polarityFilter, setPolarityFilter] = useState<"all" | "light" | "dark">("all");

  const filtered = useMemo(() => {
    return DESIGN_THEMES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (polarityFilter !== "all" && t.polarity !== polarityFilter) return false;
      return true;
    });
  }, [category, polarityFilter]);

  const activeTheme = useMemo(() => getDesignThemeById(activeThemeId), [activeThemeId]);

  if (!open) return null;

  return (
    <div
      data-testid="design-theme-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-directions-title"
        data-testid="design-theme-drawer"
        className="w-full max-w-5xl rounded-2xl border border-[var(--hub-border)] hub-surface shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--hub-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--hub-text-muted)]">
              <Palette className="w-3.5 h-3.5 text-[var(--hub-secondary)]" />
              <span>{L("15 Curated Design Directions", "١٥ اتجاهاً تصميمياً متكاملاً", lang)}</span>
            </div>
            <h2 id="design-directions-title" className="font-display text-lg sm:text-xl font-bold truncate">
              {L("Transform All Site Design & Direction", "تغيير تصميم الموقع بالكامل ومعرفة كل اتجاه", lang)}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeThemeId !== siteDefaultThemeId && (
              <button
                type="button"
                onClick={onResetToSiteDefault}
                className="h-9 px-3 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-85 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{L("Reset to Default", "استعادة الافتراضي", lang)}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={L("Close design directions", "إغلاق قائمة التصميمات", lang)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Direction Brief Bar */}
        <div className="px-5 py-3 border-b border-[var(--hub-border)] hub-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="font-semibold text-[var(--hub-text)]">
              {L("Active Direction", "الاتجاه النشط", lang)}:{" "}
              <span className="font-mono text-[var(--hub-secondary)]">
                #{String(activeTheme.order).padStart(2, "0")}
              </span>{" "}
              {loc(activeTheme.name, lang)}
            </div>
            <p className="text-[var(--hub-text-muted)] line-clamp-1">
              {loc(activeTheme.directionGuide, lang)}
            </p>
          </div>
          <div className="text-[11px] font-mono text-[var(--hub-text-muted)] whitespace-nowrap">
            {activeTheme.fonts.label} · {loc(activeTheme.geometry.styleLabel, lang)}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-[var(--hub-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={L("Design direction categories", "تصنيفات الاتجاهات", lang)}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? "bg-[var(--hub-primary)] text-[var(--hub-bg)] border-[var(--hub-primary)]"
                      : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                  }`}
                >
                  {getDesignThemeCategoryLabel(cat, lang)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {(["all", "light", "dark"] as const).map((pol) => {
              const selected = polarityFilter === pol;
              return (
                <button
                  key={pol}
                  type="button"
                  onClick={() => setPolarityFilter(pol)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap ${
                    selected
                      ? "border-[var(--hub-secondary)] text-[var(--hub-secondary)] font-semibold"
                      : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                  }`}
                >
                  {pol === "all"
                    ? L("All Tones", "الكل", lang)
                    : pol === "light"
                    ? L("Light", "نهاري", lang)
                    : L("Dark", "ليلي", lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 15 Directions Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isActive = item.id === activeThemeId;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`design-theme-card-${item.id}`}
                onClick={() => onSelectTheme(item.id)}
                style={{
                  backgroundColor: item.tokens.surfaceElevated,
                  borderColor: isActive ? item.tokens.secondary : item.tokens.border,
                  color: item.tokens.text,
                  borderRadius: item.geometry.cardRadius,
                }}
                className={`text-start p-4 border transition-transform hover:-translate-y-0.5 flex flex-col justify-between gap-3 cursor-pointer ${
                  isActive ? "ring-2 ring-offset-1 ring-[var(--hub-secondary)]" : ""
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Meta Row + Swatch Strip */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{ color: item.tokens.textMuted }}
                      className="text-[11px] font-mono tabular-nums"
                    >
                      {String(item.order).padStart(2, "0")} · {item.polarity.toUpperCase()} ·{" "}
                      {loc(item.geometry.styleLabel, lang)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                      <span
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ backgroundColor: item.tokens.bg, borderColor: item.tokens.border }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ backgroundColor: item.tokens.surface, borderColor: item.tokens.border }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: item.tokens.secondary }}
                      />
                      {isActive && (
                        <Check className="w-4 h-4 ms-1" style={{ color: item.tokens.secondary }} />
                      )}
                    </div>
                  </div>

                  {/* Live Font Specimen Heading */}
                  <div className="space-y-1">
                    <div
                      style={{ fontFamily: item.fonts.display, color: item.tokens.text }}
                      className="text-lg font-bold leading-snug"
                    >
                      {loc(item.name, lang)}
                    </div>
                    <div
                      style={{ color: item.tokens.secondary }}
                      className="text-xs font-medium"
                    >
                      {loc(item.directionTagline, lang)}
                    </div>
                  </div>

                  {/* Direction Explanation ("know the direction") */}
                  <p
                    style={{ fontFamily: item.fonts.body, color: item.tokens.textMuted }}
                    className="text-xs leading-relaxed line-clamp-3"
                  >
                    {loc(item.directionGuide, lang)}
                  </p>
                </div>

                {/* Bottom Technical Details */}
                <div
                  style={{ borderColor: item.tokens.border, color: item.tokens.textMuted }}
                  className="pt-2.5 border-t flex items-center justify-between gap-2 text-[11px] font-mono"
                >
                  <span className="truncate">{item.fonts.label}</span>
                  <span className="shrink-0 font-sans font-semibold" style={{ color: item.tokens.secondary }}>
                    {isActive
                      ? L("Active", "مفعّل", lang)
                      : L("Apply", "تطبيق", lang)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

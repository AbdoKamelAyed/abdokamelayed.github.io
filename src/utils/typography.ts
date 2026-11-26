import type { Lang } from "../types/hub";

export type FontScale = "small" | "medium" | "large";

export interface FontScaleDefinition {
  id: FontScale;
  rootFontSizePx: number;
  multiplier: number;
  badge: string;
  label: { en: string; ar: string };
}

export const DEFAULT_FONT_SCALE: FontScale = "medium";

export const FONT_SCALES: Record<FontScale, FontScaleDefinition> = {
  small: {
    id: "small",
    rootFontSizePx: 14,
    multiplier: 0.875,
    badge: "A-",
    label: { en: "Small", ar: "صغير" },
  },
  medium: {
    id: "medium",
    rootFontSizePx: 16,
    multiplier: 1,
    badge: "A",
    label: { en: "Medium", ar: "متوسط" },
  },
  large: {
    id: "large",
    rootFontSizePx: 18,
    multiplier: 1.125,
    badge: "A+",
    label: { en: "Large", ar: "كبير" },
  },
};

export const FONT_SCALE_ORDER: FontScale[] = ["small", "medium", "large"];

export function normalizeFontScale(value?: string | null): FontScale {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  return DEFAULT_FONT_SCALE;
}

export function getNextFontScale(current: FontScale): FontScale {
  const idx = FONT_SCALE_ORDER.indexOf(normalizeFontScale(current));
  return FONT_SCALE_ORDER[(idx + 1) % FONT_SCALE_ORDER.length];
}

export function stepFontScale(current: FontScale, delta: -1 | 1): FontScale {
  const idx = FONT_SCALE_ORDER.indexOf(normalizeFontScale(current));
  const nextIdx = Math.max(0, Math.min(FONT_SCALE_ORDER.length - 1, idx + delta));
  return FONT_SCALE_ORDER[nextIdx];
}

export function canStepFontScale(current: FontScale, delta: -1 | 1): boolean {
  const idx = FONT_SCALE_ORDER.indexOf(normalizeFontScale(current));
  const target = idx + delta;
  return target >= 0 && target < FONT_SCALE_ORDER.length;
}

export function getFontScaleDefinition(scale: FontScale): FontScaleDefinition {
  return FONT_SCALES[normalizeFontScale(scale)];
}

export function getFontScaleLabel(scale: FontScale, lang: Lang): string {
  return getFontScaleDefinition(scale).label[lang];
}

export function applyFontScaleToDocument(scale: FontScale): FontScaleDefinition {
  const def = getFontScaleDefinition(scale);
  if (typeof document === "undefined") return def;
  const root = document.documentElement;
  root.setAttribute("data-font-scale", def.id);
  root.style.fontSize = `${def.rootFontSizePx}px`;
  root.style.setProperty("--hub-font-scale", String(def.multiplier));
  return def;
}

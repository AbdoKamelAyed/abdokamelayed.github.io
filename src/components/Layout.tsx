import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Type,
  X,
} from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import type { HubRouteSection } from "../utils/breadcrumbs";
import {
  FONT_SCALE_ORDER,
  FONT_SCALES,
  canStepFontScale,
  getFontScaleDefinition,
  normalizeFontScale,
  type FontScale,
} from "../utils/typography";
import { L, t } from "../utils/i18n";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { GlobalSearchModal } from "./GlobalSearchModal";

export type RouteSection = HubRouteSection;

interface LayoutProps {
  section: RouteSection;
  param?: string | null;
  subParam?: string | null;
  lang: Lang;
  theme: "light" | "dark";
  fontScale: FontScale;
  data: HubDatasets;
  onToggleLang: () => void;
  onSetTheme: (nextTheme: "light" | "dark") => void;
  onStepFontScale: (delta: -1 | 1) => void;
  onSelectFontScale: (scale: FontScale) => void;
  onResetVisitorPreferences: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: RouteSection; href: string; key: string }[] = [
  { id: "home", href: "#/", key: "nav.home" },
  { id: "projects", href: "#/projects", key: "nav.projects" },
  { id: "github", href: "#/github", key: "nav.github" },
  { id: "work", href: "#/work", key: "nav.work" },
  { id: "journal", href: "#/journal", key: "nav.journal" },
  { id: "knowledge", href: "#/knowledge", key: "nav.knowledge" },
  { id: "about", href: "#/about", key: "nav.about" },
  { id: "contact", href: "#/contact", key: "nav.contact" },
];

export const Layout: React.FC<LayoutProps> = ({
  section,
  param = null,
  subParam = null,
  lang,
  theme,
  fontScale,
  data,
  onToggleLang,
  onSetTheme,
  onStepFontScale,
  onSelectFontScale,
  onResetVisitorPreferences,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);
  const fontScaleDef = useMemo(() => getFontScaleDefinition(fontScale), [fontScale]);

  const searchEnabled = data.website.enableGlobalSearch !== false;
  const breadcrumbsEnabled = data.website.showBreadcrumbs !== false;
  const siteDefaultFontScale = normalizeFontScale(data.website.defaultFontScale);
  const siteDefaultTheme = data.website.defaultTheme || "light";

  useEffect(() => {
    setMobileOpen(false);
    setSettingsOpen(false);
  }, [section]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (searchEnabled && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSettingsOpen(false);
        setSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        window.location.hash = "#/admin";
      } else if (searchEnabled && e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isEditable = Boolean(
          target &&
            (target.tagName === "INPUT" ||
              target.tagName === "TEXTAREA" ||
              target.tagName === "SELECT" ||
              target.isContentEditable)
        );
        if (!isEditable) {
          e.preventDefault();
          setSettingsOpen(false);
          setSearchOpen(true);
        }
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setSettingsOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchEnabled]);

  const canDecrease = canStepFontScale(fontScale, -1);
  const canIncrease = canStepFontScale(fontScale, 1);

  return (
    <div className="min-h-screen flex flex-col hub-canvas text-[var(--hub-text)] transition-colors duration-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-slate-900 focus:text-white"
      >
        {L("Skip to content", "انتقل إلى المحتوى", lang)}
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--hub-border)] hub-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <a
            href="#/"
            className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 text-[var(--hub-text)]"
          >
            {data.website.shortTitle || "ABDO"}
          </a>

          <nav
            aria-label={L("Primary Navigation", "التنقل الرئيسي", lang)}
            className="hidden lg:flex items-center gap-5 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const active = section === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? "border-[var(--hub-secondary)] text-[var(--hub-text)] font-semibold"
                      : "border-transparent text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                  }`}
                >
                  {t(item.key, lang)}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {searchEnabled && (
              <button
                type="button"
                data-testid="open-search-btn"
                onClick={() => {
                  setSettingsOpen(false);
                  setSearchOpen(true);
                }}
                aria-label={t("search.title", lang)}
                className="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:border-[var(--hub-secondary)] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">{L("Search", "بحث", lang)}</span>
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-[var(--hub-border)] text-[10px] font-mono text-[var(--hub-text-muted)]">
                  Ctrl K
                </kbd>
              </button>
            )}

            <div className="relative" ref={settingsDropdownRef}>
              <button
                type="button"
                data-testid="user-settings-btn"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-label={L("Display settings", "إعدادات العرض", lang)}
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                className={`h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                  settingsOpen
                    ? "border-[var(--hub-secondary)] text-[var(--hub-text)]"
                    : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{L("Display", "المظهر", lang)}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
              </button>

              {settingsOpen && (
                <div
                  data-testid="user-settings-dropdown"
                  role="dialog"
                  aria-label={L("Display settings", "إعدادات العرض", lang)}
                  className="absolute -end-10 lg:end-0 top-full mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-[var(--hub-border)] hub-surface shadow-2xl p-4 space-y-4 z-50"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--hub-border)]">
                    <span className="font-display text-sm font-semibold">
                      {L("Reading & Display", "إعدادات القراءة والسطوع", lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      aria-label={L("Close display settings", "إغلاق الإعدادات", lang)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Light / Dark Mode Selector */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                      {L("Appearance Mode", "وضع الإضاءة", lang)}
                    </span>
                    <div
                      role="group"
                      aria-label={L("Light or dark mode", "الوضع الفاتح أو الداكن", lang)}
                      className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border border-[var(--hub-border)] hub-subtle"
                    >
                      <button
                        type="button"
                        data-testid="theme-light-btn"
                        aria-pressed={theme === "light"}
                        onClick={() => onSetTheme("light")}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          theme === "light"
                            ? "bg-[var(--hub-primary)] text-[var(--hub-bg)] shadow-xs"
                            : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>{L("Light", "فاتح", lang)}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="theme-dark-btn"
                        aria-pressed={theme === "dark"}
                        onClick={() => onSetTheme("dark")}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          theme === "dark"
                            ? "bg-[var(--hub-primary)] text-[var(--hub-bg)] shadow-xs"
                            : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>{L("Dark", "داكن", lang)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Font Size Controls: Plus / Minus Stepper + Select Menu */}
                  <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hub-text)]">
                        <Type className="w-4 h-4 text-[var(--hub-secondary)]" />
                        <span>{L("Font Size", "حجم الخط", lang)}</span>
                      </span>
                      <span className="text-xs font-mono font-semibold tabular-nums text-[var(--hub-secondary)]">
                        {fontScaleDef.badge} · {fontScaleDef.rootFontSizePx}px
                      </span>
                    </div>

                    {/* Minus / Plus Stepper */}
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                      <button
                        type="button"
                        data-testid="font-scale-decrease-btn"
                        disabled={!canDecrease}
                        onClick={() => onStepFontScale(-1)}
                        aria-label={L("Decrease font size", "تصغير الخط", lang)}
                        className="h-9 px-3 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] inline-flex items-center justify-center gap-1 text-xs font-semibold hover:border-[var(--hub-secondary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span className="font-mono">A-</span>
                      </button>

                      <div className="text-center text-xs font-medium text-[var(--hub-text)] truncate px-1">
                        {fontScaleDef.label[lang]}
                      </div>

                      <button
                        type="button"
                        data-testid="font-scale-increase-btn"
                        disabled={!canIncrease}
                        onClick={() => onStepFontScale(1)}
                        aria-label={L("Increase font size", "تكبير الخط", lang)}
                        className="h-9 px-3 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-surface)] inline-flex items-center justify-center gap-1 text-xs font-semibold hover:border-[var(--hub-secondary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span className="font-mono">A+</span>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Direct Font Size Menu */}
                    <div>
                      <label htmlFor="visitor-font-scale-menu" className="sr-only">
                        {L("Select font size preset", "اختيار حجم الخط", lang)}
                      </label>
                      <select
                        id="visitor-font-scale-menu"
                        data-testid="font-scale-select"
                        value={fontScale}
                        onChange={(e) => onSelectFontScale(normalizeFontScale(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-medium cursor-pointer"
                      >
                        {FONT_SCALE_ORDER.map((step) => {
                          const def = FONT_SCALES[step];
                          return (
                            <option key={step} value={step}>
                              {def.label[lang]} ({def.badge} · {def.rootFontSizePx}px)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Reading Language */}
                  <button
                    type="button"
                    onClick={onToggleLang}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] flex items-center justify-between gap-2 text-xs hover:border-[var(--hub-secondary)] cursor-pointer"
                  >
                    <span className="font-medium">{L("Reading Language", "لغة العرض", lang)}</span>
                    <span className="font-mono text-[11px] text-[var(--hub-text-muted)]">
                      {lang === "ar" ? "العربية (RTL)" : "English (LTR)"}
                    </span>
                  </button>

                  {(fontScale !== siteDefaultFontScale || theme !== siteDefaultTheme) && (
                    <button
                      type="button"
                      onClick={onResetVisitorPreferences}
                      className="w-full pt-2 border-t border-[var(--hub-border)] text-xs font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{L("Reset Reading Defaults", "استعادة افتراضات القراءة", lang)}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((p) => !p)}
              aria-label={L("Toggle navigation menu", "فتح قائمة التنقل", lang)}
              aria-expanded={mobileOpen}
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] cursor-pointer shrink-0"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            aria-label={L("Mobile Navigation", "التنقل على الجوال", lang)}
            className="lg:hidden border-t border-[var(--hub-border)] px-4 py-3 flex flex-col gap-1 hub-surface"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  section === item.id
                    ? "bg-slate-100 dark:bg-slate-800 text-[var(--hub-text)] font-semibold"
                    : "text-[var(--hub-text-muted)]"
                }`}
              >
                {t(item.key, lang)}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {breadcrumbsEnabled && (
          <BreadcrumbNav
            section={section}
            param={param}
            subParam={subParam}
            data={data}
            lang={lang}
          />
        )}
        {children}
      </main>

      <footer className="border-t border-[var(--hub-border)] hub-subtle py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[var(--hub-text-muted)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--hub-text)]">
              {data.website.siteName || "ABDO — Personal Digital Hub"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{L("Abdo Kamel", "عبدو كامل", lang)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="https://github.com/AbdoKamelAyed" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--hub-text)]">
              GitHub
            </a>
            <a href="#/projects" className="hover:text-[var(--hub-text)]">{t("nav.projects", lang)}</a>
            <a href="#/journal" className="hover:text-[var(--hub-text)]">{t("nav.journal", lang)}</a>
            <a href="#/about" className="hover:text-[var(--hub-text)]">{t("nav.about", lang)}</a>
            <a href="#/contact" className="hover:text-[var(--hub-text)]">{t("nav.contact", lang)}</a>
          </div>
        </div>
      </footer>

      {searchEnabled && (
        <GlobalSearchModal
          open={searchOpen}
          lang={lang}
          data={data}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
};

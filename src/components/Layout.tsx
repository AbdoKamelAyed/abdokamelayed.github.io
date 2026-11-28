import React, { useEffect, useState } from "react";
import {
  Globe,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import type { HubRouteSection } from "../utils/breadcrumbs";
import { PUBLIC_ROUTE_DEFS } from "../utils/router";
import { L, t } from "../utils/i18n";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NetworkStatusToast } from "./NetworkStatusToast";

export type RouteSection = HubRouteSection;

interface LayoutProps {
  section: RouteSection;
  param?: string | null;
  subParam?: string | null;
  lang: Lang;
  theme: "light" | "dark";
  data: HubDatasets;
  onToggleLang: () => void;
  onSetTheme: (nextTheme: "light" | "dark") => void;
  children: React.ReactNode;
}

const NAV_ITEMS = PUBLIC_ROUTE_DEFS.filter((r) => r.showInHeader).map((r) => ({
  id: r.id,
  href: r.href,
  key: r.i18nKey,
}));

export const Layout: React.FC<LayoutProps> = ({
  section,
  param = null,
  subParam = null,
  lang,
  theme,
  data,
  onToggleLang,
  onSetTheme,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchEnabled = data.website.enableGlobalSearch !== false;
  const breadcrumbsEnabled = data.website.showBreadcrumbs !== false;

  useEffect(() => {
    setMobileOpen(false);
  }, [section]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (searchEnabled && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
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
          setSearchOpen(true);
        }
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchEnabled]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div className="min-h-screen flex flex-col hub-canvas text-[var(--hub-text)] transition-colors duration-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-slate-900 focus:text-white"
      >
        {L("Skip to content", "انتقل إلى المحتوى", lang)}
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--hub-border)] hub-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-5">
          <a
            href="#/"
            className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 text-[var(--hub-text)]"
          >
            {data.website.shortTitle || "ABDO"}
          </a>

          <nav
            aria-label={L("Primary Navigation", "التنقل الرئيسي", lang)}
            className="hidden lg:flex items-center gap-4 xl:gap-5 text-sm font-medium"
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

          {/* Separated Header Utilities: Search + Theme Switcher + Language Switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            {searchEnabled && (
              <button
                type="button"
                data-testid="open-search-btn"
                onClick={() => setSearchOpen(true)}
                aria-label={t("search.title", lang)}
                className="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:border-[var(--hub-secondary)] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{L("Search", "بحث", lang)}</span>
                <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded border border-[var(--hub-border)] text-[10px] font-mono text-[var(--hub-text-muted)]">
                  Ctrl K
                </kbd>
              </button>
            )}

            <button
              type="button"
              data-testid="header-theme-switcher"
              onClick={() => onSetTheme(nextTheme)}
              aria-pressed={theme === "dark"}
              aria-label={
                theme === "dark"
                  ? L("Switch to light theme", "التبديل إلى الوضع الفاتح", lang)
                  : L("Switch to dark theme", "التبديل إلى الوضع الداكن", lang)
              }
              title={
                theme === "dark"
                  ? L("Light Mode", "الوضع الفاتح", lang)
                  : L("Dark Mode", "الوضع الداكن", lang)
              }
              className="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium text-[var(--hub-text)] hover:border-[var(--hub-secondary)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {theme === "dark" ? L("Light", "فاتح", lang) : L("Dark", "داكن", lang)}
              </span>
            </button>

            <button
              type="button"
              data-testid="header-lang-switcher"
              onClick={onToggleLang}
              aria-label={
                lang === "ar"
                  ? "Switch language to English"
                  : "تبديل اللغة إلى العربية"
              }
              className="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold text-[var(--hub-text)] hover:border-[var(--hub-secondary)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-4 h-4 text-[var(--hub-secondary)]" aria-hidden="true" />
              <span className="sm:hidden font-mono">{lang === "ar" ? "EN" : "AR"}</span>
              <span className="hidden sm:inline">{lang === "ar" ? "English" : "العربية"}</span>
            </button>

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
            <a
              href="#/now"
              onClick={() => setMobileOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                section === "now"
                  ? "bg-slate-100 dark:bg-slate-800 text-[var(--hub-text)] font-semibold"
                  : "text-[var(--hub-text-muted)]"
              }`}
            >
              {t("nav.now", lang)}
            </a>
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1 max-w-7xl w-full min-w-0 mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
            <a href="#/now" className="hover:text-[var(--hub-text)]">{t("nav.now", lang)}</a>
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

      <NetworkStatusToast lang={lang} />
    </div>
  );
};

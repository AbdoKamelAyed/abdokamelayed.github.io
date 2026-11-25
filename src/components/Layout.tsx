import React, { useEffect, useMemo, useState } from "react";
import { Layers, Menu, Moon, Search, SlidersHorizontal, Sun, X } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { buildSearchIndex, searchDocuments } from "../utils/analytics";
import { L, t } from "../utils/i18n";

export type RouteSection =
  | "home"
  | "projects"
  | "github"
  | "work"
  | "journal"
  | "knowledge"
  | "about"
  | "contact"
  | "admin";

interface LayoutProps {
  section: RouteSection;
  isArticleDetail: boolean;
  lang: Lang;
  theme: "light" | "dark";
  glass: boolean;
  data: HubDatasets;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onToggleGlass: () => void;
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
  isArticleDetail,
  lang,
  theme,
  glass,
  data,
  onToggleLang,
  onToggleTheme,
  onToggleGlass,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchCat, setSearchCat] = useState("all");
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [section]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!isArticleDetail) {
      setScrollProgress(0);
      return;
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isArticleDetail]);

  const searchIndex = useMemo(() => buildSearchIndex(data, lang), [data, lang]);
  const hits = useMemo(
    () => searchDocuments(searchIndex, debouncedQuery, searchCat),
    [searchIndex, debouncedQuery, searchCat]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--hub-bg)] text-[var(--hub-text)] transition-colors duration-200">
      {isArticleDetail && (
        <div
          className="fixed top-0 inset-x-0 h-[3px] z-50 bg-transparent pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="h-full transition-[width] duration-100"
            style={{ width: `${scrollProgress}%`, backgroundColor: "var(--hub-secondary)" }}
          />
        </div>
      )}

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
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t("search.title", lang)}
              className="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{L("Search", "بحث", lang)}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLang}
              aria-label={L("Switch language to Arabic", "التبديل إلى الإنجليزية", lang)}
              className="h-9 px-2.5 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              {lang === "ar" ? "EN" : "AR"}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? L("Switch to light mode", "الوضع الفاتح", lang) : L("Switch to dark mode", "الوضع الداكن", lang)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleGlass}
              aria-label={L("Toggle glass interface", "تبديل الواجهة الزجاجية", lang)}
              aria-pressed={glass}
              title={L("Glass Mode", "الوضع الزجاجي", lang)}
              className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border cursor-pointer shrink-0 ${
                glass
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            <a
              href="#/admin"
              aria-label={t("nav.admin", lang)}
              title={t("nav.admin", lang)}
              className={`h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
                section === "admin"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nav.admin", lang)}</span>
            </a>

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
            <a href="#/admin" className="hover:text-[var(--hub-text)]">{t("nav.admin", lang)}</a>
          </div>
        </div>
      </footer>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unified-search-title"
            className="w-full max-w-2xl rounded-2xl border border-[var(--hub-border)] hub-surface shadow-2xl p-5 max-h-[78vh] flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="unified-search-title" className="font-display text-lg font-semibold">
                {t("search.title", lang)}
              </h2>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label={L("Close search", "إغلاق البحث", lang)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder", lang)}
                aria-label={t("search.title", lang)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm focus:outline-2 focus:outline-blue-600"
              />
              <select
                value={searchCat}
                onChange={(e) => setSearchCat(e.target.value)}
                aria-label={L("Filter search category", "تصفية فئة البحث", lang)}
                className="px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              >
                <option value="all">{t("common.all", lang)}</option>
                <option value="project">{t("nav.projects", lang)}</option>
                <option value="repository">{L("Repositories", "المستودعات", lang)}</option>
                <option value="article">{t("nav.journal", lang)}</option>
                <option value="knowledge">{t("nav.knowledge", lang)}</option>
                <option value="experience">{t("nav.work", lang)}</option>
              </select>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1">
              {hits.length === 0 ? (
                <p className="text-sm text-[var(--hub-text-muted)] py-6 text-center">{t("search.empty", lang)}</p>
              ) : (
                hits.map((hit) => (
                  <a
                    key={`${hit.type}-${hit.id}`}
                    href={hit.route}
                    onClick={() => setSearchOpen(false)}
                    className="block rounded-xl border border-[var(--hub-border)] p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{hit.title}</span>
                      <span className="text-xs text-[var(--hub-text-muted)] uppercase tracking-wide">
                        {hit.type}
                      </span>
                    </div>
                    {hit.subtitle && (
                      <p className="text-xs text-[var(--hub-text-muted)] mt-1 line-clamp-2">{hit.subtitle}</p>
                    )}
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

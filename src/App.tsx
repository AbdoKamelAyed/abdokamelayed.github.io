import React, { Component, useCallback, useEffect, useState } from "react";
import type { HubDatasets, Lang } from "./types/hub";
import { loadAllDatasets } from "./services/dataService";
import { L, loc } from "./utils/i18n";
import { Layout, type RouteSection } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { GithubPage } from "./pages/GithubPage";
import { WorkPage } from "./pages/WorkPage";
import { JournalPage } from "./pages/JournalPage";
import { ArticleDetailPage } from "./pages/ArticleDetailPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { AdminPage } from "./pages/AdminPage";

const LANG_KEY = "abdo_hub_lang";
const THEME_KEY = "abdo_hub_theme";
const GLASS_KEY = "abdo_hub_glass";

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore restricted localStorage
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class HubErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h1 className="text-xl font-bold">Unable to render this view</h1>
            <p className="text-sm text-slate-500">Reload or return to the homepage to recover.</p>
            <a href="#/" onClick={() => this.setState({ hasError: false })} className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white text-sm">
              Return Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function parseHash(): { section: RouteSection; param: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const valid: RouteSection[] = ["home", "projects", "github", "work", "journal", "knowledge", "about", "contact", "admin"];
  const candidate = (parts[0] || "home") as RouteSection;
  return {
    section: valid.includes(candidate) ? candidate : "home",
    param: parts[1] || null,
  };
}

function AppContent() {
  const [data, setData] = useState<HubDatasets | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [route, setRoute] = useState(parseHash);
  const [lang, setLang] = useState<Lang>(() => (safeStorageGet(LANG_KEY) === "ar" ? "ar" : "en"));
  const [theme, setTheme] = useState<"light" | "dark">(() => (safeStorageGet(THEME_KEY) === "dark" ? "dark" : "light"));
  const [glass, setGlass] = useState<boolean>(() => safeStorageGet(GLASS_KEY) === "true");

  const applyThemeVars = useCallback(
    (nextTheme: "light" | "dark", nextGlass: boolean, website?: HubDatasets["website"]) => {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.setAttribute("data-glass", String(nextGlass));
      if (website?.secondaryAccent) {
        document.documentElement.style.setProperty("--hub-secondary", website.secondaryAccent);
      }
    },
    []
  );

  const fetchDatasets = useCallback(async () => {
    try {
      setLoadFailed(false);
      const loaded = await loadAllDatasets();
      setData(loaded);
      const initialTheme = (safeStorageGet(THEME_KEY) as "light" | "dark" | null) || loaded.website.defaultTheme || "light";
      const storedGlass = safeStorageGet(GLASS_KEY);
      const initialGlass = storedGlass !== null ? storedGlass === "true" : Boolean(loaded.website.defaultGlassMode);
      setTheme(initialTheme);
      setGlass(initialGlass);
      applyThemeVars(initialTheme, initialGlass, loaded.website);
    } catch {
      setLoadFailed(true);
    }
  }, [applyThemeVars]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    safeStorageSet(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    applyThemeVars(theme, glass, data?.website);
  }, [theme, glass, data?.website, applyThemeVars]);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!data) return;
    const baseTitle = data.website.siteName || "ABDO — Personal Digital Hub";
    let pageTitle = baseTitle;
    if (route.section === "projects" && route.param) {
      const p = data.projects.find((x) => x.slug === decodeURIComponent(route.param!) || x.id === route.param);
      if (p) pageTitle = `${loc(p.name, lang)} — ${baseTitle}`;
    } else if (route.section === "journal" && route.param) {
      const a = data.articles.find((x) => x.slug === decodeURIComponent(route.param!) || x.id === route.param);
      if (a) pageTitle = `${loc(a.title, lang)} — ${baseTitle}`;
    } else if (route.section !== "home") {
      pageTitle = `${route.section.toUpperCase()} — ${baseTitle}`;
    }
    document.title = pageTitle;

    const desc = loc(data.website.seoDescription, lang);
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && desc) metaDesc.setAttribute("content", desc);
  }, [data, route, lang]);

  if (loadFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <h1 className="text-xl font-bold">{L("Unable to load hub datasets", "تعذر تحميل بيانات المنصة", lang)}</h1>
          <p className="text-sm text-slate-500">{L("Check your connection or retry loading the archive.", "تحقق من الاتصال أو أعد المحاولة.", lang)}</p>
          <button
            type="button"
            onClick={fetchDatasets}
            className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
          >
            {L("Retry", "إعادة المحاولة", lang)}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-10 w-64 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
      <Layout
        section={route.section}
        isArticleDetail={route.section === "journal" && Boolean(route.param)}
        lang={lang}
        theme={theme}
        glass={glass}
        data={data}
        onToggleLang={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
        onToggleTheme={() => {
          setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            safeStorageSet(THEME_KEY, next);
            return next;
          });
        }}
        onToggleGlass={() => {
          setGlass((prev) => {
            const next = !prev;
            safeStorageSet(GLASS_KEY, String(next));
            return next;
          });
        }}
      >
        {route.section === "home" && <HomePage data={data} lang={lang} />}
        {route.section === "projects" &&
          (route.param ? (
            <ProjectDetailPage data={data} slugOrId={route.param} lang={lang} />
          ) : (
            <ProjectsPage data={data} lang={lang} />
          ))}
        {route.section === "github" && <GithubPage data={data} lang={lang} />}
        {route.section === "work" && <WorkPage data={data} lang={lang} />}
        {route.section === "journal" &&
          (route.param ? (
            <ArticleDetailPage data={data} slugOrId={route.param} lang={lang} />
          ) : (
            <JournalPage data={data} lang={lang} />
          ))}
        {route.section === "knowledge" && <KnowledgePage data={data} lang={lang} />}
        {route.section === "about" && <AboutPage data={data} lang={lang} />}
        {route.section === "contact" && <ContactPage data={data} lang={lang} />}
        {route.section === "admin" && (
          <AdminPage
            data={data}
            lang={lang}
            onUpdateData={(updater) => setData((prev) => (prev ? updater(prev) : prev))}
            onReloadFromSource={fetchDatasets}
            onApplyWebsiteTheme={(website) => applyThemeVars(theme, glass, website)}
          />
        )}
        {route.section !== "home" &&
          route.section !== "projects" &&
          route.section !== "github" &&
          route.section !== "work" &&
          route.section !== "journal" &&
          route.section !== "knowledge" &&
          route.section !== "about" &&
          route.section !== "contact" &&
          route.section !== "admin" && (
            <div className="p-8 text-center text-sm">
              {L("Section not found.", "القسم غير موجود.", lang)}
            </div>
          )}
      </Layout>
  );
}

export default function App() {
  return (
    <HubErrorBoundary>
      <AppContent />
    </HubErrorBoundary>
  );
}

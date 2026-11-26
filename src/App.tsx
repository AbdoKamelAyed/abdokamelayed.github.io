import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from "react";
import type { HubDatasets, Lang } from "./types/hub";
import { loadAllDatasets } from "./services/dataService";
import {
  applyDesignThemeToDocument,
  DEFAULT_DESIGN_THEME_ID,
  getDesignThemeById,
  getPairedPolarityThemeId,
} from "./utils/designThemes";
import {
  applyFontScaleToDocument,
  DEFAULT_FONT_SCALE,
  normalizeFontScale,
  stepFontScale,
  type FontScale,
} from "./utils/typography";
import { L } from "./utils/i18n";
import { applyPageSeoMetadata } from "./utils/seoEngine";
import { Layout, type RouteSection } from "./components/Layout";
import { InitialAppShellSkeleton, PageSkeleton } from "./components/PageSkeletons";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage }))
);
const GithubPage = lazy(() => import("./pages/GithubPage").then((m) => ({ default: m.GithubPage })));
const WorkPage = lazy(() => import("./pages/WorkPage").then((m) => ({ default: m.WorkPage })));
const JournalPage = lazy(() => import("./pages/JournalPage").then((m) => ({ default: m.JournalPage })));
const ArticleDetailPage = lazy(() =>
  import("./pages/ArticleDetailPage").then((m) => ({ default: m.ArticleDetailPage }))
);
const IssueDetailPage = lazy(() =>
  import("./pages/IssueDetailPage").then((m) => ({ default: m.IssueDetailPage }))
);
const KnowledgePage = lazy(() => import("./pages/KnowledgePage").then((m) => ({ default: m.KnowledgePage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));

const LANG_KEY = "abdo_hub_lang";
const THEME_KEY = "abdo_hub_theme";
const FONT_SCALE_KEY = "abdo_hub_font_scale";

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

interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

class HubErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
            <h1 className="text-xl font-bold">Unable to render this view</h1>
            <p className="text-sm text-[var(--hub-muted)]">Reload or return to the homepage to recover.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="inline-block px-4 py-2 rounded-lg border border-[var(--hub-border)] text-sm font-medium"
              >
                Retry
              </button>
              <a href="#/" onClick={() => this.setState({ hasError: false })} className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white text-sm">
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function parseHash(): { section: RouteSection; param: string | null; subParam: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const valid: RouteSection[] = ["home", "projects", "github", "work", "journal", "knowledge", "about", "contact", "admin"];
  const candidate = (parts[0] || "home") as RouteSection;
  return {
    section: valid.includes(candidate) ? candidate : "home",
    param: parts[1] || null,
    subParam: parts[2] || null,
  };
}

function AppContent() {
  const [data, setData] = useState<HubDatasets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [route, setRoute] = useState(parseHash);
  const [lang, setLang] = useState<Lang>(() => (safeStorageGet(LANG_KEY) === "ar" ? "ar" : "en"));
  const [theme, setTheme] = useState<"light" | "dark">(() => (safeStorageGet(THEME_KEY) === "dark" ? "dark" : "light"));
  const [fontScale, setFontScale] = useState<FontScale>(() =>
    normalizeFontScale(safeStorageGet(FONT_SCALE_KEY))
  );

  const applyThemeVars = useCallback(
    (website: HubDatasets["website"] | undefined, polarity: "light" | "dark") => {
      const siteDefaultId =
        website?.designThemeId ||
        (website?.defaultTheme === "dark" ? "obsidian-terminal" : DEFAULT_DESIGN_THEME_ID);
      const effectiveThemeId = getPairedPolarityThemeId(siteDefaultId, polarity);
      const baseTheme = getDesignThemeById(siteDefaultId);
      const matchesSiteDefault = effectiveThemeId === baseTheme.id;

      applyDesignThemeToDocument(effectiveThemeId, {
        glassMode: Boolean(website?.defaultGlassMode),
        customPrimaryAccent: matchesSiteDefault ? website?.primaryAccent : undefined,
        customSecondaryAccent: matchesSiteDefault ? website?.secondaryAccent : undefined,
      });
    },
    []
  );

  const fetchDatasets = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadFailed(false);
      const loaded = await loadAllDatasets();
      setData(loaded);

      const storedPolarity = safeStorageGet(THEME_KEY);
      const siteDef = getDesignThemeById(
        loaded.website.designThemeId ||
          (loaded.website.defaultTheme === "dark" ? "obsidian-terminal" : DEFAULT_DESIGN_THEME_ID)
      );
      const initialPolarity: "light" | "dark" =
        storedPolarity === "dark" || storedPolarity === "light"
          ? storedPolarity
          : loaded.website.defaultTheme || siteDef.polarity;
      setTheme(initialPolarity);
      applyThemeVars(loaded.website, initialPolarity);

      if (!safeStorageGet(FONT_SCALE_KEY) && loaded.website.defaultFontScale) {
        setFontScale(normalizeFontScale(loaded.website.defaultFontScale));
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
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
    applyThemeVars(data?.website, theme);
  }, [data?.website, theme, applyThemeVars]);

  useEffect(() => {
    applyFontScaleToDocument(fontScale);
    safeStorageSet(FONT_SCALE_KEY, fontScale);
  }, [fontScale]);

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
    applyPageSeoMetadata(data, route, lang);
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
    return <InitialAppShellSkeleton route={route} lang={lang} />;
  }

  return (
      <Layout
        section={route.section}
        param={route.param}
        subParam={route.subParam}
        lang={lang}
        theme={theme}
        fontScale={fontScale}
        data={data}
        onToggleLang={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
        onSetTheme={(nextPolarity) => {
          setTheme(nextPolarity);
          safeStorageSet(THEME_KEY, nextPolarity);
        }}
        onStepFontScale={(delta) => {
          setFontScale((prev) => {
            const next = stepFontScale(prev, delta);
            safeStorageSet(FONT_SCALE_KEY, next);
            return next;
          });
        }}
        onSelectFontScale={(nextScale) => {
          const normalized = normalizeFontScale(nextScale);
          setFontScale(normalized);
          safeStorageSet(FONT_SCALE_KEY, normalized);
        }}
        onResetVisitorPreferences={() => {
          try {
            localStorage.removeItem(THEME_KEY);
            localStorage.removeItem(FONT_SCALE_KEY);
          } catch {
            // Ignore restricted storage
          }
          const defaultPolarity = data.website.defaultTheme || "light";
          const defaultScale = normalizeFontScale(data.website.defaultFontScale || DEFAULT_FONT_SCALE);
          setTheme(defaultPolarity);
          setFontScale(defaultScale);
        }}
      >
        {isLoading ? (
          <PageSkeleton route={route} lang={lang} />
        ) : (
          <HubErrorBoundary resetKey={`${route.section}/${route.param ?? ""}/${route.subParam ?? ""}`}>
            <Suspense fallback={<PageSkeleton route={route} lang={lang} />}>
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
                (route.param === "issues" && route.subParam ? (
                  <IssueDetailPage data={data} slugOrId={route.subParam} lang={lang} />
                ) : route.param === "issues" ? (
                  <JournalPage data={data} lang={lang} initialView="issues" />
                ) : route.param ? (
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
                  onApplyWebsiteTheme={(website) => {
                    const targetId = website.designThemeId || DEFAULT_DESIGN_THEME_ID;
                    const resolved = getDesignThemeById(targetId);
                    const nextPolarity = website.defaultTheme || resolved.polarity;
                    setData((prev) => (prev ? { ...prev, website } : prev));
                    setTheme(nextPolarity);
                    safeStorageSet(THEME_KEY, nextPolarity);
                    if (website.defaultFontScale) {
                      const nextScale = normalizeFontScale(website.defaultFontScale);
                      setFontScale(nextScale);
                      safeStorageSet(FONT_SCALE_KEY, nextScale);
                    }
                    applyThemeVars(website, nextPolarity);
                  }}
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
            </Suspense>
          </HubErrorBoundary>
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Briefcase,
  CornerDownLeft,
  Database,
  FolderGit2,
  GitBranch,
  Search,
  X,
} from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { buildSearchIndex, searchDocuments, type SearchHit } from "../utils/analytics";
import { L, t } from "../utils/i18n";

interface GlobalSearchModalProps {
  open: boolean;
  lang: Lang;
  data: HubDatasets;
  onClose: () => void;
}

type CategoryKey = "all" | SearchHit["type"];

const CATEGORY_TABS: { id: CategoryKey; en: string; ar: string }[] = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "article", en: "Articles", ar: "المقالات" },
  { id: "project", en: "Projects", ar: "المشاريع" },
  { id: "knowledge", en: "Knowledge", ar: "المعرفة" },
  { id: "issue", en: "Issues", ar: "الأعداد" },
  { id: "repository", en: "Repos", ar: "المستودعات" },
  { id: "experience", en: "Work", ar: "الخبرات" },
];

function getHitIcon(type: SearchHit["type"]) {
  switch (type) {
    case "article":
      return BookOpen;
    case "project":
      return FolderGit2;
    case "knowledge":
      return Database;
    case "issue":
      return BookMarked;
    case "repository":
      return GitBranch;
    case "experience":
      return Briefcase;
  }
}

function getHitTypeLabel(type: SearchHit["type"], lang: Lang): string {
  switch (type) {
    case "article":
      return L("Article", "مقال", lang);
    case "project":
      return L("Project", "مشروع", lang);
    case "knowledge":
      return L("Knowledge", "معرفة", lang);
    case "issue":
      return L("Issue", "عدد", lang);
    case "repository":
      return L("Repository", "مستودع", lang);
    case "experience":
      return L("Experience", "خبرة", lang);
  }
}

const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (!text || terms.length === 0) return <>{text}</>;

  const escaped = terms
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!escaped) return <>{text}</>;

  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  const lowerTerms = new Set(terms.map((w) => w.toLowerCase()));

  return (
    <>
      {parts.map((part, idx) =>
        lowerTerms.has(part.toLowerCase()) ? (
          <mark
            key={idx}
            className="bg-[var(--hub-secondary)]/15 text-[var(--hub-secondary)] font-semibold rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  lang,
  data,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 100);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const searchIndex = useMemo(() => buildSearchIndex(data, lang), [data, lang]);

  const countsByCategory = useMemo(() => {
    const map: Record<CategoryKey, number> = {
      all: 0,
      article: 0,
      project: 0,
      knowledge: 0,
      issue: 0,
      repository: 0,
      experience: 0,
    };
    const matchedAll = searchDocuments(searchIndex, debouncedQuery, "all");
    map.all = matchedAll.length;
    for (const tab of CATEGORY_TABS) {
      if (tab.id !== "all") {
        map[tab.id] = searchDocuments(searchIndex, debouncedQuery, tab.id).length;
      }
    }
    return map;
  }, [searchIndex, debouncedQuery]);

  const hits = useMemo(
    () => searchDocuments(searchIndex, debouncedQuery, category),
    [searchIndex, debouncedQuery, category]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, category]);

  useEffect(() => {
    const target = itemRefs.current[activeIndex];
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!open) return null;

  const navigateToHit = (hit: SearchHit) => {
    window.location.hash = hit.route;
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hits.length > 0) {
        setActiveIndex((prev) => (prev + 1) % hits.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length > 0) {
        setActiveIndex((prev) => (prev - 1 + hits.length) % hits.length);
      }
    } else if (e.key === "Enter" && hits.length > 0) {
      const target = hits[activeIndex] || hits[0];
      if (target) {
        e.preventDefault();
        navigateToHit(target);
      }
    }
  };

  return (
    <div
      data-testid="global-search-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unified-search-title"
        data-testid="global-search-modal"
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl rounded-2xl border border-[var(--hub-border)] hub-surface shadow-2xl max-h-[82vh] flex flex-col overflow-hidden"
      >
        <h2 id="unified-search-title" className="sr-only">
          {t("search.title", lang)}
        </h2>

        {/* Command Input Header */}
        <div className="px-4 py-3.5 border-b border-[var(--hub-border)] flex items-center gap-3">
          <Search className="w-4 h-4 text-[var(--hub-secondary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            inputMode="search"
            data-testid="global-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder", lang)}
            aria-label={t("search.title", lang)}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-[var(--hub-text)] placeholder:text-[var(--hub-text-muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label={L("Clear search", "مسح البحث", lang)}
              className="h-7 px-2 rounded-lg border border-[var(--hub-border)] text-[11px] font-medium text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] cursor-pointer shrink-0"
            >
              {L("Clear", "مسح", lang)}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={L("Close search", "إغلاق البحث", lang)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Bar */}
        <div
          role="tablist"
          aria-label={L("Filter search category", "تصفية فئة البحث", lang)}
          className="px-4 py-2.5 border-b border-[var(--hub-border)] hub-subtle flex items-center gap-1.5 overflow-x-auto"
        >
          {CATEGORY_TABS.map((tab) => {
            const selected = category === tab.id;
            const count = countsByCategory[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`search-tab-${tab.id}`}
                aria-selected={selected}
                onClick={() => setCategory(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selected
                    ? "bg-[var(--hub-primary)] text-[var(--hub-bg)] border-[var(--hub-primary)]"
                    : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                }`}
              >
                <span>{L(tab.en, tab.ar, lang)}</span>
                <span className="font-mono text-[10px] opacity-80 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div
          data-testid="global-search-results"
          className="flex-1 overflow-y-auto p-3 space-y-1.5"
        >
          {hits.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)] py-10 text-center">
              {t("search.empty", lang)}
            </p>
          ) : (
            hits.map((hit, idx) => {
              const Icon = getHitIcon(hit.type);
              const isActive = idx === activeIndex;
              return (
                <a
                  key={`${hit.type}-${hit.id}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  href={hit.route}
                  data-testid={`search-hit-${hit.type}-${hit.id}`}
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onClose()}
                  className={`block rounded-xl border p-3 transition-colors ${
                    isActive
                      ? "border-[var(--hub-secondary)] hub-subtle"
                      : "border-transparent hover:border-[var(--hub-border)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? "text-[var(--hub-secondary)]" : "text-[var(--hub-text-muted)]"
                      }`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-[var(--hub-text)] truncate">
                          <HighlightedText text={hit.title} query={debouncedQuery} />
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-[var(--hub-secondary)] uppercase tracking-wide">
                            {getHitTypeLabel(hit.type, lang)}
                          </span>
                          {isActive && (
                            <CornerDownLeft
                              aria-hidden="true"
                              className="w-3.5 h-3.5 text-[var(--hub-secondary)]"
                            />
                          )}
                        </div>
                      </div>

                      {hit.subtitle && (
                        <p className="text-xs text-[var(--hub-text-muted)] line-clamp-2">
                          <HighlightedText text={hit.subtitle} query={debouncedQuery} />
                        </p>
                      )}

                      {hit.tags && hit.tags.length > 0 && (
                        <div className="text-[11px] font-mono text-[var(--hub-text-muted)] truncate">
                          {hit.tags.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="px-4 py-2.5 border-t border-[var(--hub-border)] hub-subtle flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--hub-text-muted)]">
          <span>
            {L(
              "↑↓ Navigate · ↵ Open · Esc Close",
              "↑↓ للتنقل · ↵ للفتح · Esc للإغلاق",
              lang
            )}
          </span>
          <span className="tabular-nums">
            {hits.length}{" "}
            {hits.length === 1
              ? L("result", "نتيجة", lang)
              : L("results", "نتائج", lang)}
          </span>
        </div>
      </div>
    </div>
  );
};

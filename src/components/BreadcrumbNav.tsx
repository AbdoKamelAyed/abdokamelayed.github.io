import React, { useMemo } from "react";
import { ChevronRight, Home } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { buildBreadcrumbs, type HubRouteSection } from "../utils/breadcrumbs";
import { L } from "../utils/i18n";

interface BreadcrumbNavProps {
  section: HubRouteSection;
  param?: string | null;
  subParam?: string | null;
  data: HubDatasets;
  lang: Lang;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  section,
  param = null,
  subParam = null,
  data,
  lang,
}) => {
  const items = useMemo(
    () => buildBreadcrumbs({ section, param, subParam }, data, lang),
    [section, param, subParam, data, lang]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={L("Breadcrumb", "مسار التنقل", lang)}
      data-testid="breadcrumb-nav"
      className="mb-6 print:hidden"
    >
      <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-[13px] text-[var(--hub-text-muted)]">
        {items.map((item, idx) => {
          const isRoot = idx === 0;
          return (
            <li
              key={item.id}
              className="inline-flex items-center gap-1.5 min-w-0"
            >
              {idx > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[var(--hub-text-muted)] opacity-60 shrink-0 rtl:rotate-180"
                />
              )}

              {item.current ? (
                <span
                  aria-current="page"
                  title={item.label}
                  className="font-medium text-[var(--hub-text)] truncate max-w-[220px] sm:max-w-[380px] md:max-w-[520px]"
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  {isRoot && (
                    <Home aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

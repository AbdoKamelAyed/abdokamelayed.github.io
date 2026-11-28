import React from "react";
import type { Lang } from "../types/hub";
import type { HubRoute } from "../utils/breadcrumbs";
import { L } from "../utils/i18n";
import { resolveSkeletonVariant } from "../utils/skeletons";
import { LoadingSpinner } from "./LoadingSpinner";

export const PageSkeleton: React.FC<{ route: HubRoute; lang: Lang }> = ({ route, lang }) => {
  const variant = resolveSkeletonVariant(route);

  return (
    <div
      data-testid="page-skeleton"
      data-skeleton-variant={variant}
    >
      <LoadingSpinner
        lang={lang}
        size="lg"
        label={L("Loading section...", "جارٍ تحميل القسم...", lang)}
      />
    </div>
  );
};

export const InitialAppShellSkeleton: React.FC<{ route: HubRoute; lang: Lang }> = ({
  route,
  lang,
}) => (
  <div className="min-h-screen flex flex-col hub-canvas text-[var(--hub-text)]">
    <header className="sticky top-0 z-40 border-b border-[var(--hub-border)] hub-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <span className="font-display text-lg font-bold tracking-tight text-[var(--hub-text)]">
          ABDO
        </span>
        <LoadingSpinner
          lang={lang}
          size="sm"
          inline
          label={L("Syncing...", "جارٍ المزامنة...", lang)}
        />
      </div>
    </header>

    <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
      <PageSkeleton route={route} lang={lang} />
    </main>
  </div>
);

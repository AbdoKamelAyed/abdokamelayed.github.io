import React from "react";
import type { Lang } from "../types/hub";
import type { HubRoute } from "../utils/breadcrumbs";
import { L } from "../utils/i18n";
import { resolveSkeletonVariant, type SkeletonVariant } from "../utils/skeletons";

const Bone: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`rounded-lg bg-slate-200/80 dark:bg-slate-800/80 animate-pulse ${className}`}
  />
);

const HeaderSkeleton: React.FC<{ withToggle?: boolean }> = ({ withToggle = false }) => (
  <div className="border-b border-[var(--hub-border)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div className="space-y-2.5 flex-1">
      <Bone className="h-9 sm:h-10 w-64 max-w-full" />
      <Bone className="h-4 w-96 max-w-full" />
    </div>
    {withToggle && <Bone className="h-9 w-72 shrink-0" />}
  </div>
);

const HomeSkeleton: React.FC = () => (
  <div className="space-y-16">
    {/* Split Hero */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      <div className="lg:col-span-7 flex flex-col justify-between gap-6 py-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse shrink-0" />
            <Bone className="h-3.5 w-48" />
          </div>
          <Bone className="h-11 sm:h-14 w-full max-w-xl" />
          <Bone className="h-11 sm:h-12 w-4/5 max-w-lg" />
          <Bone className="h-4 w-full max-w-2xl" />
          <Bone className="h-4 w-2/3 max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Bone className="h-10 w-36" />
          <Bone className="h-10 w-36" />
          <Bone className="h-10 w-36" />
        </div>
      </div>
      <div className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] bg-slate-200/70 dark:bg-slate-800/70 animate-pulse min-h-[260px]" />
    </div>

    {/* GitHub KPI Strip */}
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--hub-border)] pb-3">
        <Bone className="h-6 w-56" />
        <Bone className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
            <Bone className="h-3.5 w-28" />
            <Bone className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>

    {/* Featured Projects Grid */}
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--hub-border)] pb-3">
        <Bone className="h-6 w-44" />
        <Bone className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-4">
            <Bone className="aspect-[16/10] w-full rounded-xl" />
            <Bone className="h-3 w-36" />
            <Bone className="h-6 w-4/5" />
            <Bone className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ProjectsGridSkeleton: React.FC = () => (
  <div className="space-y-8">
    <HeaderSkeleton />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Bone key={i} className="h-10 w-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--hub-border)] hub-surface overflow-hidden p-5 space-y-4"
        >
          <Bone className="aspect-[16/10] w-full rounded-xl" />
          <Bone className="h-3 w-40" />
          <Bone className="h-6 w-3/4" />
          <div className="space-y-2">
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-5/6" />
          </div>
          <div className="pt-2 border-t border-[var(--hub-border)] flex items-center justify-between">
            <Bone className="h-3 w-32" />
            <Bone className="h-3.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProjectDetailSkeleton: React.FC = () => (
  <div className="space-y-10">
    <Bone className="h-4 w-36" />
    <div className="border-b border-[var(--hub-border)] pb-8 space-y-4">
      <Bone className="h-3.5 w-64" />
      <Bone className="h-10 w-2/3 max-w-xl" />
      <Bone className="h-5 w-full max-w-2xl" />
      <div className="flex gap-3 pt-2">
        <Bone className="h-9 w-40" />
        <Bone className="h-9 w-32" />
      </div>
    </div>
    <Bone className="aspect-[16/9] w-full rounded-2xl" />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <Bone className="h-6 w-48" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-4/5" />
      </div>
      <div className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <Bone className="h-6 w-40" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-3/4" />
        <Bone className="h-4 w-5/6" />
      </div>
    </div>
  </div>
);

const JournalListSkeleton: React.FC<{ isIssues?: boolean }> = ({ isIssues = false }) => (
  <div className="space-y-8">
    <HeaderSkeleton withToggle />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-4"
        >
          <Bone className={`${isIssues ? "aspect-[4/3]" : "aspect-[16/9]"} w-full rounded-xl`} />
          <Bone className="h-3 w-44" />
          <Bone className="h-6 w-11/12" />
          <div className="space-y-2">
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-4/5" />
          </div>
          <div className="pt-2 border-t border-[var(--hub-border)] flex items-center justify-between">
            <Bone className="h-3 w-28" />
            <Bone className="h-3.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ArticleDetailSkeleton: React.FC = () => (
  <div className="space-y-12">
    <div className="flex items-center justify-between gap-3">
      <Bone className="h-4 w-36" />
      <div className="flex gap-2">
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-28" />
      </div>
    </div>
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="max-w-3xl space-y-3 border-b border-[var(--hub-border)] pb-6">
        <Bone className="h-3.5 w-48" />
        <Bone className="h-10 w-full max-w-2xl" />
        <Bone className="h-5 w-4/5" />
        <div className="flex items-center gap-3 pt-2">
          <div className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
          <Bone className="h-4 w-44" />
        </div>
        <div className="mt-3 rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-2">
          <Bone className="h-3 w-20" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
        </div>
      </div>
      <Bone className="max-w-3xl aspect-[16/9] w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,48rem)_250px] gap-8 lg:gap-10">
        <div className="space-y-4">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-11/12" />
          <Bone className="h-4 w-3/4" />
        </div>
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-4 space-y-3 h-44">
          <Bone className="h-3.5 w-32" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-4/5" />
          <Bone className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  </div>
);

const IssueDetailSkeleton: React.FC = () => (
  <div className="space-y-12">
    <div className="flex items-center justify-between gap-4">
      <Bone className="h-4 w-36" />
      <div className="flex gap-2">
        <Bone className="h-9 w-36" />
        <Bone className="h-9 w-36" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-[var(--hub-border)] pb-10">
      <div className="lg:col-span-7 space-y-4">
        <Bone className="h-3.5 w-60" />
        <Bone className="h-12 w-full max-w-xl" />
        <Bone className="h-5 w-4/5" />
        <Bone className="h-3.5 w-48" />
        <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-4 w-full" />
        </div>
      </div>
      <Bone className="lg:col-span-5 aspect-[4/3] w-full rounded-2xl" />
    </div>
    <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
      <Bone className="h-6 w-44" />
      {[0, 1, 2].map((i) => (
        <Bone key={i} className="h-10 w-full" />
      ))}
    </div>
  </div>
);

const GithubSkeleton: React.FC = () => (
  <div className="space-y-10">
    <HeaderSkeleton />
    <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-16 h-16 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <Bone className="h-6 w-56" />
          <Bone className="h-4 w-80 max-w-full" />
          <Bone className="h-3.5 w-72 max-w-full" />
        </div>
      </div>
      <Bone className="h-10 w-32 shrink-0" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-8 w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Bone className="h-64 w-full rounded-2xl" />
      <Bone className="h-64 w-full rounded-2xl" />
    </div>
  </div>
);

const WorkSkeleton: React.FC = () => (
  <div className="space-y-12">
    <HeaderSkeleton />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-6">
        <Bone className="h-6 w-52" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 pb-4 border-b last:border-b-0 border-[var(--hub-border)]">
            <Bone className="h-5 w-48" />
            <Bone className="h-3.5 w-64" />
            <Bone className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <Bone className="h-6 w-40" />
          <Bone className="h-14 w-full" />
          <Bone className="h-14 w-full" />
        </div>
        <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <Bone className="h-6 w-48" />
          <Bone className="h-12 w-full" />
        </div>
      </div>
    </div>
  </div>
);

const KnowledgeSkeleton: React.FC = () => (
  <div className="space-y-8">
    <HeaderSkeleton />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3">
          <Bone className="h-3 w-36" />
          <Bone className="h-6 w-4/5" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

const SplitTwoColumnSkeleton: React.FC<{ withAvatar?: boolean }> = ({ withAvatar = false }) => (
  <div className="space-y-10">
    {withAvatar ? (
      <div className="border-b border-[var(--hub-border)] pb-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <Bone className="h-3.5 w-52" />
          <Bone className="h-9 w-64" />
          <Bone className="h-4 w-80 max-w-full" />
        </div>
      </div>
    ) : (
      <HeaderSkeleton />
    )}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <Bone className="h-6 w-44" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <Bone className="h-24 w-full" />
      </div>
      <div className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
        <Bone className="h-6 w-44" />
        <Bone className="h-4 w-full" />
        <Bone className="h-24 w-full" />
        <Bone className="h-10 w-36" />
      </div>
    </div>
  </div>
);

const AdminSkeleton: React.FC = () => (
  <div className="space-y-8">
    <HeaderSkeleton withToggle />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--hub-border)] hub-surface p-5 space-y-3">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-8 w-16" />
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
      <Bone className="h-6 w-52" />
      <Bone className="h-44 w-full" />
    </div>
  </div>
);

function renderSkeletonVariant(variant: SkeletonVariant) {
  switch (variant) {
    case "home":
      return <HomeSkeleton />;
    case "projects-grid":
      return <ProjectsGridSkeleton />;
    case "project-detail":
      return <ProjectDetailSkeleton />;
    case "journal-list":
      return <JournalListSkeleton />;
    case "journal-issues":
      return <JournalListSkeleton isIssues />;
    case "article-detail":
      return <ArticleDetailSkeleton />;
    case "issue-detail":
      return <IssueDetailSkeleton />;
    case "github":
      return <GithubSkeleton />;
    case "work":
      return <WorkSkeleton />;
    case "knowledge":
      return <KnowledgeSkeleton />;
    case "about":
      return <SplitTwoColumnSkeleton withAvatar />;
    case "contact":
      return <SplitTwoColumnSkeleton />;
    case "admin":
      return <AdminSkeleton />;
  }
}

export const PageSkeleton: React.FC<{ route: HubRoute; lang: Lang }> = ({ route, lang }) => {
  const variant = resolveSkeletonVariant(route);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={L("Loading section content", "جارٍ تحميل محتوى القسم", lang)}
      data-testid="page-skeleton"
      data-skeleton-variant={variant}
    >
      {renderSkeletonVariant(variant)}
    </div>
  );
};

export const InitialAppShellSkeleton: React.FC<{ route: HubRoute; lang: Lang }> = ({
  route,
  lang,
}) => (
  <div className="min-h-screen flex flex-col hub-canvas text-[var(--hub-text)]">
    <div className="sticky top-0 z-40 border-b border-[var(--hub-border)] hub-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Bone className="h-6 w-20" />
        <div className="hidden lg:flex items-center gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} className="h-4 w-14" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-24" />
          <Bone className="h-9 w-24 hidden md:block" />
          <Bone className="h-9 w-24" />
        </div>
      </div>
    </div>

    <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <PageSkeleton route={route} lang={lang} />
    </main>
  </div>
);

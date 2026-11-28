import React, { useMemo, useState } from "react";
import {
  BookMarked,
  ExternalLink,
  Eye,
  FolderGit2,
  GitBranch,
  Globe,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Moon,
  PenSquare,
  Settings2,
  ShieldCheck,
  Sun,
  UserCheck,
  X,
} from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import type { AdminSessionRecord } from "../../utils/adminAuth";
import {
  ADMIN_WORKSPACE_MODULES,
  canAccessAdminModule,
  getAdminModuleLabel,
  type AdminNavGroup,
  type AdminWorkspaceSection,
} from "../../utils/adminPermissions";
import { buildAdminRouteHref } from "../../utils/router";
import { formatDateTime, L } from "../../utils/i18n";
import { AuthorAvatar } from "../AuthorProfileCard";
import { NetworkStatusToast } from "../NetworkStatusToast";

interface AdminWorkspaceShellProps {
  data: HubDatasets;
  lang: Lang;
  theme: "light" | "dark";
  session: AdminSessionRecord;
  activeSection: AdminWorkspaceSection;
  onSelectSection: (section: AdminWorkspaceSection) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

const SECTION_ICON: Record<AdminWorkspaceSection, React.ReactNode> = {
  overview: <LayoutDashboard className="w-4 h-4 shrink-0" />,
  visits: <Eye className="w-4 h-4 shrink-0" />,
  editor: <PenSquare className="w-4 h-4 shrink-0" />,
  media: <Layers className="w-4 h-4 shrink-0" />,
  issues: <BookMarked className="w-4 h-4 shrink-0" />,
  projects: <FolderGit2 className="w-4 h-4 shrink-0" />,
  knowledge: <Library className="w-4 h-4 shrink-0" />,
  github: <GitBranch className="w-4 h-4 shrink-0" />,
  settings: <Settings2 className="w-4 h-4 shrink-0" />,
  access: <UserCheck className="w-4 h-4 shrink-0" />,
};

const GROUP_LABELS: Record<AdminNavGroup, { en: string; ar: string }> = {
  workspace: { en: "Workspace", ar: "مساحة العمل" },
  editorial: { en: "Editorial & Media", ar: "التحرير والوسائط" },
  portfolio: { en: "Portfolio & Sync", ar: "المشاريع والمزامنة" },
  administration: { en: "Administration", ar: "الإدارة والأمان" },
};

const GROUP_ORDER: AdminNavGroup[] = ["workspace", "editorial", "portfolio", "administration"];

export const AdminWorkspaceShell: React.FC<AdminWorkspaceShellProps> = ({
  data,
  lang,
  theme,
  session,
  activeSection,
  onSelectSection,
  onToggleTheme,
  onToggleLang,
  onSignOut,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groupedModules = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      label: L(GROUP_LABELS[group].en, GROUP_LABELS[group].ar, lang),
      items: ADMIN_WORKSPACE_MODULES.filter(
        (m) => m.group === group && canAccessAdminModule(session, m.id)
      ),
    })).filter((g) => g.items.length > 0);
  }, [session, lang]);

  const activeTitle = getAdminModuleLabel(activeSection, lang);

  const handleNavClick = (sectionId: AdminWorkspaceSection) => {
    setSidebarOpen(false);
    onSelectSection(sectionId);
  };

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6 p-4 overflow-y-auto">
        <div className="flex items-center justify-between gap-2 px-1">
          <a
            href="#/admin"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("overview");
            }}
            className="flex items-center gap-2.5 min-w-0"
          >
            <span className="font-display text-lg font-bold tracking-tight text-[var(--hub-text)] whitespace-nowrap">
              {data.website.shortTitle || "ABDO"}
            </span>
            <span className="text-xs font-mono text-[var(--hub-text-muted)] whitespace-nowrap">
              / {L("Workspace", "الإدارة", lang)}
            </span>
          </a>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label={L("Close workspace menu", "إغلاق قائمة الإدارة", lang)}
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Administrator Profile Summary */}
        <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 flex items-center gap-3 min-w-0">
          <AuthorAvatar
            src={session.avatarUrl || data.profileSettings.avatarUrl}
            name={session.displayName || session.username}
            sizeClass="w-10 h-10"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate text-[var(--hub-text)]">
              {session.displayName || session.username}
            </div>
            <div className="text-[11px] font-mono text-[var(--hub-text-muted)] truncate">
              @{session.username} · {session.role}
            </div>
          </div>
        </div>

        {/* Role-Filtered Workspace Navigation */}
        <nav
          aria-label={L("Admin Workspace Navigation", "تنقل مساحة الإدارة", lang)}
          data-testid="admin-workspace-nav"
          className="space-y-5"
        >
          {groupedModules.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-2.5 text-[11px] font-semibold text-[var(--hub-text-muted)]">
                {grp.label}
              </div>
              <div className="space-y-1">
                {grp.items.map((mod) => {
                  const isActive = activeSection === mod.id;
                  return (
                    <a
                      key={mod.id}
                      href={buildAdminRouteHref(mod.id)}
                      data-testid={`admin-nav-${mod.id}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(mod.id);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                        isActive
                          ? "bg-[var(--hub-primary)] text-[var(--hub-bg)] font-semibold"
                          : "text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      {SECTION_ICON[mod.id]}
                      <span className="truncate">{L(mod.label.en, mod.label.ar, lang)}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Workspace Controls */}
      <div className="p-4 border-t border-[var(--hub-border)] space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="px-2.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:border-[var(--hub-secondary)] cursor-pointer whitespace-nowrap"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === "dark" ? L("Light", "فاتح", lang) : L("Dark", "داكن", lang)}</span>
          </button>
          <button
            type="button"
            onClick={onToggleLang}
            className="px-2.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:border-[var(--hub-secondary)] cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "EN" : "العربية"}</span>
          </button>
        </div>

        <a
          href="#/"
          data-testid="exit-admin-workspace-link"
          className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold flex items-center justify-between gap-2 text-[var(--hub-text)] hover:border-[var(--hub-secondary)] whitespace-nowrap"
        >
          <span>{L("View Public Hub", "عرض الموقع العام", lang)}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      </div>
    </div>
  );

  return (
    <div
      data-testid="admin-workspace-shell"
      className="min-h-screen flex hub-canvas text-[var(--hub-text)] transition-colors duration-200"
    >
      {/* Desktop Persistent Workspace Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-e border-[var(--hub-border)] hub-surface flex-col sticky top-0 h-screen">
        {renderSidebarBody()}
      </aside>

      {/* Mobile Slide-Over Workspace Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label={L("Close navigation backdrop", "إغلاق القائمة", lang)}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/50 cursor-pointer"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full border-e border-[var(--hub-border)] hub-surface flex flex-col">
            {renderSidebarBody()}
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 border-b border-[var(--hub-border)] hub-surface px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={L("Open workspace menu", "فتح قائمة الإدارة", lang)}
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="hidden sm:inline font-medium text-[var(--hub-text-muted)] whitespace-nowrap">
                {L("Admin Workspace", "مساحة الإدارة", lang)}
              </span>
              <span className="hidden sm:inline text-[var(--hub-text-muted)]">/</span>
              <h1 className="font-display text-base sm:text-lg font-bold truncate">
                {activeTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div
              data-testid="admin-active-role"
              className="hidden md:flex items-center gap-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{session.role}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--hub-text-muted)]">
                {L("Exp", "ينتهي", lang)} {formatDateTime(session.expiresAt, lang)}
              </span>
            </div>

            <a
              href="#/"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--hub-border)] text-xs font-semibold hover:border-[var(--hub-secondary)] whitespace-nowrap"
            >
              <span>{L("Public Hub", "الموقع", lang)}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              data-testid="admin-signout-btn"
              onClick={onSignOut}
              className="h-9 px-3 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{L("Lock & Sign Out", "قفل وخروج", lang)}</span>
            </button>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        >
          {children}
        </main>
      </div>

      <NetworkStatusToast lang={lang} />
    </div>
  );
};

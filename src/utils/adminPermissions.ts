import type { Lang } from "../types/hub";
import { L } from "./i18n";

export type AdminRole = "Owner" | "Managing Editor" | "Author";

export type AdminWorkspaceSection =
  | "overview"
  | "visits"
  | "editor"
  | "media"
  | "issues"
  | "projects"
  | "knowledge"
  | "github"
  | "settings"
  | "access";

export type AdminNavGroup = "workspace" | "editorial" | "portfolio" | "administration";

export interface AdminWorkspaceModuleDef {
  id: AdminWorkspaceSection;
  group: AdminNavGroup;
  href: string;
  label: { en: string; ar: string };
  description: { en: string; ar: string };
  defaultRoles: AdminRole[];
  ownerOnly?: boolean;
}

export const ADMIN_WORKSPACE_MODULES: AdminWorkspaceModuleDef[] = [
  {
    id: "overview",
    group: "workspace",
    href: "#/admin/overview",
    label: { en: "Command Dashboard", ar: "لوحة التحكم" },
    description: {
      en: "Analytics charts, content health, local draft status, and system audit summary.",
      ar: "الرسوم البيانية، سلامة المحتوى، حالة المسودات، وملخص التدقيق.",
    },
    defaultRoles: ["Owner", "Managing Editor", "Author"],
  },
  {
    id: "visits",
    group: "workspace",
    href: "#/admin/visits",
    label: { en: "Visit Insights", ar: "تحليلات الزيارات" },
    description: {
      en: "Detailed route traffic trends, article/project views, device splits, and CSV export.",
      ar: "تفاصيل حركة الزوار والمشاهدات وتوزيع الأجهزة وتصدير CSV.",
    },
    defaultRoles: ["Owner", "Managing Editor"],
  },
  {
    id: "editor",
    group: "editorial",
    href: "#/admin/editor",
    label: { en: "Rich Article Editor", ar: "المحرر المتقدم" },
    description: {
      en: "Compose bilingual articles, code blocks, media embeds, and SEO metadata.",
      ar: "تحرير المقالات ثنائية اللغة والكتل البرمجية وبيانات SEO.",
    },
    defaultRoles: ["Owner", "Managing Editor", "Author"],
  },
  {
    id: "media",
    group: "editorial",
    href: "#/admin/media",
    label: { en: "Media Library & Drive", ar: "مكتبة الوسائط وDrive" },
    description: {
      en: "Upload media to Google Drive or GitHub storage and manage reusable assets.",
      ar: "رفع الوسائط إلى Google Drive أو مستودع GitHub وإدارة الأصول.",
    },
    defaultRoles: ["Owner", "Managing Editor", "Author"],
  },
  {
    id: "issues",
    group: "editorial",
    href: "#/admin/issues",
    label: { en: "Issues & PDF Maker", ar: "الأعداد وصانع PDF" },
    description: {
      en: "Curate multi-article journal editions and generate print-ready PDFs.",
      ar: "تنسيق الأعداد الدورية وإعداد نسخ الطباعة PDF.",
    },
    defaultRoles: ["Owner", "Managing Editor"],
  },
  {
    id: "projects",
    group: "portfolio",
    href: "#/admin/projects",
    label: { en: "Projects", ar: "المشاريع" },
    description: {
      en: "Create, edit, prioritize, and sync project portfolio updates to GitHub.",
      ar: "إنشاء وتعديل المشاريع ومزامنة تحديثاتها مع GitHub.",
    },
    defaultRoles: ["Owner", "Managing Editor"],
  },
  {
    id: "knowledge",
    group: "portfolio",
    href: "#/admin/knowledge",
    label: { en: "Knowledge & Work", ar: "المعرفة والخبرات" },
    description: {
      en: "Publish reference notes, technical digests, and work experience milestones.",
      ar: "نشر الملاحظات المرجعية وسجل الخبرات العملية.",
    },
    defaultRoles: ["Owner", "Managing Editor", "Author"],
  },
  {
    id: "github",
    group: "portfolio",
    href: "#/admin/github",
    label: { en: "GitHub Sync & Storage", ar: "مزامنة وتخزين GitHub" },
    description: {
      en: "Commit local edits directly to a target GitHub repository and pull latest datasets.",
      ar: "دفع التعديلات المحلية مباشرة إلى مستودع GitHub وسحب أحدث البيانات.",
    },
    defaultRoles: ["Owner", "Managing Editor"],
  },
  {
    id: "settings",
    group: "administration",
    href: "#/admin/settings",
    label: { en: "SEO & Site Settings", ar: "SEO وإعدادات الموقع" },
    description: {
      en: "Customize themes, typography, internal profiles, search indexing, and security.",
      ar: "تخصيص السمات والخطوط والملفات الداخلية وإعدادات محركات البحث.",
    },
    defaultRoles: ["Owner"],
  },
  {
    id: "access",
    group: "administration",
    href: "#/admin/access",
    label: { en: "Administrator Access", ar: "صلاحيات الإدارة" },
    description: {
      en: "Manage administrator roles, per-module workspace permissions, and security logs.",
      ar: "إدارة أدوار المسؤولين وصلاحيات الأقسام وسجلات الأمان.",
    },
    defaultRoles: ["Owner"],
    ownerOnly: true,
  },
];

const VALID_MODULE_IDS = new Set<AdminWorkspaceSection>(
  ADMIN_WORKSPACE_MODULES.map((m) => m.id)
);

export function isAdminWorkspaceSection(value: string | null | undefined): value is AdminWorkspaceSection {
  return Boolean(value && VALID_MODULE_IDS.has(value as AdminWorkspaceSection));
}

export function getAdminModuleDefinition(section: AdminWorkspaceSection): AdminWorkspaceModuleDef {
  return (
    ADMIN_WORKSPACE_MODULES.find((m) => m.id === section) ||
    ADMIN_WORKSPACE_MODULES[0]
  );
}

export function getAdminModuleLabel(section: AdminWorkspaceSection, lang: Lang): string {
  const def = getAdminModuleDefinition(section);
  return L(def.label.en, def.label.ar, lang);
}

export function getDefaultModulesForRole(role: AdminRole): AdminWorkspaceSection[] {
  return ADMIN_WORKSPACE_MODULES.filter((m) => m.defaultRoles.includes(role)).map((m) => m.id);
}

export function resolveEffectiveModules(subject: {
  role: AdminRole;
  allowedModules?: AdminWorkspaceSection[];
}): AdminWorkspaceSection[] {
  if (subject.role === "Owner") {
    return ADMIN_WORKSPACE_MODULES.map((m) => m.id);
  }

  const base =
    Array.isArray(subject.allowedModules) && subject.allowedModules.length > 0
      ? subject.allowedModules
      : getDefaultModulesForRole(subject.role);

  const sanitized = new Set<AdminWorkspaceSection>(["overview"]);
  for (const mod of base) {
    if (!VALID_MODULE_IDS.has(mod)) continue;
    const def = getAdminModuleDefinition(mod);
    if (def.ownerOnly) continue;
    sanitized.add(mod);
  }

  return ADMIN_WORKSPACE_MODULES.filter((m) => sanitized.has(m.id)).map((m) => m.id);
}

export function canAccessAdminModule(
  subject: { role: AdminRole; allowedModules?: AdminWorkspaceSection[] } | null | undefined,
  moduleId: AdminWorkspaceSection
): boolean {
  if (!subject) return false;
  return resolveEffectiveModules(subject).includes(moduleId);
}

export function getRoleSummary(role: AdminRole, lang: Lang): string {
  switch (role) {
    case "Owner":
      return L(
        "Full system control, administrator access management, site themes, and repository sync.",
        "تحكم كامل بالنظام وإدارة صلاحيات المسؤولين والسمات ومزامنة المستودع.",
        lang
      );
    case "Managing Editor":
      return L(
        "Editorial publishing, projects, issues, media library, and GitHub dataset sync.",
        "النشر التحريري وإدارة المشاريع والأعداد ومكتبة الوسائط ومزامنة GitHub.",
        lang
      );
    case "Author":
      return L(
        "Focused authoring access for articles, media uploads, and knowledge entries.",
        "صلاحيات تحرير مخصصة للمقالات ورفع الوسائط وإدخالات المعرفة.",
        lang
      );
  }
}

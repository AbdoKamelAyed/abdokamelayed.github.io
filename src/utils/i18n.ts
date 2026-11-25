import type { Lang, LocalizedText } from "../types/hub";

const DICT: Record<string, Record<Lang, string>> = {
  "nav.home": { en: "Home", ar: "الرئيسية" },
  "nav.projects": { en: "Projects", ar: "المشاريع" },
  "nav.github": { en: "GitHub", ar: "جيت هاب" },
  "nav.work": { en: "Work", ar: "الخبرات" },
  "nav.journal": { en: "Journal", ar: "المدونة" },
  "nav.knowledge": { en: "Knowledge", ar: "المعرفة" },
  "nav.about": { en: "About", ar: "عني" },
  "nav.contact": { en: "Contact", ar: "تواصل" },
  "nav.admin": { en: "Admin", ar: "الإدارة" },
  "common.all": { en: "All", ar: "الكل" },
  "common.na": { en: "N/A", ar: "غير متاح" },
  "common.viewAll": { en: "View all", ar: "عرض الكل" },
  "common.readMore": { en: "Read details", ar: "اقرأ التفاصيل" },
  "common.back": { en: "Back", ar: "رجوع" },
  "common.empty": { en: "No entries available yet.", ar: "لا توجد عناصر متاحة حالياً." },
  "common.source": { en: "Source", ar: "المصدر" },
  "common.updated": { en: "Updated", ar: "آخر تحديث" },
  "common.created": { en: "Created", ar: "تاريخ الإنشاء" },
  "search.title": { en: "Unified Search", ar: "البحث الشامل" },
  "search.placeholder": {
    en: "Search projects, repositories, articles, knowledge, skills...",
    ar: "ابحث في المشاريع، المستودعات، المقالات، المعرفة، المهارات...",
  },
  "search.empty": { en: "No matching records found.", ar: "لا توجد نتائج مطابقة." },
  "home.featuredProjects": { en: "Featured Projects", ar: "المشاريع المميزة" },
  "home.recentGithub": { en: "Recent GitHub Activity", ar: "أحدث نشاط على GitHub" },
  "home.githubStats": { en: "GitHub Intelligence Snapshot", ar: "ملخص تحليلات GitHub" },
  "home.latestJournal": { en: "Latest Publications", ar: "أحدث المنشورات" },
  "home.interests": { en: "Technical Interests & Achievements", ar: "الاهتمامات التقنية والإنجازات" },
  "github.title": { en: "GitHub Intelligence", ar: "تحليلات GitHub" },
  "github.subtitle": {
    en: "Automated public profile, repository explorer, language distribution, commit history, and development timeline.",
    ar: "مزامنة آلية للحساب العام، مستكشف المستودعات، توزيع اللغات، سجل الالتزامات، والخط الزمني للتطوير.",
  },
  "github.disclaimerContrib": {
    en: "Contribution calendar metrics (GraphQL) are kept strictly distinct from public repository commit samples.",
    ar: "تُعرض بيانات تقويم المساهمات (GraphQL) بشكل منفصل عن عينات الالتزامات المسترجعة من المستودعات العامة.",
  },
  "github.disclaimerLang": {
    en: "Language percentages reflect GitHub Linguist byte counts across public repositories, not actual development hours.",
    ar: "تعكس نسب اللغات أحجام البايتات المسجلة في GitHub وليست ساعات التطوير الفعلية.",
  },
  "projects.title": { en: "Projects Showcase", ar: "معرض المشاريع" },
  "projects.subtitle": {
    en: "Curated web applications, industrial systems, tools, research, and linked repositories.",
    ar: "تطبيقات الويب، الأنظمة الصناعية، الأدوات، الأبحاث، والمستودعات المرتبطة.",
  },
  "work.title": { en: "Experience & Capabilities", ar: "الخبرات والقدرات" },
  "work.subtitle": {
    en: "Professional and industrial experience, technical capabilities, knowledge areas, and research interests.",
    ar: "الخبرة المهنية والصناعية، المهارات التقنية، مجالات المعرفة، والاهتمامات البحثية.",
  },
  "journal.title": { en: "Editorial Journal", ar: "المدونة والمجلة التقنية" },
  "journal.subtitle": {
    en: "Articles, technical notes, development logs, research notes, and tutorials.",
    ar: "مقالات، ملاحظات تقنية، سجلات تطوير، ملاحظات بحثية، وشروحات.",
  },
  "knowledge.title": { en: "Knowledge Archive", ar: "أرشيف المعرفة" },
  "knowledge.subtitle": {
    en: "Structured personal notes and verified external references with explicit source attribution.",
    ar: "ملاحظات شخصية منظمة ومراجع خارجية موثقة مع توضيح صريح لمصدر كل معلومة.",
  },
  "about.title": { en: "About Abdo Kamel", ar: "عن عبدو كامل" },
  "contact.title": { en: "Contact & Channels", ar: "التواصل والقنوات" },
  "admin.title": { en: "Admin Workspace", ar: "مساحة الإدارة" },
};

export function t(key: string, lang: Lang): string {
  return DICT[key]?.[lang] || DICT[key]?.en || key;
}

export function L(en: string, ar: string, lang: Lang): string {
  return lang === "ar" ? ar : en;
}

export function loc(val: LocalizedText | null | undefined, lang: Lang): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  return val[lang] || val.en || val.ar || "";
}

export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return t("common.na", lang);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t("common.na", lang);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return t("common.na", lang);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t("common.na", lang);
  const hasExplicitTime = /T\d{2}:\d{2}/.test(iso);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(hasExplicitTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

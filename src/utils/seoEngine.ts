import type { HubDatasets, Lang } from "../types/hub";
import { loc } from "./i18n";
import { safeUrl } from "./analytics";

export interface SeoAuditItem {
  id: string;
  category: "technical" | "content" | "social" | "schema";
  title: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  fixHint: string;
}

export function analyzeSeoAudit(data: HubDatasets, lang: Lang): SeoAuditItem[] {
  const siteTitle = (data.website.siteName || "").trim();
  const descEn =
    typeof data.website.seoDescription === "string"
      ? data.website.seoDescription
      : data.website.seoDescription.en || "";
  const descAr =
    typeof data.website.seoDescription === "string"
      ? data.website.seoDescription
      : data.website.seoDescription.ar || "";
  const domain = (data.website.domain || "").trim();
  const avatar = safeUrl(data.website.ogImage || data.profileSettings.avatarUrl);

  const missingArticleSeo = data.articles.filter(
    (a) => !(a.seo?.description && a.seo.description.trim().length >= 50)
  );
  const missingCovers = data.articles.filter((a) => !safeUrl(a.coverImage));
  const missingAuthor = !data.profileSettings.avatarUrl || !loc(data.profileSettings.fullName, lang);

  const items: SeoAuditItem[] = [
    {
      id: "seo-site-title",
      category: "technical",
      title: lang === "ar" ? "طول عنوان الموقع (<title>)" : "Site Title Length (<title>)",
      status: siteTitle.length >= 25 && siteTitle.length <= 65 ? "pass" : siteTitle ? "warn" : "fail",
      detail: `${siteTitle.length} chars (recommended 30–65)`,
      fixHint:
        lang === "ar"
          ? "حافظ على عنوان وصفي مع العلامة التجارية بين 30 و65 حرفاً."
          : "Keep a branded descriptive title between 30 and 65 characters.",
    },
    {
      id: "seo-desc-en",
      category: "content",
      title: lang === "ar" ? "الوصف التعريفي الإنجليزي" : "Primary Meta Description (EN)",
      status: descEn.length >= 110 && descEn.length <= 165 ? "pass" : descEn.length >= 60 ? "warn" : "fail",
      detail: `${descEn.trim().length} chars (optimal 110–160)`,
      fixHint:
        lang === "ar"
          ? "اكتب ملخصاً جذاباً بين 110 و160 حرفاً لمنع الاقتطاع في نتائج البحث."
          : "Write a clear summary between 110 and 160 characters to avoid snippet truncation.",
    },
    {
      id: "seo-desc-ar",
      category: "content",
      title: lang === "ar" ? "الوصف التعريفي العربي" : "Bilingual Meta Description (AR)",
      status: descAr.trim().length >= 80 ? "pass" : descAr.trim().length > 0 ? "warn" : "fail",
      detail: `${descAr.trim().length} chars`,
      fixHint:
        lang === "ar"
          ? "أضف وصفاً عربياً كاملاً لدعم الزوار ومشاركة الروابط بالعربية."
          : "Provide dedicated Arabic meta description for bilingual discoverability.",
    },
    {
      id: "seo-canonical",
      category: "technical",
      title: lang === "ar" ? "النطاق الأساسي والرابط المعتمد" : "Canonical HTTPS Domain",
      status: domain.startsWith("https://") ? "pass" : "fail",
      detail: domain || "Missing domain",
      fixHint:
        lang === "ar"
          ? "عيّن رابط HTTPS صريح لبناء canonical و sitemap.xml."
          : "Configure an explicit HTTPS canonical base URL for canonical links & sitemap.xml.",
    },
    {
      id: "seo-og-image",
      category: "social",
      title: lang === "ar" ? "صورة المشاركة الاجتماعية وهوية الكاتب" : "OpenGraph Image & Author Portrait",
      status: avatar ? "pass" : "warn",
      detail: avatar ? avatar : "No og:image or author portrait configured",
      fixHint:
        lang === "ar"
          ? "عيّن صورة غلاف افتراضية أو صورة للكاتب لبطاقات Twitter/LinkedIn."
          : "Set a default OG share card image and author portrait for rich social cards.",
    },
    {
      id: "seo-articles-meta",
      category: "content",
      title: lang === "ar" ? "بيانات SEO للمقالات المنشورة" : "Published Articles SEO Coverage",
      status: missingArticleSeo.length === 0 && missingCovers.length === 0 ? "pass" : "warn",
      detail: `${data.articles.length - missingArticleSeo.length}/${data.articles.length} with meta descriptions · ${data.articles.length - missingCovers.length}/${data.articles.length} with covers`,
      fixHint:
        missingArticleSeo.length > 0
          ? `Add >=50 char SEO description to: ${missingArticleSeo.map((a) => a.slug).join(", ")}`
          : "All published articles have descriptive SEO summaries and cover images.",
    },
    {
      id: "seo-schema-jsonld",
      category: "schema",
      title: lang === "ar" ? "البيانات المهيكلة Schema.org JSON-LD" : "Dynamic Schema.org JSON-LD Markup",
      status: !missingAuthor && domain.startsWith("https://") ? "pass" : "warn",
      detail: "Person + WebSite + BlogPosting + PublicationIssue schemas active",
      fixHint:
        lang === "ar"
          ? "يتم حقن مخططات Person و BlogPosting و PublicationIssue ديناميكياً لكل مسار."
          : "Routes inject live Person, BlogPosting, SoftwareSourceCode, and PublicationIssue schemas.",
    },
  ];

  return items;
}

export function generateSitemapXml(data: HubDatasets): string {
  const base = (data.website.domain || "https://abdokamelayed.github.io").replace(/\/+$/, "");
  const urls: { locUrl: string; lastmod: string; priority: string }[] = [
    { locUrl: `${base}/`, lastmod: data.website.updatedAt || new Date().toISOString().slice(0, 10), priority: "1.0" },
    { locUrl: `${base}/#/projects`, lastmod: data.website.updatedAt || new Date().toISOString().slice(0, 10), priority: "0.9" },
    { locUrl: `${base}/#/journal`, lastmod: data.website.updatedAt || new Date().toISOString().slice(0, 10), priority: "0.9" },
    { locUrl: `${base}/#/knowledge`, lastmod: data.website.updatedAt || new Date().toISOString().slice(0, 10), priority: "0.8" },
    { locUrl: `${base}/#/about`, lastmod: data.profileSettings.updatedAt || new Date().toISOString().slice(0, 10), priority: "0.8" },
  ];

  for (const p of data.projects) {
    urls.push({
      locUrl: `${base}/#/projects/${encodeURIComponent(p.slug || p.id)}`,
      lastmod: (p.updatedAt || p.createdAt || "").slice(0, 10) || "2026-11-25",
      priority: "0.8",
    });
  }
  for (const a of data.articles) {
    urls.push({
      locUrl: `${base}/#/journal/${encodeURIComponent(a.slug || a.id)}`,
      lastmod: (a.updatedAt || a.publishedAt || "").slice(0, 10) || "2026-11-25",
      priority: a.featured ? "0.9" : "0.75",
    });
  }
  for (const issue of data.issues) {
    urls.push({
      locUrl: `${base}/#/journal/issues/${encodeURIComponent(issue.slug || issue.id)}`,
      lastmod: (issue.updatedAt || issue.publishedAt || "").slice(0, 10) || "2026-11-25",
      priority: "0.85",
    });
  }

  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.locUrl)}</loc>\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function generateRobotsTxt(domain: string): string {
  const base = (domain || "https://abdokamelayed.github.io").replace(/\/+$/, "");
  return `User-agent: *\nAllow: /\nDisallow: /#/admin\n\nSitemap: ${base}/sitemap.xml\n`;
}

export function buildStructuredDataJsonLd(
  data: HubDatasets,
  route: { section: string; param: string | null; subParam?: string | null },
  lang: Lang
): Record<string, unknown> {
  const base = (data.website.domain || "https://abdokamelayed.github.io").replace(/\/+$/, "");
  const personName = loc(data.profileSettings.fullName, lang) || "Abdo Kamel";
  const avatar = safeUrl(data.profileSettings.avatarUrl || data.website.ogImage);

  if (route.section === "journal" && route.param === "issues" && route.subParam) {
    const issue = data.issues.find(
      (x) => x.slug === decodeURIComponent(route.subParam!) || x.id === route.subParam
    );
    if (issue) {
      return {
        "@context": "https://schema.org",
        "@type": "PublicationIssue",
        name: loc(issue.title, lang),
        issueNumber: issue.issueNumber,
        datePublished: issue.publishedAt,
        description: loc(issue.subtitle, lang),
        image: safeUrl(issue.coverImage) || avatar || undefined,
        url: `${base}/#/journal/issues/${encodeURIComponent(issue.slug)}`,
      };
    }
  }

  if (route.section === "journal" && route.param) {
    const art = data.articles.find(
      (x) => x.slug === decodeURIComponent(route.param!) || x.id === route.param
    );
    if (art) {
      return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: loc(art.title, lang),
        description: art.seo?.description || loc(art.subtitle, lang),
        datePublished: art.publishedAt,
        dateModified: art.updatedAt,
        image: safeUrl(art.coverImage) || avatar || undefined,
        keywords: art.tags.join(", "),
        author: {
          "@type": "Person",
          name: art.author || personName,
          image: safeUrl(art.authorAvatar) || avatar || undefined,
        },
        url: `${base}/#/journal/${encodeURIComponent(art.slug)}`,
      };
    }
  }

  if (route.section === "projects" && route.param) {
    const proj = data.projects.find(
      (x) => x.slug === decodeURIComponent(route.param!) || x.id === route.param
    );
    if (proj) {
      return {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: loc(proj.name, lang),
        description: loc(proj.shortDescription, lang),
        codeRepository: proj.githubRepoUrl || undefined,
        programmingLanguage: proj.techStack,
      };
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: personName,
    alternateName: data.profileSettings.githubUsername || "AbdoKamelAyed",
    description: loc(data.website.seoDescription, lang),
    image: avatar || undefined,
    url: `${base}/`,
    sameAs: [
      data.profileSettings.contact.github,
      data.profileSettings.contact.linkedin,
      ...(data.profileSettings.contact.otherLinks || []).map((l) => l.url),
    ].filter(Boolean),
  };
}

export function applyPageSeoMetadata(
  data: HubDatasets,
  route: { section: string; param: string | null; subParam?: string | null },
  lang: Lang
): void {
  if (typeof document === "undefined") return;
  const baseTitle = data.website.siteName || "ABDO — Personal Digital Hub";
  const baseDomain = (data.website.domain || window.location.origin).replace(/\/+$/, "");
  let pageTitle = baseTitle;
  let description = loc(data.website.seoDescription, lang);
  let ogType = "website";
  let ogImage = safeUrl(data.website.ogImage || data.profileSettings.avatarUrl);
  let canonical = `${baseDomain}/`;

  if (route.section === "projects" && route.param) {
    const p = data.projects.find((x) => x.slug === decodeURIComponent(route.param!) || x.id === route.param);
    if (p) {
      pageTitle = `${loc(p.name, lang)} — ${baseTitle}`;
      description = loc(p.shortDescription, lang) || description;
      canonical = `${baseDomain}/#/projects/${encodeURIComponent(p.slug || p.id)}`;
      ogImage = safeUrl(p.screenshots?.[0]) || ogImage;
    }
  } else if (route.section === "journal" && route.param === "issues" && route.subParam) {
    const issue = data.issues.find(
      (x) => x.slug === decodeURIComponent(route.subParam!) || x.id === route.subParam
    );
    if (issue) {
      pageTitle = `${loc(issue.title, lang)} — ${baseTitle}`;
      description = loc(issue.subtitle, lang) || description;
      ogType = "article";
      ogImage = safeUrl(issue.coverImage) || ogImage;
      canonical = `${baseDomain}/#/journal/issues/${encodeURIComponent(issue.slug || issue.id)}`;
    }
  } else if (route.section === "journal" && route.param) {
    const a = data.articles.find((x) => x.slug === decodeURIComponent(route.param!) || x.id === route.param);
    if (a) {
      pageTitle = `${loc(a.title, lang)} — ${baseTitle}`;
      description = a.seo?.description || loc(a.subtitle, lang) || description;
      ogType = "article";
      ogImage = safeUrl(a.coverImage) || ogImage;
      canonical = `${baseDomain}/#/journal/${encodeURIComponent(a.slug || a.id)}`;
    }
  } else if (route.section !== "home") {
    pageTitle = `${route.section.toUpperCase()} — ${baseTitle}`;
    canonical = `${baseDomain}/#/${route.section}`;
  }

  document.title = pageTitle;

  const upsertMeta = (attr: "name" | "property", key: string, value: string) => {
    if (!value) return;
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  };

  upsertMeta("name", "description", description);
  upsertMeta("property", "og:type", ogType);
  upsertMeta("property", "og:title", pageTitle);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", ogImage);
  upsertMeta("name", "twitter:title", pageTitle);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", ogImage);

  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) canonicalEl.setAttribute("href", canonical);

  const ld = buildStructuredDataJsonLd(data, route, lang);
  let scriptEl = document.getElementById("structured-data");
  if (!scriptEl) {
    scriptEl = document.createElement("script");
    scriptEl.id = "structured-data";
    scriptEl.setAttribute("type", "application/ld+json");
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(ld, null, 2);
}

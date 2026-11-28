import type { ArticleRecord, KnowledgeEntry, Lang } from "../types/hub";
import { calculateReadingTimeMinutes } from "./analytics";
import { loc } from "./i18n";

export interface PrintCoverMetadata {
  kicker: string;
  sectionLabel: string;
  title: string;
  subtitle?: string;
  dateLabel: string;
  readingTimeMinutes: number;
  readingTimeLabel: string;
  authorLabel: string;
  tagsLine?: string;
  summaryText?: string;
}

export function formatReadingTimeLabel(minutes: number, lang: Lang): string {
  const safeMin = Math.max(1, Math.round(minutes));
  return lang === "ar" ? `${safeMin} دقيقة قراءة` : `${safeMin} min read`;
}

export function buildJournalPrintCoverMeta(params: {
  article: ArticleRecord;
  siteName: string;
  authorName: string;
  authorHandle?: string;
  formattedDate: string;
  summaryText?: string;
  lang: Lang;
}): PrintCoverMetadata {
  const { article, siteName, authorName, authorHandle, formattedDate, summaryText, lang } = params;
  const content = loc(article.content, lang);
  const readingTimeMinutes = calculateReadingTimeMinutes(content);
  const authorDisplay = authorHandle ? `${authorName} (${authorHandle})` : authorName;

  return {
    kicker: siteName || "ABDO Digital Hub",
    sectionLabel: `${lang === "ar" ? "المدونة" : "Journal"} · ${article.type}`,
    title: loc(article.title, lang),
    subtitle: loc(article.subtitle, lang) || undefined,
    dateLabel: formattedDate,
    readingTimeMinutes,
    readingTimeLabel: formatReadingTimeLabel(readingTimeMinutes, lang),
    authorLabel: authorDisplay,
    tagsLine: article.tags.length > 0 ? article.tags.map((tg) => `#${tg}`).join(" · ") : undefined,
    summaryText: summaryText || undefined,
  };
}

export function buildKnowledgePrintCoverMeta(params: {
  entry: KnowledgeEntry;
  siteName: string;
  formattedDate: string;
  lang: Lang;
}): PrintCoverMetadata {
  const { entry, siteName, formattedDate, lang } = params;
  const title = loc(entry.title, lang);
  const summary = loc(entry.summary, lang);
  const readingTimeMinutes = calculateReadingTimeMinutes(`${title} ${summary}`);
  const typeLabel =
    entry.entryType === "verified-reference"
      ? lang === "ar"
        ? "مرجع موثق"
        : "Verified Reference"
      : lang === "ar"
        ? "ملاحظة شخصية"
        : "Personal Note";

  return {
    kicker: siteName || "ABDO Digital Hub",
    sectionLabel: `${lang === "ar" ? "أرشيف المعرفة" : "Knowledge"} · ${typeLabel} · ${entry.category}`,
    title,
    dateLabel: formattedDate,
    readingTimeMinutes,
    readingTimeLabel: formatReadingTimeLabel(readingTimeMinutes, lang),
    authorLabel: entry.sourceAttribution || "Abdo Kamel",
    tagsLine: entry.tags.length > 0 ? entry.tags.map((tg) => `#${tg}`).join(" · ") : undefined,
    summaryText: summary || undefined,
  };
}

export function buildKnowledgeArchiveCoverMeta(params: {
  entries: KnowledgeEntry[];
  siteName: string;
  formattedDate: string;
  lang: Lang;
}): PrintCoverMetadata {
  const { entries, siteName, formattedDate, lang } = params;
  const totalMinutes = entries.reduce((sum, entry) => {
    const text = `${loc(entry.title, lang)} ${loc(entry.summary, lang)}`;
    return sum + calculateReadingTimeMinutes(text);
  }, 0);
  const readingTimeMinutes = Math.max(1, totalMinutes);

  return {
    kicker: siteName || "ABDO Digital Hub",
    sectionLabel:
      lang === "ar"
        ? `أرشيف المعرفة · ${entries.length} مدخل`
        : `Knowledge Archive · ${entries.length} entries`,
    title: lang === "ar" ? "أرشيف المعرفة والملاحظات الموثقة" : "Knowledge Archive & Reference Notes",
    subtitle:
      lang === "ar"
        ? "مجموعة من الملاحظات الشخصية والمراجع التقنية الموثقة"
        : "Curated personal engineering notes and verified technical references",
    dateLabel: formattedDate,
    readingTimeMinutes,
    readingTimeLabel: formatReadingTimeLabel(readingTimeMinutes, lang),
    authorLabel: "Abdo Kamel",
  };
}

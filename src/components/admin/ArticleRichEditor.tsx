import React, { useMemo, useRef, useState } from "react";
import {
  Bold,
  CalendarClock,
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  GitCommitHorizontal,
  Heading2,
  Heading3,
  Italic,
  KeyRound,
  Layers,
  Link2,
  List,
  Plus,
  Quote,
  SplitSquareHorizontal,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { ArticleRecord, HubDatasets, Lang } from "../../types/hub";
import { hasLocalDraft, removeLocalDraft, saveLocalDraft, updateDatasetCache } from "../../services/dataService";
import { resolveGitHubSyncTargetFromSettings, syncLocalDraftsToGitHubRepo } from "../../services/githubStorageService";
import { calculateReadingTimeMinutes, countWords, slugify, validateCollectionSchema } from "../../utils/analytics";
import { formatDateTime, L, loc } from "../../utils/i18n";
import { AuthorAvatar, DEFAULT_AUTHOR_AVATAR } from "../AuthorProfileCard";
import { LoadingSpinner } from "../LoadingSpinner";
import { RichContentView } from "../RichContentView";

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T09:00`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return toDatetimeLocalValue(null);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(val: string): string {
  if (!val) return new Date().toISOString();
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toISOString();
}

const COVER_PRESETS = [
  { label: "Editorial Desk", path: "/src/assets/images/abdo_editorial_workspace_1795599463678.jpg" },
  { label: "Journal Notebook", path: "/src/assets/images/journal_editorial_cover_1795599465037.jpg" },
  { label: "Systems Architecture", path: "/src/assets/images/project_systems_architecture_1795599465444.jpg" },
];

export const ArticleRichEditor: React.FC<{
  data: HubDatasets;
  lang: Lang;
  adminUsername: string;
  githubToken: string;
  onChangeGithubToken: (token: string) => void;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
  onDownloadJson: (filename: string, payload: unknown) => void;
}> = ({
  data,
  lang,
  adminUsername,
  githubToken,
  onChangeGithubToken,
  onUpdateData,
  onNotify,
  onAudit,
  onDownloadJson,
}) => {
  const defaultAuthor = data.website.defaultAuthor || loc(data.profileSettings.fullName, "en") || "Abdo Kamel";
  const defaultHandle = data.profileSettings.githubUsername ? `@${data.profileSettings.githubUsername}` : `@${adminUsername}`;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorLang, setEditorLang] = useState<"en" | "ar">("en");
  const [viewMode, setViewMode] = useState<"write" | "split" | "preview">("split");

  // Fields
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");
  const [subtitleAr, setSubtitleAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [seoEn, setSeoEn] = useState("");

  const [slug, setSlug] = useState("");
  const [type, setType] = useState(data.journalCategories[0]?.slug || "articles");
  const [categories, setCategories] = useState<string[]>([data.journalCategories[0]?.slug || "articles"]);
  const [tagsInput, setTagsInput] = useState("");
  const [coverImage, setCoverImage] = useState(COVER_PRESETS[1].path);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [featured, setFeatured] = useState(false);

  // Author & Date/Time metadata
  const defaultAvatar = data.profileSettings.avatarUrl || DEFAULT_AUTHOR_AVATAR;
  const [author, setAuthor] = useState(defaultAuthor);
  const [authorHandle, setAuthorHandle] = useState(defaultHandle);
  const [authorAvatar, setAuthorAvatar] = useState(defaultAvatar);
  const [authorBio, setAuthorBio] = useState(loc(data.profileSettings.shortBio, "en") || "");
  const [publishedLocal, setPublishedLocal] = useState(() => toDatetimeLocalValue(null));
  const [updatedLocal, setUpdatedLocal] = useState(() => toDatetimeLocalValue(null));
  const [autoTouchUpdated, setAutoTouchUpdated] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showEmbedPicker, setShowEmbedPicker] = useState(false);
  const [pushingGithub, setPushingGithub] = useState(false);
  const [showPatInput, setShowPatInput] = useState(false);
  const [pushStatus, setPushStatus] = useState<{
    ok: boolean;
    message: string;
    htmlUrl?: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const patInputRef = useRef<HTMLInputElement | null>(null);

  const syncTarget = useMemo(
    () =>
      resolveGitHubSyncTargetFromSettings({
        storageOwner: data.githubSyncSettings.storageOwner,
        username: data.githubSyncSettings.username,
        profileUsername: data.profileSettings.githubUsername,
        storageRepo: data.githubSyncSettings.storageRepo,
        storageBranch: data.githubSyncSettings.storageBranch,
      }),
    [data.githubSyncSettings, data.profileSettings.githubUsername]
  );
  const hasPendingArticlesDraft = hasLocalDraft("./data/journal/articles.json");

  const activeContent = editorLang === "en" ? contentEn : contentAr;
  const activeTitle = editorLang === "en" ? titleEn : titleAr;
  const activeSubtitle = editorLang === "en" ? subtitleEn : subtitleAr;

  const liveWords = countWords(activeContent);
  const liveChars = activeContent.length;
  const liveReadMin = calculateReadingTimeMinutes(activeContent);

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return data.allArticlesRaw.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return `${loc(a.title, lang)} ${a.tags.join(" ")} ${a.author || ""}`.toLowerCase().includes(q);
    });
  }, [data.allArticlesRaw, searchTerm, statusFilter, lang]);

  const resetForm = () => {
    const now = toDatetimeLocalValue(null);
    setEditingId(null);
    setTitleEn("");
    setTitleAr("");
    setSubtitleEn("");
    setSubtitleAr("");
    setContentEn("");
    setContentAr("");
    setSeoEn("");
    setSlug("");
    setType(data.journalCategories[0]?.slug || "articles");
    setCategories([data.journalCategories[0]?.slug || "articles"]);
    setTagsInput("");
    setCoverImage(COVER_PRESETS[1].path);
    setStatus("published");
    setFeatured(false);
    setAuthor(defaultAuthor);
    setAuthorHandle(defaultHandle);
    setAuthorAvatar(defaultAvatar);
    setAuthorBio(loc(data.profileSettings.shortBio, "en") || "");
    setPublishedLocal(now);
    setUpdatedLocal(now);
    setAutoTouchUpdated(true);
  };

  const loadArticleIntoEditor = (art: ArticleRecord) => {
    setEditingId(art.id);
    setTitleEn(typeof art.title === "string" ? art.title : art.title.en || "");
    setTitleAr(typeof art.title === "string" ? art.title : art.title.ar || "");
    setSubtitleEn(typeof art.subtitle === "string" ? art.subtitle : art.subtitle.en || "");
    setSubtitleAr(typeof art.subtitle === "string" ? art.subtitle : art.subtitle.ar || "");
    setContentEn(typeof art.content === "string" ? art.content : art.content.en || "");
    setContentAr(typeof art.content === "string" ? art.content : art.content.ar || "");
    setSeoEn(art.seo?.description || "");
    setSlug(art.slug);
    setType(art.type);
    setCategories(art.categories?.length ? art.categories : [art.type]);
    setTagsInput((art.tags || []).join(", "));
    setCoverImage(art.coverImage || "");
    setStatus(art.status || "published");
    setFeatured(Boolean(art.featured));
    setAuthor(art.author || defaultAuthor);
    setAuthorHandle(art.authorHandle || defaultHandle);
    setAuthorAvatar(art.authorAvatar || defaultAvatar);
    setAuthorBio(art.authorBio ? loc(art.authorBio, "en") : loc(data.profileSettings.shortBio, "en") || "");
    setPublishedLocal(toDatetimeLocalValue(art.publishedAt));
    setUpdatedLocal(toDatetimeLocalValue(art.updatedAt));
  };

  const buildArticlesPayload = (items: ArticleRecord[], ts = new Date().toISOString()) => ({
    id: "journal-articles-collection",
    items,
    createdAt: "2026-11-25T00:00:00Z",
    updatedAt: ts,
    status: "active",
    source: "manual-editorial",
  });

  const persistArticles = (nextRaw: ArticleRecord[], auditAction: string, targetLabel: string) => {
    const ts = new Date().toISOString();
    const payload = buildArticlesPayload(nextRaw, ts);
    const check = validateCollectionSchema(payload);
    if (!check.valid) {
      const errMsg = `Schema error: ${check.errors.join("; ")}`;
      setPushStatus({ ok: false, message: errMsg });
      onNotify(errMsg);
      return null;
    }
    saveLocalDraft("./data/journal/articles.json", payload);
    onUpdateData((prev) => ({
      ...prev,
      allArticlesRaw: nextRaw,
      articles: nextRaw.filter((a) => a.status === "published"),
    }));
    onAudit(auditAction, targetLabel);
    return payload;
  };

  const applyFormToArticles = (): { payload: ReturnType<typeof buildArticlesPayload>; label: string } | null => {
    if (!titleEn.trim() || !contentEn.trim()) {
      onNotify(L("English title and body content are required.", "عنوان المقال والمحتوى الإنجليزي مطلوبان.", lang));
      return null;
    }

    const nowIso = new Date().toISOString();
    const resolvedSlug = slug.trim() ? slugify(slug) : slugify(titleEn);
    const publishedIso = fromDatetimeLocalValue(publishedLocal);
    const updatedIso = autoTouchUpdated ? nowIso : fromDatetimeLocalValue(updatedLocal);
    if (autoTouchUpdated) {
      setUpdatedLocal(toDatetimeLocalValue(updatedIso));
    }

    const resolvedCategories = categories.includes(type) ? categories : [type, ...categories];
    const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const readMin = calculateReadingTimeMinutes(contentEn);

    if (editingId) {
      const nextRaw = data.allArticlesRaw.map((item) =>
        item.id === editingId
          ? {
              ...item,
              slug: resolvedSlug,
              type,
              title: { en: titleEn.trim(), ar: titleAr.trim() || titleEn.trim() },
              subtitle: { en: subtitleEn.trim(), ar: subtitleAr.trim() || subtitleEn.trim() },
              content: { en: contentEn.trim(), ar: contentAr.trim() || contentEn.trim() },
              coverImage: coverImage.trim() || undefined,
              author: author.trim() || defaultAuthor,
              authorHandle: authorHandle.trim() || undefined,
              authorAvatar: authorAvatar.trim() || undefined,
              authorBio: authorBio.trim() ? { en: authorBio.trim(), ar: authorBio.trim() } : undefined,
              publishedAt: publishedIso,
              categories: resolvedCategories,
              tags,
              readingTimeMinutes: readMin,
              featured,
              seo: seoEn.trim() ? { description: seoEn.trim() } : item.seo,
              updatedAt: updatedIso,
              status,
            }
          : item
      );
      const payload = persistArticles(nextRaw, "Updated Article", titleEn.trim());
      return payload ? { payload, label: titleEn.trim() } : null;
    }

    const created: ArticleRecord = {
      id: `art-${resolvedSlug}-${Date.now()}`,
      slug: resolvedSlug,
      type,
      title: { en: titleEn.trim(), ar: titleAr.trim() || titleEn.trim() },
      subtitle: { en: subtitleEn.trim(), ar: subtitleAr.trim() || subtitleEn.trim() },
      content: { en: contentEn.trim(), ar: contentAr.trim() || contentEn.trim() },
      coverImage: coverImage.trim() || undefined,
      author: author.trim() || defaultAuthor,
      authorHandle: authorHandle.trim() || undefined,
      authorAvatar: authorAvatar.trim() || undefined,
      authorBio: authorBio.trim() ? { en: authorBio.trim(), ar: authorBio.trim() } : undefined,
      publishedAt: publishedIso,
      categories: resolvedCategories,
      tags,
      readingTimeMinutes: readMin,
      featured,
      seo: seoEn.trim() ? { description: seoEn.trim() } : undefined,
      createdAt: nowIso,
      updatedAt: updatedIso,
      status,
      source: "manual-editorial",
    };
    const nextRaw = [created, ...data.allArticlesRaw];
    const payload = persistArticles(nextRaw, "Created Article", titleEn.trim());
    if (!payload) return null;
    setEditingId(created.id);
    return { payload, label: titleEn.trim() };
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyFormToArticles();
    if (!res) return;
    onNotify(
      editingId
        ? L("Article updated and saved locally.", "تم تحديث المقال وحفظه محلياً.", lang)
        : L("New article saved to local workspace.", "تم حفظ المقال الجديد في المسودة.", lang)
    );
  };

  const handlePushArticlesToGitHub = async (saveFormFirst: boolean) => {
    let payload: ReturnType<typeof buildArticlesPayload>;
    if (saveFormFirst) {
      const saved = applyFormToArticles();
      if (!saved) return;
      payload = saved.payload;
    } else {
      payload = buildArticlesPayload(data.allArticlesRaw);
      const check = validateCollectionSchema(payload);
      if (!check.valid) {
        const errMsg = `Schema error: ${check.errors.join("; ")}`;
        setPushStatus({ ok: false, message: errMsg });
        onNotify(errMsg);
        return;
      }
    }

    if (!githubToken.trim()) {
      setShowPatInput(true);
      const msg = L(
        `Enter your session GitHub PAT (contents:write) below to push articles directly to ${syncTarget.owner}/${syncTarget.repo}.`,
        `أدخل رمز GitHub المؤقت (contents:write) بالأسفل لدفع المقالات مباشرة إلى ${syncTarget.owner}/${syncTarget.repo}.`,
        lang
      );
      setPushStatus({ ok: false, message: msg });
      onNotify(msg);
      window.requestAnimationFrame(() => patInputRef.current?.focus());
      return;
    }

    setPushingGithub(true);
    setPushStatus(null);
    try {
      const res = await syncLocalDraftsToGitHubRepo({
        token: githubToken.trim(),
        owner: syncTarget.owner,
        repo: syncTarget.repo,
        branch: syncTarget.branch,
        drafts: [
          {
            datasetPath: "./data/journal/articles.json",
            repoPath: "public/data/journal/articles.json",
            payload,
          },
        ],
        commitMessagePrefix: "Publish articles.json",
        allowOverwrite: true,
      });

      if (res.synced.length > 0) {
        updateDatasetCache("./data/journal/articles.json", payload);
        removeLocalDraft("./data/journal/articles.json");
        onAudit("Pushed Articles to GitHub", `${syncTarget.owner}/${syncTarget.repo}`);
        const msg = L(
          `Pushed ${data.allArticlesRaw.length} article(s) to ${syncTarget.owner}/${syncTarget.repo} (${syncTarget.branch}).`,
          `تم دفع ${data.allArticlesRaw.length} مقال(ات) بنجاح إلى ${syncTarget.owner}/${syncTarget.repo}.`,
          lang
        );
        setPushStatus({ ok: true, message: msg, htmlUrl: res.synced[0].htmlUrl });
        onNotify(msg);
      } else {
        const errMsg = res.failed[0]?.error || L("Failed to push articles to GitHub.", "تعذر دفع المقالات إلى GitHub.", lang);
        setPushStatus({ ok: false, message: errMsg });
        onNotify(errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to push articles to GitHub.";
      setPushStatus({ ok: false, message: errMsg });
      onNotify(errMsg);
    } finally {
      setPushingGithub(false);
    }
  };

  const insertFormatting = (prefix: string, suffix = "", placeholder = "text") => {
    const el = textareaRef.current;
    const current = editorLang === "en" ? contentEn : contentAr;
    const setter = editorLang === "en" ? setContentEn : setContentAr;

    if (!el) {
      setter(`${current}${current ? "\n" : ""}${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || placeholder;
    const next = `${current.slice(0, start)}${prefix}${selected}${suffix}${current.slice(end)}`;
    setter(next);

    window.requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      el.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  const toggleCategory = (catSlug: string) => {
    setCategories((prev) =>
      prev.includes(catSlug)
        ? prev.length > 1
          ? prev.filter((c) => c !== catSlug)
          : prev
        : [...prev, catSlug]
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Article Library */}
      <aside className="xl:col-span-4 rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            {L("Editorial Library", "مكتبة المقالات", lang)} ({data.allArticlesRaw.length})
          </h2>
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-1.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{L("New", "جديد", lang)}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={L("Search articles...", "بحث في المقالات...", lang)}
            aria-label={L("Search editorial library", "بحث في مكتبة المقالات", lang)}
            className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
            aria-label={L("Filter status", "تصفية الحالة", lang)}
            className="px-2.5 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
          >
            <option value="all">{L("All", "الكل", lang)}</option>
            <option value="published">{L("Published", "منشور", lang)}</option>
            <option value="draft">{L("Draft", "مسودة", lang)}</option>
          </select>
        </div>

        <ul className="divide-y divide-[var(--hub-border)] max-h-[600px] overflow-y-auto pr-1">
          {filteredList.map((a) => {
            const active = editingId === a.id;
            return (
              <li key={a.id} className={`py-3 space-y-2 ${active ? "bg-blue-500/5 -mx-2 px-2 rounded-lg" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => loadArticleIntoEditor(a)}
                    className="text-start font-semibold text-sm hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  >
                    {loc(a.title, lang)}
                  </button>
                  <span
                    className={`text-[11px] font-mono shrink-0 ${
                      a.status === "published" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="text-[11px] text-[var(--hub-text-muted)] font-mono tabular-nums flex flex-wrap gap-x-2">
                  <span>{a.author || defaultAuthor}</span>
                  <span>·</span>
                  <span>{formatDateTime(a.publishedAt, lang)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => loadArticleIntoEditor(a)}
                    className="px-2 py-1 rounded border border-[var(--hub-border)] cursor-pointer"
                  >
                    {L("Edit", "تحرير", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextRaw = data.allArticlesRaw.map((x) =>
                        x.id === a.id
                          ? {
                              ...x,
                              status: x.status === "published" ? ("draft" as const) : ("published" as const),
                              updatedAt: new Date().toISOString(),
                            }
                          : x
                      );
                      persistArticles(nextRaw, "Toggled Status", loc(a.title, "en"));
                    }}
                    className="px-2 py-1 rounded border border-[var(--hub-border)] cursor-pointer"
                  >
                    {a.status === "published" ? L("Unpublish", "إلغاء النشر", lang) : L("Publish", "نشر", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ts = new Date().toISOString();
                      const copy: ArticleRecord = {
                        ...a,
                        id: `${a.id}-copy-${Date.now()}`,
                        slug: `${a.slug}-copy`,
                        title: {
                          en: `${typeof a.title === "string" ? a.title : a.title.en} (Copy)`,
                          ar: `${typeof a.title === "string" ? a.title : a.title.ar} (نسخة)`,
                        },
                        status: "draft",
                        createdAt: ts,
                        updatedAt: ts,
                      };
                      persistArticles([copy, ...data.allArticlesRaw], "Duplicated Article", loc(copy.title, "en"));
                      loadArticleIntoEditor(copy);
                    }}
                    title={L("Duplicate", "نسخ", lang)}
                    aria-label={L("Duplicate article", "نسخ المقال", lang)}
                    className="px-2 py-1 rounded border border-[var(--hub-border)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {confirmDeleteId === a.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        const nextRaw = data.allArticlesRaw.filter((x) => x.id !== a.id);
                        persistArticles(nextRaw, "Deleted Article", loc(a.title, "en"));
                        if (editingId === a.id) resetForm();
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                    >
                      {L("Confirm Delete", "تأكيد الحذف", lang)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(a.id)}
                      aria-label={L("Delete article", "حذف المقال", lang)}
                      className="px-2 py-1 rounded border border-red-500/40 text-red-600 dark:text-red-400 inline-flex items-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            data-testid="article-push-only-github-btn"
            disabled={pushingGithub}
            onClick={() => handlePushArticlesToGitHub(false)}
            className="w-full py-2 rounded-lg bg-[var(--hub-secondary)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {pushingGithub ? <LoadingSpinner size="sm" inline /> : <GitCommitHorizontal className="w-3.5 h-3.5" />}
            <span>{L("Push All Articles to GitHub", "دفع جميع المقالات إلى GitHub", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onDownloadJson("articles.json", buildArticlesPayload(data.allArticlesRaw))
            }
            className="w-full py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{L("Export articles.json", "تصدير articles.json", lang)}</span>
          </button>
        </div>
      </aside>

      {/* Right: Rich Editor + Metadata + Live Preview */}
      <form onSubmit={handleSave} className="xl:col-span-8 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-6">
        {/* Top Editor Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hub-border)] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold">
              {editingId ? L("Editing Article", "تعديل المقال", lang) : L("Compose New Article", "إنشاء مقال جديد", lang)}
            </h2>
            <div className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)] mt-0.5">
              {liveWords} {L("words", "كلمة", lang)} · {liveChars} {L("chars", "حرف", lang)} · {liveReadMin}{" "}
              {L("min read (200 WPM)", "دقيقة قراءة", lang)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Language Switch */}
            <div className="inline-flex rounded-lg border border-[var(--hub-border)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setEditorLang("en")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  editorLang === "en" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setEditorLang("ar")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  editorLang === "ar" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
                }`}
              >
                AR
              </button>
            </div>

            {/* View Mode */}
            <div className="inline-flex rounded-lg border border-[var(--hub-border)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("write")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  viewMode === "write" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
                }`}
              >
                {L("Write", "كتابة", lang)}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === "split" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                <span>{L("Split", "مقسم", lang)}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === "preview" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{L("Preview", "معاينة", lang)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Author, Published Date/Time, Updated Date/Time Panel */}
        <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--hub-text-muted)] inline-flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>{L("Author & Publication Timestamps", "بيانات الكاتب وتوقيت النشر والتحديث", lang)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="editor-author" className="text-xs font-semibold text-[var(--hub-text-muted)] flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{L("Author Name", "اسم الكاتب", lang)}</span>
              </label>
              <input
                id="editor-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Abdo Kamel"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>

            <div>
              <label htmlFor="editor-author-handle" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                {L("Author Handle", "معرف الكاتب", lang)}
              </label>
              <input
                id="editor-author-handle"
                type="text"
                dir="ltr"
                value={authorHandle}
                onChange={(e) => setAuthorHandle(e.target.value)}
                placeholder="@AbdoKamelAyed"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="editor-published-at" className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Published Date & Time", "تاريخ ووقت النشر", lang)}
                </label>
                <button
                  type="button"
                  onClick={() => setPublishedLocal(toDatetimeLocalValue(null))}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {L("Set Now", "الآن", lang)}
                </button>
              </div>
              <input
                id="editor-published-at"
                type="datetime-local"
                value={publishedLocal}
                onChange={(e) => setPublishedLocal(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="editor-updated-at" className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Last Updated Date & Time", "تاريخ ووقت التحديث", lang)}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAutoTouchUpdated(false);
                    setUpdatedLocal(toDatetimeLocalValue(null));
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {L("Touch Now", "تحديث الآن", lang)}
                </button>
              </div>
              <input
                id="editor-updated-at"
                type="datetime-local"
                value={updatedLocal}
                onChange={(e) => {
                  setAutoTouchUpdated(false);
                  setUpdatedLocal(e.target.value);
                }}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
              <label className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--hub-text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoTouchUpdated}
                  onChange={(e) => setAutoTouchUpdated(e.target.checked)}
                />
                <span>{L("Auto-stamp updated time on save", "تحديث وقت التعديل تلقائياً عند الحفظ", lang)}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--hub-border)]">
            <div className="flex items-center gap-3">
              <AuthorAvatar src={authorAvatar} name={author || defaultAuthor} sizeClass="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <label htmlFor="editor-author-avatar" className="text-xs font-semibold text-[var(--hub-text-muted)]">
                    {L("Author Portrait URL", "صورة الكاتب", lang)}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthorAvatar(defaultAvatar)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {L("Use Site Profile", "من الملف الرئيسي", lang)}
                  </button>
                </div>
                <input
                  id="editor-author-avatar"
                  type="text"
                  dir="ltr"
                  value={authorAvatar}
                  onChange={(e) => setAuthorAvatar(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label htmlFor="editor-author-bio" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                {L("Author Card Bio", "نبذة بطاقة الكاتب", lang)}
              </label>
              <input
                id="editor-author-bio"
                type="text"
                value={authorBio}
                onChange={(e) => setAuthorBio(e.target.value)}
                placeholder={L("Short author bio displayed under the article...", "نبذة قصيرة تظهر أسفل المقال...", lang)}
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
              />
            </div>
          </div>
        </div>

        {/* Title, Subtitle, Slug */}
        <div className="space-y-3" dir={editorLang === "ar" ? "rtl" : "ltr"}>
          <div>
            <label htmlFor="editor-title" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {editorLang === "en" ? L("Title (EN)", "العنوان (EN)", lang) : L("Title (AR)", "العنوان (AR)", lang)}
            </label>
            <input
              id="editor-title"
              type="text"
              required={editorLang === "en"}
              value={activeTitle}
              onChange={(e) => (editorLang === "en" ? setTitleEn(e.target.value) : setTitleAr(e.target.value))}
              placeholder={editorLang === "en" ? "Article headline..." : "عنوان المقال..."}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] font-display text-lg font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="editor-subtitle" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {editorLang === "en" ? L("Subtitle (EN)", "العنوان الفرعي (EN)", lang) : L("Subtitle (AR)", "العنوان الفرعي (AR)", lang)}
              </label>
              <input
                id="editor-subtitle"
                type="text"
                value={activeSubtitle}
                onChange={(e) => (editorLang === "en" ? setSubtitleEn(e.target.value) : setSubtitleAr(e.target.value))}
                placeholder={editorLang === "en" ? "Short editorial summary..." : "ملخص المقال..."}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>

            <div dir="ltr">
              <label htmlFor="editor-slug" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("URL Slug", "الرابط الدائم (Slug)", lang)}
              </label>
              <input
                id="editor-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={slugify(titleEn) || "auto-generated-from-title"}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Rich Toolbar + Write / Split / Preview */}
        <div className="space-y-2">
          {viewMode !== "preview" && (
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--hub-border)] hub-subtle p-1.5">
              <button type="button" onClick={() => insertFormatting("## ", "", "Section Heading")} title="Heading 2" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Heading2 className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("### ", "", "Subsection")} title="Heading 3" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Heading3 className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("**", "**", "bold text")} title="Bold" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Bold className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("*", "*", "italic text")} title="Italic" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Italic className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("> ", "", "Key architectural insight")} title="Blockquote" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Quote className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("- ", "", "List item")} title="Bullet List" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><List className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("`", "`", "code")} title="Inline Code" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Code className="w-4 h-4" /></button>
              <button type="button" onClick={() => insertFormatting("```ts\n", "\n```", "const hub = true;")} title="Code Block" className="px-2 py-1 rounded text-xs font-mono hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer">{"{ }"}</button>
              <button type="button" onClick={() => insertFormatting("[", "](https://abdokamelayed.github.io)", "Link label")} title="Insert Link" className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"><Link2 className="w-4 h-4" /></button>
              <button
                type="button"
                onClick={() => setShowEmbedPicker((v) => !v)}
                className={`ms-1 px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  showEmbedPicker
                    ? "bg-blue-600 text-white"
                    : "border border-[var(--hub-border)] hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{L("Embed Media", "تضمين وسائط", lang)}</span>
              </button>
            </div>
          )}

          {viewMode !== "preview" && showEmbedPicker && (
            <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--hub-text-muted)]">
                  {L("Click an asset to embed via custom viewer:", "اختر ملفاً لتضمينه في المقال:", lang)}
                </span>
                <span className="font-mono text-[11px] text-[var(--hub-text-muted)]">
                  [[embed:assetId]]
                </span>
              </div>
              {data.mediaAssets.length === 0 ? (
                <p className="text-xs text-[var(--hub-text-muted)]">
                  {L("No media assets uploaded yet. Upload PDF, Image, Video, Audio, or Code in Media Library.", "لا توجد وسائط بعد. ارفع ملفاتك من مكتبة الوسائط.", lang)}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.mediaAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        insertFormatting(`\n[[embed:${asset.id}|`, "]]\n", loc(asset.title, editorLang));
                        setShowEmbedPicker(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs hover:border-blue-600 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="font-mono uppercase text-[10px] text-blue-600 dark:text-blue-400">
                        {asset.mediaType}
                      </span>
                      <span className="truncate max-w-[180px]">{loc(asset.title, editorLang)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`grid gap-4 ${viewMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {viewMode !== "preview" && (
              <textarea
                ref={textareaRef}
                dir={editorLang === "ar" ? "rtl" : "ltr"}
                rows={13}
                required={editorLang === "en"}
                value={activeContent}
                onChange={(e) => (editorLang === "en" ? setContentEn(e.target.value) : setContentAr(e.target.value))}
                placeholder={
                  editorLang === "en"
                    ? "Write Markdown-formatted engineering notes, code blocks, quotes, and lists..."
                    : "اكتب محتوى المقال هنا مع دعم العناوين والقوائم والأكواد..."
                }
                aria-label={L("Article Content Editor", "محرر محتوى المقال", lang)}
                className="w-full px-3.5 py-3 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono leading-relaxed"
              />
            )}

            {viewMode !== "write" && (
              <div
                dir={editorLang === "ar" ? "rtl" : "ltr"}
                className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg)] p-5 space-y-4 max-h-[370px] overflow-y-auto"
              >
                <div className="border-b border-[var(--hub-border)] pb-3 space-y-1.5">
                  <div className="text-[11px] text-[var(--hub-text-muted)] font-mono tabular-nums flex flex-wrap gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{type}</span>
                    <span>·</span>
                    <span>{formatDateTime(fromDatetimeLocalValue(publishedLocal), editorLang)}</span>
                    <span>·</span>
                    <span>{liveReadMin} {L("min read", "دقيقة قراءة", editorLang)}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold">{activeTitle || L("Untitled Article", "مقال بدون عنوان", editorLang)}</h3>
                  {activeSubtitle && <p className="text-sm text-[var(--hub-text-muted)]">{activeSubtitle}</p>}
                  <div className="text-[11px] text-[var(--hub-text-muted)] flex flex-wrap gap-3">
                    <span>{L("By", "بقلم", editorLang)} <strong className="text-[var(--hub-text)]">{author || defaultAuthor}</strong> {authorHandle}</span>
                    <span>{L("Updated:", "تحديث:", editorLang)} {formatDateTime(autoTouchUpdated ? new Date().toISOString() : fromDatetimeLocalValue(updatedLocal), editorLang)}</span>
                  </div>
                </div>
                {activeContent.trim() ? (
                  <RichContentView content={activeContent} mediaAssets={data.mediaAssets} lang={editorLang} />
                ) : (
                  <p className="text-xs text-[var(--hub-text-muted)] italic">
                    {L("Live preview renders as you write...", "تظهر المعاينة الحية أثناء الكتابة...", editorLang)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Taxonomy, Cover & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="editor-type" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Primary Category", "الفئة الرئيسية", lang)}
            </label>
            <select
              id="editor-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              {data.journalCategories.map((c) => (
                <option key={c.id} value={c.slug}>{loc(c.name, lang)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="editor-status" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Publish Status", "حالة النشر", lang)}
            </label>
            <select
              id="editor-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "published" | "draft")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value="published">{L("Published", "منشور", lang)}</option>
              <option value="draft">{L("Draft (Hidden)", "مسودة", lang)}</option>
            </select>
          </div>

          <div>
            <label htmlFor="editor-tags" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Tags (comma separated)", "الوسوم (مفصولة بفاصلة)", lang)}
            </label>
            <input
              id="editor-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="architecture, github-actions, typescript"
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="editor-cover" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Cover Image URL / Asset", "صورة الغلاف", lang)}
            </label>
            <input
              id="editor-cover"
              type="text"
              dir="ltr"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {COVER_PRESETS.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  onClick={() => setCoverImage(p.path)}
                  className="px-2 py-0.5 rounded border border-[var(--hub-border)] text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="editor-seo" className="text-xs font-semibold text-[var(--hub-text-muted)]">
                {L("SEO Meta Description", "وصف SEO", lang)}
              </label>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  seoEn.trim().length >= 60 && seoEn.trim().length <= 165
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {seoEn.trim().length}/160 {L("optimal", "مثالي", lang)}
              </span>
            </div>
            <input
              id="editor-seo"
              type="text"
              value={seoEn}
              onChange={(e) => setSeoEn(e.target.value)}
              placeholder={L("Concise 110–160 char search summary...", "وصف موجز بين 110 و160 حرفاً لمحركات البحث...", lang)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <label className="mt-2 inline-flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <span>{L("Feature article on Home & Journal", "تمييز المقال في الصفحة الرئيسية", lang)}</span>
            </label>
          </div>
        </div>

        {/* Multi-category toggles */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
            {L("Assigned Categories (used for Related Reading)", "الفئات المرتبطة", lang)}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.journalCategories.map((c) => {
              const checked = categories.includes(c.slug);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.slug)}
                  className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                    checked
                      ? "border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300 font-semibold"
                      : "border-[var(--hub-border)] text-[var(--hub-text-muted)]"
                  }`}
                >
                  {loc(c.name, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions & Direct GitHub Publishing */}
        <div className="space-y-4 pt-4 border-t border-[var(--hub-border)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? L("Save Local Draft", "حفظ التعديلات محلياً", lang) : L("Save New Draft", "حفظ المسودة الجديدة", lang)}</span>
              </button>
              <button
                type="button"
                data-testid="article-save-push-github-btn"
                disabled={pushingGithub}
                onClick={() => handlePushArticlesToGitHub(true)}
                className="px-5 py-2.5 rounded-lg bg-[var(--hub-secondary)] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {pushingGithub ? <LoadingSpinner size="sm" inline /> : <GitCommitHorizontal className="w-4 h-4" />}
                <span>{L("Save & Push to GitHub", "حفظ ودفع إلى GitHub", lang)}</span>
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-lg border border-[var(--hub-border)] text-sm cursor-pointer"
                >
                  {L("New Blank", "مقال جديد", lang)}
                </button>
              )}
            </div>
            {editingId && (
              <a
                href={`#/journal/${encodeURIComponent(slug || editingId)}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {L("View Live Article →", "عرض المقال ←", lang)}
              </a>
            )}
          </div>

          {/* Direct GitHub Target & Session Token Bar */}
          <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--hub-text-muted)]">
                <span>
                  {L("GitHub Target:", "مستودع النشر:", lang)}{" "}
                  <strong className="text-[var(--hub-text)]">
                    {syncTarget.owner}/{syncTarget.repo} ({syncTarget.branch})
                  </strong>
                </span>
                {hasPendingArticlesDraft && (
                  <span
                    data-testid="articles-pending-sync-badge"
                    className="text-amber-600 dark:text-amber-400 font-semibold"
                  >
                    · {L("Pending GitHub sync", "بانتظار الدفع إلى GitHub", lang)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPatInput((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--hub-secondary)] hover:underline cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>
                  {githubToken.trim()
                    ? L("Session Token Ready (Edit)", "رمز الجلسة جاهز (تعديل)", lang)
                    : L("Set Session GitHub Token", "إدخال رمز GitHub للجلسة", lang)}
                </span>
              </button>
            </div>

            {(showPatInput || !githubToken.trim()) && (
              <div>
                <label htmlFor="article-editor-pat" className="text-[11px] font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Session GitHub PAT (in-memory only, requires contents:write)", "رمز GitHub المؤقت (في الذاكرة فقط — contents:write)", lang)}
                </label>
                <input
                  id="article-editor-pat"
                  ref={patInputRef}
                  data-testid="article-editor-pat-input"
                  type="password"
                  dir="ltr"
                  autoComplete="off"
                  value={githubToken}
                  onChange={(e) => onChangeGithubToken(e.target.value)}
                  placeholder="github_pat_... (contents:write)"
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                />
              </div>
            )}

            {pushStatus && (
              <div
                data-testid="article-github-push-status"
                className={`rounded-lg border px-3 py-2 font-mono text-xs flex flex-wrap items-center justify-between gap-2 ${
                  pushStatus.ok
                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5"
                    : "border-red-500/40 text-red-700 dark:text-red-300 bg-red-500/5"
                }`}
              >
                <span>{pushStatus.message}</span>
                {pushStatus.htmlUrl && (
                  <a
                    href={pushStatus.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline font-semibold shrink-0"
                  >
                    <span>{L("View commit", "عرض في GitHub", lang)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

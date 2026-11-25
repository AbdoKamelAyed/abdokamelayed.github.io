import React, { useMemo, useRef, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Music,
  Plus,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import type { HubDatasets, Lang, MediaAssetRecord, MediaAssetType } from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import {
  deleteMediaBlob,
  detectMediaTypeFromFile,
  saveMediaBlob,
} from "../../services/mediaLibraryService";
import { formatBytesCompact, slugify } from "../../utils/analytics";
import { L, loc } from "../../utils/i18n";
import { CustomMediaViewer } from "../media/CustomMediaViewer";

export const MediaLibraryPanel: React.FC<{
  data: HubDatasets;
  lang: Lang;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
  onDownloadJson: (filename: string, payload: unknown) => void;
}> = ({ data, lang, onUpdateData, onNotify, onAudit, onDownloadJson }) => {
  const [filterType, setFilterType] = useState<"all" | MediaAssetType>("all");
  const [selectedId, setSelectedId] = useState<string>(data.mediaAssets[0]?.id || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Manual URL / Code asset creation
  const [createMode, setCreateMode] = useState<"upload" | "url" | "code">("upload");
  const [titleEn, setTitleEn] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [mediaType, setMediaType] = useState<MediaAssetType>("pdf");
  const [assetUrl, setAssetUrl] = useState("");
  const [codeLang, setCodeLang] = useState("typescript");
  const [codeBody, setCodeBody] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const persistAssets = (nextAssets: MediaAssetRecord[], action: string, target: string) => {
    const ts = new Date().toISOString();
    const payload = {
      id: "media-library-collection",
      items: nextAssets,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: ts,
      status: "active",
      source: "media-library",
    };
    saveLocalDraft("./data/library/assets.json", payload);
    onUpdateData((prev) => ({ ...prev, mediaAssets: nextAssets }));
    onAudit(action, target);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: MediaAssetRecord[] = [];
    const ts = new Date().toISOString();

    for (const file of Array.from(files)) {
      const detected = detectMediaTypeFromFile(file);
      const baseSlug = slugify(file.name.replace(/\.[^.]+$/, "")) || "asset";
      const id = `asset-${detected.mediaType}-${baseSlug}-${Date.now().toString(36).slice(-4)}`;

      let record: MediaAssetRecord;
      if (detected.mediaType === "code" && file.size <= 512_000) {
        const text = await file.text();
        record = {
          id,
          title: { en: file.name, ar: file.name },
          mediaType: "code",
          mimeType: file.type || "text/plain",
          url: "",
          storageMode: "inline-code",
          codeContent: text,
          codeLanguage: detected.codeLanguage || "plaintext",
          fileName: file.name,
          sizeBytes: file.size,
          caption: { en: captionEn.trim() || `Uploaded source file (${file.name})`, ar: file.name },
          tags: [detected.mediaType, detected.codeLanguage || "code"],
          createdAt: ts,
          updatedAt: ts,
          status: "published",
          source: "media-library",
        };
      } else {
        await saveMediaBlob(id, file);
        record = {
          id,
          title: { en: titleEn.trim() || file.name, ar: titleEn.trim() || file.name },
          mediaType: detected.mediaType,
          mimeType: file.type || "application/octet-stream",
          url: `idb://${id}`,
          storageMode: "indexeddb",
          fileName: file.name,
          sizeBytes: file.size,
          caption: { en: captionEn.trim() || file.name, ar: file.name },
          tags: [detected.mediaType],
          createdAt: ts,
          updatedAt: ts,
          status: "published",
          source: "media-library",
        };
      }
      added.push(record);
    }

    if (added.length > 0) {
      const next = [...added, ...data.mediaAssets];
      persistAssets(next, "Uploaded Media", added.map((a) => a.fileName || a.id).join(", "));
      setSelectedId(added[0].id);
      setTitleEn("");
      setCaptionEn("");
      onNotify(
        L(
          `Added ${added.length} asset(s) to Media Library. Copy [[embed:...]] to embed anywhere.`,
          `تمت إضافة ${added.length} ملف(ات) إلى المكتبة. انسخ كود التضمين لاستخدامه في المقالات.`,
          lang
        )
      );
    }
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) return;
    if (createMode === "url" && !assetUrl.trim()) return;
    if (createMode === "code" && !codeBody.trim()) return;

    const ts = new Date().toISOString();
    const resolvedType: MediaAssetType = createMode === "code" ? "code" : mediaType;
    const id = `asset-${resolvedType}-${slugify(titleEn) || Date.now()}-${Date.now().toString(36).slice(-3)}`;

    const created: MediaAssetRecord = {
      id,
      title: { en: titleEn.trim(), ar: titleEn.trim() },
      mediaType: resolvedType,
      mimeType: createMode === "code" ? "text/plain" : `${resolvedType}/*`,
      url: createMode === "code" ? "" : assetUrl.trim(),
      storageMode: createMode === "code" ? "inline-code" : "url",
      codeContent: createMode === "code" ? codeBody : undefined,
      codeLanguage: createMode === "code" ? codeLang : undefined,
      fileName: fileName.trim() || (createMode === "code" ? `${slugify(titleEn)}.${codeLang === "typescript" ? "ts" : "txt"}` : undefined),
      caption: captionEn.trim() ? { en: captionEn.trim(), ar: captionEn.trim() } : undefined,
      tags: [resolvedType],
      createdAt: ts,
      updatedAt: ts,
      status: "published",
      source: "media-library",
    };

    const next = [created, ...data.mediaAssets];
    persistAssets(next, "Created Media Asset", titleEn.trim());
    setSelectedId(created.id);
    setTitleEn("");
    setCaptionEn("");
    setAssetUrl("");
    setCodeBody("");
    setFileName("");
    onNotify(L("Media asset added to library and ready to embed.", "تمت إضافة العنصر للمكتبة وهو جاهز للتضمين.", lang));
  };

  const copyEmbedCode = async (id: string) => {
    const snippet = `[[embed:${id}]]`;
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Ignore clipboard restriction
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const visibleAssets = useMemo(() => {
    if (filterType === "all") return data.mediaAssets;
    return data.mediaAssets.filter((a) => a.mediaType === filterType);
  }, [data.mediaAssets, filterType]);

  const activeAsset =
    data.mediaAssets.find((a) => a.id === selectedId) || visibleAssets[0] || null;

  const iconFor = (t: MediaAssetType) => {
    if (t === "pdf") return FileText;
    if (t === "image") return ImageIcon;
    if (t === "video") return Video;
    if (t === "audio") return Music;
    return Code2;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Upload / Create + Library List */}
        <div className="xl:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">
                {L("Media Library Upload", "رفع وإدارة المكتبة", lang)}
              </h2>
              <div className="inline-flex rounded-lg border border-[var(--hub-border)] p-0.5 text-xs">
                {(
                  [
                    ["upload", L("File Upload", "رفع ملف", lang)],
                    ["url", L("Remote URL", "رابط", lang)],
                    ["code", L("Code Snippet", "كود", lang)],
                  ] as ["upload" | "url" | "code", string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCreateMode(m)}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                      createMode === m ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {createMode === "upload" ? (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFilesSelected(e.dataTransfer.files);
                  }}
                  className={`rounded-xl border-2 border-dashed p-6 text-center space-y-3 transition-colors ${
                    dragOver
                      ? "border-blue-600 bg-blue-600/5"
                      : "border-[var(--hub-border)] hub-subtle"
                  }`}
                >
                  <UploadCloud className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {L("Drop PDFs, Images, Videos, Audio, or Code files here", "اسحب ملفات PDF أو صور أو فيديو أو صوت أو أكواد هنا", lang)}
                    </p>
                    <p className="text-xs text-[var(--hub-text-muted)]">
                      {L("Stored locally in browser IndexedDB for offline playback & [[embed:...]] insertion.", "تُحفظ محلياً في IndexedDB للعرض والتضمين المباشر داخل المقالات.", lang)}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/*,video/*,audio/*,.ts,.tsx,.js,.jsx,.py,.json,.css,.html,.md,.sh,.yml,.sql"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    aria-label={L("Upload media files", "اختيار ملفات للرفع", lang)}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{L("Select Files to Upload", "اختر ملفات للرفع", lang)}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualCreate} className="space-y-3">
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={L("Asset Title", "عنوان العنصر", lang)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
                {createMode === "url" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as MediaAssetType)}
                      aria-label={L("Media type", "نوع الوسيط", lang)}
                      className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                    >
                      <option value="pdf">PDF</option>
                      <option value="image">{L("Image", "صورة", lang)}</option>
                      <option value="video">{L("Video", "فيديو", lang)}</option>
                      <option value="audio">{L("Audio", "صوت", lang)}</option>
                    </select>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={assetUrl}
                      onChange={(e) => setAssetUrl(e.target.value)}
                      placeholder="https://... or ./media/file.pdf"
                      className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={codeLang}
                        onChange={(e) => setCodeLang(e.target.value)}
                        placeholder="typescript / python / bash"
                        className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="snippet.ts"
                        className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                      />
                    </div>
                    <textarea
                      required
                      rows={5}
                      dir="ltr"
                      value={codeBody}
                      onChange={(e) => setCodeBody(e.target.value)}
                      placeholder="export function runPipeline() { ... }"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                    />
                  </>
                )}
                <input
                  type="text"
                  value={captionEn}
                  onChange={(e) => setCaptionEn(e.target.value)}
                  placeholder={L("Optional caption", "تسمية توضيحية (اختياري)", lang)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{L("Add to Library", "إضافة للمكتبة", lang)}</span>
                </button>
              </form>
            )}
          </div>

          {/* Library Catalog List */}
          <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold">
                {L("Registered Assets", "الملفات المسجلة", lang)} ({visibleAssets.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  onDownloadJson("assets.json", {
                    id: "media-library-collection",
                    items: data.mediaAssets,
                    createdAt: "2026-11-25T00:00:00Z",
                    updatedAt: new Date().toISOString(),
                    status: "active",
                    source: "media-library",
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>assets.json</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["all", "pdf", "image", "video", "audio", "code"] as ("all" | MediaAssetType)[]).map((tKey) => (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setFilterType(tKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    filterType === tKey
                      ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]"
                      : "border border-[var(--hub-border)] text-[var(--hub-text-muted)]"
                  }`}
                >
                  {tKey.toUpperCase()}
                </button>
              ))}
            </div>

            <ul className="divide-y divide-[var(--hub-border)] max-h-[420px] overflow-y-auto">
              {visibleAssets.map((asset) => {
                const TypeIcon = iconFor(asset.mediaType);
                const selected = activeAsset?.id === asset.id;
                return (
                  <li
                    key={asset.id}
                    className={`py-3 space-y-2 ${selected ? "bg-blue-500/5 -mx-2 px-2 rounded-lg" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(asset.id)}
                        className="text-start flex items-start gap-2 min-w-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <TypeIcon className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{loc(asset.title, lang)}</div>
                          <div className="text-[11px] font-mono text-[var(--hub-text-muted)] truncate">
                            {asset.id} · {asset.mediaType}
                            {asset.sizeBytes ? ` · ${formatBytesCompact(asset.sizeBytes)}` : ""}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyEmbedCode(asset.id)}
                          className="px-2 py-1 rounded border border-[var(--hub-border)] text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
                          title={`[[embed:${asset.id}]]`}
                        >
                          {copiedId === asset.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === asset.id ? L("Copied", "نسخ", lang) : L("Embed", "تضمين", lang)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteMediaBlob(asset.id);
                            const next = data.mediaAssets.filter((x) => x.id !== asset.id);
                            persistAssets(next, "Deleted Media Asset", asset.id);
                            if (selectedId === asset.id) setSelectedId(next[0]?.id || "");
                          }}
                          aria-label={L("Delete asset", "حذف العنصر", lang)}
                          className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right: Custom Interactive Viewer Preview */}
        <div className="xl:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hub-border)] pb-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {L("Custom Interactive Media Viewer", "عارض الوسائط المخصص", lang)}
              </h2>
              <p className="text-xs text-[var(--hub-text-muted)]">
                {L(
                  "Supports interactive PDFs, zoomed/rotated images, timeline-scrubbed video & audio, and line-numbered code.",
                  "يدعم عرض PDF والتكبير والتدوير للصور ومشغل الفيديو والصوت واستعراض الأكواد البرمجية.",
                  lang
                )}
              </p>
            </div>
            {activeAsset && (
              <code className="px-2.5 py-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono">
                {`[[embed:${activeAsset.id}]]`}
              </code>
            )}
          </div>

          {activeAsset ? (
            <CustomMediaViewer asset={activeAsset} lang={lang} />
          ) : (
            <div className="py-12 text-center text-sm text-[var(--hub-text-muted)]">
              {L("Upload or select a media asset to preview its custom viewer.", "ارفع أو اختر ملفاً لمعاينته.", lang)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  FolderGit2,
  FolderSearch,
  KeyRound,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import {
  arrayBufferToBase64,
  deleteFileFromGitHubRepo,
  listGitHubRepoFiles,
  uploadFileToGitHubRepo,
  utf8ToBase64,
  type GitHubStoredFileEntry,
} from "../../services/githubStorageService";
import { detectMediaTypeFromFile } from "../../services/mediaLibraryService";
import { formatBytesCompact, slugify } from "../../utils/analytics";
import { L } from "../../utils/i18n";

type DatasetPushTarget = {
  id: string;
  label: string;
  folder: string;
  fileName: string;
  buildPayload: (data: HubDatasets) => unknown;
};

const DATASET_TARGETS: DatasetPushTarget[] = [
  {
    id: "website",
    label: "website.json",
    folder: "public/data/settings",
    fileName: "website.json",
    buildPayload: (d) => d.website,
  },
  {
    id: "profile",
    label: "profile.json",
    folder: "public/data/settings",
    fileName: "profile.json",
    buildPayload: (d) => d.profileSettings,
  },
  {
    id: "github-sync",
    label: "github-sync.json",
    folder: "public/data/settings",
    fileName: "github-sync.json",
    buildPayload: (d) => d.githubSyncSettings,
  },
  {
    id: "projects",
    label: "projects.json",
    folder: "public/data/projects",
    fileName: "projects.json",
    buildPayload: (d) => ({
      id: "projects-collection",
      items: d.projects,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: new Date().toISOString(),
      status: "active",
      source: "manual-portfolio",
    }),
  },
  {
    id: "articles",
    label: "articles.json",
    folder: "public/data/journal",
    fileName: "articles.json",
    buildPayload: (d) => ({
      id: "journal-articles-collection",
      items: d.allArticlesRaw,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: new Date().toISOString(),
      status: "active",
      source: "manual-journal",
    }),
  },
  {
    id: "issues",
    label: "issues.json",
    folder: "public/data/journal",
    fileName: "issues.json",
    buildPayload: (d) => ({
      id: "journal-issues-collection",
      items: d.allIssuesRaw,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: new Date().toISOString(),
      status: "active",
      source: "manual-issues",
    }),
  },
  {
    id: "assets",
    label: "assets.json",
    folder: "public/data/library",
    fileName: "assets.json",
    buildPayload: (d) => ({
      id: "media-library-collection",
      items: d.mediaAssets,
      createdAt: "2026-11-25T00:00:00Z",
      updatedAt: new Date().toISOString(),
      status: "active",
      source: "media-library",
    }),
  },
];

export const GitHubRepoStoragePanel: React.FC<{
  data: HubDatasets;
  lang: Lang;
  githubToken: string;
  onChangeGithubToken: (token: string) => void;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
}> = ({
  data,
  lang,
  githubToken,
  onChangeGithubToken,
  onUpdateData,
  onNotify,
  onAudit,
}) => {
  const defaultOwner =
    data.githubSyncSettings.storageOwner || data.githubSyncSettings.username || data.profileSettings.githubUsername || "AbdoKamelAyed";
  const defaultRepo = data.githubSyncSettings.storageRepo || `${defaultOwner}.github.io`;

  const [storageOwner, setStorageOwner] = useState(defaultOwner);
  const [storageRepo, setStorageRepo] = useState(defaultRepo);
  const [storageBranch, setStorageBranch] = useState(data.githubSyncSettings.storageBranch || "main");
  const [storageFolder, setStorageFolder] = useState(data.githubSyncSettings.storageFolder || "media");

  const [allowOverwrite, setAllowOverwrite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opStatus, setOpStatus] = useState("");
  const [entries, setEntries] = useState<GitHubStoredFileEntry[]>([]);
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);
  const [deleteConfirmPath, setDeleteConfirmPath] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState("website");

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveStorageTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = new Date().toISOString();
    const nextSync = {
      ...data.githubSyncSettings,
      storageOwner: storageOwner.trim(),
      storageRepo: storageRepo.trim(),
      storageBranch: storageBranch.trim() || "main",
      storageFolder: storageFolder.trim() || "media",
      updatedAt: ts,
    };
    saveLocalDraft("./data/settings/github-sync.json", nextSync);
    onUpdateData((prev) => ({ ...prev, githubSyncSettings: nextSync }));
    onAudit("Saved GitHub Storage Target", `${nextSync.storageOwner}/${nextSync.storageRepo}`);
    onNotify(L("GitHub repository storage target saved to settings.", "تم حفظ إعدادات مستودع التخزين على GitHub.", lang));
  };

  const handleBrowseFolder = async () => {
    if (!githubToken.trim()) {
      setOpStatus(
        L(
          "Enter a session GitHub PAT first to browse repository storage.",
          "أدخل رمز GitHub المؤقت أولاً لاستعراض مجلد المستودع.",
          lang
        )
      );
      return;
    }
    setBusy(true);
    setDeleteConfirmPath(null);
    setOpStatus(L("Fetching repository folder contents...", "جارٍ جلب محتويات المجلد...", lang));
    try {
      const list = await listGitHubRepoFiles({
        token: githubToken.trim(),
        owner: storageOwner,
        repo: storageRepo,
        branch: storageBranch,
        folder: storageFolder,
      });
      setEntries(list);
      setHasLoadedEntries(true);
      setOpStatus(
        list.length === 0
          ? L("Folder does not exist yet or is empty.", "المجلد فارغ أو غير منشأ بعد.", lang)
          : L(`Loaded ${list.length} entries from ${storageFolder}.`, `تم تحميل ${list.length} عنصر من المجلد.`, lang)
      );
    } catch (err) {
      setOpStatus(err instanceof Error ? err.message : "Failed to list repository folder.");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!githubToken.trim()) {
      setOpStatus(
        L(
          "Session GitHub PAT is required to upload files.",
          "يتطلب الرفع إدخال رمز GitHub المؤقت للجلسة.",
          lang
        )
      );
      return;
    }
    setBusy(true);
    setOpStatus(L("Pushing file(s) to GitHub repository...", "جارٍ رفع الملفات إلى مستودع GitHub...", lang));
    try {
      const uploadedNames: string[] = [];
      for (const file of Array.from(files)) {
        const buf = await file.arrayBuffer();
        const res = await uploadFileToGitHubRepo({
          token: githubToken.trim(),
          owner: storageOwner,
          repo: storageRepo,
          branch: storageBranch,
          folder: storageFolder,
          fileName: file.name,
          contentBase64: arrayBufferToBase64(buf),
          allowOverwrite,
        });
        uploadedNames.push(res.path);

        const detected = detectMediaTypeFromFile(file);
        const ts = new Date().toISOString();
        const newAssetId = `gh-${detected.mediaType}-${slugify(file.name.replace(/\.[^.]+$/, "")) || "file"}-${Date.now().toString(36).slice(-4)}`;
        const nextAssets = [
          {
            id: newAssetId,
            title: { en: file.name, ar: file.name },
            mediaType: detected.mediaType,
            mimeType: file.type || "application/octet-stream",
            url: res.rawUrl,
            storageMode: "url" as const,
            fileName: file.name,
            sizeBytes: file.size,
            caption: { en: `GitHub Storage (${res.path})`, ar: file.name },
            tags: [detected.mediaType, "github-storage"],
            createdAt: ts,
            updatedAt: ts,
            status: "published" as const,
            source: "github-storage",
          },
          ...data.mediaAssets,
        ];
        saveLocalDraft("./data/library/assets.json", {
          id: "media-library-collection",
          items: nextAssets,
          createdAt: "2026-11-25T00:00:00Z",
          updatedAt: ts,
          status: "active",
          source: "media-library",
        });
        onUpdateData((prev) => ({ ...prev, mediaAssets: nextAssets }));
      }

      onAudit("Pushed Files to GitHub Storage", uploadedNames.join(", "));
      const msg = L(
        `Uploaded ${uploadedNames.length} file(s) cleanly and registered in Media Library.`,
        `تم رفع ${uploadedNames.length} ملف(ات) وتسجيلها في مكتبة الوسائط.`,
        lang
      );
      setOpStatus(msg);
      onNotify(msg);
      await handleBrowseFolder();
    } catch (err) {
      setOpStatus(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePushDataset = async () => {
    if (!githubToken.trim()) {
      setOpStatus(L("Enter a session GitHub PAT before pushing datasets.", "أدخل رمز GitHub أولاً لرفع البيانات.", lang));
      return;
    }
    const target = DATASET_TARGETS.find((t) => t.id === selectedDatasetId);
    if (!target) return;

    setBusy(true);
    setOpStatus(L(`Publishing ${target.label} to GitHub...`, `جارٍ نشر ${target.label} إلى GitHub...`, lang));
    try {
      const jsonText = `${JSON.stringify(target.buildPayload(data), null, 2)}\n`;
      const res = await uploadFileToGitHubRepo({
        token: githubToken.trim(),
        owner: storageOwner,
        repo: storageRepo,
        branch: storageBranch,
        folder: target.folder,
        fileName: target.fileName,
        contentBase64: utf8ToBase64(jsonText),
        commitMessage: `Update ${target.fileName} via Hub Studio`,
        allowOverwrite,
      });
      onAudit("Published Dataset to GitHub", res.path);
      const msg = L(`Published ${res.path} to ${storageOwner}/${storageRepo}.`, `تم نشر ${res.path} في المستودع.`, lang);
      setOpStatus(msg);
      onNotify(msg);
    } catch (err) {
      setOpStatus(err instanceof Error ? err.message : "Dataset push failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async (entry: GitHubStoredFileEntry) => {
    if (!githubToken.trim()) return;
    setBusy(true);
    try {
      await deleteFileFromGitHubRepo({
        token: githubToken.trim(),
        owner: storageOwner,
        repo: storageRepo,
        branch: storageBranch,
        path: entry.path,
        sha: entry.sha,
      });
      setDeleteConfirmPath(null);
      onAudit("Deleted GitHub Storage File", entry.path);
      setOpStatus(L(`Removed ${entry.path} from repository.`, `تم حذف ${entry.path} من المستودع.`, lang));
      setEntries((prev) => prev.filter((x) => x.path !== entry.path));
    } catch (err) {
      setOpStatus(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      data-testid="github-repo-storage-panel"
      className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-6"
    >
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold inline-flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-[var(--hub-secondary)]" />
          <span>{L("GitHub Repository Storage & Publisher", "التخزين والنشر عبر مستودع GitHub", lang)}</span>
        </h2>
        <p className="text-xs text-[var(--hub-text-muted)] max-w-3xl">
          {L(
            "Use any GitHub repository as durable static storage for media assets, documents, and published JSON datasets via the GitHub Contents API. Your personal access token stays strictly in component memory for the current Admin session.",
            "استخدم أي مستودع GitHub كمساحة تخزين دائمة للوسائط والملفات وملفات JSON المنشورة. يبقى الرمز في الذاكرة المؤقتة طوال الجلسة فقط ولا يتم حفظه أبداً.",
            lang
          )}
        </p>
      </div>

      {/* Target Configuration */}
      <form onSubmit={handleSaveStorageTarget} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="gh-storage-owner" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Repo Owner", "مالك المستودع", lang)}
            </label>
            <input
              id="gh-storage-owner"
              type="text"
              dir="ltr"
              value={storageOwner}
              onChange={(e) => setStorageOwner(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
          </div>
          <div>
            <label htmlFor="gh-storage-repo" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Repository Name", "اسم المستودع", lang)}
            </label>
            <input
              id="gh-storage-repo"
              type="text"
              dir="ltr"
              value={storageRepo}
              onChange={(e) => setStorageRepo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
          </div>
          <div>
            <label htmlFor="gh-storage-branch" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Target Branch", "الفرع", lang)}
            </label>
            <input
              id="gh-storage-branch"
              type="text"
              dir="ltr"
              value={storageBranch}
              onChange={(e) => setStorageBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
          </div>
          <div>
            <label htmlFor="gh-storage-folder" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Storage Folder", "مجلد التخزين", lang)}
            </label>
            <input
              id="gh-storage-folder"
              type="text"
              dir="ltr"
              value={storageFolder}
              onChange={(e) => setStorageFolder(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="gh-session-pat" className="text-xs font-semibold text-[var(--hub-text-muted)] flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{L("Session GitHub Token (In-Memory Only — Never Stored)", "رمز GitHub المؤقت (في الذاكرة فقط)", lang)}</span>
            </label>
            <input
              id="gh-session-pat"
              type="password"
              dir="ltr"
              autoComplete="off"
              value={githubToken}
              onChange={(e) => onChangeGithubToken(e.target.value)}
              placeholder="github_pat_... (contents:write)"
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer h-[34px]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{L("Save Target Config", "حفظ إعدادات المستودع", lang)}</span>
          </button>
        </div>
      </form>

      {/* Actions: Upload Files, Browse Folder, Publish Dataset JSON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-[var(--hub-border)]">
        <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-3">
          <h3 className="text-sm font-semibold">{L("Upload Assets to Repo Folder", "رفع ملفات إلى مجلد المستودع", lang)}</h3>
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={allowOverwrite}
              onChange={(e) => setAllowOverwrite(e.target.checked)}
            />
            <span>{L("Allow overwriting files with matching names", "السماح باستبدال الملفات ذات الأسماء المتطابقة", lang)}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              onChange={(e) => {
                handleUploadFiles(e.target.files);
                e.target.value = "";
              }}
              aria-label={L("Select files to push to GitHub", "اختر ملفات للرفع إلى GitHub", lang)}
              className="sr-only"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => uploadInputRef.current?.click()}
              className="px-3.5 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{L("Upload Files to Repo", "رفع ملفات للمستودع", lang)}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleBrowseFolder}
              className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>{L("Browse Repo Folder", "استعراض المجلد", lang)}</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-3">
          <h3 className="text-sm font-semibold">{L("Push Dataset JSON to Repository", "نشر ملف بيانات JSON مباشرة للمستودع", lang)}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              aria-label={L("Select dataset to publish", "اختيار ملف البيانات للنشر", lang)}
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            >
              {DATASET_TARGETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.folder}/{t.fileName}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={handlePushDataset}
              className="px-3.5 py-2 rounded-lg bg-[var(--hub-secondary)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
              <span>{L("Push JSON Update", "دفع التحديث", lang)}</span>
            </button>
          </div>
        </div>
      </div>

      {opStatus && (
        <div className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3.5 py-2.5 text-xs text-[var(--hub-secondary)] font-mono">
          {opStatus}
        </div>
      )}

      {/* Browsed Files List */}
      {hasLoadedEntries && (
        <div className="space-y-2 pt-2 border-t border-[var(--hub-border)]">
          <div className="text-xs font-semibold text-[var(--hub-text-muted)] font-mono">
            {storageOwner}/{storageRepo}/{storageFolder} ({entries.length})
          </div>
          {entries.length > 0 && (
            <ul className="divide-y divide-[var(--hub-border)] border border-[var(--hub-border)] rounded-xl overflow-hidden">
              {entries.map((entry) => (
                <li key={entry.path} className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs bg-[var(--hub-bg)]">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold truncate">{entry.path}</div>
                    <div className="text-[11px] font-mono text-[var(--hub-text-muted)]">
                      {entry.type} {entry.size > 0 ? `· ${formatBytesCompact(entry.size)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.downloadUrl && (
                      <a
                        href={entry.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded border border-[var(--hub-border)] inline-flex items-center gap-1 hover:text-[var(--hub-secondary)]"
                      >
                        <span>{L("Raw", "عرض", lang)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {entry.type === "file" && (
                      deleteConfirmPath === entry.path ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(entry)}
                            className="px-2.5 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                          >
                            {L("Confirm Delete", "تأكيد الحذف", lang)}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPath(null)}
                            className="px-2 py-1 rounded border border-[var(--hub-border)] cursor-pointer"
                          >
                            {L("Cancel", "إلغاء", lang)}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmPath(entry.path)}
                          aria-label={L(`Delete ${entry.name}`, `حذف ${entry.name}`, lang)}
                          className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

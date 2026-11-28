import React, { useMemo, useRef, useState } from "react";
import {
  Check,
  CloudDownload,
  ExternalLink,
  FolderGit2,
  FolderSearch,
  GitCommitHorizontal,
  KeyRound,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import {
  listLocalDrafts,
  removeLocalDraft,
  saveLocalDraft,
  updateDatasetCache,
} from "../../services/dataService";
import {
  arrayBufferToBase64,
  deleteFileFromGitHubRepo,
  fetchJsonFromGitHubRepo,
  listGitHubRepoFiles,
  syncLocalDraftsToGitHubRepo,
  uploadFileToGitHubRepo,
  utf8ToBase64,
  type GitHubStoredFileEntry,
  type LocalSyncFileOutcome,
} from "../../services/githubStorageService";
import { detectMediaTypeFromFile } from "../../services/mediaLibraryService";
import { formatBytesCompact, slugify } from "../../utils/analytics";
import { L } from "../../utils/i18n";
import { LoadingSpinner } from "../LoadingSpinner";

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
  onReloadFromSource?: () => Promise<void>;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
}> = ({
  data,
  lang,
  githubToken,
  onChangeGithubToken,
  onUpdateData,
  onReloadFromSource,
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
  const [opIsError, setOpIsError] = useState(false);
  const [entries, setEntries] = useState<GitHubStoredFileEntry[]>([]);
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);
  const [deleteConfirmPath, setDeleteConfirmPath] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState("website");

  // Pending local drafts sync state
  const [draftVersion, setDraftVersion] = useState(0);
  const pendingDrafts = useMemo(() => {
    void draftVersion;
    void data;
    return listLocalDrafts();
  }, [draftVersion, data]);
  const [deselectedPaths, setDeselectedPaths] = useState<string[]>([]);
  const [syncCommitMsg, setSyncCommitMsg] = useState("Sync local hub updates");
  const [clearDraftsOnSync, setClearDraftsOnSync] = useState(true);
  const [confirmSyncPending, setConfirmSyncPending] = useState(false);
  const [lastSyncOutcomes, setLastSyncOutcomes] = useState<LocalSyncFileOutcome[]>([]);

  const selectedDrafts = useMemo(
    () => pendingDrafts.filter((d) => !deselectedPaths.includes(d.datasetPath)),
    [pendingDrafts, deselectedPaths]
  );

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const patInputRef = useRef<HTMLInputElement | null>(null);

  const promptForPat = (message: string) => {
    setOpIsError(true);
    setOpStatus(message);
    window.requestAnimationFrame(() => patInputRef.current?.focus());
  };

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
      promptForPat(
        L(
          "Enter a session GitHub PAT first to browse repository storage.",
          "أدخل رمز GitHub المؤقت أولاً لاستعراض مجلد المستودع.",
          lang
        )
      );
      return;
    }
    setBusy(true);
    setOpIsError(false);
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
      setOpIsError(true);
      setOpStatus(err instanceof Error ? err.message : "Failed to list repository folder.");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!githubToken.trim()) {
      promptForPat(
        L(
          "Session GitHub PAT is required to upload files.",
          "يتطلب الرفع إدخال رمز GitHub المؤقت للجلسة.",
          lang
        )
      );
      return;
    }
    setBusy(true);
    setOpIsError(false);
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
      promptForPat(L("Enter a session GitHub PAT before pushing datasets.", "أدخل رمز GitHub أولاً لرفع البيانات.", lang));
      return;
    }
    const target = DATASET_TARGETS.find((t) => t.id === selectedDatasetId);
    if (!target) return;

    setBusy(true);
    setOpIsError(false);
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
      setOpIsError(true);
      setOpStatus(err instanceof Error ? err.message : "Dataset push failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async (entry: GitHubStoredFileEntry) => {
    if (!githubToken.trim()) return;
    setBusy(true);
    setOpIsError(false);
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
      setOpIsError(true);
      setOpStatus(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleDraftSelection = (datasetPath: string) => {
    setDeselectedPaths((prev) =>
      prev.includes(datasetPath) ? prev.filter((p) => p !== datasetPath) : [...prev, datasetPath]
    );
  };

  const handleSyncSelectedDrafts = async () => {
    if (!githubToken.trim()) {
      promptForPat(
        L(
          "Enter a session GitHub PAT (contents:write) first to sync local changes to GitHub.",
          "أدخل رمز GitHub المؤقت للجلسة (contents:write) أولاً لمزامنة التعديلات.",
          lang
        )
      );
      return;
    }
    if (selectedDrafts.length === 0) return;
    setConfirmSyncPending(false);
    setBusy(true);
    setOpIsError(false);
    setLastSyncOutcomes([]);
    setOpStatus(
      L(
        `Syncing ${selectedDrafts.length} local dataset(s) to ${storageOwner}/${storageRepo}...`,
        `جارٍ مزامنة ${selectedDrafts.length} ملف(ات) مع ${storageOwner}/${storageRepo}...`,
        lang
      )
    );
    try {
      const { synced, failed } = await syncLocalDraftsToGitHubRepo({
        token: githubToken.trim(),
        owner: storageOwner,
        repo: storageRepo,
        branch: storageBranch,
        drafts: selectedDrafts.map((d) => ({
          datasetPath: d.datasetPath,
          repoPath: d.repoPath,
          payload: d.payload,
        })),
        commitMessagePrefix: syncCommitMsg,
        allowOverwrite: true,
      });

      setLastSyncOutcomes([...synced, ...failed]);

      if (clearDraftsOnSync) {
        for (const item of synced) {
          const matching = selectedDrafts.find((d) => d.datasetPath === item.datasetPath);
          if (matching) {
            updateDatasetCache(matching.datasetPath, matching.payload);
            removeLocalDraft(matching.datasetPath);
          }
        }
        setDraftVersion((v) => v + 1);
      }

      if (synced.length > 0) {
        onAudit(
          "Synced Local Changes to GitHub",
          synced.map((s) => s.repoPath).join(", ")
        );
      }

      setOpIsError(failed.length > 0 && synced.length === 0);
      const summary =
        failed.length === 0
          ? L(
              `Synced ${synced.length} file(s) directly to ${storageOwner}/${storageRepo} (${storageBranch}).`,
              `تمت مزامنة ${synced.length} ملف(ات) بنجاح مع مستودع ${storageOwner}/${storageRepo}.`,
              lang
            )
          : L(
              `Synced ${synced.length} file(s), ${failed.length} failed (${failed[0]?.error || "error"}).`,
              `تمت مزامنة ${synced.length} ملف(ات)، وفشل ${failed.length}.`,
              lang
            );
      setOpStatus(summary);
      onNotify(summary);
    } catch (err) {
      setOpIsError(true);
      setOpStatus(err instanceof Error ? err.message : "Failed to sync local changes.");
    } finally {
      setBusy(false);
    }
  };

  const handlePullFromGitHub = async () => {
    setBusy(true);
    setOpStatus(
      L(
        `Pulling latest datasets from ${storageOwner}/${storageRepo} (${storageBranch})...`,
        `جارٍ سحب أحدث البيانات من ${storageOwner}/${storageRepo}...`,
        lang
      )
    );
    try {
      const pullTargets = [
        { datasetPath: "./data/projects/projects.json", repoPath: "public/data/projects/projects.json" },
        { datasetPath: "./data/journal/articles.json", repoPath: "public/data/journal/articles.json" },
        { datasetPath: "./data/journal/issues.json", repoPath: "public/data/journal/issues.json" },
        { datasetPath: "./data/knowledge/entries.json", repoPath: "public/data/knowledge/entries.json" },
        { datasetPath: "./data/settings/website.json", repoPath: "public/data/settings/website.json" },
      ];

      let pulledCount = 0;
      for (const item of pullTargets) {
        try {
          const res = await fetchJsonFromGitHubRepo({
            token: githubToken.trim() || undefined,
            owner: storageOwner,
            repo: storageRepo,
            branch: storageBranch,
            repoPath: item.repoPath,
          });
          updateDatasetCache(item.datasetPath, res.data);
          removeLocalDraft(item.datasetPath);
          pulledCount += 1;
        } catch {
          // Skip missing optional dataset files
        }
      }

      setDraftVersion((v) => v + 1);
      if (pulledCount > 0) {
        await onReloadFromSource?.();
        onAudit("Pulled Datasets from GitHub Repo", `${storageOwner}/${storageRepo} (${pulledCount})`);
        const msg = L(
          `Pulled ${pulledCount} dataset(s) from ${storageOwner}/${storageRepo} into the active hub.`,
          `تم سحب ${pulledCount} ملف(ات) بيانات من ${storageOwner}/${storageRepo} وتحديث المنصة.`,
          lang
        );
        setOpStatus(msg);
        onNotify(msg);
      } else {
        setOpStatus(
          L(
            "No matching dataset JSON files found in that repository/branch.",
            "لم يتم العثور على ملفات بيانات متطابقة في هذا المستودع أو الفرع.",
            lang
          )
        );
      }
    } catch (err) {
      setOpStatus(err instanceof Error ? err.message : "Failed to pull datasets from GitHub.");
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
              ref={patInputRef}
              type="password"
              dir="ltr"
              autoComplete="off"
              value={githubToken}
              onChange={(e) => {
                setOpIsError(false);
                onChangeGithubToken(e.target.value);
              }}
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

      {/* Pending Local Changes & Direct GitHub Repository Sync */}
      <div
        data-testid="github-local-sync-panel"
        className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
              <GitCommitHorizontal className="w-4 h-4 text-[var(--hub-secondary)]" />
              <span>
                {L(
                  "Sync Local Changes & Project Updates to GitHub",
                  "مزامنة التعديلات المحلية وتحديثات المشاريع إلى GitHub",
                  lang
                )}
              </span>
            </h3>
            <p className="text-xs text-[var(--hub-text-muted)]">
              {L(
                "Commit local edits (projects, articles, settings) directly to your configured GitHub repository as a persistent storage backend.",
                "ارفع التعديلات المحلية (المشاريع، المقالات، الإعدادات) مباشرة لمستودع GitHub كقاعدة تخزين دائمة.",
                lang
              )}
            </p>
          </div>
          <button
            type="button"
            data-testid="pull-github-datasets-btn"
            disabled={busy}
            onClick={handlePullFromGitHub}
            className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--hub-secondary)] cursor-pointer disabled:opacity-50"
          >
            <CloudDownload className="w-3.5 h-3.5" />
            <span>{L("Pull Latest from Repo", "سحب أحدث البيانات من المستودع", lang)}</span>
          </button>
        </div>

        {pendingDrafts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--hub-border)] bg-[var(--hub-bg)] px-3.5 py-3 text-xs text-[var(--hub-text-muted)]">
            {L(
              "All local drafts are clean — edit a project, article, or setting to queue changes for GitHub commit.",
              "لا توجد تعديلات محلية معلقة حالياً — عدّل مشروعاً أو مقالاً لإدراجه في المزامنة.",
              lang
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-[var(--hub-border)] border border-[var(--hub-border)] rounded-lg overflow-hidden bg-[var(--hub-bg)]">
              {pendingDrafts.map((draft) => {
                const checked = !deselectedPaths.includes(draft.datasetPath);
                return (
                  <li key={draft.datasetPath} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDraftSelection(draft.datasetPath)}
                      />
                      <span className="font-mono font-semibold truncate">{draft.repoPath}</span>
                    </label>
                    <div className="text-[11px] font-mono text-[var(--hub-text-muted)] flex items-center gap-2">
                      {draft.itemCount !== null && (
                        <span>
                          {draft.itemCount} {L("items", "عناصر", lang)}
                        </span>
                      )}
                      <span>{formatBytesCompact(draft.sizeBytes)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2.5 items-center">
              <input
                type="text"
                value={syncCommitMsg}
                onChange={(e) => setSyncCommitMsg(e.target.value)}
                placeholder={L("Commit message prefix", "رسالة الحفظ (Commit)", lang)}
                aria-label={L("GitHub sync commit message", "رسالة الحفظ في GitHub", lang)}
                className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
              />
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearDraftsOnSync}
                  onChange={(e) => setClearDraftsOnSync(e.target.checked)}
                />
                <span>{L("Clear local drafts after sync", "مسح المسودات المحلية بعد الرفع", lang)}</span>
              </label>
            </div>

            {!confirmSyncPending ? (
              <button
                type="button"
                data-testid="sync-local-changes-btn"
                disabled={busy || selectedDrafts.length === 0}
                onClick={() => {
                  if (!githubToken.trim()) {
                    handleSyncSelectedDrafts();
                    return;
                  }
                  setConfirmSyncPending(true);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--hub-secondary)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <GitCommitHorizontal className="w-4 h-4" />
                <span>
                  {L(
                    `Sync ${selectedDrafts.length} Change(s) to ${storageOwner}/${storageRepo}`,
                    `مزامنة ${selectedDrafts.length} تعديل(ات) إلى ${storageOwner}/${storageRepo}`,
                    lang
                  )}
                </span>
              </button>
            ) : (
              <div
                role="dialog"
                aria-label={L("Confirm GitHub repository commit", "تأكيد الدفع إلى مستودع GitHub", lang)}
                data-testid="github-sync-confirm-dialog"
                className="rounded-lg border border-[var(--hub-secondary)]/40 bg-[var(--hub-bg)] p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="font-medium">
                  {L(
                    `Commit ${selectedDrafts.length} dataset file(s) to ${storageOwner}/${storageRepo} (${storageBranch})?`,
                    `تأكيد رفع ${selectedDrafts.length} ملف(ات) بيانات إلى ${storageOwner}/${storageRepo}؟`,
                    lang
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="confirm-github-sync-btn"
                    onClick={handleSyncSelectedDrafts}
                    className="px-3 py-1.5 rounded-md bg-[var(--hub-secondary)] text-white font-semibold cursor-pointer"
                  >
                    {L("Confirm & Push", "تأكيد ورفع", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSyncPending(false)}
                    className="px-3 py-1.5 rounded-md border border-[var(--hub-border)] cursor-pointer"
                  >
                    {L("Cancel", "إلغاء", lang)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {lastSyncOutcomes.length > 0 && (
          <ul className="space-y-1 text-xs font-mono">
            {lastSyncOutcomes.map((o) => (
              <li
                key={o.repoPath}
                className={o.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
              >
                {o.ok ? "✓" : "✕"} {o.repoPath}{" "}
                {o.htmlUrl && (
                  <a href={o.htmlUrl} target="_blank" rel="noopener noreferrer" className="underline ms-1">
                    {L("View commit file", "عرض في GitHub", lang)}
                  </a>
                )}
                {o.error ? ` — ${o.error}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

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
        <div
          className={`rounded-lg border px-3.5 py-2.5 text-xs font-mono flex items-center gap-2 ${
            opIsError
              ? "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300"
              : "border-[var(--hub-border)] bg-[var(--hub-bg)] text-[var(--hub-secondary)]"
          }`}
        >
          {busy && <LoadingSpinner size="sm" inline />}
          <span>{opStatus}</span>
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

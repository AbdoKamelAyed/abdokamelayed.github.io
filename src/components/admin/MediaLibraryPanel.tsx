import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderGit2,
  HardDrive,
  Image as ImageIcon,
  LogOut,
  Music,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import type { User } from "firebase/auth";
import type { HubDatasets, Lang, MediaAssetRecord, MediaAssetType } from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import {
  arrayBufferToBase64,
  uploadFileToGitHubRepo,
} from "../../services/githubStorageService";
import {
  deleteGoogleDriveFile,
  getCurrentGoogleUser,
  getGoogleDriveAccessToken,
  googleDriveSignIn,
  googleDriveSignOut,
  initGoogleDriveAuth,
  listGoogleDriveFiles,
  uploadFileToGoogleDrive,
} from "../../services/googleDriveService";
import {
  deleteMediaBlob,
  detectMediaTypeFromFile,
  saveMediaBlob,
} from "../../services/mediaLibraryService";
import { formatBytesCompact, slugify } from "../../utils/analytics";
import {
  mapDriveFileToMediaAsset,
  type GoogleDriveFileItem,
} from "../../utils/googleDriveHelpers";
import { L, loc } from "../../utils/i18n";
import { CustomMediaViewer } from "../media/CustomMediaViewer";
import { GoogleSignInButton } from "./GoogleSignInButton";

export const MediaLibraryPanel: React.FC<{
  data: HubDatasets;
  lang: Lang;
  githubToken?: string;
  onChangeGithubToken?: (token: string) => void;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
  onDownloadJson: (filename: string, payload: unknown) => void;
}> = ({
  data,
  lang,
  githubToken = "",
  onChangeGithubToken,
  onUpdateData,
  onNotify,
  onAudit,
  onDownloadJson,
}) => {
  const [filterType, setFilterType] = useState<"all" | MediaAssetType>("all");
  const [selectedId, setSelectedId] = useState<string>(data.mediaAssets[0]?.id || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Manual URL / Code / GitHub Repo / Google Drive asset creation
  const [createMode, setCreateMode] = useState<"upload" | "github" | "drive" | "url" | "code">("upload");
  const [titleEn, setTitleEn] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [mediaType, setMediaType] = useState<MediaAssetType>("pdf");
  const [assetUrl, setAssetUrl] = useState("");
  const [codeLang, setCodeLang] = useState("typescript");
  const [codeBody, setCodeBody] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // GitHub Repo Storage upload state (session PAT kept strictly in memory)
  const [ghOwner, setGhOwner] = useState(
    data.githubSyncSettings.storageOwner || data.profileSettings.githubUsername || "AbdoKamelAyed"
  );
  const [ghRepo, setGhRepo] = useState(
    data.githubSyncSettings.storageRepo || `${data.profileSettings.githubUsername || "AbdoKamelAyed"}.github.io`
  );
  const [ghBranch, setGhBranch] = useState(data.githubSyncSettings.storageBranch || "main");
  const [ghFolder, setGhFolder] = useState(data.githubSyncSettings.storageFolder || "media");
  const [ghLocalToken, setGhLocalToken] = useState(githubToken);
  const [ghAllowOverwrite, setGhAllowOverwrite] = useState(false);
  const [ghUploading, setGhUploading] = useState(false);
  const [ghStatus, setGhStatus] = useState("");
  const ghFileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Drive state (access token kept strictly in memory via googleDriveService)
  const [driveNeedsAuth, setDriveNeedsAuth] = useState<boolean>(() => !getGoogleDriveAccessToken());
  const [driveUser, setDriveUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [driveLoggingIn, setDriveLoggingIn] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveStatus, setDriveStatus] = useState("");
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFileItem[]>([]);
  const [driveConfirmDelete, setDriveConfirmDelete] = useState<GoogleDriveFileItem | null>(null);
  const [driveConfirmOverwrite, setDriveConfirmOverwrite] = useState<{
    file: File;
    existing: GoogleDriveFileItem;
  } | null>(null);
  const driveFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(
      (user) => {
        setDriveUser(user);
        setDriveNeedsAuth(false);
      },
      () => {
        setDriveUser(null);
        setDriveNeedsAuth(true);
      }
    );
    return unsubscribe;
  }, []);

  const effectiveToken = githubToken || ghLocalToken;
  const updateToken = (next: string) => {
    setGhLocalToken(next);
    onChangeGithubToken?.(next);
  };

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

  const handleGitHubRepoFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!effectiveToken.trim()) {
      setGhStatus(
        L(
          "Enter a session GitHub Personal Access Token (contents:write) first. It stays strictly in memory.",
          "أدخل رمز GitHub المؤقت (contents:write) أولاً. يبقى الرمز في الذاكرة المؤقتة فقط.",
          lang
        )
      );
      return;
    }

    setGhUploading(true);
    setGhStatus(L("Uploading to GitHub repository...", "جارٍ الرفع إلى مستودع GitHub...", lang));
    const uploadedAssets: MediaAssetRecord[] = [];
    const ts = new Date().toISOString();

    try {
      for (const file of Array.from(files)) {
        const buffer = await file.arrayBuffer();
        const contentBase64 = arrayBufferToBase64(buffer);
        const res = await uploadFileToGitHubRepo({
          token: effectiveToken.trim(),
          owner: ghOwner,
          repo: ghRepo,
          branch: ghBranch,
          folder: ghFolder,
          fileName: file.name,
          contentBase64,
          allowOverwrite: ghAllowOverwrite,
        });

        const detected = detectMediaTypeFromFile(file);
        const baseSlug = slugify(file.name.replace(/\.[^.]+$/, "")) || "asset";
        const id = `gh-${detected.mediaType}-${baseSlug}-${Date.now().toString(36).slice(-4)}`;
        const codeText =
          detected.mediaType === "code" && file.size <= 512_000 ? await file.text() : undefined;

        uploadedAssets.push({
          id,
          title: { en: titleEn.trim() || file.name, ar: titleEn.trim() || file.name },
          mediaType: detected.mediaType,
          mimeType: file.type || "application/octet-stream",
          url: res.rawUrl,
          storageMode: "url",
          codeContent: codeText,
          codeLanguage: detected.codeLanguage,
          fileName: file.name,
          sizeBytes: file.size,
          caption: { en: captionEn.trim() || `Stored in ${ghOwner}/${ghRepo}/${res.path}`, ar: file.name },
          tags: [detected.mediaType, "github-storage"],
          createdAt: ts,
          updatedAt: ts,
          status: "published",
          source: "github-storage",
        });
      }

      if (uploadedAssets.length > 0) {
        const next = [...uploadedAssets, ...data.mediaAssets];
        persistAssets(next, "Uploaded to GitHub Repo Storage", uploadedAssets.map((a) => a.fileName || a.id).join(", "));
        setSelectedId(uploadedAssets[0].id);
        setTitleEn("");
        setCaptionEn("");
        const msg = L(
          `Uploaded ${uploadedAssets.length} file(s) to ${ghOwner}/${ghRepo}/${ghFolder} and registered in Media Library.`,
          `تم رفع ${uploadedAssets.length} ملف(ات) إلى مستودع GitHub وتسجيلها في مكتبة الوسائط.`,
          lang
        );
        setGhStatus(msg);
        onNotify(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "GitHub upload failed.";
      setGhStatus(msg);
      onNotify(msg);
    } finally {
      setGhUploading(false);
    }
  };

  const refreshDriveList = async (tokenOverride?: string) => {
    const token = tokenOverride || (await getGoogleDriveAccessToken());
    if (!token) {
      setDriveNeedsAuth(true);
      return;
    }
    setDriveBusy(true);
    try {
      const files = await listGoogleDriveFiles({ accessToken: token, pageSize: 25 });
      setDriveFiles(files);
      setDriveStatus(
        files.length === 0
          ? L("No app files found in Google Drive yet.", "لا توجد ملفات مرفوعة على Google Drive بعد.", lang)
          : L(`Loaded ${files.length} file(s) from Google Drive.`, `تم جلب ${files.length} ملف(ات) من Google Drive.`, lang)
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to list Google Drive files.";
      setDriveStatus(msg);
      if (msg.toLowerCase().includes("sign in")) {
        setDriveNeedsAuth(true);
      }
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveSignIn = async () => {
    setDriveLoggingIn(true);
    setDriveStatus("");
    try {
      const { user, accessToken } = await googleDriveSignIn();
      setDriveUser(user);
      setDriveNeedsAuth(false);
      await refreshDriveList(accessToken);
    } catch (err) {
      setDriveStatus(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setDriveLoggingIn(false);
    }
  };

  const handleDriveSignOut = async () => {
    await googleDriveSignOut();
    setDriveUser(null);
    setDriveNeedsAuth(true);
    setDriveFiles([]);
    setDriveConfirmDelete(null);
    setDriveConfirmOverwrite(null);
    setDriveStatus(L("Signed out of Google Drive.", "تم تسجيل الخروج من Google Drive.", lang));
  };

  const performDriveUpload = async (file: File, existingFileId?: string) => {
    const token = await getGoogleDriveAccessToken();
    if (!token) {
      setDriveNeedsAuth(true);
      return;
    }
    setDriveBusy(true);
    setDriveStatus(L(`Uploading "${file.name}" to Google Drive...`, `جارٍ رفع "${file.name}" إلى Google Drive...`, lang));
    try {
      const uploaded = await uploadFileToGoogleDrive({
        accessToken: token,
        file,
        existingFileId,
      });
      const detected = detectMediaTypeFromFile(file);
      const codeText =
        detected.mediaType === "code" && file.size <= 512_000 ? await file.text() : undefined;
      const asset = mapDriveFileToMediaAsset({
        driveFile: uploaded,
        titleOverride: titleEn,
        captionOverride: captionEn,
        codeContent: codeText,
        codeLanguage: detected.codeLanguage,
      });
      const next = [asset, ...data.mediaAssets.filter((a) => a.id !== asset.id)];
      persistAssets(
        next,
        existingFileId ? "Updated Google Drive Asset" : "Uploaded to Google Drive",
        uploaded.name
      );
      setSelectedId(asset.id);
      setTitleEn("");
      setCaptionEn("");
      const msg = L(
        `Saved "${uploaded.name}" to Google Drive and registered in Media Library.`,
        `تم حفظ "${uploaded.name}" في Google Drive وتسجيله في مكتبة الوسائط.`,
        lang
      );
      setDriveStatus(msg);
      onNotify(msg);
      await refreshDriveList(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google Drive upload failed.";
      setDriveStatus(msg);
      onNotify(msg);
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDriveFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const match = driveFiles.find((f) => f.name.toLowerCase() === file.name.toLowerCase());
    if (match) {
      setDriveConfirmOverwrite({ file, existing: match });
      return;
    }
    await performDriveUpload(file);
  };

  const handleConfirmDriveDelete = async () => {
    if (!driveConfirmDelete) return;
    const token = await getGoogleDriveAccessToken();
    if (!token) {
      setDriveNeedsAuth(true);
      setDriveConfirmDelete(null);
      return;
    }
    const target = driveConfirmDelete;
    setDriveBusy(true);
    try {
      await deleteGoogleDriveFile({ accessToken: token, fileId: target.id });
      setDriveConfirmDelete(null);
      setDriveFiles((prev) => prev.filter((f) => f.id !== target.id));
      onAudit("Deleted Google Drive File", target.name);
      const msg = L(`Deleted "${target.name}" from Google Drive.`, `تم حذف "${target.name}" من Google Drive.`, lang);
      setDriveStatus(msg);
      onNotify(msg);
    } catch (err) {
      setDriveStatus(err instanceof Error ? err.message : "Failed to delete Google Drive file.");
    } finally {
      setDriveBusy(false);
    }
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
              <div className="inline-flex flex-wrap rounded-lg border border-[var(--hub-border)] p-0.5 text-xs">
                {(
                  [
                    ["upload", L("Local Upload", "رفع محلي", lang)],
                    ["github", L("GitHub Repo", "مستودع GitHub", lang)],
                    ["drive", L("Google Drive", "Google Drive", lang)],
                    ["url", L("Remote URL", "رابط", lang)],
                    ["code", L("Code Snippet", "كود", lang)],
                  ] as ["upload" | "github" | "drive" | "url" | "code", string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    data-testid={`media-mode-${m}`}
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

            {createMode === "drive" ? (
              <div data-testid="media-google-drive-panel" className="space-y-3">
                <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 text-xs text-[var(--hub-text-muted)] flex items-start gap-2">
                  <HardDrive className="w-4 h-4 text-[var(--hub-secondary)] shrink-0 mt-0.5" />
                  <span>
                    {L(
                      "Upload media files directly to your Google Drive with permission and register share links in the Media Library.",
                      "ارفع ملفات الوسائط مباشرة إلى Google Drive بعد موافقتك وسجّل روابطها في مكتبة الوسائط.",
                      lang
                    )}
                  </span>
                </div>

                {driveNeedsAuth ? (
                  <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-bg)] p-4 flex flex-col items-start gap-3">
                    <p className="text-xs text-[var(--hub-text-muted)]">
                      {L(
                        "Sign in with Google to access and upload media files stored in Google Drive.",
                        "سجّل الدخول عبر Google لرفع وإدارة ملفات الوسائط في Google Drive.",
                        lang
                      )}
                    </p>
                    <GoogleSignInButton
                      onClick={handleDriveSignIn}
                      disabled={driveLoggingIn}
                      label={
                        driveLoggingIn
                          ? L("Signing in...", "جارٍ تسجيل الدخول...", lang)
                          : L("Sign in with Google", "تسجيل الدخول عبر Google", lang)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] px-3 py-2 text-xs">
                      <span className="truncate font-medium">
                        {driveUser?.email || driveUser?.displayName || L("Google Drive connected", "تم الربط مع Google Drive", lang)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={driveBusy}
                          onClick={() => refreshDriveList()}
                          className="px-2 py-1 rounded border border-[var(--hub-border)] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${driveBusy ? "animate-spin" : ""}`} />
                          <span>{L("Refresh", "تحديث", lang)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDriveSignOut}
                          className="px-2 py-1 rounded border border-[var(--hub-border)] inline-flex items-center gap-1 text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>{L("Sign Out", "خروج", lang)}</span>
                        </button>
                      </div>
                    </div>

                    <input
                      ref={driveFileInputRef}
                      type="file"
                      onChange={(e) => {
                        handleDriveFileSelected(e.target.files);
                        e.target.value = "";
                      }}
                      aria-label={L("Upload file to Google Drive", "رفع ملف إلى Google Drive", lang)}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      disabled={driveBusy}
                      onClick={() => driveFileInputRef.current?.click()}
                      className="w-full px-4 py-2.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {driveBusy
                          ? L("Working with Google Drive...", "جارٍ المعالجة في Google Drive...", lang)
                          : L("Choose File & Upload to Google Drive", "اختر ملفاً للرفع إلى Google Drive", lang)}
                      </span>
                    </button>

                    {driveConfirmOverwrite && (
                      <div
                        role="dialog"
                        aria-label={L("Confirm Google Drive file overwrite", "تأكيد استبدال الملف في Google Drive", lang)}
                        data-testid="drive-confirm-dialog"
                        className="rounded-xl border border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/50 p-3.5 space-y-2.5 text-xs"
                      >
                        <p className="font-semibold text-amber-950 dark:text-amber-100">
                          {L(
                            `Update the existing file "${driveConfirmOverwrite.existing.name}" in Google Drive?`,
                            `هل تريد تحديث الملف الموجود "${driveConfirmOverwrite.existing.name}" في Google Drive؟`,
                            lang
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const pending = driveConfirmOverwrite;
                              setDriveConfirmOverwrite(null);
                              await performDriveUpload(pending.file, pending.existing.id);
                            }}
                            className="px-3 py-1.5 rounded-md bg-amber-600 text-white font-semibold cursor-pointer"
                          >
                            {L("Confirm Update", "تأكيد التحديث", lang)}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDriveConfirmOverwrite(null)}
                            className="px-3 py-1.5 rounded-md border border-[var(--hub-border)] bg-[var(--hub-bg)] cursor-pointer"
                          >
                            {L("Cancel", "إلغاء", lang)}
                          </button>
                        </div>
                      </div>
                    )}

                    {driveConfirmDelete && (
                      <div
                        role="dialog"
                        aria-label={L("Confirm Google Drive file deletion", "تأكيد حذف الملف من Google Drive", lang)}
                        data-testid="drive-confirm-dialog"
                        className="rounded-xl border border-red-500/50 bg-red-50/90 dark:bg-red-950/50 p-3.5 space-y-2.5 text-xs"
                      >
                        <p className="font-semibold text-red-950 dark:text-red-100">
                          {L(
                            `Delete "${driveConfirmDelete.name}" from Google Drive? This action cannot be undone.`,
                            `هل تريد حذف "${driveConfirmDelete.name}" من Google Drive؟ لا يمكن التراجع عن هذا الإجراء.`,
                            lang
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleConfirmDriveDelete}
                            className="px-3 py-1.5 rounded-md bg-red-600 text-white font-semibold cursor-pointer"
                          >
                            {L("Confirm Delete", "تأكيد الحذف", lang)}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDriveConfirmDelete(null)}
                            className="px-3 py-1.5 rounded-md border border-[var(--hub-border)] bg-[var(--hub-bg)] cursor-pointer"
                          >
                            {L("Cancel", "إلغاء", lang)}
                          </button>
                        </div>
                      </div>
                    )}

                    {driveFiles.length > 0 && (
                      <ul className="divide-y divide-[var(--hub-border)] border border-[var(--hub-border)] rounded-xl max-h-56 overflow-y-auto">
                        {driveFiles.map((df) => (
                          <li key={df.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs bg-[var(--hub-bg)]">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{df.name}</div>
                              <div className="text-[11px] font-mono text-[var(--hub-text-muted)] truncate">
                                {df.size ? formatBytesCompact(Number(df.size)) : df.mimeType}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {df.webViewLink && (
                                <a
                                  href={df.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={L(`Open ${df.name} in Google Drive`, `فتح ${df.name}`, lang)}
                                  className="p-1.5 rounded border border-[var(--hub-border)] hover:text-[var(--hub-secondary)]"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setDriveConfirmDelete(df)}
                                aria-label={L(`Delete ${df.name} from Google Drive`, `حذف ${df.name}`, lang)}
                                className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {driveStatus && (
                  <p className="text-xs text-[var(--hub-secondary)] leading-relaxed">{driveStatus}</p>
                )}
              </div>
            ) : createMode === "github" ? (
              <div data-testid="media-github-storage-panel" className="space-y-3">
                <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 text-xs text-[var(--hub-text-muted)] flex items-start gap-2">
                  <FolderGit2 className="w-4 h-4 text-[var(--hub-secondary)] shrink-0 mt-0.5" />
                  <span>
                    {L(
                      "Push files directly to your GitHub repository via Contents API and auto-register their raw CDN URLs here. Your token stays in memory only.",
                      "ارفع الملفات مباشرة إلى مستودع GitHub لتسجيل روابطها فوراً في المكتبة. الرمز يبقى في الذاكرة المؤقتة فقط.",
                      lang
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={ghOwner}
                    onChange={(e) => setGhOwner(e.target.value)}
                    placeholder={L("Owner", "المالك", lang)}
                    aria-label={L("GitHub repository owner", "مالك مستودع GitHub", lang)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder={L("Repository", "المستودع", lang)}
                    aria-label={L("GitHub repository name", "اسم مستودع GitHub", lang)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={ghBranch}
                    onChange={(e) => setGhBranch(e.target.value)}
                    placeholder="main"
                    aria-label={L("GitHub branch", "الفرع", lang)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={ghFolder}
                    onChange={(e) => setGhFolder(e.target.value)}
                    placeholder="media"
                    aria-label={L("Target storage folder", "مجلد التخزين", lang)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                </div>

                <input
                  type="password"
                  dir="ltr"
                  value={effectiveToken}
                  onChange={(e) => updateToken(e.target.value)}
                  placeholder={L("Session GitHub PAT (not saved to storage)", "رمز GitHub المؤقت للجلسة", lang)}
                  aria-label={L("Session GitHub Token", "رمز GitHub للجلسة", lang)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                />

                <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ghAllowOverwrite}
                    onChange={(e) => setGhAllowOverwrite(e.target.checked)}
                  />
                  <span>{L("Overwrite existing file if name already exists", "السماح باستبدال الملف إن وجد مسبقاً", lang)}</span>
                </label>

                <input
                  ref={ghFileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    handleGitHubRepoFilesUpload(e.target.files);
                    e.target.value = "";
                  }}
                  aria-label={L("Upload files to GitHub repository", "رفع ملفات إلى GitHub", lang)}
                  className="sr-only"
                />
                <button
                  type="button"
                  disabled={ghUploading}
                  onClick={() => ghFileInputRef.current?.click()}
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {ghUploading
                      ? L("Uploading to GitHub...", "جارٍ الرفع إلى GitHub...", lang)
                      : L("Choose Files & Push to GitHub Repo", "اختر ملفات وارفعها لمستودع GitHub", lang)}
                  </span>
                </button>

                {ghStatus && (
                  <p className="text-xs text-[var(--hub-secondary)] leading-relaxed">{ghStatus}</p>
                )}
              </div>
            ) : createMode === "upload" ? (
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

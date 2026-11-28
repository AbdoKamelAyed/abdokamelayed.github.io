import type { MediaAssetRecord, MediaAssetType } from "../types/hub";
import { slugify } from "./analytics";

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
}

export function formatDriveFilesQuery(searchTerm?: string): string {
  const base = "trashed = false";
  const clean = searchTerm?.trim();
  if (!clean) return base;
  const escaped = clean.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `${base} and name contains '${escaped}'`;
}

export function buildDriveMultipartBody(params: {
  fileName: string;
  mimeType: string;
  fileBytes: Uint8Array;
  parentFolderId?: string;
  boundary?: string;
}): { bodyBytes: Uint8Array; contentTypeHeader: string } {
  const boundary = params.boundary || `abdo_hub_drive_${Date.now().toString(36)}`;
  const metadata: Record<string, unknown> = {
    name: params.fileName,
    mimeType: params.mimeType || "application/octet-stream",
  };
  if (params.parentFolderId?.trim()) {
    metadata.parents = [params.parentFolderId.trim()];
  }

  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${params.mimeType || "application/octet-stream"}\r\n\r\n`
  );
  const epilogue = encoder.encode(`\r\n--${boundary}--`);

  const bodyBytes = new Uint8Array(preamble.length + params.fileBytes.length + epilogue.length);
  bodyBytes.set(preamble, 0);
  bodyBytes.set(params.fileBytes, preamble.length);
  bodyBytes.set(epilogue, preamble.length + params.fileBytes.length);

  return {
    bodyBytes,
    contentTypeHeader: `multipart/related; boundary=${boundary}`,
  };
}

export function inferMediaTypeFromMime(mimeType: string, fileName: string): MediaAssetType {
  const lowMime = (mimeType || "").toLowerCase();
  const lowName = (fileName || "").toLowerCase();
  if (lowMime === "application/pdf" || lowName.endsWith(".pdf")) return "pdf";
  if (lowMime.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(lowName)) return "image";
  if (lowMime.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(lowName)) return "video";
  if (lowMime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac)$/i.test(lowName)) return "audio";
  return "code";
}

export function mapDriveFileToMediaAsset(params: {
  driveFile: GoogleDriveFileItem;
  titleOverride?: string;
  captionOverride?: string;
  codeContent?: string;
  codeLanguage?: string;
  nowIso?: string;
}): MediaAssetRecord {
  const { driveFile, titleOverride, captionOverride, codeContent, codeLanguage, nowIso } = params;
  const ts = nowIso || driveFile.modifiedTime || new Date().toISOString();
  const mediaType = inferMediaTypeFromMime(driveFile.mimeType, driveFile.name);
  const baseSlug = slugify(driveFile.name.replace(/\.[^.]+$/, "")) || "drive-file";
  const resolvedUrl =
    driveFile.webContentLink ||
    driveFile.webViewLink ||
    `https://drive.google.com/file/d/${encodeURIComponent(driveFile.id)}/view`;

  return {
    id: `gdrive-${mediaType}-${baseSlug}-${driveFile.id.slice(0, 6)}`,
    title: {
      en: titleOverride?.trim() || driveFile.name,
      ar: titleOverride?.trim() || driveFile.name,
    },
    mediaType,
    mimeType: driveFile.mimeType || "application/octet-stream",
    url: resolvedUrl,
    storageMode: codeContent ? "inline-code" : "url",
    codeContent,
    codeLanguage,
    fileName: driveFile.name,
    sizeBytes: driveFile.size ? Number(driveFile.size) : undefined,
    caption: {
      en: captionOverride?.trim() || `Stored on Google Drive (${driveFile.name})`,
      ar: captionOverride?.trim() || driveFile.name,
    },
    tags: [mediaType, "google-drive"],
    createdAt: ts,
    updatedAt: ts,
    status: "published",
    source: "google-drive",
  };
}

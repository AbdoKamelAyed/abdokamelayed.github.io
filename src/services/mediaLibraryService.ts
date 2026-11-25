import type { MediaAssetType } from "../types/hub";

const DB_NAME = "abdo_hub_media_db";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

const memoryFallback = new Map<string, Blob>();
const objectUrlCache = new Map<string, string>();

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open error"));
  });
}

export async function saveMediaBlob(assetId: string, blob: Blob): Promise<void> {
  memoryFallback.set(assetId, blob);
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, assetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Memory fallback holds the blob for this session
  }
}

export async function getMediaBlob(assetId: string): Promise<Blob | null> {
  const mem = memoryFallback.get(assetId);
  if (mem) return mem;
  try {
    const db = await openMediaDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(assetId);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
    if (blob) memoryFallback.set(assetId, blob);
    return blob;
  } catch {
    return null;
  }
}

export async function resolveMediaObjectUrl(assetId: string): Promise<string | null> {
  const cached = objectUrlCache.get(assetId);
  if (cached) return cached;
  const blob = await getMediaBlob(assetId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(assetId, url);
  return url;
}

export async function deleteMediaBlob(assetId: string): Promise<void> {
  memoryFallback.delete(assetId);
  const existingUrl = objectUrlCache.get(assetId);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
    objectUrlCache.delete(assetId);
  }
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(assetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export function detectMediaTypeFromFile(file: { name: string; type?: string }): {
  mediaType: MediaAssetType;
  codeLanguage?: string;
} {
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (mime === "application/pdf" || ext === "pdf") {
    return { mediaType: "pdf" };
  }
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)) {
    return { mediaType: "image" };
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "ogg", "m4v"].includes(ext)) {
    return { mediaType: "video" };
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) {
    return { mediaType: "audio" };
  }

  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    py: "python",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    sql: "sql",
    rs: "rust",
    go: "go",
  };
  return {
    mediaType: "code",
    codeLanguage: langMap[ext] || "plaintext",
  };
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  buildDriveMultipartBody,
  formatDriveFilesQuery,
  type GoogleDriveFileItem,
} from "../utils/googleDriveHelpers";

export const GOOGLE_DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"] as const;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of GOOGLE_DRIVE_SCOPES) {
  provider.addScope(scope);
}

// Keep access token strictly in memory — never localStorage or sessionStorage.
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initGoogleDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function googleDriveSignIn(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to obtain Google Drive access token.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getGoogleDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function getCurrentGoogleUser(): User | null {
  return auth.currentUser;
}

export async function googleDriveSignOut(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export async function listGoogleDriveFiles(params: {
  accessToken: string;
  query?: string;
  pageSize?: number;
}): Promise<GoogleDriveFileItem[]> {
  const q = encodeURIComponent(formatDriveFilesQuery(params.query));
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const fields = encodeURIComponent("files(id,name,mimeType,size,webViewLink,webContentLink,modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=${pageSize}&orderBy=modifiedTime%20desc&fields=${fields}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error("Google Drive session expired. Please sign in again.");
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google Drive list failed (${res.status})${errText ? `: ${errText.slice(0, 140)}` : ""}`);
  }

  const data = (await res.json()) as { files?: GoogleDriveFileItem[] };
  return data.files || [];
}

export async function uploadFileToGoogleDrive(params: {
  accessToken: string;
  file: File;
  parentFolderId?: string;
  existingFileId?: string;
}): Promise<GoogleDriveFileItem> {
  const buffer = await params.file.arrayBuffer();
  const { bodyBytes, contentTypeHeader } = buildDriveMultipartBody({
    fileName: params.file.name,
    mimeType: params.file.type || "application/octet-stream",
    fileBytes: new Uint8Array(buffer),
    parentFolderId: params.existingFileId ? undefined : params.parentFolderId,
  });

  const fields = encodeURIComponent("id,name,mimeType,size,webViewLink,webContentLink,modifiedTime");
  const isUpdate = Boolean(params.existingFileId);
  const endpoint = isUpdate
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        params.existingFileId!
      )}?uploadType=multipart&fields=${fields}`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${fields}`;

  const res = await fetch(endpoint, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": contentTypeHeader,
    },
    body: bodyBytes.buffer.slice(
      bodyBytes.byteOffset,
      bodyBytes.byteOffset + bodyBytes.byteLength
    ) as ArrayBuffer,
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error("Google Drive session expired. Please sign in again.");
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google Drive upload failed (${res.status})${errText ? `: ${errText.slice(0, 140)}` : ""}`);
  }

  return (await res.json()) as GoogleDriveFileItem;
}

export async function deleteGoogleDriveFile(params: {
  accessToken: string;
  fileId: string;
}): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(params.fileId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error("Google Drive session expired. Please sign in again.");
  }
  if (!res.ok) {
    throw new Error(`Google Drive delete failed (${res.status})`);
  }
}

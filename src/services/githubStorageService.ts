export interface GitHubRepoTarget {
  owner: string;
  repo: string;
  branch: string;
}

export interface GitHubStoredFileEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  downloadUrl: string;
  htmlUrl: string;
  type: "file" | "dir";
}

export interface GitHubUploadResult {
  path: string;
  sha: string;
  htmlUrl: string;
  rawUrl: string;
}

const SLUG_RE = /^[A-Za-z0-9._-]+$/;
const BRANCH_RE = /^[A-Za-z0-9._/-]+$/;

export function validateGitHubRepoTarget(target: GitHubRepoTarget): {
  valid: boolean;
  error?: string;
} {
  const owner = target.owner.trim();
  const repo = target.repo.trim();
  const branch = target.branch.trim() || "main";

  if (!owner || !SLUG_RE.test(owner)) {
    return { valid: false, error: "Invalid repository owner username." };
  }
  if (!repo || !SLUG_RE.test(repo)) {
    return { valid: false, error: "Invalid repository name." };
  }
  if (!BRANCH_RE.test(branch) || branch.includes("..") || branch.startsWith("/")) {
    return { valid: false, error: "Invalid branch name." };
  }
  return { valid: true };
}

export function sanitizeRepoStoragePath(folder: string, fileName: string): string | null {
  const combined = [folder, fileName]
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

  if (!combined) return null;
  if (combined.includes("\\") || combined.includes("..") || combined.includes("\0")) {
    return null;
  }

  const segments = combined.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  for (const seg of segments) {
    if (seg === "." || seg === ".." || /[\x00-\x1f<>:"|?*]/.test(seg)) {
      return null;
    }
  }
  return segments.join("/");
}

export function buildGitHubRawUrl(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): string {
  const encodedPath = filePath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner.trim())}/${encodeURIComponent(
    repo.trim()
  )}/${encodeURIComponent(branch.trim() || "main")}/${encodedPath}`;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return arrayBufferToBase64(bytes.buffer);
}

function encodeContentsPath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export async function getGitHubFileSha(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}): Promise<string | null> {
  const url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(
    params.repo
  )}/contents/${encodeContentsPath(params.path)}?ref=${encodeURIComponent(params.branch)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub lookup failed (${res.status})`);
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha || null;
}

export async function uploadFileToGitHubRepo(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  folder: string;
  fileName: string;
  contentBase64: string;
  commitMessage?: string;
  allowOverwrite?: boolean;
}): Promise<GitHubUploadResult> {
  const targetCheck = validateGitHubRepoTarget({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
  });
  if (!targetCheck.valid) {
    throw new Error(targetCheck.error || "Invalid repository target.");
  }

  const cleanPath = sanitizeRepoStoragePath(params.folder, params.fileName);
  if (!cleanPath) {
    throw new Error("Invalid storage folder or filename.");
  }

  const branch = params.branch.trim() || "main";
  const existingSha = await getGitHubFileSha({
    token: params.token,
    owner: params.owner.trim(),
    repo: params.repo.trim(),
    branch,
    path: cleanPath,
  });

  if (existingSha && !params.allowOverwrite) {
    throw new Error(`File "${cleanPath}" already exists in the repository. Enable overwrite confirmation to replace it.`);
  }

  const endpoint = `https://api.github.com/repos/${encodeURIComponent(
    params.owner.trim()
  )}/${encodeURIComponent(params.repo.trim())}/contents/${encodeContentsPath(cleanPath)}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: params.commitMessage?.trim() || `Upload ${cleanPath} via Hub Studio`,
      content: params.contentBase64,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = (errBody as { message?: string }).message || `HTTP ${res.status}`;
    throw new Error(`GitHub upload error: ${msg}`);
  }

  const result = (await res.json()) as {
    content?: { path?: string; sha?: string; html_url?: string; download_url?: string };
  };
  const finalPath = result.content?.path || cleanPath;

  return {
    path: finalPath,
    sha: result.content?.sha || "",
    htmlUrl:
      result.content?.html_url ||
      `https://github.com/${encodeURIComponent(params.owner.trim())}/${encodeURIComponent(
        params.repo.trim()
      )}/blob/${encodeURIComponent(branch)}/${finalPath}`,
    rawUrl:
      result.content?.download_url ||
      buildGitHubRawUrl(params.owner, params.repo, branch, finalPath),
  };
}

export async function listGitHubRepoFiles(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  folder: string;
}): Promise<GitHubStoredFileEntry[]> {
  const targetCheck = validateGitHubRepoTarget({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
  });
  if (!targetCheck.valid) {
    throw new Error(targetCheck.error || "Invalid repository target.");
  }

  const cleanFolder = sanitizeRepoStoragePath(params.folder, "") || "";
  const branch = params.branch.trim() || "main";
  const pathPart = cleanFolder ? `/${encodeContentsPath(cleanFolder)}` : "";
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(
    params.owner.trim()
  )}/${encodeURIComponent(params.repo.trim())}/contents${pathPart}?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Failed to list repository folder (${res.status})`);
  }

  const items = await res.json();
  if (!Array.isArray(items)) return [];

  return items.map((entry: Record<string, unknown>) => ({
    name: String(entry.name || ""),
    path: String(entry.path || ""),
    sha: String(entry.sha || ""),
    size: Number(entry.size || 0),
    downloadUrl: String(
      entry.download_url ||
        buildGitHubRawUrl(params.owner, params.repo, branch, String(entry.path || ""))
    ),
    htmlUrl: String(entry.html_url || ""),
    type: entry.type === "dir" ? "dir" : "file",
  }));
}

export async function deleteFileFromGitHubRepo(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  sha: string;
  commitMessage?: string;
}): Promise<void> {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(
    params.owner.trim()
  )}/${encodeURIComponent(params.repo.trim())}/contents/${encodeContentsPath(params.path)}`;
  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: params.commitMessage?.trim() || `Remove ${params.path} via Hub Studio`,
      sha: params.sha,
      branch: params.branch.trim() || "main",
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete file (${res.status})`);
  }
}

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
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  const fetchFn = params.fetchImpl || fetch;
  const url = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(
    params.repo
  )}/contents/${encodeContentsPath(params.path)}?ref=${encodeURIComponent(params.branch)}`;
  const res = await fetchFn(url, {
    cache: "no-store",
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
  fetchImpl?: typeof fetch;
}): Promise<GitHubUploadResult> {
  const fetchFn = params.fetchImpl || fetch;
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
  const owner = params.owner.trim();
  const repo = params.repo.trim();
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/contents/${encodeContentsPath(cleanPath)}`;

  const executePut = async (sha: string | null) =>
    fetchFn(endpoint, {
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
        ...(sha ? { sha } : {}),
      }),
    });

  const existingSha = await getGitHubFileSha({
    token: params.token,
    owner,
    repo,
    branch,
    path: cleanPath,
    fetchImpl: fetchFn,
  });

  if (existingSha && !params.allowOverwrite) {
    throw new Error(
      `File "${cleanPath}" already exists in the repository. Enable overwrite confirmation to replace it.`
    );
  }

  let res = await executePut(existingSha);

  // Automatic single retry if SHA changed concurrently or was stale (HTTP 409 Conflict)
  if (res.status === 409 && params.allowOverwrite !== false) {
    const freshSha = await getGitHubFileSha({
      token: params.token,
      owner,
      repo,
      branch,
      path: cleanPath,
      fetchImpl: fetchFn,
    });
    res = await executePut(freshSha);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = (errBody as { message?: string }).message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`GitHub authorization error (${res.status}): verify token has "Contents: Read & write" for ${owner}/${repo}.`);
    }
    throw new Error(`GitHub upload error (${res.status}): ${msg}`);
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
      `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/blob/${encodeURIComponent(branch)}/${finalPath}`,
    rawUrl:
      result.content?.download_url ||
      buildGitHubRawUrl(owner, repo, branch, finalPath),
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
    cache: "no-store",
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

export function splitRepoPath(repoPath: string): { folder: string; fileName: string } | null {
  const normalized = sanitizeRepoStoragePath("", repoPath);
  if (!normalized) return null;
  const parts = normalized.split("/");
  const fileName = parts.pop();
  if (!fileName) return null;
  return {
    folder: parts.join("/"),
    fileName,
  };
}

export function base64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export interface LocalSyncInput {
  datasetPath: string;
  repoPath: string;
  payload: unknown;
}

export interface LocalSyncFileOutcome {
  datasetPath: string;
  repoPath: string;
  ok: boolean;
  htmlUrl?: string;
  sha?: string;
  error?: string;
}

export async function syncLocalDraftsToGitHubRepo(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  drafts: LocalSyncInput[];
  commitMessagePrefix?: string;
  allowOverwrite?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<{ synced: LocalSyncFileOutcome[]; failed: LocalSyncFileOutcome[] }> {
  const synced: LocalSyncFileOutcome[] = [];
  const failed: LocalSyncFileOutcome[] = [];
  const prefix = params.commitMessagePrefix?.trim() || "Sync hub changes";

  for (const draft of params.drafts) {
    const split = splitRepoPath(draft.repoPath);
    if (!split) {
      failed.push({
        datasetPath: draft.datasetPath,
        repoPath: draft.repoPath,
        ok: false,
        error: "Invalid target repository path.",
      });
      continue;
    }
    try {
      const jsonText = `${JSON.stringify(draft.payload, null, 2)}\n`;
      const res = await uploadFileToGitHubRepo({
        token: params.token,
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        folder: split.folder,
        fileName: split.fileName,
        contentBase64: utf8ToBase64(jsonText),
        commitMessage: `${prefix}: ${split.fileName}`,
        allowOverwrite: params.allowOverwrite ?? true,
        fetchImpl: params.fetchImpl,
      });
      synced.push({
        datasetPath: draft.datasetPath,
        repoPath: res.path,
        ok: true,
        htmlUrl: res.htmlUrl,
        sha: res.sha,
      });
    } catch (err) {
      failed.push({
        datasetPath: draft.datasetPath,
        repoPath: draft.repoPath,
        ok: false,
        error: err instanceof Error ? err.message : "Sync failed.",
      });
    }
  }

  return { synced, failed };
}

export function resolveGitHubSyncTargetFromSettings(params: {
  storageOwner?: string;
  username?: string;
  profileUsername?: string;
  storageRepo?: string;
  storageBranch?: string;
}): GitHubRepoTarget {
  const owner =
    params.storageOwner?.trim() ||
    params.username?.trim() ||
    params.profileUsername?.trim() ||
    "AbdoKamelAyed";
  const repo = params.storageRepo?.trim() || `${owner}.github.io`;
  const branch = params.storageBranch?.trim() || "main";
  return { owner, repo, branch };
}

export async function fetchJsonFromGitHubRepo<T = unknown>(params: {
  token?: string;
  owner: string;
  repo: string;
  branch: string;
  repoPath: string;
}): Promise<{ data: T; sha: string }> {
  const targetCheck = validateGitHubRepoTarget({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
  });
  if (!targetCheck.valid) {
    throw new Error(targetCheck.error || "Invalid repository target.");
  }

  const cleanPath = sanitizeRepoStoragePath("", params.repoPath);
  if (!cleanPath) {
    throw new Error("Invalid repository file path.");
  }

  const branch = params.branch.trim() || "main";
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(
    params.owner.trim()
  )}/${encodeURIComponent(params.repo.trim())}/contents/${encodeContentsPath(cleanPath)}?ref=${encodeURIComponent(
    branch
  )}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (params.token?.trim()) {
    headers.Authorization = `Bearer ${params.token.trim()}`;
  }

  const res = await fetch(endpoint, { cache: "no-store", headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${cleanPath} from GitHub (${res.status})`);
  }
  const body = (await res.json()) as { content?: string; sha?: string };
  if (!body.content) {
    throw new Error(`Repository file ${cleanPath} has no inline content payload.`);
  }
  const jsonText = base64ToUtf8(body.content);
  return {
    data: JSON.parse(jsonText) as T,
    sha: body.sha || "",
  };
}


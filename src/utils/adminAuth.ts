export interface AdminCredentialRecord {
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSessionRecord {
  username: string;
  loggedInAt: string;
  expiresAt: string;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  target: string;
  actor: string;
  timestamp: string;
}

const CREDENTIAL_KEY = "abdo_hub_admin_cred_v1";
const SESSION_KEY = "abdo_hub_admin_session_v1";
const AUDIT_KEY = "abdo_hub_admin_audit_v1";

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store: Storage, key: string, val: string): void {
  try {
    store.setItem(key, val);
  } catch {
    // Ignore restricted storage
  }
}

function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // Ignore restricted storage
  }
}

export function generateSaltHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassphrase(passphrase: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${passphrase}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getStoredCredential(): AdminCredentialRecord | null {
  const raw = safeGet(localStorage, CREDENTIAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminCredentialRecord;
    if (parsed && parsed.username && parsed.salt && parsed.hash) return parsed;
  } catch {
    return null;
  }
  return null;
}

export async function setupAdminCredential(
  username: string,
  passphrase: string,
  durationHours = 8
): Promise<AdminSessionRecord> {
  const cleanUser = username.trim() || "AbdoKamelAyed";
  const salt = generateSaltHex();
  const hash = await hashPassphrase(passphrase, salt);
  const now = new Date();
  const cred: AdminCredentialRecord = {
    username: cleanUser,
    salt,
    hash,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  safeSet(localStorage, CREDENTIAL_KEY, JSON.stringify(cred));
  return createAdminSession(cleanUser, durationHours);
}

export async function verifyAdminLogin(
  username: string,
  passphrase: string,
  durationHours = 8
): Promise<{ ok: boolean; session?: AdminSessionRecord; error?: string }> {
  const cred = getStoredCredential();
  if (!cred) {
    return { ok: false, error: "No admin credentials configured yet." };
  }
  if (username.trim().toLowerCase() !== cred.username.toLowerCase()) {
    return { ok: false, error: "Invalid administrator username or passphrase." };
  }
  const candidate = await hashPassphrase(passphrase, cred.salt);
  if (candidate !== cred.hash) {
    return { ok: false, error: "Invalid administrator username or passphrase." };
  }
  const session = createAdminSession(cred.username, durationHours);
  return { ok: true, session };
}

export function createAdminSession(username: string, durationHours = 8): AdminSessionRecord {
  const now = Date.now();
  const expires = new Date(now + Math.max(1, durationHours) * 3600 * 1000);
  const session: AdminSessionRecord = {
    username,
    loggedInAt: new Date(now).toISOString(),
    expiresAt: expires.toISOString(),
  };
  safeSet(sessionStorage, SESSION_KEY, JSON.stringify(session));
  safeSet(localStorage, SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getActiveAdminSession(nowMs = Date.now()): AdminSessionRecord | null {
  const raw = safeGet(sessionStorage, SESSION_KEY) || safeGet(localStorage, SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSessionRecord;
    if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= nowMs) {
      clearAdminSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  safeRemove(sessionStorage, SESSION_KEY);
  safeRemove(localStorage, SESSION_KEY);
}

export function resetAdminCredential(): void {
  clearAdminSession();
  safeRemove(localStorage, CREDENTIAL_KEY);
}

export function getAuditLog(): AdminAuditEntry[] {
  const raw = safeGet(localStorage, AUDIT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminAuditEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendAuditEntry(action: string, target: string, actor: string): AdminAuditEntry[] {
  const current = getAuditLog();
  const entry: AdminAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    target,
    actor,
    timestamp: new Date().toISOString(),
  };
  const next = [entry, ...current].slice(0, 30);
  safeSet(localStorage, AUDIT_KEY, JSON.stringify(next));
  return next;
}

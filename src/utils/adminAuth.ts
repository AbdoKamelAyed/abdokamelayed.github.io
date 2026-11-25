export type AdminRole = "Owner" | "Managing Editor" | "Author";

export interface AdminAccountRecord {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  avatarUrl?: string;
  bio?: string;
  salt: string;
  hash: string;
  iterations: number;
  algorithm: "PBKDF2-SHA-256" | "SHA-256";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AdminCredentialRecord {
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSessionRecord {
  accountId: string;
  username: string;
  displayName: string;
  role: AdminRole;
  avatarUrl?: string;
  sessionToken: string;
  loggedInAt: string;
  lastActivityAt: string;
  expiresAt: string;
  inactivityLimitMinutes: number;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  target: string;
  actor: string;
  timestamp: string;
}

export interface LoginAttemptState {
  failedCount: number;
  lockedUntilMs: number;
}

const LEGACY_CREDENTIAL_KEY = "abdo_hub_admin_cred_v1";
const ACCOUNTS_KEY = "abdo_hub_admin_accounts_v2";
const SESSION_KEY = "abdo_hub_admin_session_v2";
const ATTEMPTS_KEY = "abdo_hub_admin_attempts_v2";
const AUDIT_KEY = "abdo_hub_admin_audit_v1";

export const PBKDF2_ITERATIONS = 120_000;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 60_000;

function safeGet(store: Storage | undefined, key: string): string | null {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(store: Storage | undefined, key: string, val: string): void {
  try {
    store?.setItem(key, val);
  } catch {
    // Ignore restricted storage
  }
}

function safeRemove(store: Storage | undefined, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    // Ignore restricted storage
  }
}

function memSessionStore(): Storage | undefined {
  return typeof globalThis.sessionStorage !== "undefined" ? globalThis.sessionStorage : undefined;
}

function memLocalStore(): Storage | undefined {
  return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : undefined;
}

export function generateSaltHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassphrase(passphrase: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${passphrase}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassphrasePbkdf2(
  passphrase: string,
  salt: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassphraseDigest(
  passphrase: string,
  account: Pick<AdminAccountRecord, "salt" | "hash" | "iterations" | "algorithm">
): Promise<boolean> {
  if (account.algorithm === "PBKDF2-SHA-256") {
    const candidate = await hashPassphrasePbkdf2(
      passphrase,
      account.salt,
      account.iterations || PBKDF2_ITERATIONS
    );
    return constantTimeEqual(candidate, account.hash);
  }
  const legacyCandidate = await hashPassphrase(passphrase, account.salt);
  return constantTimeEqual(legacyCandidate, account.hash);
}

export interface PassphraseStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  valid: boolean;
  label: "Too short" | "Weak" | "Fair" | "Strong" | "Very strong";
  issues: string[];
}

export function evaluatePassphraseStrength(passphrase: string): PassphraseStrengthResult {
  const issues: string[] = [];
  if (passphrase.length < 8) {
    issues.push("Must be at least 8 characters");
    return { score: 0, valid: false, label: "Too short", issues };
  }
  let checks = 0;
  if (/[a-z]/.test(passphrase)) checks += 1;
  if (/[A-Z]/.test(passphrase)) checks += 1;
  if (/[0-9]/.test(passphrase)) checks += 1;
  if (/[^A-Za-z0-9]/.test(passphrase)) checks += 1;

  if (passphrase.length >= 12) checks = Math.min(4, checks + 1);
  if (checks < 2) {
    issues.push("Mix letters with numbers or symbols");
  }
  const score = Math.max(1, Math.min(4, checks)) as 1 | 2 | 3 | 4;
  const labels: Record<1 | 2 | 3 | 4, PassphraseStrengthResult["label"]> = {
    1: "Weak",
    2: "Fair",
    3: "Strong",
    4: "Very strong",
  };
  return {
    score,
    valid: score >= 2,
    label: labels[score],
    issues,
  };
}

function migrateLegacyCredential(): AdminAccountRecord[] {
  const raw = safeGet(memLocalStore(), LEGACY_CREDENTIAL_KEY);
  if (!raw) return [];
  try {
    const legacy = JSON.parse(raw) as AdminCredentialRecord;
    if (!legacy?.username || !legacy?.salt || !legacy?.hash) return [];
    const migrated: AdminAccountRecord = {
      id: `admin-${legacy.username.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      username: legacy.username,
      displayName: legacy.username,
      role: "Owner",
      salt: legacy.salt,
      hash: legacy.hash,
      iterations: 1,
      algorithm: "SHA-256",
      createdAt: legacy.createdAt || new Date().toISOString(),
      updatedAt: legacy.updatedAt || new Date().toISOString(),
    };
    safeSet(memLocalStore(), ACCOUNTS_KEY, JSON.stringify([migrated]));
    return [migrated];
  } catch {
    return [];
  }
}

export function listAdminAccounts(): AdminAccountRecord[] {
  const raw = safeGet(memLocalStore(), ACCOUNTS_KEY);
  if (!raw) return migrateLegacyCredential();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AdminAccountRecord[];
  } catch {
    return [];
  }
  return [];
}

function saveAdminAccounts(accounts: AdminAccountRecord[]): void {
  safeSet(memLocalStore(), ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getStoredCredential(): AdminCredentialRecord | null {
  const accounts = listAdminAccounts();
  if (accounts.length === 0) return null;
  const first = accounts[0];
  return {
    username: first.username,
    salt: first.salt,
    hash: first.hash,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
  };
}

export function getLoginLockState(nowMs = Date.now()): {
  isLocked: boolean;
  remainingSeconds: number;
  failedCount: number;
} {
  const raw = safeGet(memLocalStore(), ATTEMPTS_KEY);
  if (!raw) return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
  try {
    const state = JSON.parse(raw) as LoginAttemptState;
    if (state.lockedUntilMs && state.lockedUntilMs > nowMs) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((state.lockedUntilMs - nowMs) / 1000),
        failedCount: state.failedCount || MAX_FAILED_ATTEMPTS,
      };
    }
    if (state.lockedUntilMs && state.lockedUntilMs <= nowMs) {
      safeRemove(memLocalStore(), ATTEMPTS_KEY);
      return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
    }
    return { isLocked: false, remainingSeconds: 0, failedCount: state.failedCount || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedCount: 0 };
  }
}

function recordFailedAttempt(nowMs = Date.now()): { locked: boolean; remainingSeconds: number; attemptsLeft: number } {
  const current = getLoginLockState(nowMs);
  const nextCount = current.failedCount + 1;
  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntilMs = nowMs + LOCKOUT_DURATION_MS;
    safeSet(memLocalStore(), ATTEMPTS_KEY, JSON.stringify({ failedCount: nextCount, lockedUntilMs }));
    return { locked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000), attemptsLeft: 0 };
  }
  safeSet(memLocalStore(), ATTEMPTS_KEY, JSON.stringify({ failedCount: nextCount, lockedUntilMs: 0 }));
  return { locked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS - nextCount };
}

function clearLoginAttempts(): void {
  safeRemove(memLocalStore(), ATTEMPTS_KEY);
}

export async function registerAdminAccount(opts: {
  username: string;
  displayName?: string;
  passphrase: string;
  role?: AdminRole;
  avatarUrl?: string;
  bio?: string;
  durationHours?: number;
  overwriteExisting?: boolean;
}): Promise<{ ok: boolean; session?: AdminSessionRecord; account?: AdminAccountRecord; error?: string }> {
  const cleanUser = opts.username.trim();
  if (!cleanUser || cleanUser.length < 2) {
    return { ok: false, error: "Username must be at least 2 characters." };
  }
  const strength = evaluatePassphraseStrength(opts.passphrase);
  if (!strength.valid) {
    return { ok: false, error: strength.issues[0] || "Choose a stronger passphrase (min 8 chars + mix)." };
  }

  const accounts = listAdminAccounts();
  const existingIdx = accounts.findIndex(
    (a) => a.username.toLowerCase() === cleanUser.toLowerCase()
  );
  if (existingIdx !== -1 && !opts.overwriteExisting) {
    return { ok: false, error: "An admin account with this username already exists." };
  }

  const salt = generateSaltHex(16);
  const hash = await hashPassphrasePbkdf2(opts.passphrase, salt, PBKDF2_ITERATIONS);
  const nowIso = new Date().toISOString();

  const nextAccount: AdminAccountRecord = {
    id:
      existingIdx !== -1
        ? accounts[existingIdx].id
        : `admin-${cleanUser.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${generateSaltHex(3)}`,
    username: cleanUser,
    displayName: opts.displayName?.trim() || cleanUser,
    role: opts.role || (accounts.length === 0 ? "Owner" : "Managing Editor"),
    avatarUrl: opts.avatarUrl?.trim() || undefined,
    bio: opts.bio?.trim() || undefined,
    salt,
    hash,
    iterations: PBKDF2_ITERATIONS,
    algorithm: "PBKDF2-SHA-256",
    createdAt: existingIdx !== -1 ? accounts[existingIdx].createdAt : nowIso,
    updatedAt: nowIso,
    lastLoginAt: nowIso,
  };

  const nextAccounts =
    existingIdx !== -1
      ? accounts.map((a, i) => (i === existingIdx ? nextAccount : a))
      : [...accounts, nextAccount];

  saveAdminAccounts(nextAccounts);
  clearLoginAttempts();
  const session = createAdminSession(nextAccount, opts.durationHours || 8);
  return { ok: true, session, account: nextAccount };
}

export async function setupAdminCredential(
  username: string,
  passphrase: string,
  durationHours = 8
): Promise<AdminSessionRecord> {
  const cleanUser = username.trim() || "AbdoKamelAyed";
  const salt = generateSaltHex(16);
  const hash = await hashPassphrasePbkdf2(passphrase, salt, PBKDF2_ITERATIONS);
  const nowIso = new Date().toISOString();
  const accounts = listAdminAccounts();
  const idx = accounts.findIndex((a) => a.username.toLowerCase() === cleanUser.toLowerCase());
  const nextAccount: AdminAccountRecord = {
    id: idx !== -1 ? accounts[idx].id : `admin-${cleanUser.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    username: cleanUser,
    displayName: idx !== -1 ? accounts[idx].displayName : cleanUser,
    role: idx !== -1 ? accounts[idx].role : "Owner",
    avatarUrl: idx !== -1 ? accounts[idx].avatarUrl : undefined,
    salt,
    hash,
    iterations: PBKDF2_ITERATIONS,
    algorithm: "PBKDF2-SHA-256",
    createdAt: idx !== -1 ? accounts[idx].createdAt : nowIso,
    updatedAt: nowIso,
    lastLoginAt: nowIso,
  };
  const updated = idx !== -1 ? accounts.map((a, i) => (i === idx ? nextAccount : a)) : [...accounts, nextAccount];
  saveAdminAccounts(updated);
  return createAdminSession(nextAccount, durationHours);
}

export async function verifyAdminLogin(
  username: string,
  passphrase: string,
  durationHours = 8
): Promise<{
  ok: boolean;
  session?: AdminSessionRecord;
  error?: string;
  lockedSeconds?: number;
  attemptsLeft?: number;
}> {
  const lock = getLoginLockState();
  if (lock.isLocked) {
    return {
      ok: false,
      lockedSeconds: lock.remainingSeconds,
      error: `Too many failed attempts. Try again in ${lock.remainingSeconds}s.`,
    };
  }

  const accounts = listAdminAccounts();
  if (accounts.length === 0) {
    return { ok: false, error: "No admin accounts registered yet. Create one below." };
  }

  const match = accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!match) {
    const attempt = recordFailedAttempt();
    return {
      ok: false,
      lockedSeconds: attempt.locked ? attempt.remainingSeconds : undefined,
      attemptsLeft: attempt.attemptsLeft,
      error: attempt.locked
        ? `Too many failed attempts. Locked for ${attempt.remainingSeconds}s.`
        : "Invalid administrator username or passphrase.",
    };
  }

  const valid = await verifyPassphraseDigest(passphrase, match);
  if (!valid) {
    const attempt = recordFailedAttempt();
    return {
      ok: false,
      lockedSeconds: attempt.locked ? attempt.remainingSeconds : undefined,
      attemptsLeft: attempt.attemptsLeft,
      error: attempt.locked
        ? `Too many failed attempts. Locked for ${attempt.remainingSeconds}s.`
        : "Invalid administrator username or passphrase.",
    };
  }

  // Transparently upgrade legacy SHA-256 records to PBKDF2-SHA-256 on successful login
  if (match.algorithm !== "PBKDF2-SHA-256") {
    const freshSalt = generateSaltHex(16);
    const freshHash = await hashPassphrasePbkdf2(passphrase, freshSalt, PBKDF2_ITERATIONS);
    const upgraded: AdminAccountRecord = {
      ...match,
      salt: freshSalt,
      hash: freshHash,
      iterations: PBKDF2_ITERATIONS,
      algorithm: "PBKDF2-SHA-256",
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    saveAdminAccounts(accounts.map((a) => (a.id === match.id ? upgraded : a)));
  } else {
    const touched = { ...match, lastLoginAt: new Date().toISOString() };
    saveAdminAccounts(accounts.map((a) => (a.id === match.id ? touched : a)));
  }

  clearLoginAttempts();
  const session = createAdminSession(match, durationHours);
  return { ok: true, session };
}

export function createAdminSession(
  account: Pick<AdminAccountRecord, "id" | "username" | "displayName" | "role" | "avatarUrl"> | string,
  durationHours = 8,
  inactivityLimitMinutes = 45
): AdminSessionRecord {
  const now = Date.now();
  const expires = new Date(now + Math.max(1, durationHours) * 3600 * 1000);
  const accObj =
    typeof account === "string"
      ? { id: `admin-${account}`, username: account, displayName: account, role: "Owner" as AdminRole }
      : account;

  const session: AdminSessionRecord = {
    accountId: accObj.id,
    username: accObj.username,
    displayName: accObj.displayName || accObj.username,
    role: accObj.role || "Managing Editor",
    avatarUrl: accObj.avatarUrl,
    sessionToken: generateSaltHex(24),
    loggedInAt: new Date(now).toISOString(),
    lastActivityAt: new Date(now).toISOString(),
    expiresAt: expires.toISOString(),
    inactivityLimitMinutes,
  };
  // Store active session strictly in sessionStorage so tokens never persist across browser restarts
  safeSet(memSessionStore(), SESSION_KEY, JSON.stringify(session));
  safeRemove(memLocalStore(), "abdo_hub_admin_session_v1");
  return session;
}

export function getActiveAdminSession(nowMs = Date.now()): AdminSessionRecord | null {
  const raw = safeGet(memSessionStore(), SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSessionRecord;
    if (!parsed.sessionToken || !parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= nowMs) {
      clearAdminSession();
      return null;
    }
    const idleLimitMs = (parsed.inactivityLimitMinutes || 45) * 60 * 1000;
    const lastAct = new Date(parsed.lastActivityAt || parsed.loggedInAt).getTime();
    if (nowMs - lastAct > idleLimitMs) {
      clearAdminSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function touchAdminSession(nowMs = Date.now()): AdminSessionRecord | null {
  const current = getActiveAdminSession(nowMs);
  if (!current) return null;
  const updated: AdminSessionRecord = {
    ...current,
    lastActivityAt: new Date(nowMs).toISOString(),
  };
  safeSet(memSessionStore(), SESSION_KEY, JSON.stringify(updated));
  return updated;
}

export function clearAdminSession(): void {
  safeRemove(memSessionStore(), SESSION_KEY);
  safeRemove(memSessionStore(), "abdo_hub_admin_session_v1");
  safeRemove(memLocalStore(), "abdo_hub_admin_session_v1");
}

export function removeAdminAccount(accountId: string): AdminAccountRecord[] {
  const next = listAdminAccounts().filter((a) => a.id !== accountId);
  saveAdminAccounts(next);
  return next;
}

export function resetAdminCredential(): void {
  clearAdminSession();
  clearLoginAttempts();
  safeRemove(memLocalStore(), ACCOUNTS_KEY);
  safeRemove(memLocalStore(), LEGACY_CREDENTIAL_KEY);
}

export function getAuditLog(): AdminAuditEntry[] {
  const raw = safeGet(memLocalStore(), AUDIT_KEY);
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
  const next = [entry, ...current].slice(0, 40);
  safeSet(memLocalStore(), AUDIT_KEY, JSON.stringify(next));
  return next;
}

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import type { Lang } from "../../types/hub";
import {
  evaluatePassphraseStrength,
  getLoginLockState,
  listAdminAccounts,
  registerAdminAccount,
  resetAdminCredential,
  verifyAdminLogin,
  type AdminAccountRecord,
  type AdminRole,
  type AdminSessionRecord,
} from "../../utils/adminAuth";
import { L } from "../../utils/i18n";
import { AuthorAvatar, DEFAULT_AUTHOR_AVATAR } from "../AuthorProfileCard";

export const AdminLoginGate: React.FC<{
  lang: Lang;
  defaultUsername: string;
  defaultAvatarUrl?: string;
  onAuthenticated: (session: AdminSessionRecord) => void;
}> = ({ lang, defaultUsername, defaultAvatarUrl, onAuthenticated }) => {
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>(() => listAdminAccounts());
  const [mode, setMode] = useState<"signin" | "create">(() =>
    listAdminAccounts().length > 0 ? "signin" : "create"
  );

  const [username, setUsername] = useState(
    () => listAdminAccounts()[0]?.username || defaultUsername || "AbdoKamelAyed"
  );
  const [displayName, setDisplayName] = useState(defaultUsername || "Abdo Kamel");
  const [role, setRole] = useState<AdminRole>(() =>
    listAdminAccounts().length === 0 ? "Owner" : "Managing Editor"
  );
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl || DEFAULT_AUTHOR_AVATAR);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [durationHours, setDurationHours] = useState<number>(8);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [lockSeconds, setLockSeconds] = useState<number>(() => getLoginLockState().remainingSeconds);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      const next = getLoginLockState().remainingSeconds;
      setLockSeconds(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const strength = evaluatePassphraseStrength(passphrase);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || username.trim().length < 2) {
      setError(L("Enter an administrator username (at least 2 characters).", "أدخل اسم مستخدم لا يقل عن حرفين.", lang));
      return;
    }

    if (mode === "create") {
      if (!strength.valid) {
        setError(
          L(
            "Passphrase must be at least 8 characters combining letters with numbers or symbols.",
            "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل مع أرقام أو رموز.",
            lang
          )
        );
        return;
      }
      if (passphrase !== confirmPass) {
        setError(L("Passphrases do not match.", "كلمتا المرور غير متطابقتين.", lang));
        return;
      }
    } else if (!passphrase) {
      setError(L("Enter your administrator passphrase.", "أدخل كلمة مرور المسؤول.", lang));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await registerAdminAccount({
          username,
          displayName: displayName.trim() || username.trim(),
          passphrase,
          role,
          avatarUrl,
          durationHours,
        });
        if (!res.ok || !res.session) {
          setError(res.error || L("Could not create admin account.", "تعذر إنشاء حساب المسؤول.", lang));
          setSubmitting(false);
          return;
        }
        setAccounts(listAdminAccounts());
        onAuthenticated(res.session);
      } else {
        const res = await verifyAdminLogin(username, passphrase, durationHours);
        if (!res.ok || !res.session) {
          if (res.lockedSeconds) setLockSeconds(res.lockedSeconds);
          setError(
            res.lockedSeconds
              ? L(
                  `Too many failed attempts. Sign-in locked for ${res.lockedSeconds}s.`,
                  `محاولات خاطئة كثيرة. تم القفل لمدة ${res.lockedSeconds} ثانية.`,
                  lang
                )
              : res.attemptsLeft !== undefined
              ? `${L("Invalid username or passphrase.", "اسم المستخدم أو كلمة المرور غير صحيحة.", lang)} (${res.attemptsLeft} ${L("attempts left", "محاولات متبقية", lang)})`
              : L("Invalid username or passphrase.", "اسم المستخدم أو كلمة المرور غير صحيحة.", lang)
          );
          setSubmitting(false);
          return;
        }
        onAuthenticated(res.session);
      }
    } catch {
      setError(L("Authentication failed in this browser context.", "تعذر التحقق من الهوية في هذا المتصفح.", lang));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[72vh] flex items-center justify-center py-10">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--hub-border)] hub-surface p-7 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{L("Restricted Admin Portal · PBKDF2-SHA-256", "بوابة الإدارة المحمية · PBKDF2", lang)}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {mode === "signin"
              ? L("Administrator Sign In", "تسجيل دخول المسؤول", lang)
              : L("Create Admin Account", "إنشاء حساب مسؤول جديد", lang)}
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)]">
            {mode === "signin"
              ? L(
                  "Sign in with your registered local admin account. Sessions auto-lock on browser close or inactivity.",
                  "سجّل الدخول بحساب المسؤول المسجل. تُغلق الجلسات تلقائياً عند إغلاق المتصفح أو الخمول.",
                  lang
                )
              : L(
                  "Anyone holding this direct admin link can register an operator account protected with salted PBKDF2-SHA-256 derivation.",
                  "يمكن لمن يملك رابط الإدارة المباشر إنشاء حساب مسؤول مشفر محلياً بخوارزمية PBKDF2-SHA-256.",
                  lang
                )}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-[var(--hub-border)] hub-subtle">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            disabled={accounts.length === 0}
            className={`py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap ${
              mode === "signin" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{L("Sign In", "تسجيل الدخول", lang)} ({accounts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError("");
              if (accounts.length > 0 && username === accounts[0].username) {
                setUsername("");
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              mode === "create" ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]" : "text-[var(--hub-text-muted)]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{L("Create Admin Account", "إنشاء حساب مسؤول", lang)}</span>
          </button>
        </div>

        {mode === "signin" && accounts.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--hub-text-muted)] block">
              {L("Registered Operators on This Browser", "الحسابات المسجلة على هذا المتصفح", lang)}
            </span>
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => {
                const selected = acc.username.toLowerCase() === username.trim().toLowerCase();
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setUsername(acc.username)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs inline-flex items-center gap-2 cursor-pointer ${
                      selected
                        ? "border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
                    }`}
                  >
                    <AuthorAvatar src={acc.avatarUrl} name={acc.displayName} sizeClass="w-5 h-5" />
                    <span>@{acc.username}</span>
                    <span className="text-[10px] opacity-75">· {acc.role}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {lockSeconds > 0 && (
          <div
            role="status"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 font-mono tabular-nums"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {L("Security cooldown active:", "الحماية نشطة ضد المحاولات:", lang)} {lockSeconds}s
            </span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={mode === "create" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-1.5"}>
            <div className="space-y-1.5">
              <label htmlFor="admin-user" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                {L("Admin Username", "اسم مستخدم المسؤول", lang)}
              </label>
              <input
                id="admin-user"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator-handle"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            </div>

            {mode === "create" && (
              <div className="space-y-1.5">
                <label htmlFor="admin-display-name" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Display Name", "الاسم الظاهر", lang)}
                </label>
                <input
                  id="admin-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Abdo Kamel"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
            )}
          </div>

          {mode === "create" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="admin-role" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Operator Role", "الدور الإداري", lang)}
                </label>
                <select
                  id="admin-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                >
                  <option value="Owner">{L("Owner (Full Hub Admin)", "مالك المنصة", lang)}</option>
                  <option value="Managing Editor">{L("Managing Editor", "رئيس تحرير", lang)}</option>
                  <option value="Author">{L("Author & Publisher", "كاتب وناشر", lang)}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-avatar-url" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Author Avatar URL", "رابط صورة الحساب", lang)}
                </label>
                <input
                  id="admin-avatar-url"
                  type="text"
                  dir="ltr"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-pass" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
              {L("Passphrase", "كلمة المرور", lang)}
            </label>
            <div className="relative">
              <input
                id="admin-pass"
                type={showPass ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pe-10 px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? L("Hide passphrase", "إخفاء كلمة المرور", lang) : L("Show passphrase", "إظهار كلمة المرور", lang)}
                className="absolute inset-y-0 end-0 px-3 inline-flex items-center text-[var(--hub-text-muted)] hover:text-[var(--hub-text)] cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {mode === "create" && passphrase.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full ${
                        strength.score >= step
                          ? strength.score >= 3
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                          : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[11px] font-mono text-[var(--hub-text-muted)]">
                  {L("Strength:", "القوة:", lang)} {strength.label}
                  {strength.issues[0] ? ` · ${strength.issues[0]}` : ""}
                </div>
              </div>
            )}
          </div>

          {mode === "create" && (
            <div className="space-y-1.5">
              <label htmlFor="admin-pass-confirm" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                {L("Confirm Passphrase", "تأكيد كلمة المرور", lang)}
              </label>
              <input
                id="admin-pass-confirm"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-session-ttl" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
              {L("Session Lifetime (sessionStorage only)", "مدة الجلسة المؤمنة", lang)}
            </label>
            <select
              id="admin-session-ttl"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              <option value={1}>{L("1 hour (strict)", "ساعة واحدة", lang)}</option>
              <option value={8}>{L("8 hours (workday)", "8 ساعات", lang)}</option>
              <option value={24}>{L("24 hours", "24 ساعة", lang)}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting || (mode === "signin" && lockSeconds > 0)}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-55 cursor-pointer"
          >
            {mode === "signin" ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            <span>
              {submitting
                ? L("Deriving PBKDF2 key...", "جارٍ التحقق المشفر...", lang)
                : mode === "signin"
                ? L("Unlock Admin Workspace", "دخول مساحة الإدارة", lang)
                : L("Create Admin Account & Enter", "إنشاء الحساب والدخول", lang)}
            </span>
          </button>
        </form>

        {accounts.length > 0 && (
          <div className="pt-4 border-t border-[var(--hub-border)] text-xs text-[var(--hub-text-muted)] flex items-center justify-between gap-3">
            {!confirmReset ? (
              <>
                <span>{L("Locked out locally?", "نسيت بيانات الدخول المحلية؟", lang)}</span>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                >
                  {L("Reset Local Accounts", "مسح الحسابات المحلية", lang)}
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between gap-2">
                <span className="text-red-600 dark:text-red-400">
                  {L("Clear all local admin credentials?", "تأكيد مسح حسابات المتصفح؟", lang)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      resetAdminCredential();
                      setAccounts([]);
                      setMode("create");
                      setLockSeconds(0);
                      setPassphrase("");
                      setConfirmPass("");
                      setError("");
                      setConfirmReset(false);
                    }}
                    className="px-2.5 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                  >
                    {L("Confirm", "تأكيد", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 rounded border border-[var(--hub-border)] cursor-pointer"
                  >
                    {L("Cancel", "إلغاء", lang)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

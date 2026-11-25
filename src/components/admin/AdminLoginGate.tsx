import React, { useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import type { Lang } from "../../types/hub";
import {
  getStoredCredential,
  resetAdminCredential,
  setupAdminCredential,
  verifyAdminLogin,
  type AdminSessionRecord,
} from "../../utils/adminAuth";
import { L } from "../../utils/i18n";

export const AdminLoginGate: React.FC<{
  lang: Lang;
  defaultUsername: string;
  onAuthenticated: (session: AdminSessionRecord) => void;
}> = ({ lang, defaultUsername, onAuthenticated }) => {
  const [hasCred, setHasCred] = useState<boolean>(() => Boolean(getStoredCredential()));
  const stored = getStoredCredential();
  const [username, setUsername] = useState(stored?.username || defaultUsername || "AbdoKamelAyed");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [durationHours, setDurationHours] = useState<number>(8);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError(L("Enter an administrator username.", "أدخل اسم مستخدم المسؤول.", lang));
      return;
    }
    if (passphrase.length < 4) {
      setError(L("Passphrase must be at least 4 characters.", "يجب أن تكون كلمة المرور 4 أحرف على الأقل.", lang));
      return;
    }

    setSubmitting(true);
    try {
      if (!hasCred) {
        if (passphrase !== confirmPass) {
          setError(L("Passphrases do not match.", "كلمتا المرور غير متطابقتين.", lang));
          setSubmitting(false);
          return;
        }
        const session = await setupAdminCredential(username, passphrase, durationHours);
        onAuthenticated(session);
      } else {
        const res = await verifyAdminLogin(username, passphrase, durationHours);
        if (!res.ok || !res.session) {
          setError(L("Invalid username or passphrase.", "اسم المستخدم أو كلمة المرور غير صحيحة.", lang));
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
    <div className="min-h-[70vh] flex items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--hub-border)] hub-surface p-7 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{L("Restricted Admin Portal", "بوابة الإدارة المحمية", lang)}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {hasCred
              ? L("Administrator Sign In", "تسجيل دخول المسؤول", lang)
              : L("Initialize Admin Vault", "تهيئة خزنة الإدارة", lang)}
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)]">
            {hasCred
              ? L(
                  "Enter your local salted passphrase to unlock the dashboard, rich editor, and site settings.",
                  "أدخل عبارة المرور الخاصة بك لفتح لوحة التحكم والمحرر المتقدم وإعدادات الموقع.",
                  lang
                )
              : L(
                  "First-time setup on this browser: create your private admin passphrase (stored locally as a salted SHA-256 hash).",
                  "الإعداد الأولي على هذا المتصفح: أنشئ عبارة مرور خاصة بك (تُحفظ محلياً بصيغة SHA-256 مشفرة).",
                  lang
                )}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-pass" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
              {L("Passphrase", "كلمة المرور", lang)}
            </label>
            <div className="relative">
              <input
                id="admin-pass"
                type={showPass ? "text" : "password"}
                autoComplete={hasCred ? "current-password" : "new-password"}
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="••••••••"
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
          </div>

          {!hasCred && (
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
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-session-ttl" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
              {L("Session Duration", "مدة الجلسة", lang)}
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
              <option value={168}>{L("7 days (trusted device)", "7 أيام", lang)}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {hasCred ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            <span>
              {submitting
                ? L("Verifying...", "جارٍ التحقق...", lang)
                : hasCred
                ? L("Unlock Admin Workspace", "دخول مساحة الإدارة", lang)
                : L("Create Vault & Enter", "إنشاء الخزنة والدخول", lang)}
            </span>
          </button>
        </form>

        {hasCred && (
          <div className="pt-4 border-t border-[var(--hub-border)] text-xs text-[var(--hub-text-muted)] flex items-center justify-between gap-3">
            {!confirmReset ? (
              <>
                <span>{L("Locked out on this browser?", "نسيت عبارة المرور المحلية؟", lang)}</span>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                >
                  {L("Reset Local Vault", "إعادة ضبط الخزنة", lang)}
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between gap-2">
                <span className="text-red-600 dark:text-red-400">
                  {L("Clear stored credential hash?", "مسح بيانات الدخول المحلية؟", lang)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      resetAdminCredential();
                      setHasCred(false);
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

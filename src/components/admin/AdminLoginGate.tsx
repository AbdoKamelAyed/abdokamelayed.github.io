import React, { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Lang } from "../../types/hub";
import {
  evaluatePassphraseStrength,
  getLoginLockState,
  listAdminAccounts,
  registerAdminAccount,
  verifyAdminLogin,
  type AdminSessionRecord,
} from "../../utils/adminAuth";
import { L } from "../../utils/i18n";
import { DEFAULT_AUTHOR_AVATAR } from "../AuthorProfileCard";

export const AdminLoginGate: React.FC<{
  lang: Lang;
  defaultUsername: string;
  defaultAvatarUrl?: string;
  onAuthenticated: (session: AdminSessionRecord) => void;
}> = ({ lang, defaultUsername, defaultAvatarUrl, onAuthenticated }) => {
  const [hasAccounts, setHasAccounts] = useState<boolean>(() => listAdminAccounts().length > 0);
  const isInitialSetup = !hasAccounts;

  const [username, setUsername] = useState(() =>
    isInitialSetup ? defaultUsername || "AbdoKamelAyed" : ""
  );
  const [displayName, setDisplayName] = useState(defaultUsername || "Abdo Kamel");
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl || DEFAULT_AUTHOR_AVATAR);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [durationHours, setDurationHours] = useState<number>(8);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

    if (isInitialSetup) {
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
      if (isInitialSetup) {
        const res = await registerAdminAccount({
          username,
          displayName: displayName.trim() || username.trim(),
          passphrase,
          role: "Owner",
          avatarUrl,
          durationHours,
        });
        if (!res.ok || !res.session) {
          setError(res.error || L("Could not initialize owner account.", "تعذر إعداد حساب المالك.", lang));
          setSubmitting(false);
          return;
        }
        setHasAccounts(true);
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
              ? `${L("Invalid credentials.", "بيانات الدخول غير صحيحة.", lang)} (${res.attemptsLeft} ${L("attempts left", "محاولات متبقية", lang)})`
              : L("Invalid credentials.", "بيانات الدخول غير صحيحة.", lang)
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
      <div
        data-testid="private-admin-gate"
        className="w-full max-w-lg rounded-2xl border border-[var(--hub-border)] hub-surface p-7 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {isInitialSetup
                ? L("Private Workspace · Initial Owner Setup", "مساحة خاصة · إعداد المالك الأول", lang)
                : L("Private Workspace · Authorized Access Only", "مساحة إدارة خاصة · للمصرح لهم فقط", lang)}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {isInitialSetup
              ? L("Initialize Workspace Owner", "تهيئة مالك مساحة الإدارة", lang)
              : L("Private Administrator Sign In", "دخول مساحة الإدارة الخاصة", lang)}
          </h1>
          <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
            {isInitialSetup
              ? L(
                  "No administrator exists in this browser yet. Create the primary Owner account once—public registration closes automatically afterward.",
                  "لا يوجد حساب مالك مهيأ بعد. أنشئ حساب المالك الرئيسي لمرة واحدة فقط؛ يُغلق التسجيل العام تلقائياً بعد ذلك.",
                  lang
                )
              : L(
                  "Public access and self-registration are disabled. Sign in with credentials provisioned by an Owner administrator.",
                  "الوصول العام والتسجيل الذاتي معطلان. سجّل الدخول باستخدام بيانات حساب مصرح به من قِبل المالك.",
                  lang
                )}
          </p>
        </div>

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
          <div className={isInitialSetup ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-1.5"}>
            <div className="space-y-1.5">
              <label htmlFor="admin-user" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                {L("Administrator Username", "اسم مستخدم المسؤول", lang)}
              </label>
              <input
                id="admin-user"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={L("Enter username", "أدخل اسم المستخدم", lang)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            </div>

            {isInitialSetup && (
              <div className="space-y-1.5">
                <label htmlFor="admin-display-name" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Owner Display Name", "اسم المالك الظاهر", lang)}
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

          {isInitialSetup && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Assigned Role", "الدور المعين", lang)}
                </span>
                <div className="px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] hub-subtle text-sm font-mono">
                  Owner
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-avatar-url" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Owner Avatar URL", "رابط صورة المالك", lang)}
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
                autoComplete={isInitialSetup ? "new-password" : "current-password"}
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

            {isInitialSetup && passphrase.length > 0 && (
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

          {isInitialSetup && (
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
            disabled={submitting || (!isInitialSetup && lockSeconds > 0)}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-55 cursor-pointer"
          >
            {isInitialSetup ? <KeyRound className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>
              {submitting
                ? L("Deriving PBKDF2 key...", "جارٍ التحقق المشفر...", lang)
                : isInitialSetup
                ? L("Initialize Owner & Enter Workspace", "تهيئة المالك ودخول الإدارة", lang)
                : L("Unlock Private Workspace", "فتح مساحة الإدارة الخاصة", lang)}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

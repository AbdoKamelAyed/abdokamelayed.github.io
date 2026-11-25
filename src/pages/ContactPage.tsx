import React, { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { L, t } from "../utils/i18n";

export const ContactPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const c = data.profileSettings.contact;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setNotice(L("Please enter both subject and message.", "يرجى إدخال العنوان والرسالة.", lang));
      return;
    }
    if (!c.email) {
      setNotice(
        L(
          "No public email address is configured yet. Add one in Admin Workspace → Website Settings to enable direct mailto links, or reach out via GitHub.",
          "لم يتم ضبط بريد إلكتروني عام بعد. يمكنك إضافته من مساحة الإدارة لتفعيل الإرسال المباشر أو التواصل عبر GitHub.",
          lang
        )
      );
      return;
    }
    const mailto = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(message.trim())}`;
    window.location.href = mailto;
    setNotice(L("Opening your default email client...", "جارٍ فتح تطبيق البريد الإلكتروني...", lang));
  };

  return (
    <div className="space-y-10">
      <header className="border-b border-[var(--hub-border)] pb-6 space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("contact.title", lang)}
        </h1>
        <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
          {L(
            "Public channels and direct mailto message composer (static-host compatible).",
            "قنوات التواصل العامة ونموذج المراسلة المباشر المتوافق مع الاستضافة الثابتة.",
            lang
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">{L("Public Channels", "القنوات العامة", lang)}</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <span className="font-semibold">GitHub:</span>{" "}
              <a
                href={safeUrl(c.github) || "https://github.com/AbdoKamelAyed"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>@AbdoKamelAyed</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </li>
            {safeUrl(c.linkedin) && (
              <li>
                <span className="font-semibold">LinkedIn:</span>{" "}
                <a
                  href={safeUrl(c.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>{L("Profile", "الملف المهني", lang)}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
            )}
            {(c.otherLinks || []).map((lnk, idx) => {
              const u = safeUrl(lnk.url);
              if (!u) return null;
              return (
                <li key={idx}>
                  <span className="font-semibold">{lnk.label}:</span>{" "}
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>{u}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </li>
              );
            })}
            <li>
              <span className="font-semibold">{L("Email", "البريد الإلكتروني", lang)}:</span>{" "}
              {c.email ? (
                <a href={`mailto:${c.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {c.email}
                </a>
              ) : (
                <span className="text-[var(--hub-text-muted)]">
                  {L("Not publicly listed", "غير مدرج للعامة", lang)}
                </span>
              )}
            </li>
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="lg:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">{L("Compose Message", "إرسال رسالة", lang)}</h2>
          <div className="space-y-1.5">
            <label htmlFor="contact-subject" className="text-xs font-semibold text-[var(--hub-text-muted)]">
              {L("Subject", "الموضوع", lang)}
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={L("Engineering inquiry or collaboration", "استفسار تقني أو تعاون", lang)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contact-message" className="text-xs font-semibold text-[var(--hub-text-muted)]">
              {L("Message", "نص الرسالة", lang)}
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={L("Write your message...", "اكتب رسالتك هنا...", lang)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] cursor-pointer"
          >
            {L("Send via Email Client", "إرسال عبر البريد", lang)}
          </button>
          {notice && <p className="text-xs text-[var(--hub-text-muted)]">{notice}</p>}
        </form>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { ArrowUpRight, User } from "lucide-react";
import type { Lang } from "../types/hub";
import { safeMediaUrl, safeUrl } from "../utils/analytics";
import { L } from "../utils/i18n";

export const DEFAULT_AUTHOR_AVATAR = "/src/assets/images/author_abdo_portrait_1795606693025.jpg";

export const AuthorAvatar: React.FC<{
  src?: string | null;
  name: string;
  sizeClass?: string;
}> = ({ src, name, sizeClass = "w-10 h-10" }) => {
  const [failed, setFailed] = useState(false);
  const resolved = safeMediaUrl(src) || DEFAULT_AUTHOR_AVATAR;

  if (!resolved || failed) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} rounded-full border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[var(--hub-text-muted)]`}
      >
        <User className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900 shrink-0`}
    />
  );
};

export const AuthorProfileCard: React.FC<{
  name: string;
  handle?: string;
  roleTitle?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  githubUrl?: string;
  websiteUrl?: string;
  lang: Lang;
  compact?: boolean;
}> = ({
  name,
  handle,
  roleTitle,
  avatarUrl,
  bio,
  location,
  githubUrl,
  websiteUrl,
  lang,
  compact = false,
}) => {
  const cleanGithub = safeUrl(githubUrl);
  const cleanWeb = safeUrl(websiteUrl);

  return (
    <section
      aria-label={L("Author Profile", "ملف الكاتب", lang)}
      data-testid="author-profile-card"
      className={`rounded-2xl border border-[var(--hub-border)] hub-surface ${
        compact ? "p-5" : "p-6 sm:p-7"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <AuthorAvatar
          src={avatarUrl}
          name={name}
          sizeClass={compact ? "w-16 h-16" : "w-20 h-20"}
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
              {name}
            </h2>
            {handle && (
              <span dir="ltr" className="text-xs font-mono text-[var(--hub-text-muted)]">
                {handle}
              </span>
            )}
          </div>

          {(roleTitle || location) && (
            <div className="text-xs text-[var(--hub-text-muted)] flex flex-wrap items-center gap-2">
              {roleTitle && <span className="font-medium text-blue-600 dark:text-blue-400">{roleTitle}</span>}
              {roleTitle && location && <span aria-hidden="true">·</span>}
              {location && <span>{location}</span>}
            </div>
          )}

          {bio && (
            <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed max-w-2xl">
              {bio}
            </p>
          )}
        </div>

        {(cleanGithub || cleanWeb) && (
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0 print:hidden">
            <a
              href="#/about"
              className="px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {L("Author Profile", "ملف الكاتب", lang)}
            </a>
            {cleanGithub && (
              <a
                href={cleanGithub}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                <span>GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

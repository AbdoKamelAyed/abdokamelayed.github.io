import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { L, loc, t } from "../utils/i18n";
import { AuthorAvatar } from "../components/AuthorProfileCard";

export const AboutPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const p = data.profileSettings;
  const gh = data.github.profile;

  return (
    <div className="space-y-10">
      <header className="border-b border-[var(--hub-border)] pb-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <AuthorAvatar src={p.avatarUrl} name={loc(p.fullName, lang)} sizeClass="w-20 h-20" />
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-[var(--hub-text-muted)]">
            {loc(p.fullName, lang)} · @{p.githubUsername || "AbdoKamelAyed"}
            {loc(p.roleTitle, lang) ? ` · ${loc(p.roleTitle, lang)}` : ""}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t("about.title", lang)}
          </h1>
          <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
            {loc(p.headline, lang)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-xl font-semibold">{L("Biography", "السيرة المختصرة", lang)}</h2>
            <p className="text-sm sm:text-base leading-relaxed">{loc(p.shortBio, lang)}</p>
          </div>

          {loc(p.mission, lang) && (
            <div className="pt-4 border-t border-[var(--hub-border)] space-y-1.5">
              <h3 className="text-sm font-semibold">{L("Personal Mission", "الرسالة", lang)}</h3>
              <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">{loc(p.mission, lang)}</p>
            </div>
          )}

          {loc(p.careerDirection, lang) && (
            <div className="pt-4 border-t border-[var(--hub-border)] space-y-1.5">
              <h3 className="text-sm font-semibold">{L("Career Direction", "التوجه المهني", lang)}</h3>
              <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">{loc(p.careerDirection, lang)}</p>
            </div>
          )}
        </section>

        <aside className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-xl font-semibold">
              {L("Technical Interests", "الاهتمامات التقنية", lang)}
            </h2>
            <p className="text-sm font-mono text-[var(--hub-text-muted)]">
              {p.technicalInterests.join(" · ") || t("common.empty", lang)}
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--hub-border)] space-y-2 text-sm">
            <h3 className="font-semibold">{L("Public Identity & Links", "الهوية العامة والروابط", lang)}</h3>
            <div className="text-[var(--hub-text-muted)]">
              {gh.company ? `${gh.company} · ` : ""}
              {gh.location || L("Egypt", "مصر", lang)}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {safeUrl(p.contact.github) && (
                <a
                  href={safeUrl(p.contact.github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold"
                >
                  <span>GitHub</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
              {safeUrl(p.contact.linkedin) && (
                <a
                  href={safeUrl(p.contact.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
              {(p.contact.otherLinks || []).map((lnk, i) => {
                const u = safeUrl(lnk.url);
                if (!u) return null;
                return (
                  <a
                    key={i}
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold"
                  >
                    <span>{lnk.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                );
              })}
              <a
                href="#/contact"
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold"
              >
                {t("nav.contact", lang)}
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { HubDatasets, Lang } from "../types/hub";
import { safeUrl } from "../utils/analytics";
import { L, loc, t } from "../utils/i18n";
import { AuthorAvatar } from "../components/AuthorProfileCard";

export const AboutPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const p = data.profileSettings;
  const gh = data.github.profile;
  const visibleInternalProfiles = (p.internalProfiles || []).filter((item) => item.visibleOnAbout);
  const displayLocation = loc(p.location, lang) || gh.location || L("Egypt", "مصر", lang);

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

          {(p.selectedAchievements || []).length > 0 && (
            <div className="pt-4 border-t border-[var(--hub-border)] space-y-2">
              <h3 className="text-sm font-semibold">{L("Selected Highlights", "أبرز الإنجازات", lang)}</h3>
              <ul className="space-y-1.5 text-sm text-[var(--hub-text-muted)] list-disc ps-5">
                {(p.selectedAchievements || []).map((ach, idx) => (
                  <li key={idx}>{loc(ach, lang)}</li>
                ))}
              </ul>
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
              {displayLocation}
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

      {visibleInternalProfiles.length > 0 && (
        <section data-testid="about-internal-profiles" className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {L("Internal Profiles & Contributors", "الملفات الداخلية والمساهمون", lang)}
            </h2>
            <p className="text-sm text-[var(--hub-text-muted)]">
              {L(
                "Editorial identities, specialized tracks, and internal roles managed from the Studio.",
                "الهويات التحريرية والمسارات التخصصية المدارة من لوحة التحكم.",
                lang
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleInternalProfiles.map((member) => {
              const ghUrl = safeUrl(member.github);
              const webUrl = safeUrl(member.website);
              return (
                <article
                  key={member.id}
                  data-testid={`internal-profile-card-${member.slug}`}
                  className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <AuthorAvatar src={member.avatarUrl} name={loc(member.name, lang)} sizeClass="w-12 h-12" />
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold leading-snug truncate">
                          {loc(member.name, lang)}
                        </h3>
                        <p className="text-xs font-medium text-[var(--hub-secondary)] truncate">
                          {loc(member.roleTitle, lang)}
                        </p>
                        {(member.handle || loc(member.location, lang)) && (
                          <div className="text-[11px] font-mono text-[var(--hub-text-muted)] truncate mt-0.5">
                            {[member.handle, loc(member.location, lang)].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>

                    {loc(member.shortBio, lang) && (
                      <p className="text-sm text-[var(--hub-text-muted)] leading-relaxed">
                        {loc(member.shortBio, lang)}
                      </p>
                    )}

                    {member.specialties.length > 0 && (
                      <div className="text-xs font-mono text-[var(--hub-text-muted)]">
                        {member.specialties.join(" · ")}
                      </div>
                    )}
                  </div>

                  {(ghUrl || webUrl || member.email) && (
                    <div className="pt-3 border-t border-[var(--hub-border)] flex flex-wrap items-center gap-3 text-xs font-semibold">
                      {ghUrl && (
                        <a
                          href={ghUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-[var(--hub-secondary)]"
                        >
                          <span>GitHub</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {webUrl && (
                        <a
                          href={webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-[var(--hub-secondary)]"
                        >
                          <span>{L("Website", "الموقع", lang)}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="inline-flex items-center gap-1 hover:text-[var(--hub-secondary)] font-mono"
                        >
                          <span>{member.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

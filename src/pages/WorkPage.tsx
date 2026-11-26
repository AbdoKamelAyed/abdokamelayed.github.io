import React from "react";
import type { HubDatasets, Lang } from "../types/hub";
import { L, loc, t } from "../utils/i18n";

export const WorkPage: React.FC<{ data: HubDatasets; lang: Lang }> = ({ data, lang }) => {
  const exp = data.experience;

  return (
    <div className="space-y-12">
      <header className="border-b border-[var(--hub-border)] pb-6 space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("work.title", lang)}
        </h1>
        <p className="text-base text-[var(--hub-text-muted)] max-w-3xl">
          {t("work.subtitle", lang)}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
          <h2 className="font-display text-xl font-semibold">
            {L("Chronological Experience", "السجل المهني والعملي", lang)}
          </h2>
          {exp.items.length === 0 ? (
            <p className="text-sm text-[var(--hub-text-muted)]">{t("common.empty", lang)}</p>
          ) : (
            <div className="divide-y divide-[var(--hub-border)]">
              {exp.items.map((item) => (
                <article key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{loc(item.role, lang)}</h3>
                    <span className="text-xs font-mono text-[var(--hub-text-muted)]">{item.period}</span>
                  </div>
                  <div className="text-xs text-[var(--hub-text-muted)]">
                    {loc(item.organization, lang)} · {item.kind} · {loc(item.location, lang)}
                  </div>
                  <p className="text-sm text-[var(--hub-text)] leading-relaxed">{loc(item.summary, lang)}</p>
                  {item.skills.length > 0 && (
                    <div className="text-xs font-mono text-[var(--hub-secondary)]">
                      {item.skills.join(" · ")}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold">
              {L("Technical Skills", "المهارات التقنية", lang)}
            </h2>
            {exp.skills.map((grp, idx) => (
              <div key={idx} className="space-y-1.5 pb-4 last:pb-0 border-b last:border-b-0 border-[var(--hub-border)]">
                <h3 className="text-sm font-semibold">{loc(grp.group, lang)}</h3>
                <p className="text-xs font-mono text-[var(--hub-text-muted)] leading-relaxed">
                  {grp.items.join(" · ")}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">
              {L("Knowledge Areas & Research", "مجالات المعرفة والأبحاث", lang)}
            </h2>
            <div>
              <h3 className="text-xs font-semibold text-[var(--hub-text-muted)] mb-1">
                {L("Knowledge Areas", "مجالات المعرفة", lang)}
              </h3>
              <p className="text-sm">{exp.knowledgeAreas.join(" · ") || t("common.empty", lang)}</p>
            </div>
            <div className="pt-3 border-t border-[var(--hub-border)]">
              <h3 className="text-xs font-semibold text-[var(--hub-text-muted)] mb-1">
                {L("Research Interests", "الاهتمامات البحثية", lang)}
              </h3>
              <p className="text-sm">{exp.researchInterests.join(" · ") || t("common.empty", lang)}</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

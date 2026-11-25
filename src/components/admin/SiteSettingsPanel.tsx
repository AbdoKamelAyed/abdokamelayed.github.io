import React, { useState } from "react";
import { Check, Download, Globe, KeyRound, Palette, Plus, Trash2, User } from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import { setupAdminCredential } from "../../utils/adminAuth";
import { L, loc } from "../../utils/i18n";

export const SiteSettingsPanel: React.FC<{
  data: HubDatasets;
  lang: Lang;
  adminUsername: string;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onApplyWebsiteTheme: (website: HubDatasets["website"]) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
  onDownloadJson: (filename: string, payload: unknown) => void;
}> = ({
  data,
  lang,
  adminUsername,
  onUpdateData,
  onApplyWebsiteTheme,
  onNotify,
  onAudit,
  onDownloadJson,
}) => {
  // Website settings
  const [siteName, setSiteName] = useState(data.website.siteName);
  const [shortTitle, setShortTitle] = useState(data.website.shortTitle);
  const [domain, setDomain] = useState(data.website.domain);
  const [version, setVersion] = useState(data.website.version);
  const [defaultAuthor, setDefaultAuthor] = useState(
    data.website.defaultAuthor || loc(data.profileSettings.fullName, "en") || "Abdo Kamel"
  );
  const [defaultLanguage, setDefaultLanguage] = useState<Lang>(data.website.defaultLanguage);
  const [defaultTheme, setDefaultTheme] = useState<"light" | "dark">(data.website.defaultTheme);
  const [defaultGlassMode, setDefaultGlassMode] = useState(Boolean(data.website.defaultGlassMode));
  const [primaryAccent, setPrimaryAccent] = useState(data.website.primaryAccent || "#0f172a");
  const [secondaryAccent, setSecondaryAccent] = useState(data.website.secondaryAccent || "#2563eb");
  const [seoEn, setSeoEn] = useState(
    typeof data.website.seoDescription === "string"
      ? data.website.seoDescription
      : data.website.seoDescription.en || ""
  );
  const [seoAr, setSeoAr] = useState(
    typeof data.website.seoDescription === "string"
      ? data.website.seoDescription
      : data.website.seoDescription.ar || ""
  );

  // Profile & identity settings
  const [fullNameEn, setFullNameEn] = useState(
    typeof data.profileSettings.fullName === "string"
      ? data.profileSettings.fullName
      : data.profileSettings.fullName.en || ""
  );
  const [fullNameAr, setFullNameAr] = useState(
    typeof data.profileSettings.fullName === "string"
      ? data.profileSettings.fullName
      : data.profileSettings.fullName.ar || ""
  );
  const [githubUsername, setGithubUsername] = useState(data.profileSettings.githubUsername);
  const [headlineEn, setHeadlineEn] = useState(
    typeof data.profileSettings.headline === "string"
      ? data.profileSettings.headline
      : data.profileSettings.headline.en || ""
  );
  const [headlineAr, setHeadlineAr] = useState(
    typeof data.profileSettings.headline === "string"
      ? data.profileSettings.headline
      : data.profileSettings.headline.ar || ""
  );
  const [bioEn, setBioEn] = useState(
    typeof data.profileSettings.shortBio === "string"
      ? data.profileSettings.shortBio
      : data.profileSettings.shortBio.en || ""
  );
  const [bioAr, setBioAr] = useState(
    typeof data.profileSettings.shortBio === "string"
      ? data.profileSettings.shortBio
      : data.profileSettings.shortBio.ar || ""
  );
  const [missionEn, setMissionEn] = useState(
    typeof data.profileSettings.mission === "string"
      ? data.profileSettings.mission
      : data.profileSettings.mission.en || ""
  );
  const [interestsInput, setInterestsInput] = useState(data.profileSettings.technicalInterests.join(", "));
  const [email, setEmail] = useState(data.profileSettings.contact.email || "");
  const [linkedin, setLinkedin] = useState(data.profileSettings.contact.linkedin || "");
  const [websiteUrl, setWebsiteUrl] = useState(data.profileSettings.contact.website || "");
  const [otherLinks, setOtherLinks] = useState<{ label: string; url: string }[]>(
    data.profileSettings.contact.otherLinks || []
  );

  // Admin Vault passphrase update
  const [vaultUser, setVaultUser] = useState(adminUsername);
  const [newPass, setNewPass] = useState("");
  const [vaultStatus, setVaultStatus] = useState("");

  const handleSaveSiteSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = new Date().toISOString();

    const nextWebsite = {
      ...data.website,
      siteName: siteName.trim() || "ABDO — Personal Digital Hub",
      shortTitle: shortTitle.trim() || "ABDO",
      domain: domain.trim() || "https://abdokamelayed.github.io",
      version: version.trim() || "1.0.0",
      defaultAuthor: defaultAuthor.trim() || "Abdo Kamel",
      defaultLanguage,
      defaultTheme,
      defaultGlassMode,
      primaryAccent,
      secondaryAccent,
      seoDescription: {
        en: seoEn.trim(),
        ar: seoAr.trim() || seoEn.trim(),
      },
      updatedAt: ts,
    };

    const nextProfile = {
      ...data.profileSettings,
      fullName: {
        en: fullNameEn.trim() || "Abdo Kamel",
        ar: fullNameAr.trim() || fullNameEn.trim() || "عبدو كامل",
      },
      githubUsername: githubUsername.trim() || "AbdoKamelAyed",
      headline: {
        en: headlineEn.trim(),
        ar: headlineAr.trim() || headlineEn.trim(),
      },
      shortBio: {
        en: bioEn.trim(),
        ar: bioAr.trim() || bioEn.trim(),
      },
      mission: {
        en: missionEn.trim(),
        ar: typeof data.profileSettings.mission === "object" ? data.profileSettings.mission.ar : missionEn.trim(),
      },
      technicalInterests: interestsInput.split(",").map((s) => s.trim()).filter(Boolean),
      contact: {
        ...data.profileSettings.contact,
        email: email.trim(),
        linkedin: linkedin.trim(),
        website: websiteUrl.trim(),
        otherLinks: otherLinks.filter((l) => l.label.trim() && l.url.trim()),
      },
      updatedAt: ts,
    };

    saveLocalDraft("./data/settings/website.json", nextWebsite);
    saveLocalDraft("./data/settings/profile.json", nextProfile);
    onUpdateData((prev) => ({ ...prev, website: nextWebsite, profileSettings: nextProfile }));
    onApplyWebsiteTheme(nextWebsite);
    onAudit("Updated Site Settings", nextWebsite.siteName);
    onNotify(L("Site, profile, theme, and SEO settings saved.", "تم حفظ إعدادات الموقع والهوية والمظهر وSEO.", lang));
  };

  const handleUpdatePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 4) {
      setVaultStatus(L("Passphrase must be at least 4 characters.", "كلمة المرور يجب أن تكون 4 أحرف على الأقل.", lang));
      return;
    }
    await setupAdminCredential(vaultUser, newPass, 8);
    setNewPass("");
    onAudit("Rotated Admin Passphrase", vaultUser);
    setVaultStatus(L("Admin vault passphrase updated cleanly.", "تم تحديث كلمة مرور الإدارة بنجاح.", lang));
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSaveSiteSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site Identity & Appearance */}
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{L("Site Identity & Appearance", "هوية الموقع والمظهر", lang)}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-site-name" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Site Name", "اسم الموقع", lang)}
                </label>
                <input
                  id="set-site-name"
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-short-title" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Header Brand Title", "الشعار النصي", lang)}
                </label>
                <input
                  id="set-short-title"
                  type="text"
                  value={shortTitle}
                  onChange={(e) => setShortTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-display font-bold"
                />
              </div>
              <div>
                <label htmlFor="set-domain" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Primary Domain", "النطاق الرئيسي", lang)}
                </label>
                <input
                  id="set-domain"
                  type="url"
                  dir="ltr"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
                />
              </div>
              <div>
                <label htmlFor="set-version" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Release Version", "رقم الإصدار", lang)}
                </label>
                <input
                  id="set-version"
                  type="text"
                  dir="ltr"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="set-lang" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Default Language", "اللغة الافتراضية", lang)}
                </label>
                <select
                  id="set-lang"
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value as Lang)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                >
                  <option value="en">English (LTR)</option>
                  <option value="ar">العربية (RTL)</option>
                </select>
              </div>
              <div>
                <label htmlFor="set-theme" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Default Theme", "السمة الافتراضية", lang)}
                </label>
                <select
                  id="set-theme"
                  value={defaultTheme}
                  onChange={(e) => setDefaultTheme(e.target.value as "light" | "dark")}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                >
                  <option value="light">{L("Light", "فاتح", lang)}</option>
                  <option value="dark">{L("Dark", "داكن", lang)}</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaultGlassMode}
                    onChange={(e) => setDefaultGlassMode(e.target.checked)}
                  />
                  <span>{L("Default Glass Mode", "الوضع الزجاجي", lang)}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="set-primary-accent" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Primary Accent", "اللون الأساسي", lang)}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="set-primary-accent"
                    type="color"
                    value={primaryAccent}
                    onChange={(e) => setPrimaryAccent(e.target.value)}
                    className="h-9 w-12 rounded border border-[var(--hub-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={primaryAccent}
                    onChange={(e) => setPrimaryAccent(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="set-secondary-accent" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Secondary Accent", "اللون الثانوي", lang)}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="set-secondary-accent"
                    type="color"
                    value={secondaryAccent}
                    onChange={(e) => setSecondaryAccent(e.target.value)}
                    className="h-9 w-12 rounded border border-[var(--hub-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={secondaryAccent}
                    onChange={(e) => setSecondaryAccent(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Author & Profile Identity */}
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{L("Owner Profile & Default Author", "الهوية والكاتب الافتراضي", lang)}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-default-author" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Default Article Author", "كاتب المقالات الافتراضي", lang)}
                </label>
                <input
                  id="set-default-author"
                  type="text"
                  value={defaultAuthor}
                  onChange={(e) => setDefaultAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-gh-user" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("GitHub Username", "اسم مستخدم GitHub", lang)}
                </label>
                <input
                  id="set-gh-user"
                  type="text"
                  dir="ltr"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
                />
              </div>
              <div>
                <label htmlFor="set-name-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Full Name (EN)", "الاسم الكامل (EN)", lang)}
                </label>
                <input
                  id="set-name-en"
                  type="text"
                  value={fullNameEn}
                  onChange={(e) => setFullNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-name-ar" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Full Name (AR)", "الاسم الكامل (AR)", lang)}
                </label>
                <input
                  id="set-name-ar"
                  type="text"
                  dir="rtl"
                  value={fullNameAr}
                  onChange={(e) => setFullNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-headline-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Headline (EN)", "العنوان المهني (EN)", lang)}
                </label>
                <input
                  id="set-headline-en"
                  type="text"
                  value={headlineEn}
                  onChange={(e) => setHeadlineEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-headline-ar" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Headline (AR)", "العنوان المهني (AR)", lang)}
                </label>
                <input
                  id="set-headline-ar"
                  type="text"
                  dir="rtl"
                  value={headlineAr}
                  onChange={(e) => setHeadlineAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-bio-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Short Bio (EN)", "النبذة (EN)", lang)}
                </label>
                <textarea
                  id="set-bio-en"
                  rows={2}
                  value={bioEn}
                  onChange={(e) => setBioEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-bio-ar" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Short Bio (AR)", "النبذة (AR)", lang)}
                </label>
                <textarea
                  id="set-bio-ar"
                  rows={2}
                  dir="rtl"
                  value={bioAr}
                  onChange={(e) => setBioAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="set-interests" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("Technical Interests (comma separated)", "الاهتمامات التقنية", lang)}
              </label>
              <input
                id="set-interests"
                type="text"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>

            <div>
              <label htmlFor="set-mission-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("Engineering Mission (EN)", "الرسالة الهندسية", lang)}
              </label>
              <input
                id="set-mission-en"
                type="text"
                value={missionEn}
                onChange={(e) => setMissionEn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>
          </section>

          {/* Contact & Channels */}
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{L("Contact & Social Channels", "قنوات التواصل والروابط", lang)}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="set-email" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Public Email", "البريد العام", lang)}
                </label>
                <input
                  id="set-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-linkedin" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  LinkedIn URL
                </label>
                <input
                  id="set-linkedin"
                  type="url"
                  dir="ltr"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-website-url" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Website URL", "رابط الموقع", lang)}
                </label>
                <input
                  id="set-website-url"
                  type="url"
                  dir="ltr"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--hub-border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--hub-text-muted)]">
                  {L("Additional Public Links", "روابط إضافية", lang)}
                </span>
                <button
                  type="button"
                  onClick={() => setOtherLinks((prev) => [...prev, { label: "", url: "" }])}
                  className="px-2.5 py-1 rounded border border-[var(--hub-border)] text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{L("Add Link", "إضافة رابط", lang)}</span>
                </button>
              </div>
              {otherLinks.map((lnk, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    value={lnk.label}
                    onChange={(e) =>
                      setOtherLinks((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Label"
                    aria-label="Link label"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
                  />
                  <input
                    type="url"
                    dir="ltr"
                    value={lnk.url}
                    onChange={(e) =>
                      setOtherLinks((prev) => prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)))
                    }
                    placeholder="https://..."
                    aria-label="Link URL"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setOtherLinks((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={L("Remove link", "حذف الرابط", lang)}
                    className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* SEO & SERP Preview */}
          <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">{L("SEO Metadata & Search Preview", "بيانات SEO ومعاينة البحث", lang)}</h2>

            <div>
              <label htmlFor="set-seo-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("Meta Description (EN)", "الوصف التعريفي (EN)", lang)}
              </label>
              <textarea
                id="set-seo-en"
                rows={2}
                value={seoEn}
                onChange={(e) => setSeoEn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>
            <div>
              <label htmlFor="set-seo-ar" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("Meta Description (AR)", "الوصف التعريفي (AR)", lang)}
              </label>
              <textarea
                id="set-seo-ar"
                rows={2}
                dir="rtl"
                value={seoAr}
                onChange={(e) => setSeoAr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>

            <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-1">
              <div className="text-[11px] font-mono text-[var(--hub-text-muted)]" dir="ltr">{domain}</div>
              <div className="text-base font-semibold text-blue-600 dark:text-blue-400">{siteName}</div>
              <p className="text-xs text-[var(--hub-text-muted)] line-clamp-2">{seoEn}</p>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{L("Save All Site Settings", "حفظ جميع إعدادات الموقع", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => onDownloadJson("website.json", data.website)}
            className="px-4 py-2.5 rounded-lg border border-[var(--hub-border)] text-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{L("Export website.json", "تصدير website.json", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => onDownloadJson("profile.json", data.profileSettings)}
            className="px-4 py-2.5 rounded-lg border border-[var(--hub-border)] text-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{L("Export profile.json", "تصدير profile.json", lang)}</span>
          </button>
        </div>
      </form>

      {/* Admin Access Credentials Update */}
      <form
        onSubmit={handleUpdatePassphrase}
        className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4 max-w-2xl"
      >
        <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{L("Admin Vault Credentials", "بيانات دخول خزنة الإدارة", lang)}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="vault-user" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Admin Username", "اسم المستخدم", lang)}
            </label>
            <input
              id="vault-user"
              type="text"
              value={vaultUser}
              onChange={(e) => setVaultUser(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="vault-pass" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("New Passphrase", "كلمة المرور الجديدة", lang)}
            </label>
            <input
              id="vault-pass"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
        </div>
        {vaultStatus && <p className="text-xs text-blue-600 dark:text-blue-400">{vaultStatus}</p>}
        <button
          type="submit"
          className="px-4 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          {L("Update Admin Passphrase", "تحديث كلمة مرور الإدارة", lang)}
        </button>
      </form>
    </div>
  );
};

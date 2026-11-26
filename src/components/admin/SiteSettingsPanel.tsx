import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileCode2,
  Globe,
  KeyRound,
  Palette,
  Plus,
  SearchCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  Users,
  XCircle,
} from "lucide-react";
import type { HubDatasets, Lang } from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import { readFileAsDataUrl } from "../../services/mediaLibraryService";
import {
  evaluatePassphraseStrength,
  listAdminAccounts,
  removeAdminAccount,
  setupAdminCredential,
  type AdminAccountRecord,
} from "../../utils/adminAuth";
import { safeMediaUrl } from "../../utils/analytics";
import {
  DEFAULT_DESIGN_THEME_ID,
  DESIGN_THEMES,
  getDesignThemeById,
} from "../../utils/designThemes";
import { FONT_SCALES, normalizeFontScale, type FontScale } from "../../utils/typography";
import { L, loc } from "../../utils/i18n";
import { analyzeSeoAudit, generateRobotsTxt, generateSitemapXml } from "../../utils/seoEngine";
import { AuthorAvatar, DEFAULT_AUTHOR_AVATAR } from "../AuthorProfileCard";
import { InternalProfilesEditor } from "./InternalProfilesEditor";

type SettingsSubTab = "theme" | "profiles" | "controls" | "seo" | "security";

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

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
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>("theme");

  // Website settings
  const [siteName, setSiteName] = useState(data.website.siteName);
  const [shortTitle, setShortTitle] = useState(data.website.shortTitle);
  const [domain, setDomain] = useState(data.website.domain);
  const [version, setVersion] = useState(data.website.version);
  const [defaultAuthor, setDefaultAuthor] = useState(
    data.website.defaultAuthor || loc(data.profileSettings.fullName, "en") || "Abdo Kamel"
  );
  const [defaultLanguage, setDefaultLanguage] = useState<Lang>(data.website.defaultLanguage);
  const [designThemeId, setDesignThemeId] = useState<string>(
    data.website.designThemeId || DEFAULT_DESIGN_THEME_ID
  );
  const [defaultTheme, setDefaultTheme] = useState<"light" | "dark">(data.website.defaultTheme);
  const [defaultGlassMode, setDefaultGlassMode] = useState(Boolean(data.website.defaultGlassMode));
  const [defaultFontScale, setDefaultFontScale] = useState<FontScale>(
    normalizeFontScale(data.website.defaultFontScale)
  );
  const [showBreadcrumbs, setShowBreadcrumbs] = useState<boolean>(
    data.website.showBreadcrumbs !== false
  );
  const [showReadingProgress, setShowReadingProgress] = useState<boolean>(
    data.website.showReadingProgress !== false
  );
  const [enableGlobalSearch, setEnableGlobalSearch] = useState<boolean>(
    data.website.enableGlobalSearch !== false
  );
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
  const [ogImage, setOgImage] = useState(data.website.ogImage || DEFAULT_AUTHOR_AVATAR);
  const [twitterHandle, setTwitterHandle] = useState(data.website.twitterHandle || "");
  const [seoKeywordsInput, setSeoKeywordsInput] = useState((data.website.seoKeywords || []).join(", "));

  // Profile & author identity settings
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
  const [avatarUrl, setAvatarUrl] = useState(data.profileSettings.avatarUrl || DEFAULT_AUTHOR_AVATAR);
  const [roleTitleEn, setRoleTitleEn] = useState(
    typeof data.profileSettings.roleTitle === "string"
      ? data.profileSettings.roleTitle
      : data.profileSettings.roleTitle?.en || ""
  );
  const [roleTitleAr, setRoleTitleAr] = useState(
    typeof data.profileSettings.roleTitle === "string"
      ? data.profileSettings.roleTitle
      : data.profileSettings.roleTitle?.ar || ""
  );
  const [locationEn, setLocationEn] = useState(
    typeof data.profileSettings.location === "string"
      ? data.profileSettings.location
      : data.profileSettings.location?.en || "Egypt"
  );
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

  // Admin Vault passphrase & multi-account directory
  const [vaultUser, setVaultUser] = useState(adminUsername);
  const [newPass, setNewPass] = useState("");
  const [vaultStatus, setVaultStatus] = useState("");
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>(() => listAdminAccounts());

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const passStrength = evaluatePassphraseStrength(newPass);

  const liveSeoData: HubDatasets = useMemo(
    () => ({
      ...data,
      website: {
        ...data.website,
        siteName,
        shortTitle,
        domain,
        ogImage,
        twitterHandle,
        seoDescription: { en: seoEn, ar: seoAr || seoEn },
      },
      profileSettings: {
        ...data.profileSettings,
        avatarUrl,
        fullName: { en: fullNameEn, ar: fullNameAr || fullNameEn },
      },
    }),
    [data, siteName, shortTitle, domain, ogImage, twitterHandle, seoEn, seoAr, avatarUrl, fullNameEn, fullNameAr]
  );

  const seoDiagnostics = useMemo(() => analyzeSeoAudit(liveSeoData, lang), [liveSeoData, lang]);
  const seoPassed = seoDiagnostics.filter((d) => d.status === "pass").length;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onNotify(L("Please select an image file for the author portrait.", "يرجى اختيار ملف صورة لصورة الكاتب.", lang));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onNotify(L("Portrait image must be under 2 MB.", "حجم صورة الكاتب يجب أن يقل عن 2 ميجابايت.", lang));
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (safeMediaUrl(dataUrl)) {
      setAvatarUrl(dataUrl);
      onNotify(L("Portrait loaded into draft. Click Save All Site Settings to apply.", "تم تحميل الصورة. اضغط حفظ الإعدادات لتطبيقها.", lang));
    }
    e.target.value = "";
  };

  const handleSaveSiteSettings = (e?: React.FormEvent) => {
    e?.preventDefault();
    const ts = new Date().toISOString();

    const nextWebsite = {
      ...data.website,
      siteName: siteName.trim() || "ABDO — Personal Digital Hub",
      shortTitle: shortTitle.trim() || "ABDO",
      domain: domain.trim() || "https://abdokamelayed.github.io",
      version: version.trim() || "1.0.0",
      defaultAuthor: defaultAuthor.trim() || "Abdo Kamel",
      ogImage: ogImage.trim() || avatarUrl.trim() || DEFAULT_AUTHOR_AVATAR,
      twitterHandle: twitterHandle.trim() || undefined,
      seoKeywords: seoKeywordsInput.split(",").map((s) => s.trim()).filter(Boolean),
      defaultLanguage,
      designThemeId,
      defaultTheme,
      defaultGlassMode,
      defaultFontScale,
      showBreadcrumbs,
      showReadingProgress,
      enableGlobalSearch,
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
      avatarUrl: avatarUrl.trim() || DEFAULT_AUTHOR_AVATAR,
      roleTitle: {
        en: roleTitleEn.trim() || "Software Engineer & Systems Builder",
        ar: roleTitleAr.trim() || roleTitleEn.trim() || "مهندس برمجيات ومطور أنظمة",
      },
      location: {
        en: locationEn.trim() || "Egypt",
        ar: typeof data.profileSettings.location === "object" ? data.profileSettings.location.ar : locationEn.trim(),
      },
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
    onAudit("Updated Site Settings & SEO", nextWebsite.siteName);
    onNotify(L("Site, author profile, theme, and SEO settings saved.", "تم حفظ إعدادات الموقع والكاتب والمظهر وSEO.", lang));
  };

  const handleUpdatePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passStrength.valid) {
      setVaultStatus(L(passStrength.issues[0] || "Choose a stronger passphrase (min 8 chars + mix).", "اختر كلمة مرور أقوى (8 أحرف على الأقل مع أرقام أو رموز).", lang));
      return;
    }
    await setupAdminCredential(vaultUser, newPass, 8);
    setNewPass("");
    setAccounts(listAdminAccounts());
    onAudit("Rotated Admin Passphrase", vaultUser);
    setVaultStatus(L("PBKDF2 admin credential updated cleanly.", "تم تحديث كلمة مرور الإدارة (PBKDF2) بنجاح.", lang));
  };

  const safePreviewOg = safeMediaUrl(ogImage) || DEFAULT_AUTHOR_AVATAR;

  const selectedDirection = useMemo(() => getDesignThemeById(designThemeId), [designThemeId]);

  const handleSelectAdminDirection = (nextId: string) => {
    const picked = getDesignThemeById(nextId);
    setDesignThemeId(picked.id);
    setDefaultTheme(picked.polarity);
    setDefaultGlassMode(picked.glassRecommended);
    setPrimaryAccent(picked.tokens.primary);
    setSecondaryAccent(picked.tokens.secondary);
    onApplyWebsiteTheme({
      ...data.website,
      designThemeId: picked.id,
      defaultTheme: picked.polarity,
      defaultGlassMode: picked.glassRecommended,
      primaryAccent: picked.tokens.primary,
      secondaryAccent: picked.tokens.secondary,
    });
    onAudit("Previewed Design Direction", picked.id);
  };

  return (
    <div className="space-y-6">
      {/* Focused Sub-tab Navigation for Admin Site Settings */}
      <div
        role="tablist"
        aria-label={L("Site settings categories", "أقسام إعدادات الموقع", lang)}
        className="flex flex-wrap items-center gap-2 border-b border-[var(--hub-border)] pb-3"
      >
        {(
          [
            ["theme", Palette, L("Theme & Design Studio (15)", "استوديو التصميم (١٥)", lang)],
            ["profiles", Users, L("Internal Profiles & Bio", "الملفات الداخلية والسيرة", lang)],
            ["controls", SlidersHorizontal, L("Specific Site Controls", "إعدادات الموقع الدقيقة", lang)],
            ["seo", SearchCheck, L("SEO & Indexing", "محرك SEO والفهرسة", lang)],
            ["security", KeyRound, L("Security & Operators", "الأمان وحسابات الإدارة", lang)],
          ] as [SettingsSubTab, React.ComponentType<{ className?: string }>, string][]
        ).map(([subId, SubIcon, subLabel]) => (
          <button
            key={subId}
            type="button"
            role="tab"
            aria-selected={settingsSubTab === subId}
            data-testid={`settings-subtab-${subId}`}
            onClick={() => setSettingsSubTab(subId)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              settingsSubTab === subId
                ? "bg-[var(--hub-primary)] text-[var(--hub-bg)]"
                : "border border-[var(--hub-border)] text-[var(--hub-text-muted)] hover:text-[var(--hub-text)]"
            }`}
          >
            <SubIcon className="w-3.5 h-3.5" />
            <span>{subLabel}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* SUB-TAB 1: 15 Design Directions + Brand Identity & Accents */}
        {settingsSubTab === "theme" && (
          <div className="space-y-6">
            <section
              data-testid="admin-design-directions"
              className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--hub-secondary)]" />
                    <span>{L("Global Site Design Directions (15 Complete Systems)", "الاتجاهات التصميمية الشاملة للموقع (١٥ نظاماً)", lang)}</span>
                  </h2>
                  <p className="text-xs text-[var(--hub-text-muted)] max-w-3xl">
                    {L(
                      "Select a complete architectural direction below. Admin controls the site's design direction, palette, typography pairing, and glass surface defaults while visitors get clean Light/Dark and Font Size controls.",
                      "اختر اتجاهاً تصميمياً متكاملاً للموقع من لوحة الإدارة، بينما يمتلك الزوار أدوات التبديل السريع بين الفاتح/الداكن وتكبير/تصغير الخط.",
                      lang
                    )}
                  </p>
                </div>
                <div className="text-xs font-mono text-[var(--hub-text-muted)]">
                  #{String(selectedDirection.order).padStart(2, "0")} · {loc(selectedDirection.name, lang)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {DESIGN_THEMES.map((item) => {
                  const active = item.id === designThemeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`admin-theme-option-${item.id}`}
                      onClick={() => handleSelectAdminDirection(item.id)}
                      style={{
                        backgroundColor: item.tokens.surfaceElevated,
                        borderColor: active ? item.tokens.secondary : item.tokens.border,
                        color: item.tokens.text,
                        borderRadius: item.geometry.cardRadius,
                      }}
                      className={`text-start p-3.5 border transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${
                        active ? "ring-2 ring-offset-1 ring-[var(--hub-secondary)]" : ""
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            style={{ color: item.tokens.textMuted }}
                            className="text-[11px] font-mono tabular-nums"
                          >
                            {String(item.order).padStart(2, "0")} · {item.polarity.toUpperCase()} · {loc(item.geometry.styleLabel, lang)}
                          </span>
                          <div className="flex items-center gap-1" aria-hidden="true">
                            <span
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: item.tokens.bg, borderColor: item.tokens.border }}
                            />
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.tokens.secondary }}
                            />
                            {active && <Check className="w-3.5 h-3.5 ms-0.5" style={{ color: item.tokens.secondary }} />}
                          </div>
                        </div>

                        <div
                          style={{ fontFamily: item.fonts.display, color: item.tokens.text }}
                          className="text-base font-bold leading-snug"
                        >
                          {loc(item.name, lang)}
                        </div>

                        <div style={{ color: item.tokens.secondary }} className="text-[11px] font-semibold">
                          {loc(item.directionTagline, lang)}
                        </div>

                        <p
                          style={{ fontFamily: item.fonts.body, color: item.tokens.textMuted }}
                          className="text-[11px] leading-relaxed line-clamp-2"
                        >
                          {loc(item.directionGuide, lang)}
                        </p>
                      </div>

                      <div
                        style={{ borderColor: item.tokens.border, color: item.tokens.textMuted }}
                        className="pt-2 border-t flex items-center justify-between gap-2 text-[10px] font-mono"
                      >
                        <span className="truncate">{item.fonts.label}</span>
                        <span className="shrink-0 font-sans font-semibold" style={{ color: item.tokens.secondary }}>
                          {loc(item.idealFor, lang)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Site Identity & Color Accents */}
            <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{L("Site Identity & Accent Overrides", "هوية الموقع والألوان المخصصة", lang)}</span>
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
          </div>
        )}

        {/* SUB-TAB 3: Specific Site Controls (Typography Scale, Breadcrumbs, Progress, Search, Domain) */}
        {settingsSubTab === "controls" && (
          <section
            data-testid="specific-site-controls"
            className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-6"
          >
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[var(--hub-secondary)]" />
                <span>{L("Specific Site & Reader Controls", "إعدادات الموقع والقراءة الدقيقة", lang)}</span>
              </h2>
              <p className="text-xs text-[var(--hub-text-muted)]">
                {L(
                  "Configure default reader typography scale, navigation breadcrumbs, reading progress indicator, and keyboard-first global search visibility.",
                  "تحديد حجم الخط الافتراضي للقراءة وتفعيل مسار التنقل وشريط تقدم القراءة والبحث الشامل.",
                  lang
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="set-default-font-scale" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Default Reader Font Size", "حجم الخط الافتراضي للزوار", lang)}
                </label>
                <select
                  id="set-default-font-scale"
                  data-testid="admin-default-font-scale"
                  value={defaultFontScale}
                  onChange={(e) => setDefaultFontScale(normalizeFontScale(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                >
                  {(Object.keys(FONT_SCALES) as FontScale[]).map((scaleId) => {
                    const def = FONT_SCALES[scaleId];
                    return (
                      <option key={scaleId} value={scaleId}>
                        {loc(def.label, lang)} ({def.rootFontSizePx}px)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Default Site Polarity", "وضع السطوع الافتراضي", lang)}
                </label>
                <div className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono">
                  {defaultTheme === "dark" ? L("Dark Mode", "الوضع الداكن", lang) : L("Light Mode", "الوضع الفاتح", lang)}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Active Design System", "النظام التصميمي النشط", lang)}
                </label>
                <div className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm truncate">
                  {loc(selectedDirection.name, lang)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--hub-border)]">
              <label className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="toggle-show-breadcrumbs"
                  checked={showBreadcrumbs}
                  onChange={(e) => setShowBreadcrumbs(e.target.checked)}
                  className="mt-1"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold">{L("Dynamic Breadcrumbs", "مسار التنقل الهرمي", lang)}</span>
                  <span className="block text-xs text-[var(--hub-text-muted)]">
                    {L("Show hierarchical route breadcrumb trail under the header.", "إظهار شريط المسار التفصيلي أسفل الرأسية.", lang)}
                  </span>
                </span>
              </label>

              <label className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="toggle-show-reading-progress"
                  checked={showReadingProgress}
                  onChange={(e) => setShowReadingProgress(e.target.checked)}
                  className="mt-1"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold">{L("Reading Progress Bar", "شريط تقدم القراءة", lang)}</span>
                  <span className="block text-xs text-[var(--hub-text-muted)]">
                    {L("Show fixed viewport scroll progress on articles & issues.", "إظهار شريط تقدم القراءة أعلى المقالات والأعداد.", lang)}
                  </span>
                </span>
              </label>

              <label className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="toggle-enable-global-search"
                  checked={enableGlobalSearch}
                  onChange={(e) => setEnableGlobalSearch(e.target.checked)}
                  className="mt-1"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold">{L("Global Search (Ctrl+K)", "البحث الشامل السريع", lang)}</span>
                  <span className="block text-xs text-[var(--hub-text-muted)]">
                    {L("Enable the Ctrl+K search modal & header trigger.", "تفعيل نافذة البحث الشامل واختصار لوحة المفاتيح.", lang)}
                  </span>
                </span>
              </label>
            </div>
          </section>
        )}

        {/* SUB-TAB 2: Primary Author Identity + Contact + Custom Internal Profiles */}
        {settingsSubTab === "profiles" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Author Portrait & Identity */}
              <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{L("Author Portrait & Public Profile", "صورة الكاتب والملف التعريفي", lang)}</span>
                </h2>

            {/* Portrait uploader + live preview */}
            <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3.5 flex flex-col sm:flex-row sm:items-center gap-4">
              <AuthorAvatar src={avatarUrl} name={fullNameEn || "Abdo Kamel"} sizeClass="w-16 h-16" />
              <div className="flex-1 min-w-0 space-y-2">
                <label htmlFor="set-avatar-url" className="text-xs font-semibold text-[var(--hub-text-muted)] block">
                  {L("Author Portrait URL or Upload", "رابط أو رفع صورة الكاتب", lang)}
                </label>
                <input
                  id="set-avatar-url"
                  type="text"
                  dir="ltr"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded border border-[var(--hub-border)] text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{L("Upload Portrait", "رفع صورة", lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(DEFAULT_AUTHOR_AVATAR)}
                    className="px-2.5 py-1 rounded border border-[var(--hub-border)] text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {L("Studio Portrait", "الصورة الافتراضية", lang)}
                  </button>
                </div>
              </div>
            </div>

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
              <div>
                <label htmlFor="set-role-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Author Role Title (EN)", "المسمى المهني (EN)", lang)}
                </label>
                <input
                  id="set-role-en"
                  type="text"
                  value={roleTitleEn}
                  onChange={(e) => setRoleTitleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <label htmlFor="set-location-en" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Author Location", "الموقع", lang)}
                </label>
                <input
                  id="set-location-en"
                  type="text"
                  value={locationEn}
                  onChange={(e) => setLocationEn(e.target.value)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-interests" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("Technical Interests", "الاهتمامات التقنية", lang)}
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
            </div>

            <InternalProfilesEditor
              data={data}
              lang={lang}
              onUpdateData={onUpdateData}
              onNotify={onNotify}
              onAudit={onAudit}
            />
          </div>
        )}

        {/* SUB-TAB 4: SEO Engine Improver */}
        {settingsSubTab === "seo" && (
          <section
            data-testid="seo-engine-panel"
            className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
                <SearchCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{L("SEO Engine & Search Inspector", "محرك تحسين SEO وفحص الظهور", lang)}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                {seoPassed}/{seoDiagnostics.length} {L("checks passing", "فحوصات ناجحة", lang)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-og-image" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("OpenGraph Share Image URL", "صورة المشاركة الاجتماعية", lang)}
                </label>
                <input
                  id="set-og-image"
                  type="text"
                  dir="ltr"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
                />
              </div>
              <div>
                <label htmlFor="set-seo-keywords" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                  {L("SEO Keywords", "الكلمات المفتاحية", lang)}
                </label>
                <input
                  id="set-seo-keywords"
                  type="text"
                  value={seoKeywordsInput}
                  onChange={(e) => setSeoKeywordsInput(e.target.value)}
                  placeholder="systems, react, engineering"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="set-seo-en" className="text-xs font-semibold text-[var(--hub-text-muted)]">
                    {L("Meta Description (EN)", "الوصف التعريفي (EN)", lang)}
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)]">
                    {seoEn.trim().length}/160
                  </span>
                </div>
                <textarea
                  id="set-seo-en"
                  rows={2}
                  value={seoEn}
                  onChange={(e) => setSeoEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="set-seo-ar" className="text-xs font-semibold text-[var(--hub-text-muted)]">
                    {L("Meta Description (AR)", "الوصف التعريفي (AR)", lang)}
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-[var(--hub-text-muted)]">
                    {seoAr.trim().length}/160
                  </span>
                </div>
                <textarea
                  id="set-seo-ar"
                  rows={2}
                  dir="rtl"
                  value={seoAr}
                  onChange={(e) => setSeoAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                />
              </div>
            </div>

            {/* Live SERP & Social Card Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 rounded-xl border border-[var(--hub-border)] hub-subtle p-4 items-center">
              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-mono text-[var(--hub-text-muted)] truncate" dir="ltr">
                  {domain}
                </div>
                <div className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 truncate">
                  {siteName}
                </div>
                <p className="text-xs text-[var(--hub-text-muted)] line-clamp-2">{seoEn}</p>
              </div>
              <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-[var(--hub-border)] bg-slate-100 dark:bg-slate-900">
                <img
                  src={safePreviewOg}
                  alt="Social card preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Rule-based Diagnostics */}
            <ul className="divide-y divide-[var(--hub-border)] border border-[var(--hub-border)] rounded-xl overflow-hidden">
              {seoDiagnostics.map((item) => (
                <li key={item.id} className="p-3 flex items-start gap-2.5 text-xs bg-[var(--hub-bg)]">
                  {item.status === "pass" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : item.status === "warn" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{item.title}</span>
                      <span className="font-mono text-[11px] text-[var(--hub-text-muted)]">{item.detail}</span>
                    </div>
                    <p className="text-[11px] text-[var(--hub-text-muted)]">{item.fixHint}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  downloadTextFile("sitemap.xml", generateSitemapXml(liveSeoData), "application/xml");
                  onAudit("Generated sitemap.xml", domain);
                  onNotify(L("Downloaded dynamic sitemap.xml covering all projects, articles, and issues.", "تم تنزيل sitemap.xml الشامل لجميع الصفحات.", lang));
                }}
                className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>{L("Download sitemap.xml", "تصدير sitemap.xml", lang)}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadTextFile("robots.txt", generateRobotsTxt(domain), "text/plain");
                  onNotify(L("Downloaded robots.txt with admin disallow rule.", "تم تنزيل robots.txt.", lang));
                }}
                className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{L("Download robots.txt", "تصدير robots.txt", lang)}</span>
              </button>
            </div>
          </section>
        )}

        {settingsSubTab !== "security" && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSaveSiteSettings()}
              data-testid="save-all-site-settings-btn"
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
        )}
      </div>

      {/* SUB-TAB 5: Admin Security Credentials + Registered Operators */}
      {settingsSubTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleUpdatePassphrase}
          className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{L("Rotate Admin Passphrase (PBKDF2)", "تحديث كلمة مرور الإدارة (PBKDF2)", lang)}</span>
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
                {L("New Passphrase (min 8 chars)", "كلمة المرور الجديدة", lang)}
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
          {newPass.length > 0 && (
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-[var(--hub-text-muted)]">
                <span>{L("Strength:", "القوة:", lang)}</span>
                <span className="font-mono font-semibold">{passStrength.label}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden grid grid-cols-4 gap-0.5">
                {[1, 2, 3, 4].map((lvl) => (
                  <span
                    key={lvl}
                    className={`h-full ${
                      passStrength.score >= lvl
                        ? passStrength.score >= 3
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                        : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          {vaultStatus && <p className="text-xs text-blue-600 dark:text-blue-400">{vaultStatus}</p>}
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-[var(--hub-border)] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {L("Update PBKDF2 Credential", "تحديث بيانات الأمان", lang)}
          </button>
        </form>

        <section className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{L("Registered Admin Operators", "حسابات الإدارة المسجلة", lang)} ({accounts.length})</span>
            </h2>
            <span className="text-[11px] font-mono text-[var(--hub-text-muted)]">PBKDF2-SHA-256</span>
          </div>
          <ul className="divide-y divide-[var(--hub-border)]">
            {accounts.map((acc) => {
              const isSelf = acc.username.toLowerCase() === adminUsername.toLowerCase();
              return (
                <li key={acc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AuthorAvatar src={acc.avatarUrl || avatarUrl} name={acc.displayName} sizeClass="w-8 h-8" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {acc.displayName} <span className="font-mono text-[var(--hub-text-muted)]">@{acc.username}</span>
                      </div>
                      <div className="text-[11px] text-[var(--hub-text-muted)] font-mono">
                        {acc.role} · {acc.algorithm}
                      </div>
                    </div>
                  </div>
                  {!isSelf && accounts.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = removeAdminAccount(acc.id);
                        setAccounts(next);
                        onAudit("Removed Admin Operator", acc.username);
                      }}
                      aria-label={L("Remove operator", "حذف الحساب", lang)}
                      className="px-2 py-1 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      {L("Remove", "حذف", lang)}
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                      {isSelf ? L("Active", "نشط", lang) : L("Primary", "أساسي", lang)}
                    </span>
                  )}
                </li>
              );
            })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
};

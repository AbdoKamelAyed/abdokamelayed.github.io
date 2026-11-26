import React, { useRef, useState } from "react";
import { Check, Edit3, Eye, EyeOff, Plus, Star, Trash2, Upload, UserPlus, Users } from "lucide-react";
import type { HubDatasets, InternalProfileRecord, Lang, LocalizedText } from "../../types/hub";
import { saveLocalDraft } from "../../services/dataService";
import { readFileAsDataUrl } from "../../services/mediaLibraryService";
import { safeMediaUrl, slugify } from "../../utils/analytics";
import { L, loc } from "../../utils/i18n";
import { AuthorAvatar, DEFAULT_AUTHOR_AVATAR } from "../AuthorProfileCard";

function readLoc(val: LocalizedText | undefined, targetLang: "en" | "ar"): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val[targetLang] || "";
}

export const InternalProfilesEditor: React.FC<{
  data: HubDatasets;
  lang: Lang;
  onUpdateData: (updater: (prev: HubDatasets) => HubDatasets) => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
}> = ({ data, lang, onUpdateData, onNotify, onAudit }) => {
  const p = data.profileSettings;

  // Extended Primary Profile fields (covering all bilingual & structured arrays)
  const [missionAr, setMissionAr] = useState(readLoc(p.mission, "ar"));
  const [careerEn, setCareerEn] = useState(readLoc(p.careerDirection, "en"));
  const [careerAr, setCareerAr] = useState(readLoc(p.careerDirection, "ar"));
  const [roleAr, setRoleAr] = useState(readLoc(p.roleTitle, "ar"));
  const [locationAr, setLocationAr] = useState(readLoc(p.location, "ar"));
  const [achievements, setAchievements] = useState<{ en: string; ar: string }[]>(
    (p.selectedAchievements || []).map((a) => ({
      en: readLoc(a, "en"),
      ar: readLoc(a, "ar"),
    }))
  );

  // Custom Internal / Team / Author Profiles Directory
  const [profiles, setProfiles] = useState<InternalProfileRecord[]>(p.internalProfiles || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profNameEn, setProfNameEn] = useState("");
  const [profNameAr, setProfNameAr] = useState("");
  const [profHandle, setProfHandle] = useState("");
  const [profRoleEn, setProfRoleEn] = useState("");
  const [profRoleAr, setProfRoleAr] = useState("");
  const [profLocEn, setProfLocEn] = useState("");
  const [profAvatar, setProfAvatar] = useState(DEFAULT_AUTHOR_AVATAR);
  const [profBioEn, setProfBioEn] = useState("");
  const [profBioAr, setProfBioAr] = useState("");
  const [profSpecialties, setProfSpecialties] = useState("");
  const [profGithub, setProfGithub] = useState("");
  const [profWebsite, setProfWebsite] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profVisible, setProfVisible] = useState(true);
  const [profDefaultAuthor, setProfDefaultAuthor] = useState(false);

  const profAvatarInputRef = useRef<HTMLInputElement | null>(null);

  const persistProfileUpdates = (
    nextInternal: InternalProfileRecord[],
    auditAction: string,
    auditTarget: string,
    includeExtendedPrimary = false
  ) => {
    const ts = new Date().toISOString();
    const nextProfile = {
      ...data.profileSettings,
      ...(includeExtendedPrimary
        ? {
            roleTitle: {
              en: readLoc(data.profileSettings.roleTitle, "en"),
              ar: roleAr.trim() || readLoc(data.profileSettings.roleTitle, "en"),
            },
            location: {
              en: readLoc(data.profileSettings.location, "en") || "Egypt",
              ar: locationAr.trim() || "مصر",
            },
            mission: {
              en: readLoc(data.profileSettings.mission, "en"),
              ar: missionAr.trim() || readLoc(data.profileSettings.mission, "en"),
            },
            careerDirection: {
              en: careerEn.trim(),
              ar: careerAr.trim() || careerEn.trim(),
            },
            selectedAchievements: achievements
              .filter((a) => a.en.trim() || a.ar.trim())
              .map((a) => ({ en: a.en.trim() || a.ar.trim(), ar: a.ar.trim() || a.en.trim() })),
          }
        : {}),
      internalProfiles: nextInternal,
      updatedAt: ts,
    };

    const defaultProf = nextInternal.find((x) => x.isDefaultAuthor);
    const nextWebsite = defaultProf
      ? {
          ...data.website,
          defaultAuthor: loc(defaultProf.name, "en"),
          updatedAt: ts,
        }
      : data.website;

    saveLocalDraft("./data/settings/profile.json", nextProfile);
    if (defaultProf) {
      saveLocalDraft("./data/settings/website.json", nextWebsite);
    }

    onUpdateData((prev) => ({
      ...prev,
      profileSettings: nextProfile,
      website: nextWebsite,
    }));
    onAudit(auditAction, auditTarget);
  };

  const resetProfileForm = () => {
    setEditingId(null);
    setProfNameEn("");
    setProfNameAr("");
    setProfHandle("");
    setProfRoleEn("");
    setProfRoleAr("");
    setProfLocEn("");
    setProfAvatar(DEFAULT_AUTHOR_AVATAR);
    setProfBioEn("");
    setProfBioAr("");
    setProfSpecialties("");
    setProfGithub("");
    setProfWebsite("");
    setProfEmail("");
    setProfVisible(true);
    setProfDefaultAuthor(false);
  };

  const loadForEdit = (item: InternalProfileRecord) => {
    setEditingId(item.id);
    setProfNameEn(readLoc(item.name, "en"));
    setProfNameAr(readLoc(item.name, "ar"));
    setProfHandle(item.handle || "");
    setProfRoleEn(readLoc(item.roleTitle, "en"));
    setProfRoleAr(readLoc(item.roleTitle, "ar"));
    setProfLocEn(readLoc(item.location, "en"));
    setProfAvatar(item.avatarUrl || DEFAULT_AUTHOR_AVATAR);
    setProfBioEn(readLoc(item.shortBio, "en"));
    setProfBioAr(readLoc(item.shortBio, "ar"));
    setProfSpecialties(item.specialties.join(", "));
    setProfGithub(item.github || "");
    setProfWebsite(item.website || "");
    setProfEmail(item.email || "");
    setProfVisible(item.visibleOnAbout);
    setProfDefaultAuthor(Boolean(item.isDefaultAuthor));
  };

  const handleSaveExtendedPrimary = (e: React.FormEvent) => {
    e.preventDefault();
    persistProfileUpdates(profiles, "Updated Extended Profile Bio & Achievements", loc(data.profileSettings.fullName, "en"), true);
    onNotify(L("Extended primary profile, Arabic metadata, and achievements saved.", "تم حفظ البيانات الممتدة والإنجازات للملف الرئيسي.", lang));
  };

  const handleProfileAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      onNotify(L("Avatar must be under 2 MB.", "حجم الصورة يجب أن يكون أقل من 2 ميجابايت.", lang));
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (safeMediaUrl(dataUrl)) {
      setProfAvatar(dataUrl);
    }
    e.target.value = "";
  };

  const handleSaveCustomProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profNameEn.trim() || !profRoleEn.trim()) return;
    const slug = slugify(profNameEn) || `profile-${Date.now()}`;
    const record: InternalProfileRecord = {
      id: editingId || `prof-${slug}-${Date.now().toString(36).slice(-4)}`,
      slug,
      name: { en: profNameEn.trim(), ar: profNameAr.trim() || profNameEn.trim() },
      handle: profHandle.trim() || undefined,
      roleTitle: { en: profRoleEn.trim(), ar: profRoleAr.trim() || profRoleEn.trim() },
      location: profLocEn.trim() ? { en: profLocEn.trim(), ar: profLocEn.trim() } : undefined,
      avatarUrl: profAvatar.trim() || DEFAULT_AUTHOR_AVATAR,
      shortBio: { en: profBioEn.trim(), ar: profBioAr.trim() || profBioEn.trim() },
      specialties: profSpecialties.split(",").map((s) => s.trim()).filter(Boolean),
      github: profGithub.trim() || undefined,
      website: profWebsite.trim() || undefined,
      email: profEmail.trim() || undefined,
      visibleOnAbout: profVisible,
      isDefaultAuthor: profDefaultAuthor,
    };

    const baseList = editingId
      ? profiles.map((item) => (item.id === editingId ? record : item))
      : [...profiles, record];

    const normalized = profDefaultAuthor
      ? baseList.map((item) => ({ ...item, isDefaultAuthor: item.id === record.id }))
      : baseList;

    setProfiles(normalized);
    persistProfileUpdates(
      normalized,
      editingId ? "Updated Internal Profile" : "Created Internal Profile",
      profNameEn.trim()
    );
    resetProfileForm();
    onNotify(L("Internal profile saved to profile.json draft.", "تم حفظ الملف الداخلي بنجاح.", lang));
  };

  return (
    <div data-testid="internal-profiles-editor" className="space-y-6">
      {/* Extended Primary Bilingual Narrative & Selected Achievements */}
      <form
        onSubmit={handleSaveExtendedPrimary}
        className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {L("Extended Internal Narrative & Achievements", "البيانات الممتدة والإنجازات للملف الشخصي", lang)}
            </h3>
            <p className="text-xs text-[var(--hub-text-muted)]">
              {L(
                "Customize bilingual mission statements, career direction, localized titles, and curated achievements displayed on About & Home.",
                "تخصيص الرسالة، التوجه المهني، المسمى بالعربية، وقائمة الإنجازات الظاهرة في صفحة نبذة عني.",
                lang
              )}
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{L("Save Narrative & Achievements", "حفظ الإنجازات والسيرة", lang)}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Role Title (AR)", "المسمى المهني (AR)", lang)}
            </label>
            <input
              type="text"
              dir="rtl"
              value={roleAr}
              onChange={(e) => setRoleAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Location (AR)", "الموقع (AR)", lang)}
            </label>
            <input
              type="text"
              dir="rtl"
              value={locationAr}
              onChange={(e) => setLocationAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Engineering Mission (AR)", "الرسالة الهندسية (AR)", lang)}
            </label>
            <input
              type="text"
              dir="rtl"
              value={missionAr}
              onChange={(e) => setMissionAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Career Direction (EN)", "التوجه المهني (EN)", lang)}
            </label>
            <textarea
              rows={2}
              value={careerEn}
              onChange={(e) => setCareerEn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Career Direction (AR)", "التوجه المهني (AR)", lang)}
            </label>
            <textarea
              rows={2}
              dir="rtl"
              value={careerAr}
              onChange={(e) => setCareerAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-[var(--hub-border)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--hub-text-muted)]">
              {L("Selected Achievements (Bilingual)", "أبرز الإنجازات المحددة", lang)} ({achievements.length})
            </span>
            <button
              type="button"
              onClick={() => setAchievements((prev) => [...prev, { en: "", ar: "" }])}
              className="px-2.5 py-1 rounded border border-[var(--hub-border)] text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{L("Add Achievement", "إضافة إنجاز", lang)}</span>
            </button>
          </div>
          {achievements.map((ach, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                type="text"
                value={ach.en}
                onChange={(e) =>
                  setAchievements((prev) => prev.map((x, i) => (i === idx ? { ...x, en: e.target.value } : x)))
                }
                placeholder={L("Achievement summary (EN)", "الإنجاز بالإنجليزية", lang)}
                className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
              />
              <input
                type="text"
                dir="rtl"
                value={ach.ar}
                onChange={(e) =>
                  setAchievements((prev) => prev.map((x, i) => (i === idx ? { ...x, ar: e.target.value } : x)))
                }
                placeholder={L("Achievement summary (AR)", "الإنجاز بالعربية", lang)}
                className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
              />
              <button
                type="button"
                onClick={() => setAchievements((prev) => prev.filter((_, i) => i !== idx))}
                aria-label={L("Remove achievement", "حذف الإنجاز", lang)}
                className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </form>

      {/* Custom Internal / Editorial & Team Profiles Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveCustomProfile}
          className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-3"
        >
          <h3 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[var(--hub-secondary)]" />
            <span>
              {editingId
                ? L("Edit Custom Internal Profile", "تعديل الملف الداخلي", lang)
                : L("Create Custom Internal Profile", "إنشاء ملف داخلي مخصص", lang)}
            </span>
          </h3>

          <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-3 flex items-center gap-3">
            <AuthorAvatar src={profAvatar} name={profNameEn || "Profile"} sizeClass="w-12 h-12" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                type="text"
                dir="ltr"
                value={profAvatar}
                onChange={(e) => setProfAvatar(e.target.value)}
                placeholder="Avatar URL"
                className="w-full px-2.5 py-1 rounded border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
              />
              <input
                ref={profAvatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileAvatarUpload}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => profAvatarInputRef.current?.click()}
                className="px-2.5 py-1 rounded border border-[var(--hub-border)] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>{L("Upload Avatar", "رفع صورة", lang)}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              value={profNameEn}
              onChange={(e) => setProfNameEn(e.target.value)}
              placeholder={L("Display Name (EN) *", "الاسم (EN) *", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              dir="rtl"
              value={profNameAr}
              onChange={(e) => setProfNameAr(e.target.value)}
              placeholder={L("Display Name (AR)", "الاسم (AR)", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              required
              value={profRoleEn}
              onChange={(e) => setProfRoleEn(e.target.value)}
              placeholder={L("Role / Title (EN) *", "الدور / المسمى (EN) *", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              dir="rtl"
              value={profRoleAr}
              onChange={(e) => setProfRoleAr(e.target.value)}
              placeholder={L("Role / Title (AR)", "الدور / المسمى (AR)", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            <input
              type="text"
              dir="ltr"
              value={profHandle}
              onChange={(e) => setProfHandle(e.target.value)}
              placeholder="@handle"
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
            <input
              type="text"
              value={profLocEn}
              onChange={(e) => setProfLocEn(e.target.value)}
              placeholder={L("Location / Team", "الموقع أو الفريق", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <textarea
              rows={2}
              value={profBioEn}
              onChange={(e) => setProfBioEn(e.target.value)}
              placeholder={L("Short Bio (EN)", "السيرة المختصرة (EN)", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
            />
            <textarea
              rows={2}
              dir="rtl"
              value={profBioAr}
              onChange={(e) => setProfBioAr(e.target.value)}
              placeholder={L("Short Bio (AR)", "السيرة المختصرة (AR)", lang)}
              className="px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
            />
          </div>

          <input
            type="text"
            value={profSpecialties}
            onChange={(e) => setProfSpecialties(e.target.value)}
            placeholder={L("Specialties (comma separated)", "التخصصات (مفصولة بفاصلة)", lang)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="url"
              dir="ltr"
              value={profGithub}
              onChange={(e) => setProfGithub(e.target.value)}
              placeholder="GitHub URL"
              className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
            <input
              type="url"
              dir="ltr"
              value={profWebsite}
              onChange={(e) => setProfWebsite(e.target.value)}
              placeholder="Website URL"
              className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
            <input
              type="email"
              dir="ltr"
              value={profEmail}
              onChange={(e) => setProfEmail(e.target.value)}
              placeholder="Email"
              className="px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profVisible}
                onChange={(e) => setProfVisible(e.target.checked)}
              />
              <span>{L("Show on About Page", "عرض في صفحة نبذة عني", lang)}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profDefaultAuthor}
                onChange={(e) => setProfDefaultAuthor(e.target.checked)}
              />
              <span>{L("Use as Default Article Author", "استخدام ككاتب افتراضي", lang)}</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--hub-primary)] text-[var(--hub-bg)] text-xs font-semibold cursor-pointer"
            >
              {editingId ? L("Update Internal Profile", "تحديث الملف", lang) : L("Save Internal Profile", "حفظ الملف", lang)}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetProfileForm}
                className="px-4 py-2 rounded-lg border border-[var(--hub-border)] text-xs cursor-pointer"
              >
                {L("Cancel", "إلغاء", lang)}
              </button>
            )}
          </div>
        </form>

        {/* Directory of Custom Internal Profiles */}
        <section className="lg:col-span-6 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--hub-secondary)]" />
              <span>{L("Internal Profiles Directory", "دليل الملفات الداخلية", lang)} ({profiles.length})</span>
            </h3>
          </div>

          {profiles.length === 0 ? (
            <p className="text-xs text-[var(--hub-text-muted)] py-6 text-center">
              {L(
                "No custom internal profiles created yet. Create editorial personas, co-authors, or team profiles on the left.",
                "لا توجد ملفات داخلية مخصصة بعد. أنشئ ملفات كتاب أو فرق عمل من النموذج الجانبي.",
                lang
              )}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--hub-border)]">
              {profiles.map((item) => (
                <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AuthorAvatar src={item.avatarUrl} name={loc(item.name, lang)} sizeClass="w-10 h-10" />
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-sm font-semibold flex flex-wrap items-center gap-1.5">
                        <span>{loc(item.name, lang)}</span>
                        {item.handle && (
                          <span className="font-mono text-xs text-[var(--hub-text-muted)]">{item.handle}</span>
                        )}
                        {item.isDefaultAuthor && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3" />
                            {L("Default Author", "افتراضي", lang)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--hub-secondary)]">{loc(item.roleTitle, lang)}</div>
                      {loc(item.shortBio, lang) && (
                        <p className="text-xs text-[var(--hub-text-muted)] line-clamp-2">
                          {loc(item.shortBio, lang)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const next = profiles.map((x) =>
                          x.id === item.id ? { ...x, visibleOnAbout: !x.visibleOnAbout } : x
                        );
                        setProfiles(next);
                        persistProfileUpdates(next, "Toggled Profile Visibility", loc(item.name, "en"));
                      }}
                      aria-label={L("Toggle visibility on About page", "تبديل الظهور", lang)}
                      className="p-1.5 rounded border border-[var(--hub-border)] text-xs cursor-pointer"
                    >
                      {item.visibleOnAbout ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadForEdit(item)}
                      aria-label={L("Edit profile", "تعديل الملف", lang)}
                      className="p-1.5 rounded border border-[var(--hub-border)] text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = profiles.filter((x) => x.id !== item.id);
                        setProfiles(next);
                        persistProfileUpdates(next, "Deleted Internal Profile", loc(item.name, "en"));
                      }}
                      aria-label={L("Delete profile", "حذف الملف", lang)}
                      className="p-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

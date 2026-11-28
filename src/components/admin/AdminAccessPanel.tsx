import React, { useState } from "react";
import { Check, KeyRound, ShieldAlert, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import type { Lang } from "../../types/hub";
import {
  evaluatePassphraseStrength,
  listAdminAccounts,
  registerAdminAccount,
  removeAdminAccount,
  updateAdminAccountAccess,
  type AdminAccountRecord,
  type AdminAuditEntry,
  type AdminRole,
  type AdminSessionRecord,
} from "../../utils/adminAuth";
import {
  ADMIN_WORKSPACE_MODULES,
  getDefaultModulesForRole,
  getRoleSummary,
  resolveEffectiveModules,
  type AdminWorkspaceSection,
} from "../../utils/adminPermissions";
import { formatDateTime, L } from "../../utils/i18n";
import { AuthorAvatar } from "../AuthorProfileCard";

const ROLES: AdminRole[] = ["Owner", "Managing Editor", "Author"];

export const AdminAccessPanel: React.FC<{
  lang: Lang;
  session: AdminSessionRecord;
  defaultAvatarUrl?: string;
  auditLog: AdminAuditEntry[];
  onRefreshSession: () => void;
  onNotify: (msg: string) => void;
  onAudit: (action: string, target: string) => void;
}> = ({ lang, session, defaultAvatarUrl, auditLog, onRefreshSession, onNotify, onAudit }) => {
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>(() => listAdminAccounts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("Managing Editor");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editModules, setEditModules] = useState<AdminWorkspaceSection[]>([]);

  // New administrator form
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("Author");
  const [newModules, setNewModules] = useState<AdminWorkspaceSection[]>(() =>
    getDefaultModulesForRole("Author")
  );
  const [newPassphrase, setNewPassphrase] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const isOwner = session.role === "Owner";
  const ownerCount = accounts.filter((a) => a.role === "Owner").length;
  const passStrength = evaluatePassphraseStrength(newPassphrase);

  const handleToggleModule = (
    current: AdminWorkspaceSection[],
    setter: (next: AdminWorkspaceSection[]) => void,
    modId: AdminWorkspaceSection,
    roleForEdit: AdminRole
  ) => {
    if (modId === "overview" || roleForEdit === "Owner") return;
    if (modId === "access") return;
    const exists = current.includes(modId);
    const next = exists ? current.filter((m) => m !== modId) : [...current, modId];
    setter(resolveEffectiveModules({ role: roleForEdit, allowedModules: next }));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!isOwner) return;

    setCreating(true);
    try {
      const res = await registerAdminAccount({
        username: newUsername,
        displayName: newDisplayName.trim() || newUsername.trim(),
        passphrase: newPassphrase,
        role: newRole,
        allowedModules: newRole === "Owner" ? undefined : newModules,
        avatarUrl: defaultAvatarUrl,
        durationHours: 8,
        authorizedByOwner: isOwner,
      });

      if (!res.ok || !res.account) {
        setFormError(res.error || L("Could not register administrator.", "تعذر إضافة المسؤول.", lang));
        return;
      }

      // Restore current Owner session (registerAdminAccount sets session for the newly created user)
      // Re-save current Owner session token in sessionStorage
      const { createAdminSession } = await import("../../utils/adminAuth");
      const currentOwner = listAdminAccounts().find((a) => a.id === session.accountId);
      if (currentOwner) {
        createAdminSession(currentOwner, 8, session.inactivityLimitMinutes);
      }

      setAccounts(listAdminAccounts());
      setNewUsername("");
      setNewDisplayName("");
      setNewRole("Author");
      setNewModules(getDefaultModulesForRole("Author"));
      setNewPassphrase("");
      onAudit("Granted Admin Access", `${res.account.username} (${res.account.role})`);
      onNotify(
        L(
          `Created administrator @${res.account.username} with ${res.account.role} access.`,
          `تم إنشاء حساب المسؤول @${res.account.username} بصلاحية ${res.account.role}.`,
          lang
        )
      );
      onRefreshSession();
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (acc: AdminAccountRecord) => {
    setEditingId(acc.id);
    setEditRole(acc.role);
    setEditDisplayName(acc.displayName);
    setEditModules(resolveEffectiveModules({ role: acc.role, allowedModules: acc.allowedModules }));
  };

  const handleSavePermissions = (accountId: string) => {
    const res = updateAdminAccountAccess(accountId, {
      displayName: editDisplayName,
      role: editRole,
      allowedModules: editModules,
    });
    if (!res.ok) {
      onNotify(res.error || L("Could not update administrator permissions.", "تعذر تحديث الصلاحيات.", lang));
      return;
    }
    setAccounts(res.accounts);
    setEditingId(null);
    onAudit("Updated Admin Access", `${res.updatedAccount?.username} → ${res.updatedAccount?.role}`);
    onNotify(L("Administrator workspace permissions updated.", "تم تحديث صلاحيات المسؤول.", lang));
    onRefreshSession();
  };

  return (
    <div data-testid="admin-access-panel" className="space-y-8">
      {/* Role Policy Matrix Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const mods = getDefaultModulesForRole(role);
          return (
            <div key={role} className="rounded-2xl border border-[var(--hub-border)] hub-surface p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold">{role}</h2>
                <span className="text-xs font-mono tabular-nums text-[var(--hub-text-muted)]">
                  {mods.length}/{ADMIN_WORKSPACE_MODULES.length} {L("modules", "أقسام", lang)}
                </span>
              </div>
              <p className="text-xs text-[var(--hub-text-muted)] leading-relaxed">
                {getRoleSummary(role, lang)}
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Create Administrator Form */}
        <form
          onSubmit={handleCreateAdmin}
          data-testid="create-admin-access-form"
          className="lg:col-span-5 rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[var(--hub-secondary)]" />
            <h2 className="font-display text-lg font-semibold">
              {L("Grant Administrator Access", "منح صلاحية مسؤول جديد", lang)}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="acc-new-user" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("Username", "اسم المستخدم", lang)}
              </label>
              <input
                id="acc-new-user"
                data-testid="new-admin-username"
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="editor.jane"
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="acc-new-name" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                {L("Display Name", "الاسم الظاهر", lang)}
              </label>
              <input
                id="acc-new-name"
                data-testid="new-admin-displayname"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder={L("Editorial Contributor", "محرر تقني", lang)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="acc-new-role" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Administrator Role", "الدور الإداري", lang)}
            </label>
            <select
              id="acc-new-role"
              data-testid="new-admin-role"
              value={newRole}
              onChange={(e) => {
                const nextRole = e.target.value as AdminRole;
                setNewRole(nextRole);
                setNewModules(getDefaultModulesForRole(nextRole));
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Per-Module Workspace Permissions */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-[var(--hub-text-muted)]">
              {L("Permitted Workspace Modules", "أقسام مساحة الإدارة المسموحة", lang)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ADMIN_WORKSPACE_MODULES.map((mod) => {
                const checked =
                  newRole === "Owner" || newModules.includes(mod.id);
                const locked =
                  newRole === "Owner" || mod.id === "overview" || Boolean(mod.ownerOnly);
                return (
                  <label
                    key={mod.id}
                    className={`px-3 py-2 rounded-lg border border-[var(--hub-border)] text-xs flex items-center gap-2 ${
                      locked ? "opacity-75" : "cursor-pointer hover:border-[var(--hub-secondary)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`new-admin-mod-${mod.id}`}
                      checked={checked}
                      disabled={locked}
                      onChange={() => handleToggleModule(newModules, setNewModules, mod.id, newRole)}
                    />
                    <span className="truncate">{L(mod.label.en, mod.label.ar, lang)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="acc-new-pass" className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
              {L("Initial Passphrase (PBKDF2)", "كلمة المرور المبدئية", lang)}
            </label>
            <input
              id="acc-new-pass"
              data-testid="new-admin-passphrase"
              type="password"
              required
              value={newPassphrase}
              onChange={(e) => setNewPassphrase(e.target.value)}
              placeholder="Min 8 chars + number/symbol"
              className="w-full px-3 py-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
            />
            {newPassphrase && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-[var(--hub-text-muted)]">
                <span>{L("Strength", "القوة", lang)}:</span>
                <span>{passStrength.label}</span>
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{formError}</span>
            </p>
          )}

          <button
            type="submit"
            data-testid="create-admin-submit-btn"
            disabled={creating}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{creating ? L("Provisioning...", "جارٍ الإنشاء...", lang) : L("Create Administrator", "إنشاء حساب المسؤول", lang)}</span>
          </button>
        </form>

        {/* Registered Administrators & Fine-Grained Access Matrix */}
        <section className="lg:col-span-7 space-y-6">
          <div
            data-testid="admin-accounts-list"
            className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--hub-secondary)]" />
                <span>{L("Registered Administrators", "حسابات المسؤولين", lang)} ({accounts.length})</span>
              </h2>
              <span className="text-xs font-mono text-[var(--hub-text-muted)]">PBKDF2-SHA-256</span>
            </div>

            <ul className="divide-y divide-[var(--hub-border)]">
              {accounts.map((acc) => {
                const isSelf = acc.id === session.accountId;
                const isLastOwner = acc.role === "Owner" && ownerCount <= 1;
                const effective = resolveEffectiveModules({
                  role: acc.role,
                  allowedModules: acc.allowedModules,
                });
                const isEditing = editingId === acc.id;

                return (
                  <li key={acc.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AuthorAvatar
                          src={acc.avatarUrl || defaultAvatarUrl}
                          name={acc.displayName}
                          sizeClass="w-9 h-9"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {acc.displayName}{" "}
                            <span className="font-mono text-xs text-[var(--hub-text-muted)]">
                              @{acc.username}
                            </span>
                            {isSelf && (
                              <span className="ms-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                                ({L("Current Session", "الجلسة الحالية", lang)})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--hub-text-muted)] font-mono">
                            {acc.role} · {effective.length} {L("modules", "أقسام", lang)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => (isEditing ? setEditingId(null) : startEditing(acc))}
                          className="px-3 py-1.5 rounded-lg border border-[var(--hub-border)] text-xs font-semibold hover:border-[var(--hub-secondary)] cursor-pointer"
                        >
                          {isEditing ? L("Cancel", "إلغاء", lang) : L("Edit Access", "تعديل الصلاحيات", lang)}
                        </button>
                        {!isSelf && !isLastOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = removeAdminAccount(acc.id);
                              setAccounts(next);
                              onAudit("Revoked Admin Account", acc.username);
                              onNotify(L(`Removed administrator @${acc.username}.`, `تم حذف @${acc.username}.`, lang));
                            }}
                            aria-label={`${L("Remove", "حذف", lang)} @${acc.username}`}
                            className="px-2.5 py-1.5 rounded-lg border border-red-500/40 text-xs font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{L("Remove", "حذف", lang)}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="text-xs text-[var(--hub-text-muted)] leading-relaxed">
                        {effective.map((m) => L(
                          ADMIN_WORKSPACE_MODULES.find((d) => d.id === m)?.label.en || m,
                          ADMIN_WORKSPACE_MODULES.find((d) => d.id === m)?.label.ar || m,
                          lang
                        )).join(" · ")}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[var(--hub-border)] hub-subtle p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                              {L("Display Name", "الاسم الظاهر", lang)}
                            </label>
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[var(--hub-text-muted)] block mb-1">
                              {L("Role", "الدور", lang)}
                            </label>
                            <select
                              value={editRole}
                              disabled={isLastOwner}
                              onChange={(e) => {
                                const r = e.target.value as AdminRole;
                                setEditRole(r);
                                setEditModules(getDefaultModulesForRole(r));
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-sm disabled:opacity-60"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ADMIN_WORKSPACE_MODULES.map((mod) => {
                            const checked = editRole === "Owner" || editModules.includes(mod.id);
                            const locked = editRole === "Owner" || mod.id === "overview" || Boolean(mod.ownerOnly);
                            return (
                              <label
                                key={mod.id}
                                className={`px-2.5 py-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-bg)] text-xs flex items-center gap-2 ${
                                  locked ? "opacity-75" : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() =>
                                    handleToggleModule(editModules, setEditModules, mod.id, editRole)
                                  }
                                />
                                <span className="truncate">{L(mod.label.en, mod.label.ar, lang)}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSavePermissions(acc.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--hub-primary)] text-[var(--hub-bg)] inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{L("Save Access Policy", "حفظ الصلاحيات", lang)}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Security & Audit Log */}
          <div className="rounded-2xl border border-[var(--hub-border)] hub-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{L("Workspace Security & Audit Trail", "سجل أمان مساحة الإدارة", lang)}</span>
            </h2>
            {auditLog.length === 0 ? (
              <p className="text-xs text-[var(--hub-text-muted)]">
                {L("No administrative actions logged yet.", "لا توجد عمليات مسجلة بعد.", lang)}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--hub-border)]">
                {auditLog.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="py-2.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <div className="min-w-0 break-words">
                      <span className="font-semibold">{entry.action}</span>
                      <span className="text-[var(--hub-text-muted)]"> — {entry.target}</span>
                      <span className="ms-1.5 font-mono text-[var(--hub-text-muted)]">({entry.actor})</span>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-[var(--hub-text-muted)] shrink-0">
                      {formatDateTime(entry.timestamp, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

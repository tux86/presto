import type { LucideIcon } from "lucide-react";
import { BarChart3, Briefcase, Building2, Download, Ellipsis, Home, LogOut, Search, Users } from "lucide-react";
import { type FormEvent, useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import { ApiError, api } from "@/api/client";
import { LogoHorizontal } from "@/components/icons/LogoHorizontal";
import { PreferencesControls, PreferencesMenu } from "@/components/layout/PreferencesMenu";
import { Button } from "@/components/ui/Button";
import { triggerCommandPalette } from "@/components/ui/CommandPalette";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useConfigStore } from "@/stores/config.store";

export function Sidebar() {
  const { user, logout, updateProfile, changePassword, deleteAccount } = useAuthStore();
  const authDisabled = useConfigStore((s) => s.config?.authDisabled ?? false);
  const demoMode = useConfigStore((s) => s.config?.demoMode ?? false);
  const { t } = useT();
  const isMobile = useIsMobile();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "password" | "account">("profile");
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");

  const resetPasswordState = useCallback(() => {
    setProfileTab("profile");
    setPwForm({ current: "", new: "", confirm: "" });
    setPwError("");
    setPwSuccess(false);
    setDeleteExpanded(false);
    setDeletePassword("");
    setDeleteError("");
  }, []);

  const openProfileModal = () => {
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    });
    resetPasswordState();
    setProfileOpen(true);
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
      });
      setProfileOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (pwForm.new !== pwForm.confirm) {
      setPwError(t("profile.passwordMismatch"));
      return;
    }

    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.new);
      setPwSuccess(true);
      setPwForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPwError(t("profile.wrongPassword"));
      } else if (err instanceof ApiError && err.status === 400) {
        setPwError(t("profile.passwordRequirements"));
      } else {
        setPwError(t("auth.genericError"));
      }
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setDeleteError(t("profile.wrongPassword"));
      } else {
        setDeleteError(t("auth.genericError"));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    setExportError("");
    try {
      const res = await api.getBlob("/auth/export-data");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? "presto-export.json";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("auth.genericError"));
    } finally {
      setExportLoading(false);
    }
  };

  const navItems: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/", label: t("nav.activities"), icon: Home },
    { to: "/clients", label: t("nav.clients"), icon: Users },
    { to: "/missions", label: t("nav.missions"), icon: Briefcase },
    { to: "/companies", label: t("nav.companies"), icon: Building2 },
    { to: "/reporting", label: t("nav.reporting"), icon: BarChart3 },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profileModal = (
    <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title={t("profile.title")} size="md">
      <div className="mb-4 flex gap-1 rounded-lg bg-inset p-1">
        {(demoMode
          ? (["profile"] as const)
          : authDisabled
            ? (["profile", "account"] as const)
            : (["profile", "password", "account"] as const)
        ).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setProfileTab(tab);
              setPwError("");
              setPwSuccess(false);
              setDeleteExpanded(false);
              setDeletePassword("");
              setDeleteError("");
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              profileTab === tab ? "bg-panel text-heading shadow-sm" : "text-muted hover:text-body",
            )}
          >
            {t(
              tab === "profile"
                ? "profile.tabProfile"
                : tab === "password"
                  ? "profile.tabPassword"
                  : "profile.tabAccount",
            )}
          </button>
        ))}
      </div>

      {profileTab === "profile" && (
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input label={t("auth.email")} value={user?.email ?? ""} disabled />
          <Input
            label={t("profile.firstName")}
            value={profileForm.firstName}
            onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
            required
            disabled={demoMode}
          />
          <Input
            label={t("profile.lastName")}
            value={profileForm.lastName}
            onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
            required
            disabled={demoMode}
          />
          {!demoMode && (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={() => setProfileOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                loading={profileSaving}
                disabled={!profileForm.firstName.trim() || !profileForm.lastName.trim()}
              >
                {t("common.save")}
              </Button>
            </div>
          )}
        </form>
      )}

      {profileTab === "password" && (
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label={t("profile.currentPassword")}
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            required
            autoComplete="current-password"
          />
          <Input
            label={t("profile.newPassword")}
            type="password"
            value={pwForm.new}
            onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
            required
            hint={t("profile.passwordRequirements")}
            autoComplete="new-password"
          />
          <Input
            label={t("profile.confirmPassword")}
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            required
            autoComplete="new-password"
          />

          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">{t("profile.passwordChanged")}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setProfileOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={pwSaving} disabled={!pwForm.current || !pwForm.new || !pwForm.confirm}>
              {t("profile.changePassword")}
            </Button>
          </div>
        </form>
      )}

      {profileTab === "account" && (
        <div className="space-y-4">
          {!demoMode && (
            <>
              <Button variant="ghost" size="sm" type="button" onClick={handleExportData} loading={exportLoading}>
                <Download className="h-4 w-4" />
                {t("profile.downloadData")}
              </Button>
              {exportError && <p className="text-sm text-red-500">{exportError}</p>}
            </>
          )}

          {!authDisabled && !demoMode && (
            <>
              <div className="border-t border-edge" />
              {!deleteExpanded ? (
                <Button variant="danger" size="sm" type="button" onClick={() => setDeleteExpanded(true)}>
                  {t("profile.deleteAccount")}
                </Button>
              ) : (
                <form onSubmit={handleDeleteAccount} className="space-y-3">
                  <p className="text-sm text-muted">{t("profile.deleteAccountWarning")}</p>
                  <Input
                    label={t("profile.deleteAccountConfirm")}
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setDeleteExpanded(false);
                        setDeletePassword("");
                        setDeleteError("");
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" variant="danger" loading={deleteLoading} disabled={!deletePassword}>
                      {t("profile.deleteAccountButton")}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );

  if (isMobile) {
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-edge bg-panel safe-bottom">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] transition-colors",
                  isActive ? "text-accent" : "text-muted",
                )
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] transition-colors cursor-pointer",
              mobileMenuOpen ? "text-accent" : "text-muted",
            )}
          >
            <Ellipsis className="h-5 w-5" strokeWidth={1.5} />
            <span>{t("nav.more")}</span>
          </button>
        </nav>

        {/* Mobile menu bottom sheet */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-panel border-t border-edge safe-bottom">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-edge" />
              </div>

              <div className="px-5 pb-5 space-y-5">
                {/* Preferences */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-heading">{t("preferences.title")}</p>
                  <PreferencesControls />
                </div>

                {/* User + logout */}
                <div className="border-t border-edge pt-4 space-y-3">
                  <p className="text-xs font-medium text-faint uppercase tracking-wider">{t("profile.title")}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openProfileModal();
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent-text text-xs font-medium">
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </div>
                      <p className="text-sm font-medium text-heading truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                    </button>
                    {!authDisabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                        className="text-sm text-muted hover:text-body transition-colors cursor-pointer"
                      >
                        {t("common.logout")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {profileModal}
      </>
    );
  }

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-56 flex flex-col bg-panel border-r border-edge">
        {/* Logo */}
        <div className="px-4 pt-4 pb-3">
          <LogoHorizontal className="h-8" />
        </div>

        {/* Search trigger */}
        <div className="px-3 mb-3">
          <button
            type="button"
            onClick={() => triggerCommandPalette()}
            className="flex items-center gap-2 w-full rounded-lg border border-edge bg-inset px-3 py-1.5 text-sm text-faint hover:text-muted hover:border-muted/30 transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="flex-1 text-left">{t("common.search")}</span>
            <kbd className="text-[10px] text-faint/70 font-mono">
              {navigator.platform.includes("Mac") ? "\u2318K" : "Ctrl+K"}
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-elevated text-heading" : "text-muted hover:text-body hover:bg-elevated/50",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Preferences */}
        <div className="px-3 py-2">
          <PreferencesMenu />
        </div>

        {/* User */}
        <div className="border-t border-edge px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={openProfileModal}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent-text text-xs font-medium">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <p className="text-sm font-medium text-heading truncate">
              {user?.firstName} {user?.lastName}
            </p>
          </button>
          {!authDisabled && (
            <button
              type="button"
              onClick={logout}
              className="text-faint hover:text-muted transition-colors cursor-pointer"
              title={t("common.logout")}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </aside>

      {profileModal}
    </>
  );
}

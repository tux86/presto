import { Download } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/i18n";
import { cn, downloadBlob } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useConfigStore } from "@/stores/config.store";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, updateProfile, changePassword, deleteAccount } = useAuthStore();
  const authDisabled = useConfigStore((s) => s.config?.authDisabled ?? false);
  const demoMode = useConfigStore((s) => s.config?.demoMode ?? false);
  const { t } = useT();

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

  const resetState = useCallback(() => {
    setProfileTab("profile");
    setPwForm({ current: "", new: "", confirm: "" });
    setPwError("");
    setPwSuccess(false);
    setDeleteExpanded(false);
    setDeletePassword("");
    setDeleteError("");
  }, []);

  // Sync form state when modal opens
  useEffect(() => {
    if (open) {
      setProfileForm({
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
      });
      resetState();
    }
  }, [open, user, resetState]);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
      });
      onOpenChange(false);
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
      await downloadBlob(res, "presto-export.json");
    } catch {
      setExportError(t("auth.genericError"));
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title={t("profile.title")} size="md">
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
              <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
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
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
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
}

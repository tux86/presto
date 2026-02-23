import type { LucideIcon } from "lucide-react";
import { BarChart3, Briefcase, Ellipsis, Home, LogOut, Search, Users } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LogoHorizontal } from "@/components/icons/LogoHorizontal";
import { PreferencesControls, PreferencesMenu } from "@/components/layout/PreferencesMenu";
import { triggerCommandPalette } from "@/components/ui/CommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useConfigStore } from "@/stores/config.store";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const authEnabled = useConfigStore((s) => s.config?.authEnabled ?? true);
  const { t } = useT();
  const isMobile = useIsMobile();

  const navItems: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/", label: t("nav.activities"), icon: Home },
    { to: "/clients", label: t("nav.clients"), icon: Users },
    { to: "/missions", label: t("nav.missions"), icon: Briefcase },
    { to: "/reporting", label: t("nav.reporting"), icon: BarChart3 },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                  <PreferencesControls iconSize="h-4 w-4" />
                </div>

                {/* User + logout */}
                {authEnabled && (
                  <div className="border-t border-edge pt-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle text-accent-text text-xs font-medium">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                    </div>
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
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
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
      {authEnabled && (
        <div className="border-t border-edge px-4 py-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-accent-text text-xs font-medium">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-heading truncate">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-faint hover:text-muted transition-colors cursor-pointer"
            title={t("common.logout")}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </aside>
  );
}

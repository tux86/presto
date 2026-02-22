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

const navIcons = {
  activities:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  clients:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  missions:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  reporting:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const authEnabled = useConfigStore((s) => s.config?.authEnabled ?? true);
  const { t } = useT();
  const isMobile = useIsMobile();

  const navItems = [
    { to: "/", label: t("nav.activities"), icon: navIcons.activities },
    { to: "/clients", label: t("nav.clients"), icon: navIcons.clients },
    { to: "/missions", label: t("nav.missions"), icon: navIcons.missions },
    { to: "/reporting", label: t("nav.reporting"), icon: navIcons.reporting },
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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
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
        <LogoHorizontal className="h-9" />
      </div>

      {/* Search trigger */}
      <div className="px-3 mb-3">
        <button
          type="button"
          onClick={() => triggerCommandPalette()}
          className="flex items-center gap-2 w-full rounded-lg border border-edge bg-inset px-3 py-1.5 text-sm text-faint hover:text-muted hover:border-muted/30 transition-colors cursor-pointer"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
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
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
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
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}

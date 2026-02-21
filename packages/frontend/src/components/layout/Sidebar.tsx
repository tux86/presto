import { NavLink } from "react-router-dom";
import { LogoHorizontal } from "@/components/icons/LogoHorizontal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useConfigStore } from "@/stores/config.store";
import { useThemeStore } from "@/stores/theme.store";

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

const themeIcons = {
  light:
    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  dark: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  auto: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const authEnabled = useConfigStore((s) => s.config?.authEnabled ?? true);
  const { mode, setMode } = useThemeStore();
  const { t } = useT();
  const isMobile = useIsMobile();

  const navItems = [
    { to: "/", label: t("nav.activities"), icon: navIcons.activities },
    { to: "/clients", label: t("nav.clients"), icon: navIcons.clients },
    { to: "/missions", label: t("nav.missions"), icon: navIcons.missions },
    { to: "/reporting", label: t("nav.reporting"), icon: navIcons.reporting },
  ];

  const themeLabel = mode === "dark" ? t("theme.dark") : mode === "light" ? t("theme.light") : t("theme.auto");

  const cycleTheme = () => {
    const next = mode === "dark" ? "light" : mode === "light" ? "auto" : "dark";
    setMode(next);
  };

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-edge bg-panel safe-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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
      </nav>
    );
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 flex flex-col bg-panel border-r border-edge">
      {/* Logo */}
      <div className="px-5 py-5">
        <LogoHorizontal className="h-8" />
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

      {/* Theme toggle + shortcut hint */}
      <div className="px-4 py-2 space-y-2">
        <button
          onClick={cycleTheme}
          className="flex items-center gap-2 text-[11px] text-muted hover:text-body transition-colors w-full rounded-md px-1 py-1 hover:bg-elevated/50 cursor-pointer"
          title={themeLabel}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={themeIcons[mode]} />
          </svg>
          <span className="capitalize">{themeLabel}</span>
        </button>
        <div className="flex items-center gap-2 text-[11px] text-faint px-1">
          <kbd className="rounded border border-edge px-1.5 py-0.5">
            {navigator.platform.includes("Mac") ? "\u2318" : "Ctrl"}
          </kbd>
          <kbd className="rounded border border-edge px-1.5 py-0.5">K</kbd>
          <span>{t("common.search").replace("...", "")}</span>
        </div>
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

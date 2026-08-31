import {
  BarChart3,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  Menu,
  Moon,
  Sun,
  SunMoon,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { Locale } from "../../core/types.ts";
import type { TranslationKey } from "../../i18n/index.ts";
import { cn } from "../format.ts";
import { type Theme, usePrefs } from "../prefs.tsx";
import { useStore } from "../store.tsx";

const NAV: { to: string; key: TranslationKey; icon: typeof CalendarDays }[] = [
  { to: "/", key: "nav.reports", icon: CalendarDays },
  { to: "/summary", key: "nav.summary", icon: BarChart3 },
  { to: "/clients", key: "nav.clients", icon: Users },
  { to: "/missions", key: "nav.missions", icon: Wrench },
  { to: "/companies", key: "nav.companies", icon: Building2 },
];

const REPO = "https://github.com/tux86/presto";

/**
 * Version and the three links a self-hosted user actually needs: what changed,
 * where the code is, and under what licence. Inline rather than behind an
 * "About" dialog — three links do not warrant a modal.
 */
function About({ version }: { version: string }) {
  const { t } = usePrefs();
  const links = [
    version ? { href: `${REPO}/releases/tag/v${version}`, label: t("about.releaseNotes") } : null,
    { href: REPO, label: t("about.source") },
    { href: `${REPO}/blob/main/LICENSE`, label: t("about.license") },
  ].filter((l) => l !== null);

  return (
    <div className="px-4 pt-3 pb-4">
      {version ? <div className="mb-1 font-mono text-[11px] text-faint">v{version}</div> : null}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-relaxed">
        {links.map((link, i) => (
          <span key={link.href} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-faint/50">·</span> : null}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-faint transition-colors hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {link.label}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The "hide balance" button of a banking app: one click blurs every amount on
 * screen before a screen share or a screenshot. It lives in the sidebar next to
 * the other preferences, and again in the mobile header where the sidebar is a
 * menu away — a toggle you have to go looking for is one you use too late.
 */
function PrivacyToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { hideAmounts, toggleHideAmounts, t } = usePrefs();
  const Icon = hideAmounts ? EyeOff : Eye;
  const label = t(hideAmounts ? "privacy.show" : "privacy.hide");

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={hideAmounts}
      onClick={toggleHideAmounts}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-lg transition-colors",
        iconOnly ? "p-1.5" : "w-full bg-elevated px-2.5 py-1.5 text-xs font-medium",
        hideAmounts ? "text-accent-text" : "text-muted hover:text-heading",
        !iconOnly && hideAmounts && "bg-accent-soft",
      )}
    >
      <Icon className={iconOnly ? "size-5" : "size-3.5"} />
      {iconOnly ? null : label}
    </button>
  );
}

const THEMES: { value: Theme; icon: typeof Sun; key: TranslationKey }[] = [
  { value: "light", icon: Sun, key: "theme.light" },
  { value: "dark", icon: Moon, key: "theme.dark" },
  { value: "auto", icon: SunMoon, key: "theme.auto" },
];

function Preferences() {
  const { theme, setTheme, locale, setLocale, t } = usePrefs();
  return (
    <div className="space-y-3 border-t border-edge px-3 py-3">
      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-faint">{t("settings.theme")}</span>
        <div className="flex gap-1 rounded-lg bg-elevated p-1">
          {THEMES.map(({ value, icon: Icon, key }) => (
            <button
              key={value}
              type="button"
              title={t(key)}
              aria-label={t(key)}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center rounded-md py-1.5 transition-colors",
                theme === value ? "bg-panel text-heading shadow-sm" : "text-muted hover:text-heading",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-faint">{t("settings.language")}</span>
        <div className="flex gap-1 rounded-lg bg-elevated p-1">
          {(["en", "fr"] as Locale[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={locale === value}
              onClick={() => setLocale(value)}
              className={cn(
                "flex-1 cursor-pointer rounded-md py-1.5 text-xs font-medium uppercase transition-colors",
                locale === value ? "bg-panel text-heading shadow-sm" : "text-muted hover:text-heading",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-faint">{t("settings.privacy")}</span>
        <PrivacyToggle />
      </div>
    </div>
  );
}

/**
 * The logo, or the configured name when APP_NAME has been changed — shipping
 * the Presto wordmark for an app someone has renamed would be wrong.
 *
 * Two images rather than one themed SVG, so the swap needs no JavaScript. The
 * file suffix describes the logo's own colour, not the theme it belongs to:
 * the *light* logo is the one that goes on a *dark* background.
 */
function Wordmark({ name, className }: { name: string; className?: string }) {
  if (name !== "Presto") {
    return <span className={cn("text-xl font-semibold tracking-tight text-heading", className)}>{name}</span>;
  }
  // 95 × 24 in the file; height drives the size and width follows the ratio.
  return (
    <>
      <img
        src="/logo-horizontal-dark.svg"
        alt="Presto"
        width={95}
        height={24}
        className={cn("w-auto dark:hidden", className)}
      />
      <img
        src="/logo-horizontal-light.svg"
        alt=""
        aria-hidden
        width={95}
        height={24}
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { app } = useStore();
  const { t } = usePrefs();

  return (
    <div className="flex h-full flex-col">
      {/* No tagline: the first nav item already says what this is. */}
      <div className="px-5 pt-7 pb-6">
        <NavLink
          to="/"
          onClick={onNavigate}
          className="inline-block rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Wordmark name={app.name} className="h-8" />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-elevated hover:text-heading",
              )
            }
          >
            <Icon className="size-4" />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      <Preferences />
      <About version={app.version} />
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { app } = useStore();

  // Follow APP_NAME in the browser tab, not just the sidebar.
  useEffect(() => {
    document.title = app.name;
  }, [app.name]);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-56 shrink-0 border-r border-edge bg-panel lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-edge bg-panel px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="cursor-pointer text-muted hover:text-heading"
        >
          <Menu className="size-5" />
        </button>
        <Wordmark name={app.name} className="h-7" />
        <div className="ml-auto">
          <PrivacyToggle iconOnly />
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-default bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-edge bg-panel">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 cursor-pointer text-faint hover:text-heading"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-heading sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

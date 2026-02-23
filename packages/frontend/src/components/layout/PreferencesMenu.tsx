import { CURRENCIES, getCurrencyLabel } from "@presto/shared";
import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { type Locale, type ThemeMode, usePreferencesStore } from "@/stores/preferences.store";

const themeOptions: { value: ThemeMode; icon: LucideIcon }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "auto", icon: Monitor },
];

const localeOptions: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "us" },
  { value: "fr", label: "Fran\u00e7ais", flag: "fr" },
  { value: "de", label: "Deutsch", flag: "de" },
  { value: "es", label: "Espa\u00f1ol", flag: "es" },
  { value: "pt", label: "Portugu\u00eas", flag: "pt" },
];

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  renderOption: (option: T) => React.ReactNode;
}) {
  return (
    <div className="flex rounded-lg bg-inset p-0.5 gap-0.5">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "flex-1 flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            value === option ? "bg-elevated text-heading shadow-sm" : "text-muted hover:text-body",
          )}
        >
          {renderOption(option)}
        </button>
      ))}
    </div>
  );
}

export function PreferencesControls({ iconSize = "h-4 w-4" }: { iconSize?: string }) {
  const { t, locale: currentLocale } = useT();
  const theme = usePreferencesStore((s) => s.theme);
  const locale = usePreferencesStore((s) => s.locale);
  const baseCurrency = usePreferencesStore((s) => s.baseCurrency);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const setLocale = usePreferencesStore((s) => s.setLocale);
  const setBaseCurrency = usePreferencesStore((s) => s.setBaseCurrency);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-xs text-muted">{t("preferences.theme")}</span>
        <SegmentedControl
          options={themeOptions.map((o) => o.value)}
          value={theme}
          onChange={setTheme}
          renderOption={(v) => {
            const opt = themeOptions.find((o) => o.value === v)!;
            return (
              <opt.icon
                className={iconSize}
                strokeWidth={1.5}
                aria-label={t(`theme.${v}` as "theme.dark" | "theme.light" | "theme.auto")}
              />
            );
          }}
        />
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted">{t("preferences.language")}</span>
        <div className="grid grid-cols-1 gap-0.5 rounded-lg bg-inset p-0.5">
          {localeOptions.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => setLocale(o.value)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                locale === o.value ? "bg-elevated text-heading shadow-sm" : "text-muted hover:text-body",
              )}
            >
              <span className={`fi fi-${o.flag} fis rounded-sm`} style={{ fontSize: "13px" }} />
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted">{t("preferences.baseCurrency")}</span>
        <select
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          className="w-full rounded-lg bg-inset px-2.5 py-1.5 text-sm text-body border-none outline-none cursor-pointer"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {getCurrencyLabel(code, currentLocale)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PreferencesMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="relative">
      {/* Popover */}
      {open && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 mb-1.5 right-0 rounded-lg border border-edge bg-panel shadow-lg p-3 space-y-3 z-50"
        >
          <p className="text-sm font-medium text-heading">{t("preferences.title")}</p>
          <PreferencesControls />
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 text-sm text-muted hover:text-body transition-colors w-full rounded-lg px-3 py-2 hover:bg-elevated/50 cursor-pointer"
        title={t("preferences.title")}
      >
        <Settings className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{t("preferences.title")}</span>
      </button>
    </div>
  );
}

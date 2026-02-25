import { CURRENCIES, getCurrencyName, getCurrencySymbol } from "@presto/shared";
import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
            "flex-1 flex items-center justify-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors cursor-pointer",
            value === option ? "bg-elevated text-heading shadow-sm" : "text-muted hover:text-body",
          )}
        >
          {renderOption(option)}
        </button>
      ))}
    </div>
  );
}

export function PreferencesControls() {
  const { t, locale: currentLocale } = useT();
  const theme = usePreferencesStore((s) => s.theme);
  const locale = usePreferencesStore((s) => s.locale);
  const baseCurrency = usePreferencesStore((s) => s.baseCurrency);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const setLocale = usePreferencesStore((s) => s.setLocale);
  const setBaseCurrency = usePreferencesStore((s) => s.setBaseCurrency);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{t("preferences.theme")}</span>
        <SegmentedControl
          options={themeOptions.map((o) => o.value)}
          value={theme}
          onChange={setTheme}
          renderOption={(v) => {
            const opt = themeOptions.find((o) => o.value === v)!;
            return (
              <>
                <opt.icon className="h-4 w-4" strokeWidth={1.5} />
                {t(`theme.${v}` as "theme.dark" | "theme.light" | "theme.auto")}
              </>
            );
          }}
        />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{t("preferences.language")}</span>
        <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-inset p-0.5">
          {localeOptions.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => setLocale(o.value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors cursor-pointer",
                locale === o.value ? "bg-elevated text-heading shadow-sm" : "text-muted hover:text-body",
              )}
            >
              <span className={`fi fi-${o.flag} rounded-sm shrink-0 !leading-none`} style={{ width: "1.5em" }} />
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1 border-t border-edge pt-5">
        <div>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            {t("preferences.baseCurrency")}
          </span>
          <p className="text-xs text-faint mt-0.5">{t("preferences.baseCurrencyHint")}</p>
        </div>
        <SearchableSelect
          value={baseCurrency}
          onChange={setBaseCurrency}
          options={CURRENCIES.map((c) => {
            const symbol = getCurrencySymbol(c, currentLocale);
            const name = getCurrencyName(c, currentLocale);
            return { value: c, label: symbol !== c ? `${symbol} ${name}` : name };
          })}
        />
      </div>
    </div>
  );
}

export function PreferencesMenu() {
  const [open, setOpen] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!open) return;
    // Close on Escape
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    // Lock body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 text-sm text-muted hover:text-body transition-colors w-full rounded-lg px-3 py-2 hover:bg-elevated/50 cursor-pointer"
        title={t("preferences.title")}
      >
        <Settings className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{t("preferences.title")}</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative z-10 w-full max-w-sm rounded-xl border border-edge bg-panel shadow-xl p-6">
              <h2 className="text-base font-semibold text-heading mb-5">{t("preferences.title")}</h2>
              <PreferencesControls />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

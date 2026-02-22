import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { type Locale, type ThemeMode, usePreferencesStore } from "@/stores/preferences.store";

export const themeOptions: { value: ThemeMode; icon: string }[] = [
  {
    value: "light",
    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    value: "dark",
    icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  },
  {
    value: "auto",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
];

export const localeOptions: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
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
            "flex-1 flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
            value === option ? "bg-elevated text-heading shadow-sm" : "text-muted hover:text-body",
          )}
        >
          {renderOption(option)}
        </button>
      ))}
    </div>
  );
}

export function PreferencesControls({ iconSize = "h-3.5 w-3.5" }: { iconSize?: string }) {
  const { t } = useT();
  const theme = usePreferencesStore((s) => s.theme);
  const locale = usePreferencesStore((s) => s.locale);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const setLocale = usePreferencesStore((s) => s.setLocale);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-[11px] text-muted">{t("preferences.theme")}</span>
        <SegmentedControl
          options={themeOptions.map((o) => o.value)}
          value={theme}
          onChange={setTheme}
          renderOption={(v) => {
            const opt = themeOptions.find((o) => o.value === v)!;
            return (
              <svg
                className={iconSize}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-label={t(`theme.${v}` as "theme.dark" | "theme.light" | "theme.auto")}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
              </svg>
            );
          }}
        />
      </div>
      <div className="space-y-1">
        <span className="text-[11px] text-muted">{t("preferences.language")}</span>
        <SegmentedControl
          options={localeOptions.map((o) => o.value)}
          value={locale}
          onChange={setLocale}
          renderOption={(v) => localeOptions.find((o) => o.value === v)!.label}
        />
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
          <p className="text-xs font-medium text-heading">{t("preferences.title")}</p>
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
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>{t("preferences.title")}</span>
      </button>
    </div>
  );
}

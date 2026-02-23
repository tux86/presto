import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  hint?: string;
}

export function SearchableSelect({
  label,
  optional,
  value,
  onChange,
  options,
  placeholder,
  hint,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useT();

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())) : options;

  // Position the dropdown relative to the button, measuring actual height
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !dropdownRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current.getBoundingClientRect().height;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldDropUp = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8;
    setDropUp(shouldDropUp);
    setPos({
      top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setSearch("");
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const selectId = label?.toLowerCase().replace(/\s+/g, "-");

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            ...(dropUp ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
          }}
          className="z-[100] rounded-lg border border-edge bg-panel shadow-lg"
        >
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full rounded-md border border-edge bg-elevated px-3 py-1.5 text-sm text-heading placeholder:text-placeholder outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-faint">{t("common.noResults")}</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors",
                      option.value === value
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-heading hover:bg-elevated",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="space-y-1.5">
      {label && (
        <div>
          <label htmlFor={selectId} className="block text-sm font-medium text-muted">
            {label}
            {optional && <span className="ml-1 text-xs font-normal text-faint">({t("common.optional")})</span>}
          </label>
          {hint && <p className="text-xs text-faint mt-0.5">{hint}</p>}
        </div>
      )}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading text-left outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent cursor-pointer",
          !selectedOption && "text-placeholder",
        )}
      >
        {selectedOption?.label || placeholder || "\u00A0"}
      </button>
      {dropdown}
    </div>
  );
}

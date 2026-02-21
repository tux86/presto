import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "@/i18n";

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useT();

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: t("dashboard.title"),
        section: t("common.navigation"),
        icon: "~",
        action: () => navigate("/"),
      },
      {
        id: "activities",
        label: t("nav.activities"),
        section: t("common.navigation"),
        icon: "#",
        action: () => navigate("/"),
      },
      {
        id: "clients",
        label: t("nav.clients"),
        section: t("common.navigation"),
        icon: "@",
        action: () => navigate("/clients"),
      },
      {
        id: "missions",
        label: t("nav.missions"),
        section: t("common.navigation"),
        icon: "!",
        action: () => navigate("/missions"),
      },
      {
        id: "reporting",
        label: t("nav.reporting"),
        section: t("common.navigation"),
        icon: "%",
        action: () => navigate("/reporting"),
      },
    ],
    [navigate, t],
  );

  const filtered = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(lower) || c.section.toLowerCase().includes(lower));
  }, [query, commands]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[20vh] bg-overlay"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-edge bg-panel shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-edge px-4">
          <span className="text-muted text-sm">&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("common.search")}
            className="w-full bg-transparent py-3.5 text-sm text-heading placeholder:text-placeholder outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-edge px-1.5 py-0.5 text-[10px] text-faint">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{t("common.noResults")}</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                  i === selectedIndex ? "bg-accent-subtle text-accent-text" : "text-body hover:bg-elevated"
                }`}
                onClick={() => {
                  cmd.action();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-elevated text-xs font-mono text-muted">
                  {cmd.icon}
                </span>
                <span>{cmd.label}</span>
                <span className="ml-auto text-xs text-faint">{cmd.section}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

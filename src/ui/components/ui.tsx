import { Loader2, X } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react";
import { cn } from "../format.ts";
import { useT } from "../prefs.tsx";

// ── Button ───────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-sm",
  secondary: "bg-panel text-body border border-edge hover:bg-elevated",
  ghost: "text-muted hover:text-heading hover:bg-elevated",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  busy?: boolean;
}

export function Button({ variant = "primary", size = "md", busy, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2",
        VARIANTS[variant],
        className,
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────

const CONTROL =
  "w-full rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-body placeholder:text-placeholder " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-accent disabled:opacity-60";

/**
 * Label, control, hint and error as one block.
 *
 * The control is wrapped rather than referenced by id, which is a valid
 * implicit label association; `htmlFor` would need an id threaded through
 * every caller for no benefit to assistive technology.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className={cn("block", className)}>
      {label ? <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span> : null}
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(CONTROL, className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(CONTROL, "resize-y min-h-20 leading-relaxed", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(CONTROL, "cursor-pointer", className)}>
      {children}
    </select>
  );
}

/** A searchable picker for long lists (currencies, countries) using a datalist. */
export function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
}) {
  const generated = useId();
  const listId = id ?? generated;
  return (
    <>
      <input
        list={listId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </datalist>
    </>
  );
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-edge bg-panel", className)}>{children}</div>;
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "success";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-elevated text-muted border-edge",
    accent: "bg-accent-soft text-accent-text border-transparent",
    success: "bg-success/10 text-success border-transparent",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-edge px-6 py-14 text-center">
      {icon ? <div className="mb-3 flex justify-center text-faint">{icon}</div> : null}
      <p className="text-base font-medium text-muted">{title}</p>
      {hint ? <p className="mt-1 text-sm text-faint">{hint}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);

  // <dialog> gives focus trapping, Escape and inertness for free.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-xl border border-edge bg-panel p-0 text-body shadow-2xl",
        "backdrop:bg-black/40 backdrop:backdrop-blur-[2px]",
        wide ? "max-w-2xl" : "max-w-md",
      )}
    >
      {open ? (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-base font-semibold text-heading">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="-m-1 cursor-pointer rounded p-1 text-faint hover:text-heading"
            >
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2">{children}</div>;
}

/** Inline error text for a failed mutation. */
export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>;
}

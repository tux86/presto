import { forwardRef, type InputHTMLAttributes } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, optional, suffix, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const { t } = useT();
    return (
      <div className="space-y-1.5">
        {label && (
          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-muted">
              {label}
              {optional && <span className="ml-1 text-xs font-normal text-faint">({t("common.optional")})</span>}
            </label>
            {hint && <p className="text-xs text-faint mt-0.5">{hint}</p>}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading placeholder:text-placeholder outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:bg-inset disabled:text-muted disabled:opacity-100",
              error && "border-error focus:border-error focus:ring-error",
              suffix && "pr-14",
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

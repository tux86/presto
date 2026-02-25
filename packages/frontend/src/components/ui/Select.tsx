import { forwardRef, type SelectHTMLAttributes } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, optional, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const { t } = useT();
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-muted">
            {label}
            {optional && <span className="ml-1 text-xs font-normal text-faint">({t("common.optional")})</span>}
            {hint && <p className="text-xs text-faint mt-0.5 font-normal">{hint}</p>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent",
            error && "border-error focus:border-error focus:ring-error",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

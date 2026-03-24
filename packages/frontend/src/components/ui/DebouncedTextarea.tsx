import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DebouncedTextareaProps {
  value: string | null;
  onChange: (value: string | null) => void;
  delay?: number;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DebouncedTextarea({
  value,
  onChange,
  delay = 500,
  rows = 5,
  maxLength = 2000,
  placeholder,
  disabled,
  className,
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(val || null);
      }, delay);
    },
    [onChange, delay],
  );

  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-edge bg-elevated px-3 py-2 text-sm text-body placeholder:text-faint resize-y focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      value={localValue}
      disabled={disabled}
      onChange={handleChange}
    />
  );
}

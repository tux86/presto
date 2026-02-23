import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: keyof typeof SIZE_MAP;
}

export function Modal({ open, onClose, title, children, className, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "w-full rounded-xl bg-panel border border-edge shadow-2xl p-6 max-h-[85vh] overflow-y-auto",
          SIZE_MAP[size],
          className,
        )}
      >
        {title && <h2 className="text-lg font-semibold text-heading mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

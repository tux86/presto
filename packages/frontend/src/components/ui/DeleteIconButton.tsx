import { Trash2 } from "lucide-react";

interface DeleteIconButtonProps {
  onClick: () => void;
  title?: string;
}

export function DeleteIconButton({ onClick, title }: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="p-1.5 rounded-md text-faint hover:text-error hover:bg-error-subtle transition-colors cursor-pointer"
      title={title}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

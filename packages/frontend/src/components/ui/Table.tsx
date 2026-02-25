import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  mobileRender?: (item: T) => React.ReactNode;
}

export function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = "",
  emptyIcon,
  mobileRender,
}: TableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-panel p-12 text-center">
        {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  if (isMobile && mobileRender) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border border-edge bg-panel p-4 space-y-1 transition-colors",
              onRowClick &&
                "cursor-pointer hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(item)}
            onKeyDown={
              onRowClick
                ? (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  }
                : undefined
            }
          >
            {mobileRender(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-edge">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-edge bg-elevated">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {data.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "bg-panel transition-colors group",
                  onRowClick &&
                    "cursor-pointer hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                )}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(item)}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-sm", col.className)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
}

export function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = "",
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-edge bg-panel p-12 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
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
                  col.className
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
                "bg-panel transition-colors",
                onRowClick && "cursor-pointer hover:bg-elevated"
              )}
              onClick={() => onRowClick?.(item)}
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

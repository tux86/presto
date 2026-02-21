import { cn } from "@/lib/utils";

interface SkeletonProps {
  count?: number;
  height?: string;
  className?: string;
  grid?: string;
}

export function Skeleton({ count = 3, height = "h-14", className, grid }: SkeletonProps) {
  const items = [...Array(count)].map((_, i) => (
    <div key={i} className={cn(height, "bg-panel border border-edge rounded-xl animate-pulse", className)} />
  ));

  if (grid) {
    return <div className={grid}>{items}</div>;
  }

  return <div className="space-y-2">{items}</div>;
}

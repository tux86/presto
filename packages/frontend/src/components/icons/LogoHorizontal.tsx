import { useIsDark } from "@/hooks/use-dark";

interface LogoHorizontalProps {
  className?: string;
}

export function LogoHorizontal({ className }: LogoHorizontalProps) {
  const isDark = useIsDark();
  return (
    <img src={isDark ? "/logo-horizontal-light.svg" : "/logo-horizontal-dark.svg"} alt="Presto" className={className} />
  );
}

import { useIsDark } from "@/hooks/use-dark";

interface LogoVerticalProps {
  className?: string;
}

export function LogoVertical({ className }: LogoVerticalProps) {
  const isDark = useIsDark();
  return (
    <img src={isDark ? "/logo-vertical-light.svg" : "/logo-vertical-dark.svg"} alt="Presto" className={className} />
  );
}

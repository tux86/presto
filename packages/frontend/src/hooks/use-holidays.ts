import { useMemo } from "react";
import { getFrenchHolidays, type Holiday } from "@presto/shared";

export function useHolidays(year: number): Holiday[] {
  return useMemo(() => getFrenchHolidays(year), [year]);
}

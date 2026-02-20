import { getFrenchHolidays, type Holiday } from "@presto/shared";
import { useMemo } from "react";

export function useHolidays(year: number): Holiday[] {
  return useMemo(() => getFrenchHolidays(year), [year]);
}

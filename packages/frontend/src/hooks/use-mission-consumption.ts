import type { MissionConsumption } from "@presto/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMissionConsumption(year: number) {
  return useQuery<MissionConsumption[]>({
    queryKey: ["reporting", "mission-consumption", year],
    queryFn: () => api.get(`/api/reporting/mission-consumption?year=${year}`).json(),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Mission, CreateMissionRequest, UpdateMissionRequest } from "@presto/shared";

export function useMissions() {
  return useQuery({
    queryKey: ["missions"],
    queryFn: () => api.get<Mission[]>("/missions"),
  });
}

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMissionRequest) =>
      api.post<Mission>("/missions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
}

export function useUpdateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateMissionRequest & { id: string }) =>
      api.put<Mission>(`/missions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
}

export function useDeleteMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/missions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
}

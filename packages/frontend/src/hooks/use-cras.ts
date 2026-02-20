import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Cra, CreateCraRequest, UpdateCraRequest, UpdateEntriesRequest } from "@presto/shared";

export function useCras(filters?: { year?: number; month?: number; missionId?: string }) {
  const params = new URLSearchParams();
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.month) params.set("month", String(filters.month));
  if (filters?.missionId) params.set("missionId", filters.missionId);
  const qs = params.toString();

  return useQuery({
    queryKey: ["cras", filters],
    queryFn: () => api.get<Cra[]>(`/cras${qs ? `?${qs}` : ""}`),
  });
}

export function useCra(id: string | undefined) {
  return useQuery({
    queryKey: ["cra", id],
    queryFn: () => api.get<Cra>(`/cras/${id}`),
    enabled: !!id,
  });
}

export function useCreateCra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCraRequest) => api.post<Cra>("/cras", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cras"] }),
  });
}

export function useUpdateCra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCraRequest & { id: string }) =>
      api.put<Cra>(`/cras/${id}`, data),
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ["cra", id] });
      const previous = qc.getQueryData<Cra>(["cra", id]);
      if (previous) {
        qc.setQueryData<Cra>(["cra", id], { ...previous, ...data });
      }
      return { previous, id };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["cra", context.id], context.previous);
      }
    },
    onSettled: (_, __, variables) => {
      qc.invalidateQueries({ queryKey: ["cras"] });
      qc.invalidateQueries({ queryKey: ["cra", variables.id] });
    },
  });
}

export function useDeleteCra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cras/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cras"] }),
  });
}

export function useUpdateEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ craId, entries }: { craId: string } & UpdateEntriesRequest) =>
      api.patch<Cra>(`/cras/${craId}/entries`, { entries }),
    onMutate: async ({ craId, entries: updates }) => {
      await qc.cancelQueries({ queryKey: ["cra", craId] });
      const previous = qc.getQueryData<Cra>(["cra", craId]);
      if (previous) {
        const updatedEntries = previous.entries?.map((e) => {
          const upd = updates.find((u) => u.id === e.id);
          if (!upd) return e;
          const newValue = upd.value ?? e.value;
          return { ...e, ...upd, value: newValue };
        });
        const totalDays = updatedEntries?.reduce((sum, e) => sum + e.value, 0) ?? previous.totalDays;
        qc.setQueryData<Cra>(["cra", craId], { ...previous, entries: updatedEntries, totalDays });
      }
      return { previous, craId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["cra", context.craId], context.previous);
      }
    },
    onSettled: (_, __, variables) => {
      qc.invalidateQueries({ queryKey: ["cra", variables.craId] });
      qc.invalidateQueries({ queryKey: ["cras"] });
    },
  });
}

export function useAutoFillCra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (craId: string) => api.patch<Cra>(`/cras/${craId}/fill`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cra", data.id] });
      qc.invalidateQueries({ queryKey: ["cras"] });
    },
  });
}

export function useClearCra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (craId: string) => api.patch<Cra>(`/cras/${craId}/clear`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cra", data.id] });
      qc.invalidateQueries({ queryKey: ["cras"] });
    },
  });
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: async (craId: string) => {
      const blob = await api.get<Blob>(`/cras/${craId}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Presto-${craId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

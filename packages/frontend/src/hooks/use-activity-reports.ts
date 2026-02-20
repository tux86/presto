import type {
  ActivityReport,
  CreateActivityReportRequest,
  UpdateActivityReportRequest,
  UpdateEntriesRequest,
} from "@presto/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function useActivityReports(filters?: { year?: number; month?: number; missionId?: string }) {
  const params = new URLSearchParams();
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.month) params.set("month", String(filters.month));
  if (filters?.missionId) params.set("missionId", filters.missionId);
  const qs = params.toString();

  return useQuery({
    queryKey: ["activity-reports", filters],
    queryFn: () => api.get<ActivityReport[]>(`/activity-reports${qs ? `?${qs}` : ""}`),
  });
}

export function useActivityReport(id: string | undefined) {
  return useQuery({
    queryKey: ["activity-report", id],
    queryFn: () => api.get<ActivityReport>(`/activity-reports/${id}`),
    enabled: !!id,
  });
}

export function useCreateActivityReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActivityReportRequest) => api.post<ActivityReport>("/activity-reports", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity-reports"] }),
  });
}

export function useUpdateActivityReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateActivityReportRequest & { id: string }) =>
      api.put<ActivityReport>(`/activity-reports/${id}`, data),
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ["activity-report", id] });
      const previous = qc.getQueryData<ActivityReport>(["activity-report", id]);
      if (previous) {
        qc.setQueryData<ActivityReport>(["activity-report", id], { ...previous, ...data });
      }
      return { previous, id };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["activity-report", context.id], context.previous);
      }
    },
    onSettled: (_, __, variables) => {
      qc.invalidateQueries({ queryKey: ["activity-reports"] });
      qc.invalidateQueries({ queryKey: ["activity-report", variables.id] });
    },
  });
}

export function useDeleteActivityReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/activity-reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity-reports"] }),
  });
}

export function useUpdateEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, entries }: { reportId: string } & UpdateEntriesRequest) =>
      api.patch<ActivityReport>(`/activity-reports/${reportId}/entries`, { entries }),
    onMutate: async ({ reportId, entries: updates }) => {
      await qc.cancelQueries({ queryKey: ["activity-report", reportId] });
      const previous = qc.getQueryData<ActivityReport>(["activity-report", reportId]);
      if (previous) {
        const updatedEntries = previous.entries?.map((e) => {
          const upd = updates.find((u) => u.id === e.id);
          if (!upd) return e;
          const newValue = upd.value ?? e.value;
          return { ...e, ...upd, value: newValue };
        });
        const totalDays = updatedEntries?.reduce((sum, e) => sum + e.value, 0) ?? previous.totalDays;
        qc.setQueryData<ActivityReport>(["activity-report", reportId], {
          ...previous,
          entries: updatedEntries,
          totalDays,
        });
      }
      return { previous, reportId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["activity-report", context.reportId], context.previous);
      }
    },
    onSettled: (_, __, variables) => {
      qc.invalidateQueries({ queryKey: ["activity-report", variables.reportId] });
      qc.invalidateQueries({ queryKey: ["activity-reports"] });
    },
  });
}

export function useAutoFillReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => api.patch<ActivityReport>(`/activity-reports/${reportId}/fill`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["activity-report", data.id] });
      qc.invalidateQueries({ queryKey: ["activity-reports"] });
    },
  });
}

export function useClearReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => api.patch<ActivityReport>(`/activity-reports/${reportId}/clear`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["activity-report", data.id] });
      qc.invalidateQueries({ queryKey: ["activity-reports"] });
    },
  });
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: async (reportId: string) => {
      const blob = await api.get<Blob>(`/activity-reports/${reportId}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Presto-${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

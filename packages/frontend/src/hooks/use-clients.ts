import type { Client, CreateClientRequest, UpdateClientRequest } from "@presto/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get<Client[]>("/clients"),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientRequest) => api.post<Client>("/clients", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateClientRequest & { id: string }) => api.put<Client>(`/clients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

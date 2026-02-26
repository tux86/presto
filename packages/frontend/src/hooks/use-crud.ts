import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function createCrudHooks<T, TCreate, TUpdate>(endpoint: string) {
  const key = [endpoint.replace(/^\//, "")];

  const useList = () =>
    useQuery({
      queryKey: key,
      queryFn: () => api.get<T[]>(endpoint),
    });

  const useCreate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: TCreate) => api.post<T>(endpoint, data),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  };

  const useUpdate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: TUpdate & { id: string }) => api.patch<T>(`${endpoint}/${id}`, data),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  };

  const useDelete = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.delete(`${endpoint}/${id}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  };

  return { useList, useCreate, useUpdate, useDelete } as const;
}

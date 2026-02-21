import type { Client, CreateClientRequest, UpdateClientRequest } from "@presto/shared";
import { createCrudHooks } from "./use-crud";

const {
  useList: useClients,
  useCreate: useCreateClient,
  useUpdate: useUpdateClient,
  useDelete: useDeleteClient,
} = createCrudHooks<Client, CreateClientRequest, UpdateClientRequest>("/clients");

export { useClients, useCreateClient, useUpdateClient, useDeleteClient };

import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from "@presto/shared";
import { createCrudHooks } from "./use-crud";

const {
  useList: useCompanies,
  useCreate: useCreateCompany,
  useUpdate: useUpdateCompany,
  useDelete: useDeleteCompany,
} = createCrudHooks<Company, CreateCompanyRequest, UpdateCompanyRequest>("/companies");

export { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany };

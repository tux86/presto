import type { CreateMissionRequest, Mission, UpdateMissionRequest } from "@presto/shared";
import { createCrudHooks } from "./use-crud";

const {
  useList: useMissions,
  useCreate: useCreateMission,
  useUpdate: useUpdateMission,
  useDelete: useDeleteMission,
} = createCrudHooks<Mission, CreateMissionRequest, UpdateMissionRequest>("/missions");

export { useMissions, useCreateMission, useUpdateMission, useDeleteMission };

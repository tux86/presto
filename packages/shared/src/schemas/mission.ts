import { z } from "zod";
import { dateString } from "./common";

export const createMissionSchema = z
  .object({
    name: z.string().min(1).max(200),
    clientId: z.string().min(1),
    companyId: z.string().min(1),
    dailyRate: z.number().min(0).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    plannedDays: z.number().min(0).optional(),
  })
  .refine(
    (d: { startDate?: string | null; endDate?: string | null }) =>
      !d.startDate || !d.endDate || d.endDate >= d.startDate,
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const updateMissionSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    clientId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    dailyRate: z.number().min(0).nullable().optional(),
    startDate: dateString.nullable().optional(),
    endDate: dateString.nullable().optional(),
    isActive: z.boolean().optional(),
    plannedDays: z.number().min(0).optional(),
  })
  .refine(
    (d: { startDate?: string | null; endDate?: string | null }) =>
      !d.startDate || !d.endDate || d.endDate >= d.startDate,
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

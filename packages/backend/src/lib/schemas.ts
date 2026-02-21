import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createReportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  missionId: z.string().min(1),
});

export const updateEntriesSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string().min(1),
      value: z.number().min(0).max(1).optional(),
      task: z.string().optional(),
    }),
  ),
});

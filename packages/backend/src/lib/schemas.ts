import { z } from "zod";

// Auth
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

// Clients
export const createClientSchema = z.object({
  name: z.string().min(1),
  businessId: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  businessId: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

// Missions
export const createMissionSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  dailyRate: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateMissionSchema = z.object({
  name: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  dailyRate: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Activity Reports
export const createReportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  missionId: z.string().min(1),
});

export const updateReportSchema = z.object({
  status: z.enum(["DRAFT", "COMPLETED"]).optional(),
  note: z.string().optional(),
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

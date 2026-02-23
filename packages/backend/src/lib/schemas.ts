import { CURRENCIES, HOLIDAY_COUNTRIES, REPORT_STATUSES } from "@presto/shared";
import { z } from "zod";

const currencySchema = z.enum(CURRENCIES);
const holidayCountrySchema = z.enum(HOLIDAY_COUNTRIES);
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(new Date(d).getTime()), "Invalid date");

// Auth
export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a digit"),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

// Clients
export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  businessId: z.string().max(100).optional(),
  currency: currencySchema,
  holidayCountry: holidayCountrySchema,
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(254).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  businessId: z.string().max(100).nullable().optional(),
  currency: currencySchema.optional(),
  holidayCountry: holidayCountrySchema.optional(),
});

// Missions
export const createMissionSchema = z
  .object({
    name: z.string().min(1).max(200),
    clientId: z.string().min(1),
    dailyRate: z.number().min(0).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const updateMissionSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    clientId: z.string().min(1).optional(),
    dailyRate: z.number().min(0).nullable().optional(),
    startDate: dateString.nullable().optional(),
    endDate: dateString.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

// Activity Reports
export const createReportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  missionId: z.string().min(1),
});

export const updateReportSchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const updateEntriesSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().min(1),
        value: z.number().min(0).max(1).optional(),
        note: z.string().max(1000).nullable().optional(),
      }),
    )
    .min(1)
    .max(31),
});

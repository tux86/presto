import { z } from "zod";
import { CLIENT_COLORS, DAY_VALUES, REPORT_STATUSES } from "../core/types.ts";

/** ISO 4217, as far as the runtime is concerned. */
const currency = z.string().regex(/^[A-Z]{3}$/, "Expected a three-letter currency code");
/** ISO 3166-1 alpha-2. */
const country = z.string().regex(/^[A-Z]{2}$/, "Expected a two-letter country code");
const isoDate = z.iso.date();

const name = z.string().trim().min(1).max(200);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const companyInput = z.object({
  name,
  address: optionalText(500),
  businessId: optionalText(100),
  isDefault: z.boolean().default(false),
});

// `.partial()` makes keys optional but keeps `.default(false)` on isDefault,
// so a PATCH omitting the field would still arrive as `isDefault: false` and
// silently clear the default company. Overridden rather than respelled: the
// other fields are transforms, which `.partial()` does short-circuit.
export const companyPatch = companyInput.partial().extend({ isDefault: z.boolean().optional() });

export const clientInput = z.object({
  name,
  email: z
    .union([z.email().max(254), z.literal("")])
    .nullish()
    .transform((v) => v || null),
  phone: optionalText(50),
  address: optionalText(500),
  businessId: optionalText(100),
  color: z
    .enum(CLIENT_COLORS)
    .nullish()
    .transform((v) => v ?? null),
  currency,
  holidayCountry: country,
});
export const clientPatch = clientInput.partial();

export const missionInput = z
  .object({
    name,
    clientId: z.string().min(1),
    companyId: z.string().min(1),
    dailyRate: z
      .number()
      .min(0)
      .max(1_000_000)
      .nullish()
      .transform((v) => v ?? null),
    startDate: isoDate.nullish().transform((v) => v ?? null),
    endDate: isoDate.nullish().transform((v) => v ?? null),
    isActive: z.boolean().default(true),
  })
  .refine((m) => !m.startDate || !m.endDate || m.endDate >= m.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export const missionPatch = z
  .object({
    name: name.optional(),
    clientId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    dailyRate: z.number().min(0).max(1_000_000).nullish(),
    startDate: isoDate.nullish(),
    endDate: isoDate.nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((m) => !m.startDate || !m.endDate || m.endDate >= m.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export const reportInput = z.object({
  missionId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

/** Day keys are "1".."31"; values are 0, 0.5 or 1. */
const dayMap = z.record(
  z.string().regex(/^([1-9]|[12][0-9]|3[01])$/, "Day must be between 1 and 31"),
  z.union(DAY_VALUES.map((v) => z.literal(v)) as [z.ZodLiteral<0>, z.ZodLiteral<0.5>, z.ZodLiteral<1>]),
);

const noteMap = z.record(z.string().regex(/^([1-9]|[12][0-9]|3[01])$/), z.string().max(500));

export const reportPatch = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  days: dayMap.optional(),
  dayNotes: noteMap.optional(),
  note: z.string().max(4000).nullish(),
  privateNote: z.string().max(4000).nullish(),
});

export const yearQuery = z.coerce.number().int().min(2000).max(2100);

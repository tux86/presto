import { z } from "zod";

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d: string) => !Number.isNaN(new Date(d).getTime()), "Invalid date");

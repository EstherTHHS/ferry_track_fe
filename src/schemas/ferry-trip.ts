import { z } from "zod";

export const LEGS = ["morning", "evening"] as const;

export const TRIP_STATUSES = ["taken", "missed", "cancelled"] as const;

/** `?month=YYYY-MM`. Omitted means the current month. */
export const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "The month must match the format YYYY-MM.")
    .optional(),
});

export const ferryLegInputSchema = z.object({
  /**
   * Accepted for parity with bus_track clients. Unused: the upsert is keyed on
   * (user_id, trip_date, leg), which always lands on the right row.
   */
  id: z.int().positive().nullish(),
  leg: z.enum(LEGS),
  status: z.enum(TRIP_STATUSES),
  trip_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "The trip time must match the format HH:mm.")
    .nullish(),
  note: z.string().max(255).nullish(),
});

export const storeFerryDaySchema = z.object({
  trip_date: z.iso.date("The trip date must match the format YYYY-MM-DD."),
  legs: z
    .array(ferryLegInputSchema)
    .min(1)
    .max(2)
    .refine(
      (legs) => new Set(legs.map((l) => l.leg)).size === legs.length,
      "Each leg may appear only once.",
    ),
});

export type FerryLegInput = z.infer<typeof ferryLegInputSchema>;

export type StoreFerryDayInput = z.infer<typeof storeFerryDaySchema>;

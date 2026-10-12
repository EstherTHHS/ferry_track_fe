import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/axios";
import type { StoreFerryDayInput } from "@/schemas/ferry-trip";
import type { FerryDayResponse, Leg, TripStatus } from "@/types/ferry-trip";

/** One leg as the day editor holds it. `"none"` means the leg should have no row. */
export type FerryLegDraft = {
  leg: Leg;
  status: TripStatus | "none";
  /** `"HH:mm"`, or empty for no time. */
  trip_time: string;
  note: string;
  /** The existing row's id, when the leg is already recorded. */
  id?: number;
};

export type SaveFerryDayInput = { date: string; legs: FerryLegDraft[] };

/**
 * Writes one day the way the editor shows it: recorded legs go to
 * `POST /api/ferry-trips/day` (create or replace), and legs switched to
 * `"none"` that had a row are removed with `DELETE /api/ferry-trips/{id}`.
 * Refetches every ferry-trips query afterwards — the month and the
 * recorded-days list both change.
 */
export function useSaveFerryDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, legs }: SaveFerryDayInput) => {
      const keep = legs.filter((l) => l.status !== "none");
      const remove = legs.filter((l) => l.status === "none" && l.id);

      if (keep.length > 0) {
        const body: StoreFerryDayInput = {
          trip_date: date,
          legs: keep.map((l) => ({
            id: l.id ?? null,
            leg: l.leg,
            status: l.status as TripStatus,
            trip_time: l.trip_time || null,
            note: l.note.trim() || null,
          })),
        };
        await apiClient.post<FerryDayResponse>("/api/ferry-trips/day", body);
      }
      await Promise.all(remove.map((l) => apiClient.delete(`/api/ferry-trips/${l.id}`)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ferry-trips"] }),
  });
}

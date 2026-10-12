import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axios";
import type { FerryRecordedDaysResponse } from "@/types/ferry-trip";

export const ferryRecordedDaysKey = ["ferry-trips", "recorded"] as const;

/**
 * Every recorded date, newest first, from `GET /api/ferry-trips/recorded`.
 * Only fetches while `enabled`, so the list costs nothing until it is opened.
 */
export function useFerryRecordedDays(enabled: boolean) {
  return useQuery({
    queryKey: ferryRecordedDaysKey,
    queryFn: () => apiClient.get<FerryRecordedDaysResponse>("/api/ferry-trips/recorded"),
    enabled,
  });
}

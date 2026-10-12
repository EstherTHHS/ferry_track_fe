import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axios";
import type { FerryTripsMonthResponse } from "@/types/ferry-trip";

export const ferryTripsMonthKey = (month: string) => ["ferry-trips", "month", month] as const;

const fetchMonth = (month: string) =>
  apiClient.get<FerryTripsMonthResponse>("/api/ferry-trips", { params: { month } });

/**
 * Recorded days for one `YYYY-MM` month from `GET /api/ferry-trips`. Keeps the
 * previous month on screen while the next one loads, so paging never blanks
 * the calendar.
 */
export function useFerryTripsMonth(month: string) {
  return useQuery({
    queryKey: ferryTripsMonthKey(month),
    queryFn: () => fetchMonth(month),
    placeholderData: keepPreviousData,
  });
}

/**
 * Several months at once, one cached query each, merged into a single list of
 * day rows. `byMonth` keeps each month's own response for per-month totals.
 */
export function useFerryTripsMonths(months: string[]) {
  return useQueries({
    queries: months.map((month) => ({
      queryKey: ferryTripsMonthKey(month),
      queryFn: () => fetchMonth(month),
    })),
    combine: (results) => ({
      byMonth: new Map(
        results.flatMap((r, i) => (r.data ? [[months[i], r.data] as const] : [])),
      ),
      days: results.flatMap((r) => r.data?.days ?? []),
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  });
}

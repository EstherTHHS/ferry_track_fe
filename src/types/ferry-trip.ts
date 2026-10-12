export type Leg = "morning" | "evening";

export type TripStatus = "taken" | "missed" | "cancelled";

export interface FerryTrip {
  id: number;
  trip_date: string;
  leg: Leg;
  /** "HH:mm", or null when no time was recorded. */
  trip_time: string | null;
  status: TripStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  /** 0.5 for a taken leg, otherwise 0. */
  count: number;
}

/**
 * One date that has at least one recorded leg. Dates with nothing recorded are
 * absent from the list, so the calendar fills the gaps itself.
 */
export interface DayRow {
  date: string;
  morning: FerryTrip | null;
  evening: FerryTrip | null;
  day_count: number;
}

export interface MonthSummary {
  /** A float: 2 and 2.5 are both possible. */
  total_days: number;
  full_days: number;
  half_days: number;
}

/** GET /api/ferry-trips */
export interface FerryTripsMonthResponse {
  month: string;
  days: DayRow[];
}

/** GET /api/ferry-trips/summary */
export interface FerryTripsSummaryResponse extends MonthSummary {
  month: string;
}

/** POST /api/ferry-trips/day */
export interface FerryDayResponse {
  date: string;
  trips: FerryTrip[];
  day_count: number;
}

/** GET /api/ferry-trips/recorded */
export interface FerryRecordedDaysResponse {
  days: DayRow[];
}

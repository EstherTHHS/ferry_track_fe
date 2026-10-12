import type { SupabaseClient } from "@supabase/supabase-js";
import type { FerryLegInput } from "@/schemas/ferry-trip";
import type { DayRow, FerryTrip, MonthSummary } from "@/types/ferry-trip";

/**
 * Every ferry-trip query the API makes, in one place. Port of bus_track's
 * FerryTripRepository. All calls run under RLS as the signed-in user, so
 * ownership is enforced by the database, not by these functions.
 */

const COLUMNS = "id, trip_date, leg, trip_time, status, note, created_at, updated_at";

type FerryTripRow = Omit<FerryTrip, "count">;

export type MonthRange = { month: string; start: string; end: string };

/** First and last date of a `YYYY-MM` month; defaults to the current month. */
export function monthRange(month?: string): MonthRange {
  const now = new Date();
  const value =
    month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, mon] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();

  return { month: value, start: `${value}-01`, end: `${value}-${lastDay}` };
}

/** Each leg is half a day, but only when it was actually taken. */
const toTrip = (row: FerryTripRow): FerryTrip => ({
  ...row,
  // Postgres `time` comes back as "HH:mm:ss"; the API speaks "HH:mm".
  trip_time: row.trip_time ? row.trip_time.slice(0, 5) : null,
  count: row.status === "taken" ? 0.5 : 0,
});

async function tripsForMonth(supabase: SupabaseClient, range: MonthRange): Promise<FerryTrip[]> {
  const { data, error } = await supabase
    .from("ferry_trips")
    .select(COLUMNS)
    .gte("trip_date", range.start)
    .lte("trip_date", range.end)
    .order("trip_date");

  if (error) throw error;

  return (data as FerryTripRow[]).map(toTrip);
}

/** Fold leg rows into one entry per date, keeping the rows' date order. */
function groupByDate(trips: FerryTrip[]): DayRow[] {
  const days = new Map<string, DayRow>();

  for (const trip of trips) {
    const day = days.get(trip.trip_date) ?? {
      date: trip.trip_date,
      morning: null,
      evening: null,
      day_count: 0,
    };
    day[trip.leg] = trip;
    day.day_count += trip.count;
    days.set(trip.trip_date, day);
  }

  return [...days.values()];
}

/**
 * One entry per date that has at least one recorded leg, ordered by date.
 * Dates with nothing recorded are absent rather than empty.
 */
export async function daysForMonth(supabase: SupabaseClient, range: MonthRange): Promise<DayRow[]> {
  return groupByDate(await tripsForMonth(supabase, range));
}

/**
 * Every date with a recorded leg, newest first, capped at `limit` dates. Two
 * legs per date at most, so fetching `limit * 2` rows always covers it.
 */
export async function recordedDays(supabase: SupabaseClient, limit: number): Promise<DayRow[]> {
  const { data, error } = await supabase
    .from("ferry_trips")
    .select(COLUMNS)
    .order("trip_date", { ascending: false })
    .limit(limit * 2);

  if (error) throw error;

  return groupByDate((data as FerryTripRow[]).map(toTrip)).slice(0, limit);
}

/** Month totals: a taken leg is half a day, so two of them make a full one. */
export async function summaryForMonth(
  supabase: SupabaseClient,
  range: MonthRange,
): Promise<MonthSummary> {
  const days = await daysForMonth(supabase, range);

  return {
    total_days: days.reduce((sum, d) => sum + d.day_count, 0),
    full_days: days.filter((d) => d.day_count >= 1).length,
    half_days: days.filter((d) => d.day_count > 0 && d.day_count < 1).length,
  };
}

/**
 * Write a day's legs, replacing any already recorded.
 *
 * Keyed on the (user_id, trip_date, leg) unique constraint, so this both
 * creates and corrects. Fields absent from a leg are written as null rather
 * than left alone, so callers pass the complete state of each leg. One upsert
 * statement, so both legs land or neither does.
 */
export async function upsertDay(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  legs: FerryLegInput[],
): Promise<FerryTrip[]> {
  const rows = legs.map((leg) => ({
    user_id: userId,
    trip_date: date,
    leg: leg.leg,
    status: leg.status,
    trip_time: leg.trip_time ?? null,
    note: leg.note ?? null,
  }));

  const { data, error } = await supabase
    .from("ferry_trips")
    .upsert(rows, { onConflict: "user_id,trip_date,leg" })
    .select(COLUMNS);

  if (error) throw error;

  return (data as FerryTripRow[]).map(toTrip);
}

/** Delete one leg. False when it does not exist or belongs to someone else. */
export async function deleteTrip(supabase: SupabaseClient, id: number): Promise<boolean> {
  const { data, error } = await supabase.from("ferry_trips").delete().eq("id", id).select("id");

  if (error) throw error;

  return data.length > 0;
}

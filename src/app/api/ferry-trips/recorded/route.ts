import { serverError, unauthenticated } from "@/lib/api-response";
import { getAuthedSupabase } from "@/lib/supabase-server";
import type { FerryRecordedDaysResponse } from "@/types/ferry-trip";
import { recordedDays } from "../_lib/repository";

/** How many dates the list returns; roughly a year of daily commuting. */
const LIMIT = 400;

/** GET /api/ferry-trips/recorded — every recorded date, newest first. */
export async function GET(request: Request) {
  const auth = await getAuthedSupabase(request);
  if (!auth) return unauthenticated();

  try {
    const body: FerryRecordedDaysResponse = { days: await recordedDays(auth.supabase, LIMIT) };

    return Response.json(body);
  } catch {
    return serverError();
  }
}

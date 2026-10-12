import { apiError, serverError, unauthenticated, validationError } from "@/lib/api-response";
import { getAuthedSupabase } from "@/lib/supabase-server";
import { storeFerryDaySchema } from "@/schemas/ferry-trip";
import type { FerryDayResponse } from "@/types/ferry-trip";
import { upsertDay } from "../_lib/repository";

/** POST /api/ferry-trips/day */
export async function POST(request: Request) {
  const auth = await getAuthedSupabase(request);
  if (!auth) return unauthenticated();

  const json = await request.json().catch(() => undefined);
  if (json === undefined) return apiError(400, "Request body must be JSON.", "invalid_json");

  const input = storeFerryDaySchema.safeParse(json);
  if (!input.success) return validationError(input.error);

  try {
    const trips = await upsertDay(auth.supabase, auth.userId, input.data.trip_date, input.data.legs);

    const body: FerryDayResponse = {
      date: input.data.trip_date,
      trips,
      day_count: trips.reduce((sum, t) => sum + t.count, 0),
    };

    return Response.json(body, { status: 201 });
  } catch {
    return serverError();
  }
}

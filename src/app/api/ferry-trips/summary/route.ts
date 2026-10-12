import type { NextRequest } from "next/server";
import { serverError, unauthenticated, validationError } from "@/lib/api-response";
import { getAuthedSupabase } from "@/lib/supabase-server";
import { monthQuerySchema } from "@/schemas/ferry-trip";
import type { FerryTripsSummaryResponse } from "@/types/ferry-trip";
import { monthRange, summaryForMonth } from "../_lib/repository";

/** GET /api/ferry-trips/summary?month=YYYY-MM */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if (!auth) return unauthenticated();

  const query = monthQuerySchema.safeParse({
    month: request.nextUrl.searchParams.get("month") || undefined,
  });
  if (!query.success) return validationError(query.error);

  const range = monthRange(query.data.month);

  try {
    const body: FerryTripsSummaryResponse = {
      month: range.month,
      ...(await summaryForMonth(auth.supabase, range)),
    };

    return Response.json(body);
  } catch {
    return serverError();
  }
}

import type { NextRequest } from "next/server";
import { notFound, serverError, unauthenticated } from "@/lib/api-response";
import { getAuthedSupabase } from "@/lib/supabase-server";
import { deleteTrip } from "../_lib/repository";

/**
 * DELETE /api/ferry-trips/{id}
 *
 * Someone else's leg is invisible under RLS, so it reads as 404, never 403.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/ferry-trips/[id]">) {
  const auth = await getAuthedSupabase(request);
  if (!auth) return unauthenticated();

  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return notFound();

  try {
    const deleted = await deleteTrip(auth.supabase, Number(id));

    return deleted ? new Response(null, { status: 204 }) : notFound();
  } catch {
    return serverError();
  }
}

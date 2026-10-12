import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export type AuthedSupabase = {
  supabase: SupabaseClient;
  userId: string;
};

/**
 * Supabase client for a Route Handler, acting as the caller.
 *
 * Accepts either `Authorization: Bearer <access_token>` (API clients, Postman)
 * or the session cookie set by `@supabase/ssr` (this app's browser client).
 * Returns null when no verified user is present. Queries run under RLS as
 * that user, so the client never needs the secret key.
 */
export async function getAuthedSupabase(request: Request): Promise<AuthedSupabase | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  const supabase = bearer
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : await getSupabaseServer();

  // getClaims verifies the JWT signature; the cookie alone is forgeable.
  const { data, error } = await supabase.auth.getClaims(bearer);
  const userId = data?.claims.sub;

  if (error || !userId) {
    return null;
  }

  return { supabase, userId };
}

/** Cookie-session Supabase client for Server Components, layouts and Route Handlers. */
export async function getSupabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; src/proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type CurrentUser = { name: string; email: string };

/**
 * The signed-in user's display name and email from the verified session
 * claims. The name falls back from `full_name` / `name` / `display_name` in
 * user metadata to the email's local part. Display only — never authorize
 * on `user_metadata`, which the user can edit.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.user_metadata ?? {};
  const email = claims?.email ?? "";
  const name =
    [meta.full_name, meta.name, meta.display_name].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    ) ?? email.split("@")[0];

  return { name, email };
}

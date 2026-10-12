import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. `createBrowserClient` is a singleton,
 * so calling this per render is cheap. It stores the session in cookies, which
 * the Route Handlers and `src/proxy.ts` read back.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

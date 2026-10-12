import ProfileMenu from "@/components/customs/ProfileMenu";
import { getCurrentUser } from "@/lib/supabase-server";

import MonthCalendar from "./components/MonthCalendar";

/**
 * Renders the signed-in home screen: a full-height {@link MonthCalendar} of
 * the user's ferry legs, with the {@link ProfileMenu} sitting after the
 * calendar's next-month arrow. Mounted directly by `src/app/(private)/page.tsx`.
 *
 * @remarks
 * Status: stable — Type: feature
 *
 * State & behavior: async Server Component. Reads the signed-in user's name
 * and email once per request via `getCurrentUser` and hands them to
 * {@link ProfileMenu}; month state and trip data live in {@link MonthCalendar}.
 *
 * Variants: single default appearance.
 *
 * Composition: passes {@link ProfileMenu} into the calendar's `actions` slot.
 * Needs `QueryProvider` above it for the calendar's queries and the menu's
 * sign-out.
 *
 * Accessibility: the page `h1` is the calendar's month heading.
 *
 * Test ids: root `home-root`. Calendar and menu ids come from their components.
 *
 * CSS classes: `home` (root block).
 *
 * Edge cases:
 * - No session (should not happen behind `src/proxy.ts`) → empty name and
 *   email, the avatar shows "?".
 *
 * Dependencies: {@link MonthCalendar}, {@link ProfileMenu}, `getCurrentUser`.
 *
 * @example
 * ```tsx
 * <Home />
 * ```
 *
 * @see {@link MonthCalendar}
 */
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="home" data-testid="home-root">
      <MonthCalendar actions={<ProfileMenu userName={user.name} userEmail={user.email} />} />
    </div>
  );
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOut, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeDialog from "@/components/customs/ThemeDialog";
import { Routes } from "@/constants/routes";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Renders a circular avatar button showing the user's initial, which opens a
 * menu with the signed-in user's name and email, a "Theme" item and a
 * "Log out" action. Rendered by `Home` in the
 * calendar header after the next-month arrow; reach for it wherever the current user
 * needs a sign-out entry point.
 *
 * @remarks
 * Status: stable — Type: composite
 *
 * State & behavior: open/closed state is owned by the Radix dropdown. "Log
 * out" runs `supabase.auth.signOut()` through a TanStack mutation, then
 * replaces the route with `Routes.LOGIN` and refreshes so `src/proxy.ts` sees
 * the cleared cookie. The item is disabled while the request is in flight; a
 * failed sign-out leaves the user on the page. "Theme" closes the menu and
 * opens {@link ThemeDialog}; `themeOpen` holds that dialog's state.
 *
 * Variants: single appearance.
 *
 * Composition: wraps compacto-ui `DropdownMenu` and `DropdownMenuItem`, and
 * renders {@link ThemeDialog} beside the menu (not inside it); the
 * trigger is the bare Radix trigger button so its BEM class owns the shape. Needs `QueryProvider` above it.
 *
 * Accessibility: the trigger is a button named "Open profile menu"; the
 * initial is `aria-hidden` so it is not read as the name. It gets `aria-haspopup` / `aria-expanded` from Radix. Arrow keys move between
 * items, Esc closes and returns focus to the trigger. The name/email block is
 * not focusable.
 *
 * Test ids: trigger `profile-menu-trigger`, menu `profile-menu-content`,
 * name `profile-menu-name-message`, email `profile-menu-email-message`,
 * theme `profile-menu-theme-button`, logout `profile-menu-logout-button`.
 *
 * CSS classes: `profile-menu__trigger` (avatar button),
 * `profile-menu__content` (menu surface),
 * `profile-menu__user` (name/email block), `profile-menu__name`,
 * `profile-menu__email`.
 *
 * Edge cases:
 * - Empty `userEmail` → the email line is not rendered.
 * - Initial is the first character of `userName`, else of `userEmail`,
 *   uppercased; both empty → "?".
 *
 * Dependencies: `@tanstack/react-query`, `lucide-react`, `getSupabaseBrowser`,
 * {@link ThemeDialog} (so it must sit under `PaletteProvider`).
 *
 * @example
 * ```tsx
 * <ProfileMenu userName="Esther" userEmail="esther@example.com" />
 * ```

 */
export default function ProfileMenu({ userName, userEmail }: ProfileMenuProps) {
  const router = useRouter();
  const initial = (userName.trim() || userEmail.trim()).charAt(0).toUpperCase() || "?";
  const [themeOpen, setThemeOpen] = useState(false);

  const logout = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabaseBrowser().auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      router.replace(Routes.LOGIN);
      router.refresh();
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="profile-menu__trigger"
          aria-label="Open profile menu"
          data-testid="profile-menu-trigger"
        >
          <span aria-hidden="true">{initial}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="profile-menu__content" data-testid="profile-menu-content">
          <div className="profile-menu__user">
            <span className="profile-menu__name" data-testid="profile-menu-name-message">
              {userName}
            </span>
            {userEmail && (
              <span className="profile-menu__email" data-testid="profile-menu-email-message">
                {userEmail}
              </span>
            )}
          </div>
          <DropdownMenuItem onSelect={() => setThemeOpen(true)} data-testid="profile-menu-theme-button">
            <Palette />
            Theme
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={logout.isPending}
            onSelect={(event) => {
              event.preventDefault();
              logout.mutate();
            }}
            data-testid="profile-menu-logout-button"
          >
            <LogOut />
            {logout.isPending ? "Logging out…" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ThemeDialog open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  );
}

export type ProfileMenuProps = {
  /** Display name shown at the top of the menu. */
  userName: string;
  /** Signed-in email shown under the name. Empty hides the line. */
  userEmail: string;
};

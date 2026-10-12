"use client";

import type { CSSProperties } from "react";

import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OptionGrid } from "@/components/ui/option-grid";
import { LIGHT_PALETTES, PALETTE_COOKIE } from "@/constants/theme";
import { appThemeCssVars, COLOR_THEMES, type ColorThemeKey } from "@/lib/color-themes";
import { usePalette } from "@/providers/palette-provider";

/** One year, in seconds. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Renders a dialog listing every light compacto-ui palette as a preview card;
 * picking one repaints the app at once and remembers it. Opened from
 * {@link ProfileMenu}'s "Theme" item. Dark palettes are deliberately not
 * offered.
 *
 * @remarks
 * Status: stable — Type: composite
 *
 * State & behavior: controlled by `open` / `onOpenChange`. The selection is
 * the `PaletteProvider`'s palette; a pick calls its `setPalette` (which writes
 * the `--app-*` variables onto `<html>`) and stores the key in the
 * `palette` cookie for a year, so the root layout paints the same palette on
 * the next server render with no flash. The dialog stays open after a pick so
 * palettes can be compared.
 *
 * Variants: none; the selected card carries compacto's check badge.
 *
 * Composition: compacto `Dialog` + `OptionGrid`. Each card is painted in its
 * own palette via `appThemeCssVars`, so it previews the theme it selects.
 * Must sit under `PaletteProvider`.
 *
 * Accessibility: Radix dialog (focus trap, Esc, focus return). Cards are
 * `aria-pressed` buttons from `OptionGrid`, named by the palette label.
 *
 * Test ids: header `theme-dialog-header` (X derives
 * `theme-dialog-header-close-button`), grid `theme-dialog-grid`, cards
 * `theme-dialog-grid-<palette key>`.
 *
 * CSS classes: `theme-dialog__swatch` (preview strip),
 * `theme-dialog__chip` with `--surface` / `--panel` / `--accent`.
 *
 * Edge cases:
 * - Cookie writes can be blocked; the palette still changes for the session.
 *
 * Dependencies: `usePalette`, `@/lib/color-themes`, `@/constants/theme`.
 *
 * @example
 * ```tsx
 * <ThemeDialog open={themeOpen} onOpenChange={setThemeOpen} />
 * ```
 *
 * @see {@link ProfileMenu}
 */
export default function ThemeDialog({ open, onOpenChange }: ThemeDialogProps) {
  const { palette, setPalette } = usePalette();

  const options = LIGHT_PALETTES.map(({ key, label }) => ({
    value: key,
    label,
    style: appThemeCssVars(COLOR_THEMES[key]) as CSSProperties,
    swatch: (
      <span className="theme-dialog__swatch" aria-hidden="true">
        <span className="theme-dialog__chip theme-dialog__chip--surface" />
        <span className="theme-dialog__chip theme-dialog__chip--panel" />
        <span className="theme-dialog__chip theme-dialog__chip--accent" />
      </span>
    ),
  }));

  function choose(value: string) {
    const key = value as ColorThemeKey;
    setPalette(key);
    document.cookie = `${PALETTE_COOKIE}=${key}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader data-testid="theme-dialog-header">
          <DialogTitle>Theme</DialogTitle>
          <DialogDescription>Pick a light palette for the whole app.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <OptionGrid options={options} value={palette} onValueChange={choose} data-testid="theme-dialog-grid" />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export type ThemeDialogProps = {
  /** Whether the dialog is showing. */
  open: boolean;
  /**
   * Fires when the dialog asks to open or close (X, Esc, overlay click).
   * @param open - The requested state.
   */
  onOpenChange: (open: boolean) => void;
};

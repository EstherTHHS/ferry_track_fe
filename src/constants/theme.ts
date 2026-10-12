import { COLOR_THEME_PAIRS, type ColorThemeKey } from "@/lib/color-themes";

/** Palette for first-time visitors and for any saved value that is not offered. */
export const DEFAULT_PALETTE: ColorThemeKey = "rose-light";

/** Cookie holding the chosen palette, so the server paints it on the first frame. */
export const PALETTE_COOKIE = "palette";

/** The light half of every compacto-ui palette pair — the only themes offered. */
export const LIGHT_PALETTES: { key: ColorThemeKey; label: string }[] = COLOR_THEME_PAIRS.flatMap((pair) =>
  pair.light ? [{ key: pair.light, label: pair.label }] : [],
);

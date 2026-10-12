"use client";

import * as React from "react";

import {
  appThemeCssVars,
  COLOR_THEMES,
  type ColorThemeKey,
} from "@/lib/color-themes";

type PaletteContext = {
  palette: ColorThemeKey;
  setPalette: (next: ColorThemeKey) => void;
};

const Ctx = React.createContext<PaletteContext | null>(null);

/**
 * Applies one of the library's twenty-three palettes to the document.
 *
 * This is the reference implementation of the theming contract the library
 * documents: write `appThemeCssVars(theme)` onto `document.documentElement`
 * and toggle `.dark` from `theme.isLight`. Copy it as-is (registry item
 * `palette-provider`) or fold the effect into whatever provider the host app
 * already has. Persistence is deliberately left to the caller — read the
 * saved key from wherever the app keeps settings and pass it as
 * `defaultPalette`, then save from `setPalette`'s consumer.
 *
 * Mount it once, above every component that renders `--app-*` colours —
 * typically in the root layout — and read it with {@link usePalette}.
 *
 * @param props.defaultPalette - The palette active on first render. Defaults
 *   to `"ocean-light"`, the one `tokens.css` already approximates before
 *   hydration, so the first frame does not flash.
 *
 * @example
 * ```tsx
 * <PaletteProvider defaultPalette="midnight-dark">{children}</PaletteProvider>
 *
 * const { palette, setPalette } = usePalette();
 * <OptionPalette value={palette} onValueChange={setPalette} />
 * ```
 */
export function PaletteProvider({
  children,
  defaultPalette = "ocean-light",
}: {
  children: React.ReactNode;
  defaultPalette?: ColorThemeKey;
}) {
  const [palette, setPalette] = React.useState<ColorThemeKey>(defaultPalette);

  React.useEffect(() => {
    const theme = COLOR_THEMES[palette];
    const root = document.documentElement;
    for (const [name, value] of Object.entries(appThemeCssVars(theme))) {
      root.style.setProperty(name, value);
    }
    root.classList.toggle("dark", !theme.isLight);
  }, [palette]);

  const value = React.useMemo(() => ({ palette, setPalette }), [palette]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The active palette key and its setter. Throws outside a {@link PaletteProvider}. */
export function usePalette() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error("usePalette must be used inside a PaletteProvider");
  }
  return ctx;
}

import type { Metadata } from "next";
import { JetBrains_Mono, Open_Sans, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { DEFAULT_PALETTE, LIGHT_PALETTES, PALETTE_COOKIE } from "@/constants/theme";
import { appThemeCssVars, COLOR_THEMES } from "@/lib/color-themes";
import { PaletteProvider } from "@/providers/palette-provider";
import QueryProvider from "@/providers/QueryProvider";
import StoreProvider from "@/providers/StoreProvider";
import "@/styles/globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ferry Track",
  description: "Ferry tracking frontend",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get(PALETTE_COOKIE)?.value;
  const palette = LIGHT_PALETTES.find((p) => p.key === saved)?.key ?? DEFAULT_PALETTE;

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${openSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={appThemeCssVars(COLOR_THEMES[palette]) as CSSProperties}
    >
      <body className="min-h-full flex flex-col">
        <PaletteProvider defaultPalette={palette}>
          <StoreProvider>
            <QueryProvider>{children}</QueryProvider>
          </StoreProvider>
        </PaletteProvider>
      </body>
    </html>
  );
}

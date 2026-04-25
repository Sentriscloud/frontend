import { Newsreader, Sora, IBM_Plex_Mono } from "next/font/google";

/**
 * Editorial display — Newsreader.
 * News-grade serif with optical sizing (opsz axis). Italic is restrained
 * (true italic, not script-y swashes), which is what we want for
 * "editorial tech" rather than "luxury bridal magazine". Variable so we
 * use one file for the whole weight + opsz + italic range.
 */
export const display = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
  weight: ["200", "300", "400", "500", "600", "700"],
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

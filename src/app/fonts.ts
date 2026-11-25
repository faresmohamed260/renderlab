import localFont from "next/font/local";

// Shared with the isolated review layout; no network during build.
export const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const title = "RenderLab — Image & video creative workspace";
const description =
  "Create images and videos, shape them with owned references, and keep reusable media and generation history in one focused workspace.";

export const metadata: Metadata = {
  metadataBase: new URL("https://renderlab-lake.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

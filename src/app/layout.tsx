import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import "./globals.css";
import "./renderlab-background.css";
import "./create-clear-composer.css";

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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const gradient = process.env.NODE_ENV === "development" && process.env.RENDERLAB_WANDA_FIBO === "1"
    && (await headers()).get("host") === "127.0.0.1:3000";
  return (
    <html lang="en" className={gradient ? "renderlab-gradient-host" : undefined}>
      <body className={gradient ? "renderlab-gradient" : undefined}>
        {gradient && <div className="renderlab-reference-atmosphere" aria-hidden="true">
          <div className="renderlab-reference-wash" />
        </div>}
        {children}
      </body>
    </html>
  );
}

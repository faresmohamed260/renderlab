import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PreviewNavigationShell } from "@/components/shell/preview-navigation-shell";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { isWandaPreview } from "@/server/wanda-preview";

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
  const preview = await isWandaPreview();
  const account = preview ? await getCurrentRenderLabIdentity().catch(() => null) : null;
  return (
    <html lang="en">
      <body className={preview ? "renderlab-gradient" : undefined}>
        {preview && <div className="renderlab-reference-atmosphere" aria-hidden="true">
          <div className="renderlab-reference-wash" />
        </div>}
        {preview ? <PreviewNavigationShell accountId={account?.id ?? null}>{children}</PreviewNavigationShell> : children}
      </body>
    </html>
  );
}

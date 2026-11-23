import type { ReactNode } from "react";
import { PreviewNavigationShell } from "@/components/shell/preview-navigation-shell";

// Mirrors the production RootLayout's always-on PreviewNavigationShell.
// The fixture deliberately has no real identity, session, APIs, or secrets.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="renderlab-gradient">
        <div className="renderlab-reference-atmosphere" aria-hidden="true">
          <div className="renderlab-reference-wash" />
        </div>
        <PreviewNavigationShell accountId="fixture-admin" hostedProfile={false}>
          {children}
        </PreviewNavigationShell>
      </body>
    </html>
  );
}

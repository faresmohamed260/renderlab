import type { ReactNode } from "react";
import { headers } from "next/headers";
import { PreviewNavigationShell } from "@/components/shell/preview-navigation-shell";
import { inter } from "@/app/fonts";
import "../../../src/app/globals.css";
import "../../../src/app/renderlab-background.css";
import "../../../src/app/create-clear-composer.css";

export const metadata = { title: "RenderLab mounted component fixture" };

export default async function FixtureLayout({ children }: { children: ReactNode }) {
  // Only the isolated acceptance suite requests this fixture layout. Mirror the
  // production root/body and app-main composition, without server auth or I/O.
  const requestHeaders = await headers();
  const variant = requestHeaders.get("x-renderlab-fixture-shell");
  // Match the server-provided shell profile for the review that exercises the
  // real avatar. Its browser test serves the exact synthetic thumbnail.
  const profile = variant === "review"
    ? { displayName: "Synthetic Member", avatarUrl: "/api/account/profile/avatar" }
    : null;
  const shell = variant === "create" || variant === "review" || variant === "signed-out" || variant === "member" || variant === "owner";
  return <html lang="en" className={inter.variable}><body className={shell ? "renderlab-gradient" : undefined}>
    {shell && <div className="renderlab-reference-atmosphere" aria-hidden="true"><div className="renderlab-reference-wash" /></div>}
    {shell ? <PreviewNavigationShell accountId={variant === "signed-out" ? null : "synthetic-component-fixture"} profile={profile} showAdmin={variant === "owner"}><main>{children}</main></PreviewNavigationShell> : <main>{children}</main>}
  </body></html>;
}

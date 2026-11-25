import type { ReactNode } from "react";
import { headers } from "next/headers";
import { PreviewNavigationShell } from "@/components/shell/preview-navigation-shell";
import "../../../src/app/globals.css";
import "../../../src/app/renderlab-background.css";
import "../../../src/app/create-clear-composer.css";

export default async function FixtureLayout({ children }: { children: ReactNode }) {
  // Only the isolated acceptance suite requests this fixture layout. Mirror the
  // production root/body and app-main composition, without server auth or I/O.
  const requestHeaders = await headers();
  const variant = requestHeaders.get("x-renderlab-fixture-shell");
  const shell = variant === "create" || variant === "signed-out" || variant === "member" || variant === "owner";
  return <html lang="en"><body className={shell ? "renderlab-gradient" : undefined}>
    {shell && <div className="renderlab-reference-atmosphere" aria-hidden="true"><div className="renderlab-reference-wash" /></div>}
    {shell ? <PreviewNavigationShell accountId={variant === "signed-out" ? null : "synthetic-component-fixture"} hostedProfile={false} showAdmin={variant === "owner"}><main>{children}</main></PreviewNavigationShell> : <main>{children}</main>}
  </body></html>;
}

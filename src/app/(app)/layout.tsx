import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";

import { AppShell } from "@/components/shell/app-shell";
import { PreviewNavigationShell } from "@/components/shell/preview-navigation-shell";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  const wandaFrame = process.env.NODE_ENV === "development" && process.env.RENDERLAB_WANDA_FIBO === "1"
    && (await headers()).get("host") === "127.0.0.1:3000";
  if (wandaFrame) return <PreviewNavigationShell signedIn={Boolean(await getCurrentRenderLabIdentity().catch(() => null))}><main>{children}</main></PreviewNavigationShell>;
  return <AppShell>{children}</AppShell>;
}

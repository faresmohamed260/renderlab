import { envString } from "../../lib/config/runtime-env.ts";
import type { ReactNode } from "react";
import { isCreatePreview } from "@/server/create-preview-mode";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (envString("NODE_ENV") === "production" || await isCreatePreview()) return <main>{children}</main>;
  const { AppShell } = await import("@/components/shell/app-shell");
  return <AppShell>{children}</AppShell>;
}

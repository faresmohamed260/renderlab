import { envString } from "../../lib/config/runtime-env.ts";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { isCreatePreview } from "@/server/create-preview-mode";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (envString("NODE_ENV") === "production" || await isCreatePreview()) return <main>{children}</main>;
  return <AppShell>{children}</AppShell>;
}

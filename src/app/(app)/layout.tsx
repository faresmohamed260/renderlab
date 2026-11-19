import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { isCreatePreview } from "@/server/create-preview-mode";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (await isCreatePreview()) return <main>{children}</main>;
  return <AppShell>{children}</AppShell>;
}

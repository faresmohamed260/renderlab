import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { isWandaPreview } from "@/server/wanda-preview";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (await isWandaPreview()) return <main>{children}</main>;
  return <AppShell>{children}</AppShell>;
}

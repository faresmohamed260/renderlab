import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { isFiboPreview } from "@/server/fibo-preview-mode";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (await isFiboPreview()) return <main>{children}</main>;
  return <AppShell>{children}</AppShell>;
}

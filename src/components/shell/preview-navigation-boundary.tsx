"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import type { PreviewNavigationShell } from "./preview-navigation-shell";

// SSR stays enabled for workspace routes and signed-in Landing. The public
// Landing owns its own header and needs no shell client chunk at first paint.
const DeferredNavigationShell = dynamic(
  () => import("./preview-navigation-shell").then(module => module.PreviewNavigationShell),
);

export function PreviewNavigationBoundary(props: ComponentProps<typeof PreviewNavigationShell>) {
  const pathname = usePathname();
  if (pathname === "/" && !props.accountId) return <>{props.children}</>;
  return <DeferredNavigationShell {...props} />;
}

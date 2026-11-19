"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { Spinner } from "@/components/ui/spinner";

function LibraryNavigationPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      className="ml-0.5 inline-flex size-3.5 items-center justify-center text-text-muted"
      data-library-navigation-pending="true"
      aria-hidden="true"
    >
      <Spinner className="size-3.5" />
    </span>
  );
}

export function LibraryNavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} prefetch={true}>
      {children}
      <LibraryNavigationPendingIndicator />
    </Link>
  );
}

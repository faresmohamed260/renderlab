"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, CircleUserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { RenderLabBrand } from "@/components/brand/renderlab-brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function routeSection(pathname: string) {
  if (pathname.startsWith("/create")) return "/create";
  if (pathname.startsWith("/library")) return "/library";
  if (pathname.startsWith("/activity")) return "/activity";
  if (pathname.startsWith("/settings")) return "/settings";
  if (pathname.startsWith("/admin")) return "/admin";
  return null;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const section = routeSection(pathname);
  const previousSection = useRef(section);
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    if (section && previousSection.current !== section) {
      previousSection.current = section;
      router.refresh();
      return;
    }
    previousSection.current = section;
  }, [router, section]);

  return (
    <div className="kinetic-app min-h-dvh text-text" data-kinetic-shell="true">
      <header
        className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/[0.055] bg-[#06080c]/[0.88] backdrop-blur-[18px] lg:h-[72px]"
        data-kinetic-surface="topbar"
      >
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-center px-4 sm:px-7 lg:px-12">
          <motion.div
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34 }}
          >
            <Link
              href="/create"
              prefetch={true}
              aria-label="Open Create workspace"
              className="inline-flex min-h-11 items-center rounded-lg font-semibold tracking-tight"
            >
              <RenderLabBrand markClassName="size-7" textClassName="text-[15px]" />
            </Link>
          </motion.div>

          <nav className="ml-auto flex min-h-11 items-center gap-1 sm:gap-2" aria-label="Application navigation">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "min-h-11 px-2.5 text-[12px] font-medium text-text-muted hover:bg-transparent hover:text-text sm:px-3",
                isActive(pathname, "/library") && "text-text",
              )}
            >
              <Link href="/library" prefetch={true} aria-current={isActive(pathname, "/library") ? "page" : undefined}>
                Library
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "min-h-11 min-w-11 rounded-lg text-text-muted hover:bg-white/[0.045] hover:text-text",
                isActive(pathname, "/activity") && "text-text",
              )}
            >
              <Link href="/activity" prefetch={true} aria-label="Open activity" aria-current={isActive(pathname, "/activity") ? "page" : undefined}>
                <Activity aria-hidden="true" className="size-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "min-h-11 min-w-11 rounded-lg text-text-muted hover:bg-white/[0.045] hover:text-text",
                isActive(pathname, "/settings") && "text-text",
              )}
            >
              <Link href="/settings" prefetch={true} aria-label="Open settings and account" aria-current={isActive(pathname, "/settings") ? "page" : undefined}>
                <CircleUserRound aria-hidden="true" className="size-4" />
              </Link>
            </Button>

            <span className="ml-1 hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[#687384] sm:inline">
              Closed Beta
            </span>
          </nav>
        </div>
      </header>

      <motion.main
        key={section ?? pathname}
        initial={reduceMotion ? false : { opacity: 0.9, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-dvh pt-16 lg:pt-[72px]"
        data-kinetic-content="true"
      >
        {children}
      </motion.main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CircleUserRound,
  Images,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { RenderLabBrand } from "@/components/brand/renderlab-brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const primaryNav: NavItem[] = [
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/library", label: "Library", icon: Images },
];

const utilityNav: NavItem[] = [
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const navSpring = {
  type: "spring",
  stiffness: 430,
  damping: 34,
  mass: 0.78,
} as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeTitle(pathname: string) {
  if (pathname.startsWith("/create")) return "Create";
  if (pathname.startsWith("/library")) return "Library";
  if (pathname.startsWith("/activity")) return "Activity";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Create";
}

function routeSection(pathname: string) {
  if (pathname.startsWith("/create")) return "/create";
  if (pathname.startsWith("/library")) return "/library";
  if (pathname.startsWith("/activity")) return "/activity";
  if (pathname.startsWith("/settings")) return "/settings";
  if (pathname.startsWith("/admin")) return "/admin";
  return null;
}

function DesktopActiveSurface() {
  return (
    <motion.span
      layoutId="desktop-shell-active"
      className="pointer-events-none absolute inset-0 -z-10 rounded-xl border border-white/[0.10] bg-[linear-gradient(110deg,rgba(129,114,246,0.16),rgba(255,255,255,0.055)_48%,rgba(115,215,255,0.055))] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_32px_rgba(129,114,246,0.18)]"
      transition={navSpring}
      aria-hidden="true"
    >
      <span className="absolute inset-y-2 left-0 w-px rounded-full bg-gradient-to-b from-transparent via-accent-bright to-transparent shadow-[0_0_18px_rgba(178,167,255,0.95)]" />
    </motion.span>
  );
}

function NavLink({
  item,
  pathname,
  reduceMotion,
}: {
  item: NavItem;
  pathname: string;
  reduceMotion: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { x: 3 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={navSpring}
    >
      <Button
        asChild
        variant="ghost"
        size="lg"
        className={cn(
          "relative isolate w-full justify-start gap-3 overflow-hidden rounded-xl border border-transparent px-3 text-text-muted transition-colors duration-200 hover:bg-white/[0.035] hover:text-text",
          active && "font-semibold text-text hover:bg-transparent",
        )}
      >
        <Link href={item.href} prefetch={true} aria-current={active ? "page" : undefined}>
          {active ? <DesktopActiveSurface /> : null}
          <Icon
            aria-hidden="true"
            className={cn(
              "relative z-10 transition-colors duration-200",
              active ? "text-accent-bright drop-shadow-[0_0_11px_rgba(178,167,255,0.65)]" : "text-text-muted",
            )}
          />
          <span className="relative z-10">{item.label}</span>
        </Link>
      </Button>
    </motion.div>
  );
}

function MobileNavLink({
  item,
  pathname,
  reduceMotion,
}: {
  item: NavItem;
  pathname: string;
  reduceMotion: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <motion.div
      className="min-w-0 flex-1"
      whileTap={reduceMotion ? undefined : { scale: 0.955 }}
      transition={navSpring}
    >
      <Button
        asChild
        variant="ghost"
        className={cn(
          "relative isolate min-h-14 w-full min-w-0 flex-col gap-1 overflow-hidden rounded-xl border border-transparent px-2 text-xs text-text-muted hover:bg-white/[0.035] hover:text-text",
          active && "font-semibold text-text hover:bg-transparent",
        )}
      >
        <Link href={item.href} prefetch={true} aria-current={active ? "page" : undefined}>
          {active ? (
            <motion.span
              layoutId="mobile-shell-active"
              className="pointer-events-none absolute inset-1 -z-10 rounded-[0.85rem] border border-white/[0.10] bg-[linear-gradient(120deg,rgba(129,114,246,0.18),rgba(255,255,255,0.06)_52%,rgba(115,215,255,0.06))] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_28px_rgba(129,114,246,0.22)]"
              transition={navSpring}
              aria-hidden="true"
            />
          ) : null}
          <Icon
            aria-hidden="true"
            className={cn(
              "relative z-10 transition-colors duration-200",
              active ? "text-accent-bright drop-shadow-[0_0_10px_rgba(178,167,255,0.72)]" : "text-text-muted",
            )}
          />
          <span className="relative z-10">{item.label}</span>
        </Link>
      </Button>
    </motion.div>
  );
}

function UtilityIcon({ children, reduceMotion }: { children: ReactNode; reduceMotion: boolean }) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.035 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={navSpring}
    >
      {children}
    </motion.div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = routeTitle(pathname);
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
    <div className="kinetic-app min-h-dvh text-text lg:flex" data-kinetic-shell="true">
      <LayoutGroup id="desktop-shell-navigation">
        <aside
          className="kinetic-glass kinetic-rail sticky top-3 z-40 hidden h-[calc(100dvh-1.5rem)] w-52 shrink-0 rounded-2xl border px-4 py-5 lg:ml-3 lg:flex lg:flex-col"
          aria-label="Application navigation"
          data-kinetic-surface="desktop-rail"
        >
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.018, x: 2 }}
            transition={navSpring}
            className="mb-7"
          >
            <Link
              href="/create"
              prefetch={true}
              aria-label="Open Create workspace"
              className="inline-flex min-h-11 items-center rounded-xl px-1 text-lg font-semibold tracking-tight"
            >
              <RenderLabBrand markClassName="size-7" textClassName="text-lg" />
            </Link>
          </motion.div>

          <nav className="flex flex-col gap-1" aria-label="Primary navigation">
            {primaryNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} reduceMotion={reduceMotion} />
            ))}
          </nav>

          <div className="mx-2 mt-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" aria-hidden="true" />

          <nav className="mt-auto flex flex-col gap-1" aria-label="Utility navigation">
            {utilityNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} reduceMotion={reduceMotion} />
            ))}
          </nav>
        </aside>
      </LayoutGroup>

      <div className="relative z-10 min-w-0 flex-1 lg:pl-3">
        <header
          className="kinetic-glass kinetic-topbar sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center rounded-2xl border px-4 sm:px-6 lg:ml-0"
          data-kinetic-surface="topbar"
        >
          <motion.div
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            transition={navSpring}
            className="mr-4 lg:hidden"
          >
            <Link
              href="/create"
              prefetch={true}
              aria-label="Open Create workspace"
              className="inline-flex min-h-11 items-center rounded-lg font-semibold tracking-tight"
            >
              <RenderLabBrand markClassName="size-6" textClassName="text-sm" />
            </Link>
          </motion.div>

          <div className="hidden items-center gap-2 lg:flex">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent-bright shadow-[0_0_16px_rgba(178,167,255,0.95)]"
            />
            <h1 className="text-sm font-semibold tracking-[0.01em] text-text/95">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-black/15 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_20px_rgba(129,114,246,0.04)]">
            <UtilityIcon reduceMotion={reduceMotion}>
              <Button asChild variant="ghost" size="icon-lg" className="rounded-lg hover:bg-white/[0.065]">
                <Link href="/activity" prefetch={true} aria-label="Open activity">
                  <Activity aria-hidden="true" />
                </Link>
              </Button>
            </UtilityIcon>
            <UtilityIcon reduceMotion={reduceMotion}>
              <Button asChild variant="ghost" size="icon-lg" className="rounded-lg hover:bg-white/[0.065]">
                <Link href="/settings" prefetch={true} aria-label="Open settings and account">
                  <CircleUserRound aria-hidden="true" />
                </Link>
              </Button>
            </UtilityIcon>
          </div>
        </header>

        <motion.main
          key={section ?? pathname}
          initial={reduceMotion ? false : { opacity: 0.84, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-[calc(100dvh-5rem)] pb-28 pt-2 lg:pb-3 lg:pr-3"
          data-kinetic-content="true"
        >
          {children}
        </motion.main>
      </div>

      <LayoutGroup id="mobile-shell-navigation">
        <nav
          className="kinetic-glass-strong kinetic-dock fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex min-h-16 items-center gap-1 rounded-2xl border p-1.5 lg:hidden"
          aria-label="Mobile navigation"
          data-kinetic-surface="mobile-dock"
        >
          <MobileNavLink item={primaryNav[0]} pathname={pathname} reduceMotion={reduceMotion} />
          <MobileNavLink item={primaryNav[1]} pathname={pathname} reduceMotion={reduceMotion} />
          <MobileNavLink item={utilityNav[0]} pathname={pathname} reduceMotion={reduceMotion} />
        </nav>
      </LayoutGroup>
    </div>
  );
}

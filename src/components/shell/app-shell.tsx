"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CircleUserRound,
  Images,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const primaryNav: NavItem[] = [
  { href: "/", label: "Create", icon: Sparkles },
  { href: "/library", label: "Library", icon: Images },
];

const utilityNav: NavItem[] = [
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeTitle(pathname: string) {
  if (pathname.startsWith("/library")) return "Library";
  if (pathname.startsWith("/activity")) return "Activity";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Create";
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Button asChild variant={active ? "secondary" : "ghost"} size="lg" className="w-full justify-start gap-3 px-3">
      <Link href={item.href} aria-current={active ? "page" : undefined} className={active ? "font-semibold" : "font-normal"}>
        <Icon aria-hidden="true" className={active ? "text-accent" : "text-text-muted"} />
        <span>{item.label}</span>
      </Link>
    </Button>
  );
}

function MobileNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "min-h-14 min-w-20 flex-col gap-1 px-2 text-xs",
        active ? "font-semibold text-text" : "font-normal text-text-muted",
      )}
    >
      <Link href={item.href} aria-current={active ? "page" : undefined}>
        <Icon aria-hidden="true" className={active ? "text-accent" : "text-text-muted"} />
        <span>{item.label}</span>
      </Link>
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = routeTitle(pathname);

  return (
    <div className="min-h-dvh bg-canvas text-text lg:flex">
      <aside
        className="sticky top-0 hidden h-dvh w-52 shrink-0 border-r border-border bg-surface-1 px-5 py-5 lg:flex lg:flex-col"
        aria-label="Application navigation"
      >
        <Link href="/" className="mb-7 inline-flex min-h-11 items-center text-lg font-semibold tracking-tight">
          RenderLab
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <nav className="mt-auto flex flex-col gap-1" aria-label="Utility navigation">
          {utilityNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-canvas/95 px-4 backdrop-blur sm:px-6">
          <Link href="/" className="mr-4 inline-flex min-h-11 items-center font-semibold tracking-tight lg:hidden">
            RenderLab
          </Link>
          <h1 className="hidden text-base font-semibold lg:block">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="icon-lg">
              <Link href="/activity" aria-label="Open activity">
                <Activity aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-lg">
              <Link href="/settings" aria-label="Open settings and account">
                <CircleUserRound aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100dvh-3.5rem)] pb-20 lg:pb-0">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex min-h-14 items-center justify-around border-t border-border bg-surface-1/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        <MobileNavLink item={primaryNav[0]} pathname={pathname} />
        <MobileNavLink item={primaryNav[1]} pathname={pathname} />
        <MobileNavLink item={utilityNav[0]} pathname={pathname} />
      </nav>
    </div>
  );
}

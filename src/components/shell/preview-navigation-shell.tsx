"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronUp, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { RenderLabBrand } from "@/components/brand/renderlab-brand";

import "sileo/styles.css";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const accountOptions = [
  { label: "Profile", icon: UserRound },
  { label: "Personalization", icon: SlidersHorizontal },
  { label: "Settings", icon: Settings },
  { label: "Help", icon: CircleHelp },
];

function PreviewAccountMenu({ signedIn }: { signedIn: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label="Account menu" className="preview-navigation-profile h-auto w-full justify-start whitespace-normal text-left">
          <span className="preview-navigation-avatar"><UserRound size={16} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span>{signedIn ? "RenderLab account" : "Guest"}</span>
            <small data-signed-in={signedIn}>{signedIn ? "Signed in" : "Not signed in"}</small>
          </span>
          <ChevronUp size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} collisionPadding={12}
        className="preview-account-menu w-56 rounded-xl bg-[#1d1b27] p-1.5">
        <DropdownMenuLabel>{signedIn ? "RenderLab account" : "Guest"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accountOptions.map(({ label, icon: Icon }) => (
          <DropdownMenuItem key={label}
            onSelect={(event) => event.preventDefault()}>
            <Icon aria-hidden="true" /> {label} <span className="ml-auto text-xs text-text-muted">Coming soon</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const destinations = [
  { href: "/", label: "Home", icon: House },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/library", label: "Library", icon: Images },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function PreviewNavigationShell({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const pathname = usePathname();

  function handleNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin
      || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    link.closest("details")?.removeAttribute("open");
    // Create still has a document-specific iframe policy in this local preview.
    if ((link.pathname === "/create") !== (pathname === "/create")) {
      event.preventDefault();
      location.assign(link.href);
    }
  }

  const links = (
    <nav aria-label="RenderLab navigation" className="preview-navigation-links">
      {destinations.map(({ href, label, icon: Icon }) => {
        const current = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return <Link key={href} href={href} aria-current={current ? "page" : undefined}>
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );

  return (
    <div className="preview-navigation-shell" onClickCapture={handleNavigation}>
      <aside className="preview-navigation-rail" aria-label="Sidebar">
        <Link href="/" className="preview-navigation-brand" aria-label="RenderLab home">
          <RenderLabBrand markClassName="size-8" textClassName="text-base" />
        </Link>
        {links}
        <PreviewAccountMenu signedIn={signedIn} />
      </aside>
      <details className="preview-navigation-disclosure" key={pathname}>
        <summary><Menu size={18} aria-hidden="true" /> Menu</summary>
        {links}
      </details>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

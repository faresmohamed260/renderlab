"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronUp, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { RenderLabBrand } from "@/components/brand/renderlab-brand";

import "sileo/styles.css";
import { Button } from "@/components/ui/button";
const accountOptions = [
  { label: "Profile", icon: UserRound },
  { label: "Personalization", icon: SlidersHorizontal },
  { label: "Settings", icon: Settings },
  { label: "Help", icon: CircleHelp },
];

function PreviewAccountMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const card = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pinned = useRef(false);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !card.current?.contains(event.target)) {
        pinned.current = false;
        setOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (card.current?.contains(document.activeElement)) trigger.current?.focus();
      pinned.current = false;
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={card} className="preview-account-card" data-open={open}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !pinned.current) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          pinned.current = false;
          setOpen(false);
        }
      }}>
      <Button ref={trigger} variant="ghost" aria-label="Account menu" aria-expanded={open} aria-controls={id}
        className="preview-navigation-profile h-auto w-full justify-start whitespace-normal text-left"
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}>
        <span className="preview-navigation-avatar"><UserRound size={16} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span>{signedIn ? "RenderLab account" : "Guest"}</span>
          <small data-signed-in={signedIn}>{signedIn ? "Signed in" : "Not signed in"}</small>
        </span>
        <ChevronUp size={15} aria-hidden="true" className="preview-account-chevron shrink-0 text-text-muted" />
      </Button>
      <div id={id} className="preview-account-menu" inert={!open} aria-hidden={!open}>
        <ul aria-label="Account options" className="preview-account-options">
          {accountOptions.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-2 px-2 py-2 text-sm">
              <Icon size={16} aria-hidden="true" /> {label}
              <span className="ml-auto text-xs text-text-muted">Coming soon</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
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

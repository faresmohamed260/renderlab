"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { RenderLabBrand } from "@/components/brand/renderlab-brand";

import { animated, to, useSpring } from "@react-spring/web";
import { Button } from "@/components/ui/button";

const sidebarSpring = { mass: 1, tension: 220, friction: 22 };
const collapsedWidth = 80;
const expandedWidth = 256;

function usePreviewReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function railOutline(width: number, height: number, center: number) {
  const right = Math.max(76, width) - 6;
  const bottom = Math.max(120, height) - 8;
  const y = Math.max(60, Math.min(bottom - 52, center));
  const edge = center > 0
    ? "V " + (y + 42) + " C 8 " + (y + 24) + " 62 " + (y + 32) + " 62 " + y
      + " S 8 " + (y - 24) + " 8 " + (y - 42)
    : "";
  return "M 24 8 H " + (right - 16) + " Q " + right + " 8 " + right + " 24 V " + (bottom - 16)
    + " Q " + right + " " + bottom + " " + (right - 16) + " " + bottom
    + " H 24 Q 8 " + bottom + " 8 " + (bottom - 16) + " " + edge + " V 24 Q 8 8 24 8 Z";
}

const accountOptions = [
  { label: "Profile", icon: UserRound },
  { label: "Personalization", icon: SlidersHorizontal },
  { label: "Settings", icon: Settings },
  { label: "Help", icon: CircleHelp },
];

const profileEndpoint = "/api/preview-account/profile";
type AccountProfile = { displayName: string | null; avatarSrc: string | null };

async function loadProfile(signal: AbortSignal): Promise<AccountProfile> {
  const init = { cache: "no-store", signal } as const;
  let response = await fetch(profileEndpoint, init);
  const hosted = response.status !== 404;
  if (!hosted) response = await fetch("/api/account/profile", init);
  if (!response.ok) throw new Error("Profile unavailable");
  const { profile } = await response.json();
  return {
    displayName: typeof profile?.displayName === "string" ? profile.displayName.trim() : null,
    avatarSrc: hosted && profile?.avatarUrl === "/api/account/profile/avatar"
      ? profileEndpoint + "/avatar" : null,
  };
}

function PreviewAccountMenu({ accountId }: { accountId: string | null }) {
  const [open, setOpen] = useState(false);
  const reduced = usePreviewReducedMotion();
  const panel = useSpring({ progress: open ? 1 : 0, config: sidebarSpring, immediate: reduced });
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    void loadProfile(controller.signal).then((value) => {
      if (!controller.signal.aborted) setProfile(value);
    }).catch(() => { /* Keep the name-only fallback if the profile is unavailable. */ });
    return () => controller.abort();
  }, [accountId]);

  const name = accountId ? profile?.displayName || "RenderLab account" : "Guest";
  const avatarSrc = accountId ? profile?.avatarSrc : null;
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
    <div ref={card} className="preview-account-card" data-open={open} data-has-photo={Boolean(avatarSrc)}
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
      <Button ref={trigger} variant="ghost" aria-label={"Account menu: " + name} title={name} aria-expanded={open} aria-controls={id}
        className="preview-navigation-profile h-auto w-full justify-start whitespace-normal text-left"
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}>
        {avatarSrc && <Image src={avatarSrc} alt="" width={30} height={30} unoptimized
          className="preview-navigation-avatar"
          onError={() => setProfile((current) => current ? { ...current, avatarSrc: null } : null)} />}
        <span className="preview-account-identity min-w-0 truncate">{name}</span>
      </Button>
      <animated.div id={id} className="preview-account-menu" inert={!open} aria-hidden={!open}
        style={{ opacity: panel.progress.to([0, 1], [0, 1], "clamp"), scaleY: panel.progress }}>
        <svg className="preview-account-clip" width="0" height="0" aria-hidden="true">
          <defs>
            <clipPath id={id + "-glass"} clipPathUnits="objectBoundingBox">
              <path d="M .59 0 H .89 Q 1 0 1 .11 V .89 Q 1 1 .89 1 H .11 Q 0 1 0 .89 V .32 Q 0 .21 .11 .21 H .37 C .45 .21 .46 .18 .47 .11 C .48 .035 .51 0 .59 0 Z" />
            </clipPath>
          </defs>
        </svg>
        <div aria-hidden="true" className="preview-account-glass" style={{ clipPath: "url(#" + id + "-glass)" }} />
        <div aria-hidden="true" className="preview-account-kicker">Account</div>
        <ul aria-label="Account options" className="preview-account-options">
          {accountOptions.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-2 px-2 py-2 text-sm">
              <Icon size={16} aria-hidden="true" /> {label}
              <span className="ml-auto text-xs text-text-muted">Coming soon</span>
            </li>
          ))}
        </ul>
      </animated.div>
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

export function PreviewNavigationShell({ children, accountId }: { children: ReactNode; accountId: string | null }) {
  const pathname = usePathname();
  const railId = useId();
  const rail = useRef<HTMLElement>(null);
  const reduced = usePreviewReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [height, setHeight] = useState(900);
  const [activeY, setActiveY] = useState(0);
  const expanded = pinned || (hovered && !dismissed);
  const motion = useSpring({
    width: expanded ? expandedWidth : collapsedWidth,
    center: activeY,
    config: sidebarSpring,
    immediate: reduced,
  });
  const active = destinations.some(({ href }) => pathname === href || (href !== "/" && pathname.startsWith(href + "/")));

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const links = element.querySelector("nav");
    function update() {
      if (!element?.clientHeight) return;
      const bounds = element.getBoundingClientRect();
      const row = links?.querySelector('[aria-current="page"]')?.getBoundingClientRect();
      setHeight(element.clientHeight);
      setActiveY(row ? row.top + row.height / 2 - bounds.top : 0);
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    links?.addEventListener("scroll", update);
    return () => {
      observer.disconnect();
      links?.removeEventListener("scroll", update);
    };
  }, [pathname]);

  function toggleSidebar() {
    setPinned(!expanded);
    setDismissed(expanded);
  }

  function handleNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin
      || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    link.closest("details")?.removeAttribute("open");
  }

  const links = (
    <nav aria-label="RenderLab navigation" className="preview-navigation-links">
      {destinations.map(({ href, label, icon: Icon }) => {
        const current = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return <Link key={href} href={href} aria-label={label} title={label} aria-current={current ? "page" : undefined}>
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );

  return (
    <div className="preview-navigation-shell" data-sidebar-collapsed={!expanded} onClickCapture={handleNavigation}>
      <animated.aside ref={rail} id={railId} className="preview-navigation-rail" aria-label="Sidebar"
        style={{ width: motion.width }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") { setDismissed(false); setHovered(true); }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") { setHovered(false); setDismissed(false); }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPinned(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setPinned(false); setDismissed(true); }
        }}>
        <svg className="preview-account-clip" width="0" height="0" aria-hidden="true">
          <defs>
            <clipPath id={railId + "-glass"}>
              <animated.path d={to([motion.width, motion.center], (w, y) => railOutline(w, height, active ? y : 0))} />
            </clipPath>
          </defs>
        </svg>
        <div className="preview-rail-glass" aria-hidden="true" style={{ clipPath: "url(#" + railId + "-glass)" }} />
        {active && activeY > 0 && <animated.div className="preview-rail-marker" aria-hidden="true" style={{ top: motion.center }} />}
        <div className="preview-navigation-heading">
          <Button type="button" variant="ghost" className="preview-navigation-brand"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-controls={railId} aria-expanded={expanded} onClick={toggleSidebar}>
            <RenderLabBrand markClassName="size-8" textClassName="text-base" />
          </Button>
        </div>
        {links}
        <PreviewAccountMenu key={accountId ?? "guest"} accountId={accountId} />
      </animated.aside>
      <details className="preview-navigation-disclosure" key={pathname}>
        <summary><Menu size={18} aria-hidden="true" /> Menu</summary>
        {links}
      </details>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

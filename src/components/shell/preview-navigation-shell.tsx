"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { RenderLabMark } from "@/components/brand/renderlab-brand";

import { animated, useSpring } from "@react-spring/web";
import { Button } from "@/components/ui/button";

const sidebarSpring = { mass: 1, tension: 220, friction: 22 };

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

function railOutline(height: number, center: number) {
  const bottom = Math.max(120, height) - 8;
  const y = Math.max(66, Math.min(bottom - 56, center));
  const notch = center > 0
    ? `V ${y - 42} C 74 ${y - 22} 29 ${y - 32} 29 ${y} S 74 ${y + 24} 74 ${y + 42}`
    : "";
  return `M 24 8 H 58 Q 74 8 74 24 ${notch} V ${bottom - 16}
    Q 74 ${bottom} 58 ${bottom} H 24 Q 8 ${bottom} 8 ${bottom - 16} V 24 Q 8 8 24 8 Z`;
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
      <Button ref={trigger} variant="ghost" aria-label={"Account menu: " + name} aria-expanded={open} aria-controls={id}
        className="preview-navigation-profile h-auto w-full justify-start whitespace-normal text-left"
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}>
        {avatarSrc && <Image src={avatarSrc} alt="" width={30} height={30} unoptimized
          className="preview-navigation-avatar"
          onError={() => setProfile((current) => current ? { ...current, avatarSrc: null } : null)} />}
        {!avatarSrc && !open && <span className="min-w-0 truncate">{name}</span>}
      </Button>
      <animated.div id={id} className="preview-account-menu" inert={!open} aria-hidden={!open}
        style={{ opacity: panel.progress.to([0, 1], [0, 1], "clamp"), scaleY: panel.progress }}>
        <svg className="preview-account-clip" width="0" height="0" aria-hidden="true">
          <defs>
            <clipPath id={id + "-glass"} clipPathUnits="objectBoundingBox">
              <path d="M .09 0 H .91 Q 1 0 1 .09 V .71 Q 1 .8 .91 .8 H .77 C .69 .8 .68 .83 .67 .91 C .66 .975 .63 1 .55 1 H .09 Q 0 1 0 .91 V .09 Q 0 0 .09 0 Z" />
            </clipPath>
          </defs>
        </svg>
        <div aria-hidden="true" className="preview-account-glass" style={{ clipPath: "url(#" + id + "-glass)" }} />
        <ul aria-label="Account options" className="preview-account-options">
          {accountOptions.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-2 px-2 py-2 text-sm">
              <Icon size={16} aria-hidden="true" /> {label}
              <span className="ml-auto text-xs text-text-muted">Coming soon</span>
            </li>
          ))}
        </ul>
        <span className="preview-account-name" title={name}>{name}</span>
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
  const [height, setHeight] = useState(900);
  const [activeY, setActiveY] = useState(0);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const motion = useSpring({
    center: hoverY ?? activeY,
    config: sidebarSpring,
    immediate: reduced,
  });

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

  function handleNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin
      || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    link.closest("details")?.removeAttribute("open");
  }

  const renderLinks = (desktop: boolean) => (
    <nav aria-label="RenderLab navigation" className="preview-navigation-links"
      onPointerOver={desktop ? (event) => {
        if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
        const row = event.target.closest("a");
        const bounds = rail.current?.getBoundingClientRect();
        const item = row?.getBoundingClientRect();
        setHoverY(bounds && item ? item.top + item.height / 2 - bounds.top : null);
      } : undefined}
      onPointerLeave={desktop ? () => setHoverY(null) : undefined}
      onScroll={desktop ? () => setHoverY(null) : undefined}>
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
    <div className="preview-navigation-shell" onClickCapture={handleNavigation}>
      <aside ref={rail} className="preview-navigation-rail" aria-label="Sidebar">
        <svg className="preview-account-clip" width="0" height="0" aria-hidden="true">
          <defs>
            <clipPath id={railId + "-glass"}>
              <animated.path d={motion.center.to((y) => railOutline(height, y))} />
            </clipPath>
          </defs>
        </svg>
        <div className="preview-rail-glass" aria-hidden="true" style={{ clipPath: "url(#" + railId + "-glass)" }} />
        <div className="preview-navigation-heading">
          <RenderLabMark className="size-8" />
        </div>
        {renderLinks(true)}
        <PreviewAccountMenu key={accountId ?? "guest"} accountId={accountId} />
      </aside>
      <details className="preview-navigation-disclosure" key={pathname}>
        <summary><Menu size={18} aria-hidden="true" /> Menu</summary>
        {renderLinks(false)}
      </details>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

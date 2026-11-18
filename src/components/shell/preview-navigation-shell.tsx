"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { RenderLabMark } from "@/components/brand/renderlab-brand";

import { animated, useSpring } from "@react-spring/web";
import { Button } from "@/components/ui/button";

function MenuSilhouette({ id, right = false }: { id: string; right?: boolean }) {
  return <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
    <clipPath id={id} clipPathUnits="objectBoundingBox">
      <path transform={right ? "translate(1 0) scale(-1 1)" : undefined}
        d="M 0 .1 Q 0 0 .055 0 H .30 C .39 0 .35 .10 .44 .10 H .945 Q 1 .10 1 .20 V .90 Q 1 1 .945 1 H .055 Q 0 1 0 .90 Z" />
    </clipPath>
  </svg>;
}

const navigationSpring = { mass: 1, tension: 220, friction: 22 };

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
  const panel = useSpring({ progress: open ? 1 : 0, config: navigationSpring, immediate: reduced });
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    void loadProfile(controller.signal).then((value) => {
      if (!controller.signal.aborted) setProfile(value);
    }).catch(() => { /* Keep the generic account icon if the profile is unavailable. */ });
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
      <Button ref={trigger} variant="ghost" aria-label={"Account menu: " + name} aria-expanded={open} aria-controls={id}
        className="preview-navigation-profile"
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}>
        {avatarSrc ? <Image src={avatarSrc} alt="" width={40} height={40} unoptimized
          className="preview-navigation-avatar"
          onError={() => setProfile((current) => current ? { ...current, avatarSrc: null } : null)} /> : <UserRound size={26} aria-hidden="true" />}
      </Button>
      <MenuSilhouette id={id + "-shape"} right />
      <animated.div id={id} className="preview-account-menu" inert={!open} aria-hidden={!open}
        style={{ clipPath: "url(#" + id + "-shape)", opacity: panel.progress.to([0, 1], [0, 1], "clamp"), scaleY: panel.progress }}>
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

const navigationGroups = [
  { title: "Workspace", destinations: destinations.slice(0, 2) },
  { title: "Media & history", destinations: destinations.slice(2, 4) },
  { title: "Account", destinations: destinations.slice(4) },
];

export function PreviewNavigationShell({ children, accountId }: { children: ReactNode; accountId: string | null }) {
  const pathname = usePathname();
  const current = destinations.find(({ href }) => pathname === href || (href !== "/" && pathname.startsWith(href + "/")));
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const id = useId();
  const disclosure = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduced = usePreviewReducedMotion();
  const reveal = useSpring({ progress: open ? 1 : 0, config: navigationSpring, immediate: reduced });

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target)) setOpenPath(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (disclosure.current?.contains(document.activeElement)) trigger.current?.focus();
      setOpenPath(null);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="preview-navigation-shell">
      <header className="preview-navigation-header">
        <div ref={disclosure} className="preview-section-disclosure"
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpenPath(pathname); }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setOpenPath(null);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !open) return;
            event.preventDefault();
            trigger.current?.focus();
            setOpenPath(null);
          }}>
          <Button ref={trigger} type="button" variant="ghost" className="preview-section-trigger"
            aria-label={"RenderLab sections: " + (current?.label ?? "RenderLab")}
            aria-expanded={open} aria-controls={id} onClick={() => setOpenPath(open ? null : pathname)}>
            <RenderLabMark className="size-9" />
            <span>{current?.label ?? "RenderLab"}</span>
            <Menu size={20} aria-hidden="true" />
          </Button>
          <MenuSilhouette id={id + "-shape"} />
          <animated.nav id={id} className="preview-section-panel" aria-label="RenderLab navigation"
            aria-hidden={!open} inert={!open} data-open={open}
            style={{ clipPath: "url(#" + id + "-shape)", opacity: reveal.progress.to([0, 1], [0, 1], "clamp"),
              y: reveal.progress.to([0, 1], [-10, 0]) }}>
            {navigationGroups.map((group) => (
              <section key={group.title} className="preview-section-group">
                <p className="preview-section-title">{group.title}</p>
                {group.destinations.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} aria-current={current?.href === href ? "page" : undefined}
                    onNavigate={() => { trigger.current?.focus({ preventScroll: true }); setOpenPath(null); }}>
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </section>
            ))}
          </animated.nav>
        </div>
        <PreviewAccountMenu key={accountId ?? "guest"} accountId={accountId} />
      </header>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

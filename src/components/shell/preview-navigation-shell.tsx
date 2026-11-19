"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { RenderLabMark } from "@/components/brand/renderlab-brand";

import { animated, useSpring, type SpringValue } from "@react-spring/web";
import { Button } from "@/components/ui/button";

const pillTop = 17;
const pillHeight = 40;
const roundness = 16;
const mergeBlur = roundness * 0.5;
const pillPadding = 10;

// Geometry reference: Sileo b70fd826, packages/sileo/src/{sileo.tsx,constants.ts}.
// The filter joins the two rounded rectangles in an alpha mask so the glass is tinted only once.
function MenuSilhouette({ id, trigger, progress, label, right = false }: {
  id: string;
  trigger: RefObject<HTMLButtonElement | null>;
  progress: SpringValue<number>;
  label?: RefObject<HTMLSpanElement | null>;
  right?: boolean;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: right ? 236 : 350, height: 220, triggerWidth: right ? 54 : 140, labelWidth: 0 });

  useEffect(() => {
    const panel = layer.current?.parentElement;
    const button = trigger.current;
    if (!panel || !button) return;
    const text = label?.current;
    const measure = () => {
      const next = { width: panel.offsetWidth, height: panel.offsetHeight, triggerWidth: button.offsetWidth, labelWidth: text?.offsetWidth ?? 0 };
      setSize((old) => old.width === next.width && old.height === next.height &&
        old.triggerWidth === next.triggerWidth && old.labelWidth === next.labelWidth ? old : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(button);
    if (text) observer.observe(text);
    return () => observer.disconnect();
  }, [trigger, label]);

  const { width, height } = size;
  const pillWidth = Math.min(width, Math.max(pillHeight, size.triggerWidth + pillPadding));
  const openPillWidth = Math.min(width, pillWidth + size.labelWidth);
  const animatedPillWidth = progress.to([0, 1], [pillWidth, openPillWidth], "clamp");
  const bodyTop = pillTop + pillHeight;
  const extend = progress.to([0, 1], [pillHeight, pillHeight + mergeBlur * 3], "clamp");
  const body = progress.to([0, 1], [0, Math.max(0, height - bodyTop)], "clamp");
  const filter = id + "-join";

  return (
    <div ref={layer} className="preview-menu-glass" aria-hidden="true" style={{ maskImage: `url(#${id})` }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id={filter} x="-25%" y="-50%" width="150%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={mergeBlur} result="soft" />
            <feComponentTransfer in="soft" result="joined">
              <feFuncA type="linear" slope="20" intercept="-10" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="joined" operator="atop" />
          </filter>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: "alpha" }}>
            <g filter={`url(#${filter})`} fill="white">
              <animated.rect x={right ? animatedPillWidth.to((value) => width - value) : 0} y={pillTop} width={animatedPillWidth}
                rx={roundness} height={extend} />
              <animated.rect y={bodyTop} width={width} rx={roundness} height={body} />
            </g>
          </mask>
        </defs>
      </svg>
    </div>
  );
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

const settingsPath = "/settings";
const isSettingsRoute = (pathname: string) => pathname === settingsPath || pathname.startsWith(settingsPath + "/");

const accountOptions = [
  { label: "Personalization", icon: SlidersHorizontal },
  { label: "Profile", icon: UserRound },
  { label: "Settings", icon: Settings, href: settingsPath },
  { label: "Help", icon: CircleHelp, separated: true },
];

const profileEndpoint = "/api/preview-account/profile";
async function loadProfileName(hostedProfile: boolean, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(hostedProfile ? profileEndpoint : "/api/account/profile", { cache: "no-store", signal });
  if (!response.ok) return null;
  const { profile } = await response.json();
  return typeof profile?.displayName === "string" ? profile.displayName.trim() : null;
}

function PreviewAccountMenu({ accountId, hostedProfile }: { accountId: string | null; hostedProfile: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduced = usePreviewReducedMotion();
  const panel = useSpring({ progress: open ? 1 : 0, config: navigationSpring, immediate: reduced });
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUnavailable, setAvatarUnavailable] = useState(false);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    void loadProfileName(hostedProfile, controller.signal).then((value) => {
      if (!controller.signal.aborted) setDisplayName(value);
    }).catch(() => { /* The trigger retains a generic accessible label. */ });
    return () => controller.abort();
  }, [accountId, hostedProfile]);

  const name = accountId ? displayName || "RenderLab account" : "Guest";
  // Start the private thumbnail request from the server-rendered header, not after
  // hydration and a second profile lookup. The thumbnail route authorizes every read.
  const avatarSrc = accountId && !avatarUnavailable ? (hostedProfile ? profileEndpoint : "/api/account/profile") + "/avatar" : null;
  const id = useId();
  const card = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const visibleName = useRef<HTMLSpanElement>(null);
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
        if (event.pointerType === "mouse" && !pinned.current && !event.currentTarget.contains(document.activeElement)) setOpen(false);
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
        {avatarSrc ? <Image src={avatarSrc} alt="" width={24} height={24} unoptimized loading="eager" fetchPriority="high"
          className="preview-navigation-avatar"
          onError={() => setAvatarUnavailable(true)} /> : <UserRound size={24} aria-hidden="true" />}
      </Button>
      <animated.div id={id} className="preview-account-menu" inert={!open} aria-hidden={!open}
        style={{ opacity: panel.progress.to([0, 1], [0, 1], "clamp") }}>
        <MenuSilhouette id={id + "-shape"} trigger={trigger} progress={panel.progress} label={visibleName} right />
        <animated.span ref={visibleName} className="preview-account-display-name" aria-hidden="true"
          style={{ opacity: panel.progress.to([0.84, 1], [0, 1], "clamp") }}>{name}</animated.span>
        <animated.ul aria-label="Account options" className="preview-account-options"
          style={{ opacity: panel.progress.to([0.84, 1], [0, 1], "clamp") }}>
          {accountOptions.map(({ label, icon: Icon, href, separated }) => (
            <li key={label} className={separated ? "preview-account-row-separated" : undefined}>
              {href ? (
                <Link href={href} className="preview-account-row preview-account-settings"
                  aria-current={isSettingsRoute(pathname) ? "page" : undefined}
                  onNavigate={() => {
                    trigger.current?.focus({ preventScroll: true });
                    pinned.current = false;
                    setOpen(false);
                  }}>
                  <Icon size={14} aria-hidden="true" /> {label}
                </Link>
              ) : (
                <div className="preview-account-row">
                  <Icon size={14} aria-hidden="true" /> {label}
                  <span className="preview-account-row-meta">Coming soon</span>
                </div>
              )}
            </li>
          ))}
        </animated.ul>
      </animated.div>
    </div>
  );
}

const destinations = [
  { href: "/", label: "Home", icon: House },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/library", label: "Library", icon: Images },
  { href: "/activity", label: "Activity", icon: Activity },
];

const navigationGroups = [
  { title: "Workspace", destinations: destinations.slice(0, 2) },
  { title: "Media & history", destinations: destinations.slice(2, 4) },
];

export function PreviewNavigationShell({ children, accountId, hostedProfile }: { children: ReactNode; accountId: string | null; hostedProfile: boolean }) {
  const pathname = usePathname();
  const current = destinations.find(({ href }) => pathname === href || (href !== "/" && pathname.startsWith(href + "/")));
  const sectionLabel = isSettingsRoute(pathname) ? "Settings" : current?.label ?? "RenderLab";
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const pinnedPath = useRef<string | null>(null);
  const id = useId();
  const disclosure = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduced = usePreviewReducedMotion();
  const reveal = useSpring({ progress: open ? 1 : 0, config: navigationSpring, immediate: reduced });

  function close() {
    pinnedPath.current = null;
    setOpenPath(null);
  }

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (disclosure.current?.contains(document.activeElement)) trigger.current?.focus();
      close();
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
            // Route selection restores trigger focus; that alone must not lock a hover preview.
            const focused = document.activeElement;
            const focusInPanel = focused !== trigger.current && event.currentTarget.contains(focused);
            if (event.pointerType === "mouse" && pinnedPath.current !== pathname && !focusInPanel) close();
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) close();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !open) return;
            event.preventDefault();
            trigger.current?.focus();
            close();
          }}>
          <Button ref={trigger} type="button" variant="ghost" className="preview-section-trigger"
            aria-label={"RenderLab sections: " + sectionLabel}
            aria-expanded={open} aria-controls={id} onClick={() => {
              if (open && pinnedPath.current === pathname) close();
              else {
                pinnedPath.current = pathname;
                setOpenPath(pathname);
              }
            }}>
            <RenderLabMark className="size-6" />
            <span>{sectionLabel}</span>
            <Menu size={12} aria-hidden="true" />
          </Button>
          <animated.nav id={id} className="preview-section-panel" aria-label="RenderLab navigation"
            aria-hidden={!open} inert={!open} data-open={open}
            style={{ opacity: reveal.progress.to([0, 1], [0, 1], "clamp") }}>
            <MenuSilhouette id={id + "-shape"} trigger={trigger} progress={reveal.progress} />
            {navigationGroups.map((group) => (
              <animated.section key={group.title} className="preview-section-group"
                style={{ opacity: reveal.progress.to([0.84, 1], [0, 1], "clamp") }}>
                <p className="preview-section-title">{group.title}</p>
                {group.destinations.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} aria-current={current?.href === href ? "page" : undefined}
                    onNavigate={() => { trigger.current?.focus({ preventScroll: true }); close(); }}>
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </animated.section>
            ))}
          </animated.nav>
        </div>
        <PreviewAccountMenu key={accountId ?? "guest"} accountId={accountId} hostedProfile={hostedProfile} />
      </header>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

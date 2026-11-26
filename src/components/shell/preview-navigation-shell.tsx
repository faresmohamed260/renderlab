"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, Clock, House, Images, Search, Settings, Shield, SlidersHorizontal, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { RenderLabMark } from "@/components/brand/renderlab-brand";

import { animated, useSpring, type SpringValue } from "@react-spring/web";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { springOptions } from "@/lib/ui/spring-roles";
import styles from "./phone-navigation.module.css";
import { CommandPalette } from "./command-palette";
import { useCreateCommands } from "@/lib/create-commands";

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
const isSettingsRoute = (pathname: string) => pathname === settingsPath || pathname.startsWith(settingsPath + "/") || pathname === "/round3-settings";
// Existing isolated review routes render the same production surfaces.
function shellRoute(pathname: string) {
  if (pathname === "/round3-settings") return "/settings";
  if (pathname === "/round3-library") return "/library";
  if (pathname === "/loading-review/create" || pathname.startsWith("/create-history-")) return "/create";
  return pathname;
}

const accountOptions = [
  { label: "Personalization", icon: SlidersHorizontal },
  { label: "Profile", icon: UserRound },
  { label: "Settings", icon: Settings, href: settingsPath },
  { label: "Help", icon: CircleHelp, separated: true },
];

type ShellProfile = { displayName: string | null; avatarUrl: string | null };

function PreviewAccountMenu({ accountId, profile, showAdmin, legacy }: { accountId: string | null; profile: ShellProfile | null; showAdmin: boolean; legacy: boolean }) {
  const pathname = usePathname();
  const options = legacy ? accountOptions : [
    { label: "Settings", icon: Settings, href: settingsPath, separated: false },
    ...(showAdmin && accountId ? [{ label: "Admin", icon: Shield, href: "/admin", separated: false }] : []),
  ];
  const [open, setOpen] = useState(false);
  const reduced = usePreviewReducedMotion();
  const panel = useSpring({ progress: open ? 1 : 0, config: navigationSpring, immediate: reduced });
  const [avatarUnavailable, setAvatarUnavailable] = useState(false);

  const name = accountId ? profile?.displayName || "RenderLab account" : "Guest";
  // Start the private thumbnail request from the server-rendered header, not after
  // hydration and a second profile lookup. The thumbnail route authorizes every read.
  const avatarSrc = accountId && !avatarUnavailable ? profile?.avatarUrl ?? null : null;
  const id = useId();
  const card = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const visibleName = useRef<HTMLSpanElement>(null);
  const pinned = useRef(false);
  const tabbing = useRef(false);

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
      if (pinned.current || card.current?.contains(document.activeElement)) trigger.current?.focus();
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
      onKeyDownCapture={(event) => {
        tabbing.current = event.key === "Tab";
        if (tabbing.current) requestAnimationFrame(() => { tabbing.current = false; });
      }}
      onBlur={(event) => {
        const leaving = !event.currentTarget.contains(event.relatedTarget);
        const tabExit = tabbing.current;
        tabbing.current = false;
        // A deliberately opened nonmodal disclosure is dismissed by an
        // explicit Tab exit, outside pointer or Escape. A closing sibling
        // popover can restore focus asynchronously after Enter; that transient
        // programmatic blur must not undo the new user activation.
        if (leaving && (!pinned.current || tabExit)) {
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
          {options.map(({ label, icon: Icon, href, separated }) => (
            <li key={label} className={separated ? "preview-account-row-separated" : undefined}>
              {href ? (
                <Link href={href} className="preview-account-row preview-account-settings"
                  aria-current={(href === settingsPath ? isSettingsRoute(pathname) : pathname === href || pathname.startsWith(href + "/")) ? "page" : undefined}
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
];


function PhoneNavigation({ pathname, accountId, profile, showAdmin, openPath, setOpenPath }: {
  pathname: string; accountId: string | null; profile: ShellProfile | null; showAdmin: boolean;
  openPath: string | null; setOpenPath: (path: string | null) => void;
}) {
  const open = openPath === pathname;
  const reduced = usePreviewReducedMotion();
  const [slide, api] = useSpring(() => ({ offset: -100 }));
  const applyOffset = (offset: number) => {
    if (surface.current) surface.current.style.transform = `translateX(${offset}%)`;
  };
  const closing = useRef(false);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = matchMedia("(min-width: 701px)");
    const resize = () => {
      if (query.matches) {
        api.stop();
        closing.current = false;
        setOpenPath(null);
      }
    };
    query.addEventListener("change", resize);
    return () => query.removeEventListener("change", resize);
  }, [api]);

  function closeImmediately() {
    api.stop();
    closing.current = false;
    setOpenPath(null);
  }

  function changeOpen(next: boolean) {
    if (next) {
      closing.current = false;
      api.stop();
      api.set({ offset: -100 });
      setOpenPath(pathname);
      void api.start({ offset: 0, ...springOptions("smooth", reduced), onChange: result => applyOffset(result.value.offset) });
    } else if (reduced) {
      closeImmediately();
    } else if (!closing.current) {
      closing.current = true;
      void api.start({
        offset: -100, ...springOptions("smooth", false),
        onChange: result => applyOffset(result.value.offset),
        onRest: result => {
          if (result.finished && closing.current) {
            closing.current = false;
            setOpenPath(null);
          }
        },
      });
    }
  }

  const name = accountId ? profile?.displayName || "RenderLab account" : "Guest";
  return <div className={styles.mobileNavigation}>
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="lg" className={styles.logo + (pathname.startsWith("/create") ? " " + styles.createLogo : "")} aria-label="Open navigation menu">
          <RenderLabMark className="size-7" /><span>RenderLab</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} className={styles.sidebar}
        ref={node => { surface.current = node; if (node) node.style.transform = `translateX(${slide.offset.get()}%)`; }}
        onCloseAutoFocus={event => {
          if (matchMedia("(min-width: 701px)").matches) {
            event.preventDefault();
            document.querySelector<HTMLAnchorElement>(".p6-desktop-brand")?.focus();
          }
        }}>
        <div className={styles.heading}>
          <SheetTitle className={styles.title}><RenderLabMark className="size-[30px]" /><span>RenderLab</span></SheetTitle>
          <SheetClose asChild><Button variant="secondary" size="icon-lg" className={styles.close} aria-label="Close menu"><X aria-hidden="true" /></Button></SheetClose>
        </div>
        <SheetDescription className={styles.description}>Choose a workspace or open account settings.</SheetDescription>
        <nav aria-label="Workspace navigation" className={styles.links}>
          {destinations.slice(1).map(({ href, label, icon: Icon }) => <Button asChild key={href} variant="ghost" size="lg" className={styles.link}>
            <Link href={href} onNavigate={closeImmediately} aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}><Icon aria-hidden="true" />{label}</Link>
          </Button>)}
          {showAdmin && accountId && <div className={styles.admin}>
            <span className={styles.adminLabel}>Owner only</span>
            <Button asChild variant="ghost" size="lg" className={styles.link}>
              <Link href="/admin" onNavigate={closeImmediately} aria-current={pathname === "/admin" || pathname.startsWith("/admin/") ? "page" : undefined}><Shield aria-hidden="true" />Admin</Link>
            </Button>
          </div>}
        </nav>
        <Button asChild variant="secondary" size="lg" className={styles.profile}>
          <Link data-shell-profile="" href={settingsPath} onNavigate={closeImmediately} aria-current={isSettingsRoute(pathname) ? "page" : undefined}>
            <ProfileAvatar profile={accountId ? profile : null} size={46} />
            <span className={styles.profileText}><span>{name}</span></span>
            <span className={styles.settingsIcon}><Settings size={20} aria-hidden="true" /></span>
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  </div>;
}

function ProfileAvatar({ profile, size }: { profile: ShellProfile | null; size: number }) {
  const [failed, setFailed] = useState(false);
  return <span className="rebuild-profile-avatar" style={{ width: size, height: size }}>
    {profile?.avatarUrl && !failed
      ? <Image src={profile.avatarUrl} width={size} height={size} alt="" unoptimized onError={() => setFailed(true)} />
      : <UserRound size={20} aria-hidden="true" />}
  </span>;
}

function UtilitySidebar({ pathname, accountId, profile, showAdmin }: { pathname: string; accountId: string | null; profile: ShellProfile | null; showAdmin: boolean }) {
  const links = [...destinations.slice(1), { href: settingsPath, label: "Settings", icon: Settings },
    ...(showAdmin && accountId ? [{ href: "/admin", label: "Admin", icon: Shield }] : [])];
  return <aside className="rebuild-utility-sidebar">
    <Link href="/" className="rebuild-utility-brand" aria-label="RenderLab home"><RenderLabMark className="size-[30px]" /><span>RenderLab</span></Link>
    <nav aria-label="Primary navigation">
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href}
        aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}><Icon size={20} aria-hidden="true" />{label}</Link>)}
    </nav>
    <Link href={settingsPath} className="rebuild-utility-profile" data-shell-profile="" aria-label="Account settings">
      <ProfileAvatar profile={accountId ? profile : null} size={38} />
      <span><strong>{accountId ? profile?.displayName || "RenderLab account" : "Guest"}</strong><small>{showAdmin && accountId ? "Owner" : "Settings"}</small></span>
    </Link>
  </aside>;
}

function RegistryHeaderAction({ id, phone = false, pathname }: { id: "open-queue" | "open-history" | "library-search"; phone?: boolean; pathname: string }) {
  const router = useRouter();
  const command = useCreateCommands().find(item => item.id === id && item.enabled);
  const globalQueue = id === "open-queue" && !pathname.startsWith("/create");
  if (!command && !globalQueue) return null;
  return <Button type="button" variant="ghost" className={phone ? "rebuild-phone-action" : "rebuild-queue-pill"}
    aria-label={id === "open-history" ? "Session and prompt history" : id === "library-search" ? "Search the Library" : "Queue"}
    onClick={() => { if (globalQueue) router.push("/create?queue=1"); else if (command) void command.run(); }}>
    {id === "open-history" ? <Clock size={20} aria-hidden="true" /> : id === "library-search" ? <Search size={20} aria-hidden="true" /> : "Queue"}
  </Button>;
}

export function PreviewNavigationShell({ children, accountId, profile = null, showAdmin = false }: { children: ReactNode; accountId: string | null; hostedProfile?: boolean; profile?: ShellProfile | null; showAdmin?: boolean }) {
  const rawPathname = usePathname();
  const pathname = shellRoute(rawPathname);
  const current = destinations.find(({ href }) => pathname === href || (href !== "/" && pathname.startsWith(href + "/")));
  const landing = pathname === "/";
  const surface = landing ? "landing" : isSettingsRoute(pathname) ? "settings" : pathname.startsWith("/admin") ? "admin" : current?.label.toLowerCase() ?? "other";
  const utility = surface === "settings" || surface === "admin";
  const [phoneOpenPath, setPhoneOpenPath] = useState<string | null>(null);
  const phoneModalOpen = !landing && phoneOpenPath === pathname;

  if (landing && !accountId) return <>{children}</>;
  if (landing) return (
    <div className="preview-navigation-shell" data-shell-surface="landing" data-signed-in-landing="">
      <header className="preview-navigation-header rebuild-landing-header">
        <Link href="/" className="rebuild-landing-brand" aria-label="RenderLab home"><RenderLabMark className="size-8" /><span>RenderLab</span></Link>
        <div className="rebuild-landing-actions">
          <Button asChild variant="ghost" className="rebuild-landing-create"><Link href="/create">Open Create</Link></Button>
          <PreviewAccountMenu key={accountId} accountId={accountId} profile={profile} showAdmin={showAdmin} legacy={false} />
        </div>
      </header>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );

  return (
    <div className="preview-navigation-shell" data-shell-surface={surface}>
      {utility && <UtilitySidebar pathname={pathname} accountId={accountId} profile={profile} showAdmin={showAdmin} />}
      <header className={"preview-navigation-header " + styles.applicationHeader} data-p6-desktop="true">
        <PhoneNavigation key={"phone:" + (accountId ?? "guest")} pathname={pathname} accountId={accountId} profile={profile} showAdmin={showAdmin} openPath={phoneOpenPath} setOpenPath={setPhoneOpenPath} />
        <div className="p6-desktop-navigation">
          <Link href="/" className="p6-desktop-brand" aria-label="RenderLab home"><RenderLabMark className="size-[26px]" /><span>RenderLab</span></Link>
          <nav aria-label="Primary navigation" className="p6-desktop-links">
            {destinations.slice(1).map(({ href, label }) => <Link key={href} className="p6-desktop-link" href={href} aria-current={current?.href === href ? "page" : undefined}>{label}</Link>)}
          </nav>
        </div>
        <div className="rebuild-header-actions">
          <CommandPalette showAdmin={Boolean(showAdmin && accountId)} pathname={pathname} />
          <RegistryHeaderAction id="open-queue" pathname={pathname} />
          <PreviewAccountMenu key={"desktop:" + (accountId ?? "guest")} accountId={accountId} profile={profile} showAdmin={showAdmin} legacy={false} />
          <div className="rebuild-loading-desktop-actions" aria-hidden="true"><span /><span /><span /></div>
        </div>
        {surface === "create" && <><RegistryHeaderAction id="open-history" pathname={pathname} phone /><span className="rebuild-loading-history" aria-hidden="true" /></>}
        {surface === "library" && <RegistryHeaderAction id="library-search" pathname={pathname} phone />}
      </header>
      <div className="preview-navigation-content" inert={phoneModalOpen} aria-hidden={phoneModalOpen || undefined}>{children}</div>
    </div>
  );
}

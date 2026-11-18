"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleHelp, House, Images, Menu, Settings, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
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

const profileEndpoint = "/api/preview-account/profile";
type AccountProfile = { displayName: string | null; avatarSrc: string | null };

// One verified account at a time. The short tab cache survives the Create document boundary.
let cachedProfile: { accountId: string; expires: number; value: Promise<AccountProfile>; ready?: AccountProfile } | undefined;

function readThumbnail(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject();
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const profileCacheKey = "renderlab.preview.profile";
const profileCacheLifetime = 60_000;

function readTabProfile(accountId: string) {
  try {
    const raw = sessionStorage.getItem(profileCacheKey);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry.accountId === accountId && entry.expires > Date.now()
      && entry.expires <= Date.now() + profileCacheLifetime
      && (entry.ready?.displayName === null || typeof entry.ready?.displayName === "string")
      && (entry.ready?.avatarSrc === null || (typeof entry.ready?.avatarSrc === "string"
        && entry.ready.avatarSrc.startsWith("data:image/webp;base64,") && entry.ready.avatarSrc.length < 32768))) {
      return entry as { accountId: string; expires: number; ready: AccountProfile };
    }
    sessionStorage.removeItem(profileCacheKey);
  } catch { /* Storage is optional. */ }
  return null;
}

function loadProfile(accountId: string) {
  if (cachedProfile?.accountId === accountId && cachedProfile.expires > Date.now()) return cachedProfile.value;
  const stored = readTabProfile(accountId);
  if (stored) {
    cachedProfile = { ...stored, value: Promise.resolve(stored.ready) };
    return cachedProfile.value;
  }
  const value = (async () => {
    let response = await fetch(profileEndpoint, { cache: "no-store" });
    const hosted = response.status !== 404;
    if (!hosted) response = await fetch("/api/account/profile", { cache: "no-store" });
    if (!response.ok) throw new Error("Profile unavailable");
    const { profile } = await response.json();
    const displayName = typeof profile?.displayName === "string" ? profile.displayName.trim() : null;
    let avatarSrc: string | null = null;
    if (hosted && profile?.avatarUrl === "/api/account/profile/avatar") {
      try {
        const avatar = await fetch(profileEndpoint + "/avatar", { cache: "no-store", redirect: "error" });
        if (avatar.ok && avatar.headers.get("content-type") === "image/webp") {
          avatarSrc = await readThumbnail(await avatar.blob());
        }
      } catch { /* Name-only fallback; never request the full avatar in the browser. */ }
    }
    return { displayName, avatarSrc };
  })();
  const entry: NonNullable<typeof cachedProfile> = { accountId, expires: Date.now() + profileCacheLifetime, value };
  cachedProfile = entry;
  void value.then((profile) => {
    if (cachedProfile !== entry) return;
    entry.ready = profile;
    try { sessionStorage.setItem(profileCacheKey, JSON.stringify({ accountId, expires: entry.expires, ready: profile })); }
    catch { /* Keep the memory cache when storage is unavailable. */ }
  }, () => {
    if (cachedProfile === entry) cachedProfile = undefined;
  });
  return value;
}

function PreviewAccountMenu({ accountId }: { accountId: string | null }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  useEffect(() => {
    if (!accountId) {
      cachedProfile = undefined;
      try { sessionStorage.removeItem(profileCacheKey); } catch { /* Storage is optional. */ }
      return;
    }
    const stored = readTabProfile(accountId);
    if (stored) setProfile(stored.ready);
    let active = true;
    void loadProfile(accountId).then((value) => {
      if (active) setProfile(value);
    }).catch(() => { /* Keep the control available if the profile is unavailable. */ });
    return () => { active = false; };
  }, [accountId]);

  const current = profile ?? (cachedProfile?.accountId === accountId && cachedProfile.expires > Date.now()
    ? cachedProfile.ready : null);
  const name = accountId ? current?.displayName || "RenderLab account" : "Guest";
  const avatarSrc = accountId ? current?.avatarSrc : null;
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
          onError={() => setProfile(current ? { ...current, avatarSrc: null } : null)} />}
        <span className="preview-account-identity min-w-0 truncate">{name}</span>
      </Button>
      <div id={id} className="preview-account-menu" inert={!open} aria-hidden={!open}>
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

export function PreviewNavigationShell({ children, accountId }: { children: ReactNode; accountId: string | null }) {
  const pathname = usePathname();
  const railId = useId();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(sessionStorage.getItem("renderlab.preview.sidebar") === "collapsed"); }
    catch { /* Sidebar still works with browser storage disabled. */ }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { sessionStorage.setItem("renderlab.preview.sidebar", next ? "collapsed" : "expanded"); }
    catch { /* The current view retains the user's choice. */ }
  }

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
        return <Link key={href} href={href} aria-label={label} title={label} aria-current={current ? "page" : undefined}>
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );

  return (
    <div className="preview-navigation-shell" data-sidebar-collapsed={collapsed} onClickCapture={handleNavigation}>
      <aside id={railId} className="preview-navigation-rail" aria-label="Sidebar">
        <div className="preview-navigation-heading">
          <Button type="button" variant="ghost" className="preview-navigation-brand"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls={railId} aria-expanded={!collapsed} onClick={toggleSidebar}>
            <RenderLabBrand markClassName="size-8" textClassName="text-base" />
          </Button>
        </div>
        {links}
        <PreviewAccountMenu key={accountId ?? "guest"} accountId={accountId} />
      </aside>
      <details className="preview-navigation-disclosure" key={pathname}>
        <summary><Menu size={18} aria-hidden="true" /> Menu</summary>
        {links}
      </details>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

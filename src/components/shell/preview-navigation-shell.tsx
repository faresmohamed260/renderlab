"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, House, Images, Menu, Settings, Sparkles } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { RenderLabBrand } from "@/components/brand/renderlab-brand";

const destinations = [
  { href: "/", label: "Home", icon: House },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/library", label: "Library", icon: Images },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function PreviewNavigationShell({ children }: { children: ReactNode }) {
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
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );

  return (
    <div className="preview-navigation-shell" onClickCapture={handleNavigation}>
      <aside className="preview-navigation-rail" aria-label="Sidebar">
        <Link href="/" className="preview-navigation-brand" aria-label="RenderLab home">
          <RenderLabBrand markClassName="size-7" textClassName="text-sm" />
        </Link>
        {links}
      </aside>
      <details className="preview-navigation-disclosure" key={pathname}>
        <summary><Menu size={18} aria-hidden="true" /> Menu</summary>
        {links}
      </details>
      <div className="preview-navigation-content">{children}</div>
    </div>
  );
}

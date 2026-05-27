"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SurfaceTopNavLink = {
  active?: boolean;
  href: string;
  label: string;
};

export function buildHomeSectionTopNavLinks() {
  return [
    { href: "/#overview", label: "Overview" },
    { href: "/#request-board", label: "Board" },
    { href: "/#post-request", label: "Start request" },
    { href: "/#solutions", label: "Solutions" },
  ] satisfies SurfaceTopNavLink[];
}

export function buildSurfaceTopNavLinks(activeKey?: "home" | "request" | "whitelist" | "desktop") {
  return [
    { href: "/", label: "Home", active: activeKey === "home" },
    {
      href: "/?mode=request",
      label: "Start request",
      active: activeKey === "request",
    },
    {
      href: "/supplies/new?entry=whitelist",
      label: "Supply whitelist",
      active: activeKey === "whitelist",
    },
    {
      href: "/download/boreal-desktop",
      label: "Desktop",
      active: activeKey === "desktop",
    },
  ] satisfies SurfaceTopNavLink[];
}

function SurfaceTopNavInner({
  links,
  mobileSidebarButton,
  rightSlot,
  title,
}: {
  links?: SurfaceTopNavLink[];
  mobileSidebarButton?: React.ReactNode;
  rightSlot?: React.ReactNode;
  title?: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 bg-sidebar px-3 md:px-4">
      {mobileSidebarButton}

      <div className="flex min-w-0 items-center gap-4">
        {title ? (
          <span className="truncate text-[13px] font-medium text-foreground">
            {title}
          </span>
        ) : null}
        {links?.length ? (
          <nav className="hidden items-center gap-4 lg:flex">
            {links.map((link) => (
            <Link
              className={cn(
                "relative py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                link.active
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-foreground"
                  : null
              )}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : null}
    </header>
  );
}

export function SurfaceTopNav({
  links,
  rightSlot,
  title,
}: {
  links?: SurfaceTopNavLink[];
  rightSlot?: React.ReactNode;
  title?: string;
}) {
  return <SurfaceTopNavInner links={links} rightSlot={rightSlot} title={title} />;
}

export function SidebarSurfaceTopNav({
  links,
  rightSlot,
  title,
}: {
  links?: SurfaceTopNavLink[];
  rightSlot?: React.ReactNode;
  title?: string;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <SurfaceTopNavInner
      links={links}
      mobileSidebarButton={
        <Button
          className="md:hidden"
          onClick={toggleSidebar}
          size="icon-sm"
          variant="ghost"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
      }
      rightSlot={rightSlot}
      title={title}
    />
  );
}

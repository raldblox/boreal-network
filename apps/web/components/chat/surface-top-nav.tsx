"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "./icons";

export type SurfaceTopNavLink = {
  active?: boolean;
  href: string;
  label: string;
};

export function buildSurfaceTopNavLinks(activeKey?: "home" | "request" | "whitelist" | "desktop") {
  return [
    { href: "/", label: "Home", active: activeKey === "home" },
    {
      href: "/?mode=request",
      label: "Post request",
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
  subtitle,
}: {
  links: SurfaceTopNavLink[];
  mobileSidebarButton?: React.ReactNode;
  rightSlot?: React.ReactNode;
  subtitle: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 px-3 md:px-4">
      {mobileSidebarButton}

      <Link
        className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-muted/55"
        href="/"
      >
        <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background text-foreground shadow-sm">
          <SparklesIcon size={14} />
        </div>
        <div className="hidden min-w-0 flex-col leading-none sm:flex">
          <span className="truncate text-[13px] font-medium text-foreground">
            Boreal
          </span>
          <span className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground/[0.7]">
            {subtitle}
          </span>
        </div>
        <span className="text-[13px] font-medium text-foreground sm:hidden">
          Boreal
        </span>
      </Link>

      <nav className="ml-3 hidden items-center gap-1 xl:flex">
        {links.map((link) => (
          <Link
            className={cn(
              "rounded-full px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/42 hover:text-foreground",
              link.active ? "bg-muted/55 text-foreground" : null
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : null}
    </header>
  );
}

export function SurfaceTopNav({
  links,
  rightSlot,
  subtitle,
}: {
  links: SurfaceTopNavLink[];
  rightSlot?: React.ReactNode;
  subtitle: string;
}) {
  return (
    <SurfaceTopNavInner links={links} rightSlot={rightSlot} subtitle={subtitle} />
  );
}

export function SidebarSurfaceTopNav({
  links,
  rightSlot,
  subtitle,
}: {
  links: SurfaceTopNavLink[];
  rightSlot?: React.ReactNode;
  subtitle: string;
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
      subtitle={subtitle}
    />
  );
}

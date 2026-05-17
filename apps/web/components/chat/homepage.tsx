"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  borealHomepageCopy,
  borealMissionPoints,
  borealVisionPoints,
  borealWhitelistTracks,
} from "@/lib/marketing";
import {
  SidebarSurfaceTopNav,
  buildHomeSectionTopNavLinks,
} from "./surface-top-nav";
import {
  surfaceBodyClassName,
  surfaceCardClassName,
  surfaceCardTitleClassName,
  surfaceColumnClassName,
  surfaceEyebrowClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceSectionClassName,
  surfaceSectionTitleClassName,
  surfaceShellClassName,
  surfaceViewportClassName,
} from "./surface-layout";

export function HomePage() {
  const [missionBias, missionMissing, missionWhy] = borealMissionPoints;

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          links={buildHomeSectionTopNavLinks()}
          rightSlot={
            <Button asChild className="h-9 rounded-full px-4 text-[12px] font-medium">
              <Link href="/?mode=request">Post request</Link>
            </Button>
          }
          title="Boreal"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={surfaceScrollClassName}>
            <section className="border-b border-border/60 pb-12 md:pb-16" id="overview">
              <p className={surfaceEyebrowClassName}>{borealHomepageCopy.eyebrow}</p>

              <h1 className={cn(surfaceHeroTitleClassName, "mt-6")}>
                {borealHomepageCopy.title}
              </h1>

              <p className={cn(surfaceBodyClassName, "mt-6")}>
                {borealHomepageCopy.body}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-full px-5 text-[12px] font-medium">
                  <Link href="/?mode=request">Request a pilot</Link>
                </Button>
                <Button
                  asChild
                  className="h-11 rounded-full px-5 text-[12px] font-medium"
                  variant="outline"
                >
                  <Link href="/supplies/new?entry=whitelist">Join the whitelist</Link>
                </Button>
              </div>

              <p className={cn(surfaceBodyClassName, "mt-6 max-w-3xl text-sm")}>
                {borealHomepageCopy.support}
              </p>
            </section>

            <section className={surfaceSectionClassName}>
              <p className={surfaceEyebrowClassName}>Mission</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                Serious work breaks when the system deletes the human steps.
              </h2>

              <div className="mt-8 grid gap-8 md:grid-cols-2">
                {[missionBias, missionMissing].map((point) => (
                  <div className="border-t border-border/60 pt-5" key={point.label}>
                    <p className={surfaceEyebrowClassName}>{point.label}</p>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className={cn(surfaceCardClassName, "mt-8")}>
                <p className={surfaceEyebrowClassName}>{missionWhy.label}</p>
                <p className="mt-3 max-w-4xl text-[15px] leading-8 text-foreground">
                  {missionWhy.body}
                </p>
              </div>
            </section>

            <section className={surfaceSectionClassName}>
              <p className={surfaceEyebrowClassName}>Vision</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                We want AI to unlock complete work, not just better drafts.
              </h2>

              <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {borealVisionPoints.map((point) => (
                  <div className="border-t border-border/60 pt-5" key={point.label}>
                    <p className={surfaceEyebrowClassName}>{point.label}</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className={surfaceSectionClassName}>
              <p className={surfaceEyebrowClassName}>Whitelist</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                Opening in two tracks while we prove the real workflows.
              </h2>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {borealWhitelistTracks.map((track) => (
                  <div className={surfaceCardClassName} key={track.label}>
                    <h3 className={surfaceCardTitleClassName}>{track.label}</h3>
                    <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                      {track.body}
                    </p>
                    <Link
                      className="mt-8 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground transition-colors hover:text-foreground/75"
                      href={track.href}
                    >
                      {track.cta}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            <footer className="mt-12 border-t border-border/60 py-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className={surfaceCardTitleClassName}>Boreal</div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Link href="/">Home</Link>
                  <Link href="/?mode=request">Post request</Link>
                  <Link href="/supplies/new?entry=whitelist">Supply whitelist</Link>
                  <Link href="/download/boreal-desktop">Desktop</Link>
                </div>
              </div>
            </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

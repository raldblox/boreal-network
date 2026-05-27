"use client";

import { ArrowRightIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  borealAccessTracks,
  borealHomepageCopy,
  borealHowItWorksPoints,
  borealVisionPoints,
  borealWhyBorealPoints,
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
  const [whyDraft, whyHuman, whyExists] = borealWhyBorealPoints;

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          links={buildHomeSectionTopNavLinks()}
          rightSlot={
            <>
              <Button
                asChild
                className="hidden h-9 rounded-full px-4 text-[12px] font-medium sm:inline-flex"
                variant="outline"
              >
                <Link href="/account">
                  <UserRoundIcon className="size-4" />
                  Account
                </Link>
              </Button>
              <Button
                asChild
                className="h-9 rounded-full px-4 text-[12px] font-medium"
              >
                <Link href="/?mode=request">Post request</Link>
              </Button>
            </>
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
                  <Link href="/?mode=request">Post request</Link>
                </Button>
                <Button
                  asChild
                  className="h-11 rounded-full px-5 text-[12px] font-medium"
                  variant="outline"
                >
                  <Link href="/supplies/new?entry=whitelist">Join whitelist</Link>
                </Button>
              </div>

              <p className={cn(surfaceBodyClassName, "mt-6 max-w-3xl text-sm")}>
                {borealHomepageCopy.support}
              </p>
            </section>

            <section className={surfaceSectionClassName} id="how-it-works">
              <p className={surfaceEyebrowClassName}>How it works</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                Keep the work, the people, and the proof in one flow.
              </h2>

              <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                {borealHowItWorksPoints.map((point) => (
                  <div className="border-t border-border/60 pt-5" key={point.label}>
                    <p className={surfaceEyebrowClassName}>{point.label}</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className={surfaceSectionClassName} id="why-boreal">
              <p className={surfaceEyebrowClassName}>Why Boreal</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                Most AI tools stop at output. Real work does not.
              </h2>

              <div className="mt-8 grid gap-8 md:grid-cols-2">
                {[whyDraft, whyHuman].map((point) => (
                  <div className="border-t border-border/60 pt-5" key={point.label}>
                    <p className={surfaceEyebrowClassName}>{point.label}</p>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className={cn(surfaceCardClassName, "mt-8")}>
                <p className={surfaceEyebrowClassName}>{whyExists.label}</p>
                <p className="mt-3 max-w-4xl text-[15px] leading-8 text-foreground">
                  {whyExists.body}
                </p>
              </div>
            </section>

            <section className={surfaceSectionClassName} id="vision">
              <p className={surfaceEyebrowClassName}>Vision</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                We want AI to help finish work, not just draft it.
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

            <section className={surfaceSectionClassName} id="access">
              <p className={surfaceEyebrowClassName}>Access</p>
              <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                Starting with two clear ways in.
              </h2>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {borealAccessTracks.map((track) => (
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
                  <Link href="/account">Account</Link>
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

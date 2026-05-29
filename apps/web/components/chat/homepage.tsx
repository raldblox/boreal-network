"use client";

import {
  ArrowRightIcon,
  FilePenLineIcon,
  PackageIcon,
  StoreIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RequestBoard } from "@/components/request/request-board";
import { PublicSolutionPreview } from "@/components/request/public-solution-preview";
import { cn } from "@/lib/utils";
import { CreditBalanceLink } from "./credit-balance-link";
import {
  SidebarSurfaceTopNav,
  buildHomeSectionTopNavLinks,
} from "./surface-top-nav";
import {
  SurfaceCard,
  SurfaceCardActions,
  SurfaceCardDescription,
  SurfaceCardHeader,
} from "./surface-card";
import {
  surfaceBodyClassName,
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

const homeEntryCards = [
  {
    body: "Describe the problem, outcome, constraints, proof needs, and where human or local work still matters.",
    cta: "Post request",
    href: "/?mode=request",
    icon: FilePenLineIcon,
    label: "Post a request",
    title: "Put real demand on the board.",
  },
  {
    body: "Choose a scoped outcome and keep the request, payment, fulfillment, files, review, and proof on one thread.",
    cta: "Browse services",
    href: "/services",
    icon: StoreIcon,
    label: "Run a service",
    title: "Start from a ready-to-buy outcome.",
  },
  {
    body: "Publish what you can solve, how it runs, what proof looks like, and when capacity is available.",
    cta: "Open supply",
    href: "/supplies",
    icon: PackageIcon,
    label: "Supply Studio",
    title: "Make capability visible to requests.",
  },
];

const liveWorkExamples = [
  {
    meta: "Looking for plans",
    title: "Explain this paper for a non-specialist team",
  },
  {
    meta: "Delivered for review",
    title: "Set up a payment flow and attach proof",
  },
  {
    meta: "Free to inspect",
    title: "Accepted solution ready to run with credits",
  },
];

export function HomePage() {
  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          links={buildHomeSectionTopNavLinks()}
          rightSlot={
            <>
              <CreditBalanceLink className="hidden sm:inline-flex" />
              <Button
                asChild
                className="h-9 rounded-full px-4 text-[12px] font-medium"
              >
                <Link href="/?mode=request">Post request</Link>
              </Button>
            </>
          }
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={surfaceScrollClassName}>
              <section
                className="grid gap-10 border-b border-border/60 pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start"
                id="overview"
              >
                <div className="max-w-4xl">
                  <p className={surfaceEyebrowClassName}>
                    Live work board
                  </p>
                  <h1 className={cn(surfaceHeroTitleClassName, "mt-6")}>
                    Boreal turns requests into completed work.
                  </h1>
                  <p className={cn(surfaceBodyClassName, "mt-6")}>
                    Post a request, compare plans, run or fund the work, verify
                    artifacts, and reuse accepted solutions. Every step stays
                    attached to one durable Request.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="h-11 rounded-full px-5 text-[12px] font-medium"
                    >
                      <Link href="/?mode=request">Post a request</Link>
                    </Button>
                    <Button
                      asChild
                      className="h-11 rounded-full px-5 text-[12px] font-medium"
                      variant="outline"
                    >
                      <Link href="/open-requests">Browse active work</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/60 bg-card/70 p-4">
                  <p className={surfaceEyebrowClassName}>
                    What do you need done?
                  </p>
                  <div className="mt-4 rounded-[24px] border border-border/60 bg-background/58 p-4">
                    <p className="text-sm leading-6 text-foreground/84">
                      Describe the problem, outcome, deadline, budget, and proof
                      needed...
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-muted/55 px-3 py-1 text-[11px] text-muted-foreground">
                        Create Request
                      </span>
                      <span className="rounded-full bg-muted/55 px-3 py-1 text-[11px] text-muted-foreground">
                        Compare plans
                      </span>
                      <span className="rounded-full bg-muted/55 px-3 py-1 text-[11px] text-muted-foreground">
                        Run with proof
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {liveWorkExamples.map((example) => (
                      <div
                        className="rounded-2xl border border-border/60 bg-background/50 px-3 py-2"
                        key={example.title}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                          {example.meta}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-foreground/82">
                          {example.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <RequestBoard maxItems={4} variant="home" />

              <section className={surfaceSectionClassName} id="post-request">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className={surfaceEyebrowClassName}>Post request</p>
                    <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                      One Request should survive planning, execution, proof,
                      review, and reuse.
                    </h2>
                  </div>
                  <Button asChild className="rounded-full" variant="outline">
                    <Link href="/?mode=request">
                      Post a request
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {homeEntryCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <SurfaceCard asChild interactive key={card.label}>
                        <article className="flex h-full flex-col">
                          <SurfaceCardHeader
                            action={
                              <span
                                aria-hidden="true"
                                className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/60 text-foreground/70"
                              >
                                <Icon className="size-4" />
                              </span>
                            }
                            eyebrow={card.label}
                            title={card.title}
                            titleAs="h3"
                          />
                          <SurfaceCardDescription>
                            {card.body}
                          </SurfaceCardDescription>
                          <SurfaceCardActions className="mt-auto pt-6">
                            <Button
                              asChild
                              className="rounded-full"
                              size="sm"
                              variant="outline"
                            >
                              <Link href={card.href}>
                                {card.cta}
                                <ArrowRightIcon className="size-4" />
                              </Link>
                            </Button>
                          </SurfaceCardActions>
                        </article>
                      </SurfaceCard>
                    );
                  })}
                </div>
              </section>

              <section className={surfaceSectionClassName} id="solutions">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <p className={surfaceEyebrowClassName}>Solutions</p>
                    <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                      Accepted work becomes reusable without hiding the proof.
                    </h2>
                    <p className={cn(surfaceBodyClassName, "mt-4")}>
                      Boreal can project completed public Requests after an
                      accepted Artifact and proof state exist. Inspection stays
                      free. Credits apply when a rerun consumes execution,
                      inference, provider calls, human review, or service
                      capacity.
                    </p>
                  </div>

                  <PublicSolutionPreview />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

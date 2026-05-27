"use client";

import {
  ArrowRightIcon,
  CreditCardIcon,
  FilePenLineIcon,
  PackageIcon,
  StoreIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RequestBoard } from "@/components/request/request-board";
import { PublicSolutionPreview } from "@/components/request/public-solution-preview";
import { cn } from "@/lib/utils";
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
    body: "Shape the ask, done condition, constraints, budget, deadline, proof, and whether human or local runtime work matters.",
    cta: "Post request",
    href: "/?mode=request",
    icon: FilePenLineIcon,
    label: "Request Preflight",
    title: "Turn a raw ask into a durable Request.",
  },
  {
    body: "Packaged supply still creates or attaches to a Request, then runs through credits, proof, delivery, and review.",
    cta: "Browse services",
    href: "/services",
    icon: StoreIcon,
    label: "Services",
    title: "Run ready-to-buy capability through a Request.",
  },
  {
    body: "Define what can be done, who owns the lane, how it runs, how proof works, and when capacity is available.",
    cta: "Open supply",
    href: "/supplies",
    icon: PackageIcon,
    label: "Supply Studio",
    title: "Manage capability lanes that can attach to demand.",
  },
  {
    body: "Keep identity, passkeys, balance, ledger, request spending, and paid execution readiness in one trust center.",
    cta: "Review credits",
    href: "/account",
    icon: CreditCardIcon,
    label: "Account / Credits",
    title: "Credits are execution capacity, not reading access.",
  },
];

const processSteps = [
  "Post a Request",
  "Compare plans",
  "Run or fund work",
  "Verify artifacts",
  "Reuse accepted solutions",
];

export function HomePage() {
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
          title="Home / Board"
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
                    Request-native work network
                  </p>
                  <h1 className={cn(surfaceHeroTitleClassName, "mt-6")}>
                    Post a Request, compare plans, run work, verify the result.
                  </h1>
                  <p className={cn(surfaceBodyClassName, "mt-6")}>
                    Boreal keeps demand, planning, execution, artifacts, proof,
                    review, credits, services, and reusable public outcomes
                    attached to one accountable Request thread.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="h-11 rounded-full px-5 text-[12px] font-medium"
                    >
                      <Link href="/?mode=request">Post request</Link>
                    </Button>
                    <Button
                      asChild
                      className="h-11 rounded-full px-5 text-[12px] font-medium"
                      variant="outline"
                    >
                      <Link href="/open-requests">Browse board</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/60 bg-card/70 p-4">
                  <p className={surfaceEyebrowClassName}>Request flow</p>
                  <div className="mt-4 grid gap-2">
                    {processSteps.map((step, index) => (
                      <div
                        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-sm"
                        key={step}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
                          {index + 1}
                        </span>
                        <span className="min-w-0 text-foreground/82">
                          {step}
                        </span>
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
                      One Request should survive intake, execution, delivery,
                      and review.
                    </h2>
                  </div>
                  <Button asChild className="rounded-full" variant="outline">
                    <Link href="/?mode=request">
                      Start Request Preflight
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
                      Public solutions are accepted Request outcomes, not a
                      separate root object.
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

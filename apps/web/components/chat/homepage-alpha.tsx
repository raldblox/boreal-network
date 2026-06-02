"use client";

import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  EyeIcon,
  FileTextIcon,
  HandshakeIcon,
  ListChecksIcon,
  MonitorDotIcon,
  PackageIcon,
  PenLineIcon,
  RouteIcon,
  StoreIcon,
  UserCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RequestBoard } from "@/components/request/request-board";
import { cn } from "@/lib/utils";
import { CreditBalanceLink } from "./credit-balance-link";
import {
  SidebarSurfaceTopNav,
  type SurfaceTopNavLink,
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

const alphaTopNavLinks = [
  { href: "/home/alpha#overview", label: "Overview" },
  { href: "/home/alpha#possibilities", label: "Possibilities" },
  { href: "/home/alpha#flow", label: "How it works" },
  { href: "/home/alpha#board", label: "Board" },
  { href: "/home/alpha#solutions", label: "Solutions" },
] satisfies SurfaceTopNavLink[];

const composerHints = [
  "Plan the work",
  "Attach workers",
  "Keep human steps",
  "Monitor proof",
];

const possibilityCards = [
  {
    body: "Turn a rough product idea into a scoped landing page, launch plan, and proof-ready delivery.",
    label: "Launch something",
    prompt: "I need a landing page for a new paid AI tool. Help me shape the plan, copy, and delivery proof.",
  },
  {
    body: "Bring a broken automation, messy handoff, or half-working agent flow and make the missing steps visible.",
    label: "Fix the messy middle",
    prompt: "My workflow breaks after the AI draft. Find the human checks and handoffs needed to finish it.",
  },
  {
    body: "Ask for video, copy, images, or campaign assets without losing the review path that makes them usable.",
    label: "Make creative work",
    prompt: "Create a short launch video package with script, production notes, files, and review steps.",
  },
  {
    body: "Compare tools, vendors, models, or strategies, then turn the decision into a next-action plan.",
    label: "Decide with context",
    prompt: "Compare two tools for my team and give me the plan to actually switch if one wins.",
  },
  {
    body: "Turn research into a brief someone can execute, with sources, open questions, proof, and next steps.",
    label: "Research into action",
    prompt: "Research this market, then turn it into a launch brief with the human checks still included.",
  },
  {
    body: "Use Boreal when a task needs local access, owner approval, manual judgment, or a real-world handoff.",
    label: "Need a person",
    prompt: "This cannot be done by AI alone. Help me plan the human steps, proof, and worker handoff.",
  },
];

const flowSteps = [
  {
    body: "Start with the messy version. Boreal asks for the outcome, constraints, budget, deadline, and proof.",
    icon: PenLineIcon,
    title: "Brief the work",
  },
  {
    body: "The request becomes a plan that separates what AI can do from what needs a person, service, or local runtime.",
    icon: RouteIcon,
    title: "Shape the plan",
  },
  {
    body: "A worker, service, agent, or runtime can attach when the path is clear enough to execute.",
    icon: HandshakeIcon,
    title: "Attach help",
  },
  {
    body: "The workroom shows active steps, blockers, files, proof, and what still needs review.",
    icon: MonitorDotIcon,
    title: "Watch it move",
  },
  {
    body: "Delivery is not treated as done until the needed proof, human judgment, or handoff is visible.",
    icon: ClipboardCheckIcon,
    title: "Review delivery",
  },
];

const trustCards = [
  {
    body: "AI can draft, summarize, compare, and generate. Boreal keeps that useful without pretending it is always completion.",
    title: "AI does the parts it should.",
  },
  {
    body: "Plans can include owner approvals, worker judgment, local runtime access, manual handoff, and verification steps.",
    title: "Human steps stay in the plan.",
  },
  {
    body: "Files, proof, payments, blockers, and delivery stay tied to the workroom instead of disappearing into a chat log.",
    title: "The thread remembers the job.",
  },
];

const sidePaths = [
  {
    body: "Pick a ready-to-buy service when the worker is already known and you want a faster path into the workroom.",
    cta: "Browse services",
    href: "/services",
    icon: StoreIcon,
    label: "Services",
    title: "Start from a packaged outcome.",
  },
  {
    body: "Define what you can deliver, what buyers need to provide, and what proof you return when work is complete.",
    cta: "Offer a service",
    href: "/supplies",
    icon: PackageIcon,
    label: "Providers",
    title: "Make your work attachable.",
  },
];

export function HomeAlphaPage() {
  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          links={alphaTopNavLinks}
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
                className="relative overflow-hidden rounded-[34px] border border-border/60 bg-card/30 px-5 py-7 md:px-8 md:py-9"
                id="overview"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle at 15% 10%, rgba(229,229,229,0.12), transparent 28%), radial-gradient(circle at 92% 6%, rgba(163,163,163,0.12), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.055), transparent 38%)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />

                <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.03fr)_minmax(330px,0.97fr)] lg:items-center">
                  <div className="max-w-4xl">
                    <p className={surfaceEyebrowClassName}>
                      Alpha homepage
                    </p>
                    <h1 className={cn(surfaceHeroTitleClassName, "mt-6")}>
                      What do you need done?
                    </h1>
                    <p className={cn(surfaceBodyClassName, "mt-6")}>
                      Brief the work once. Boreal shapes the plan, attaches the
                      right worker or service, and keeps human steps visible
                      when judgment, handoff, local access, or proof matters.
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
                        <Link href="/home/alpha#possibilities">
                          Browse examples
                        </Link>
                      </Button>
                    </div>
                    <p className="mt-5 max-w-2xl text-[13px] leading-6 text-muted-foreground">
                      For the work that starts messy, needs judgment, and should
                      not disappear inside a chat thread.
                    </p>
                  </div>

                  <HeroBriefCard />
                </div>
              </section>

              <section className={surfaceSectionClassName} id="possibilities">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className={surfaceEyebrowClassName}>
                      Ways to start
                    </p>
                    <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                      Bring the loose thread. Boreal will make it workable.
                    </h2>
                  </div>
                  <Button asChild className="rounded-full" variant="outline">
                    <Link href="/?mode=request">
                      Start from scratch
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {possibilityCards.map((card) => (
                    <SurfaceCard
                      className="bg-background/35"
                      interactive
                      key={card.label}
                    >
                      <SurfaceCardHeader
                        eyebrow={card.label}
                        title={card.prompt}
                        titleAs="h3"
                      />
                      <SurfaceCardDescription>{card.body}</SurfaceCardDescription>
                      <SurfaceCardActions className="mt-auto pt-3">
                        <Button
                          asChild
                          className="rounded-full"
                          size="sm"
                          variant="outline"
                        >
                          <Link href="/?mode=request">
                            Start this request
                            <ArrowRightIcon className="size-4" />
                          </Link>
                        </Button>
                      </SurfaceCardActions>
                    </SurfaceCard>
                  ))}
                </div>
              </section>

              <section className={surfaceSectionClassName} id="flow">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                  <div>
                    <p className={surfaceEyebrowClassName}>
                      What happens next
                    </p>
                    <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                      A plan that knows when AI is not enough.
                    </h2>
                    <p className={cn(surfaceBodyClassName, "mt-4")}>
                      Boreal does not flatten serious work into a polished
                      answer. It keeps the missing human steps in view so the
                      request can move toward real delivery.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {flowSteps.map((step, index) => {
                      const Icon = step.icon;

                      return (
                        <div
                          className="grid gap-4 rounded-[24px] border border-border/60 bg-background/45 p-4 md:grid-cols-[3rem_minmax(0,1fr)]"
                          key={step.title}
                        >
                          <div className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground/70">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/72">
                              Step {index + 1}
                            </p>
                            <h3 className="mt-1 text-lg font-medium text-foreground">
                              {step.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {step.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className={surfaceSectionClassName}>
                <div className="grid gap-4 md:grid-cols-3">
                  {trustCards.map((card) => (
                    <SurfaceCard className="bg-muted/[0.12]" key={card.title}>
                      <SurfaceCardHeader title={card.title} titleAs="h3" />
                      <SurfaceCardDescription>{card.body}</SurfaceCardDescription>
                    </SurfaceCard>
                  ))}
                </div>
              </section>

              <section className={surfaceSectionClassName} id="board">
                <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className={surfaceEyebrowClassName}>Live board</p>
                    <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                      See what is being asked, planned, and delivered.
                    </h2>
                    <p className={cn(surfaceBodyClassName, "mt-4")}>
                      Active work appears here when public-safe requests are
                      available. The board should make progress visible without
                      exposing private briefing context.
                    </p>
                  </div>
                  <Button asChild className="rounded-full" variant="outline">
                    <Link href="/open-requests">
                      Browse active work
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </div>
                <RequestBoard maxItems={4} variant="home" />
              </section>

              <section className={surfaceSectionClassName}>
                <div className="grid gap-5 md:grid-cols-2">
                  {sidePaths.map((path) => {
                    const Icon = path.icon;

                    return (
                      <SurfaceCard
                        className="bg-background/35"
                        interactive
                        key={path.label}
                      >
                        <SurfaceCardHeader
                          action={
                            <span
                              aria-hidden="true"
                              className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-foreground/70"
                            >
                              <Icon className="size-4" />
                            </span>
                          }
                          eyebrow={path.label}
                          title={path.title}
                          titleAs="h3"
                        />
                        <SurfaceCardDescription>{path.body}</SurfaceCardDescription>
                        <SurfaceCardActions>
                          <Button
                            asChild
                            className="rounded-full"
                            size="sm"
                            variant="outline"
                          >
                            <Link href={path.href}>
                              {path.cta}
                              <ArrowRightIcon className="size-4" />
                            </Link>
                          </Button>
                        </SurfaceCardActions>
                      </SurfaceCard>
                    );
                  })}
                </div>
              </section>

              <section className={surfaceSectionClassName} id="solutions">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <p className={surfaceEyebrowClassName}>
                      Reusable work
                    </p>
                    <h2 className={cn(surfaceSectionTitleClassName, "mt-4")}>
                      Finished work should not vanish after delivery.
                    </h2>
                    <p className={cn(surfaceBodyClassName, "mt-4")}>
                      When a request is public and the result has accepted
                      proof, Boreal can make the finished path inspectable.
                      Reading stays free. Running the work again can use credits
                      when it spends live capacity.
                    </p>
                  </div>

                  <SurfaceCard className="bg-background/35">
                    <SurfaceCardHeader
                      action={
                        <Badge
                          className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
                          variant="secondary"
                        >
                          Free to inspect
                        </Badge>
                      }
                      eyebrow="Future compounding loop"
                      title="The answer should point back to the work that made it trustworthy."
                      titleAs="h3"
                    />
                    <SurfaceCardDescription>
                      A reusable solution should show the original ask, the
                      plan, the worker path, the files, and the proof that made
                      the delivery safe to reuse.
                    </SurfaceCardDescription>
                    <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
                      {[
                        "Inspect the finished path.",
                        "Fork it into a new request.",
                        "Run it again when live work is needed.",
                      ].map((item) => (
                        <div
                          className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/[0.12] px-3 py-2"
                          key={item}
                        >
                          <EyeIcon className="size-4 text-foreground/60" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </SurfaceCard>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroBriefCard() {
  return (
    <div className="rounded-[30px] border border-border/60 bg-background/70 p-4 shadow-[var(--shadow-float)]">
      <div className="flex items-center justify-between gap-3">
        <p className={surfaceEyebrowClassName}>Briefing composer</p>
        <Badge
          className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
          variant="secondary"
        >
          Alpha preview
        </Badge>
      </div>

      <div className="mt-4 rounded-[24px] border border-border/60 bg-card/55 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-foreground/70">
            <FileTextIcon className="size-4" />
          </div>
          <p className="text-sm leading-6 text-foreground/84">
            Describe the work. Boreal will shape the plan, including human
            steps when the job needs them.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {composerHints.map((hint) => (
            <span
              className="rounded-full bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground"
              key={hint}
            >
              {hint}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <MiniFlowRow
          icon={ListChecksIcon}
          label="Plan"
          text="The ask becomes steps a worker can follow."
        />
        <MiniFlowRow
          icon={UserCheckIcon}
          label="Human steps"
          text="Approvals, handoffs, and judgment stay visible."
        />
        <MiniFlowRow
          icon={MonitorDotIcon}
          label="Workroom"
          text="Progress, files, blockers, and proof stay together."
        />
      </div>
    </div>
  );
}

function MiniFlowRow({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof ListChecksIcon;
  label: string;
  text: string;
}) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border/55 bg-background/45 px-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-foreground/70">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}

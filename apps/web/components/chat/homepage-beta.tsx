"use client";

import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  HandshakeIcon,
  ListChecksIcon,
  RouteIcon,
  UserCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { borealServiceFamilies } from "@/lib/service-catalog";
import { cn } from "@/lib/utils";
import { CreditBalanceLink } from "./credit-balance-link";
import {
  surfaceBodyClassName,
  surfaceColumnClassName,
  surfaceEyebrowClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceSectionClassName,
  surfaceShellClassName,
  surfaceViewportClassName,
} from "./surface-layout";
import {
  SidebarSurfaceTopNav,
  type SurfaceTopNavLink,
} from "./surface-top-nav";

type WorkSlotKey = "request" | "plan" | "workers" | "funding" | "outcome";
type WorkSlotState = "complete" | "active" | "missing" | "locked";
type WorkCardFilter =
  | "all"
  | "services"
  | "needs-plan"
  | "needs-workers"
  | "funding"
  | "in-progress"
  | "reuse-ready";
type WorkCardSort = "recommended" | "closest" | "most-missing" | "newest";

type WorkSlot = {
  detail: string;
  key: WorkSlotKey;
  state: WorkSlotState;
  title: string;
};

type WorkCard = {
  cta: string;
  filters: WorkCardFilter[];
  href: string;
  id: string;
  kind: string;
  metrics: string[];
  recommended: number;
  summary: string;
  tags: string[];
  timestamp: number;
  title: string;
  slots: WorkSlot[];
};

const betaTopNavLinks = [
  { href: "/home/beta#cards", label: "Cards" },
  { href: "/services", label: "Services" },
  { href: "/open-requests", label: "Open requests" },
] satisfies SurfaceTopNavLink[];

const filterOptions = [
  { key: "all", label: "All" },
  { key: "services", label: "Services" },
  { key: "needs-plan", label: "Needs plan" },
  { key: "needs-workers", label: "Needs workers" },
  { key: "funding", label: "Funding gap" },
  { key: "in-progress", label: "Moving" },
  { key: "reuse-ready", label: "Reuse ready" },
] satisfies Array<{ key: WorkCardFilter; label: string }>;

const sortOptions = [
  { key: "recommended", label: "Recommended" },
  { key: "closest", label: "Closest to complete" },
  { key: "most-missing", label: "Most missing" },
  { key: "newest", label: "Newest" },
] satisfies Array<{ key: WorkCardSort; label: string }>;

const slotLabelByKey: Record<WorkSlotKey, string> = {
  funding: "Funding",
  outcome: "Outcome",
  plan: "Plan",
  request: "Request",
  workers: "Workers",
};

const slotIconByKey = {
  funding: HandshakeIcon,
  outcome: ClipboardCheckIcon,
  plan: ListChecksIcon,
  request: FileTextIcon,
  workers: UserCheckIcon,
} satisfies Record<WorkSlotKey, typeof FileTextIcon>;

const slotStateMeta = {
  active: {
    label: "Needs action",
    className:
      "border-amber-400/45 bg-amber-400/[0.08] text-foreground shadow-[0_0_0_1px_rgba(251,191,36,0.08)]",
    dotClassName: "bg-amber-300",
  },
  complete: {
    label: "Added",
    className: "border-emerald-400/28 bg-emerald-400/[0.07] text-foreground",
    dotClassName: "bg-emerald-300",
  },
  locked: {
    label: "Needs funding",
    className:
      "border-dashed border-orange-300/45 bg-orange-400/[0.07] text-foreground",
    dotClassName: "bg-orange-300",
  },
  missing: {
    label: "Missing",
    className:
      "border-dashed border-border/80 bg-muted/20 text-muted-foreground",
    dotClassName: "bg-muted-foreground/45",
  },
} satisfies Record<
  WorkSlotState,
  { className: string; dotClassName: string; label: string }
>;

function serviceRequestHref(familyKey: string, planKey: string) {
  return `/?mode=request&serviceFamilyKey=${encodeURIComponent(
    familyKey,
  )}&servicePlanKey=${encodeURIComponent(planKey)}`;
}

const serviceWorkCards: WorkCard[] = borealServiceFamilies
  .slice(0, 3)
  .map((family, index) => {
    const plan = family.plans[0];
    const recommendedScores = [96, 88, 84];

    return {
      cta: "Open service workroom",
      filters: ["services", "funding", "in-progress"],
      href: serviceRequestHref(family.familyKey, plan.planKey),
      id: `service-${family.familyKey}-${plan.planKey}`,
      kind: "Service card",
      metrics: [plan.price, plan.turnaround, family.providerLabel],
      recommended: recommendedScores[index] ?? 80,
      slots: [
        {
          detail: "Buyer fills the missing brief fields before launch.",
          key: "request",
          state: "active",
          title: "Service starter request",
        },
        {
          detail: "Preset plan, proof, review, and handoff are known.",
          key: "plan",
          state: "complete",
          title: plan.label,
        },
        {
          detail: family.providerLabel,
          key: "workers",
          state: "complete",
          title: "Known supply path",
        },
        {
          detail: `${plan.price} checkout before execution starts.`,
          key: "funding",
          state: "locked",
          title: "Funds missing piece",
        },
        {
          detail: family.proof.slice(0, 2).join(", "),
          key: "outcome",
          state: "missing",
          title: "Proof lands after run",
        },
      ],
      summary: plan.summary,
      tags: ["working service", ...family.tags.slice(0, 3)],
      timestamp: 20260602 - index,
      title: `${family.title}: ${plan.label}`,
    };
  });

const curatedWorkCards: WorkCard[] = [
  {
    cta: "Open request workroom",
    filters: ["needs-plan", "needs-workers", "funding"],
    href: "/?mode=request",
    id: "checkout-recovery",
    kind: "Pressing open request",
    metrics: ["urgent ops", "payment proof", "owner review"],
    recommended: 95,
    slots: [
      {
        detail: "Owner explains the broken checkout, recent changes, and risk.",
        key: "request",
        state: "complete",
        title: "Checkout failing before invoices",
      },
      {
        detail: "Needs a rollback-safe diagnosis and test-payment path.",
        key: "plan",
        state: "active",
        title: "Recovery plan missing",
      },
      {
        detail: "Needs web, payment, and verification help.",
        key: "workers",
        state: "missing",
        title: "Specialists not placed",
      },
      {
        detail: "Budget can be attached once the risk path is clear.",
        key: "funding",
        state: "locked",
        title: "Scoped funding",
      },
      {
        detail:
          "Expected proof: passing checkout, receipt, and rollback notes.",
        key: "outcome",
        state: "missing",
        title: "No accepted proof yet",
      },
    ],
    summary:
      "A real-world business problem where the request is clear, but the plan, workers, and proof path still need to be assembled.",
    tags: ["payments", "small business", "urgent"],
    timestamp: 20260601,
    title: "Fix a broken checkout before invoices fail",
  },
  {
    cta: "Open campaign workroom",
    filters: ["needs-workers", "in-progress"],
    href: "/?mode=request",
    id: "agent-payment-feedback",
    kind: "Campaign request",
    metrics: ["100 testers", "survey proof", "multi-worker"],
    recommended: 94,
    slots: [
      {
        detail: "Collect real user failures from agent checkout attempts.",
        key: "request",
        state: "complete",
        title: "Agent payment friction map",
      },
      {
        detail: "Survey, evidence rules, and feedback buckets are drafted.",
        key: "plan",
        state: "complete",
        title: "Campaign plan ready",
      },
      {
        detail: "Needs many testers, reviewers, and summarizers.",
        key: "workers",
        state: "active",
        title: "Worker slots open",
      },
      {
        detail: "Reward pool can expand when participation is proven.",
        key: "funding",
        state: "active",
        title: "Participation funding",
      },
      {
        detail: "Target outcome: public failure map and reusable UX fixes.",
        key: "outcome",
        state: "missing",
        title: "Insight report pending",
      },
    ],
    summary:
      "A campaign-shaped request where many contributors can add survey answers, screenshots, and feedback before Boreal packages the outcome.",
    tags: ["campaign", "survey", "agents", "x402"],
    timestamp: 20260531,
    title: "Map why agent payments fail for normal users",
  },
  {
    cta: "Open workflow workroom",
    filters: ["needs-plan", "in-progress"],
    href: "/?mode=request",
    id: "mcp-adapter-readiness",
    kind: "Workflow request",
    metrics: ["MCP/A2A", "sandbox notes", "operator gate"],
    recommended: 93,
    slots: [
      {
        detail: "Requester wants external agents to use Boreal safely.",
        key: "request",
        state: "complete",
        title: "Adapter readiness pass",
      },
      {
        detail: "Needs route-level mutation tests and rejection cases.",
        key: "plan",
        state: "active",
        title: "Safety plan forming",
      },
      {
        detail: "Protocol implementer and tester still need placement.",
        key: "workers",
        state: "missing",
        title: "Adapter workers missing",
      },
      {
        detail: "No live external-agent credentials in beta scope.",
        key: "funding",
        state: "complete",
        title: "Preflight only",
      },
      {
        detail: "Target: reusable adapter checklist and test evidence.",
        key: "outcome",
        state: "missing",
        title: "Evidence not accepted",
      },
    ],
    summary:
      "A Boreal-native workflow card for technical work: discovery, preflight, mutation safety, and production rejection before live adapters.",
    tags: ["agent UX", "MCP", "A2A", "sandbox"],
    timestamp: 20260530,
    title: "Prepare safe agent adapters without granting production access",
  },
  {
    cta: "Reuse accepted outcome",
    filters: ["reuse-ready", "in-progress"],
    href: "/?mode=request",
    id: "launch-clip-reuse",
    kind: "Reuse-ready request",
    metrics: ["accepted proof", "forkable plan", "credit run"],
    recommended: 89,
    slots: [
      {
        detail: "Original request asked for reusable launch clips.",
        key: "request",
        state: "complete",
        title: "Launch asset request",
      },
      {
        detail: "Plan can be copied with updated audience and offer.",
        key: "plan",
        state: "complete",
        title: "Reusable plan",
      },
      {
        detail: "Creative worker path is already known.",
        key: "workers",
        state: "complete",
        title: "Known worker lane",
      },
      {
        detail: "New buyer funds their private run request.",
        key: "funding",
        state: "active",
        title: "Run funding needed",
      },
      {
        detail: "Accepted artifacts are visible as proof and reference.",
        key: "outcome",
        state: "complete",
        title: "Outcome accepted",
      },
    ],
    summary:
      "A completed request pattern that visitors can inspect, understand, and reuse as a new private request with their own constraints.",
    tags: ["reuse", "creative work", "proof"],
    timestamp: 20260529,
    title: "Reuse a proven launch clip workflow for a new offer",
  },
  {
    cta: "Open civic request",
    filters: ["needs-workers", "needs-plan"],
    href: "/?mode=request",
    id: "local-aid-intake",
    kind: "Public-interest request",
    metrics: ["volunteer intake", "evidence rules", "handoff"],
    recommended: 87,
    slots: [
      {
        detail: "Collect local needs, available help, and proof constraints.",
        key: "request",
        state: "complete",
        title: "Neighborhood aid intake",
      },
      {
        detail: "Needs safe triage rules before any assignment.",
        key: "plan",
        state: "active",
        title: "Triage plan missing",
      },
      {
        detail: "Needs verifiers, callers, translators, and coordinators.",
        key: "workers",
        state: "missing",
        title: "Many roles unfilled",
      },
      {
        detail: "No payout until verification and handoff rules are clear.",
        key: "funding",
        state: "locked",
        title: "Guarded funding",
      },
      {
        detail: "Target: verified list, handoff notes, and completion log.",
        key: "outcome",
        state: "missing",
        title: "Outcome not ready",
      },
    ],
    summary:
      "A pressing request where the value is not one AI answer, but safe intake, distributed human work, and proof-backed handoff.",
    tags: ["community", "coordination", "human review"],
    timestamp: 20260528,
    title: "Coordinate local aid requests without losing verification",
  },
];

const workCards = [...serviceWorkCards, ...curatedWorkCards];

function completionScore(card: WorkCard) {
  return card.slots.reduce((score, slot) => {
    if (slot.state === "complete") {
      return score + 2;
    }

    if (slot.state === "active") {
      return score + 1;
    }

    return score;
  }, 0);
}

function missingCount(card: WorkCard) {
  return card.slots.filter(
    (slot) => slot.state === "missing" || slot.state === "locked",
  ).length;
}

function sortCards(cards: WorkCard[], sort: WorkCardSort) {
  return [...cards].sort((left, right) => {
    if (sort === "closest") {
      return completionScore(right) - completionScore(left);
    }

    if (sort === "most-missing") {
      return missingCount(right) - missingCount(left);
    }

    if (sort === "newest") {
      return right.timestamp - left.timestamp;
    }

    return right.recommended - left.recommended;
  });
}

export function HomeBetaPage() {
  const [activeFilter, setActiveFilter] = useState<WorkCardFilter>("all");
  const [sort, setSort] = useState<WorkCardSort>("recommended");

  const visibleCards = useMemo(() => {
    const filteredCards =
      activeFilter === "all"
        ? workCards
        : workCards.filter((card) => card.filters.includes(activeFilter));

    return sortCards(filteredCards, sort);
  }, [activeFilter, sort]);

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          links={betaTopNavLinks}
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
                className="relative min-h-[58vh] overflow-hidden px-5 py-8 md:px-8 md:py-10 lg:px-10"
                id="overview"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    background:
                      "radial-gradient(circle at 13% 12%, rgba(250,204,21,0.13), transparent 24%), radial-gradient(circle at 88% 8%, rgba(45,212,191,0.11), transparent 22%), linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                  }}
                />

                <div className="relative grid min-h-[48vh] gap-9 lg:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.98fr)] lg:items-center ">
                  <div className="max-w-4xl">
                    <p className={surfaceEyebrowClassName}>
                      Request-native work commerce
                    </p>
                    <h1 className={cn(surfaceHeroTitleClassName, "mt-6")}>
                      Explore what Boreal can turn into completed work.
                    </h1>
                    <p className={cn(surfaceBodyClassName, "mt-6")}>
                      Each row shows the Request, plan, workers, funding, and
                      outcome. Complete parts are filled. Missing parts stay
                      dashed until the workroom resolves them.
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
                        <Link href="#cards">Explore cards</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-border/60 bg-background/55 p-4 shadow-2xl shadow-black/10 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={surfaceEyebrowClassName}>Card anatomy</p>
                        <p className="mt-2 text-sm leading-6 text-foreground/82">
                          A service is nearly complete. The missing piece is
                          usually the buyer brief, funding, or final outcome.
                        </p>
                      </div>
                      <Badge className="rounded-full border-border/60 bg-muted/40 text-foreground/70">
                        5 parts
                      </Badge>
                    </div>
                    <div className="mt-5 grid gap-2">
                      {["Request", "Plan", "Workers", "Funding", "Outcome"].map(
                        (part, index) => (
                          <div
                            className={cn(
                              "flex items-center justify-between rounded-2xl border px-4 py-3",
                              index < 3
                                ? "border-emerald-400/25 bg-emerald-400/[0.06]"
                                : "border-dashed border-border/80 bg-muted/20",
                            )}
                            key={part}
                          >
                            <span className="text-sm font-medium text-foreground/82">
                              {part}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
                              {index < 3 ? "added" : "missing"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section
                className={cn(surfaceSectionClassName, "pb-12 pt-5 md:pt-6")}
                id="cards"
              >
                <div className="sticky top-3 z-20 mb-5 rounded-[26px] border border-border/70 bg-background/88 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {filterOptions.map((option) => (
                        <button
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                            activeFilter === option.key
                              ? "border-foreground/35 bg-foreground text-background"
                              : "border-border/70 bg-muted/20 text-muted-foreground hover:text-foreground",
                          )}
                          key={option.key}
                          onClick={() => setActiveFilter(option.key)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
                      Sort
                      <select
                        className="h-9 rounded-full border border-border/70 bg-background px-3 text-[12px] normal-case tracking-normal text-foreground outline-none"
                        onChange={(event) =>
                          setSort(event.target.value as WorkCardSort)
                        }
                        value={sort}
                      >
                        {sortOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid gap-4">
                  {visibleCards.map((card) => (
                    <WorkCardRow card={card} key={card.id} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkCardRow({ card }: { card: WorkCard }) {
  const completeParts = card.slots.filter(
    (slot) => slot.state === "complete",
  ).length;
  const missingParts = missingCount(card);

  return (
    <Link className="group block" href={card.href}>
      <article className="overflow-hidden rounded-[32px] border border-border/65 bg-card/48 p-4 transition-colors hover:border-foreground/22 hover:bg-card/66 md:p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] xl:items-stretch">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-border/60 bg-muted/35 text-foreground/70">
                {card.kind}
              </Badge>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {completeParts}/5 added
              </span>
              {missingParts > 0 ? (
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  {missingParts} missing
                </span>
              ) : null}
            </div>

            <h3 className="mt-4 text-[1.55rem] font-normal leading-[1.1] tracking-[-0.014em] text-foreground [font-family:var(--font-display)]">
              {card.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {card.summary}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  className="rounded-full border border-border/60 bg-background/45 px-3 py-1 text-[11px] text-muted-foreground"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              {card.metrics.map((metric) => (
                <div
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                  key={metric}
                >
                  <span className="size-1.5 rounded-full bg-foreground/45" />
                  {metric}
                </div>
              ))}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {card.cta}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>

          <div className="rounded-[26px] border border-border/55 bg-background/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RouteIcon className="size-4 text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
                  Generated flow
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground/72">
                Click opens workroom
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-5">
              {card.slots.map((slot, index) => (
                <WorkSlotTile
                  index={index}
                  key={`${card.id}-${slot.key}`}
                  slot={slot}
                />
              ))}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function WorkSlotTile({ index, slot }: { index: number; slot: WorkSlot }) {
  const Icon = slotIconByKey[slot.key];
  const stateMeta = slotStateMeta[slot.state];

  return (
    <div className="relative min-w-0">
      {index > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 hidden h-px w-2 bg-border md:block"
        />
      ) : null}
      <div
        className={cn(
          "min-h-[10.5rem] rounded-[22px] border p-3",
          stateMeta.className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn("size-2 rounded-full", stateMeta.dotClassName)}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-current/62">
              {slotLabelByKey[slot.key]}
            </span>
          </div>
          <Icon className="size-4 text-current/55" />
        </div>
        <p className="mt-4 text-sm font-medium leading-5 text-current">
          {slot.title}
        </p>
        <p className="mt-2 text-xs leading-5 text-current/67">{slot.detail}</p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-current/55">
          {stateMeta.label}
        </p>
      </div>
    </div>
  );
}

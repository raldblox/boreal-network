import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  HandshakeIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  HomeBetaWorkSlot,
  HomeBetaWorkSlotKey,
  HomeBetaWorkSlotState,
  ShowcaseRequestCatalogEntry,
} from "@/lib/showcase-request-catalog";
import {
  getHomeBetaWorkerReadinessDetail,
  getHomeBetaWorkerReadinessLabel,
  toHomeBetaWorkCard,
} from "@/lib/showcase-request-catalog";
import { cn } from "@/lib/utils";
import { formatSurfaceToken, SurfaceTagList } from "./surface-card";
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

const topNavLinks = [
  { href: "/home/beta", label: "Explore" },
  { href: "/services", label: "Services" },
  { href: "/open-requests", label: "Open requests" },
] satisfies SurfaceTopNavLink[];

const slotLabelByKey: Record<HomeBetaWorkSlotKey, string> = {
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
} satisfies Record<HomeBetaWorkSlotKey, typeof FileTextIcon>;

const slotStateMeta = {
  active: {
    label: "Needs action",
    className: "border-amber-400/45 bg-amber-400/[0.08]",
    dotClassName: "bg-amber-300",
  },
  complete: {
    label: "Added",
    className: "border-emerald-400/28 bg-emerald-400/[0.07]",
    dotClassName: "bg-emerald-300",
  },
  locked: {
    label: "Needs gate",
    className: "border-dashed border-orange-300/45 bg-orange-400/[0.07]",
    dotClassName: "bg-orange-300",
  },
  missing: {
    label: "Missing",
    className: "border-dashed border-border/80 bg-muted/20",
    dotClassName: "bg-muted-foreground/45",
  },
} satisfies Record<
  HomeBetaWorkSlotState,
  { className: string; dotClassName: string; label: string }
>;

export function ShowcaseRequestWorkroom({
  entry,
}: {
  entry: ShowcaseRequestCatalogEntry;
}) {
  const card = toHomeBetaWorkCard(entry);
  const request = entry.request;
  const primaryAction = card.primaryAction;
  const missingDetails = request.derived.missingDetails;

  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          links={topNavLinks}
          rightSlot={
            <Button
              asChild
              className="rounded-full"
              size="sm"
              variant="outline"
            >
              <Link href="/home/beta">
                <ArrowLeftIcon className="size-4" />
                Explore cards
              </Link>
            </Button>
          }
          title="Showcase workroom"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-6")}>
              <section
                className={cn(
                  surfaceSectionClassName,
                  "grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]",
                )}
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full border-border/60 bg-muted/35 text-foreground/72">
                      {card.kind}
                    </Badge>
                    <Badge className="rounded-full border-amber-400/35 bg-amber-400/[0.08] text-foreground/72">
                      View-only showcase
                    </Badge>
                    <Badge className="rounded-full border-border/60 bg-background/45 text-foreground/72">
                      {formatSurfaceToken(request.status)}
                    </Badge>
                  </div>

                  <p className={cn(surfaceEyebrowClassName, "mt-7")}>
                    Request workroom preview
                  </p>
                  <h1 className={cn(surfaceHeroTitleClassName, "mt-4")}>
                    {request.brief.title}
                  </h1>
                  <p className={cn(surfaceBodyClassName, "mt-5 max-w-3xl")}>
                    {request.brief.summary}
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-11 rounded-full px-5">
                      <Link href={primaryAction.href}>
                        {primaryAction.label}
                        <ArrowRightIcon className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="h-11 rounded-full px-5"
                      variant="outline"
                    >
                      <Link href="/home/beta">Back to explore</Link>
                    </Button>
                  </div>
                </div>

                <aside className="rounded-[28px] border border-border/65 bg-card/50 p-5">
                  <p className={surfaceEyebrowClassName}>Catalog boundary</p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>
                      This is a request-like projection from the hardcoded
                      showcase catalog. It is not a persisted database record.
                    </p>
                    <p>
                      Action cards are render hints. They do not grant
                      permission, record approval, authorize payment, create
                      durable history, or prove completion.
                    </p>
                  </div>
                  <dl className="mt-5 space-y-3 text-xs">
                    <FactRow label="Request id" value={request.id} />
                    <FactRow label="Request key" value={request.key} />
                    <FactRow
                      label="Source"
                      value={`${entry.source.provenance}, DB-backed: ${entry.source.databaseBacked}`}
                    />
                  </dl>
                </aside>
              </section>

              <section className={cn(surfaceSectionClassName, "pt-0")}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className={surfaceEyebrowClassName}>Request flow</p>
                    <h2 className="mt-2 text-2xl font-normal tracking-[-0.02em] text-foreground [font-family:var(--font-display)]">
                      What is added, missing, or gated
                    </h2>
                  </div>
                  <Badge className="rounded-full border-border/60 bg-muted/35 text-foreground/72">
                    {
                      card.slots.filter((slot) => slot.state === "complete")
                        .length
                    }
                    /5 added
                  </Badge>
                </div>

                <div className="grid gap-3 lg:grid-cols-5">
                  {card.slots.map((slot, index) => (
                    <FlowSlotCard
                      index={index}
                      key={`${card.id}:${slot.key}`}
                      slot={slot}
                    />
                  ))}
                </div>
              </section>

              <section
                className={cn(
                  surfaceSectionClassName,
                  "grid gap-5 pt-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
                )}
              >
                <div className="rounded-[28px] border border-border/65 bg-card/45 p-5">
                  <p className={surfaceEyebrowClassName}>Request object</p>
                  <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
                    <FactRow label="Status" value={request.status} />
                    <FactRow label="Visibility" value={request.visibility} />
                    <FactRow
                      label="Route"
                      value={request.derived.routeFamily ?? "not routed"}
                    />
                    <FactRow
                      label="Payment"
                      value={request.derived.paymentMode ?? "not set"}
                    />
                    <FactRow
                      label="Execution"
                      value={request.derived.executionKind ?? "not set"}
                    />
                    <FactRow
                      label="Matching"
                      value={request.derived.matchingMode ?? "not set"}
                    />
                  </dl>
                  <SurfaceTagList tags={request.brief.tags} />

                  {missingDetails.length > 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/35 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/72">
                        Missing details
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {missingDetails.map((detail) => (
                          <li className="flex gap-2" key={detail}>
                            <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/45" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-2xl border border-border/60 bg-background/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/72">
                        <UserCheckIcon className="size-3.5" />
                        Worker readiness
                      </div>
                      <Badge className="rounded-full border-border/60 bg-muted/35 text-foreground/72">
                        {getHomeBetaWorkerReadinessLabel(card)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {getHomeBetaWorkerReadinessDetail(card)}
                    </p>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                      <FactRow
                        label="Agent lanes"
                        value={`${card.workerReadiness.summary.agentCanPrepareCount} can prepare`}
                      />
                      <FactRow
                        label="Human lane"
                        value={formatSurfaceToken(
                          card.workerReadiness.humanLane.state,
                        )}
                      />
                      <FactRow
                        label="Listing mode"
                        value={formatSurfaceToken(
                          card.workerReadiness.listingMode,
                        )}
                      />
                      <FactRow
                        label="Authority"
                        value="read-only hint"
                      />
                    </dl>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/65 bg-card/45 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={surfaceEyebrowClassName}>Action hints</p>
                      <h2 className="mt-2 text-xl font-medium tracking-tight text-foreground">
                        What this request can show next
                      </h2>
                    </div>
                    <ShieldCheckIcon className="size-5 text-muted-foreground" />
                  </div>

                  <div className="mt-5 grid gap-3">
                    {request.agentActionCardHints.cards.map((hint) => (
                      <div
                        className={cn(
                          "rounded-2xl border border-border/65 bg-background/40 p-4",
                          hint.actionId === primaryAction.actionId &&
                            "border-emerald-400/30 bg-emerald-400/[0.06]",
                        )}
                        key={hint.actionId}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border-border/60 bg-muted/35 text-foreground/72">
                            {hint.method}
                          </Badge>
                          <Badge className="rounded-full border-border/60 bg-background/45 text-foreground/72">
                            {formatSurfaceToken(hint.state)}
                          </Badge>
                          {hint.actionId === primaryAction.actionId ? (
                            <Badge className="rounded-full border-emerald-400/30 bg-emerald-400/[0.08] text-foreground/72">
                              Primary
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="mt-3 font-medium text-foreground">
                          {hint.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {hint.summary}
                        </p>
                        {hint.canonicalWritesIfAuthorized.length > 0 ? (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Writes if authorized:{" "}
                            {hint.canonicalWritesIfAuthorized.join(", ")}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Read or draft-only. No durable write from this card.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowSlotCard({
  index,
  slot,
}: {
  index: number;
  slot: HomeBetaWorkSlot;
}) {
  const Icon = slotIconByKey[slot.key];
  const stateMeta = slotStateMeta[slot.state];

  return (
    <div className="relative min-w-0">
      {index > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 hidden h-px w-2 bg-border lg:block"
        />
      ) : null}
      <div
        className={cn(
          "min-h-[13rem] rounded-[24px] border p-4 text-foreground",
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

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/35 p-3">
      <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/72">
        {label}
      </dt>
      <dd className="mt-2 break-words text-xs leading-5 text-foreground/82">
        {value}
      </dd>
    </div>
  );
}

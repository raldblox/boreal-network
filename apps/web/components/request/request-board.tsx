"use client";

import {
  ArrowRightIcon,
  BotIcon,
  Clock3Icon,
  FileCheck2Icon,
  SearchIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceList } from "@/components/ui/resource-list";
import type { PublicRequestPoolEntry, RequestStatus } from "@/lib/request";
import {
  type RequestHumanWorkerReadiness,
  type RequestWorkerReadiness,
  buildRequestWorkerReadiness,
} from "@/lib/request-worker-readiness";
import { cn, fetcher } from "@/lib/utils";
import {
  formatSurfaceToken,
  SurfaceCard,
  SurfaceCardActions,
  SurfaceCardDescription,
  SurfaceCardHeader,
  SurfaceCardSkeleton,
  SurfaceTagList,
} from "../chat/surface-card";
import {
  surfaceBodyClassName,
  surfaceEyebrowClassName,
  surfaceSectionTitleClassName,
} from "../chat/surface-layout";

type PublicRequestPoolResponse = {
  requests: PublicRequestPoolEntry[];
  hasMore: boolean;
};

type RequestBoardStatusFilter =
  | "all"
  | "open"
  | "active"
  | "review"
  | "needs_details";

type RequestBoardSort = "recent" | "ready" | "status" | "title";

type RequestBoardProps = {
  className?: string;
  maxItems?: number;
  showIntro?: boolean;
  variant?: "home" | "board";
};

const publicRequestsKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests?scope=public&limit=20`;

const requestStatusFilters: Array<{
  key: RequestBoardStatusFilter;
  label: string;
}> = [
  { key: "all", label: "All statuses" },
  { key: "open", label: "Open" },
  { key: "active", label: "Work active" },
  { key: "review", label: "Needs review" },
  { key: "needs_details", label: "Needs details" },
];

const requestSortOptions: Array<{
  key: RequestBoardSort;
  label: string;
}> = [
  { key: "recent", label: "Recent activity" },
  { key: "ready", label: "Ready first" },
  { key: "status", label: "Status" },
  { key: "title", label: "Title" },
];

const activeStatuses = new Set<RequestStatus>([
  "funded",
  "in_progress",
  "waiting_for_owner",
]);
const reviewStatuses = new Set<RequestStatus>(["delivered", "completed"]);

const statusRank: Record<RequestStatus, number> = {
  draft: 0,
  open: 1,
  funding_required: 2,
  funded: 3,
  in_progress: 4,
  waiting_for_owner: 5,
  delivered: 6,
  completed: 7,
  cancelled: 8,
  failed: 9,
};

export function RequestBoard({
  className,
  maxItems,
  showIntro = true,
  variant = "board",
}: RequestBoardProps) {
  const { data, error, isLoading } = useSWR<PublicRequestPoolResponse>(
    publicRequestsKey,
    fetcher,
    { revalidateOnFocus: false }
  );
  const requests = data?.requests ?? [];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RequestBoardStatusFilter>("all");
  const [sort, setSort] = useState<RequestBoardSort>("recent");

  const visibleRequests = useMemo(() => {
    const normalizedQuery = normalizeBoardSearch(query);
    const filtered = requests.filter((request) => {
      if (!requestMatchesStatusFilter(request, statusFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return getRequestSearchText(request).includes(normalizedQuery);
    });

    filtered.sort((left, right) => compareRequests(left, right, sort));

    return typeof maxItems === "number"
      ? filtered.slice(0, maxItems)
      : filtered;
  }, [maxItems, query, requests, sort, statusFilter]);

  const hasFilters = query.trim().length > 0 || statusFilter !== "all";
  const emptyTitle =
    requests.length === 0
      ? "No public requests yet"
      : "No matching requests";
  const emptyDescription =
    requests.length === 0
      ? "There are no public requests to browse yet."
      : "Try another search term or status filter. Reading public request context stays free.";

  return (
    <section className={cn("space-y-5", className)} id="request-board">
      {showIntro ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className={surfaceEyebrowClassName}>Request board</p>
            <h2 className={cn(surfaceSectionTitleClassName, "mt-3")}>
              Active demand, visible status, clear next action.
            </h2>
            <p className={cn(surfaceBodyClassName, "mt-3 text-sm")}>
              Search by ask, status, expected proof, or tags. Browse for free,
              then post, plan, fund, review, or run when there is a real next
              step.
            </p>
          </div>
          {variant === "home" ? (
            <Button asChild className="rounded-full" size="sm" variant="outline">
              <Link href="/open-requests">
                Open full board
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-[28px] border border-border/60 bg-card/70 p-4 shadow-sm",
          variant === "board" && "md:p-5"
        )}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <span className="sr-only">Search request board</span>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              aria-label="Search request board"
              className="h-11 w-full rounded-full border border-border/70 bg-background/80 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/35"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests, proof, tags, routes..."
              type="search"
              value={query}
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Sort request board</span>
            <select
              aria-label="Sort request board"
              className="h-11 w-full appearance-none rounded-full border border-border/70 bg-background/80 px-4 text-sm outline-none transition-colors focus:border-foreground/35"
              onChange={(event) =>
                setSort(event.target.value as RequestBoardSort)
              }
              value={sort}
            >
              {requestSortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          aria-label="Request board status filters"
          className="mt-3 flex flex-wrap gap-2"
          role="group"
        >
          {requestStatusFilters.map((filter) => {
            const active = statusFilter === filter.key;

            return (
              <button
                aria-pressed={active}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12px] font-medium transition-colors",
                  active
                    ? "border-foreground/25 bg-foreground text-background"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                )}
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <ResourceList
        aria-label="Request board results"
        columns={variant === "home" ? "one" : "two"}
        emptyState={
          <EmptyState
            align="start"
            className="rounded-[28px] border-border/60 bg-transparent shadow-none"
            description={emptyDescription}
            title={emptyTitle}
          />
        }
        error={error}
        errorState={
          <EmptyState
            align="start"
            className="rounded-[28px] border-amber-500/25 bg-amber-500/8 shadow-none"
            description="Boreal could not load the public request board right now."
            title="Request board unavailable"
            tone="warning"
          />
        }
        getKey={(request) => request.id}
        isLoading={isLoading}
        items={visibleRequests}
        layout="grid"
        listClassName={variant === "home" ? "md:grid-cols-1" : undefined}
        loadingItemCount={variant === "home" ? 2 : 4}
        renderItem={(request) => (
          <RequestBoardCard request={request} showCompact={variant === "home"} />
        )}
        renderLoadingItem={() => <SurfaceCardSkeleton />}
      />

      {hasFilters && visibleRequests.length > 0 ? (
        <p className="text-xs text-muted-foreground" role="status">
          Showing {visibleRequests.length} of {requests.length} public requests.
        </p>
      ) : null}
    </section>
  );
}

function RequestBoardCard({
  request,
  showCompact,
}: {
  request: PublicRequestPoolEntry;
  showCompact: boolean;
}) {
  const routeLabel = request.derived.routeFamily
    ? formatSurfaceToken(request.derived.routeFamily)
    : "route pending";
  const readinessLabel = formatSurfaceToken(request.derived.readiness.state);
  const proofSummary = getProofSummary(request);
  const workerReadiness = buildRequestWorkerReadiness(request);
  const visibleAgentLanes = showCompact
    ? workerReadiness.agentLanes.filter(
        (hint) => hint.readiness === "can_prepare"
      )
    : workerReadiness.agentLanes;
  const showHumanLane = !showCompact || workerReadiness.summary.humanActionable;

  return (
    <SurfaceCard asChild interactive>
      <article className="flex h-full flex-col">
        <SurfaceCardHeader
          action={<RequestStatusBadge status={request.status} />}
          eyebrow={routeLabel}
          meta={
            <>
              <span>{formatRequestAge(request.updatedAt)}</span>
              <span>{readinessLabel}</span>
            </>
          }
          title={request.brief.title || "Untitled request"}
          titleAs="h3"
        />
        <SurfaceCardDescription className={showCompact ? "line-clamp-3" : ""}>
          {request.brief.summary ||
            request.brief.body ||
            "No summary provided."}
        </SurfaceCardDescription>

        <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <RequestBoardFact
            icon={<FileCheck2Icon className="size-3.5" />}
            label="Proof"
            value={proofSummary}
          />
          <RequestBoardFact
            icon={<Clock3Icon className="size-3.5" />}
            label="Next"
            value={getNextActionLabel(request)}
          />
        </div>

        {visibleAgentLanes.length > 0 || showHumanLane ? (
          <RequestBoardWorkerHints
            readiness={workerReadiness}
            showHumanLane={showHumanLane}
            visibleAgentLanes={visibleAgentLanes}
          />
        ) : null}

        <SurfaceTagList limit={showCompact ? 3 : 5} tags={request.brief.tags} />

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge
            className="rounded-full border-border/60 bg-muted/35 text-foreground/72"
            variant="secondary"
          >
            {getBudgetLabel(request)}
          </Badge>
          <Badge
            className="rounded-full border-border/60 bg-muted/35 text-foreground/72"
            variant="secondary"
          >
            {getDeliveryLabel(request)}
          </Badge>
        </div>

        <SurfaceCardActions className="mt-auto pt-6">
          <Button asChild className="rounded-full" size="sm" variant="outline">
            <Link href={`/?mode=request&referenceRequestId=${request.id}`}>
              Use as starting point
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </SurfaceCardActions>
      </article>
    </SurfaceCard>
  );
}

function RequestBoardWorkerHints({
  readiness,
  showHumanLane,
  visibleAgentLanes,
}: {
  readiness: RequestWorkerReadiness;
  showHumanLane: boolean;
  visibleAgentLanes: RequestWorkerReadiness["agentLanes"];
}) {
  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-background/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/72">
          <BotIcon className="size-3.5" />
          <span>Worker readiness</span>
        </div>
        <Badge
          className="rounded-full border-border/60 bg-muted/35 text-foreground/72"
          variant="secondary"
        >
          {getWorkerReadinessSummaryLabel(readiness)}
        </Badge>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        Hints only. No assignment, Commitment, or Fulfillment write.
      </p>
      <div className="mt-3 grid gap-2">
        {showHumanLane ? (
          <HumanWorkerHint humanLane={readiness.humanLane} />
        ) : null}
        {visibleAgentLanes.map((hint) => (
          <div
            className="rounded-xl border border-border/55 bg-card/45 p-2.5"
            key={hint.agentKey}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground/82">
                  {hint.displayName}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                  {hint.reason}
                </p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 rounded-full border text-[10px]",
                  getAgentHintBadgeClassName(hint.readiness)
                )}
                variant="secondary"
              >
                {formatSurfaceToken(hint.readiness)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground/75">
              <span>{hint.actionLabel}</span>
              <span aria-hidden="true">/</span>
              <span>{hint.apiRoute}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAgentHintBadgeClassName(
  readiness: RequestWorkerReadiness["agentLanes"][number]["readiness"]
) {
  switch (readiness) {
    case "can_prepare":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
    case "target_only":
      return "border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-200";
    case "skip":
      return "border-border/60 bg-muted/35 text-foreground/70";
  }
}

function HumanWorkerHint({
  humanLane,
}: {
  humanLane: RequestHumanWorkerReadiness;
}) {
  return (
    <div className="rounded-xl border border-border/55 bg-card/45 p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground/82">
            <UserRoundIcon className="size-3.5" />
            Human worker lane
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
            {humanLane.reason}
          </p>
        </div>
        <Badge
          className={cn(
            "shrink-0 rounded-full border text-[10px]",
            getHumanHintBadgeClassName(humanLane.state)
          )}
          variant="secondary"
        >
          {formatSurfaceToken(humanLane.state)}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground/75">
        <span>{humanLane.actionLabel}</span>
        {humanLane.proposedObject ? (
          <>
            <span aria-hidden="true">/</span>
            <span>{humanLane.proposedObject}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function getHumanHintBadgeClassName(
  readiness: RequestHumanWorkerReadiness["state"]
) {
  switch (readiness) {
    case "human_required":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "can_review":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
    case "not_requested":
      return "border-border/60 bg-muted/35 text-foreground/70";
    case "blocked":
      return "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200";
  }
}

function getWorkerReadinessSummaryLabel(readiness: RequestWorkerReadiness) {
  if (readiness.summary.humanRequired) {
    return "human required";
  }

  if (readiness.summary.agentCanPrepareCount > 0) {
    return `${readiness.summary.agentCanPrepareCount} agent can prepare`;
  }

  if (readiness.summary.humanActionable) {
    return "human can apply";
  }

  return "read-only";
}

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge
      className="rounded-full border-border/60 bg-muted/40 text-foreground/72"
      variant="secondary"
    >
      {formatSurfaceToken(status)}
    </Badge>
  );
}

function RequestBoardFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/60 bg-background/45 p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/72">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-foreground/78">
        {value}
      </p>
    </div>
  );
}

function requestMatchesStatusFilter(
  request: PublicRequestPoolEntry,
  filter: RequestBoardStatusFilter
) {
  switch (filter) {
    case "all":
      return true;
    case "open":
      return request.status === "open";
    case "active":
      return activeStatuses.has(request.status);
    case "review":
      return reviewStatuses.has(request.status);
    case "needs_details":
      return request.derived.missingDetails.length > 0;
  }
}

function compareRequests(
  left: PublicRequestPoolEntry,
  right: PublicRequestPoolEntry,
  sort: RequestBoardSort
) {
  switch (sort) {
    case "ready":
      return getReadyRank(right) - getReadyRank(left) || compareRecent(left, right);
    case "status":
      return (
        statusRank[left.status] - statusRank[right.status] ||
        compareRecent(left, right)
      );
    case "title":
      return (left.brief.title || left.key).localeCompare(
        right.brief.title || right.key
      );
    case "recent":
      return compareRecent(left, right);
  }
}

function compareRecent(left: PublicRequestPoolEntry, right: PublicRequestPoolEntry) {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function getReadyRank(request: PublicRequestPoolEntry) {
  if (request.derived.readiness.readyForMatch) {
    return 2;
  }

  if (request.derived.readiness.readyForOpen) {
    return 1;
  }

  return 0;
}

function getRequestSearchText(request: PublicRequestPoolEntry) {
  return normalizeBoardSearch(
    [
      request.key,
      request.status,
      request.brief.title,
      request.brief.summary,
      request.brief.body,
      request.brief.tags.join(" "),
      request.brief.outputKinds.join(" "),
      request.seeking.actorKinds?.join(" "),
      request.seeking.supplyKinds?.join(" "),
      request.derived.routeFamily,
      request.derived.routeSummary,
      request.derived.executionKind,
      request.derived.paymentMode,
      request.derived.matchingMode,
      request.derived.readiness.summary,
      request.derived.missingDetails.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function normalizeBoardSearch(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getProofSummary(request: PublicRequestPoolEntry) {
  if (request.derived.routeSummary) {
    return request.derived.routeSummary;
  }

  if (request.brief.outputKinds.length > 0) {
    return `Expected delivery: ${request.brief.outputKinds
      .map(formatSurfaceToken)
      .join(", ")}`;
  }

  if (request.derived.missingDetails.length > 0) {
    return "Proof is unclear until the missing details are resolved.";
  }

  return "Proof not specified yet.";
}

function getNextActionLabel(request: PublicRequestPoolEntry) {
  if (request.derived.missingDetails.length > 0) {
    return "Clarify the ask before plans compete.";
  }

  if (request.derived.readiness.readyForMatch) {
    return "Compare plans, services, or providers.";
  }

  if (request.derived.readiness.readyForOpen) {
    return "Open it and route the work.";
  }

  return "Use this as a starting point.";
}

function getBudgetLabel(request: PublicRequestPoolEntry) {
  if (!request.budget || request.budget.mode === "none") {
    return "free to read";
  }

  if (request.budget.mode === "fixed" && request.budget.fixedAmount) {
    return `${formatCurrency(request.budget.fixedAmount, request.budget.currency)} budget`;
  }

  if (request.budget.mode === "range") {
    return "range budget";
  }

  return "execution budget";
}

function getDeliveryLabel(request: PublicRequestPoolEntry) {
  if (request.activeRefs.latestArtifactId) {
    return "delivery linked";
  }

  if (request.activeRefs.activeFulfillmentId) {
    return "work active";
  }

  return "delivery pending";
}

function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en", {
      currency,
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatRequestAge(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "recent activity";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes || 1}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 48) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays}d ago`;
}

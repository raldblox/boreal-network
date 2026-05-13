"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/hooks/use-messages";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestBudget,
  RequestDeadline,
  RequestFulfillment,
  RequestStatus,
} from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { cn, fetcher } from "@/lib/utils";
import { RequestActivityMessage } from "./request-activity-timeline";

type RequestTrackerProps = {
  request: BorealRequestDraft;
  activities: RequestActivityEntry[];
  isReadonly: boolean;
  isResolvingDeliveredRequest: boolean;
  onResolveDeliveredRequest?: () => Promise<void>;
  status: UseChatHelpers<ChatMessage>["status"];
};

type TrackerStageId =
  | "brief_terms"
  | "route_workers"
  | "work_delivery"
  | "review_resolve";

const TRACKER_STAGE_ORDER: TrackerStageId[] = [
  "brief_terms",
  "route_workers",
  "work_delivery",
  "review_resolve",
];

const TRACKER_SECTION_LABEL_CLASS =
  "text-[11px] font-medium uppercase leading-none tracking-[0.18em] text-muted-foreground";
const TRACKER_SECTION_TEXT_CLASS = "text-[15px] leading-7 text-foreground";
const TRACKER_PLACEHOLDER_BUTTON_CLASS =
  "border-border bg-transparent text-muted-foreground shadow-none disabled:opacity-100 disabled:text-muted-foreground";

function getDefaultExpandedStages(status: RequestStatus): TrackerStageId[] {
  const currentStageId = getCurrentTrackerStageId(status);

  if (status === "delivered") {
    return ["work_delivery", currentStageId];
  }

  return [currentStageId];
}

function getCompletedTrackerStageCount(status: RequestStatus) {
  switch (status) {
    case "funded":
      return 1;
    case "in_progress":
    case "waiting_for_owner":
      return 2;
    case "delivered":
      return 3;
    case "completed":
      return 4;
    case "cancelled":
    case "failed":
      return 3;
    case "open":
    case "funding_required":
    case "draft":
    default:
      return 0;
  }
}

export function RequestTracker({
  request,
  activities,
  isReadonly,
  isResolvingDeliveredRequest,
  onResolveDeliveredRequest,
  status,
}: RequestTrackerProps) {
  const currentStageId = getCurrentTrackerStageId(request.status);
  const completedStageCount = getCompletedTrackerStageCount(request.status);
  const [expandedStages, setExpandedStages] = useState<TrackerStageId[]>(() =>
    getDefaultExpandedStages(request.status)
  );
  const { containerRef, endRef, isAtBottom, scrollToBottom, reset } =
    useMessages({ status });

  useEffect(() => {
    setExpandedStages(getDefaultExpandedStages(request.status));
    reset();
  }, [currentStageId, request.id, request.status, reset]);

  const activeFulfillmentKey = request.activeRefs.activeFulfillmentId
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/fulfillments/${request.activeRefs.activeFulfillmentId}`
    : null;
  const { data: activeFulfillmentData } = useSWR<{
    fulfillment: RequestFulfillment;
  }>(activeFulfillmentKey, fetcher, {
    revalidateOnFocus: false,
    refreshInterval:
      request.status === "completed" ||
        request.status === "cancelled" ||
        request.status === "failed"
        ? 0
        : 4000,
  });
  const activeFulfillment = activeFulfillmentData?.fulfillment ?? null;

  const stageActivities = useMemo(() => {
    return {
      brief_terms: activities.filter(isBriefStageActivity),
      route_workers: activities.filter(isRouteStageActivity),
      work_delivery: activities.filter(isWorkStageActivity),
      review_resolve: activities.filter(isResolveStageActivity),
    } satisfies Record<TrackerStageId, RequestActivityEntry[]>;
  }, [activities]);

  const canResolveDelivery =
    request.status === "delivered" &&
    Boolean(request.activeRefs.activeFulfillmentId) &&
    typeof onResolveDeliveredRequest === "function";

  const stages = [
    {
      id: "brief_terms" as const,
      title: "Brief and terms",
      meta: [
        formatBudgetSummary(request.budget),
        formatDeadlineSummary(request.deadline),
        `Visibility: ${request.visibility}`,
      ],
      body: (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className={TRACKER_SECTION_LABEL_CLASS}>
              Request brief
            </div>
            <div className={TRACKER_SECTION_TEXT_CLASS}>
              {request.brief.body?.trim() || "No request body yet."}
            </div>
            {request.brief.summary?.trim() ? (
              <div className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {request.brief.summary.trim()}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Funding controls soon
            </Button>
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Timing controls soon
            </Button>
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Constraint edits soon
            </Button>
          </div>

          <StageActivityStack
            activities={stageActivities.brief_terms}
            emptyLabel="Briefing and opening events will stack here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
    {
      id: "route_workers" as const,
      title: "Route and workers",
      meta: [
        request.derived.routeFamily
          ? `Route: ${request.derived.routeFamily.replace(/_/g, " ")}`
          : "Route pending",
        request.derived.executionKind
          ? `Execution: ${request.derived.executionKind.replace(/_/g, " ")}`
          : "Execution pending",
        request.derived.matchingMode
          ? `Match: ${request.derived.matchingMode.replace(/_/g, " ")}`
          : "Match mode pending",
      ],
      body: (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className={TRACKER_SECTION_LABEL_CLASS}>
                Route
              </div>
              <div className={TRACKER_SECTION_TEXT_CLASS}>
                {request.derived.routeSummary?.trim() ||
                  request.seeking.notes?.trim() ||
                  "Boreal will show the active route here as the request gets assigned."}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className={TRACKER_SECTION_LABEL_CLASS}>
                Workers
              </div>
              {activeFulfillment ? (
                <div className="space-y-2.5">
                  <WorkerRow actor={activeFulfillment.lead} label="Lead" />
                  {activeFulfillment.contributors.length > 0 ? (
                    <div className="space-y-2">
                      {activeFulfillment.contributors.map((actor) => (
                        <WorkerRow
                          actor={actor}
                          key={`${actor.kind}:${actor.id}`}
                          label="Contributor"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm leading-6 text-muted-foreground">
                      No contributors attached yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm leading-6 text-muted-foreground">
                  No worker is attached to the active request yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Route controls soon
            </Button>
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Worker assignment soon
            </Button>
          </div>

          <StageActivityStack
            activities={stageActivities.route_workers}
            emptyLabel="Routing, commitment, and assignment events will stack here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
    {
      id: "work_delivery" as const,
      title: "Work and delivery",
      meta: [
        activeFulfillment
          ? `Fulfillment: ${activeFulfillment.status}`
          : "No active fulfillment",
        request.activeRefs.latestArtifactId
          ? "Delivery attached"
          : "No delivery attached",
        request.status === "waiting_for_owner"
          ? "Waiting for owner"
          : request.status === "in_progress"
            ? "Execution active"
            : request.status === "delivered"
              ? "Delivered"
              : "Work pending",
      ],
      body: (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className={TRACKER_SECTION_LABEL_CLASS}>
              Work status
            </div>
            <div className={TRACKER_SECTION_TEXT_CLASS}>
              {activeFulfillment?.summary?.trim() ||
                request.latest.summary?.trim() ||
                "Execution updates and delivered work will stack here."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Progress controls soon
            </Button>
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Delivery follow-up soon
            </Button>
          </div>

          <StageActivityStack
            activities={stageActivities.work_delivery}
            emptyLabel="Work progress and delivery artifacts will stack here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
    {
      id: "review_resolve" as const,
      title: "Review and resolve",
      meta: [
        canResolveDelivery
          ? "Owner confirmation ready"
          : "No resolution action pending",
        request.status === "completed" ? "Resolved" : "Still open",
      ],
      body: (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className={TRACKER_SECTION_LABEL_CLASS}>
              Resolution
            </div>
            <div className={TRACKER_SECTION_TEXT_CLASS}>
              {request.status === "delivered"
                ? "Delivery is waiting for owner confirmation."
                : request.status === "completed"
                  ? "This request is fully resolved."
                  : request.status === "failed"
                    ? "This request ended in a failed state."
                    : request.status === "cancelled"
                      ? "This request was cancelled."
                      : "Final review actions will show here once work is delivered."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canResolveDelivery ? (
              <Button
                disabled={isResolvingDeliveredRequest}
                onClick={() => void onResolveDeliveredRequest?.()}
                size="sm"
              >
                {isResolvingDeliveredRequest ? (
                  <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                ) : null}
                {isResolvingDeliveredRequest
                  ? "Resolving..."
                  : "Confirm delivery"}
              </Button>
            ) : null}
            <Button
              className={TRACKER_PLACEHOLDER_BUTTON_CLASS}
              disabled
              size="sm"
              variant="outline"
            >
              Rating soon
            </Button>
          </div>

          <StageActivityStack
            activities={stageActivities.review_resolve}
            emptyLabel="Review and closure events will stack here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="relative flex-1 bg-background">
      <div className="absolute inset-0 overflow-y-auto" ref={containerRef}>
        <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-0 px-3 py-6 md:px-3 md:py-7">
          {stages.map((stage, index) => {
            const isExpanded = expandedStages.includes(stage.id);
            const isDone = index < completedStageCount;
            const isLast = index === stages.length - 1;
            const isCurrent = !isDone && stage.id === currentStageId;
            const hasCompletedPreviousStage = index <= completedStageCount;
            const hasCompletedCurrentStage = index < completedStageCount;

            return (
              <div
                className="group rounded-[20px] transition-colors hover:bg-foreground/5"
                key={stage.id}
              >
                <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 pr-5">
                  <div
                    className={cn(
                      "relative row-start-1 self-stretch",
                      isExpanded ? "row-span-2" : "row-span-1"
                    )}
                  >
                    {index > 0 ? (
                      <div
                        className={cn(
                          "absolute left-1/2 top-0 h-5 w-px -translate-x-1/2",
                          hasCompletedPreviousStage
                            ? "bg-emerald-400/50"
                            : "bg-border/70"
                        )}
                      />
                    ) : null}

                    {!isLast ? (
                      <div
                        className={cn(
                          "absolute left-1/2 top-6 bottom-0 w-px -translate-x-1/2",
                          hasCompletedCurrentStage
                            ? "bg-emerald-400/50"
                            : "bg-border/70"
                        )}
                      />
                    ) : null}

                    <div className="relative z-10 flex h-10 items-start justify-center translate-y-1">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border bg-background text-xs font-semibold shadow-sm",
                          isDone
                            ? "border-emerald-300/70 text-emerald-400"
                            : isCurrent
                              ? "border-sky-300/70 text-sky-300"
                              : "border-border/70 text-muted-foreground"
                        )}
                      >
                        {isDone ? <CheckIcon className="size-4" /> : index + 1}
                      </div>
                    </div>
                  </div>

                  <button
                    className="col-start-2 flex min-h-10 w-full items-center py-1 text-left"
                    onClick={() =>
                      setExpandedStages((current) =>
                        current.includes(stage.id)
                          ? current.filter((id) => id !== stage.id)
                          : [...current, stage.id]
                      )
                    }
                    type="button"
                  >
                    <div className="flex min-w-0 items-center gap-3 overflow-hidden ">
                      <div className="shrink-0 font-medium text-sm">
                        {stage.title}
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] text-muted-foreground">
                        {stage.meta.map((metaItem, metaIndex) => (
                          <div
                            className="flex min-w-0 items-center gap-1.5"
                            key={metaItem}
                          >
                            {metaIndex > 0 ? (
                              <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/35" />
                            ) : null}
                            <span className="truncate">{metaItem}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="col-start-2 pb-1 pt-3">
                      <div className="mb-3 h-px w-full bg-border/70" />
                      <div className="pb-5">{stage.body}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div className="min-h-[24px] min-w-[24px] shrink-0" ref={endRef} />
        </div>
      </div>

      <button
        aria-label="Scroll to bottom"
        className={`absolute bottom-4 left-1/2 z-10 flex h-7 -translate-x-1/2 items-center rounded-full border border-border/50 bg-card/90 px-3.5 text-[10px] shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 ${isAtBottom
          ? "pointer-events-none scale-90 opacity-0"
          : "pointer-events-auto scale-100 opacity-100"
          }`}
        onClick={() => scrollToBottom("smooth")}
        type="button"
      >
        <ArrowDownIcon className="size-3 text-muted-foreground" />
      </button>
    </div>
  );
}

function StageActivityStack({
  activities,
  ownerUserId,
  isReadonly,
  emptyLabel,
}: {
  activities: RequestActivityEntry[];
  ownerUserId: string | null;
  isReadonly: boolean;
  emptyLabel: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 px-3 py-3 text-sm leading-6 text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, index) => (
        <RequestActivityMessage
          activity={activity}
          index={index}
          isReadonly={isReadonly}
          key={activity.eventId}
          ownerUserId={ownerUserId}
          totalCount={activities.length}
        />
      ))}
    </div>
  );
}

function WorkerRow({
  actor,
  label,
}: {
  actor: RequestFulfillment["lead"];
  label: string;
}) {
  const name = actor.displayName?.trim() || actor.handle?.trim() || actor.id;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
      <div className="min-w-0 space-y-0.5">
        <div className="text-[11px] uppercase leading-none tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm leading-6 text-foreground">{name}</div>
      </div>
      <div className="text-[11px] uppercase leading-none tracking-[0.14em] text-muted-foreground">
        {actor.kind}
      </div>
    </div>
  );
}

function getCurrentTrackerStageId(status: RequestStatus): TrackerStageId {
  switch (status) {
    case "open":
    case "funding_required":
      return "brief_terms";
    case "funded":
      return "route_workers";
    case "in_progress":
    case "waiting_for_owner":
      return "work_delivery";
    case "delivered":
    case "completed":
    case "cancelled":
    case "failed":
      return "review_resolve";
    case "draft":
    default:
      return "brief_terms";
  }
}

function isBriefStageActivity(activity: RequestActivityEntry) {
  return (
    activity.eventType === "request.opened" ||
    activity.eventType === "request.updated" ||
    (activity.aggregateType === "request" &&
      ["open", "funding_required", "funded"].includes(
        activity.requestStatus ?? ""
      ))
  );
}

function isRouteStageActivity(activity: RequestActivityEntry) {
  return (
    activity.aggregateType === "commitment" ||
    activity.eventType === "fulfillment.created"
  );
}

function isWorkStageActivity(activity: RequestActivityEntry) {
  return (
    (activity.eventType.startsWith("fulfillment.") &&
      ![
        "fulfillment.accepted",
        "fulfillment.cancelled",
        "fulfillment.failed",
      ].includes(activity.eventType)) ||
    activity.aggregateType === "artifact"
  );
}

function isResolveStageActivity(activity: RequestActivityEntry) {
  return (
    [
      "fulfillment.accepted",
      "fulfillment.cancelled",
      "fulfillment.failed",
    ].includes(activity.eventType) ||
    ["completed", "cancelled", "failed"].includes(activity.requestStatus ?? "")
  );
}

function formatBudgetSummary(budget: RequestBudget | null) {
  if (!budget) {
    return "Budget unset";
  }

  if (budget.mode === "fixed" && budget.fixedAmount != null) {
    return `${budget.currency ?? ""} ${budget.fixedAmount}`.trim();
  }

  if (
    budget.mode === "range" &&
    (budget.minAmount != null || budget.maxAmount != null)
  ) {
    return `${budget.currency ?? ""} ${budget.minAmount ?? "?"}-${budget.maxAmount ?? "?"}`.trim();
  }

  if (budget.mode === "open") {
    return "Open budget";
  }

  if (budget.mode === "none") {
    return "No budget";
  }

  return "Budget set";
}

function formatDeadlineSummary(deadline: RequestDeadline | null) {
  if (!deadline?.targetAt) {
    return "No deadline";
  }

  const target = new Date(deadline.targetAt);
  if (Number.isNaN(target.getTime())) {
    return "Deadline set";
  }

  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

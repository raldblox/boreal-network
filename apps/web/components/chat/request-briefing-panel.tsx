"use client";

import {
  ChevronDownIcon,
  CheckIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BorealRequestDraft,
  RequestBudget,
  RequestDeadline,
  RequestStatus,
} from "@/lib/request";

type RequestBriefingPanelProps = {
  request: BorealRequestDraft | null;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  isRequestMode: boolean;
  isChatOpen?: boolean;
  isResolvingDeliveredRequest?: boolean;
  onSaveDraft: () => Promise<void>;
  onOpenRequest: () => Promise<void>;
  onOpenDocument: () => void;
  onToggleChat?: () => void;
  onResolveDeliveredRequest?: () => Promise<void>;
};

type OpenRequestTrackerStageId =
  | "brief_terms"
  | "route_match"
  | "work_delivery"
  | "review_resolve";

export function RequestBriefingPanel({
  request,
  isReadonly,
  isArtifactVisible,
  isRequestMode,
  isChatOpen = false,
  isResolvingDeliveredRequest = false,
  onSaveDraft,
  onOpenRequest,
  onOpenDocument,
  onToggleChat,
  onResolveDeliveredRequest,
}: RequestBriefingPanelProps) {
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isOpeningRequest, setIsOpeningRequest] = useState(false);
  const currentOpenStageId = getCurrentOpenRequestStageId(
    request?.status ?? "draft"
  );
  const [selectedStageId, setSelectedStageId] =
    useState<OpenRequestTrackerStageId>(currentOpenStageId);

  useEffect(() => {
    if (!request || request.status === "draft") {
      return;
    }

    setSelectedStageId(currentOpenStageId);
  }, [currentOpenStageId, request?.id, request?.status]);

  if (isReadonly) {
    return null;
  }

  if (!request) {
    return null;
  }

  if (request.status !== "draft") {
    const title = request.brief.title?.trim() || "Untitled request";
    const summary =
      request.latest.summary?.trim() ||
      request.derived.routeSummary?.trim() ||
      request.derived.readiness.summary ||
      "This request is active in Boreal.";
    const budget = formatBudgetSummary(request.budget);
    const deadline = formatDeadlineSummary(request.deadline);
    const statusLabel = request.status.replace(/_/g, " ");
    const canResolveDelivery =
      request.status === "delivered" &&
      Boolean(request.activeRefs.activeFulfillmentId) &&
      typeof onResolveDeliveredRequest === "function";
    const stageOrder: OpenRequestTrackerStageId[] = [
      "brief_terms",
      "route_match",
      "work_delivery",
      "review_resolve",
    ];
    const currentStageIndex = stageOrder.indexOf(currentOpenStageId);
    const stageActions = {
      chat: {
        label: isChatOpen ? "Hide chat" : "Open chat",
        onClick: onToggleChat,
        disabled: false,
        pending: false,
      },
      object: {
        label: isArtifactVisible ? "Focus raw object" : "Open work object",
        onClick: onOpenDocument,
        disabled: false,
        pending: false,
      },
    };
    const trackerStages = [
      {
        id: "brief_terms" as const,
        label: "Brief and terms",
        eyebrow: "Scope locked",
        summary,
        detail:
          request.status === "funding_required"
            ? "Funding is still blocking execution."
            : "Core ask, budget, and timing are attached to this request.",
        meta: [
          budget,
          deadline,
          `Visibility: ${request.visibility}`,
          request.derived.readiness.readyForMatch ? "Ready for routing" : "Needs review",
        ],
        actions: [
          stageActions.chat,
          stageActions.object,
          { label: "Funding controls soon", disabled: true },
          { label: "Timing controls soon", disabled: true },
        ],
      },
      {
        id: "route_match" as const,
        label: "Route and kickoff",
        eyebrow: "Who should do it",
        summary:
          request.derived.routeSummary?.trim() ||
          "Boreal is using the current brief and seeking fields to hold the route.",
        detail:
          request.seeking.notes?.trim() ||
          formatSeekingSummary(request) ||
          "Matching-facing details can be refined here before or during kickoff.",
        meta: [
          request.derived.routeFamily
            ? `Route: ${request.derived.routeFamily.replace(/_/g, " ")}`
            : "Route not locked",
          request.derived.matchingMode
            ? `Match: ${request.derived.matchingMode.replace(/_/g, " ")}`
            : "Match mode unset",
          request.derived.executionKind
            ? `Execution: ${request.derived.executionKind.replace(/_/g, " ")}`
            : "Execution lane unset",
        ],
        actions: [
          stageActions.chat,
          stageActions.object,
          { label: "Match actions soon", disabled: true },
          { label: "Invite supply soon", disabled: true },
        ],
      },
      {
        id: "work_delivery" as const,
        label: "Work and delivery",
        eyebrow: "Execution lane",
        summary: getWorkStageSummary(request.status),
        detail:
          request.latest.summary?.trim() ||
          "Execution progress, drafts, and deliveries should stack in the activity lane below.",
        meta: [
          request.activeRefs.activeFulfillmentId
            ? "Active fulfillment attached"
            : "No fulfillment attached yet",
          request.activeRefs.latestArtifactId
            ? "Delivery artifact attached"
            : "No delivery artifact yet",
          request.status === "waiting_for_owner"
            ? "Waiting for owner response"
            : request.status === "in_progress"
              ? "Work is active"
              : "Execution not started",
        ],
        actions: [
          stageActions.chat,
          stageActions.object,
          { label: "Progress controls soon", disabled: true },
          { label: "Delivery review soon", disabled: true },
        ],
      },
      {
        id: "review_resolve" as const,
        label: "Review and resolve",
        eyebrow: "Closure",
        summary: getResolveStageSummary(request.status),
        detail:
          request.status === "delivered"
            ? "Owner review is the only remaining step before closure."
            : request.status === "completed"
              ? "This request is fully resolved."
              : request.status === "failed"
                ? "This request ended in a failed state."
                : request.status === "cancelled"
                  ? "This request was cancelled before closure."
                  : "Final review stays here once work is delivered.",
        meta: [
          canResolveDelivery ? "Ready for owner confirmation" : "No owner confirmation pending",
          request.status === "completed" ? "Closed cleanly" : "Still open to follow-up",
        ],
        actions: [
          ...(canResolveDelivery
            ? [
                {
                  label: isResolvingDeliveredRequest
                    ? "Resolving..."
                    : "Confirm delivery",
                  onClick: () => void onResolveDeliveredRequest?.(),
                  disabled: false,
                  pending: isResolvingDeliveredRequest,
                },
              ]
            : []),
          stageActions.chat,
          stageActions.object,
          { label: "Rating controls soon", disabled: true },
        ],
      },
    ];

    return (
      <div className="border-b border-border/50 bg-background/95 px-4 py-2.5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-3xl border border-border/60 bg-card/45 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-medium text-sm md:text-[15px]">
                {title}
              </div>
              <Badge
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                  getRequestStatusBadgeClassName(request.status)
                )}
                variant="secondary"
              >
                {statusLabel}
              </Badge>
              <Badge
                className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground"
                variant="secondary"
              >
                {budget}
              </Badge>
              <Badge
                className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground"
                variant="secondary"
              >
                {deadline}
              </Badge>
            </div>
            <p className="max-w-3xl text-[12px] leading-6 text-muted-foreground">
              {summary}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {trackerStages.map((stage, index) => {
              const isExpanded = selectedStageId === stage.id;
              const isDone = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isLast = index === trackerStages.length - 1;

              return (
                <div className="relative pl-14" key={stage.id}>
                  {!isLast ? (
                    <div
                      className={cn(
                        "absolute top-10 bottom-[-18px] left-[18px] w-px",
                        index < currentStageIndex
                          ? "bg-emerald-400/50"
                          : "bg-border/70"
                      )}
                    />
                  ) : null}

                  <div
                    className={cn(
                      "absolute top-1 left-0 flex size-9 items-center justify-center rounded-full border shadow-sm",
                      isDone
                        ? "border-emerald-300/70 bg-emerald-500 text-white dark:border-emerald-500/50"
                        : isCurrent
                          ? "border-sky-300/70 bg-sky-500 text-white dark:border-sky-500/50"
                          : "border-border/70 bg-background text-muted-foreground"
                    )}
                  >
                    {isDone ? (
                      <CheckIcon className="size-4" />
                    ) : isCurrent ? (
                      <SparklesIcon className="size-4" />
                    ) : (
                      <span className="text-[11px] font-semibold">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <button
                    className={cn(
                      "flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors",
                      isExpanded || isCurrent
                        ? "border-sky-300/60 bg-sky-500/[0.08]"
                        : "border-border/60 bg-background/75 hover:bg-muted/40"
                    )}
                    onClick={() => setSelectedStageId(stage.id)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {stage.eyebrow}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <div className="font-medium text-sm">{stage.label}</div>
                        <Badge
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px]",
                            isDone
                              ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-300"
                              : isCurrent
                                ? "border-sky-300/60 bg-sky-500/10 text-sky-300"
                                : "border-border/60 bg-background text-muted-foreground"
                          )}
                          variant="secondary"
                        >
                          {isDone ? "Done" : isCurrent ? "Active" : "Next"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
                        {stage.summary}
                      </p>
                    </div>

                    <ChevronDownIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-4">
                      <p className="text-[12px] leading-6 text-muted-foreground">
                        {stage.detail}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {stage.meta.map((metaItem) => (
                          <Badge
                            className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground"
                            key={metaItem}
                            variant="secondary"
                          >
                            {metaItem}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {stage.actions.map((action) => {
                          const isPending =
                            "pending" in action ? action.pending : false;
                          const onClick =
                            "onClick" in action ? action.onClick : undefined;

                          return (
                            <Button
                              className={cn(
                                action.disabled &&
                                  "cursor-not-allowed text-muted-foreground"
                              )}
                              disabled={action.disabled || isPending}
                              key={action.label}
                              onClick={onClick}
                              size="sm"
                              variant={
                                action.disabled ? "outline" : "secondary"
                              }
                            >
                              {isPending ? (
                                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                              ) : null}
                              {action.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const canOpenRequest =
    request.status === "draft" && request.derived.readiness.readyForOpen;
  const title = request.brief.title?.trim() || "Untitled request";
  const missingDetails = request.derived.missingDetails;
  const summary =
    missingDetails.length > 0
      ? `Missing: ${missingDetails.map((detail) => detail.replace(/_/g, " ")).join(", ")}`
      : "Use chat or the draft object to finish the brief before you open this request.";

  return (
    <div className="border-b border-border/50 bg-background/95 px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium text-sm">{title}</div>
            <Badge className="rounded-full" variant="secondary">
              Draft
            </Badge>
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">{summary}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onOpenDocument} variant="outline">
            {isArtifactVisible ? "Focus object" : "Show object"}
          </Button>
          <Button
            disabled={isSavingDraft || isOpeningRequest}
            onClick={() => {
              setIsSavingDraft(true);
              void onSaveDraft().finally(() => {
                setIsSavingDraft(false);
              });
            }}
            variant="outline"
          >
            {isSavingDraft ? (
              <>
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save draft"
            )}
          </Button>
          <Button
            disabled={!canOpenRequest || isSavingDraft || isOpeningRequest}
            onClick={() => {
              setIsOpeningRequest(true);
              void onOpenRequest().finally(() => {
                setIsOpeningRequest(false);
              });
            }}
          >
            {isOpeningRequest ? (
              <>
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                Opening...
              </>
            ) : (
              "Open request"
            )}
          </Button>
        </div>
      </div>
    </div>
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

function getCurrentOpenRequestStageId(
  status: RequestStatus
): OpenRequestTrackerStageId {
  switch (status) {
    case "funding_required":
    case "open":
      return "brief_terms";
    case "funded":
      return "route_match";
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

function formatSeekingSummary(request: BorealRequestDraft) {
  const parts = [
    request.seeking.teamMode?.trim(),
    request.seeking.supplyKinds?.length
      ? request.seeking.supplyKinds.join(", ")
      : null,
    request.seeking.actorKinds?.length
      ? request.seeking.actorKinds.join(", ")
      : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" · ");
}

function getWorkStageSummary(status: RequestStatus) {
  switch (status) {
    case "in_progress":
      return "Work is actively moving through the request lane.";
    case "waiting_for_owner":
      return "Execution is waiting on owner clarification or approval.";
    case "delivered":
      return "A delivery is already attached and ready for review.";
    case "funded":
      return "The request is funded and ready to move into active work.";
    case "open":
    case "funding_required":
    default:
      return "Execution will stack here once a work lane is active.";
  }
}

function getResolveStageSummary(status: RequestStatus) {
  switch (status) {
    case "delivered":
      return "Delivery is waiting for owner confirmation.";
    case "completed":
      return "Request is closed and resolved.";
    case "cancelled":
      return "Request was cancelled before final resolution.";
    case "failed":
      return "Request ended in a failed state and may need recovery.";
    default:
      return "Resolution stays here once delivery is ready.";
  }
}

function getRequestStatusBadgeClassName(status: RequestStatus) {
  switch (status) {
    case "draft":
      return "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300";
    case "open":
    case "in_progress":
      return "border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    case "funding_required":
    case "waiting_for_owner":
      return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    case "funded":
    case "completed":
      return "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "delivered":
      return "border-violet-300/70 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300";
    case "failed":
      return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
    case "cancelled":
      return "border-zinc-400/70 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300";
    default:
      return "border-border/60 bg-background/70 text-foreground";
  }
}

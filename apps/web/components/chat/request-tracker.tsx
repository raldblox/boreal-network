"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  discoverDesktopRuntime,
  isDesktopBridgeSupportedOrigin,
  tryOpenDesktopRuntimeApp,
  type DesktopRuntimeDiscoveryPayload,
} from "@/lib/desktop-runtime-bridge";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestFulfillment,
  RequestStatus,
} from "@/lib/request";
import type { BorealSupplyDraft } from "@/lib/supply";
import type { ChatMessage } from "@/lib/types";
import { cn, fetcher } from "@/lib/utils";
import { ChevronDownIcon } from "./icons";
import { RequestActivityMessage } from "./request-activity-timeline";
import { toast } from "./toast";

type RequestTrackerProps = {
  request: BorealRequestDraft;
  activities: RequestActivityEntry[];
  isReadonly: boolean;
  isResolvingDeliveredRequest: boolean;
  onResolveDeliveredRequest?: () => Promise<void>;
  onUpdatePreferredSupply?: (preferredSupplyId: string | null) => Promise<void>;
  requestViewerUserId: string | null;
  status: UseChatHelpers<ChatMessage>["status"];
};

type TrackerStageId =
  | "brief_terms"
  | "route_workers"
  | "work_delivery"
  | "review_resolve";

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
  onUpdatePreferredSupply,
  requestViewerUserId,
  status,
}: RequestTrackerProps) {
  const currentStageId = getCurrentTrackerStageId(request.status);
  const completedStageCount = getCompletedTrackerStageCount(request.status);
  const isRequestOwner =
    typeof requestViewerUserId === "string" &&
    requestViewerUserId === request.ownerId;
  const canManagePrivateRouting =
    isRequestOwner &&
    request.visibility === "private" &&
    request.status !== "draft" &&
    typeof onUpdatePreferredSupply === "function";
  const [expandedStages, setExpandedStages] = useState<TrackerStageId[]>(() =>
    getDefaultExpandedStages(request.status)
  );
  const [followMode, setFollowMode] = useState<"auto" | "manual">("auto");
  const [isSavingPreferredSupply, setIsSavingPreferredSupply] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<Record<TrackerStageId, HTMLDivElement | null>>({
    brief_terms: null,
    route_workers: null,
    work_delivery: null,
    review_resolve: null,
  });
  const autoScrollLockRef = useRef(false);
  const autoScrollUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  const isStageMostlyVisible = useCallback((stageId: TrackerStageId) => {
    const container = containerRef.current;
    const stageNode = stageRefs.current[stageId];

    if (!container || !stageNode) {
      return false;
    }

    const viewportTop = container.scrollTop;
    const viewportBottom = viewportTop + container.clientHeight;
    const stageTop = stageNode.offsetTop;
    const stageBottom = stageTop + stageNode.offsetHeight;
    const visibleTop = Math.max(stageTop, viewportTop);
    const visibleBottom = Math.min(stageBottom, viewportBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibilityThreshold = Math.min(stageNode.offsetHeight * 0.45, 240);

    return visibleHeight >= visibilityThreshold;
  }, []);

  const scrollStageIntoView = useCallback(
    (stageId: TrackerStageId, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const stageNode = stageRefs.current[stageId];

      if (!container || !stageNode) {
        return;
      }

      autoScrollLockRef.current = true;

      if (autoScrollUnlockTimeoutRef.current) {
        clearTimeout(autoScrollUnlockTimeoutRef.current);
      }

      container.scrollTo({
        top: Math.max(0, stageNode.offsetTop - 12),
        behavior,
      });

      autoScrollUnlockTimeoutRef.current = setTimeout(() => {
        autoScrollLockRef.current = false;
      }, behavior === "smooth" ? 420 : 120);
    },
    []
  );

  const resumeLiveStage = useCallback(() => {
    setFollowMode("auto");
    setExpandedStages((current) =>
      current.includes(currentStageId) ? current : [currentStageId, ...current]
    );
    requestAnimationFrame(() => {
      scrollStageIntoView(currentStageId, "smooth");
    });
  }, [currentStageId, scrollStageIntoView]);

  const handleStageToggle = useCallback(
    (stageId: TrackerStageId) => {
      if (stageId !== currentStageId) {
        setFollowMode("manual");
      }

      setExpandedStages((current) => {
        const isExpanded = current.includes(stageId);

        if (stageId === currentStageId) {
          return isExpanded ? current : [...current, stageId];
        }

        return isExpanded
          ? current.filter((id) => id !== stageId)
          : [...current, stageId];
      });

      if (stageId === currentStageId) {
        requestAnimationFrame(() => {
          scrollStageIntoView(stageId, "smooth");
        });
      }
    },
    [currentStageId, scrollStageIntoView]
  );

  useEffect(() => {
    setExpandedStages(getDefaultExpandedStages(request.status));
    setFollowMode("auto");

    requestAnimationFrame(() => {
      scrollStageIntoView(currentStageId, "instant");
    });
  }, [currentStageId, request.id, request.status, scrollStageIntoView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateBottomState = () => {
      setIsAtBottom(
        container.scrollTop + container.clientHeight >=
          container.scrollHeight - 100
      );
    };

    updateBottomState();
    container.addEventListener("scroll", updateBottomState, { passive: true });

    const resizeObserver = new ResizeObserver(updateBottomState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateBottomState);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleTrackerScroll = () => {
      if (autoScrollLockRef.current) {
        return;
      }

      if (followMode === "auto" && !isStageMostlyVisible(currentStageId)) {
        setFollowMode("manual");
      }
    };

    container.addEventListener("scroll", handleTrackerScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleTrackerScroll);
    };
  }, [containerRef, currentStageId, followMode, isStageMostlyVisible]);

  useEffect(() => {
    if (followMode !== "auto") {
      return;
    }

    if (
      expandedStages.includes(currentStageId) &&
      isStageMostlyVisible(currentStageId)
    ) {
      return;
    }

    setExpandedStages((current) =>
      current.includes(currentStageId) ? current : [currentStageId, ...current]
    );

    requestAnimationFrame(() => {
      scrollStageIntoView(currentStageId, "smooth");
    });
  }, [
    activities.length,
    currentStageId,
    expandedStages,
    followMode,
    isStageMostlyVisible,
    request.updatedAt,
    scrollStageIntoView,
  ]);

  useEffect(() => {
    return () => {
      if (autoScrollUnlockTimeoutRef.current) {
        clearTimeout(autoScrollUnlockTimeoutRef.current);
      }
    };
  }, []);

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
  const preferredSupplyKey =
    canManagePrivateRouting && request.routing.preferredSupplyId
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies/${request.routing.preferredSupplyId}`
      : null;
  const { data: preferredSupplyData } = useSWR<{
    supply: BorealSupplyDraft;
  }>(preferredSupplyKey, fetcher, {
    revalidateOnFocus: false,
  });
  const preferredSupply = preferredSupplyData?.supply ?? null;
  const activeRouteSupplyKey =
    canManagePrivateRouting &&
    activeFulfillment?.supplyId &&
    activeFulfillment.supplyId !== request.routing.preferredSupplyId
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies/${activeFulfillment.supplyId}`
      : null;
  const { data: activeRouteSupplyData } = useSWR<{
    supply: BorealSupplyDraft;
  }>(activeRouteSupplyKey, fetcher, {
    revalidateOnFocus: false,
  });
  const activeRouteSupply =
    activeFulfillment?.supplyId === request.routing.preferredSupplyId
      ? preferredSupply
      : (activeRouteSupplyData?.supply ?? null);
  const ownedSuppliesKey = canManagePrivateRouting
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies?limit=100`
    : null;
  const { data: ownedSuppliesData, isLoading: isLoadingOwnedSupplies } = useSWR<{
    supplies: BorealSupplyDraft[];
    hasMore: boolean;
  }>(ownedSuppliesKey, fetcher, {
    revalidateOnFocus: false,
  });
  const publishedOwnedSupplies = useMemo(
    () =>
      (ownedSuppliesData?.supplies ?? []).filter(
        (supply) => supply.status === "published"
      ),
    [ownedSuppliesData?.supplies]
  );
  const desktopRuntimeDiscoveryEnabled =
    isRequestOwner && request.visibility === "private";
  const {
    data: desktopRuntimeDiscovery,
    isLoading: isLoadingDesktopRuntimeDiscovery,
    mutate: refreshDesktopRuntimeDiscovery,
  } = useSWR<DesktopRuntimeDiscoveryPayload | null>(
    desktopRuntimeDiscoveryEnabled
      ? ["desktop-runtime-discovery", request.id]
      : null,
    async () => discoverDesktopRuntime(),
    {
      revalidateOnFocus: false,
      refreshInterval: 5000,
    }
  );
  const desktopRuntimeState = getDesktopRuntimeState(desktopRuntimeDiscovery);
  const preferredSupplySelectionValue =
    request.routing.preferredSupplyId ?? REQUEST_ROUTE_INHERIT_DEFAULT;

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
    requestViewerUserId === request.ownerId &&
    Boolean(request.activeRefs.activeFulfillmentId) &&
    typeof onResolveDeliveredRequest === "function";
  const showReturnToLiveStage =
    followMode === "manual" || !expandedStages.includes(currentStageId);

  const routeSummaryValue = getRouteSummaryValue({
    activeFulfillment,
    activeRouteSupply,
    preferredSupply,
    request,
  });
  const workerSummaryValue = activeFulfillment
    ? describeWorkerSummary(activeFulfillment)
    : desktopRuntimeState.requestLaneReady
      ? "Desktop runtime is connected and ready for a private execution lane."
      : "No worker is attached to this request yet.";
  const handlePreferredSupplyChange = async (value: string) => {
    if (!onUpdatePreferredSupply) {
      return;
    }

    setIsSavingPreferredSupply(true);

    try {
      await onUpdatePreferredSupply(
        value === REQUEST_ROUTE_INHERIT_DEFAULT ? null : value
      );

      toast({
        type: "success",
        description:
          value === REQUEST_ROUTE_INHERIT_DEFAULT
            ? "This request now follows the desktop default route."
            : "Preferred capability updated for this request.",
      });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update the request route.",
      });
    } finally {
      setIsSavingPreferredSupply(false);
    }
  };

  const stages = [
    {
      id: "brief_terms" as const,
      title: "Ask and terms",
      summary:
        "Lock the ask, scope, and terms before routing starts.",
      body: (
        <div className="space-y-4">
          <CompactFactPanel
            facts={[
              {
                detail:
                  request.brief.summary?.trim() ||
                  request.derived.readiness.summary,
                label: "Brief",
                value: request.brief.body?.trim() || "No brief yet.",
              },
              {
                detail: formatTokenList(request.brief.tags, "No tags yet."),
                label: "Deliverables",
                value: formatTokenList(
                  request.brief.outputKinds,
                  "No deliverables set yet."
                ),
              },
              {
                detail: formatExecutionDetail(request),
                label: "Execution",
                value: formatExecutionValue(request),
              },
              {
                detail: formatVerificationDetail(request),
                label: "Proof gate",
                value: formatVerificationValue(request),
              },
              {
                detail: formatConstraintDetail(request.brief.constraints),
                label: "Constraints",
                value:
                  request.derived.missingDetails.length > 0
                    ? `Still needed: ${request.derived.missingDetails
                        .map((detail) => detail.replace(/_/g, " "))
                        .join(", ")}.`
                    : "Core request details are in place.",
              },
              {
                detail: request.latest.lastEventAt
                  ? `Last event ${formatTimestamp(request.latest.lastEventAt)}`
                  : undefined,
                label: "Readiness",
                value: request.derived.readiness.summary,
              },
            ]}
          />

          <StageActivityStack
            activities={stageActivities.brief_terms}
            emptyLabel="Briefing and opening activity will appear here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
    {
      id: "route_workers" as const,
      title: "Routing and ownership",
      summary:
        "Show who should lead the work and how it will move forward.",
      body: (
        <div className="space-y-4">
          <CompactFactPanel
            facts={[
              {
                detail: request.seeking.notes?.trim() || "No routing note yet.",
                label: "Route summary",
                value: routeSummaryValue,
              },
              {
                detail: request.seeking.teamMode
                  ? `Team mode: ${formatLabel(request.seeking.teamMode)}`
                  : "No team mode set.",
                label: "Workers",
                value: workerSummaryValue,
              },
              {
                detail: formatClarificationDetail(request),
                label: "Clarification gate",
                value: formatClarificationValue(request),
              },
              {
                detail: formatCollapseRiskDetail(request),
                label: "Collapse risk",
                value: formatCollapseRiskValue(request),
              },
            ]}
          />

          <RouteAndWorkersPanel
            activeFulfillment={activeFulfillment}
            activeRouteSupply={activeRouteSupply}
            canManagePrivateRouting={canManagePrivateRouting}
            desktopRuntimePolicy={desktopRuntimeDiscovery?.policy}
            desktopRuntimeState={desktopRuntimeState}
            isDesktopRuntimeSupportedOrigin={isDesktopBridgeSupportedOrigin()}
            isLoadingDesktopRuntimeDiscovery={isLoadingDesktopRuntimeDiscovery}
            isLoadingOwnedSupplies={isLoadingOwnedSupplies}
            isSavingPreferredSupply={isSavingPreferredSupply}
            onOpenDesktopRuntime={tryOpenDesktopRuntimeApp}
            onRefreshDesktopRuntime={() => {
              void refreshDesktopRuntimeDiscovery();
            }}
            onUpdatePreferredSupply={handlePreferredSupplyChange}
            preferredSupply={preferredSupply}
            preferredSupplySelectionValue={preferredSupplySelectionValue}
            publishedOwnedSupplies={publishedOwnedSupplies}
            request={request}
          />

          <StageActivityStack
            activities={stageActivities.route_workers}
            emptyLabel="Routing, proposal, and assignment activity will appear here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
    {
      id: "work_delivery" as const,
      title: "Execution and delivery",
      summary:
        "Track the active work lane, current progress, and delivered proof.",
      body: (
        <div className="space-y-4">
          <CompactFactPanel
            facts={[
              {
                detail: activeFulfillment?.steps.length
                  ? `${activeFulfillment.steps.length} fulfillment steps recorded.`
                  : "No fulfillment steps recorded yet.",
                label: "Work status",
                value:
                  activeFulfillment?.summary?.trim() ||
                  request.latest.summary?.trim() ||
                  "Execution updates and delivered work will appear here.",
              },
              {
                detail: activeFulfillment?.updatedAt
                  ? `Updated ${formatTimestamp(activeFulfillment.updatedAt)}`
                  : "No active fulfillment update yet.",
                label: "Artifacts",
                value: request.activeRefs.latestArtifactId
                  ? "A delivery or supporting artifact is attached to this request."
                  : "No artifact has been attached yet.",
              },
            ]}
          />

          <FulfillmentStepsPanel
            activeRouteSupply={activeRouteSupply}
            fulfillment={activeFulfillment}
          />

          <StageActivityStack
            activities={stageActivities.work_delivery}
            emptyLabel="Work progress and delivery artifacts will appear here."
            isReadonly={isReadonly}
            ownerUserId={request.ownerId}
          />
        </div>
      ),
    },
    {
      id: "review_resolve" as const,
      title: "Review and resolve",
      summary:
        "Close the loop once delivery lands, or capture the final failed or cancelled state when the request stops moving.",
      body: (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <CompactFactPanel
              facts={[
                {
                  detail:
                    request.status === "delivered"
                      ? "The current fulfillment is waiting on the owner decision."
                      : request.status === "completed"
                        ? "No more action is needed in this room."
                        : request.status === "failed"
                          ? "The room preserves the final failure state."
                          : request.status === "cancelled"
                            ? "The room preserves the final cancellation state."
                            : "Final review actions appear here after delivery.",
                  label: "Resolution",
                  value: getResolutionSummary(request.status),
                },
              ]}
            />
            {canResolveDelivery ? (
              <div className="rounded-[18px] border border-emerald-300/40 bg-emerald-50/70 px-3.5 py-3 dark:bg-emerald-500/10">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Owner action
                </div>
                <div className="mt-1.5 max-w-[13rem] text-[13px] leading-5.5 text-foreground">
                  Confirm delivery to resolve the request and lock the accepted result.
                </div>
                <Button
                  className="mt-3"
                  disabled={isResolvingDeliveredRequest}
                  onClick={() => void onResolveDeliveredRequest?.()}
                  size="sm"
                >
                  {isResolvingDeliveredRequest ? (
                    <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {isResolvingDeliveredRequest ? "Resolving..." : "Confirm delivery"}
                </Button>
              </div>
            ) : null}
          </div>

          <StageActivityStack
            activities={stageActivities.review_resolve}
            emptyLabel="Review and closure events will appear here."
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
        <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-3 px-3 py-3.5 md:px-4 md:py-4">
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const isExpanded = expandedStages.includes(stage.id);
              const isDone = index < completedStageCount;
              const isCurrent = !isDone && stage.id === currentStageId;
              const showConnector = index < stages.length - 1;
              const showIncomingConnector = index > 0;
              const incomingConnectorClassName =
                index <= completedStageCount
                  ? "bg-emerald-400/80 dark:bg-emerald-400/80"
                  : isCurrent
                    ? "bg-sky-400/80 dark:bg-sky-400/80"
                    : "bg-border/60";
              const outgoingConnectorClassName = isDone
                ? "bg-emerald-400/80 dark:bg-emerald-400/80"
                : isCurrent
                  ? "bg-sky-400/80 dark:bg-sky-400/80"
                  : "bg-border/60";

              return (
                <div
                  className="relative"
                  key={stage.id}
                  ref={(node) => {
                    stageRefs.current[stage.id] = node;
                  }}
                >
                  {showIncomingConnector ? (
                    <div
                      className={cn(
                        "pointer-events-none absolute left-[2.125rem] top-[-0.75rem] z-10 bottom-[calc(100%-1rem)] w-px md:left-[2.375rem]",
                        incomingConnectorClassName
                      )}
                    />
                  ) : null}
                  {showConnector ? (
                    <div
                      className={cn(
                        "pointer-events-none absolute left-[2.125rem] top-[3rem] z-10 bottom-[-0.75rem] w-px md:left-[2.375rem]",
                        outgoingConnectorClassName
                      )}
                    />
                  ) : null}
                  <section
                    className={cn(
                      "relative z-0 overflow-hidden rounded-[24px] border bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.035)] transition-colors",
                      isCurrent
                        ? "border-foreground/12"
                        : "border-border/60"
                    )}
                  >
                    <button
                      aria-controls={`request-stage-${stage.id}`}
                      aria-expanded={isExpanded}
                      className="relative w-full px-4 py-4 text-left md:px-5"
                      onClick={() => handleStageToggle(stage.id)}
                      type="button"
                    >
                      <div
                        className={cn(
                          "pointer-events-none absolute left-4 top-4 z-20 flex size-8 items-center justify-center text-sm font-semibold md:left-5",
                          isDone
                            ? "text-emerald-300"
                            : isCurrent
                              ? "text-sky-300"
                              : "text-muted-foreground"
                        )}
                      >
                        <span className="absolute inset-0 rounded-full bg-background" />
                        <span
                          className={cn(
                            "absolute inset-0 rounded-full border shadow-sm",
                            isDone
                              ? "border-emerald-300/70 bg-emerald-500/12 dark:bg-emerald-500/18"
                              : isCurrent
                                ? "border-sky-300/70 bg-sky-500/12 dark:bg-sky-500/18"
                                : "border-border/70 bg-background"
                          )}
                        />
                        <span className="relative z-10 flex items-center justify-center">
                          {isDone ? (
                            <CheckIcon className="size-4" />
                          ) : (
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                isCurrent
                                  ? "bg-current"
                                  : "bg-muted-foreground/35"
                              )}
                            />
                          )}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3 pl-[3.625rem] md:pl-[3.875rem]">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base font-medium tracking-tight">
                            {stage.title}
                          </h2>
                          <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-muted-foreground">
                            {stage.summary}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "shrink-0 pt-1 text-muted-foreground transition-transform duration-200",
                            isExpanded ? "rotate-180" : "rotate-0"
                          )}
                        >
                          <ChevronDownIcon size={16} />
                        </div>
                      </div>
                    </button>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      )}
                      id={`request-stage-${stage.id}`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div
                          className={cn(
                            "border-t border-border/60 px-4 pl-[3.75rem] transition-[padding,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:px-5 md:pl-[4.25rem]",
                            isExpanded
                              ? "translate-y-0 py-4 opacity-100"
                              : "-translate-y-1 py-0 opacity-0"
                          )}
                        >
                          {stage.body}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {showReturnToLiveStage ? (
        <button
          className="absolute bottom-4 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 items-center gap-2 rounded-full border border-border/60 bg-background/92 px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 hover:scale-[1.02]"
          onClick={resumeLiveStage}
          type="button"
        >
          <span className="size-2 rounded-full bg-sky-400" />
          Back to live step
        </button>
      ) : (
        <button
          aria-label="Scroll to bottom"
          className={`absolute bottom-4 left-1/2 z-10 flex h-8 -translate-x-1/2 items-center rounded-full border border-border/60 bg-background/92 px-3.5 text-[10px] shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 ${
            isAtBottom
              ? "pointer-events-none scale-90 opacity-0"
              : "pointer-events-auto scale-100 opacity-100"
          }`}
          onClick={() => scrollToBottom("smooth")}
          type="button"
        >
          <ArrowDownIcon className="size-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

type CompactFact = {
  detail?: string;
  label: string;
  value: string;
};

function CompactFactPanel({ facts }: { facts: CompactFact[] }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-border/60 bg-background/92">
      {facts.map((fact, index) => (
        <div
          className={cn(
            "space-y-0.5 px-3.5 py-3",
            index > 0 ? "border-t border-border/60" : undefined
          )}
          key={`${fact.label}:${fact.value}`}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
            {fact.label}
          </div>
          <div className="min-w-0 text-[14px] leading-6 text-foreground">
            {fact.value}
          </div>
          {fact.detail ? (
            <div className="text-[12px] leading-5 text-muted-foreground">
              {fact.detail}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const REQUEST_ROUTE_INHERIT_DEFAULT = "__inherit_default__";

type DesktopRuntimeState = {
  autoResolveOwnedPrivate: boolean;
  autoResolveSupplyId: string | null;
  defaultModel: string | null;
  defaultReasoning: string | null;
  detail: string;
  label: string;
  linked: boolean;
  modelAccessReady: boolean;
  requestLaneReady: boolean;
  resolverReady: boolean;
};

function RouteAndWorkersPanel({
  activeFulfillment,
  activeRouteSupply,
  canManagePrivateRouting,
  desktopRuntimePolicy,
  desktopRuntimeState,
  isDesktopRuntimeSupportedOrigin,
  isLoadingDesktopRuntimeDiscovery,
  isLoadingOwnedSupplies,
  isSavingPreferredSupply,
  onOpenDesktopRuntime,
  onRefreshDesktopRuntime,
  onUpdatePreferredSupply,
  preferredSupply,
  preferredSupplySelectionValue,
  publishedOwnedSupplies,
  request,
}: {
  activeFulfillment: RequestFulfillment | null;
  activeRouteSupply: BorealSupplyDraft | null;
  canManagePrivateRouting: boolean;
  desktopRuntimePolicy: DesktopRuntimeDiscoveryPayload["policy"] | null | undefined;
  desktopRuntimeState: DesktopRuntimeState;
  isDesktopRuntimeSupportedOrigin: boolean;
  isLoadingDesktopRuntimeDiscovery: boolean;
  isLoadingOwnedSupplies: boolean;
  isSavingPreferredSupply: boolean;
  onOpenDesktopRuntime: () => void;
  onRefreshDesktopRuntime: () => void;
  onUpdatePreferredSupply: (value: string) => Promise<void>;
  preferredSupply: BorealSupplyDraft | null;
  preferredSupplySelectionValue: string;
  publishedOwnedSupplies: BorealSupplyDraft[];
  request: BorealRequestDraft;
}) {
  const pinnedSupplyNote = describePinnedSupplyNote({
    preferredSupply,
    request,
  });
  const currentSupply = activeRouteSupply ?? preferredSupply;
  const desktopModelSelection = describeDesktopModelSelection({
    desktopRuntimePolicy,
    desktopRuntimeState,
  });
  const preferredSupplyMatchesRequest =
    !preferredSupply || doesOwnedSupplyMatchRequest(request, preferredSupply);
  const desktopDefaultSupply =
    desktopRuntimePolicy?.autoResolveSupplyId
      ? publishedOwnedSupplies.find(
          (supply) => supply.id === desktopRuntimePolicy.autoResolveSupplyId
        ) ?? null
      : null;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
      <div className="space-y-3">
        <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Route
          </div>
          <div className="mt-2.5 space-y-2.5">
            <RouteFactRow
              label="Current lane"
              value={getCurrentRouteLaneValue({
                activeFulfillment,
                activeRouteSupply,
                request,
              })}
            />
            <RouteFactRow
              label="Preferred capability"
              value={pinnedSupplyNote}
            />
            <RouteFactRow
              label="Requested capability kinds"
              value={formatTokenList(
                request.seeking.supplyKinds,
                "No capability kinds pinned yet."
              )}
            />
            {currentSupply ? (
              <RouteFactRow
                label="Capability note"
                value={
                  currentSupply.profile.headline?.trim() ||
                  currentSupply.profile.summary?.trim() ||
                  "No capability summary yet."
                }
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Workers
          </div>
          {activeFulfillment ? (
            <div className="mt-3 space-y-2.5">
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
                <div className="text-[13px] leading-5.5 text-muted-foreground">
                  No contributors are attached yet.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2.5 text-[13px] leading-5.5 text-muted-foreground">
              {desktopRuntimeState.requestLaneReady
                ? "Desktop runtime is ready for private execution, but no fulfillment has started yet."
                : "No worker is attached to the active request yet."}
            </div>
          )}
        </div>

        {canManagePrivateRouting ? (
          <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
              Route controls
            </div>
            <div className="mt-2.5 space-y-2.5">
              <Select
                disabled={isLoadingOwnedSupplies || isSavingPreferredSupply}
                onValueChange={(value) => {
                  void onUpdatePreferredSupply(value);
                }}
                value={preferredSupplySelectionValue}
              >
                <SelectTrigger className="w-full rounded-2xl border-border/70 bg-background">
                  <SelectValue placeholder="Inherit desktop default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={REQUEST_ROUTE_INHERIT_DEFAULT}>
                    Inherit desktop default
                  </SelectItem>
                  {preferredSupply &&
                  !publishedOwnedSupplies.some(
                    (supply) => supply.id === preferredSupply.id
                  ) ? (
                    <SelectItem disabled value={preferredSupply.id}>
                      {getOwnedSupplyLabel(preferredSupply)} - unavailable
                    </SelectItem>
                  ) : null}
                  {!preferredSupply && request.routing.preferredSupplyId ? (
                    <SelectItem
                      disabled
                      value={request.routing.preferredSupplyId}
                    >
                      Unavailable preferred capability
                    </SelectItem>
                  ) : null}
                  {publishedOwnedSupplies.map((supply) => (
                    <SelectItem key={supply.id} value={supply.id}>
                      {getOwnedSupplyLabel(supply)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[13px] leading-5.5 text-muted-foreground">
                {isLoadingOwnedSupplies
                  ? "Refreshing published capabilities from Boreal web."
                  : publishedOwnedSupplies.length === 0
                    ? "Publish at least one capability first before pinning a private route."
                    : !preferredSupplyMatchesRequest
                      ? `${getOwnedSupplyLabel(preferredSupply)} is pinned, but it does not match this request's capability kinds.`
                      : pinnedSupplyNote}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
          Desktop runtime
        </div>
        <div className="mt-2.5 space-y-2.5">
          <div className="text-[14px] leading-6 text-foreground">
            {isLoadingDesktopRuntimeDiscovery
              ? "Checking local desktop runtime."
              : desktopRuntimeState.label}
          </div>
          <div className="text-[13px] leading-5.5 text-muted-foreground">
            {isDesktopRuntimeSupportedOrigin
              ? desktopRuntimeState.detail
              : "Desktop runtime visibility only works when Boreal web is running on localhost."}
          </div>
          <div className="space-y-2">
            <RuntimeStateRow
              isReady={desktopRuntimeState.modelAccessReady}
              label="Codex worker access"
            />
            <RuntimeStateRow
              isReady={desktopRuntimeState.resolverReady}
              label="Boreal resolver auth"
            />
            <RuntimeStateRow
              isReady={desktopRuntimeState.requestLaneReady}
              label="Private request lane"
            />
          </div>
          <div className="space-y-2.5 border-t border-border/60 pt-2.5">
            <RouteFactRow
              label="Auto-resolve"
              value={
                desktopRuntimeState.autoResolveOwnedPrivate
                  ? "Enabled for owned private requests."
                  : "Disabled on this desktop."
              }
            />
            <RouteFactRow
              label="Desktop model"
              value={desktopModelSelection}
            />
            <RouteFactRow
              label="Desktop default"
              value={describeDesktopDefaultRoute({
                desktopDefaultSupply,
                desktopRuntimeState,
                policySupplyId: desktopRuntimePolicy?.autoResolveSupplyId ?? null,
                request,
              })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onRefreshDesktopRuntime}
              size="sm"
              type="button"
              variant="outline"
            >
              Refresh status
            </Button>
            <Button onClick={onOpenDesktopRuntime} size="sm" type="button">
              Open Boreal Desktop
            </Button>
          </div>
        </div>
      </div>
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
      <div className="rounded-[16px] border border-dashed border-border/60 bg-muted/[0.12] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => (
        <div
          className="animate-[fade-up_0.28s_cubic-bezier(0.22,1,0.36,1)]"
          key={activity.eventId}
          style={{
            animationDelay: `${Math.min(index, 4) * 45}ms`,
            animationFillMode: "both",
          }}
        >
          <RequestActivityMessage
            activity={activity}
            index={index}
            isReadonly={isReadonly}
            ownerUserId={ownerUserId}
            totalCount={activities.length}
            variant="stage"
          />
        </div>
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/92 px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <div className="text-[11px] uppercase leading-none tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-[13px] leading-5.5 text-foreground">
          {name}
        </div>
      </div>
      <div className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] uppercase leading-none tracking-[0.14em] text-muted-foreground">
        {formatLabel(actor.kind)}
      </div>
    </div>
  );
}

function FulfillmentStepsPanel({
  fulfillment,
  activeRouteSupply,
}: {
  fulfillment: RequestFulfillment | null;
  activeRouteSupply: BorealSupplyDraft | null;
}) {
  if (!fulfillment || fulfillment.steps.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-border/60 bg-muted/[0.12] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
        No execution steps are attached yet. Once a fulfillment lane opens, Boreal will show seeded step ownership here.
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
        Execution steps
      </div>
      <div className="mt-3 space-y-2.5">
        {fulfillment.steps.map((step, index) => (
          <FulfillmentStepCard
            activeRouteSupply={activeRouteSupply}
            index={index}
            key={step.id}
            step={step}
          />
        ))}
      </div>
    </div>
  );
}

function FulfillmentStepCard({
  step,
  index,
  activeRouteSupply,
}: {
  step: RequestFulfillment["steps"][number];
  index: number;
  activeRouteSupply: BorealSupplyDraft | null;
}) {
  const assigneeLabel = getStepAssigneeLabel(step);
  const supplyLabel = getStepSupplyLabel(step, activeRouteSupply);
  const roleKeys = formatStepRoleKeys(step);
  const evidenceClaims = formatStepEvidenceClaims(step);

  return (
    <div className="rounded-[16px] border border-border/60 bg-muted/[0.18] px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
            Step {index + 1}
          </div>
          <div className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
            {formatLabel(step.status)}
          </div>
        </div>
        <div className="text-[14px] leading-6 text-foreground">{step.title}</div>
        {typeof step.metadata?.phaseSummary === "string" &&
        step.metadata.phaseSummary.trim().length > 0 ? (
          <div className="text-[13px] leading-5.5 text-muted-foreground">
            {step.metadata.phaseSummary.trim()}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[12px] leading-5 text-muted-foreground">
          <InlineMeta label="Owner" value={assigneeLabel} />
          <InlineMeta label="Lane" value={supplyLabel} />
          <InlineMeta label="Role keys" value={roleKeys} />
          {evidenceClaims ? (
            <InlineMeta label="Proof" value={evidenceClaims} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-foreground/60">{label}:</span> {value}
    </span>
  );
}

function RouteFactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[13px] leading-5.5 text-foreground">{value}</div>
    </div>
  );
}

function RuntimeStateRow({
  label,
  isReady,
}: {
  label: string;
  isReady: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm leading-6">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          isReady ? "bg-emerald-400" : "bg-zinc-500"
        )}
      />
      <span className={isReady ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
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

function formatTokenList(values: string[] | undefined, emptyLabel: string) {
  if (!values || values.length === 0) {
    return emptyLabel;
  }

  return values.map((value) => formatLabel(value)).join(", ");
}

function formatSeekingSummary(request: BorealRequestDraft) {
  const parts = [
    request.seeking.actorKinds?.length
      ? `Actors: ${formatTokenList(request.seeking.actorKinds, "")}`
      : null,
    request.seeking.supplyKinds?.length
      ? `Supply: ${formatTokenList(request.seeking.supplyKinds, "")}`
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No seeking filters yet.";
}

function formatConstraintDetail(constraints: Record<string, unknown> | undefined) {
  if (!constraints || Object.keys(constraints).length === 0) {
    return "No structured constraints captured yet.";
  }

  return `${Object.keys(constraints).length} constraint field${
    Object.keys(constraints).length === 1 ? "" : "s"
  } captured.`;
}

function formatExecutionValue(request: BorealRequestDraft) {
  const executionModes = request.derived.executionProfile.executionModes;

  if (executionModes.length === 0) {
    return "Execution mode unresolved.";
  }

  return executionModes.map((mode) => formatLabel(mode)).join(", ");
}

function formatExecutionDetail(request: BorealRequestDraft) {
  const details = [
    request.derived.embodiedConstraintSet.serviceLocation?.trim()
      ? `Location: ${request.derived.embodiedConstraintSet.serviceLocation.trim()}`
      : null,
    request.derived.embodiedConstraintSet.timeWindows.length > 0
      ? `Time: ${request.derived.embodiedConstraintSet.timeWindows.join(", ")}`
      : null,
    request.derived.embodiedConstraintSet.accessRequirements.length > 0
      ? `Access: ${request.derived.embodiedConstraintSet.accessRequirements.join(", ")}`
      : null,
  ].filter((detail): detail is string => Boolean(detail));

  if (details.length === 0) {
    return request.derived.executionProfile.requiresHumanPresence
      ? "Embodied execution is required, but place, schedule, or access details are still thin."
      : "This request currently fits a digital or remote execution lane.";
  }

  return details.join(" · ");
}

function formatVerificationValue(request: BorealRequestDraft) {
  const requiredEvidenceClaims =
    request.derived.verificationPlan.requiredEvidenceClaims;

  if (requiredEvidenceClaims.length === 0) {
    return "No proof gate captured yet.";
  }

  return requiredEvidenceClaims.map((claim) => formatLabel(claim)).join(", ");
}

function formatVerificationDetail(request: BorealRequestDraft) {
  const requirements = [
    request.derived.verificationPlan.mustHaveOwnerAcceptance
      ? "Owner acceptance required"
      : null,
    request.derived.verificationPlan.mustHaveLocationSignal
      ? "Location signal required"
      : null,
    request.derived.verificationPlan.mustHaveSignature
      ? "Signature required"
      : null,
  ].filter((detail): detail is string => Boolean(detail));

  if (requirements.length === 0) {
    return "No extra proof controls are attached yet.";
  }

  return requirements.join(" · ");
}

function formatClarificationValue(request: BorealRequestDraft) {
  if (!request.derived.clarificationNeeded.required) {
    return "No clarification gate is blocking the request right now.";
  }

  return `Still needed: ${request.derived.clarificationNeeded.missingDetails
    .map((detail) => detail.replace(/_/g, " "))
    .join(", ")}.`;
}

function formatClarificationDetail(request: BorealRequestDraft) {
  if (!request.derived.clarificationNeeded.required) {
    return "Boreal can keep moving from the currently captured request facts.";
  }

  return request.derived.clarificationNeeded.reasons.join(" · ");
}

function formatCollapseRiskValue(request: BorealRequestDraft) {
  return `${formatLabel(request.derived.planCollapseRisk.riskLevel)} risk`;
}

function formatCollapseRiskDetail(request: BorealRequestDraft) {
  if (request.derived.planCollapseRisk.reasons.length === 0) {
    return "No structural plan-collapse risk is currently flagged.";
  }

  return request.derived.planCollapseRisk.reasons.join(" · ");
}

function getStepAssigneeLabel(step: RequestFulfillment["steps"][number]) {
  if (!step.assignee) {
    return "Unassigned";
  }

  return (
    step.assignee.displayName?.trim() ||
    step.assignee.handle?.trim() ||
    step.assignee.id
  );
}

function getStepSupplyLabel(
  step: RequestFulfillment["steps"][number],
  activeRouteSupply: BorealSupplyDraft | null
) {
  const assignedSupplyLabel =
    typeof step.metadata?.assignedSupplyLabel === "string"
      ? step.metadata.assignedSupplyLabel.trim()
      : "";

  if (assignedSupplyLabel.length > 0) {
    return assignedSupplyLabel;
  }

  if (activeRouteSupply) {
    return getOwnedSupplyLabel(activeRouteSupply);
  }

  return "Lead lane";
}

function formatStepRoleKeys(step: RequestFulfillment["steps"][number]) {
  const roleKeys = Array.isArray(step.metadata?.roleKeys)
    ? step.metadata.roleKeys
        .filter((roleKey): roleKey is string => typeof roleKey === "string")
        .map((roleKey) => formatLabel(roleKey))
    : [];

  if (roleKeys.length === 0) {
    return "No role keys attached";
  }

  return roleKeys.join(", ");
}

function formatStepEvidenceClaims(step: RequestFulfillment["steps"][number]) {
  const evidenceClaims = Array.isArray(step.metadata?.requiredEvidenceClaims)
    ? step.metadata.requiredEvidenceClaims
        .filter((claim): claim is string => typeof claim === "string")
        .map((claim) => formatLabel(claim))
    : [];

  if (evidenceClaims.length === 0) {
    return "";
  }

  return evidenceClaims.join(", ");
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getResolutionSummary(status: RequestStatus) {
  switch (status) {
    case "delivered":
      return "Delivery is waiting for owner confirmation.";
    case "completed":
      return "This request is fully resolved.";
    case "failed":
      return "This request ended in a failed state.";
    case "cancelled":
      return "This request was cancelled.";
    default:
      return "Final review actions appear here after delivery.";
  }
}

function getOwnedSupplyLabel(
  supply: Pick<BorealSupplyDraft, "key" | "profile"> | null | undefined
) {
  return (
    supply?.profile.displayName.trim() || supply?.key || "Untitled capability"
  );
}

function doesOwnedSupplyMatchRequest(
  request: Pick<BorealRequestDraft, "seeking"> | null | undefined,
  supply: Pick<BorealSupplyDraft, "capability"> | null | undefined
) {
  const requestedKinds = request?.seeking.supplyKinds ?? [];

  if (requestedKinds.length === 0) {
    return true;
  }

  const supplyKinds = supply?.capability.supplyKinds ?? [];
  return requestedKinds.some((kind) => supplyKinds.includes(kind));
}

function describePinnedSupplyNote({
  preferredSupply,
  request,
}: {
  preferredSupply: BorealSupplyDraft | null;
  request: BorealRequestDraft;
}) {
  if (request.routing.preferredSupplyId) {
    return preferredSupply
      ? `${getOwnedSupplyLabel(preferredSupply)} is pinned for this private request.`
      : "This request points to a preferred capability that is unavailable for this account.";
  }

  return "No request-specific capability is pinned yet. Boreal Desktop may still use its private default route.";
}

function getCurrentRouteLaneValue({
  activeFulfillment,
  activeRouteSupply,
  request,
}: {
  activeFulfillment: RequestFulfillment | null;
  activeRouteSupply: BorealSupplyDraft | null;
  request: BorealRequestDraft;
}) {
  if (activeFulfillment?.supplyId) {
    const supplyLabel = activeRouteSupply
      ? getOwnedSupplyLabel(activeRouteSupply)
      : "Selected capability";

    if (activeFulfillment.lead.kind === "runtime") {
      return `${supplyLabel} is active through Boreal Desktop.`;
    }

    return `${supplyLabel} is the active fulfillment route.`;
  }

  if (activeFulfillment) {
    return describeWorkerSummary(activeFulfillment);
  }

  if (request.routing.preferredSupplyId) {
    return "Preferred capability is set and will be used for the next eligible private execution lane.";
  }

  return "No route has been pinned yet.";
}

function describeWorkerSummary(fulfillment: RequestFulfillment) {
  const leadLabel =
    fulfillment.lead.displayName?.trim() ||
    fulfillment.lead.handle?.trim() ||
    fulfillment.lead.id;

  if (fulfillment.contributors.length > 0) {
    return `${leadLabel} is leading with ${fulfillment.contributors.length} contributor${fulfillment.contributors.length === 1 ? "" : "s"}.`;
  }

  return `${leadLabel} is the active worker on this request.`;
}

function getRouteSummaryValue({
  activeFulfillment,
  activeRouteSupply,
  preferredSupply,
  request,
}: {
  activeFulfillment: RequestFulfillment | null;
  activeRouteSupply: BorealSupplyDraft | null;
  preferredSupply: BorealSupplyDraft | null;
  request: BorealRequestDraft;
}) {
  if (activeFulfillment?.supplyId && activeRouteSupply) {
    return `${getOwnedSupplyLabel(activeRouteSupply)} is backing the active fulfillment lane.`;
  }

  if (activeFulfillment?.lead.kind === "runtime") {
    return "Boreal Desktop is carrying the active execution lane.";
  }

  if (preferredSupply) {
    return `${getOwnedSupplyLabel(preferredSupply)} is pinned for the next private execution lane.`;
  }

  return (
    request.derived.routeSummary?.trim() ||
    "Boreal will show the active route here as the request gets assigned."
  );
}

function getDesktopRuntimeState(
  discovery: DesktopRuntimeDiscoveryPayload | null | undefined
): DesktopRuntimeState {
  const modelAccessReady = discovery?.readiness?.modelAccessReady === true;
  const resolverReady = discovery?.readiness?.borealResolverReady === true;
  const requestLaneReady = discovery?.readiness?.requestLaneReady === true;
  const linked = discovery?.bridge?.ready === true;
  const autoResolveOwnedPrivate =
    discovery?.policy?.autoResolveOwnedPrivate === true;
  const autoResolveSupplyId =
    typeof discovery?.policy?.autoResolveSupplyId === "string"
      ? discovery.policy.autoResolveSupplyId
      : null;
  const defaultModel =
    typeof discovery?.policy?.defaultModel === "string"
      ? discovery.policy.defaultModel
      : null;
  const defaultReasoning =
    typeof discovery?.policy?.defaultReasoning === "string"
      ? discovery.policy.defaultReasoning
      : null;

  if (requestLaneReady) {
    return {
      autoResolveOwnedPrivate,
      autoResolveSupplyId,
      defaultModel,
      defaultReasoning,
      detail:
        "This browser can see a connected Boreal Desktop with Codex worker access and Boreal resolver auth.",
      label: "Desktop runtime is ready for private request execution.",
      linked: true,
      modelAccessReady,
      requestLaneReady,
      resolverReady,
    };
  }

  if (modelAccessReady && !resolverReady) {
    return {
      autoResolveOwnedPrivate,
      autoResolveSupplyId,
      defaultModel,
      defaultReasoning,
      detail:
        "Codex worker access is ready, but the desktop still needs Boreal resolver approval before it can carry request work.",
      label: "Desktop worker is ready, but Boreal auth is missing.",
      linked,
      modelAccessReady,
      requestLaneReady,
      resolverReady,
    };
  }

  if (linked && !modelAccessReady) {
    return {
      autoResolveOwnedPrivate,
      autoResolveSupplyId,
      defaultModel,
      defaultReasoning,
      detail:
        "The localhost bridge is visible, but the desktop has not connected its Codex worker yet.",
      label: "Desktop bridge is visible, but worker access is offline.",
      linked,
      modelAccessReady,
      requestLaneReady,
      resolverReady,
    };
  }

  return {
    autoResolveOwnedPrivate,
    autoResolveSupplyId,
    defaultModel,
    defaultReasoning,
    detail:
      "Open Boreal Desktop on this machine to expose local runtime readiness here.",
    label: "Desktop runtime is not linked yet.",
    linked,
    modelAccessReady,
    requestLaneReady,
    resolverReady,
  };
}

function describeDesktopModelSelection({
  desktopRuntimePolicy,
  desktopRuntimeState,
}: {
  desktopRuntimePolicy: DesktopRuntimeDiscoveryPayload["policy"] | null | undefined;
  desktopRuntimeState: DesktopRuntimeState;
}) {
  if (!desktopRuntimeState.modelAccessReady) {
    return "Desktop model access is offline.";
  }

  const modelId =
    typeof desktopRuntimePolicy?.defaultModel === "string"
      ? desktopRuntimePolicy.defaultModel
      : desktopRuntimeState.defaultModel;

  if (!modelId) {
    return "Desktop has worker access, but no default model is pinned yet.";
  }

  const reasoning =
    typeof desktopRuntimePolicy?.defaultReasoning === "string"
      ? desktopRuntimePolicy.defaultReasoning
      : desktopRuntimeState.defaultReasoning;

  return reasoning ? `${modelId} / ${reasoning}` : modelId;
}

function describeDesktopDefaultRoute({
  desktopDefaultSupply,
  desktopRuntimeState,
  policySupplyId,
  request,
}: {
  desktopDefaultSupply: BorealSupplyDraft | null;
  desktopRuntimeState: DesktopRuntimeState;
  policySupplyId: string | null;
  request: BorealRequestDraft;
}) {
  if (!desktopRuntimeState.autoResolveOwnedPrivate) {
    return "No automatic desktop route is enabled yet.";
  }

  if (!policySupplyId) {
    return "Desktop will fall back to the legacy runtime lane when no request override is set.";
  }

  if (!desktopDefaultSupply) {
    return "Desktop default capability is configured but unavailable on this machine.";
  }

  if (!doesOwnedSupplyMatchRequest(request, desktopDefaultSupply)) {
    return `${getOwnedSupplyLabel(desktopDefaultSupply)} is the desktop default, but it does not match this request's capability kinds.`;
  }

  return `${getOwnedSupplyLabel(desktopDefaultSupply)} is the desktop default route for private auto-resolve.`;
}

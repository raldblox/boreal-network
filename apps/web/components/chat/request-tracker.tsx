"use client";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  CheckIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
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
  RequestBudget,
  RequestFulfillment,
  RequestStatus,
} from "@/lib/request";
import type { BorealSupplyDraft } from "@/lib/supply";
import { cn, fetcher } from "@/lib/utils";
import {
  RequestActivityMessage,
  RequestActivityTimeline,
} from "./request-activity-timeline";
import { toast } from "./toast";

type RequestTrackerProps = {
  request: BorealRequestDraft;
  activities: RequestActivityEntry[];
  isReadonly: boolean;
  isRetryingBlockedFulfillment: boolean;
  isResolvingDeliveredRequest: boolean;
  onRetryBlockedFulfillment?: () => Promise<void>;
  onResolveDeliveredRequest?: () => Promise<void>;
  onUpdatePreferredSupply?: (preferredSupplyId: string | null) => Promise<void>;
  requestViewerUserId: string | null;
};

type TrackerStageId =
  | "brief_terms"
  | "route_workers"
  | "work_delivery"
  | "review_resolve";

type TrackerStageVisualState =
  | "done"
  | "current"
  | "pending"
  | "blocked"
  | "failed"
  | "cancelled";

type WorkroomViewId = "monitor" | "activity" | "truth" | "delivery";

export function RequestTracker({
  request,
  activities,
  isReadonly,
  isRetryingBlockedFulfillment,
  isResolvingDeliveredRequest,
  onRetryBlockedFulfillment,
  onResolveDeliveredRequest,
  onUpdatePreferredSupply,
  requestViewerUserId,
}: RequestTrackerProps) {
  const hasFulfillmentFailure = activities.some(
    (activity) => activity.eventType === "fulfillment.failed"
  );
  const currentStageId = getCurrentTrackerStageId(request.status, {
    hasFulfillmentFailure,
  });
  const isRequestOwner =
    typeof requestViewerUserId === "string" &&
    requestViewerUserId === request.ownerId;
  const canManagePrivateRouting =
    isRequestOwner &&
    request.visibility === "private" &&
    request.status !== "draft" &&
    typeof onUpdatePreferredSupply === "function";
  const [selectedView, setSelectedView] = useState<WorkroomViewId>("monitor");
  const [focusedStageId, setFocusedStageId] =
    useState<TrackerStageId>(currentStageId);
  const [followMode, setFollowMode] = useState<"auto" | "manual">("auto");
  const [isSavingPreferredSupply, setIsSavingPreferredSupply] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: 0,
      behavior,
    });
  }, []);
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

  const resumeLiveStage = useCallback(() => {
    setSelectedView("monitor");
    setFollowMode("auto");
    setFocusedStageId(currentStageId);
    requestAnimationFrame(() => {
      scrollToTop("smooth");
    });
  }, [currentStageId, scrollToTop]);

  const handleStageFocus = useCallback(
    (stageId: TrackerStageId) => {
      setSelectedView("monitor");
      setFocusedStageId(stageId);
      setFollowMode(stageId === currentStageId ? "auto" : "manual");
      requestAnimationFrame(() => {
        scrollToTop("smooth");
      });
    },
    [currentStageId, scrollToTop]
  );

  useEffect(() => {
    setSelectedView("monitor");
    setFollowMode("auto");
    setFocusedStageId(currentStageId);
    requestAnimationFrame(() => {
      scrollToTop("instant");
    });
  }, [currentStageId, hasFulfillmentFailure, request.id, request.status, scrollToTop]);

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
    if (followMode !== "auto") {
      return;
    }

    setFocusedStageId(currentStageId);
  }, [activities.length, currentStageId, followMode, request.updatedAt]);

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
  const activeFulfillmentWorkerState = getBorealWorkerTrackerState(
    activeFulfillment
  );
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

  const orderedActivities = useMemo(
    () => [...activities].sort((left, right) => left.sequence - right.sequence),
    [activities]
  );

  const stageActivities = useMemo(() => {
    return {
      brief_terms: orderedActivities.filter(isBriefStageActivity),
      route_workers: orderedActivities.filter(isRouteStageActivity),
      work_delivery: orderedActivities.filter(isWorkStageActivity),
      review_resolve: orderedActivities.filter(isResolveStageActivity),
    } satisfies Record<TrackerStageId, RequestActivityEntry[]>;
  }, [orderedActivities]);

  const canResolveDelivery =
    request.status === "delivered" &&
    requestViewerUserId === request.ownerId &&
    Boolean(request.activeRefs.activeFulfillmentId) &&
    typeof onResolveDeliveredRequest === "function";
  const artifactActivities = useMemo(
    () => orderedActivities.filter((activity) => Boolean(activity.artifact)),
    [orderedActivities]
  );
  const deliveryArtifactActivities = useMemo(
    () => [...artifactActivities].reverse(),
    [artifactActivities]
  );
  const latestDeliveryArtifact =
    deliveryArtifactActivities.find(
      (activity) => activity.artifact?.kind === "delivery"
    )?.artifact ??
    deliveryArtifactActivities[0]?.artifact ??
    null;
  const canRetryBlockedFulfillment =
    requestViewerUserId === request.ownerId &&
    activeFulfillment?.status === "blocked" &&
    activeFulfillmentWorkerState?.retryable === true &&
    typeof onRetryBlockedFulfillment === "function";
  const showsLegacyFailedWorkerNote =
    request.status === "failed" && hasFulfillmentFailure;
  const showReturnToLiveStage =
    followMode === "manual" ||
    selectedView !== "monitor" ||
    focusedStageId !== currentStageId;
  const showBackToLiveControl =
    selectedView !== "activity" && showReturnToLiveStage;

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
      : "No live lead or support lane is attached to this request yet.";
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
                detail: formatExecutionDetailDisplay(request),
                label: "Execution",
                value: formatExecutionValue(request),
              },
              {
                detail: formatVerificationDetailDisplay(request),
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
                label: "Lead and support lanes",
                value: workerSummaryValue,
              },
              {
                detail: formatClarificationDetailDisplay(request),
                label: "Clarification gate",
                value: formatClarificationValue(request),
              },
              {
                detail: formatCollapseRiskDetailDisplay(request),
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
                label: "Execution realities",
                value:
                  activeFulfillment?.summary?.trim() ||
                  request.latest.summary?.trim() ||
                  "Execution updates and delivered work will appear here.",
              },
              {
                detail: activeFulfillment?.updatedAt
                  ? `Updated ${formatTimestamp(activeFulfillment.updatedAt)}`
                  : "No active fulfillment update yet.",
                label: "Proof required",
                value: request.activeRefs.latestArtifactId
                  ? "A delivery or supporting artifact is attached to this request."
                  : "No proof-bearing delivery has been attached yet.",
              },
            ]}
          />

          {canRetryBlockedFulfillment ? (
            <div className="rounded-[18px] border border-amber-300/35 bg-amber-50/70 px-3.5 py-3 dark:bg-amber-500/10">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Recovery
              </div>
              <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
                {getBlockedFulfillmentRecoverySummary(activeFulfillment)}
              </div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                Retry the same worker lane without opening a new request.
              </div>
              <Button
                className="mt-3"
                disabled={isRetryingBlockedFulfillment}
                onClick={() => void onRetryBlockedFulfillment?.()}
                size="sm"
                variant="outline"
              >
                {isRetryingBlockedFulfillment ? (
                  <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                ) : null}
                {isRetryingBlockedFulfillment ? "Retrying..." : "Retry delivery"}
              </Button>
            </div>
          ) : null}

          {showsLegacyFailedWorkerNote ? (
            <div className="rounded-[18px] border border-rose-300/30 bg-rose-50/70 px-3.5 py-3 dark:bg-rose-500/10">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
                Terminal failure
              </div>
              <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
                This request was sealed by the older failure path before Boreal could pause and retry the same worker lane.
              </div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                New retryable worker errors now stop in a blocked state instead of rendering this room as complete.
              </div>
            </div>
          ) : null}

          <FulfillmentStepsPanel
            activeRouteSupply={activeRouteSupply}
            fulfillment={activeFulfillment}
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

        </div>
      ),
    },
  ];

  const activeStage =
    stages.find((stage) => stage.id === focusedStageId) ?? stages[0];
  const activeStageState = getTrackerStageVisualState({
    activeFulfillmentStatus: activeFulfillment?.status ?? null,
    currentStageId,
    hasFulfillmentFailure,
    requestStatus: request.status,
    stageId: activeStage.id,
  });
  const currentLiveStage =
    stages.find((stage) => stage.id === currentStageId) ?? stages[0];
  const activeStageActivities = stageActivities[focusedStageId];
  const latestFocusedActivity =
    activeStageActivities.length > 0
      ? activeStageActivities[activeStageActivities.length - 1]
      : null;
  const isViewingLiveStage = activeStage.id === currentStageId;
  const nextActionSummary = getWorkroomNextActionSummary({
    activeFulfillment,
    canResolveDelivery,
    canRetryBlockedFulfillment,
    currentStageId,
    request,
  });

  return (
    <div className="relative flex-1 bg-background">
      <div className="absolute inset-0 overflow-y-auto" ref={containerRef}>
        <div className="flex min-h-full flex-col gap-3 px-3 py-3.5 md:px-4 md:py-4">
          <div className="flex flex-wrap gap-2">
            {([
              { id: "monitor", label: "Monitor" },
              { id: "activity", label: "Activity" },
              { id: "truth", label: "Request truth" },
              { id: "delivery", label: "Delivery" },
            ] as const).map((view) => (
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
                  selectedView === view.id
                    ? "border-foreground/14 bg-foreground text-background"
                    : "border-border/60 bg-background/88 text-muted-foreground hover:text-foreground"
                )}
                key={view.id}
                onClick={() => {
                  setSelectedView(view.id);
                  if (view.id !== "monitor") {
                    setFollowMode("manual");
                  }
                  requestAnimationFrame(() => {
                    scrollToTop("smooth");
                  });
                }}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-6xl">
            {selectedView === "monitor" ? (
              <section className="rounded-[22px] border border-border/60 bg-background/94 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.03)] md:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {stages.map((stage) => {
                    const stageState = getTrackerStageVisualState({
                      activeFulfillmentStatus: activeFulfillment?.status ?? null,
                      currentStageId,
                      hasFulfillmentFailure,
                      requestStatus: request.status,
                      stageId: stage.id,
                    });
                    const isFocused = stage.id === focusedStageId;
                    const trackerAccentClassName = getTrackerStageAccentClassName(
                      stageState
                    );
                    const trackerRingClassName = getTrackerStageRingClassName(
                      stageState
                    );
                    const isDone = stageState === "done";
                    const isTerminal =
                      stageState === "blocked" ||
                      stageState === "failed" ||
                      stageState === "cancelled";

                    return (
                      <button
                        className={cn(
                          "group flex min-h-[7.5rem] min-w-[12rem] flex-1 items-start gap-3 rounded-[18px] border px-3 py-3 text-left transition-colors",
                          isFocused
                            ? "border-foreground/16 bg-muted/[0.24] shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                            : "border-border/60 bg-background/88 hover:bg-muted/[0.12]"
                        )}
                        key={stage.id}
                        onClick={() => handleStageFocus(stage.id)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "relative mt-0.5 flex size-7 shrink-0 items-center justify-center text-sm font-semibold",
                            trackerAccentClassName
                          )}
                        >
                          <span className="absolute inset-0 rounded-full bg-background" />
                          <span
                            className={cn(
                              "absolute inset-0 rounded-full border shadow-sm",
                              trackerRingClassName
                            )}
                          />
                          <span className="relative z-10 flex items-center justify-center">
                            {isDone ? (
                              <CheckIcon className="size-3.5" />
                            ) : stageState === "failed" ? (
                              <XIcon className="size-3.5" />
                            ) : stageState === "blocked" ? (
                              <AlertTriangleIcon className="size-3.5" />
                            ) : (
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  isFocused || isTerminal
                                    ? "bg-current"
                                    : "bg-muted-foreground/35"
                                )}
                              />
                            )}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block text-[14px] font-medium tracking-tight text-foreground">
                            {stage.title}
                          </span>
                          <span className="block min-h-10 overflow-hidden text-[12px] leading-5 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                            {stage.summary}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-3">
              {selectedView === "monitor" ? (
                <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                  <div className="border-b border-border/60 px-4 py-4 md:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                        {activeStage.title}
                      </div>
                      <div className="rounded-full border border-border/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {formatTrackerStageState(activeStageState)}
                      </div>
                    </div>
                    <div className="mt-2 text-[15px] leading-6 text-foreground">
                      {activeStage.summary}
                    </div>
                    {!isViewingLiveStage ? (
                      <div className="mt-2 text-[12px] leading-5 text-muted-foreground">
                        Live stage remains {currentLiveStage.title.toLowerCase()} until new work or proof lands.
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 px-4 py-4 md:px-5">
                    {activeStage.body}

                    <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                          Latest movement
                        </div>
                        <button
                          className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => {
                            setSelectedView("activity");
                            setFollowMode("manual");
                            requestAnimationFrame(() => {
                              scrollToTop("smooth");
                            });
                          }}
                          type="button"
                        >
                          Open activity
                        </button>
                      </div>
                      {latestFocusedActivity ? (
                        <div className="mt-3">
                          <RequestActivityMessage
                            activity={latestFocusedActivity}
                            index={0}
                            isReadonly={isReadonly}
                            ownerUserId={request.ownerId}
                            totalCount={1}
                            variant="stage"
                          />
                        </div>
                      ) : (
                        <div className="mt-2 text-[13px] leading-5.5 text-muted-foreground">
                          No movement has landed in this stage yet.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ) : null}

              {selectedView === "activity" ? (
                <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                  <div className="border-b border-border/60 px-4 py-4 md:px-5">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                      Activity
                    </div>
                    <div className="mt-2 text-[15px] leading-6 text-foreground">
                      Request truth updates land here in chronological order.
                    </div>
                  </div>
                  <div className="px-4 py-4 md:px-5">
                    {orderedActivities.length > 0 ? (
                      <RequestActivityTimeline
                        activities={orderedActivities}
                        isReadonly={isReadonly}
                        ownerUserId={request.ownerId}
                      />
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-border/60 bg-muted/[0.12] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
                        No request activity yet.
                      </div>
                    )}
                  </div>
                </section>
              ) : null}

              {selectedView === "truth" ? (
                <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                  <div className="border-b border-border/60 px-4 py-4 md:px-5">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                      Request truth
                    </div>
                    <div className="mt-2 text-[15px] leading-6 text-foreground">
                      Durable request facts, route context, and readiness live here.
                    </div>
                  </div>
                  <div className="space-y-4 px-4 py-4 md:px-5">
                    <CompactFactPanel
                      facts={[
                        {
                          detail:
                            request.brief.summary?.trim() ||
                            "No summary captured yet.",
                          label: "Ask",
                          value: request.brief.body?.trim() || "No request brief yet.",
                        },
                        {
                          detail:
                            request.deadline?.targetAt?.trim() ||
                            "No deadline captured.",
                          label: "Budget and timing",
                          value:
                            formatBudgetSummary(request.budget) ||
                            "Budget unset.",
                        },
                        {
                          detail: formatConstraintDetail(request.brief.constraints),
                          label: "Terms and constraints",
                          value:
                            request.derived.readiness.summary ||
                            "No readiness summary yet.",
                        },
                        {
                          detail: request.seeking.notes?.trim() || "No route note yet.",
                          label: "Route context",
                          value: routeSummaryValue,
                        },
                        {
                          detail: formatSeekingSummaryDisplay(request),
                          label: "Pinned or requested lanes",
                          value:
                            describePinnedSupplyNote({
                              preferredSupply,
                              request,
                            }) || "No preferred supply pinned yet.",
                        },
                      ]}
                    />
                  </div>
                </section>
              ) : null}

              {selectedView === "delivery" ? (
                <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                  <div className="border-b border-border/60 px-4 py-4 md:px-5">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                      Delivery
                    </div>
                    <div className="mt-2 text-[15px] leading-6 text-foreground">
                      Delivered artifacts, proof, and owner closeout stay here.
                    </div>
                  </div>
                  <div className="space-y-4 px-4 py-4 md:px-5">
                    <CompactFactPanel
                      facts={[
                        {
                          detail: activeFulfillment?.updatedAt
                            ? `Updated ${formatTimestamp(activeFulfillment.updatedAt)}`
                            : "No active fulfillment update yet.",
                          label: "Live lane",
                          value:
                            activeFulfillment?.summary?.trim() ||
                            "No active fulfillment lane is attached yet.",
                        },
                        {
                          detail: formatVerificationDetailDisplay(request),
                          label: "Proof required",
                          value: formatVerificationValue(request),
                        },
                        {
                          detail: latestDeliveryArtifact?.summary?.trim()
                            ? latestDeliveryArtifact.summary.trim()
                            : request.activeRefs.latestArtifactId
                              ? "A proof or delivery artifact is already attached."
                              : "No proof-bearing artifact is attached yet.",
                          label: "Delivery package",
                          value:
                            latestDeliveryArtifact
                              ? latestDeliveryArtifact.title
                              : request.activeRefs.latestArtifactId
                                ? "Artifact linked to this request."
                              : "Still waiting on a delivery package.",
                        },
                      ]}
                    />

                    <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                        Artifacts and proof
                      </div>
                      {deliveryArtifactActivities.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {deliveryArtifactActivities.map((activity, index) => (
                            <RequestActivityMessage
                              activity={activity}
                              index={index}
                              isReadonly={isReadonly}
                              key={activity.eventId}
                              ownerUserId={request.ownerId}
                              totalCount={deliveryArtifactActivities.length}
                              variant="stage"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[13px] leading-5.5 text-muted-foreground">
                          No delivery or proof artifacts have been attached yet.
                        </div>
                      )}
                    </div>

                    <FulfillmentStepsPanel
                      activeRouteSupply={activeRouteSupply}
                      fulfillment={activeFulfillment}
                    />

                    {canResolveDelivery ? (
                      <div className="rounded-[18px] border border-emerald-300/40 bg-emerald-50/70 px-3.5 py-3 dark:bg-emerald-500/10">
                        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                          Owner action
                        </div>
                        <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
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
                          {isResolvingDeliveredRequest
                            ? "Resolving..."
                            : "Confirm delivery"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-3 xl:sticky xl:top-3 xl:self-start">
              <div className="rounded-[22px] border border-border/60 bg-background/94 px-3.5 py-3.5 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                  What happens next
                </div>
                <div className="mt-2 text-[14px] leading-6 text-foreground">
                  {nextActionSummary.value}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {nextActionSummary.detail}
                </div>
              </div>

              <div className="rounded-[22px] border border-border/60 bg-background/94 px-3.5 py-3.5 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                  Lead lane
                </div>
                <div className="mt-2 text-[14px] leading-6 text-foreground">
                  {workerSummaryValue}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {routeSummaryValue}
                </div>
              </div>

              <div className="rounded-[22px] border border-border/60 bg-background/94 px-3.5 py-3.5 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                  Execution realities
                </div>
                <div className="mt-2 text-[14px] leading-6 text-foreground">
                  {formatExecutionValue(request)}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {formatExecutionDetailDisplay(request)}
                </div>
              </div>

              <div className="rounded-[22px] border border-border/60 bg-background/94 px-3.5 py-3.5 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                  Proof required
                </div>
                <div className="mt-2 text-[14px] leading-6 text-foreground">
                  {formatVerificationValue(request)}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {formatVerificationDetailDisplay(request)}
                </div>
              </div>

              {request.derived.clarificationNeeded.required ? (
                <div className="rounded-[22px] border border-amber-300/35 bg-amber-50/70 px-3.5 py-3.5 shadow-[0_12px_34px_rgba(15,23,42,0.03)] dark:bg-amber-500/10">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                    Still needs clarification
                  </div>
                  <div className="mt-2 text-[14px] leading-6 text-foreground">
                    {formatClarificationValue(request)}
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    {formatClarificationDetailDisplay(request)}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
          </div>
        </div>
      </div>

      {showBackToLiveControl ? (
        <button
          className="absolute bottom-4 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 items-center gap-2 rounded-full border border-border/60 bg-background/92 px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 hover:scale-[1.02]"
          onClick={resumeLiveStage}
          type="button"
        >
          <span className="size-2 rounded-full bg-sky-400" />
          Back to live step
        </button>
      ) : selectedView === "activity" ? (
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
      ) : null}
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
            Lead and support lanes
          </div>
          {activeFulfillment ? (
            <div className="mt-3 space-y-2.5">
              <WorkerRow actor={activeFulfillment.lead} label="Lead lane" />
              {activeFulfillment.contributors.length > 0 ? (
                <div className="space-y-2">
                  {activeFulfillment.contributors.map((actor) => (
                    <WorkerRow
                      actor={actor}
                      key={`${actor.kind}:${actor.id}`}
                      label="Support lane"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-[13px] leading-5.5 text-muted-foreground">
                  No support lanes are attached yet.
                </div>
              )}
          </div>
        ) : (
          <div className="mt-2.5 text-[13px] leading-5.5 text-muted-foreground">
            {desktopRuntimeState.requestLaneReady
              ? "Desktop runtime is ready for private execution, but no live lane has started yet."
              : "No live lead or support lane is attached to this request yet."}
          </div>
        )}
        </div>

        {activeFulfillment ? (
          <ActiveWorkerPromptCard fulfillment={activeFulfillment} />
        ) : null}

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

function getCurrentTrackerStageId(
  status: RequestStatus,
  {
    hasFulfillmentFailure = false,
  }: {
    hasFulfillmentFailure?: boolean;
  } = {}
): TrackerStageId {
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
      return "review_resolve";
    case "cancelled":
      return "review_resolve";
    case "failed":
      return hasFulfillmentFailure ? "work_delivery" : "review_resolve";
    case "draft":
    default:
      return "brief_terms";
  }
}

function getTrackerStageVisualState({
  activeFulfillmentStatus,
  currentStageId,
  hasFulfillmentFailure,
  requestStatus,
  stageId,
}: {
  activeFulfillmentStatus: RequestFulfillment["status"] | null;
  currentStageId: TrackerStageId;
  hasFulfillmentFailure: boolean;
  requestStatus: RequestStatus;
  stageId: TrackerStageId;
}): TrackerStageVisualState {
  const stageOrder: TrackerStageId[] = [
    "brief_terms",
    "route_workers",
    "work_delivery",
    "review_resolve",
  ];
  const stageIndex = stageOrder.indexOf(stageId);
  const currentIndex = stageOrder.indexOf(currentStageId);

  if (requestStatus === "completed") {
    return "done";
  }

  if (requestStatus === "failed") {
    const failedStageIndex = stageOrder.indexOf(
      hasFulfillmentFailure ? "work_delivery" : "review_resolve"
    );

    if (stageIndex < failedStageIndex) {
      return "done";
    }

    if (stageIndex === failedStageIndex) {
      return "failed";
    }

    return "pending";
  }

  if (requestStatus === "cancelled") {
    if (stageIndex < currentIndex) {
      return "done";
    }

    if (stageId === currentStageId) {
      return "cancelled";
    }

    return "pending";
  }

  if (activeFulfillmentStatus === "blocked" && stageId === "work_delivery") {
    if (stageIndex < currentIndex) {
      return "done";
    }

    return "blocked";
  }

  if (stageIndex < currentIndex) {
    return "done";
  }

  if (stageId === currentStageId) {
    return "current";
  }

  return "pending";
}

function getTrackerStageAccentClassName(stageState: TrackerStageVisualState) {
  switch (stageState) {
    case "done":
      return "text-emerald-300";
    case "current":
      return "text-sky-300";
    case "blocked":
      return "text-amber-300";
    case "failed":
      return "text-rose-300";
    case "cancelled":
      return "text-zinc-300";
    case "pending":
    default:
      return "text-muted-foreground";
  }
}

function getTrackerStageRingClassName(stageState: TrackerStageVisualState) {
  switch (stageState) {
    case "done":
      return "border-emerald-300/70 bg-emerald-500/12 dark:bg-emerald-500/18";
    case "current":
      return "border-sky-300/70 bg-sky-500/12 dark:bg-sky-500/18";
    case "blocked":
      return "border-amber-300/70 bg-amber-500/12 dark:bg-amber-500/18";
    case "failed":
      return "border-rose-300/70 bg-rose-500/12 dark:bg-rose-500/18";
    case "cancelled":
      return "border-zinc-300/70 bg-zinc-500/12 dark:bg-zinc-500/18";
    case "pending":
    default:
      return "border-border/70 bg-background";
  }
}

function getTrackerStageConnectorClassName(stageState: TrackerStageVisualState | null) {
  switch (stageState) {
    case "done":
      return "bg-emerald-400/80 dark:bg-emerald-400/80";
    case "current":
      return "bg-sky-400/80 dark:bg-sky-400/80";
    case "cancelled":
      return "bg-zinc-400/80 dark:bg-zinc-400/80";
    case "blocked":
    case "failed":
    case "pending":
    case null:
    default:
      return "bg-border/60";
  }
}

function formatTrackerStageState(stageState: TrackerStageVisualState) {
  switch (stageState) {
    case "done":
      return "Done";
    case "current":
      return "Live";
    case "blocked":
      return "Blocked";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "pending":
    default:
      return "Pending";
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

function getBorealWorkerTrackerState(
  fulfillment: RequestFulfillment | null
): {
  errorMessage?: string;
  providerStatus?: string;
  recoveryStage?: string;
  retryable?: boolean;
  workerKey?: string;
} | null {
  const rawWorkerState = fulfillment?.metadata?.borealWorker;
  if (!rawWorkerState || typeof rawWorkerState !== "object" || Array.isArray(rawWorkerState)) {
    return null;
  }

  const workerState = rawWorkerState as Record<string, unknown>;
  return {
    errorMessage:
      typeof workerState.errorMessage === "string"
        ? workerState.errorMessage
        : undefined,
    providerStatus:
      typeof workerState.providerStatus === "string"
        ? workerState.providerStatus
        : undefined,
    recoveryStage:
      typeof workerState.recoveryStage === "string"
        ? workerState.recoveryStage
        : undefined,
    retryable:
      typeof workerState.retryable === "boolean"
        ? workerState.retryable
        : undefined,
    workerKey:
      typeof workerState.workerKey === "string" ? workerState.workerKey : undefined,
  };
}

function getBlockedFulfillmentRecoverySummary(
  fulfillment: RequestFulfillment | null
) {
  const workerState = getBorealWorkerTrackerState(fulfillment);
  if (workerState?.errorMessage) {
    return workerState.errorMessage;
  }

  return (
    fulfillment?.summary?.trim() ||
    "The worker lane is paused and ready for another delivery attempt."
  );
}

function formatTokenList(values: string[] | undefined, emptyLabel: string) {
  if (!values || values.length === 0) {
    return emptyLabel;
  }

  return values.map((value) => formatLabel(value)).join(", ");
}

function formatBudgetSummary(budget: RequestBudget | null) {
  if (!budget) {
    return "Budget unset.";
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

  if (budget.notes?.trim()) {
    return budget.notes.trim();
  }

  return budget.mode === "open" ? "Budget open." : "Budget unset.";
}

function formatSeekingSummaryDisplay(request: BorealRequestDraft) {
  const parts = [
    request.seeking.actorKinds?.length
      ? `Actors: ${formatTokenList(request.seeking.actorKinds, "")}`
      : null,
    request.seeking.supplyKinds?.length
      ? `Supply: ${formatTokenList(request.seeking.supplyKinds, "")}`
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "No seeking filters yet.";
}

function formatExecutionDetailDisplay(request: BorealRequestDraft) {
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

  return details.join(" | ");
}

function formatVerificationDetailDisplay(request: BorealRequestDraft) {
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

  return requirements.join(" | ");
}

function formatClarificationDetailDisplay(request: BorealRequestDraft) {
  if (!request.derived.clarificationNeeded.required) {
    return "Boreal can keep moving from the currently captured request facts.";
  }

  return request.derived.clarificationNeeded.reasons.join(" | ");
}

function formatCollapseRiskDetailDisplay(request: BorealRequestDraft) {
  if (request.derived.planCollapseRisk.reasons.length === 0) {
    return "No structural plan-collapse risk is currently flagged.";
  }

  return request.derived.planCollapseRisk.reasons.join(" | ");
}

function getWorkroomNextActionSummary({
  activeFulfillment,
  canResolveDelivery,
  canRetryBlockedFulfillment,
  currentStageId,
  request,
}: {
  activeFulfillment: RequestFulfillment | null;
  canResolveDelivery: boolean;
  canRetryBlockedFulfillment: boolean;
  currentStageId: TrackerStageId;
  request: BorealRequestDraft;
}) {
  if (canResolveDelivery) {
    return {
      value: "Owner review should close the loop.",
      detail: "Confirm delivery once the proof package and result look right.",
    };
  }

  if (canRetryBlockedFulfillment) {
    return {
      value: "The live lane is paused.",
      detail: "Retry the same delivery lane instead of opening a new request.",
    };
  }

  if (request.derived.clarificationNeeded.required) {
    return {
      value: formatClarificationValue(request),
      detail:
        "These missing details still change safe routing or truthful closure.",
    };
  }

  if (request.status === "completed") {
    return {
      value: "The request is resolved.",
      detail: "No more room action is needed unless you open a new request.",
    };
  }

  if (request.status === "cancelled" || request.status === "failed") {
    return {
      value: "The room is preserving the final state.",
      detail: "Review the activity log and artifacts if follow-up work is needed.",
    };
  }

  if (currentStageId === "brief_terms") {
    return {
      value: "Keep the ask and terms stable.",
      detail:
        "Once the request facts are sufficient, Boreal can keep routing and execution honest.",
    };
  }

  if (currentStageId === "route_workers") {
    return {
      value: "Narrow the lead lane.",
      detail: request.routing.preferredSupplyId
        ? "Pinned supply already narrows the route, but it still needs a real live lane."
        : "Boreal is still converging on the right lead lane before work starts.",
    };
  }

  if (currentStageId === "work_delivery") {
    return {
      value: activeFulfillment
        ? "Keep execution moving and attach proof."
        : "Wait for a live fulfillment lane.",
      detail: activeFulfillment
        ? "Delivery truth should land inside this same request room."
        : "Once a live lane starts, execution and proof will appear here.",
    };
  }

  return {
    value: "Close the loop truthfully.",
    detail:
      "Review proof, accept the result if correct, or preserve the final failure state.",
  };
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

  return parts.length > 0 ? parts.join(" | ") : "No seeking filters yet.";
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

  return details.join(" | ");
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

  return requirements.join(" | ");
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

  return request.derived.clarificationNeeded.reasons.join(" | ");
}

function formatCollapseRiskValue(request: BorealRequestDraft) {
  return `${formatLabel(request.derived.planCollapseRisk.riskLevel)} risk`;
}

function formatCollapseRiskDetail(request: BorealRequestDraft) {
  if (request.derived.planCollapseRisk.reasons.length === 0) {
    return "No structural plan-collapse risk is currently flagged.";
  }

  return request.derived.planCollapseRisk.reasons.join(" | ");
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
      ? `${getOwnedSupplyLabel(preferredSupply)} is pinned for this private request. It narrows the route but is not attached yet.`
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

  return `${leadLabel} is the active lead lane on this request.`;
}

function ActiveWorkerPromptCard({
  fulfillment,
}: {
  fulfillment: RequestFulfillment;
}) {
  const workerPrompt = getFulfillmentWorkerPrompt(fulfillment);
  const providerStatus = getFulfillmentWorkerProviderStatus(fulfillment);

  if (!workerPrompt && !providerStatus) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-border/60 bg-muted/[0.18] px-3.5 py-3.5">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
        Worker request
      </div>
      <div className="mt-2.5 space-y-2.5">
        {workerPrompt ? (
          <RouteFactRow label="Prompt" value={workerPrompt} />
        ) : null}
        {providerStatus ? (
          <RouteFactRow label="Provider status" value={providerStatus} />
        ) : null}
      </div>
    </div>
  );
}

function getFulfillmentWorkerPrompt(fulfillment: RequestFulfillment) {
  const metadata =
    fulfillment.metadata && typeof fulfillment.metadata === "object"
      ? (fulfillment.metadata as Record<string, unknown>)
      : null;
  const borealWorker =
    metadata?.borealWorker &&
    typeof metadata.borealWorker === "object" &&
    !Array.isArray(metadata.borealWorker)
      ? (metadata.borealWorker as Record<string, unknown>)
      : null;
  const prompt = borealWorker?.prompt;

  return typeof prompt === "string" && prompt.trim().length > 0
    ? prompt.trim()
    : null;
}

function getFulfillmentWorkerProviderStatus(fulfillment: RequestFulfillment) {
  const metadata =
    fulfillment.metadata && typeof fulfillment.metadata === "object"
      ? (fulfillment.metadata as Record<string, unknown>)
      : null;
  const borealWorker =
    metadata?.borealWorker &&
    typeof metadata.borealWorker === "object" &&
    !Array.isArray(metadata.borealWorker)
      ? (metadata.borealWorker as Record<string, unknown>)
      : null;
  const providerStatus = borealWorker?.providerStatus;

  return typeof providerStatus === "string" && providerStatus.trim().length > 0
    ? providerStatus.trim().replace(/_/g, " ")
    : null;
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
    "Boreal will show the active route here as the request gets matched or a live lane is attached."
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


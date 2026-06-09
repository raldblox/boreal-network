"use client";
import {
  ArrowDownIcon,
  BotIcon,
  CpuIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FileVideoIcon,
  PackageIcon,
  PaperclipIcon,
  UserRoundIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { useWindowSize } from "usehooks-ts";
import { CharacterCallLauncher } from "@/components/services/character-call-launcher";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DesktopRuntimeDiscoveryPayload,
  discoverDesktopRuntime,
  isDesktopBridgeSupportedOrigin,
  tryOpenDesktopRuntimeApp,
} from "@/lib/desktop-runtime-bridge";
import { getOwnerPrivateWorkerFulfillmentStart } from "@/lib/owner-private-worker-fulfillment";
import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestBudget,
  RequestFulfillment,
  RequestStatus,
} from "@/lib/request";
import {
  buildTrackedRequestFlowGraph,
  type RequestFlowNodeDescriptor,
} from "@/lib/request-flow";
import {
  buildRequestTaskBoardProjection,
  type RequestTaskBoardCard,
  type RequestTaskBoardColumn,
  type RequestTaskBoardProjection,
  type RequestTaskBoardStageId,
  type RequestTaskBoardWorker,
} from "@/lib/request-task-board";
import type { BorealSupplyDraft } from "@/lib/supply";
import { cn, fetcher } from "@/lib/utils";
import { LoadingButton } from "./loading-button";
import { RequestActivityMessage } from "./request-activity-timeline";
import { RequestFlowCanvas } from "./request-flow-canvas";
import {
  RequestProcessCard,
  type RequestProcessCardTag,
  type RequestProcessCardTone,
} from "./request-process-card";
import { toast } from "./toast";

type RequestTrackerProps = {
  request: BorealRequestDraft;
  activities: RequestActivityEntry[];
  isReadonly: boolean;
  isCreatingOwnerPrivateWorkerFulfillment: boolean;
  isCreatingRoleplayDelivery: boolean;
  isRetryingBlockedFulfillment: boolean;
  isResolvingDeliveredRequest: boolean;
  onCreateOwnerPrivateWorkerFulfillment?: (
    options: OwnerPrivateWorkerFulfillmentOptions
  ) => Promise<void>;
  onCreateRoleplayDelivery?: () => Promise<void>;
  onRetryBlockedFulfillment?: (options?: { quiet?: boolean }) => Promise<void>;
  onResolveDeliveredRequest?: () => Promise<void>;
  onSelectView: (view: WorkroomViewId) => void;
  onUpdatePreferredSupply?: (preferredSupplyId: string | null) => Promise<void>;
  onBeforeOpenWorkObjectViewer?: () => void;
  onWorkObjectViewerOpenChange?: (open: boolean) => void;
  isWorkObjectViewerSuppressed?: boolean;
  requestViewerUserId: string | null;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  selectedView: WorkroomViewId;
  workObjectViewerHost?: HTMLElement | null;
};

type OwnerPrivateWorkerFulfillmentOptions = {
  supplyId: string;
  supplyLabel?: string | null;
  workerKey: string;
};

type TrackerStageId =
  | "brief_terms"
  | "route_workers"
  | "work_delivery"
  | "review_resolve";

export type WorkroomViewId = "monitor" | "tasks" | "activity" | "artifacts";

const CHARACTER_CALL_LAUNCHABLE_STATUSES = new Set<RequestStatus>([
  "funded",
  "in_progress",
  "waiting_for_owner",
  "delivered",
  "completed",
]);

export function RequestTracker({
  request,
  activities,
  isReadonly,
  isCreatingOwnerPrivateWorkerFulfillment,
  isCreatingRoleplayDelivery,
  isRetryingBlockedFulfillment,
  isResolvingDeliveredRequest,
  onCreateOwnerPrivateWorkerFulfillment,
  onCreateRoleplayDelivery,
  onRetryBlockedFulfillment,
  onResolveDeliveredRequest,
  onSelectView,
  onUpdatePreferredSupply,
  onBeforeOpenWorkObjectViewer,
  onWorkObjectViewerOpenChange,
  isWorkObjectViewerSuppressed = false,
  requestViewerUserId,
  scrollContainerRef,
  selectedView,
  workObjectViewerHost,
}: RequestTrackerProps) {
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;
  const hasFulfillmentFailure = activities.some(
    (activity) => activity.eventType === "fulfillment.failed",
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
  const [followMode, setFollowMode] = useState<"auto" | "manual">("auto");
  const [isSavingPreferredSupply, setIsSavingPreferredSupply] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState<string | null>(
    null,
  );
  const [isWorkObjectViewerOpen, setIsWorkObjectViewerOpen] = useState(false);
  const [selectedArtifactEventId, setSelectedArtifactEventId] = useState<
    string | null
  >(null);
  const localContainerRef = useRef<HTMLDivElement>(null);
  const previousSelectedViewRef = useRef<WorkroomViewId>(selectedView);
  const lastAutoWorkerCheckRef = useRef<string | null>(null);
  const scrollHostRef = scrollContainerRef ?? localContainerRef;
  const usesExternalScrollHost = Boolean(scrollContainerRef);
  const scrollToTop = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollHostRef.current;
      if (!container) {
        return;
      }

      container.scrollTo({
        top: 0,
        behavior,
      });
    },
    [scrollHostRef],
  );
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollHostRef.current;
      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    },
    [scrollHostRef],
  );

  const resumeLiveStage = useCallback(() => {
    onSelectView("monitor");
    setFollowMode("auto");
    requestAnimationFrame(() => {
      scrollToTop("smooth");
    });
  }, [onSelectView, scrollToTop]);

  useEffect(() => {
    void currentStageId;
    void hasFulfillmentFailure;
    void request.id;
    void request.status;
    setFollowMode("auto");
    requestAnimationFrame(() => {
      scrollToTop("instant");
    });
  }, [
    currentStageId,
    hasFulfillmentFailure,
    request.id,
    request.status,
    scrollToTop,
  ]);

  useEffect(() => {
    void request.id;
    setSelectedFlowNodeId(null);
    setIsWorkObjectViewerOpen(false);
  }, [request.id]);

  useEffect(() => {
    if (!isWorkObjectViewerSuppressed) {
      return;
    }

    setIsWorkObjectViewerOpen(false);
  }, [isWorkObjectViewerSuppressed]);

  useEffect(() => {
    if (previousSelectedViewRef.current === selectedView) {
      return;
    }

    previousSelectedViewRef.current = selectedView;

    if (selectedView !== "monitor") {
      setFollowMode("manual");
      setIsWorkObjectViewerOpen(false);
    } else {
      setFollowMode("auto");
    }

    requestAnimationFrame(() => {
      scrollToTop("smooth");
    });
  }, [scrollToTop, selectedView]);

  useEffect(() => {
    const container = scrollHostRef.current;
    if (!container) {
      return;
    }

    const updateBottomState = () => {
      setIsAtBottom(
        container.scrollTop + container.clientHeight >=
          container.scrollHeight - 100,
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
  }, [scrollHostRef]);

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
  const activeFulfillmentWorkerState =
    getBorealWorkerTrackerState(activeFulfillment);
  const isCharacterCallStarterRequest =
    request.brief.constraints?.serviceFamilyKey === "character-call-starter" ||
    (request.brief.tags ?? []).includes("character_call");
  const canLaunchCharacterCall =
    isRequestOwner &&
    isCharacterCallStarterRequest &&
    CHARACTER_CALL_LAUNCHABLE_STATUSES.has(request.status);
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
  const { data: ownedSuppliesData, isLoading: isLoadingOwnedSupplies } =
    useSWR<{
      supplies: BorealSupplyDraft[];
      hasMore: boolean;
    }>(ownedSuppliesKey, fetcher, {
      revalidateOnFocus: false,
    });
  const publishedOwnedSupplies = useMemo(
    () =>
      (ownedSuppliesData?.supplies ?? []).filter(
        (supply) => supply.status === "published",
      ),
    [ownedSuppliesData?.supplies],
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
    },
  );
  const desktopRuntimeState = useMemo(
    () => getDesktopRuntimeState(desktopRuntimeDiscovery),
    [desktopRuntimeDiscovery],
  );
  const desktopDefaultSupply = desktopRuntimeState.autoResolveSupplyId
    ? (publishedOwnedSupplies.find(
        (supply) => supply.id === desktopRuntimeState.autoResolveSupplyId,
      ) ?? null)
    : null;
  const preferredSupplySelectionValue =
    request.routing.preferredSupplyId ?? REQUEST_ROUTE_INHERIT_DEFAULT;
  const ownerPrivateWorkerStart = getOwnerPrivateWorkerFulfillmentStart({
    activeFulfillment,
    hasCreateAction: typeof onCreateOwnerPrivateWorkerFulfillment === "function",
    isReadonly,
    isRequestOwner,
    request,
    supply: preferredSupply,
  });

  const orderedActivities = useMemo(
    () => [...activities].sort((left, right) => left.sequence - right.sequence),
    [activities],
  );

  const canResolveDelivery =
    request.status === "delivered" &&
    requestViewerUserId === request.ownerId &&
    Boolean(request.activeRefs.activeFulfillmentId) &&
    typeof onResolveDeliveredRequest === "function";
  const canCreateRoleplayDelivery =
    !isReadonly &&
    isRequestOwner &&
    request.visibility === "public" &&
    typeof onCreateRoleplayDelivery === "function" &&
    (request.status === "open" ||
      request.status === "funded" ||
      request.status === "in_progress" ||
      request.status === "waiting_for_owner") &&
    activeFulfillment?.status !== "delivered" &&
    activeFulfillment?.status !== "accepted";
  const canCreateOwnerPrivateWorkerFulfillment =
    ownerPrivateWorkerStart !== null;
  const artifactActivities = useMemo(
    () => orderedActivities.filter((activity) => Boolean(activity.artifact)),
    [orderedActivities],
  );
  const deliveryArtifactActivities = useMemo(
    () => [...artifactActivities].reverse(),
    [artifactActivities],
  );
  const latestDeliveryArtifact =
    deliveryArtifactActivities.find(
      (activity) => activity.artifact?.kind === "delivery",
    )?.artifact ??
    deliveryArtifactActivities[0]?.artifact ??
    null;
  const canRetryBlockedFulfillment =
    requestViewerUserId === request.ownerId &&
    activeFulfillment?.status === "blocked" &&
    activeFulfillmentWorkerState?.retryable === true &&
    typeof onRetryBlockedFulfillment === "function";
  const canCheckActiveWorkerFulfillment =
    requestViewerUserId === request.ownerId &&
    activeFulfillment?.status === "active" &&
    Boolean(activeFulfillmentWorkerState?.providerTaskId) &&
    isProviderRenderInProgress(activeFulfillmentWorkerState?.providerStatus) &&
    typeof onRetryBlockedFulfillment === "function";
  const activeWorkerCheckKey =
    canCheckActiveWorkerFulfillment && activeFulfillment
      ? `${activeFulfillment.id}:${activeFulfillment.updatedAt}:${activeFulfillmentWorkerState?.providerStatus ?? "running"}`
      : null;
  const showsLegacyFailedWorkerNote =
    request.status === "failed" && hasFulfillmentFailure;
  const showReturnToLiveStage = followMode === "manual";
  const showBackToLiveControl =
    selectedView === "monitor" && showReturnToLiveStage;

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
  const requestFlowGraph = useMemo(
    () =>
      buildTrackedRequestFlowGraph({
        request,
        activities: orderedActivities,
        fulfillment: activeFulfillment,
        activeRouteSupply,
        preferredSupply,
        desktopRuntimeState,
        desktopDefaultSupply,
      }),
    [
      activeFulfillment,
      activeRouteSupply,
      desktopDefaultSupply,
      desktopRuntimeState,
      orderedActivities,
      preferredSupply,
      request,
    ],
  );
  const taskBoardProjection = useMemo(
    () =>
      buildRequestTaskBoardProjection({
        request,
        activities: orderedActivities,
        fulfillment: activeFulfillment,
        activeRouteSupply,
        preferredSupply,
      }),
    [
      activeFulfillment,
      activeRouteSupply,
      orderedActivities,
      preferredSupply,
      request,
    ],
  );
  const selectedFlowNodeDescriptor =
    (selectedFlowNodeId
      ? requestFlowGraph.nodes.find((node) => node.id === selectedFlowNodeId)
      : null) ??
    requestFlowGraph.nodes.find(
      (node) => node.id === requestFlowGraph.initialSelectedNodeId,
    ) ??
    requestFlowGraph.nodes[0] ??
    null;
  const openWorkObjectViewer = useCallback(
    (nodeId: string) => {
      onBeforeOpenWorkObjectViewer?.();
      setSelectedFlowNodeId(nodeId);
      setIsWorkObjectViewerOpen(true);
    },
    [onBeforeOpenWorkObjectViewer],
  );
  const handlePreferredSupplyChange = async (value: string) => {
    if (!onUpdatePreferredSupply) {
      return;
    }

    setIsSavingPreferredSupply(true);

    try {
      await onUpdatePreferredSupply(
        value === REQUEST_ROUTE_INHERIT_DEFAULT ? null : value,
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
      summary: "Lock the ask, scope, and terms before routing starts.",
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
                  "No deliverables set yet.",
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
      summary: "Show who should lead the work and how it will move forward.",
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
        "Track the active fulfillment lane, current progress, and delivered proof.",
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

          {canCreateRoleplayDelivery ? (
            <RoleplayDeliveryAction
              isLoading={isCreatingRoleplayDelivery}
              onCreateRoleplayDelivery={onCreateRoleplayDelivery}
            />
          ) : null}

          {canCreateOwnerPrivateWorkerFulfillment &&
          ownerPrivateWorkerStart ? (
            <OwnerPrivateWorkerFulfillmentAction
              isLoading={isCreatingOwnerPrivateWorkerFulfillment}
              onCreateOwnerPrivateWorkerFulfillment={
                onCreateOwnerPrivateWorkerFulfillment
              }
              supplyId={ownerPrivateWorkerStart.supplyId}
              supplyLabel={ownerPrivateWorkerStart.supplyLabel}
              workerKey={ownerPrivateWorkerStart.workerKey}
            />
          ) : null}

          {canLaunchCharacterCall ? (
            <CharacterCallLauncher
              className="border-status-success/25 bg-status-success/[0.08]"
              fulfillmentId={
                activeFulfillment?.id ??
                request.activeRefs.activeFulfillmentId ??
                null
              }
              requestId={request.id}
            />
          ) : null}

          {canCheckActiveWorkerFulfillment ? (
            <div className="rounded-[18px] border border-status-active/25 bg-status-active/[0.08] px-3.5 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-active">
                Render in progress
              </div>
              <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
                The provider render is still running. Boreal will keep checking
                this same fulfillment lane while the room is open.
              </div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                You can leave and return; the provider task id is already saved
                on the request.
              </div>
              <LoadingButton
                className="mt-3"
                isLoading={isRetryingBlockedFulfillment}
                loadingText="Checking..."
                onClick={() => void onRetryBlockedFulfillment?.()}
                size="sm"
                variant="outline"
              >
                Check now
              </LoadingButton>
            </div>
          ) : null}

          {canRetryBlockedFulfillment ? (
            <div className="rounded-[18px] border border-status-waiting/25 bg-status-waiting/[0.08] px-3.5 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-waiting">
                Recovery
              </div>
              <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
                {getBlockedFulfillmentRecoverySummary(activeFulfillment)}
              </div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                Retry the same worker lane without opening a new request.
              </div>
              <LoadingButton
                className="mt-3"
                isLoading={isRetryingBlockedFulfillment}
                loadingText="Retrying..."
                onClick={() => void onRetryBlockedFulfillment?.()}
                size="sm"
                variant="outline"
              >
                Retry delivery
              </LoadingButton>
            </div>
          ) : null}

          {showsLegacyFailedWorkerNote ? (
            <div className="rounded-[18px] border border-status-danger/25 bg-status-danger/[0.08] px-3.5 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-danger">
                Terminal failure
              </div>
              <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
                This request was sealed by the older failure path before Boreal
                could pause and retry the same worker lane.
              </div>
              <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                New retryable worker errors now stop in a blocked state instead
                of rendering this room as complete.
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
              <div className="rounded-[18px] border border-status-success/25 bg-status-success/[0.08] px-3.5 py-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-success">
                  Owner action
                </div>
                <div className="mt-1.5 max-w-[13rem] text-[13px] leading-5.5 text-foreground">
                  Confirm delivery to resolve the request and lock the accepted
                  result.
                </div>
                <LoadingButton
                  className="mt-3"
                  isLoading={isResolvingDeliveredRequest}
                  loadingText="Resolving..."
                  onClick={() => void onResolveDeliveredRequest?.()}
                  size="sm"
                >
                  Confirm delivery
                </LoadingButton>
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
  ];

  const nextActionSummary = getWorkroomNextActionSummary({
    activeFulfillment,
    canCreateRoleplayDelivery,
    canResolveDelivery,
    canRetryBlockedFulfillment,
    currentStageId,
    request,
  });
  const selectedFlowContextKind = selectedFlowNodeDescriptor
    ? getFlowContextKind(selectedFlowNodeDescriptor)
    : "request";
  const selectedArtifactActivity =
    deliveryArtifactActivities.find(
      (activity) => activity.eventId === selectedArtifactEventId,
    ) ??
    deliveryArtifactActivities[0] ??
    null;
  const selectedArtifactEventIdForRender =
    selectedArtifactActivity?.eventId ?? null;
  const selectedFlowContextBody =
    selectedFlowContextKind === "request" ? (
      stages[0]?.body
    ) : selectedFlowContextKind === "worker" ? (
      stages[1]?.body
    ) : selectedFlowContextKind === "delivery" ? (
      <DeliveryFlowContext
        activeFulfillment={activeFulfillment}
        canCreateRoleplayDelivery={canCreateRoleplayDelivery}
        canResolveDelivery={canResolveDelivery}
        deliveryArtifactActivities={deliveryArtifactActivities}
        isReadonly={isReadonly}
        isCreatingRoleplayDelivery={isCreatingRoleplayDelivery}
        isResolvingDeliveredRequest={isResolvingDeliveredRequest}
        latestDeliveryArtifact={latestDeliveryArtifact}
        onCreateRoleplayDelivery={onCreateRoleplayDelivery}
        onResolveDeliveredRequest={onResolveDeliveredRequest}
        ownerUserId={request.ownerId}
        request={request}
      />
    ) : (
      <PlanFlowContext descriptor={selectedFlowNodeDescriptor} />
    );
  const showWorkObjectViewer =
    selectedView === "monitor" &&
    isWorkObjectViewerOpen &&
    !isWorkObjectViewerSuppressed &&
    Boolean(selectedFlowNodeDescriptor);
  const canUseShellWorkObjectViewerHost =
    Boolean(workObjectViewerHost) && !isMobile;

  useEffect(() => {
    onWorkObjectViewerOpenChange?.(
      showWorkObjectViewer && canUseShellWorkObjectViewerHost,
    );
  }, [
    canUseShellWorkObjectViewerHost,
    onWorkObjectViewerOpenChange,
    showWorkObjectViewer,
  ]);

  const workObjectViewer = showWorkObjectViewer ? (
    <WorkroomObjectViewer
      descriptor={selectedFlowNodeDescriptor}
      isShellHosted={canUseShellWorkObjectViewerHost}
      onClose={() => setIsWorkObjectViewerOpen(false)}
    >
      {selectedFlowContextBody}
    </WorkroomObjectViewer>
  ) : null;

  useEffect(() => {
    if (
      !activeWorkerCheckKey ||
      isRetryingBlockedFulfillment ||
      !onRetryBlockedFulfillment
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastAutoWorkerCheckRef.current === activeWorkerCheckKey) {
        return;
      }

      lastAutoWorkerCheckRef.current = activeWorkerCheckKey;
      void onRetryBlockedFulfillment({ quiet: true });
    }, 12_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeWorkerCheckKey,
    isRetryingBlockedFulfillment,
    onRetryBlockedFulfillment,
  ]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:flex-row">
      <div
        className={cn(
          "min-w-0 flex-1 transition-[flex-basis,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          selectedView === "monitor"
            ? "min-h-0 overflow-hidden"
            : usesExternalScrollHost
              ? undefined
              : "overflow-y-auto",
        )}
        ref={usesExternalScrollHost ? undefined : localContainerRef}
      >
        {selectedView === "monitor" ? (
          <section className="relative h-full min-h-[38rem] overflow-hidden bg-background">
            <RequestFlowCanvas
              className="absolute inset-0"
              graph={requestFlowGraph}
              heightClassName="h-full rounded-none border-0"
              onSelectedNodeChange={openWorkObjectViewer}
              selectedNodeId={selectedFlowNodeDescriptor?.id}
            />
            <div
              aria-live="polite"
              className="pointer-events-none absolute left-4 top-4 z-20 w-[min(21rem,calc(100%-2rem))]"
            >
              <div className="pointer-events-auto rounded-[20px] border border-border/55 bg-background/82 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                    Status
                  </div>
                  <div className="max-w-[9rem] truncate rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {formatLabel(request.status)}
                  </div>
                </div>
                <div className="mt-2 truncate text-[14px] leading-5.5 text-foreground">
                  {nextActionSummary.value}
                </div>
                <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                  {nextActionSummary.detail}
                </div>
                <button
                  className="mt-3 rounded-full border border-border/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => {
                    if (selectedFlowNodeDescriptor) {
                      openWorkObjectViewer(selectedFlowNodeDescriptor.id);
                    }
                  }}
                  type="button"
                >
                  Inspect selected
                </button>
                {canCreateRoleplayDelivery ? (
                  <LoadingButton
                    className="mt-2 w-full"
                    isLoading={isCreatingRoleplayDelivery}
                    loadingText="Creating mock proof..."
                    onClick={() => void onCreateRoleplayDelivery?.()}
                    size="sm"
                  >
                    Create mock delivery
                  </LoadingButton>
                ) : null}
                {canResolveDelivery ? (
                  <LoadingButton
                    className="mt-2 w-full"
                    isLoading={isResolvingDeliveredRequest}
                    loadingText="Resolving..."
                    onClick={() => void onResolveDeliveredRequest?.()}
                    size="sm"
                  >
                    Confirm delivery
                  </LoadingButton>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <div className="flex min-h-full flex-col gap-4 px-4 pb-5 pt-2 md:px-6 md:pb-6 md:pt-3">
            <div className="mx-auto w-full max-w-[84rem]">
              <div className="mt-5 space-y-4">
                {selectedView === "tasks" ? (
                  <TaskBoardPanel projection={taskBoardProjection} />
                ) : null}

                {selectedView === "activity" ? (
                  <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                    <div className="border-b border-border/60 px-4 py-4 md:px-5">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                        Activity
                      </div>
                      <div className="mt-2 text-[15px] leading-6 text-foreground">
                        A chronological ledger of request events, tool calls,
                        artifacts, and closure decisions.
                      </div>
                    </div>
                    <div className="px-4 py-4 md:px-5">
                      <GroupedActivityLedger
                        activities={orderedActivities}
                        isReadonly={isReadonly}
                        ownerUserId={request.ownerId}
                      />
                    </div>
                  </section>
                ) : null}

                {selectedView === "artifacts" ? (
                  <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
                    <div className="border-b border-border/60 px-4 py-4 md:px-5">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                        Artifacts
                      </div>
                      <div className="mt-2 text-[15px] leading-6 text-foreground">
                        Files, media, proof, and delivery packages attached to
                        this request.
                      </div>
                    </div>
                    <div className="px-4 py-4 md:px-5">
                      <ArtifactFileBrowser
                        activities={deliveryArtifactActivities}
                        isReadonly={isReadonly}
                        onSelect={setSelectedArtifactEventId}
                        ownerUserId={request.ownerId}
                        selectedActivity={selectedArtifactActivity}
                        selectedEventId={selectedArtifactEventIdForRender}
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {workObjectViewer &&
      workObjectViewerHost &&
      canUseShellWorkObjectViewerHost
        ? createPortal(workObjectViewer, workObjectViewerHost)
        : workObjectViewer}

      {!usesExternalScrollHost &&
      showBackToLiveControl &&
      !showWorkObjectViewer ? (
        <button
          className="absolute bottom-4 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 items-center gap-2 rounded-full border border-border/60 bg-background/92 px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={resumeLiveStage}
          type="button"
        >
          <span className="status-dot size-2 rounded-full bg-current text-status-active" />
          Back to live path
        </button>
      ) : !usesExternalScrollHost &&
        selectedView === "activity" &&
        !showWorkObjectViewer ? (
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

function TaskBoardPanel({
  projection,
}: {
  projection: RequestTaskBoardProjection;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-border/60 bg-background/94 shadow-[0_12px_34px_rgba(15,23,42,0.03)]">
      <div className="border-b border-border/60 px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
              Task board
            </div>
            <div className="mt-2 max-w-3xl text-[15px] leading-6 text-foreground">
              {projection.summary}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <TaskBoardStat
              label="Cards"
              value={String(projection.totalCards)}
            />
            <TaskBoardStat
              label={projection.hasFulfillmentSteps ? "Source" : "Projection"}
              value={
                projection.hasFulfillmentSteps ? "Live steps" : "Plan phases"
              }
            />
            <TaskBoardStat
              label="Workers"
              value={projection.hasAssignedWorker ? "Assigned" : "Open"}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4 xl:grid-cols-4">
        {projection.columns.map((column) => (
          <TaskBoardColumnView column={column} key={column.id} />
        ))}
      </div>
    </section>
  );
}

function TaskBoardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/60 bg-muted/[0.16] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 text-foreground">{value}</span>
    </div>
  );
}

function TaskBoardColumnView({ column }: { column: RequestTaskBoardColumn }) {
  return (
    <div
      className={cn(
        "flex min-h-[24rem] flex-col rounded-[22px] border bg-muted/[0.14]",
        getTaskColumnClassName(column.id),
      )}
    >
      <div className="border-b border-border/55 px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold leading-5 text-foreground">
              {column.title}
            </div>
            <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
              {column.summary}
            </div>
          </div>
          <div className="rounded-full border border-border/60 bg-background/82 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {column.cards.length.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <TaskBoardCardView card={card} key={card.id} />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-[18px] border border-dashed border-border/55 bg-background/55 px-4 py-8 text-center text-[12px] leading-5 text-muted-foreground">
            No cards in this stage.
          </div>
        )}
      </div>
    </div>
  );
}

function TaskBoardCardView({ card }: { card: RequestTaskBoardCard }) {
  const statusTone = getTaskCardStatusTone(card.stageId);

  return (
    <RequestProcessCard
      badges={[
        {
          label: card.source === "fulfillment_step" ? "Step" : "Plan",
          tone: "muted",
        },
      ]}
      density="task"
      footer={<TaskWorkerPill worker={card.worker} />}
      icon={<TaskWorkerAvatar worker={card.worker} />}
      status={{ label: card.statusLabel, tone: statusTone }}
      summary={card.summary}
      tags={getTaskCardTags(card, statusTone)}
      title={card.title}
    />
  );
}

function TaskWorkerPill({ worker }: { worker: RequestTaskBoardWorker }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-2.5 py-2",
        worker.assigned
          ? "border-status-success/25 bg-status-success/[0.08]"
          : "border-dashed border-border/70 bg-muted/[0.12]",
      )}
    >
      <TaskWorkerAvatar size="sm" worker={worker} />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium leading-4 text-foreground">
          {worker.label}
        </div>
        <div className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {worker.assigned ? "Assigned" : "Open"} · {worker.detail}
        </div>
      </div>
    </div>
  );
}

function TaskWorkerAvatar({
  worker,
  size = "md",
}: {
  worker: RequestTaskBoardWorker;
  size?: "sm" | "md";
}) {
  const Icon = getTaskWorkerIcon(worker.kind);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        size === "sm" ? "size-7" : "size-9",
        worker.assigned
          ? "border-status-success/35 bg-status-success/[0.14] text-status-success"
          : "border-border/70 bg-muted/[0.18] text-muted-foreground",
      )}
      title={`${worker.label} · ${worker.detail}`}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </span>
  );
}

function getTaskWorkerIcon(kind: RequestTaskBoardWorker["kind"]) {
  switch (kind) {
    case "agent":
      return BotIcon;
    case "runtime":
      return CpuIcon;
    case "tool":
      return WrenchIcon;
    case "human":
      return UserRoundIcon;
    default:
      return PackageIcon;
  }
}

function getTaskCardStatusTone(
  stageId: RequestTaskBoardStageId,
): RequestProcessCardTone {
  switch (stageId) {
    case "completed":
      return "success";
    case "in_progress":
      return "active";
    case "review":
      return "waiting";
    default:
      return "muted";
  }
}

function getTaskCardTags(
  card: RequestTaskBoardCard,
  statusTone: RequestProcessCardTone,
): RequestProcessCardTag[] {
  const tags: RequestProcessCardTag[] = [
    ...card.roleLabels.slice(0, 2).map((roleLabel) => ({
      label: roleLabel,
      tone: "muted" as const,
    })),
    ...card.proofLabels.slice(0, 2).map((proofLabel) => ({
      label: `Proof: ${proofLabel}`,
      tone: statusTone,
    })),
  ];

  if (card.artifactCount > 0) {
    tags.push({
      label: `${card.artifactCount} ${
        card.artifactCount === 1 ? "artifact" : "artifacts"
      }`,
      tone: "delivered",
    });
  }

  if (card.dependsOnCount > 0) {
    tags.push({
      label: `${card.dependsOnCount} dependency`,
      tone: "waiting",
    });
  }

  return tags;
}

function getTaskColumnClassName(stageId: RequestTaskBoardStageId) {
  switch (stageId) {
    case "todo":
      return "border-status-open/20";
    case "in_progress":
      return "border-status-active/25";
    case "review":
      return "border-status-waiting/25";
    case "completed":
      return "border-status-success/25";
    default:
      return "border-border/60";
  }
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
            index > 0 ? "border-t border-border/60" : undefined,
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

function WorkroomObjectViewer({
  children,
  descriptor,
  isShellHosted = false,
  onClose,
}: {
  children: ReactNode;
  descriptor: RequestFlowNodeDescriptor | null;
  isShellHosted?: boolean;
  onClose: () => void;
}) {
  if (!descriptor) {
    return null;
  }

  return (
    <aside
      aria-label="Selected work object"
      className={cn(
        "z-20 flex shrink-0 flex-col overflow-hidden bg-secondary transition-[width,flex-basis] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isShellHosted
          ? "h-full w-full rounded-tl-[28px] border border-y-0 border-r-0 border-border/70 shadow-[0_24px_65px_rgba(0,0,0,0.18)]"
          : "h-[60dvh] w-full border-t border-border/70 shadow-[0_-18px_60px_rgba(15,23,42,0.12)] md:h-full md:w-[58%] md:min-w-[34rem] md:max-w-[72rem] md:resize-x md:rounded-tl-[28px] md:border md:border-y-0 md:border-r-0 md:shadow-[0_24px_65px_rgba(0,0,0,0.18)]",
      )}
      data-testid="request-object-viewer"
    >
      <div className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-secondary px-4">
        <button
          aria-label="Close selected work object"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">
            {descriptor.title}
          </div>
          <div className="truncate text-[11px] text-muted-foreground md:hidden">
            {descriptor.laneLabel} /{" "}
            {descriptor.stateLabel ?? formatLabel(descriptor.state)}
          </div>
        </div>
        <div className="hidden min-w-0 max-w-[18rem] truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:block">
          {descriptor.laneLabel} /{" "}
          {descriptor.stateLabel ?? formatLabel(descriptor.state)}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5">
          <div className="rounded-[18px] border border-border/60 bg-background/70 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
              Object context
            </div>
            <div className="mt-2 text-[15px] leading-6 text-foreground">
              {descriptor.summary}
            </div>
            {descriptor.chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {descriptor.chips.map((chip) => (
                  <span
                    className="rounded-full border border-border/60 bg-muted/[0.18] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                    key={`${descriptor.id}:viewer-chip:${chip}`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <FlowNodeDetailList details={descriptor.details} />
          {children}
        </div>
      </div>
    </aside>
  );
}

function FlowNodeDetailList({
  details,
}: {
  details: RequestFlowNodeDescriptor["details"];
}) {
  if (details.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-border/60 bg-muted/[0.14]">
      {details.slice(0, 3).map((detail, index) => (
        <div
          className={cn(
            "space-y-1 px-3 py-2.5",
            index > 0 ? "border-t border-border/60" : undefined,
          )}
          key={`${detail.label}:${Array.isArray(detail.value) ? detail.value.join(",") : detail.value}`}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/72">
            {detail.label}
          </div>
          <div className="text-[12px] leading-5 text-foreground">
            {Array.isArray(detail.value)
              ? detail.value.slice(0, 3).join(" | ")
              : detail.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanFlowContext({
  descriptor,
}: {
  descriptor: RequestFlowNodeDescriptor | null;
}) {
  return (
    <div className="rounded-[16px] border border-border/60 bg-muted/[0.14] px-3 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
        Process lens
      </div>
      <div className="mt-2 text-[13px] leading-5.5 text-foreground">
        {descriptor?.subtitle || "Selected plan step"}
      </div>
      <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
        Flow explains Request -&gt; Path -&gt; Worker -&gt; Proof -&gt; Review.
        It is not a separate request or fake task tree.
      </div>
    </div>
  );
}

function DeliveryFlowContext({
  activeFulfillment,
  canCreateRoleplayDelivery,
  canResolveDelivery,
  deliveryArtifactActivities,
  isReadonly,
  isCreatingRoleplayDelivery,
  isResolvingDeliveredRequest,
  latestDeliveryArtifact,
  onCreateRoleplayDelivery,
  onResolveDeliveredRequest,
  ownerUserId,
  request,
}: {
  activeFulfillment: RequestFulfillment | null;
  canCreateRoleplayDelivery: boolean;
  canResolveDelivery: boolean;
  deliveryArtifactActivities: RequestActivityEntry[];
  isReadonly: boolean;
  isCreatingRoleplayDelivery: boolean;
  isResolvingDeliveredRequest: boolean;
  latestDeliveryArtifact: RequestActivityEntry["artifact"] | null;
  onCreateRoleplayDelivery?: () => Promise<void>;
  onResolveDeliveredRequest?: () => Promise<void>;
  ownerUserId: string | null;
  request: BorealRequestDraft;
}) {
  const latestArtifactActivity = deliveryArtifactActivities[0] ?? null;

  return (
    <div className="space-y-3">
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
            detail: latestDeliveryArtifact?.summary?.trim()
              ? latestDeliveryArtifact.summary.trim()
              : formatVerificationDetailDisplay(request),
            label: "Delivery package",
            value:
              latestDeliveryArtifact?.title ||
              "Still waiting on a delivery package.",
          },
        ]}
      />

      {latestArtifactActivity ? (
        <RequestActivityMessage
          activity={latestArtifactActivity}
          index={0}
          isReadonly={isReadonly}
          ownerUserId={ownerUserId}
          totalCount={1}
          variant="stage"
        />
      ) : null}

      {canCreateRoleplayDelivery ? (
        <RoleplayDeliveryAction
          isLoading={isCreatingRoleplayDelivery}
          onCreateRoleplayDelivery={onCreateRoleplayDelivery}
        />
      ) : null}

      {canResolveDelivery ? (
        <div className="rounded-[16px] border border-status-success/25 bg-status-success/[0.08] px-3 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-success">
            Owner action
          </div>
          <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
            Confirm delivery to resolve the request and lock the accepted
            result.
          </div>
          <LoadingButton
            className="mt-3"
            isLoading={isResolvingDeliveredRequest}
            loadingText="Resolving..."
            onClick={() => void onResolveDeliveredRequest?.()}
            size="sm"
          >
            Confirm delivery
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}

function RoleplayDeliveryAction({
  isLoading,
  onCreateRoleplayDelivery,
}: {
  isLoading: boolean;
  onCreateRoleplayDelivery?: () => Promise<void>;
}) {
  return (
    <div className="rounded-[18px] border border-status-active/25 bg-status-active/[0.08] px-3.5 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-active">
        Roleplay delivery
      </div>
      <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
        Create a mock proposal, fulfillment lane, and proof artifact through the
        same request APIs real work uses.
      </div>
      <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
        This is only for exercising the full lifecycle; replace it with real
        proof before treating production work as complete.
      </div>
      <LoadingButton
        className="mt-3"
        isLoading={isLoading}
        loadingText="Creating mock proof..."
        onClick={() => void onCreateRoleplayDelivery?.()}
        size="sm"
        variant="outline"
      >
        Create mock delivery
      </LoadingButton>
    </div>
  );
}

function OwnerPrivateWorkerFulfillmentAction({
  isLoading,
  onCreateOwnerPrivateWorkerFulfillment,
  supplyId,
  supplyLabel,
  workerKey,
}: {
  isLoading: boolean;
  onCreateOwnerPrivateWorkerFulfillment?: (
    options: OwnerPrivateWorkerFulfillmentOptions
  ) => Promise<void>;
  supplyId: string;
  supplyLabel: string;
  workerKey: string;
}) {
  return (
    <div className="rounded-[18px] border border-status-active/25 bg-status-active/[0.08] px-3.5 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-status-active">
        Selected worker lane
      </div>
      <div className="mt-1.5 text-[13px] leading-5.5 text-foreground">
        Start a planned owner-private fulfillment lane for {supplyLabel}.
      </div>
      <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
        This writes `Fulfillment` truth with owner approval and worker key{" "}
        {workerKey}. Provider calls, artifacts, review acceptance, and
        completion stay blocked until the next governed step.
      </div>
      <LoadingButton
        className="mt-3"
        isLoading={isLoading}
        loadingText="Creating lane..."
        onClick={() =>
          void onCreateOwnerPrivateWorkerFulfillment?.({
            supplyId,
            supplyLabel,
            workerKey,
          })
        }
        size="sm"
        variant="outline"
      >
        Create fulfillment lane
      </LoadingButton>
    </div>
  );
}

function GroupedActivityLedger({
  activities,
  ownerUserId,
  isReadonly,
}: {
  activities: RequestActivityEntry[];
  ownerUserId: string | null;
  isReadonly: boolean;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-border/60 bg-muted/[0.12] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
        No request activity yet.
      </div>
    );
  }

  const groups = groupActivitiesByDay(activities);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div className="space-y-2.5" key={group.label}>
          <div className="sticky top-0 z-10 w-fit rounded-full border border-border/60 bg-background/92 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            {group.label}
          </div>
          <div className="space-y-2.5">
            {group.activities.map((activity, index) => (
              <RequestActivityMessage
                activity={activity}
                index={index}
                isReadonly={isReadonly}
                key={activity.eventId}
                ownerUserId={ownerUserId}
                totalCount={group.activities.length}
                variant="stage"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArtifactFileBrowser({
  activities,
  isReadonly,
  onSelect,
  ownerUserId,
  selectedActivity,
  selectedEventId,
}: {
  activities: RequestActivityEntry[];
  isReadonly: boolean;
  onSelect: (eventId: string) => void;
  ownerUserId: string | null;
  selectedActivity: RequestActivityEntry | null;
  selectedEventId: string | null;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-border/60 bg-muted/[0.12] px-4 py-6 text-[13px] leading-5.5 text-muted-foreground">
        No files or delivery artifacts have been attached yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
      <div className="overflow-hidden rounded-[18px] border border-border/60 bg-background/92">
        <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem] gap-3 border-b border-border/60 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72 md:grid">
          <div>Name</div>
          <div>Type</div>
          <div>Sent by</div>
        </div>
        <div className="divide-y divide-border/60">
          {activities.map((activity) => {
            const artifact = activity.artifact;
            if (!artifact) {
              return null;
            }

            const isSelected =
              activity.eventId === selectedEventId ||
              (!selectedEventId && activity.eventId === activities[0]?.eventId);

            return (
              <button
                className={cn(
                  "grid w-full gap-2 px-3 py-3 text-left transition-colors md:grid-cols-[minmax(0,1fr)_7rem_8rem] md:gap-3",
                  isSelected ? "bg-muted/[0.28]" : "hover:bg-muted/[0.14]",
                )}
                key={activity.eventId}
                onClick={() => onSelect(activity.eventId)}
                type="button"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/[0.18] text-muted-foreground">
                    {artifact.kind === "delivery" ? (
                      <PackageIcon className="size-3.5" />
                    ) : (
                      <PaperclipIcon className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] leading-5 text-foreground">
                      {artifact.title}
                    </span>
                    <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                      {formatTimestamp(activity.occurredAt)}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5 md:hidden">
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {getArtifactFileType(artifact)}
                      </span>
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {getActivityActorName(activity)}
                      </span>
                    </span>
                  </span>
                </div>
                <div className="hidden truncate text-[12px] leading-8 text-muted-foreground md:block">
                  {getArtifactFileType(artifact)}
                </div>
                <div className="hidden truncate text-[12px] leading-8 text-muted-foreground md:block">
                  {getActivityActorName(activity)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 space-y-3 rounded-[18px] border border-border/60 bg-muted/[0.12] p-3">
        {selectedActivity ? (
          <>
            <ArtifactPreviewPanel activity={selectedActivity} />
            <RequestActivityMessage
              activity={selectedActivity}
              index={0}
              isReadonly={isReadonly}
              ownerUserId={ownerUserId}
              totalCount={1}
              variant="stage"
            />
          </>
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-[16px] border border-dashed border-border/60 text-[13px] text-muted-foreground">
            Select a file to preview it.
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactPreviewPanel({
  activity,
}: {
  activity: RequestActivityEntry;
}) {
  const artifact = activity.artifact;

  if (!artifact) {
    return null;
  }

  const previewUrl = getArtifactPreviewUrl(activity);
  const isVideo = isVideoArtifactPreview(activity);
  const isImage = isImageArtifactPreview(activity);
  const fileName = getArtifactFileName(artifact);

  return (
    <div className="overflow-hidden rounded-[16px] border border-border/60 bg-background/92">
      {isVideo && previewUrl ? (
        <div className="border-b border-border/60 bg-black">
          <video
            className="aspect-video w-full bg-black object-contain"
            controls
            preload="metadata"
            src={previewUrl}
          >
            <track
              kind="captions"
              label="No captions"
              src="data:text/vtt,WEBVTT"
              srcLang="en"
            />
          </video>
        </div>
      ) : isImage && previewUrl ? (
        <div className="border-b border-border/60 bg-black">
          <img
            alt={artifact.title}
            className="max-h-[28rem] w-full object-contain"
            src={previewUrl}
          />
        </div>
      ) : null}

      <div className="space-y-3 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/[0.18] text-muted-foreground">
            {isVideo ? (
              <FileVideoIcon className="size-4" />
            ) : artifact.container.kind === "document" ? (
              <FileTextIcon className="size-4" />
            ) : artifact.kind === "delivery" ? (
              <PackageIcon className="size-4" />
            ) : (
              <PaperclipIcon className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-medium leading-6 text-foreground">
              {artifact.title}
            </div>
            <div className="text-[12px] leading-5 text-muted-foreground">
              {artifact.summary?.trim() ||
                "Attached proof or delivery file for this request."}
            </div>
          </div>
        </div>

        <div className="grid gap-2 text-[12px] leading-5 text-muted-foreground sm:grid-cols-2">
          <ArtifactMetaPill label="Kind" value={formatLabel(artifact.kind)} />
          <ArtifactMetaPill
            label="Type"
            value={getArtifactFileType(artifact)}
          />
          {fileName ? <ArtifactMetaPill label="File" value={fileName} /> : null}
          {artifact.container.kind === "object_ref" &&
          artifact.container.byteSize ? (
            <ArtifactMetaPill
              label="Size"
              value={formatByteSize(artifact.container.byteSize)}
            />
          ) : null}
        </div>

        {previewUrl ? (
          <a
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href={previewUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLinkIcon className="size-3.5" />
            Open file
          </a>
        ) : artifact.container.kind === "object_ref" ? (
          <div className="break-all rounded-[14px] border border-dashed border-border/60 bg-muted/[0.16] px-3 py-2 text-[12px] leading-5 text-muted-foreground">
            Stored as {artifact.container.storageProvider}:{" "}
            {artifact.container.objectKey}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ArtifactMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] border border-border/60 bg-muted/[0.14] px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/72">
        {label}
      </div>
      <div className="mt-0.5 truncate text-foreground">{value}</div>
    </div>
  );
}

function groupActivitiesByDay(activities: RequestActivityEntry[]) {
  const groups = new Map<string, RequestActivityEntry[]>();

  for (const activity of activities) {
    const label = new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
    }).format(new Date(activity.occurredAt));
    groups.set(label, [...(groups.get(label) ?? []), activity]);
  }

  return Array.from(groups.entries()).map(([label, groupActivities]) => ({
    activities: groupActivities,
    label,
  }));
}

function getArtifactFileType(
  artifact: NonNullable<RequestActivityEntry["artifact"]>,
) {
  if (artifact.container.kind === "document") {
    return `${formatLabel(artifact.kind)} / ${formatLabel(
      artifact.container.documentKind,
    )}`;
  }

  if (artifact.container.kind === "external_ref") {
    return `${formatLabel(artifact.kind)} / link`;
  }

  return `${formatLabel(artifact.kind)} / ${formatLabel(
    artifact.container.mimeType ||
      artifact.container.mediaKind ||
      artifact.container.storageProvider,
  )}`;
}

function getArtifactPreviewUrl(activity: RequestActivityEntry) {
  const artifact = activity.artifact;
  const container = artifact?.container;

  if (!artifact || !container || container.kind === "document") {
    return null;
  }

  if (container.kind === "external_ref") {
    return container.uri;
  }

  if (container.storageProvider !== "vercel_blob") {
    return null;
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests/${
    activity.requestId
  }/artifacts/${artifact.id}/media`;
}

function isVideoArtifactPreview(activity: RequestActivityEntry) {
  const artifact = activity.artifact;
  const container = artifact?.container;

  if (!artifact || !container || container.kind === "document") {
    return false;
  }

  return (
    (artifact.kind === "media" &&
      "mediaKind" in container &&
      container.mediaKind === "video") ||
    ("mimeType" in container &&
      typeof container.mimeType === "string" &&
      container.mimeType.toLowerCase().startsWith("video/"))
  );
}

function isImageArtifactPreview(activity: RequestActivityEntry) {
  const artifact = activity.artifact;
  const container = artifact?.container;

  if (!artifact || !container || container.kind === "document") {
    return false;
  }

  return (
    (artifact.kind === "media" &&
      "mediaKind" in container &&
      container.mediaKind === "image") ||
    ("mimeType" in container &&
      typeof container.mimeType === "string" &&
      container.mimeType.toLowerCase().startsWith("image/"))
  );
}

function getArtifactFileName(
  artifact: NonNullable<RequestActivityEntry["artifact"]>,
) {
  const container = artifact.container;

  if (container.kind === "document") {
    return null;
  }

  return container.filename ?? null;
}

function formatByteSize(byteSize: number) {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }

  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }

  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

function getActivityActorName(activity: RequestActivityEntry) {
  return (
    activity.actor.displayName?.trim() ||
    activity.actor.handle?.trim() ||
    activity.actor.id ||
    formatLabel(activity.actor.kind)
  );
}

function getFlowContextKind(descriptor: RequestFlowNodeDescriptor) {
  if (descriptor.kind === "request") {
    return "request";
  }

  if (descriptor.kind === "worker" || descriptor.kind === "step") {
    return "worker";
  }

  if (descriptor.kind === "delivery") {
    return "delivery";
  }

  return "plan";
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
  desktopRuntimePolicy:
    | DesktopRuntimeDiscoveryPayload["policy"]
    | null
    | undefined;
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
  const desktopDefaultSupply = desktopRuntimePolicy?.autoResolveSupplyId
    ? (publishedOwnedSupplies.find(
        (supply) => supply.id === desktopRuntimePolicy.autoResolveSupplyId,
      ) ?? null)
    : null;
  const [supplySearchQuery, setSupplySearchQuery] = useState("");
  const searchedOwnedSupplies = useMemo(() => {
    const query = supplySearchQuery.trim().toLowerCase();
    if (!query) {
      return publishedOwnedSupplies;
    }

    return publishedOwnedSupplies.filter((supply) =>
      getSupplySearchText(supply).includes(query),
    );
  }, [publishedOwnedSupplies, supplySearchQuery]);

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
                "No capability kinds pinned yet.",
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
              <label className="block">
                <span className="sr-only">Search people and supplies</span>
                <input
                  className="h-10 w-full rounded-2xl border border-border/70 bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:ring-2 focus:ring-ring/35"
                  onChange={(event) => setSupplySearchQuery(event.target.value)}
                  placeholder="Search people, supplies, services, runtimes..."
                  value={supplySearchQuery}
                />
              </label>
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
                    (supply) => supply.id === preferredSupply.id,
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
                  {searchedOwnedSupplies.length === 0 &&
                  publishedOwnedSupplies.length > 0 ? (
                    <SelectItem disabled value="__no_matching_supply__">
                      No matching published capability
                    </SelectItem>
                  ) : null}
                  {searchedOwnedSupplies.map((supply) => (
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
                    : supplySearchQuery.trim()
                      ? `${searchedOwnedSupplies.length} of ${publishedOwnedSupplies.length} published capabilities match this search. Selection pins a route, not a live assignment.`
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
            <RouteFactRow label="Desktop model" value={desktopModelSelection} />
            <RouteFactRow
              label="Desktop default"
              value={describeDesktopDefaultRoute({
                desktopDefaultSupply,
                desktopRuntimeState,
                policySupplyId:
                  desktopRuntimePolicy?.autoResolveSupplyId ?? null,
                request,
              })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <LoadingButton
              isLoading={isLoadingDesktopRuntimeDiscovery}
              loadingText="Refreshing..."
              onClick={onRefreshDesktopRuntime}
              size="sm"
              type="button"
              variant="outline"
            >
              Refresh status
            </LoadingButton>
            <Button onClick={onOpenDesktopRuntime} size="sm" type="button">
              Open Boreal Desktop
            </Button>
          </div>
        </div>
      </div>
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
        No execution steps are attached yet. Once a fulfillment lane opens,
        Boreal will show seeded step ownership here.
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
        <div className="text-[14px] leading-6 text-foreground">
          {step.title}
        </div>
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
          "status-dot size-2 shrink-0 rounded-full bg-current",
          isReady ? "text-status-success" : "text-status-muted",
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
  } = {},
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
    default:
      return "brief_terms";
  }
}

function getBorealWorkerTrackerState(fulfillment: RequestFulfillment | null): {
  errorMessage?: string;
  providerStatus?: string;
  providerTaskId?: string;
  recoveryStage?: string;
  retryable?: boolean;
  workerKey?: string;
} | null {
  const rawWorkerState = fulfillment?.metadata?.borealWorker;
  if (
    !rawWorkerState ||
    typeof rawWorkerState !== "object" ||
    Array.isArray(rawWorkerState)
  ) {
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
    providerTaskId:
      typeof workerState.providerTaskId === "string"
        ? workerState.providerTaskId
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
      typeof workerState.workerKey === "string"
        ? workerState.workerKey
        : undefined,
  };
}

function isProviderRenderInProgress(status: string | undefined) {
  return (
    status === "starting" ||
    status === "queued" ||
    status === "running" ||
    status === "retrying"
  );
}

function getBlockedFulfillmentRecoverySummary(
  fulfillment: RequestFulfillment | null,
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
  canCreateRoleplayDelivery,
  canResolveDelivery,
  canRetryBlockedFulfillment,
  currentStageId,
  request,
}: {
  activeFulfillment: RequestFulfillment | null;
  canCreateRoleplayDelivery: boolean;
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

  if (canCreateRoleplayDelivery) {
    return {
      value: "Create a mock delivery to test the full lifecycle.",
      detail:
        "This writes real commitment, fulfillment, and artifact truth, marked clearly as roleplay proof.",
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
      detail:
        "Review the activity log and artifacts if follow-up work is needed.",
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

function formatConstraintDetail(
  constraints: Record<string, unknown> | undefined,
) {
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
  activeRouteSupply: BorealSupplyDraft | null,
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
  supply: Pick<BorealSupplyDraft, "key" | "profile"> | null | undefined,
) {
  return (
    supply?.profile.displayName.trim() || supply?.key || "Untitled capability"
  );
}

function getSupplySearchText(supply: BorealSupplyDraft) {
  return [
    supply.key,
    supply.profile.displayName,
    supply.profile.headline,
    supply.profile.summary,
    supply.profile.description,
    ...supply.profile.tags,
    ...supply.capability.supplyKinds,
    ...supply.capability.fulfillmentActorKinds,
    ...supply.capability.outputKinds,
    ...supply.capability.executionChannels,
    supply.status,
    supply.visibility,
    supply.source.kind,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" ")
    .toLowerCase();
}

function doesOwnedSupplyMatchRequest(
  request: Pick<BorealRequestDraft, "seeking"> | null | undefined,
  supply: Pick<BorealSupplyDraft, "capability"> | null | undefined,
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
  discovery: DesktopRuntimeDiscoveryPayload | null | undefined,
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
  desktopRuntimePolicy:
    | DesktopRuntimeDiscoveryPayload["policy"]
    | null
    | undefined;
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

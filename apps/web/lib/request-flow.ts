import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestFulfillment,
  RequestFulfillmentStep,
  RequestRoleKey,
  RequestStatus,
} from "./request";
import type { BorealSupplyDraft } from "./supply";

export type RequestFlowNodeKind =
  | "request"
  | "phase"
  | "worker"
  | "delivery"
  | "stage"
  | "step";

export type RequestFlowNodeState =
  | "done"
  | "current"
  | "pending"
  | "blocked"
  | "failed"
  | "cancelled";

export type RequestFlowNodeTone =
  | "green"
  | "blue"
  | "pink"
  | "amber"
  | "violet";

export type RequestFlowNodeField = {
  label: string;
  value: string | string[];
};

export type RequestFlowNodeDescriptor = {
  id: string;
  kind: RequestFlowNodeKind;
  state: RequestFlowNodeState;
  tone: RequestFlowNodeTone;
  laneLabel: string;
  title: string;
  subtitle: string;
  summary: string;
  chips: string[];
  details: RequestFlowNodeField[];
  position: { x: number; y: number };
  width: number;
};

export type RequestFlowEdgeDescriptor = {
  id: string;
  source: string;
  target: string;
};

export type RequestFlowGraph = {
  nodes: RequestFlowNodeDescriptor[];
  edges: RequestFlowEdgeDescriptor[];
  initialSelectedNodeId: string;
};

type RequestFlowProcessNode = Pick<
  RequestFlowNodeDescriptor,
  "state" | "tone" | "title" | "subtitle" | "summary" | "chips" | "details"
>;

export type RequestFlowDesktopRuntimeState = {
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

type PortablePhase = {
  phaseKey: string;
  title: string;
  summary: string;
  roleKeys: RequestRoleKey[];
  requiredEvidenceClaims: string[];
};

const draftFlowLayout = {
  request: { x: 44, y: 168 },
  phaseBase: { x: 410, y: 104 },
  workerBase: { x: 776, y: 104 },
  laneGapY: 252,
} as const;

const workroomFlowLayout = {
  request: { x: 40, y: 0 },
  phaseBase: { x: 372, y: 88 },
  worker: { x: 738, y: 0 },
  delivery: { x: 1092, y: 0 },
  laneGapY: 236,
} as const;

export function buildDraftRequestFlowGraph(
  request: BorealRequestDraft
): RequestFlowGraph {
  const phases = getPortableDraftPhases(request);
  const inputY =
    draftFlowLayout.phaseBase.y +
    Math.max(0, ((Math.max(phases.length - 1, 0) * draftFlowLayout.laneGapY) / 2) - 98);

  const nodes: RequestFlowNodeDescriptor[] = [
    {
      id: "request",
      kind: "request",
      state: request.derived.readiness.readyForOpen ? "done" : "current",
      tone: "green",
      laneLabel: "Request",
      title: request.brief.title?.trim() || "Request draft",
      subtitle: formatLabel(request.status),
      summary:
        request.brief.body?.trim() ||
        request.brief.summary?.trim() ||
        "No durable brief body captured yet.",
      chips: compactChips([
        request.derived.routeFamily ? formatLabel(request.derived.routeFamily) : null,
        request.derived.executionKind
          ? formatLabel(request.derived.executionKind)
          : null,
        request.derived.matchingMode ? formatLabel(request.derived.matchingMode) : null,
      ]),
      details: [
        { label: "Readiness", value: request.derived.readiness.summary },
        {
          label: "Missing details",
          value:
            request.derived.missingDetails.length > 0
              ? request.derived.missingDetails.map(formatLabel)
              : "No critical route gaps.",
        },
        {
          label: "Proof",
          value:
            request.derived.verificationPlan.requiredEvidenceClaims.length > 0
              ? request.derived.verificationPlan.requiredEvidenceClaims.map(formatLabel)
              : "No proof package required yet.",
        },
      ],
      position: {
        x: draftFlowLayout.request.x,
        y: inputY,
      },
      width: 320,
    },
  ];

  const edges: RequestFlowEdgeDescriptor[] = [];
  const roleSlotByKey = new Map(
    request.derived.roleSlots.map((roleSlot) => [roleSlot.roleKey, roleSlot] as const)
  );

  phases.forEach((phase, index) => {
    const phaseId = `phase:${phase.phaseKey}:${index}`;
    const roleMatch = getPrimaryPhaseRoleMatch(request, phase.roleKeys);
    const roleSlot = roleMatch
      ? roleSlotByKey.get(roleMatch.roleKey)
      : phase.roleKeys.length > 0
        ? roleSlotByKey.get(phase.roleKeys[0]!)
        : undefined;

    nodes.push({
      id: phaseId,
      kind: "phase",
      state: deriveDraftPhaseState(request, phase.phaseKey),
      tone: "blue",
      laneLabel: "Plan lane",
      title: phase.title,
      subtitle: `Phase ${index + 1}`,
      summary: phase.summary,
      chips: compactChips([
        phase.roleKeys.length > 0
          ? `${phase.roleKeys.length} ${phase.roleKeys.length === 1 ? "lane" : "lanes"}`
          : null,
        phase.requiredEvidenceClaims.length > 0
          ? `${phase.requiredEvidenceClaims.length} proof`
          : null,
      ]),
      details: [
        {
          label: "Role lanes",
          value:
            phase.roleKeys.length > 0
              ? phase.roleKeys.map((roleKey) => {
                  const slot = roleSlotByKey.get(roleKey);
                  return slot?.title ?? formatLabel(roleKey);
                })
              : "No explicit role lanes yet.",
        },
        {
          label: "Evidence",
          value:
            phase.requiredEvidenceClaims.length > 0
              ? phase.requiredEvidenceClaims.map(formatLabel)
              : "No proof obligation on this phase.",
        },
      ],
      position: {
        x: draftFlowLayout.phaseBase.x,
        y: draftFlowLayout.phaseBase.y + index * draftFlowLayout.laneGapY,
      },
      width: 320,
    });

    edges.push({
      id: `edge:request-${phaseId}`,
      source: "request",
      target: phaseId,
    });

    if (!roleMatch && !roleSlot) {
      return;
    }

    const workerId = `worker:${phase.phaseKey}:${index}`;
    nodes.push({
      id: workerId,
      kind: "worker",
      state: roleMatch?.supplyId ? "current" : "pending",
      tone: roleMatch?.supplyId ? "pink" : "violet",
      laneLabel: "Matched lane",
      title:
        roleMatch?.supplyId && roleMatch.supplyId.trim().length > 0
          ? roleMatch.supplyId
          : roleSlot?.title ?? "Open lane",
      subtitle:
        roleSlot?.title ??
        (roleMatch ? formatLabel(roleMatch.roleKey) : "Worker lane"),
      summary:
        roleMatch?.summary ||
        roleSlot?.summary ||
        "No matched worker lane is attached yet.",
      chips: compactChips([
        roleMatch ? formatLabel(roleMatch.confidence) : null,
        roleMatch?.required ? "required" : "optional",
      ]),
      details: [
        {
          label: "Status",
          value: roleMatch ? formatLabel(roleMatch.status) : "Open lane",
        },
        {
          label: "Source",
          value:
            roleMatch?.supplyId && roleMatch.supplyId.trim().length > 0
              ? roleMatch.supplyId
              : "No supply attached yet.",
        },
        {
          label: "Role",
          value:
            roleSlot?.title ??
            (roleMatch ? formatLabel(roleMatch.roleKey) : "Unspecified role"),
        },
      ],
      position: {
        x: draftFlowLayout.workerBase.x,
        y: draftFlowLayout.workerBase.y + index * draftFlowLayout.laneGapY,
      },
      width: 308,
    });

    edges.push({
      id: `edge:${phaseId}-${workerId}`,
      source: phaseId,
      target: workerId,
    });
  });

  return {
    nodes,
    edges,
    initialSelectedNodeId: "request",
  };
}

export function buildTrackedRequestFlowGraph({
  request,
  activities,
  fulfillment,
  activeRouteSupply,
  preferredSupply,
  desktopRuntimeState,
  desktopDefaultSupply,
}: {
  request: BorealRequestDraft;
  activities: RequestActivityEntry[];
  fulfillment: RequestFulfillment | null;
  activeRouteSupply: BorealSupplyDraft | null;
  preferredSupply: BorealSupplyDraft | null;
  desktopRuntimeState?: RequestFlowDesktopRuntimeState | null;
  desktopDefaultSupply?: BorealSupplyDraft | null;
}): RequestFlowGraph {
  const phases = getPortableDraftPhases(request);
  const roleSlotByKey = new Map(
    request.derived.roleSlots.map((roleSlot) => [roleSlot.roleKey, roleSlot] as const)
  );
  const latestArtifact = getLatestTrackedArtifact(activities);
  const workerNode = buildTrackedWorkerNode({
    request,
    fulfillment,
    activeRouteSupply,
    preferredSupply,
    desktopRuntimeState: desktopRuntimeState ?? null,
    desktopDefaultSupply: desktopDefaultSupply ?? null,
  });
  const deliveryNode = buildTrackedDeliveryNode({
    request,
    fulfillment,
    latestArtifact,
    artifactCount: activities.filter((activity) => Boolean(activity.artifact)).length,
  });
  const centeredY =
    workroomFlowLayout.phaseBase.y +
    (Math.max(phases.length - 1, 0) * workroomFlowLayout.laneGapY) / 2 +
    28;

  const nodes: RequestFlowNodeDescriptor[] = [
    {
      id: "request",
      kind: "request",
      state: deriveRequestLifecycleState(request.status),
      tone: "green",
      laneLabel: "Request",
      title: request.brief.title?.trim() || "Tracked request",
      subtitle: formatLabel(request.status),
      summary:
        request.brief.body?.trim() ||
        request.brief.summary?.trim() ||
        request.latest.summary?.trim() ||
        "No request brief captured yet.",
      chips: compactChips([
        request.derived.routeFamily ? formatLabel(request.derived.routeFamily) : null,
        request.derived.executionKind
          ? formatLabel(request.derived.executionKind)
          : null,
      ]),
      details: [
        {
          label: "Plan summary",
          value: request.derived.routeSummary?.trim() || "No route summary yet.",
        },
        {
          label: "Readiness",
          value: request.derived.readiness.summary,
        },
        {
          label: "Proof",
          value:
            request.derived.verificationPlan.requiredEvidenceClaims.length > 0
              ? request.derived.verificationPlan.requiredEvidenceClaims.map(formatLabel)
              : "No proof gate set.",
        },
      ],
      position: {
        x: workroomFlowLayout.request.x,
        y: centeredY,
      },
      width: 300,
    },
  ];

  const edges: RequestFlowEdgeDescriptor[] = [];
  const hasWorkerPath = workerNode.state !== "pending";

  phases.forEach((phase, index) => {
    const phaseId = `phase:${phase.phaseKey}:${index}`;
    const roleMatch = getPrimaryPhaseRoleMatch(request, phase.roleKeys);
    const phaseState = deriveTrackedPhaseState({
      hasWorkerPath,
      index,
      requestStatus: request.status,
      totalPhases: phases.length,
      fulfillmentStatus: fulfillment?.status ?? null,
    });

    nodes.push({
      id: phaseId,
      kind: "phase",
      state: phaseState,
      tone: getProcessNodeTone(phaseState, "blue"),
      laneLabel: "Plan",
      title: phase.title,
      subtitle: `Phase ${index + 1}`,
      summary: phase.summary,
      chips: compactChips([
        phase.roleKeys.length > 0
          ? `${phase.roleKeys.length} ${phase.roleKeys.length === 1 ? "lane" : "lanes"}`
          : null,
        phase.requiredEvidenceClaims.length > 0
          ? `${phase.requiredEvidenceClaims.length} proof`
          : null,
        roleMatch?.supplyId ? "matched" : null,
      ]),
      details: [
        {
          label: "Role lanes",
          value:
            phase.roleKeys.length > 0
              ? phase.roleKeys.map((roleKey) => {
                  const slot = roleSlotByKey.get(roleKey);
                  return slot?.title ?? formatLabel(roleKey);
                })
              : "No explicit role lanes yet.",
        },
        {
          label: "Worker handoff",
          value:
            roleMatch?.summary ||
            workerNode.title ||
            "No worker route attached to this plan yet.",
        },
        {
          label: "Evidence",
          value:
            phase.requiredEvidenceClaims.length > 0
              ? phase.requiredEvidenceClaims.map(formatLabel)
              : "No proof obligation on this phase.",
        },
      ],
      position: {
        x: workroomFlowLayout.phaseBase.x,
        y: workroomFlowLayout.phaseBase.y + index * workroomFlowLayout.laneGapY,
      },
      width: 320,
    });

    edges.push({
      id: `edge:request-${phaseId}`,
      source: "request",
      target: phaseId,
    });
    edges.push({
      id: `edge:${phaseId}-worker`,
      source: phaseId,
      target: "worker",
    });
  });

  nodes.push({
    id: "worker",
    kind: "worker",
    state: workerNode.state,
    tone: workerNode.tone,
    laneLabel: "Worker",
    title: workerNode.title,
    subtitle: workerNode.subtitle,
    summary: workerNode.summary,
    chips: workerNode.chips,
    details: workerNode.details,
    position: {
      x: workroomFlowLayout.worker.x,
      y: centeredY,
    },
    width: 300,
  });
  nodes.push({
    id: "delivery",
    kind: "delivery",
    state: deliveryNode.state,
    tone: deliveryNode.tone,
    laneLabel: "Delivery",
    title: deliveryNode.title,
    subtitle: deliveryNode.subtitle,
    summary: deliveryNode.summary,
    chips: deliveryNode.chips,
    details: deliveryNode.details,
    position: {
      x: workroomFlowLayout.delivery.x,
      y: centeredY,
    },
    width: 300,
  });

  edges.push({
    id: "edge:worker-delivery",
    source: "worker",
    target: "delivery",
  });

  return {
    nodes,
    edges,
    initialSelectedNodeId: "request",
  };
}

function getPortableDraftPhases(request: BorealRequestDraft): PortablePhase[] {
  if (request.derived.phases.length > 0) {
    return request.derived.phases.map((phase) => ({
      phaseKey: phase.phaseKey,
      title: phase.title,
      summary: phase.summary,
      roleKeys: phase.roleKeys,
      requiredEvidenceClaims: phase.requiredEvidenceClaims,
    }));
  }

  return [
    {
      phaseKey: "planner_pending",
      title: "Planner expansion pending",
      summary:
        request.derived.readiness.summary ||
        "Boreal has the draft brief but has not emitted a durable phase plan yet.",
      roleKeys: request.derived.leadRole ? [request.derived.leadRole] : [],
      requiredEvidenceClaims:
        request.derived.verificationPlan.requiredEvidenceClaims,
    },
  ];
}

function deriveDraftPhaseState(
  request: BorealRequestDraft,
  phaseKey: string
): RequestFlowNodeState {
  if (phaseKey === "planner_pending") {
    return request.derived.readiness.readyForOpen ? "done" : "current";
  }

  if (phaseKey === "clarify_constraints" && request.derived.clarificationNeeded.required) {
    return "current";
  }

  return "pending";
}

function getPrimaryPhaseRoleMatch(
  request: BorealRequestDraft,
  roleKeys: RequestRoleKey[]
) {
  return (
    request.derived.roleMatches.find(
      (roleMatch) => roleMatch.required && roleKeys.includes(roleMatch.roleKey)
    ) ??
    request.derived.roleMatches.find(
      (roleMatch) =>
        Boolean(roleMatch.supplyId) && roleKeys.includes(roleMatch.roleKey)
    ) ??
    request.derived.roleMatches.find((roleMatch) =>
      roleKeys.includes(roleMatch.roleKey)
    )
  );
}

function deriveRequestLifecycleState(
  status: RequestStatus
): RequestFlowNodeState {
  switch (status) {
    case "completed":
      return "done";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    case "delivered":
    case "waiting_for_owner":
    case "in_progress":
      return "current";
    default:
      return "pending";
  }
}

function deriveTrackedPhaseState({
  hasWorkerPath,
  index,
  requestStatus,
  totalPhases,
  fulfillmentStatus,
}: {
  hasWorkerPath: boolean;
  index: number;
  requestStatus: RequestStatus;
  totalPhases: number;
  fulfillmentStatus: RequestFulfillment["status"] | null;
}): RequestFlowNodeState {
  const isLastPhase = index === totalPhases - 1;

  if (requestStatus === "completed") {
    return "done";
  }

  if (requestStatus === "cancelled") {
    return isLastPhase ? "cancelled" : "done";
  }

  if (requestStatus === "failed") {
    return isLastPhase ? "failed" : "done";
  }

  if (fulfillmentStatus === "blocked") {
    return isLastPhase ? "blocked" : "done";
  }

  if (
    hasWorkerPath ||
    requestStatus === "in_progress" ||
    requestStatus === "waiting_for_owner" ||
    requestStatus === "delivered"
  ) {
    return "done";
  }

  return index === 0 ? "current" : "pending";
}

function buildTrackedWorkerNode({
  request,
  fulfillment,
  activeRouteSupply,
  preferredSupply,
  desktopRuntimeState,
  desktopDefaultSupply,
}: {
  request: BorealRequestDraft;
  fulfillment: RequestFulfillment | null;
  activeRouteSupply: BorealSupplyDraft | null;
  preferredSupply: BorealSupplyDraft | null;
  desktopRuntimeState: RequestFlowDesktopRuntimeState | null;
  desktopDefaultSupply: BorealSupplyDraft | null;
}): RequestFlowProcessNode {
  const currentStep = getCurrentTrackedStep(fulfillment);
  const contributorCount = fulfillment?.contributors.length ?? 0;
  const autoResolveLane = getStringMetadata(fulfillment?.metadata, "autoResolveLane");

  if (fulfillment) {
    const state = mapTrackedFulfillmentStatus(fulfillment.status, request.status);
    const title =
      getTrackedSupplyLabel(activeRouteSupply) ||
      fulfillment.lead.displayName?.trim() ||
      fulfillment.supplyId ||
      "Active worker lane";

    return {
      state,
      tone: getProcessNodeTone(state, "violet"),
      title,
      subtitle:
        activeRouteSupply?.profile.headline?.trim() ||
        getTrackedLeadLabel(fulfillment) ||
        "Active fulfillment lane",
      summary:
        fulfillment.summary?.trim() ||
        activeRouteSupply?.profile.summary?.trim() ||
        "A worker lane is attached to this request and is carrying execution truth.",
      chips: compactChips([
        activeRouteSupply ? formatSupplyKinds(activeRouteSupply) : null,
        fulfillment.status ? formatLabel(fulfillment.status) : null,
        contributorCount > 0
          ? `${contributorCount + 1} people`
          : autoResolveLane
            ? "desktop auto-resolve"
            : null,
      ]),
      details: [
        {
          label: "Lane source",
          value:
            activeRouteSupply?.id ||
            fulfillment.supplyId ||
            request.routing.preferredSupplyId ||
            "No supply id attached.",
        },
        {
          label: "Lead",
          value: getTrackedLeadLabel(fulfillment),
        },
        {
          label: "Active step",
          value:
            currentStep?.title ||
            (fulfillment.steps.length > 0
              ? `${fulfillment.steps.length} fulfillment steps tracked.`
              : "No explicit fulfillment step is active."),
        },
      ],
    };
  }

  const preferredTitle =
    getTrackedSupplyLabel(preferredSupply) || request.routing.preferredSupplyId?.trim() || null;

  if (preferredTitle) {
    const matchesRequest =
      !preferredSupply || doesTrackedSupplyMatchRequest(request, preferredSupply);
    const state =
      desktopRuntimeState?.requestLaneReady === true ? "current" : "pending";

    return {
      state,
      tone: getProcessNodeTone(state, "violet"),
      title: preferredTitle,
      subtitle: matchesRequest ? "Preferred worker route" : "Pinned route needs review",
      summary: matchesRequest
        ? `${preferredTitle} is pinned for this request and will attach on the next private execution lane.`
        : `${preferredTitle} is pinned, but it does not match this request's capability kinds.`,
      chips: compactChips([
        preferredSupply ? formatSupplyKinds(preferredSupply) : null,
        desktopRuntimeState?.requestLaneReady ? "desktop ready" : null,
        "pinned",
      ]),
      details: [
        {
          label: "Pinned source",
          value:
            preferredSupply?.id ||
            request.routing.preferredSupplyId ||
            "No preferred supply id recorded.",
        },
        {
          label: "Desktop runtime",
          value:
            desktopRuntimeState?.detail ||
            "Desktop runtime truth is not linked for this request yet.",
        },
        {
          label: "Capability match",
          value: matchesRequest
            ? "Pinned supply matches this request."
            : "Pinned supply does not match this request's requested capability kinds.",
        },
      ],
    };
  }

  if (desktopRuntimeState?.autoResolveOwnedPrivate) {
    if (desktopDefaultSupply) {
      const matchesRequest = doesTrackedSupplyMatchRequest(
        request,
        desktopDefaultSupply
      );
      const state =
        desktopRuntimeState.requestLaneReady && matchesRequest ? "current" : "pending";
      const desktopDefaultTitle =
        getTrackedSupplyLabel(desktopDefaultSupply) || "Desktop default route";

      return {
        state,
        tone: getProcessNodeTone(state, "violet"),
        title: desktopDefaultTitle,
        subtitle: matchesRequest
          ? "Desktop default route"
          : "Desktop default route needs review",
        summary: matchesRequest
          ? `${desktopDefaultTitle} is the desktop default route for private auto-resolve on this machine.`
          : `${desktopDefaultTitle} is configured on desktop, but it does not match this request's requested capability kinds.`,
        chips: compactChips([
          formatSupplyKinds(desktopDefaultSupply),
          desktopRuntimeState.requestLaneReady ? "desktop ready" : "desktop pending",
          "auto-resolve",
        ]),
        details: [
          {
            label: "Default supply",
            value: desktopDefaultSupply.id,
          },
          {
            label: "Desktop runtime",
            value: desktopRuntimeState.detail,
          },
          {
            label: "Capability match",
            value: matchesRequest
              ? "Desktop default route matches this request."
              : "Desktop default route does not match this request.",
          },
        ],
      };
    }

    if (desktopRuntimeState.autoResolveSupplyId) {
      return {
        state: "pending",
        tone: getProcessNodeTone("pending", "violet"),
        title: "Desktop default route",
        subtitle: "Configured capability unavailable",
        summary:
          "Desktop auto-resolve is enabled, but the configured default capability is not available in the current published supply set.",
        chips: compactChips(["auto-resolve", "supply unavailable"]),
        details: [
          {
            label: "Configured supply id",
            value: desktopRuntimeState.autoResolveSupplyId,
          },
          {
            label: "Desktop runtime",
            value: desktopRuntimeState.detail,
          },
        ],
      };
    }
  }

  if (desktopRuntimeState?.requestLaneReady) {
    return {
      state: desktopRuntimeState.autoResolveOwnedPrivate ? "current" : "pending",
      tone: getProcessNodeTone(
        desktopRuntimeState.autoResolveOwnedPrivate ? "current" : "pending",
        "violet"
      ),
      title: "Boreal Desktop runtime",
      subtitle: desktopRuntimeState.autoResolveOwnedPrivate
        ? "Runtime worker ready"
        : "Runtime connected",
      summary: desktopRuntimeState.detail,
      chips: compactChips([
        desktopRuntimeState.defaultModel,
        desktopRuntimeState.autoResolveOwnedPrivate ? "auto-resolve" : null,
      ]),
      details: [
        {
          label: "Desktop state",
          value: desktopRuntimeState.label,
        },
        {
          label: "Runtime detail",
          value: desktopRuntimeState.detail,
        },
        {
          label: "Model",
          value:
            desktopRuntimeState.defaultReasoning &&
            desktopRuntimeState.defaultModel
              ? `${desktopRuntimeState.defaultModel} / ${desktopRuntimeState.defaultReasoning}`
              : desktopRuntimeState.defaultModel || "No desktop default model pinned yet.",
        },
      ],
    };
  }

  return {
    state: "pending" as const,
    tone: getProcessNodeTone("pending", "violet"),
    title: "Worker selection pending",
    subtitle: "No active execution lane",
    summary:
      request.derived.routeSummary?.trim() ||
      "No live worker lane is attached yet. Boreal still needs a preferred supply, a desktop default route, or a created fulfillment.",
    chips: compactChips([
      request.derived.leadRole ? formatLabel(request.derived.leadRole) : null,
      request.derived.matchingMode ? formatLabel(request.derived.matchingMode) : null,
    ]),
    details: [
      {
        label: "Route summary",
        value:
          request.derived.routeSummary?.trim() ||
          "No route summary is attached yet.",
      },
      {
        label: "Next route input",
        value:
          request.routing.preferredSupplyId ||
          "Pin a supply or connect desktop runtime auto-resolve to attach a worker lane.",
      },
      {
        label: "Desktop runtime",
        value:
          desktopRuntimeState?.detail ||
          "Desktop runtime truth is not linked for this request yet.",
      },
    ],
  };
}

function buildTrackedDeliveryNode({
  request,
  fulfillment,
  latestArtifact,
  artifactCount,
}: {
  request: BorealRequestDraft;
  fulfillment: RequestFulfillment | null;
  latestArtifact: RequestActivityEntry["artifact"] | null;
  artifactCount: number;
}): RequestFlowProcessNode {
  const state = deriveTrackedDeliveryState({
    artifact: latestArtifact,
    fulfillmentStatus: fulfillment?.status ?? null,
    requestStatus: request.status,
  });
  const title = latestArtifact?.title?.trim()
    ? latestArtifact.title.trim()
    : request.status === "completed"
      ? "Request closed"
      : request.status === "delivered" || request.status === "waiting_for_owner"
        ? "Delivery package ready"
        : "Delivery pending";

  return {
    state,
    tone: getProcessNodeTone(state, "violet"),
    title,
    subtitle:
      request.status === "completed"
        ? "Accepted delivery"
        : request.status === "delivered" || request.status === "waiting_for_owner"
          ? "Owner review"
          : "Proof and output",
    summary:
      latestArtifact?.summary?.trim() ||
      fulfillment?.summary?.trim() ||
      request.latest.summary?.trim() ||
      "No delivery or proof package is attached yet.",
    chips: compactChips([
      latestArtifact?.kind ? formatLabel(latestArtifact.kind) : null,
      artifactCount > 0 ? `${artifactCount} artifacts` : null,
      request.derived.verificationPlan.requiredEvidenceClaims.length > 0
        ? `${request.derived.verificationPlan.requiredEvidenceClaims.length} proof`
        : null,
    ]),
    details: [
      {
        label: "Latest package",
        value:
          latestArtifact?.title ||
          request.activeRefs.latestArtifactId ||
          "No artifact is linked to this request yet.",
      },
      {
        label: "Proof required",
        value:
          request.derived.verificationPlan.requiredEvidenceClaims.length > 0
            ? request.derived.verificationPlan.requiredEvidenceClaims.map(formatLabel)
            : "No proof package required yet.",
      },
      {
        label: "Closeout state",
        value: formatLabel(request.status),
      },
    ],
  };
}

function mapTrackedFulfillmentStatus(
  fulfillmentStatus: RequestFulfillment["status"],
  requestStatus: RequestStatus
): RequestFlowNodeState {
  switch (fulfillmentStatus) {
    case "accepted":
      return "done";
    case "delivered":
      return requestStatus === "completed" ? "done" : "current";
    case "active":
    case "ready":
    case "planned":
      return "current";
    case "blocked":
      return "blocked";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return deriveRequestLifecycleState(requestStatus);
  }
}

function deriveTrackedDeliveryState({
  artifact,
  fulfillmentStatus,
  requestStatus,
}: {
  artifact: RequestActivityEntry["artifact"] | null;
  fulfillmentStatus: RequestFulfillment["status"] | null;
  requestStatus: RequestStatus;
}): RequestFlowNodeState {
  if (requestStatus === "completed") {
    return "done";
  }

  if (requestStatus === "cancelled") {
    return "cancelled";
  }

  if (requestStatus === "failed") {
    return "failed";
  }

  if (fulfillmentStatus === "blocked") {
    return "blocked";
  }

  if (
    requestStatus === "delivered" ||
    requestStatus === "waiting_for_owner" ||
    fulfillmentStatus === "delivered" ||
    Boolean(artifact)
  ) {
    return "current";
  }

  return "pending";
}

function getCurrentTrackedStep(
  fulfillment: RequestFulfillment | null
): RequestFulfillmentStep | null {
  if (!fulfillment) {
    return null;
  }

  return (
    fulfillment.steps.find((step) => step.status === "active") ??
    fulfillment.steps.find((step) => step.status === "ready") ??
    fulfillment.steps.find((step) => step.status === "todo") ??
    null
  );
}

function getLatestTrackedArtifact(activities: RequestActivityEntry[]) {
  const reversed = [...activities].reverse();

  return (
    reversed.find((activity) => activity.artifact?.kind === "delivery")?.artifact ??
    reversed.find((activity) => Boolean(activity.artifact))?.artifact ??
    null
  );
}

function getProcessNodeTone(
  state: RequestFlowNodeState,
  pendingTone: RequestFlowNodeTone
): RequestFlowNodeTone {
  switch (state) {
    case "blocked":
      return "amber";
    case "failed":
    case "cancelled":
      return "violet";
    case "done":
      return "green";
    case "current":
      return "pink";
    case "pending":
    default:
      return pendingTone;
  }
}

function getTrackedSupplyLabel(
  supply: Pick<BorealSupplyDraft, "key" | "profile"> | null | undefined
) {
  const displayName = supply?.profile.displayName?.trim();
  return displayName && displayName.length > 0
    ? displayName
    : supply?.key || null;
}

function getTrackedLeadLabel(fulfillment: RequestFulfillment) {
  return (
    fulfillment.lead.displayName?.trim() ||
    fulfillment.lead.handle?.trim() ||
    fulfillment.lead.id ||
    "No lead attached yet."
  );
}

function doesTrackedSupplyMatchRequest(
  request: Pick<BorealRequestDraft, "seeking">,
  supply: Pick<BorealSupplyDraft, "capability">
) {
  const requestedKinds = request.seeking.supplyKinds ?? [];

  if (requestedKinds.length === 0) {
    return true;
  }

  const supplyKinds = supply.capability.supplyKinds ?? [];
  return requestedKinds.some((kind) => supplyKinds.includes(kind));
}

function getStringMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function formatSupplyKinds(supply: BorealSupplyDraft) {
  return supply.capability.supplyKinds.length > 0
    ? supply.capability.supplyKinds.map(formatLabel).join(", ")
    : null;
}

function compactChips(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).slice(0, 3);
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

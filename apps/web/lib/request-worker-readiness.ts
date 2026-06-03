import {
  type NamedAgentBoardReadiness,
  type NamedAgentBoardRequest,
  buildNamedAgentBoardReadiness,
} from "./boreal-agents/board-readiness";

export type RequestHumanWorkerReadinessState =
  | "can_review"
  | "human_required"
  | "not_requested"
  | "blocked";

export type RequestHumanWorkerReadiness = {
  state: RequestHumanWorkerReadinessState;
  actionLabel: string;
  reason: string;
  proposedObject: "Commitment" | null;
  proposedWritesIfAuthorized: string[];
  nonAuthority: string[];
};

export type RequestWorkerReadiness = {
  schemaVersion: 1;
  requestId: string;
  listingMode: "read_only_no_assignment";
  humanLane: RequestHumanWorkerReadiness;
  agentLanes: NamedAgentBoardReadiness[];
  summary: {
    agentCanPrepareCount: number;
    humanActionable: boolean;
    humanRequired: boolean;
    shouldWakeAgents: boolean;
  };
  nonAuthority: string[];
};

const workerReadinessNonAuthority = [
  "not_matching_or_assignment",
  "no_commitment_created",
  "no_fulfillment_started",
  "no_provider_call",
  "no_request_event_written",
];

export function buildRequestWorkerReadiness(
  request: NamedAgentBoardRequest
): RequestWorkerReadiness {
  const agentLanes = buildNamedAgentBoardReadiness(request);
  const humanLane = buildHumanWorkerReadiness(request);
  const agentCanPrepareCount = agentLanes.filter(
    (lane) => lane.readiness === "can_prepare"
  ).length;
  const humanRequired = humanLane.state === "human_required";

  return {
    schemaVersion: 1,
    requestId: request.id,
    listingMode: "read_only_no_assignment",
    humanLane,
    agentLanes,
    summary: {
      agentCanPrepareCount,
      humanActionable:
        humanLane.state === "can_review" || humanLane.state === "human_required",
      humanRequired,
      shouldWakeAgents: !humanRequired && agentCanPrepareCount > 0,
    },
    nonAuthority: [...workerReadinessNonAuthority],
  };
}

function buildHumanWorkerReadiness(
  request: NamedAgentBoardRequest
): RequestHumanWorkerReadiness {
  if (request.status !== "open") {
    return humanLane({
      state: "blocked",
      actionLabel: "Closed to workers",
      reason: "Request is not open, so humans should not apply from the public board.",
    });
  }

  if (hasHumanOrLocalSignal(request)) {
    return humanLane({
      state: "human_required",
      actionLabel: "Human lane needed",
      reason:
        "The request asks for human presence, local access, or human-led execution.",
      proposedObject: "Commitment",
      proposedWritesIfAuthorized: ["Commitment", "RequestEvent"],
    });
  }

  if (hasHumanActorSignal(request)) {
    return humanLane({
      state: "can_review",
      actionLabel: "Human can apply",
      reason:
        "The request is open to human workers, but no worker is assigned from the listing.",
      proposedObject: "Commitment",
      proposedWritesIfAuthorized: ["Commitment", "RequestEvent"],
    });
  }

  return humanLane({
    state: "not_requested",
    actionLabel: "No human lane",
    reason: "The request currently points to agent, provider, or tool execution.",
  });
}

function humanLane({
  actionLabel,
  proposedObject = null,
  proposedWritesIfAuthorized = [],
  reason,
  state,
}: {
  actionLabel: string;
  proposedObject?: "Commitment" | null;
  proposedWritesIfAuthorized?: string[];
  reason: string;
  state: RequestHumanWorkerReadinessState;
}): RequestHumanWorkerReadiness {
  return {
    state,
    actionLabel,
    reason,
    proposedObject,
    proposedWritesIfAuthorized,
    nonAuthority: [...workerReadinessNonAuthority],
  };
}

function hasHumanActorSignal(request: NamedAgentBoardRequest) {
  const actorKinds = request.seeking?.actorKinds ?? [];

  return actorKinds.some((kind) => hasToken(kind, ["human"]));
}

function hasHumanOrLocalSignal(request: NamedAgentBoardRequest) {
  const executionKind = request.derived?.executionKind ?? "";
  const constraints = request.brief.constraints ?? {};
  const text = normalizeSignalText([
    request.seeking?.notes,
    request.derived?.routeSummary,
    executionKind,
  ]);

  return (
    hasToken(executionKind, ["human", "field", "local", "embodied"]) ||
    text.includes("onsite") ||
    text.includes("on-site") ||
    text.includes("local access") ||
    text.includes("human presence") ||
    constraints.requiresHumanPresence === true ||
    constraints.requiresLocalAccess === true
  );
}

function normalizeSignalText(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function hasToken(value: string, tokens: string[]) {
  const normalized = value.toLowerCase().replace(/[-\s]+/g, "_");

  return tokens.some((token) => normalized.includes(token));
}

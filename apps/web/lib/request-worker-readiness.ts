import {
  type NamedAgentBoardReadiness,
  type NamedAgentBoardRequest,
  buildNamedAgentBoardReadiness,
} from "./boreal-agents/board-readiness";
import { requiresHumanOrLocalWorker } from "./boreal-agents/request-qualification";

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
  applicationPreflight: RequestHumanApplicationPreflight | null;
  nonAuthority: string[];
};

export type RequestHumanApplicationPreflight = {
  endpoint: "/agents/actions/preflight";
  actionId: "apply_to_request";
  requiredBeforeMutation: true;
  proposedObject: "Commitment";
  proposedCanonicalWrites: ["Commitment", "RequestEvent"];
  requiredInput: {
    representedActorKind: "human";
    hasHumanApproval: true;
    hasIdempotencyKey: true;
    requestedScopes: ["commitments:propose"];
    payloadSummaryRequired: true;
  };
  forbiddenClaimsBeforeAuthorizedMutation: string[];
  nonAuthority: string;
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
  "no_supply_assigned",
  "no_commitment_created",
  "no_fulfillment_started",
  "no_provider_call",
  "no_payment_authorized",
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
      applicationPreflight: buildHumanApplicationPreflight(),
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
      applicationPreflight: buildHumanApplicationPreflight(),
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
  applicationPreflight = null,
  proposedObject = null,
  proposedWritesIfAuthorized = [],
  reason,
  state,
}: {
  actionLabel: string;
  applicationPreflight?: RequestHumanApplicationPreflight | null;
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
    applicationPreflight,
    nonAuthority: [...workerReadinessNonAuthority],
  };
}

function buildHumanApplicationPreflight(): RequestHumanApplicationPreflight {
  return {
    endpoint: "/agents/actions/preflight",
    actionId: "apply_to_request",
    requiredBeforeMutation: true,
    proposedObject: "Commitment",
    proposedCanonicalWrites: ["Commitment", "RequestEvent"],
    requiredInput: {
      representedActorKind: "human",
      hasHumanApproval: true,
      hasIdempotencyKey: true,
      requestedScopes: ["commitments:propose"],
      payloadSummaryRequired: true,
    },
    forbiddenClaimsBeforeAuthorizedMutation: [
      "worker assigned",
      "commitment created",
      "fulfillment started",
      "artifact published",
      "payment authorized",
      "request completed",
    ],
    nonAuthority:
      "Human lane readiness is a board hint only. Run action preflight and submit through the governed commitment route before any durable write.",
  };
}

function hasHumanActorSignal(request: NamedAgentBoardRequest) {
  const actorKinds = request.seeking?.actorKinds ?? [];

  return actorKinds.some((kind) => hasToken(kind, ["human"]));
}

function hasHumanOrLocalSignal(request: NamedAgentBoardRequest) {
  return requiresHumanOrLocalWorker(request, {
    includeHumanActorKind: false,
  });
}

function hasToken(value: string, tokens: string[]) {
  const normalized = value.toLowerCase().replace(/[-\s]+/g, "_");

  return tokens.some((token) => normalized.includes(token));
}

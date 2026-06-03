import {
  type BorealAgentStatus,
  type BorealAgentTemplate,
  listBorealAgentTemplates,
} from "./registry";

export type NamedAgentBoardReadinessState =
  | "can_prepare"
  | "skip"
  | "target_only";

export type NamedAgentBoardRequest = {
  id: string;
  status: string;
  brief: {
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    constraints?: Record<string, unknown> | null;
    outputKinds?: readonly string[] | null;
  };
  seeking?: {
    actorKinds?: readonly string[] | null;
    supplyKinds?: readonly string[] | null;
    notes?: string | null;
  } | null;
  derived?: {
    executionKind?: string | null;
    routeSummary?: string | null;
  } | null;
};

export type NamedAgentBoardReadiness = {
  agentKey: string;
  displayName: string;
  status: BorealAgentStatus;
  apiRoute: string;
  workerKey: string;
  supplyKind: string;
  readiness: NamedAgentBoardReadinessState;
  reason: string;
  actionLabel: string;
  proposedObject: "Commitment" | "Fulfillment" | null;
  proposedWritesIfAuthorized: string[];
  nonAuthority: string[];
};

const boardNonAuthority = [
  "not_matching_or_assignment",
  "no_commitment_created",
  "no_fulfillment_started",
  "no_provider_call",
  "no_request_event_written",
];

const videoTextSignals = [
  "video",
  "teaser",
  "clip",
  "reel",
  "footage",
  "render",
];

export function buildNamedAgentBoardReadiness(
  request: NamedAgentBoardRequest
): NamedAgentBoardReadiness[] {
  return listBorealAgentTemplates().map((template) =>
    buildTemplateBoardReadiness({ request, template })
  );
}

function buildTemplateBoardReadiness({
  request,
  template,
}: {
  request: NamedAgentBoardRequest;
  template: BorealAgentTemplate;
}): NamedAgentBoardReadiness {
  if (template.status === "target_template") {
    return boardHint({
      readiness: "target_only",
      reason: "Target-only until this worker supply and proof path are live.",
      actionLabel: "Target only",
      request,
      template,
    });
  }

  if (request.status !== "open") {
    return boardHint({
      readiness: "skip",
      reason: "Request is not open, so public scanning should not wake an agent.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  if (template.agentKey === "mira-video") {
    return buildMiraBoardReadiness({ request, template });
  }

  return boardHint({
    readiness: "skip",
    reason: "No public-board readiness rule is registered for this live template.",
    actionLabel: "Skip request",
    request,
    template,
  });
}

function buildMiraBoardReadiness({
  request,
  template,
}: {
  request: NamedAgentBoardRequest;
  template: BorealAgentTemplate;
}) {
  if (hasHumanOrLocalSignal(request)) {
    return boardHint({
      readiness: "skip",
      reason:
        "Public projection points to human-led or local-access execution; provider-only agents must skip.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  if (!hasVideoSignal(request)) {
    return boardHint({
      readiness: "skip",
      reason: "No public video-generation signal is present for this agent.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  return boardHint({
    readiness: "can_prepare",
    reason:
      "Mira can prepare a governed application packet; the target route still owns auth and idempotency.",
    actionLabel: "Prepare application packet",
    request,
    template,
    proposedObject: "Commitment",
    proposedWritesIfAuthorized: ["Commitment", "RequestEvent"],
  });
}

function boardHint({
  actionLabel,
  proposedObject = null,
  proposedWritesIfAuthorized = [],
  readiness,
  reason,
  template,
}: {
  actionLabel: string;
  proposedObject?: "Commitment" | "Fulfillment" | null;
  proposedWritesIfAuthorized?: string[];
  readiness: NamedAgentBoardReadinessState;
  reason: string;
  request: NamedAgentBoardRequest;
  template: BorealAgentTemplate;
}): NamedAgentBoardReadiness {
  return {
    agentKey: template.agentKey,
    displayName: template.displayName,
    status: template.status,
    apiRoute: template.apiRoute,
    workerKey: template.workerKey,
    supplyKind: template.supplyBinding.supplyKind,
    readiness,
    reason,
    actionLabel,
    proposedObject,
    proposedWritesIfAuthorized,
    nonAuthority: [...boardNonAuthority],
  };
}

function hasVideoSignal(request: NamedAgentBoardRequest) {
  const outputKinds = request.brief.outputKinds ?? [];
  const supplyKinds = request.seeking?.supplyKinds ?? [];
  const text = normalizeSignalText([
    request.brief.title,
    request.brief.summary,
    request.brief.body,
    request.derived?.routeSummary,
  ]);

  return (
    outputKinds.some((kind) => hasToken(kind, ["video", "media"])) ||
    supplyKinds.some((kind) => hasToken(kind, ["video_generation"])) ||
    videoTextSignals.some((signal) => text.includes(signal))
  );
}

function hasHumanOrLocalSignal(request: NamedAgentBoardRequest) {
  const actorKinds = request.seeking?.actorKinds ?? [];
  const executionKind = request.derived?.executionKind ?? "";
  const constraints = request.brief.constraints ?? {};
  const text = normalizeSignalText([
    request.seeking?.notes,
    request.derived?.routeSummary,
    executionKind,
  ]);

  return (
    actorKinds.some((kind) => hasToken(kind, ["human"])) ||
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

import {
  type BorealAgentStatus,
  type BorealAgentTemplate,
  listBorealAgentTemplates,
} from "./registry";
import { requiresHumanOrLocalWorker } from "./request-qualification";

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
    workerEligibility?: {
      policy?: string | null;
      shouldWakeAgents?: boolean;
      wakeSignals?: readonly string[] | null;
    } | null;
  } | null;
};

export type NamedAgentBoardReadiness = {
  agentKey: string;
  displayName: string;
  status: BorealAgentStatus;
  apiRoute: string;
  workerKey: string;
  supplyKind: string;
  promotionState: BorealAgentTemplate["promotionGates"]["state"];
  promotionBlockers: string[];
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

const humanizerTextSignals = [
  "humanize",
  "humanizer",
  "rewrite",
  "polish",
  "copy",
  "editorial",
  "tone",
  "plain language",
  "make this clearer",
  "make it sound human",
  "launch copy",
  "website copy",
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
    const blockers = template.promotionGates.openBlockers;
    return boardHint({
      readiness: "target_only",
      reason:
        blockers.length > 0
          ? `Target-only: ${blockers[0]}.`
          : "Target-only until this worker supply and proof path are live.",
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

  if (template.agentKey === "tala-humanizer") {
    return buildTalaBoardReadiness({ request, template });
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
  if (hasHumanOrLocalSignal(request) && !hasPlannerAgentSupport(request)) {
    return boardHint({
      readiness: "skip",
      reason:
        "Public projection points to human-led or local-access execution; provider-only agents must skip.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  if (hasPlannerAgentSkip(request)) {
    return boardHint({
      readiness: "skip",
      reason:
        "Planner worker eligibility does not wake named agents for this request.",
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

function buildTalaBoardReadiness({
  request,
  template,
}: {
  request: NamedAgentBoardRequest;
  template: BorealAgentTemplate;
}) {
  if (hasHumanOrLocalSignal(request) && !hasPlannerAgentSupport(request)) {
    return boardHint({
      readiness: "skip",
      reason:
        "Public projection points to human-led or local-access execution; the humanizer worker must skip.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  if (hasPlannerAgentSkip(request)) {
    return boardHint({
      readiness: "skip",
      reason:
        "Planner worker eligibility does not wake named agents for this request.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  if (hasVideoSignal(request)) {
    return boardHint({
      readiness: "skip",
      reason:
        "Request points to media generation; the humanizer worker should not wake.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  if (!hasHumanizerSignal(request)) {
    return boardHint({
      readiness: "skip",
      reason: "No public text-polish or documentation-support signal is present for this agent.",
      actionLabel: "Skip request",
      request,
      template,
    });
  }

  return boardHint({
    readiness: "can_prepare",
    reason:
      "Tala can prepare a governed text-polish application packet; the mutation route still owns auth and idempotency.",
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
    promotionState: template.promotionGates.state,
    promotionBlockers: [...template.promotionGates.openBlockers],
    readiness,
    reason,
    actionLabel,
    proposedObject,
    proposedWritesIfAuthorized,
    nonAuthority: [...boardNonAuthority],
  };
}

function hasHumanizerSignal(request: NamedAgentBoardRequest) {
  const outputKinds = request.brief.outputKinds ?? [];
  const supplyKinds = request.seeking?.supplyKinds ?? [];
  const wakeSignals = request.derived?.workerEligibility?.wakeSignals ?? [];
  const text = normalizeSignalText([
    request.brief.title,
    request.brief.summary,
    request.brief.body,
    request.derived?.routeSummary,
  ]);

  return (
    outputKinds.some((kind) =>
      hasToken(kind, ["draft", "handoff_doc", "verification_note", "text"])
    ) ||
    supplyKinds.some((kind) =>
      hasToken(kind, ["documentation_support", "reporting_support"])
    ) ||
    wakeSignals.some((signal) =>
      hasToken(signal, ["documentation_support", "draft"])
    ) ||
    humanizerTextSignals.some((signal) => text.includes(signal))
  );
}

function hasVideoSignal(request: NamedAgentBoardRequest) {
  const outputKinds = request.brief.outputKinds ?? [];
  const supplyKinds = request.seeking?.supplyKinds ?? [];
  const wakeSignals = request.derived?.workerEligibility?.wakeSignals ?? [];
  const text = normalizeSignalText([
    request.brief.title,
    request.brief.summary,
    request.brief.body,
    request.derived?.routeSummary,
  ]);

  return (
    outputKinds.some((kind) => hasToken(kind, ["video", "media"])) ||
    supplyKinds.some((kind) => hasToken(kind, ["video_generation"])) ||
    wakeSignals.some((signal) =>
      hasToken(signal, ["video_generation", "video"])
    ) ||
    videoTextSignals.some((signal) => text.includes(signal))
  );
}

function hasHumanOrLocalSignal(request: NamedAgentBoardRequest) {
  return requiresHumanOrLocalWorker(request, {
    includeHumanActorKind: true,
  });
}

function hasPlannerAgentSkip(request: NamedAgentBoardRequest) {
  return request.derived?.workerEligibility?.shouldWakeAgents === false;
}

function hasPlannerAgentSupport(request: NamedAgentBoardRequest) {
  const workerEligibility = request.derived?.workerEligibility;

  return (
    workerEligibility?.shouldWakeAgents === true &&
    workerEligibility.policy === "human_first_agent_support"
  );
}

function normalizeSignalText(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function hasToken(value: string, tokens: string[]) {
  const normalized = value.toLowerCase().replace(/[-\s]+/g, "_");

  return tokens.some((token) => normalized.includes(token));
}

import type { BorealRequestDraft, RequestPhaseKey } from "./request";

export type RequestPathSignalTone = "good" | "warn" | "danger" | "neutral";

export type RequestPathSignal = {
  label: string;
  value: string;
  detail: string;
  tone: RequestPathSignalTone;
};

export type RequestSupportingPath = {
  title: string;
  source: string;
  status: string;
  summary: string;
};

export type RequestBaselinePath = {
  title: string;
  sourceLabel: string;
  statusLabel: string;
  summary: string;
  stepCount: number;
  laneCount: number;
};

export type RequestPathBuilderViewModel = {
  baselinePath: RequestBaselinePath;
  canOpenRequest: boolean;
  hasPathContent: boolean;
  signals: RequestPathSignal[];
  supportingPaths: RequestSupportingPath[];
};

export function buildRequestPathBuilderViewModel({
  request,
  scope,
}: {
  request: BorealRequestDraft;
  scope: "draft" | "open";
}): RequestPathBuilderViewModel {
  const stepCount = Math.max(getRequestPathStepCount(request), 1);
  const laneCount = Math.max(request.derived.roleSlots.length, 1);
  const canOpenRequest =
    scope === "draft" && request.derived.readiness.readyForOpen;

  return {
    baselinePath: {
      title: request.brief.title?.trim() || "Baseline path",
      sourceLabel: "Boreal baseline",
      statusLabel:
        scope === "open"
          ? "request-open"
          : canOpenRequest
            ? "execution-ready"
            : "proposal",
      summary: getBaselinePathSummary(request, stepCount, laneCount),
      stepCount,
      laneCount,
    },
    canOpenRequest,
    hasPathContent: hasRequestPathContent(request),
    signals: getPathSignals(request),
    supportingPaths: getSupportingPathSlots(request),
  };
}

function hasRequestPathContent(request: BorealRequestDraft) {
  const hasBrief = Boolean(
    request.brief.body?.trim() ||
      request.brief.summary?.trim() ||
      request.brief.title?.trim()
  );

  return (
    hasBrief ||
    request.derived.phases.length > 0 ||
    request.derived.roleSlots.length > 0 ||
    request.derived.outcomeClaims.length > 0
  );
}

function getBaselinePathSummary(
  request: BorealRequestDraft,
  stepCount: number,
  laneCount: number
) {
  const location = request.derived.embodiedConstraintSet.serviceLocation?.trim();

  if (request.derived.embodiedConstraintSet.requiresEmbodiedHandling) {
    if (location) {
      return `Boreal mapped a baseline path for real-world work in ${location}. The Request keeps local execution, proof, and review inside one thread.`;
    }

    return "Boreal mapped a baseline path for real-world work. The Request keeps execution, proof, and review inside one thread.";
  }

  if (stepCount > 1) {
    return `Boreal mapped this baseline path into ${stepCount} steps that affect execution, proof, or delivery${laneCount > 0 ? `, with ${laneCount} capability lane${laneCount === 1 ? "" : "s"}` : ""}.`;
  }

  return "Boreal understands the ask and is showing a baseline path from request to delivery. Edit the brief if the outcome or constraints are wrong.";
}

function getRequestPathStepCount(request: BorealRequestDraft) {
  if (request.derived.phases.length > 0) {
    return request.derived.phases.length;
  }

  return buildFallbackPathPhases(request).length;
}

function buildFallbackPathPhases(
  request: BorealRequestDraft
): BorealRequestDraft["derived"]["phases"] {
  const fallbackPhases: BorealRequestDraft["derived"]["phases"] = [];

  if (request.derived.clarificationNeeded.required) {
    fallbackPhases.push({
      phaseKey: "clarify_constraints",
      title: "Lock the missing work details",
      summary:
        "Boreal still needs a few execution-critical details before the request is ready to route cleanly.",
      roleKeys: request.derived.leadRole ? [request.derived.leadRole] : [],
      requiredEvidenceClaims: [],
    });
  }

  if (request.derived.embodiedConstraintSet.requiresEmbodiedHandling) {
    fallbackPhases.push({
      phaseKey: "onsite_execution",
      title: "Complete the local verification work",
      summary:
        "Handle the real-world visit, verification, and evidence capture inside the same request thread.",
      roleKeys:
        request.derived.roleSlots.length > 0
          ? request.derived.roleSlots
              .filter((roleSlot) => roleSlot.required)
              .map((roleSlot) => roleSlot.roleKey)
          : request.derived.leadRole
            ? [request.derived.leadRole]
            : [],
      requiredEvidenceClaims: [],
    });
  }

  if (request.derived.verificationPlan.requiredEvidenceClaims.length > 0) {
    fallbackPhases.push({
      phaseKey: "proof_delivery",
      title: "Publish proof and final delivery",
      summary:
        "Attach the proof-bearing delivery package so review and closure stay truthful.",
      roleKeys:
        request.derived.roleSlots.length > 0
          ? request.derived.roleSlots.map((roleSlot) => roleSlot.roleKey)
          : request.derived.leadRole
            ? [request.derived.leadRole]
            : [],
      requiredEvidenceClaims:
        request.derived.verificationPlan.requiredEvidenceClaims,
    });
  }

  if (fallbackPhases.length === 0 && request.brief.body?.trim()) {
    fallbackPhases.push({
      phaseKey: "execute_delivery",
      title: "Complete the requested work",
      summary:
        "Boreal has the ask, but the path has not yet expanded into richer phases.",
      roleKeys: request.derived.leadRole ? [request.derived.leadRole] : [],
      requiredEvidenceClaims: [],
    });
  }

  return fallbackPhases;
}

function getPathSignals(request: BorealRequestDraft): RequestPathSignal[] {
  return [
    getFeasibilitySignal(request),
    getRiskSignal(request),
    getProofReadinessSignal(request),
    getHumanWorkSignal(request),
    getClarificationSignal(request),
  ];
}

function getFeasibilitySignal(request: BorealRequestDraft): RequestPathSignal {
  if (request.derived.readiness.readyForOpen) {
    return {
      label: "Feasibility",
      value: "Good",
      detail: "Enough structure exists to open the request.",
      tone: "good",
    };
  }

  if (
    request.derived.missingDetails.includes("title") ||
    request.derived.missingDetails.includes("body")
  ) {
    return {
      label: "Feasibility",
      value: "Blocked",
      detail: "Core request text is still missing.",
      tone: "danger",
    };
  }

  if (request.derived.planCollapseRisk.riskLevel === "high") {
    return {
      label: "Feasibility",
      value: "Weak",
      detail: "This path may fail without more detail.",
      tone: "danger",
    };
  }

  return {
    label: "Feasibility",
    value: "Unclear",
    detail: "The path needs more inputs before routing.",
    tone: "warn",
  };
}

function getRiskSignal(request: BorealRequestDraft): RequestPathSignal {
  const riskLevel = request.derived.planCollapseRisk.riskLevel;

  return {
    label: "Risk",
    value: formatLabel(riskLevel),
    detail:
      request.derived.planCollapseRisk.reasons[0] ??
      "No high-risk collapse reason is currently attached.",
    tone:
      riskLevel === "high"
        ? "danger"
        : riskLevel === "moderate"
          ? "warn"
          : "good",
  };
}

function getProofReadinessSignal(
  request: BorealRequestDraft
): RequestPathSignal {
  const verificationMissing =
    request.derived.clarificationNeeded.missingDetails.includes(
      "verification_requirements"
    );
  const proofCount =
    request.derived.verificationPlan.requiredArtifactKinds.length +
    request.derived.verificationPlan.requiredEvidenceClaims.length +
    (request.derived.verificationPlan.mustHaveLocationSignal ? 1 : 0) +
    (request.derived.verificationPlan.mustHaveOwnerAcceptance ? 1 : 0) +
    (request.derived.verificationPlan.mustHaveSignature ? 1 : 0);

  if (verificationMissing) {
    return {
      label: "Proof",
      value: "Missing",
      detail: "Proof is not defined yet.",
      tone: "danger",
    };
  }

  if (proofCount > 0) {
    return {
      label: "Proof",
      value: request.derived.readiness.readyForOpen ? "Ready" : "Partial",
      detail: `${proofCount} proof ${proofCount === 1 ? "signal" : "signals"} captured.`,
      tone: request.derived.readiness.readyForOpen ? "good" : "warn",
    };
  }

  return {
    label: "Proof",
    value: "Partial",
    detail: "No special proof package is defined yet.",
    tone: "neutral",
  };
}

function getHumanWorkSignal(request: BorealRequestDraft): RequestPathSignal {
  const executionModes = request.derived.executionProfile.executionModes;
  const hasRemoteMode = executionModes.some((mode) =>
    /remote|digital/.test(mode)
  );
  const hasLocalMode =
    request.derived.embodiedConstraintSet.requiresEmbodiedHandling ||
    request.derived.executionProfile.requiresHumanPresence ||
    request.derived.executionProfile.requiresLocalAccess;

  if (hasLocalMode && hasRemoteMode) {
    return {
      label: "Human work",
      value: "Mixed",
      detail: "This path combines local or manual work with remote coordination.",
      tone: "warn",
    };
  }

  if (hasLocalMode) {
    return {
      label: "Human work",
      value: "Onsite",
      detail: "This path requires human or local action.",
      tone: "warn",
    };
  }

  if (hasRemoteMode) {
    return {
      label: "Human work",
      value: "Remote",
      detail: "This path can stay in a remote digital lane.",
      tone: "good",
    };
  }

  return {
    label: "Human work",
    value: "None",
    detail: "No manual or onsite work is currently detected.",
    tone: "neutral",
  };
}

function getClarificationSignal(request: BorealRequestDraft): RequestPathSignal {
  if (request.derived.clarificationNeeded.required) {
    return {
      label: "Clarification",
      value: "Needed",
      detail: `${request.derived.clarificationNeeded.missingDetails.length} input ${request.derived.clarificationNeeded.missingDetails.length === 1 ? "is" : "are"} still missing.`,
      tone: "warn",
    };
  }

  if (request.derived.missingDetails.length > 0) {
    return {
      label: "Clarification",
      value: "Optional",
      detail: "Some details can still improve matching.",
      tone: "neutral",
    };
  }

  return {
    label: "Clarification",
    value: "Not needed",
    detail: "No route-blocking question is currently open.",
    tone: "good",
  };
}

function getSupportingPathSlots(
  request: BorealRequestDraft
): RequestSupportingPath[] {
  const topLeadCandidateSummary = getTopLeadCandidateSummary(request);
  const serviceSlot = topLeadCandidateSummary
    ? {
        title: "Service or supply path",
        source: "supply",
        status: "candidate",
        summary: topLeadCandidateSummary,
      }
    : {
        title: "Service or supply path",
        source: "supply",
        status: request.routing.preferredSupplyId ? "pinned" : "preview",
        summary: request.routing.preferredSupplyId
          ? "Pinned supply narrows the route. It still needs approval, proof, funding, and safety gates."
          : "Attach a service or supply when a grounded route exists.",
      };

  return [
    {
      title: "Human path",
      source: "human",
      status: "preview",
      summary:
        "Invite a reviewer or operator to propose another way to complete this request.",
    },
    {
      title: "Agent path",
      source: "agent",
      status: "preview",
      summary:
        "Ask another agent for a supporting path without treating it as assigned work.",
    },
    serviceSlot,
    {
      title: "Workflow path",
      source: "template",
      status: "future",
      summary:
        "Reusable workflow paths can attach later without becoming a new root object.",
    },
  ];
}

function getTopLeadCandidateSummary(request: BorealRequestDraft) {
  return (
    request.derived.leadRanking.find((entry) => Boolean(entry.supplyId))
      ?.summary ??
    request.derived.leadRanking[0]?.summary ??
    null
  );
}

export function describeMissingPathDetail(detail: string) {
  switch (detail) {
    case "execution_modes":
      return {
        label: "Execution mode",
        detail:
          "Say if this should run onsite, remote, or hybrid so Boreal can route it correctly.",
      };
    case "access_requirements":
      return {
        label: "Access details",
        detail:
          "Add venue, organizer access, booking context, or other local access details needed to do the work.",
      };
    case "service_location":
      return {
        label: "Exact location",
        detail:
          "Add the city, venue, or service area where the work needs to happen.",
      };
    case "time_windows":
      return {
        label: "Time window",
        detail: "Add the actual schedule window or target timing for the work.",
      };
    case "verification_requirements":
      return {
        label: "Success proof",
        detail:
          "Say what evidence or completion proof should be delivered back to the request.",
      };
    default:
      return {
        label: formatLabel(detail),
        detail: "Add this missing request detail before opening the request.",
      };
  }
}

export function getRequestPathFallbackPhases(request: BorealRequestDraft) {
  return buildFallbackPathPhases(request);
}

export function getRequestPathPhaseStatusLabel(phaseKey: RequestPhaseKey) {
  switch (phaseKey) {
    case "clarify_constraints":
      return "needed now";
    case "proof_delivery":
    case "handoff_review":
      return "final";
    default:
      return "next";
  }
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

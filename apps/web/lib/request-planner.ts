import type {
  BorealRequestDraft,
  RequestActorKind,
  RequestArtifactKind,
  RequestClarificationNeeded,
  RequestEmbodiedConstraintSet,
  RequestExecutionMode,
  RequestExecutionProfile,
  RequestNamedAgentCandidateHint,
  RequestPhasePlan,
  RequestPlanCollapseRisk,
  RequestRoleSlot,
  RequestTeamMode,
  RequestVerificationPlan,
  RequestWorkerEligibility,
} from "./request";
import type {
  BorealOutputKind,
  BorealRequestEvidenceClaim,
  BorealRequestExecutionKind,
  BorealRequestMatchingMode,
  BorealRequestPhaseKey,
  BorealRequestRoleKey,
  BorealRequestRouteFamily,
  BorealSupplyKind,
} from "./matching-fingerprints";
import {
  borealActorKinds,
  borealOutputKinds,
  borealRequestEvidenceClaims,
  borealRequestExecutionKinds,
  borealRequestExecutionModes,
  borealSupplyKinds,
  borealRequestRoleKeys,
  normalizeFingerprintArray,
  normalizeFingerprintValue,
} from "./matching-fingerprints";
import {
  listBorealAgentTemplates,
  type BorealAgentTemplate,
} from "./boreal-agents/registry";
import type { BorealSupplyDraft } from "./supply";

export type RequestOutcomeClaim = {
  claimKey: string;
  summary: string;
  source: "brief" | "output_kind" | "execution" | "verification";
  nonSubstitutable: boolean;
  proofRequired: boolean;
};

export type RequestPlannerConfidence = "low" | "moderate" | "high";

export type RequestMatchCandidateRoleScore = {
  roleKey: BorealRequestRoleKey;
  score: number;
  confidence: RequestPlannerConfidence;
};

export type RequestMatchCandidate = {
  supplyId: string;
  source: "retrieved" | "preferred_supply";
  overallScore: number;
  leadScore: number;
  roleScores: RequestMatchCandidateRoleScore[];
  summary: string;
};

export type RequestPlannerMatchSource =
  | "planner"
  | "candidate_pool"
  | "preferred_supply"
  | "fulfillment";

export type RequestPlannerMatchStatus =
  | "open"
  | "candidate"
  | "selected"
  | "attached";

export type RequestLeadRankingEntry = {
  roleKey: BorealRequestRoleKey;
  supplyId?: string;
  source: RequestPlannerMatchSource;
  status: RequestPlannerMatchStatus;
  confidence: RequestPlannerConfidence;
  summary: string;
};

export type RequestRoleMatch = {
  roleKey: BorealRequestRoleKey;
  required: boolean;
  supplyId?: string;
  source: RequestPlannerMatchSource;
  status: RequestPlannerMatchStatus;
  confidence: RequestPlannerConfidence;
  summary: string;
};

export type RequestAssignmentProposal = {
  state:
    | "unfilled"
    | "candidate_pool"
    | "selected_supply"
    | "execution_attached";
  summary: string;
  lead: RequestRoleMatch | null;
  support: RequestRoleMatch[];
};

export type RequestPlannerState = {
  leadRole?: BorealRequestRoleKey;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
  executionProfile: RequestExecutionProfile;
  embodiedConstraintSet: RequestEmbodiedConstraintSet;
  verificationPlan: RequestVerificationPlan;
  planCollapseRisk: RequestPlanCollapseRisk;
  clarificationNeeded: RequestClarificationNeeded;
  outcomeClaims: RequestOutcomeClaim[];
  matchCandidates: RequestMatchCandidate[];
  leadRanking: RequestLeadRankingEntry[];
  roleMatches: RequestRoleMatch[];
  workerEligibility: RequestWorkerEligibility;
  assignmentProposal: RequestAssignmentProposal;
  replanReasons: string[];
  embodiedSummary: string;
};

export function deriveRequestPlannerState(
  draft: Pick<
    BorealRequestDraft,
    "brief" | "seeking" | "routing" | "activeRefs" | "derived"
  >,
): RequestPlannerState {
  const embodiedPlanning = deriveEmbodiedPlanningState(draft);
  const structuralPlanning = deriveStructuralPlanningState(
    draft,
    embodiedPlanning,
  );
  const outcomeClaims = deriveOutcomeClaims({
    brief: draft.brief,
    embodiedPlanning,
  });
  const preferredSupplyRouteSelected = isPreferredSupplyRouteSelected({
    candidatePool: draft.derived.candidatePool ?? [],
    matchCandidates: draft.derived.matchCandidates ?? [],
    matchingMode: draft.derived.matchingMode,
    preferredSupplyId: normalizeText(draft.routing.preferredSupplyId),
    routeFamily: draft.derived.routeFamily,
    routeSummary: normalizeText(draft.derived.routeSummary),
  });
  const matchCandidates = normalizeMatchCandidates(
    draft.derived.matchCandidates ?? [],
  );
  const leadRanking = deriveLeadRanking({
    candidatePool: draft.derived.candidatePool ?? [],
    matchCandidates,
    leadRole: structuralPlanning.leadRole,
    preferredSupplyId: normalizeText(draft.routing.preferredSupplyId),
    hasActiveFulfillment: hasText(draft.activeRefs.activeFulfillmentId),
    preferredSupplyRouteSelected,
  });
  const roleMatches = deriveRoleMatches({
    candidatePool: draft.derived.candidatePool ?? [],
    matchCandidates,
    leadRole: structuralPlanning.leadRole,
    preferredSupplyId: normalizeText(draft.routing.preferredSupplyId),
    roleSlots: structuralPlanning.roleSlots,
    hasActiveFulfillment: hasText(draft.activeRefs.activeFulfillmentId),
    preferredSupplyRouteSelected,
  });
  const assignmentProposal = deriveAssignmentProposal({
    preferredSupplyId: normalizeText(draft.routing.preferredSupplyId),
    roleMatches,
    hasActiveFulfillment: hasText(draft.activeRefs.activeFulfillmentId),
    preferredSupplyRouteSelected,
  });
  const replanReasons = deriveReplanReasons({
    assignmentProposal,
    clarificationNeeded: embodiedPlanning.clarificationNeeded,
    roleMatches,
  });
  const workerEligibility = deriveWorkerEligibility({
    draft,
    embodiedPlanning,
    structuralPlanning,
  });

  return {
    leadRole: structuralPlanning.leadRole,
    roleSlots: structuralPlanning.roleSlots,
    phases: structuralPlanning.phases,
    noMicrotaskExplosion: structuralPlanning.noMicrotaskExplosion,
    executionProfile: embodiedPlanning.executionProfile,
    embodiedConstraintSet: embodiedPlanning.embodiedConstraintSet,
    verificationPlan: embodiedPlanning.verificationPlan,
    planCollapseRisk: embodiedPlanning.planCollapseRisk,
    clarificationNeeded: embodiedPlanning.clarificationNeeded,
    outcomeClaims,
    matchCandidates,
    leadRanking,
    roleMatches,
    workerEligibility,
    assignmentProposal,
    replanReasons,
    embodiedSummary: embodiedPlanning.summary,
  };
}

function deriveEmbodiedPlanningState(
  draft: Pick<BorealRequestDraft, "brief">,
): {
  missingDetails: string[];
  summary: string;
  executionProfile: RequestExecutionProfile;
  embodiedConstraintSet: RequestEmbodiedConstraintSet;
  verificationPlan: RequestVerificationPlan;
  planCollapseRisk: RequestPlanCollapseRisk;
  clarificationNeeded: RequestClarificationNeeded;
} {
  const constraints = normalizeRecord(draft.brief.constraints);
  const requestText = [draft.brief.title, draft.brief.summary, draft.brief.body]
    .filter(Boolean)
    .join("\n");
  const executionModes = normalizeExecutionModes(
    getConstraintStringArray(constraints, "executionModes"),
  );
  const requiresHumanPresence = getConstraintBoolean(
    constraints,
    "requiresHumanPresence",
  );
  const requiresLocalAccess = getConstraintBoolean(
    constraints,
    "requiresLocalAccess",
  );
  const requiresVerifiedEvidence = getConstraintBoolean(
    constraints,
    "requiresVerifiedEvidence",
  );
  const requiresWitness = getConstraintBoolean(constraints, "requiresWitness");
  const requiresWitnessResolved = requiresWitness === true;
  const explicitServiceLocation = getConstraintText(
    constraints,
    "serviceLocation",
  );
  const explicitTimeWindows = getConstraintStringArray(
    constraints,
    "timeWindows",
  );
  const accessRequirements = getConstraintStringArray(
    constraints,
    "accessRequirements",
  );
  const safetyRequirements = getConstraintStringArray(
    constraints,
    "safetyRequirements",
  );
  const explicitVerificationRequirements = normalizeFingerprintArray(
    getConstraintStringArray(constraints, "verificationRequirements"),
    borealRequestEvidenceClaims,
  );
  const inferredEmbodiedModes = inferExecutionModes(requestText);
  const serviceLocation =
    explicitServiceLocation ?? inferServiceLocation(requestText);
  const timeWindows =
    explicitTimeWindows.length > 0
      ? explicitTimeWindows
      : inferTimeWindows(requestText);
  const verificationRequirements =
    explicitVerificationRequirements.length > 0
      ? explicitVerificationRequirements
      : inferVerificationRequirements(requestText);
  const explicitEmbodiedMode = executionModes.some(isEmbodiedExecutionMode);
  const inferredEmbodiedMode = inferredEmbodiedModes.some(
    isEmbodiedExecutionMode,
  );
  const resolvedExecutionModes =
    executionModes.length > 0
      ? executionModes
      : inferredEmbodiedModes.length > 0
        ? inferredEmbodiedModes
        : (["remote_digital"] satisfies RequestExecutionMode[]);
  const requiresHumanPresenceResolved =
    requiresHumanPresence === true ||
    resolvedExecutionModes.some(isEmbodiedExecutionMode);
  const requiresLocalAccessResolved =
    requiresLocalAccess === true ||
    hasText(serviceLocation) ||
    accessRequirements.length > 0 ||
    resolvedExecutionModes.some(
      (mode) =>
        mode === "onsite_visit" ||
        mode === "field_inspection" ||
        mode === "pickup_dropoff" ||
        mode === "witnessed_handoff",
    );
  const requiresVerifiedEvidenceResolved =
    requiresVerifiedEvidence === true ||
    requiresWitnessResolved ||
    verificationRequirements.length > 0;
  const requiresSchedulingResolved =
    timeWindows.length > 0 ||
    requiresSchedulingContext(requestText, resolvedExecutionModes);
  const requiresGeographyResolved =
    hasText(serviceLocation) ||
    resolvedExecutionModes.some(isEmbodiedExecutionMode);
  const needsEmbodiedHandling =
    explicitEmbodiedMode ||
    inferredEmbodiedMode ||
    requiresHumanPresenceResolved ||
    requiresLocalAccessResolved ||
    requiresVerifiedEvidenceResolved ||
    requiresWitnessResolved ||
    Boolean(serviceLocation) ||
    timeWindows.length > 0 ||
    accessRequirements.length > 0 ||
    verificationRequirements.length > 0;

  const missingDetails: string[] = [];
  if (
    needsEmbodiedHandling &&
    executionModes.length === 0 &&
    inferredEmbodiedModes.length === 0
  ) {
    missingDetails.push("execution_modes");
  }

  if (needsEmbodiedHandling && !serviceLocation) {
    missingDetails.push("service_location");
  }

  if (
    needsEmbodiedHandling &&
    timeWindows.length === 0 &&
    requiresSchedulingResolved
  ) {
    missingDetails.push("time_windows");
  }

  if (
    needsEmbodiedHandling &&
    shouldRequireExplicitAccessRequirements({
      accessRequirements,
      explicitEmbodiedMode,
      inferredEmbodiedModes,
      requestText,
      requiresLocalAccess: requiresLocalAccessResolved,
      resolvedExecutionModes,
    })
  ) {
    missingDetails.push("access_requirements");
  }

  if (
    needsEmbodiedHandling &&
    verificationRequirements.length === 0 &&
    (requiresVerifiedEvidenceResolved ||
      requiresWitnessResolved ||
      explicitEmbodiedMode ||
      inferredEmbodiedMode)
  ) {
    missingDetails.push("verification_requirements");
  }

  const clarificationReasons = missingDetails.map((detail) =>
    getClarificationReason(detail),
  );
  const planCollapseReasons = buildPlanCollapseReasons({
    needsEmbodiedHandling,
    missingDetails,
    requiresVerifiedEvidence: requiresVerifiedEvidenceResolved,
    requiresWitness: requiresWitnessResolved,
    resolvedExecutionModes,
  });
  const verificationPlan: RequestVerificationPlan = {
    requiredArtifactKinds: deriveVerificationArtifactKinds({
      needsEmbodiedHandling,
      requiresWitness: requiresWitnessResolved,
      verificationRequirements,
    }),
    requiredEvidenceClaims: verificationRequirements,
    mustHaveOwnerAcceptance:
      needsEmbodiedHandling &&
      requiresVerifiedEvidenceResolved &&
      !requiresWitnessResolved,
    mustHaveLocationSignal: needsEmbodiedHandling && Boolean(serviceLocation),
    mustHaveSignature:
      requiresWitnessResolved ||
      verificationRequirements.some((claim) =>
        /\bsignature\b|\bsigned\b/.test(claim.toLowerCase()),
      ),
  };
  const executionProfile: RequestExecutionProfile = {
    executionModes: resolvedExecutionModes,
    requiresHumanPresence: requiresHumanPresenceResolved,
    requiresLocalAccess: requiresLocalAccessResolved,
    requiresVerifiedEvidence: requiresVerifiedEvidenceResolved,
    requiresScheduling: requiresSchedulingResolved,
    requiresGeography: requiresGeographyResolved,
    riskTier:
      needsEmbodiedHandling &&
      (missingDetails.length > 0 || requiresWitnessResolved)
        ? "high"
        : needsEmbodiedHandling
          ? "moderate"
          : "low",
  };
  const embodiedConstraintSet: RequestEmbodiedConstraintSet = {
    requiresEmbodiedHandling: needsEmbodiedHandling,
    executionModes: resolvedExecutionModes,
    ...(serviceLocation ? { serviceLocation } : {}),
    timeWindows,
    accessRequirements,
    safetyRequirements,
    verificationRequirements,
    requiresHumanPresence: requiresHumanPresenceResolved,
    requiresLocalAccess: requiresLocalAccessResolved,
    requiresVerifiedEvidence: requiresVerifiedEvidenceResolved,
    requiresWitness: requiresWitnessResolved,
  };
  const clarificationNeeded: RequestClarificationNeeded = {
    required: missingDetails.length > 0,
    missingDetails,
    reasons: clarificationReasons,
  };
  const planCollapseRisk: RequestPlanCollapseRisk = {
    riskLevel:
      planCollapseReasons.length === 0
        ? "low"
        : missingDetails.length > 0 || requiresWitnessResolved
          ? "high"
          : "moderate",
    reasons: planCollapseReasons,
  };

  const summary =
    missingDetails.length > 0
      ? `Core briefing is present, but Boreal still needs ${missingDetails
          .map((detail) => detail.replace(/_/g, " "))
          .join(", ")} before this request is safe to route or close.`
      : needsEmbodiedHandling
        ? "Core briefing includes the embodied execution and proof details Boreal needs to route this request safely."
        : "Core briefing is present. This request can be opened now and refined further before matching. Summary is still optional.";

  return {
    missingDetails,
    summary,
    executionProfile,
    embodiedConstraintSet,
    verificationPlan,
    planCollapseRisk,
    clarificationNeeded,
  };
}

function deriveStructuralPlanningState(
  draft: Pick<BorealRequestDraft, "brief" | "seeking" | "derived">,
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
    clarificationNeeded: RequestClarificationNeeded;
  },
): {
  leadRole?: BorealRequestRoleKey;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
} {
  const supplyKinds = collapseGenericPlanningSupplyKinds(
    normalizeFingerprintArray(draft.seeking.supplyKinds, borealSupplyKinds),
  );
  const actorKinds = normalizeActorKinds(draft.seeking.actorKinds);
  const outputKinds = normalizeFingerprintArray(
    draft.brief.outputKinds,
    borealOutputKinds,
  );
  const teamMode = draft.seeking.teamMode ?? "";
  const hasPlanningSeed =
    hasText(draft.brief.title) ||
    hasText(draft.brief.summary) ||
    hasText(draft.brief.body) ||
    Object.keys(normalizeRecord(draft.brief.constraints)).length > 0 ||
    outputKinds.length > 0 ||
    supplyKinds.length > 0 ||
    actorKinds.length > 0 ||
    teamMode.length > 0 ||
    hasText(draft.derived.routeFamily) ||
    hasText(draft.derived.routeSummary) ||
    embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling ||
    embodiedPlanning.verificationPlan.requiredArtifactKinds.length > 0 ||
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0 ||
    embodiedPlanning.clarificationNeeded.required;

  if (!hasPlanningSeed) {
    return {
      roleSlots: [],
      phases: [],
      noMicrotaskExplosion: true,
    };
  }

  const leadRole = deriveLeadRoleKey({
    actorKinds,
    outputKinds,
    supplyKinds,
    executionModes: embodiedPlanning.executionProfile.executionModes,
  });
  const leadPreferredSupplyKinds =
    supplyKinds.length > 0 ? [supplyKinds[0]] : [];
  const roleSlots: RequestRoleSlot[] = [
    createRoleSlot({
      roleKey: leadRole,
      preferredSupplyKinds: leadPreferredSupplyKinds,
      required: true,
      requiredActorKinds: deriveRoleActorKinds({
        actorKinds,
        embodiedPlanning,
        isLead: true,
        roleKey: leadRole,
        supplyKind: leadPreferredSupplyKinds[0],
      }),
      summary: buildRoleSlotSummary({
        embodiedPlanning,
        isLead: true,
        outputKinds,
        roleKey: leadRole,
      }),
    }),
  ];

  for (const [index, supplyKind] of supplyKinds.slice(1).entries()) {
    const roleKey = normalizeRoleKey(supplyKind);
    if (roleSlots.some((slot) => slot.roleKey === roleKey)) {
      continue;
    }

    roleSlots.push(
      createRoleSlot({
        roleKey,
        preferredSupplyKinds: [supplyKind],
        required: shouldRequireCollaboratorRole({
          embodiedPlanning,
          index,
          outputKinds,
          supplyKinds,
          teamMode,
        }),
        requiredActorKinds: deriveRoleActorKinds({
          actorKinds,
          embodiedPlanning,
          isLead: false,
          roleKey,
          supplyKind,
        }),
        summary: buildRoleSlotSummary({
          embodiedPlanning,
          isLead: false,
          outputKinds,
          roleKey,
        }),
      }),
    );
  }

  const needsDocumentationSupport =
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0 &&
    !roleSlots.some((slot) =>
      /documentation|qa|report|evidence/.test(slot.roleKey),
    );

  if (needsDocumentationSupport) {
    roleSlots.push(
      createRoleSlot({
        roleKey: "qa_documentation",
        preferredSupplyKinds: [],
        required: false,
        requiredActorKinds: deriveRoleActorKinds({
          actorKinds,
          embodiedPlanning,
          isLead: false,
          roleKey: "qa_documentation",
        }),
        summary:
          "Support evidence packaging, written reporting, or owner-facing delivery notes.",
      }),
    );
  }

  const phases = derivePhasePlans({
    embodiedPlanning,
    leadRole,
    outputKinds,
    roleSlots,
    teamMode,
  });

  return {
    leadRole,
    roleSlots,
    phases,
    noMicrotaskExplosion: true,
  };
}

const workerEligibilityNonAuthority = [
  "not_matching_or_assignment",
  "no_supply_assigned",
  "no_commitment_created",
  "no_fulfillment_started",
  "no_provider_call",
  "no_payment_authorized",
  "no_request_event_written",
] as const;

const agentWakeSupplyKinds = new Set<BorealSupplyKind>([
  "agent_worker",
  "ai_automation",
  "automation_builder",
  "digital_product",
  "documentation_support",
  "provider_capability",
  "runtime_executor",
  "video_generation",
]);

const hardHumanOrLocalSupplyKinds = new Set<BorealSupplyKind>([
  "field_inspection",
  "field_verification",
  "hardware_ops",
  "human_service",
  "local_runner",
  "pickup_dropoff",
]);

const agentWakeOutputKinds = new Set<BorealOutputKind>([
  "automation_build",
  "draft",
  "file",
  "handoff_doc",
  "media",
  "migration_plan",
  "verification_note",
  "video",
  "workflow_build",
  "workflow_map",
]);

const agentWakeExecutionKinds = new Set([
  "agent_request_room",
  "hybrid_human_agent",
  "hybrid_tool_room",
  "provider_api",
  "runtime_request_room",
]);

const physicalProofOutputKinds = new Set<BorealOutputKind>([
  "delivery_confirmation",
  "handoff_receipt",
  "inspection_report",
  "photo_evidence",
  "serial_inventory",
  "signature",
]);

const physicalEvidenceClaims = new Set<BorealRequestEvidenceClaim>([
  "delivery_confirmation",
  "handoff_signature",
  "photo_proof",
  "serial_number_capture",
  "timestamped_photos",
]);

function deriveWorkerEligibility({
  draft,
  embodiedPlanning,
  structuralPlanning,
}: {
  draft: Pick<BorealRequestDraft, "brief" | "seeking" | "derived">;
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
  };
  structuralPlanning: {
    leadRole?: BorealRequestRoleKey;
    roleSlots: RequestRoleSlot[];
  };
}): RequestWorkerEligibility {
  const actorKinds = normalizeActorKinds(draft.seeking.actorKinds);
  const supplyKinds = collapseGenericPlanningSupplyKinds(
    normalizeFingerprintArray(draft.seeking.supplyKinds, borealSupplyKinds),
  );
  const outputKinds = normalizeFingerprintArray(
    draft.brief.outputKinds,
    borealOutputKinds,
  );
  const executionKind = normalizeFingerprintValue(
    draft.derived.executionKind,
    borealRequestExecutionKinds,
  );
  const roleKeys = uniqueStringArray(
    structuralPlanning.roleSlots.map((slot) => slot.roleKey),
  ) as BorealRequestRoleKey[];
  const roleActorKinds = uniqueStringArray(
    structuralPlanning.roleSlots.flatMap((slot) => slot.requiredActorKinds),
  ) as RequestActorKind[];
  const preferredActorKinds = uniqueStringArray([
    ...actorKinds,
    ...roleActorKinds,
  ]) as RequestActorKind[];
  const humanRequiredSignals = collectPlannerHumanRequiredSignals({
    actorKinds: preferredActorKinds,
    embodiedPlanning,
    executionKind,
    outputKinds,
    supplyKinds,
  });
  const wakeSignals = collectPlannerAgentWakeSignals({
    actorKinds: preferredActorKinds,
    executionKind,
    outputKinds,
    roleSlots: structuralPlanning.roleSlots,
    supplyKinds,
  });
  const humanRequired = humanRequiredSignals.length > 0;
  const hasAgentWakeSignal = wakeSignals.length > 0;
  const policy = humanRequired
    ? hasAgentWakeSignal
      ? "human_first_agent_support"
      : "human_first_skip_agents"
    : hasAgentWakeSignal
      ? "wake_named_agents"
      : "no_agent_signal";
  const skipReasons = policy === "human_first_skip_agents"
    ? ["human_required_boundary", ...humanRequiredSignals]
    : policy === "no_agent_signal"
      ? ["no_agent_qualification_signal"]
      : [];

  const baseEligibility: Omit<
    RequestWorkerEligibility,
    "namedAgentCandidates"
  > = {
    source: "planner_projection",
    policy,
    humanRequired,
    shouldWakeAgents:
      policy === "wake_named_agents" || policy === "human_first_agent_support",
    skipProviderOnlyAgents:
      policy === "human_first_skip_agents" || policy === "no_agent_signal",
    preferredActorKinds,
    preferredSupplyKinds: supplyKinds,
    preferredOutputKinds: outputKinds,
    roleKeys,
    wakeSignals,
    skipReasons: uniqueStringArray(skipReasons),
    nonAuthority: [...workerEligibilityNonAuthority],
  };

  return {
    ...baseEligibility,
    namedAgentCandidates: deriveNamedAgentCandidateHints({
      eligibility: baseEligibility,
      executionKind,
      outputKinds,
      supplyKinds,
    }),
  };
}

function collectPlannerHumanRequiredSignals({
  actorKinds,
  embodiedPlanning,
  executionKind,
  outputKinds,
  supplyKinds,
}: {
  actorKinds: RequestActorKind[];
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
  };
  executionKind: string | undefined;
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
}) {
  const signals: string[] = [];

  if (actorKinds.includes("human")) {
    signals.push("human_actor_kind");
  }

  if (supplyKinds.some((kind) => hardHumanOrLocalSupplyKinds.has(kind))) {
    signals.push("human_or_local_supply_kind");
  }

  if (outputKinds.some((kind) => physicalProofOutputKinds.has(kind))) {
    signals.push("physical_proof_output_kind");
  }

  if (
    executionKind &&
    ["human", "field", "local", "embodied", "onsite"].some((token) =>
      executionKind.includes(token),
    )
  ) {
    signals.push("human_or_local_execution_kind");
  }

  if (embodiedPlanning.executionProfile.requiresHumanPresence) {
    signals.push("execution_profile_requires_human_presence");
  }

  if (embodiedPlanning.executionProfile.requiresLocalAccess) {
    signals.push("execution_profile_requires_local_access");
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling) {
    signals.push("embodied_handling_required");
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresHumanPresence) {
    signals.push("embodied_requires_human_presence");
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresLocalAccess) {
    signals.push("embodied_requires_local_access");
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresWitness) {
    signals.push("embodied_requires_witness");
  }

  if (embodiedPlanning.verificationPlan.mustHaveLocationSignal) {
    signals.push("verification_requires_location_signal");
  }

  if (embodiedPlanning.verificationPlan.mustHaveSignature) {
    signals.push("verification_requires_signature");
  }

  if (
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.some((claim) =>
      physicalEvidenceClaims.has(claim),
    )
  ) {
    signals.push("physical_evidence_claim");
  }

  return uniqueStringArray(signals);
}

function collectPlannerAgentWakeSignals({
  actorKinds,
  executionKind,
  outputKinds,
  roleSlots,
  supplyKinds,
}: {
  actorKinds: RequestActorKind[];
  executionKind: string | undefined;
  outputKinds: BorealOutputKind[];
  roleSlots: RequestRoleSlot[];
  supplyKinds: BorealSupplyKind[];
}) {
  const signals: string[] = [];
  const hasAgentActorKind = actorKinds.includes("agent");
  const hasAgentWakeSupplyKind = supplyKinds.some((kind) =>
    agentWakeSupplyKinds.has(kind),
  );
  const hasAgentWakeExecutionKind =
    executionKind !== undefined && agentWakeExecutionKinds.has(executionKind);
  const hasAgentRoleSlot = roleSlots.some((slot) =>
    slot.requiredActorKinds.includes("agent"),
  );
  const hasAgentWakeContext =
    hasAgentActorKind ||
    hasAgentWakeSupplyKind ||
    hasAgentWakeExecutionKind ||
    hasAgentRoleSlot;

  if (hasAgentActorKind) {
    signals.push("actor:agent");
  }

  for (const supplyKind of supplyKinds) {
    if (agentWakeSupplyKinds.has(supplyKind)) {
      signals.push(`supply:${supplyKind}`);
    }
  }

  if (hasAgentWakeContext) {
    for (const outputKind of outputKinds) {
      if (agentWakeOutputKinds.has(outputKind)) {
        signals.push(`output:${outputKind}`);
      }
    }
  }

  if (hasAgentWakeExecutionKind) {
    signals.push(`execution:${executionKind}`);
  }

  if (hasAgentRoleSlot) {
    signals.push("role_slot:agent_capable");
  }

  return uniqueStringArray(signals);
}

function deriveNamedAgentCandidateHints({
  eligibility,
  executionKind,
  outputKinds,
  supplyKinds,
}: {
  eligibility: Omit<RequestWorkerEligibility, "namedAgentCandidates">;
  executionKind: string | undefined;
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
}): RequestNamedAgentCandidateHint[] {
  return listBorealAgentTemplates().map((template) =>
    deriveNamedAgentCandidateHint({
      eligibility,
      executionKind,
      outputKinds,
      supplyKinds,
      template,
    }),
  );
}

function deriveNamedAgentCandidateHint({
  eligibility,
  executionKind,
  outputKinds,
  supplyKinds,
  template,
}: {
  eligibility: Omit<RequestWorkerEligibility, "namedAgentCandidates">;
  executionKind: string | undefined;
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
  template: BorealAgentTemplate;
}): RequestNamedAgentCandidateHint {
  const nonAuthority = [
    "not_matching_or_assignment",
    "no_supply_assigned",
    "no_commitment_created",
    "no_fulfillment_started",
    "no_provider_call",
    "no_payment_authorized",
    "no_request_event_written",
  ];

  const base = {
    agentKey: template.agentKey,
    displayName: template.displayName,
    workerKey: template.workerKey,
    apiRoute: template.apiRoute,
    requiredSupplyKind: template.supplyBinding.supplyKind,
    nonAuthority,
  };

  if (template.status === "target_template") {
    return {
      ...base,
      readiness: "target_only",
      suggestedNextAction: "wait_for_live_template",
      reason:
        template.promotionGates.openBlockers[0] ??
        "Target-only until a backed Supply, execution contract, proof path, fixtures, and route tests exist.",
      matchedSignals: [],
      skipReasons: [...template.promotionGates.openBlockers],
    };
  }

  if (!eligibility.shouldWakeAgents) {
    return {
      ...base,
      readiness: "skip",
      suggestedNextAction: "skip_request",
      reason:
        "Planner worker eligibility does not wake named agents for this request.",
      matchedSignals: [],
      skipReasons: [...eligibility.skipReasons],
    };
  }

  const matchedSignals = collectNamedAgentMatchedSignals({
    executionKind,
    outputKinds,
    supplyKinds,
    template,
  });
  const skipReasons = collectNamedAgentCandidateSkipReasons({
    outputKinds,
    supplyKinds,
    template,
  });

  if (skipReasons.length > 0 || matchedSignals.length === 0) {
    return {
      ...base,
      readiness: "skip",
      suggestedNextAction: "skip_request",
      reason:
        skipReasons[0] ??
        "No named-agent-compatible supply, output, or execution signal matched this template.",
      matchedSignals,
      skipReasons:
        skipReasons.length > 0
          ? skipReasons
          : ["no_named_agent_template_signal"],
    };
  }

  return {
    ...base,
    readiness: "can_prepare",
    suggestedNextAction: "prepare_application",
    reason:
      "Planner fingerprints identify this named agent as a preparation candidate; governed routes still own authority and durable writes.",
    matchedSignals,
    skipReasons: [],
  };
}

function collectNamedAgentMatchedSignals({
  executionKind,
  outputKinds,
  supplyKinds,
  template,
}: {
  executionKind: string | undefined;
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
  template: BorealAgentTemplate;
}) {
  const signals: string[] = [];

  for (const supplyKind of supplyKinds) {
    if (template.qualificationTags.supplyKinds.includes(supplyKind)) {
      signals.push(`supply:${supplyKind}`);
    }
  }

  for (const outputKind of outputKinds) {
    if (template.qualificationTags.outputKinds.includes(outputKind)) {
      signals.push(`output:${outputKind}`);
    }
  }

  if (
    executionKind &&
    template.qualificationTags.executionKinds.includes(
      executionKind as BorealRequestExecutionKind,
    )
  ) {
    signals.push(`execution:${executionKind}`);
  }

  return uniqueStringArray(signals);
}

function collectNamedAgentCandidateSkipReasons({
  outputKinds,
  supplyKinds,
  template,
}: {
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
  template: BorealAgentTemplate;
}) {
  const reasons: string[] = [];
  const hasVideoSignal =
    supplyKinds.includes("video_generation") ||
    outputKinds.some((kind) => kind === "video" || kind === "media");

  if (template.agentKey === "mira-video" && !hasVideoSignal) {
    reasons.push("no_video_generation_signal");
  }

  if (template.agentKey === "tala-humanizer" && hasVideoSignal) {
    reasons.push("provider_media_generation_request");
  }

  return uniqueStringArray(reasons);
}

function uniqueStringArray(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function deriveOutcomeClaims({
  brief,
  embodiedPlanning,
}: {
  brief: BorealRequestDraft["brief"];
  embodiedPlanning: {
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    executionProfile: RequestExecutionProfile;
    verificationPlan: RequestVerificationPlan;
  };
}): RequestOutcomeClaim[] {
  const claims: RequestOutcomeClaim[] = [];
  const seenClaimKeys = new Set<string>();
  const outputKinds = normalizeFingerprintArray(
    brief.outputKinds,
    borealOutputKinds,
  );
  const body = normalizeWhitespace(brief.body ?? "");
  const title = normalizeWhitespace(brief.title ?? "");

  const pushClaim = (claim: RequestOutcomeClaim) => {
    if (!claim.claimKey || seenClaimKeys.has(claim.claimKey)) {
      return;
    }

    seenClaimKeys.add(claim.claimKey);
    claims.push(claim);
  };

  if (title || body) {
    const coreText = title || body;
    pushClaim({
      claimKey: normalizeClaimKey(coreText) || "core_delivery",
      summary:
        summarizeSentence(body || title) ||
        "Complete the request outcome inside one durable request thread.",
      source: "brief",
      nonSubstitutable:
        embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling,
      proofRequired:
        embodiedPlanning.verificationPlan.requiredArtifactKinds.length > 0 ||
        embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0,
    });
  }

  for (const outputKind of outputKinds.slice(0, 4)) {
    pushClaim({
      claimKey: normalizeClaimKey(outputKind) || "deliverable",
      summary: `Produce ${formatPlanningLabel(outputKind).toLowerCase()}.`,
      source: "output_kind",
      nonSubstitutable: false,
      proofRequired: false,
    });
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling) {
    pushClaim({
      claimKey:
        deriveEmbodiedExecutionPhaseKey(
          embodiedPlanning.executionProfile.executionModes,
        ) || "embodied_execution",
      summary:
        deriveEmbodiedExecutionPhaseTitle(
          embodiedPlanning.executionProfile.executionModes,
        ) + ".",
      source: "execution",
      nonSubstitutable: true,
      proofRequired:
        embodiedPlanning.verificationPlan.requiredArtifactKinds.length > 0 ||
        embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0,
    });
  }

  for (const evidenceClaim of embodiedPlanning.verificationPlan.requiredEvidenceClaims.slice(
    0,
    4,
  )) {
    pushClaim({
      claimKey: normalizeClaimKey(evidenceClaim) || "verification_proof",
      summary: `Preserve proof for ${formatPlanningLabel(evidenceClaim).toLowerCase()}.`,
      source: "verification",
      nonSubstitutable: true,
      proofRequired: true,
    });
  }

  return claims.slice(0, 6);
}

function deriveLeadRanking({
  candidatePool,
  matchCandidates,
  leadRole,
  preferredSupplyId,
  hasActiveFulfillment,
  preferredSupplyRouteSelected,
}: {
  candidatePool: string[];
  matchCandidates: RequestMatchCandidate[];
  leadRole?: BorealRequestRoleKey;
  preferredSupplyId: string;
  hasActiveFulfillment: boolean;
  preferredSupplyRouteSelected: boolean;
}): RequestLeadRankingEntry[] {
  const resolvedRoleKey = leadRole ?? "specialist_lead";
  const entries: RequestLeadRankingEntry[] = [];

  if (preferredSupplyId && preferredSupplyRouteSelected) {
    entries.push({
      roleKey: resolvedRoleKey,
      supplyId: preferredSupplyId,
      source: hasActiveFulfillment ? "fulfillment" : "preferred_supply",
      status: hasActiveFulfillment ? "attached" : "selected",
      confidence: hasActiveFulfillment ? "high" : "moderate",
      summary: hasActiveFulfillment
        ? "Execution is already attached to the lead lane for this request."
        : "Pinned supply narrows the lead lane, but matching is still read-only until execution is attached.",
    });
  } else if (preferredSupplyId) {
    entries.push({
      roleKey: resolvedRoleKey,
      supplyId: preferredSupplyId,
      source: "preferred_supply",
      status: "candidate",
      confidence: "low",
      summary:
        "Pinned supply is present, but Boreal has not yet confirmed that it truthfully narrows the lead lane for this request.",
    });
  } else if (hasActiveFulfillment) {
    entries.push({
      roleKey: resolvedRoleKey,
      source: "fulfillment",
      status: "attached",
      confidence: "high",
      summary:
        "Execution is already attached to the lead lane for this request.",
    });
  }

  if (matchCandidates.length > 0) {
    for (const matchCandidate of matchCandidates) {
      if (
        !matchCandidate.supplyId ||
        matchCandidate.supplyId === preferredSupplyId ||
        matchCandidate.leadScore <= 0
      ) {
        continue;
      }

      entries.push({
        roleKey: resolvedRoleKey,
        supplyId: matchCandidate.supplyId,
        source: "candidate_pool",
        status: "candidate",
        confidence: scoreToPlannerConfidence(matchCandidate.leadScore),
        summary: matchCandidate.summary,
      });
    }
  } else {
    for (const supplyId of candidatePool) {
      if (!supplyId || supplyId === preferredSupplyId) {
        continue;
      }

      entries.push({
        roleKey: resolvedRoleKey,
        supplyId,
        source: "candidate_pool",
        status: "candidate",
        confidence: "low",
        summary:
          "Candidate supply is visible for the lead lane, but no real match is attached yet.",
      });
    }
  }

  if (entries.length === 0) {
    entries.push({
      roleKey: resolvedRoleKey,
      source: "planner",
      status: "open",
      confidence: "low",
      summary:
        "Lead lane is still open. Boreal has not attached a real supply to this request yet.",
    });
  }

  return entries;
}

function deriveRoleMatches({
  candidatePool,
  matchCandidates,
  leadRole,
  preferredSupplyId,
  roleSlots,
  hasActiveFulfillment,
  preferredSupplyRouteSelected,
}: {
  candidatePool: string[];
  matchCandidates: RequestMatchCandidate[];
  leadRole?: BorealRequestRoleKey;
  preferredSupplyId: string;
  roleSlots: RequestRoleSlot[];
  hasActiveFulfillment: boolean;
  preferredSupplyRouteSelected: boolean;
}): RequestRoleMatch[] {
  const usedSupplyIds = new Set<string>();
  const remainingCandidates = candidatePool.filter(
    (supplyId) => supplyId && supplyId !== preferredSupplyId,
  );

  return roleSlots.map((slot) => {
    const isLead = slot.roleKey === leadRole;
    if (isLead && preferredSupplyId && preferredSupplyRouteSelected) {
      usedSupplyIds.add(preferredSupplyId);
      return {
        roleKey: slot.roleKey,
        required: slot.required,
        supplyId: preferredSupplyId,
        source: hasActiveFulfillment ? "fulfillment" : "preferred_supply",
        status: hasActiveFulfillment ? "attached" : "selected",
        confidence: hasActiveFulfillment ? "high" : "moderate",
        summary: hasActiveFulfillment
          ? "Execution lane is already attached for the lead lane."
          : "Pinned supply narrows the lead lane, but execution is not attached yet.",
      } satisfies RequestRoleMatch;
    }

    if (isLead && preferredSupplyId) {
      usedSupplyIds.add(preferredSupplyId);
      return {
        roleKey: slot.roleKey,
        required: slot.required,
        supplyId: preferredSupplyId,
        source: "preferred_supply",
        status: "candidate",
        confidence: "low",
        summary:
          "Pinned supply is present, but Boreal still needs a truthful route fit before treating it as the selected lead lane.",
      } satisfies RequestRoleMatch;
    }

    if (isLead && hasActiveFulfillment) {
      return {
        roleKey: slot.roleKey,
        required: slot.required,
        source: "fulfillment",
        status: "attached",
        confidence: "high",
        summary: "Execution lane is already attached for the lead lane.",
      } satisfies RequestRoleMatch;
    }

    if (matchCandidates.length > 0) {
      const roleCandidate = getBestRoleMatchCandidate({
        matchCandidates,
        roleKey: slot.roleKey,
        usedSupplyIds,
      });

      if (roleCandidate && getRoleScore(roleCandidate, slot.roleKey) > 0) {
        usedSupplyIds.add(roleCandidate.supplyId);
        return {
          roleKey: slot.roleKey,
          required: slot.required,
          supplyId: roleCandidate.supplyId,
          source: "candidate_pool",
          status: "candidate",
          confidence: getRoleConfidence(roleCandidate, slot.roleKey),
          summary: roleCandidate.summary,
        } satisfies RequestRoleMatch;
      }
    }

    const candidateSupplyId = remainingCandidates.shift();
    if (candidateSupplyId) {
      return {
        roleKey: slot.roleKey,
        required: slot.required,
        supplyId: candidateSupplyId,
        source: "candidate_pool",
        status: "candidate",
        confidence: slot.required ? "moderate" : "low",
        summary: slot.required
          ? "Candidate supply exists for this lane, but matching is not attached yet."
          : "Optional support lane has a candidate, but nothing is attached yet.",
      } satisfies RequestRoleMatch;
    }

    return {
      roleKey: slot.roleKey,
      required: slot.required,
      source: "planner",
      status: "open",
      confidence: "low",
      summary: slot.required
        ? "Required lane is still open and needs a real lead or support match."
        : "Optional support lane remains open until the request actually needs it.",
    } satisfies RequestRoleMatch;
  });
}

function deriveAssignmentProposal({
  preferredSupplyId,
  roleMatches,
  hasActiveFulfillment,
  preferredSupplyRouteSelected,
}: {
  preferredSupplyId: string;
  roleMatches: RequestRoleMatch[];
  hasActiveFulfillment: boolean;
  preferredSupplyRouteSelected: boolean;
}): RequestAssignmentProposal {
  const lead = roleMatches[0] ?? null;
  const support = roleMatches.slice(1);

  if (hasActiveFulfillment) {
    return {
      state: "execution_attached",
      summary:
        "Execution is already attached to this request. Planner state should now describe the active lane, not invent a new assignment.",
      lead,
      support,
    };
  }

  if (preferredSupplyId && preferredSupplyRouteSelected) {
    return {
      state: "selected_supply",
      summary:
        "Pinned supply narrows the likely lead lane, but Boreal should not treat it as attached execution yet.",
      lead,
      support,
    };
  }

  if (roleMatches.some((match) => match.status === "candidate")) {
    return {
      state: "candidate_pool",
      summary:
        "Candidate lanes exist for this request, but Boreal still needs a real selected lead before execution is attached.",
      lead,
      support,
    };
  }

  return {
    state: "unfilled",
    summary:
      "Planner structure exists, but no real lead or support lane is attached yet.",
    lead,
    support,
  };
}

function deriveReplanReasons({
  assignmentProposal,
  clarificationNeeded,
  roleMatches,
}: {
  assignmentProposal: RequestAssignmentProposal;
  clarificationNeeded: RequestClarificationNeeded;
  roleMatches: RequestRoleMatch[];
}): string[] {
  const reasons = new Set<string>();

  for (const reason of clarificationNeeded.reasons) {
    reasons.add(reason);
  }

  switch (assignmentProposal.state) {
    case "unfilled":
      reasons.add("lead lane is still unfilled");
      break;
    case "candidate_pool":
      reasons.add(
        "candidate lanes exist, but no real selected lead is attached yet",
      );
      break;
    case "selected_supply":
      reasons.add("selected supply still needs real execution attachment");
      break;
    case "execution_attached":
      break;
  }

  for (const roleMatch of roleMatches) {
    if (roleMatch.required && roleMatch.status === "open") {
      reasons.add(`${formatPlanningLabel(roleMatch.roleKey)} is still open`);
    }
  }

  return Array.from(reasons);
}

function normalizeMatchCandidates(
  candidates: RequestMatchCandidate[],
): RequestMatchCandidate[] {
  return candidates
    .map((candidate) => {
      const supplyId = normalizeText(candidate.supplyId);
      if (!supplyId) {
        return null;
      }

      const roleScores = (candidate.roleScores ?? [])
        .map((roleScore) => {
          if (typeof roleScore.score !== "number") {
            return null;
          }

          const score = Number.isFinite(roleScore.score) ? roleScore.score : 0;
          return {
            roleKey: normalizeRoleKey(roleScore.roleKey),
            score,
            confidence: scoreToPlannerConfidence(score),
          } satisfies RequestMatchCandidateRoleScore;
        })
        .filter((roleScore): roleScore is RequestMatchCandidateRoleScore =>
          Boolean(roleScore),
        );

      const leadScore =
        typeof candidate.leadScore === "number" &&
        Number.isFinite(candidate.leadScore)
          ? candidate.leadScore
          : 0;
      const overallScore =
        typeof candidate.overallScore === "number" &&
        Number.isFinite(candidate.overallScore)
          ? candidate.overallScore
          : Math.max(
              leadScore,
              ...roleScores.map((roleScore) => roleScore.score),
              0,
            );

      return {
        supplyId,
        source:
          candidate.source === "preferred_supply"
            ? "preferred_supply"
            : "retrieved",
        overallScore,
        leadScore,
        roleScores,
        summary:
          normalizeText(candidate.summary) ??
          "Candidate supply is visible for this request.",
      } satisfies RequestMatchCandidate;
    })
    .filter((candidate): candidate is RequestMatchCandidate =>
      Boolean(candidate),
    )
    .sort((left, right) => right.overallScore - left.overallScore);
}

function getRoleScore(
  candidate: RequestMatchCandidate,
  roleKey: BorealRequestRoleKey,
) {
  return (
    candidate.roleScores.find((roleScore) => roleScore.roleKey === roleKey)
      ?.score ?? 0
  );
}

function getRoleConfidence(
  candidate: RequestMatchCandidate,
  roleKey: BorealRequestRoleKey,
) {
  return scoreToPlannerConfidence(getRoleScore(candidate, roleKey));
}

function getBestRoleMatchCandidate({
  matchCandidates,
  roleKey,
  usedSupplyIds,
}: {
  matchCandidates: RequestMatchCandidate[];
  roleKey: BorealRequestRoleKey;
  usedSupplyIds?: Set<string>;
}) {
  return matchCandidates
    .filter((candidate) => !usedSupplyIds?.has(candidate.supplyId))
    .sort((left, right) => {
      const scoreDelta =
        getRoleScore(right, roleKey) - getRoleScore(left, roleKey);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.overallScore - left.overallScore;
    })[0];
}

function scoreToPlannerConfidence(score: number): RequestPlannerConfidence {
  if (score >= 80) {
    return "high";
  }

  if (score >= 45) {
    return "moderate";
  }

  return "low";
}

function scoreSupplyForRole({
  executionProfile,
  outputKinds,
  preferredSupplyId,
  roleSlot,
  supply,
}: {
  executionProfile: RequestExecutionProfile;
  outputKinds: BorealOutputKind[];
  preferredSupplyId?: string;
  roleSlot: RequestRoleSlot;
  supply: Pick<
    BorealSupplyDraft,
    "id" | "availability" | "capability" | "pricing" | "source"
  >;
}) {
  const actorKinds = new Set(supply.capability.fulfillmentActorKinds);
  const executionChannels = new Set(supply.capability.executionChannels);
  const supplyKinds = new Set(supply.capability.supplyKinds);
  const supplyOutputKinds = new Set(supply.capability.outputKinds);
  const requiredActorKinds = roleSlot.requiredActorKinds ?? [];
  const preferredSupplyKinds = roleSlot.preferredSupplyKinds ?? [];
  let score = 0;

  if (requiredActorKinds.length > 0) {
    const actorOverlap = requiredActorKinds.filter((kind) =>
      actorKinds.has(kind),
    ).length;
    if (actorOverlap === 0) {
      score -= roleSlot.required ? 90 : 35;
    } else {
      score += 25 + actorOverlap * 10;
    }
  }

  if (preferredSupplyKinds.length > 0) {
    const supplyKindOverlap = preferredSupplyKinds.filter((kind) =>
      supplyKinds.has(kind),
    ).length;
    if (supplyKindOverlap > 0) {
      score += 30 + supplyKindOverlap * 10;
    } else if (roleSlot.required) {
      score -= 25;
    }
  }

  if (outputKinds.length > 0) {
    const outputOverlap = outputKinds.filter((kind) =>
      supplyOutputKinds.has(kind),
    ).length;
    score += Math.min(outputOverlap * 8, 24);
  }

  if (executionProfile.requiresHumanPresence) {
    if (actorKinds.has("human")) {
      score += 30;
    } else {
      score -= 100;
    }
  }

  if (executionProfile.requiresLocalAccess) {
    if (
      executionChannels.has("request_room") ||
      executionChannels.has("resolver_runtime")
    ) {
      score += 15;
    } else {
      score -= 30;
    }
  }

  if (executionProfile.requiresVerifiedEvidence) {
    if (
      supplyOutputKinds.has("delivery") ||
      supplyOutputKinds.has("file") ||
      supplyOutputKinds.has("media")
    ) {
      score += 10;
    } else {
      score -= 10;
    }
  }

  if (
    !executionProfile.requiresHumanPresence &&
    !executionProfile.requiresLocalAccess &&
    executionChannels.has("instant_download")
  ) {
    score += 12;
  }

  if (supply.availability.acceptingRequests) {
    score += 10;
  } else {
    score -= preferredSupplyId === supply.id ? 10 : 40;
  }

  if (preferredSupplyId === supply.id) {
    score += 15;
  }

  if (
    supply.source.kind === "catalog" &&
    executionProfile.requiresHumanPresence
  ) {
    score -= 80;
  }

  if (
    supply.source.kind === "provider" &&
    executionProfile.requiresHumanPresence
  ) {
    score -= 60;
  }

  if (supply.pricing?.mode === "fixed" && outputKinds.length > 0) {
    score += 4;
  }

  return Math.max(score, 0);
}

export function buildRequestMatchCandidate({
  requestDraft,
  supply,
}: {
  requestDraft: Pick<
    BorealRequestDraft,
    "brief" | "seeking" | "routing" | "derived"
  >;
  supply: Pick<
    BorealSupplyDraft,
    "id" | "availability" | "capability" | "profile" | "pricing" | "source"
  >;
}): RequestMatchCandidate | null {
  const roleSlots = requestDraft.derived.roleSlots ?? [];
  if (roleSlots.length === 0) {
    return null;
  }

  const roleScores = roleSlots
    .map((roleSlot) => {
      const score = scoreSupplyForRole({
        executionProfile: requestDraft.derived.executionProfile,
        outputKinds: normalizeFingerprintArray(
          requestDraft.brief.outputKinds,
          borealOutputKinds,
        ),
        preferredSupplyId: normalizeText(
          requestDraft.routing.preferredSupplyId,
        ),
        roleSlot,
        supply,
      });

      return {
        roleKey: roleSlot.roleKey,
        score,
        confidence: scoreToPlannerConfidence(score),
      } satisfies RequestMatchCandidateRoleScore;
    })
    .filter((roleScore) => roleScore.score > 0);

  const leadRoleKey = requestDraft.derived.leadRole;
  const leadScore = leadRoleKey
    ? (roleScores.find((roleScore) => roleScore.roleKey === leadRoleKey)
        ?.score ?? 0)
    : 0;
  const overallScore = Math.max(
    leadScore,
    ...roleScores.map((roleScore) => roleScore.score),
    0,
  );
  const isPreferredSupply =
    normalizeText(requestDraft.routing.preferredSupplyId) === supply.id;

  if (overallScore <= 0 && !isPreferredSupply) {
    return null;
  }

  const matchedRoleKeys = roleScores
    .slice()
    .sort((left, right) => right.score - left.score)
    .map((roleScore) => formatPlanningLabel(roleScore.roleKey).toLowerCase());

  return {
    supplyId: supply.id,
    source: isPreferredSupply ? "preferred_supply" : "retrieved",
    overallScore,
    leadScore,
    roleScores,
    summary:
      matchedRoleKeys.length > 0
        ? `${supply.profile.displayName.trim() || "Candidate supply"} best fits ${matchedRoleKeys
            .slice(0, 2)
            .join(" and ")}.`
        : `${supply.profile.displayName.trim() || "Candidate supply"} is visible for this request, but fit is still weak.`,
  };
}

export function deriveCandidatePoolOrder({
  leadRole,
  matchCandidates,
  roleSlots,
}: {
  leadRole?: BorealRequestRoleKey;
  matchCandidates: RequestMatchCandidate[];
  roleSlots: RequestRoleSlot[];
}) {
  const orderedSupplyIds: string[] = [];
  const usedSupplyIds = new Set<string>();

  const appendSupplyId = (supplyId: string | undefined) => {
    if (!supplyId || usedSupplyIds.has(supplyId)) {
      return;
    }

    usedSupplyIds.add(supplyId);
    orderedSupplyIds.push(supplyId);
  };

  if (leadRole) {
    appendSupplyId(
      getBestRoleMatchCandidate({
        matchCandidates,
        roleKey: leadRole,
      })?.supplyId,
    );
  }

  for (const roleSlot of roleSlots) {
    if (roleSlot.roleKey === leadRole) {
      continue;
    }

    appendSupplyId(
      getBestRoleMatchCandidate({
        matchCandidates,
        roleKey: roleSlot.roleKey,
        usedSupplyIds,
      })?.supplyId,
    );
  }

  for (const matchCandidate of matchCandidates
    .slice()
    .sort((left, right) => right.overallScore - left.overallScore)) {
    appendSupplyId(matchCandidate.supplyId);
  }

  return orderedSupplyIds;
}

function isPreferredSupplyRouteSelected({
  candidatePool,
  matchCandidates,
  matchingMode,
  preferredSupplyId,
  routeFamily,
  routeSummary,
}: {
  candidatePool: string[];
  matchCandidates: RequestMatchCandidate[];
  matchingMode?: BorealRequestMatchingMode;
  preferredSupplyId: string;
  routeFamily?: BorealRequestRouteFamily;
  routeSummary?: string;
}) {
  if (!preferredSupplyId) {
    return false;
  }

  if (matchingMode?.startsWith("preferred_supply_")) {
    return true;
  }

  const firstCandidate =
    matchCandidates
      .slice()
      .sort((left, right) => right.leadScore - left.leadScore)[0]?.supplyId ??
    candidatePool.find((candidateId) => hasText(candidateId));
  return (
    firstCandidate === preferredSupplyId &&
    hasText(routeSummary) &&
    (routeFamily === "direct_specialist" || routeFamily === "direct_tool")
  );
}

function createRoleSlot({
  roleKey,
  preferredSupplyKinds,
  required,
  requiredActorKinds,
  summary,
}: {
  roleKey: BorealRequestRoleKey;
  preferredSupplyKinds: BorealSupplyKind[];
  required: boolean;
  requiredActorKinds: RequestActorKind[];
  summary?: string;
}): RequestRoleSlot {
  return {
    roleKey,
    title: formatPlanningLabel(roleKey),
    preferredSupplyKinds,
    required,
    requiredActorKinds,
    ...(summary ? { summary } : {}),
  };
}

function deriveLeadRoleKey({
  actorKinds,
  outputKinds,
  supplyKinds,
  executionModes,
}: {
  actorKinds: RequestActorKind[];
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
  executionModes: RequestExecutionMode[];
}): BorealRequestRoleKey {
  const primarySupplyKind = supplyKinds[0];
  if (primarySupplyKind) {
    return normalizeRoleKey(primarySupplyKind);
  }

  if (executionModes.includes("field_inspection")) {
    return "field_inspector";
  }

  if (executionModes.includes("onsite_visit")) {
    return "onsite_operator";
  }

  if (executionModes.includes("pickup_dropoff")) {
    return "courier_runner";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "witness_operator";
  }

  if (outputKinds.some((kind) => /migration|integration|handoff/.test(kind))) {
    return "delivery_lead";
  }

  if (actorKinds.length === 1) {
    switch (actorKinds[0]) {
      case "human":
        return "human_lead";
      case "agent":
        return "agent_lead";
      case "tool":
        return "tool_lead";
      case "organization":
        return "organization_lead";
      case "runtime":
        return "runtime_lead";
    }
  }

  return "specialist_lead";
}

function deriveRoleActorKinds({
  actorKinds,
  embodiedPlanning,
  isLead,
  roleKey,
  supplyKind,
}: {
  actorKinds: RequestActorKind[];
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    verificationPlan: RequestVerificationPlan;
  };
  isLead: boolean;
  roleKey: BorealRequestRoleKey;
  supplyKind?: BorealSupplyKind;
}): RequestActorKind[] {
  const normalizedActorKinds = actorKinds.length > 0 ? actorKinds : [];
  const roleFingerprint = `${roleKey} ${supplyKind ?? ""}`.toLowerCase();

  if (isLead && embodiedPlanning.executionProfile.requiresHumanPresence) {
    return ["human"];
  }

  if (/runtime/.test(roleFingerprint)) {
    return ["runtime"];
  }

  if (/provider|tool|api/.test(roleFingerprint)) {
    return ["tool"];
  }

  if (/agent|automation/.test(roleFingerprint)) {
    return normalizedActorKinds.length > 0
      ? normalizedActorKinds.filter(
          (kind) => kind !== "tool" && kind !== "runtime",
        )
      : (["agent"] satisfies RequestActorKind[]);
  }

  if (/documentation|qa|report|evidence/.test(roleFingerprint)) {
    if (normalizedActorKinds.length > 0) {
      const documentationActorKinds = normalizedActorKinds.filter(
        (kind) => kind === "human" || kind === "agent",
      );
      if (documentationActorKinds.length > 0) {
        return documentationActorKinds;
      }
    }

    return ["human", "agent"];
  }

  if (normalizedActorKinds.length > 0) {
    return normalizedActorKinds;
  }

  return ["human"];
}

function buildRoleSlotSummary({
  embodiedPlanning,
  isLead,
  outputKinds,
  roleKey,
}: {
  embodiedPlanning: {
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
    verificationPlan: RequestVerificationPlan;
  };
  isLead: boolean;
  outputKinds: BorealOutputKind[];
  roleKey: BorealRequestRoleKey;
}): string {
  if (
    isLead &&
    embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling
  ) {
    return "Own the lead execution lane without flattening onsite or proof-heavy work into a digital-only result.";
  }

  if (
    /documentation|qa|report|evidence/.test(roleKey) &&
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0
  ) {
    return "Keep evidence, reporting, and owner-facing delivery attached to the request.";
  }

  if (outputKinds.length > 0) {
    return `Support deliverables such as ${outputKinds
      .slice(0, 3)
      .map((kind) => formatPlanningLabel(kind))
      .join(", ")}.`;
  }

  return "Support the lead lane only where the request clearly needs extra execution help.";
}

function shouldRequireCollaboratorRole({
  embodiedPlanning,
  index,
  outputKinds,
  supplyKinds,
  teamMode,
}: {
  embodiedPlanning: {
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
  };
  index: number;
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
  teamMode: RequestTeamMode | "";
}): boolean {
  const explicitTeamMode =
    /\bteam\b|\bmulti\b|\bcollab\b|\bpair\b|\bsquad\b/.test(teamMode);
  const highComplexityDigital =
    !embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling &&
    (supplyKinds.length >= 3 || outputKinds.length >= 4 || explicitTeamMode);

  return highComplexityDigital && index === 0;
}

function derivePhasePlans({
  embodiedPlanning,
  leadRole,
  outputKinds,
  roleSlots,
  teamMode,
}: {
  embodiedPlanning: {
    executionProfile: RequestExecutionProfile;
    verificationPlan: RequestVerificationPlan;
    clarificationNeeded: RequestClarificationNeeded;
    embodiedConstraintSet: RequestEmbodiedConstraintSet;
  };
  leadRole: BorealRequestRoleKey;
  outputKinds: BorealOutputKind[];
  roleSlots: RequestRoleSlot[];
  teamMode: RequestTeamMode | "";
}): RequestPhasePlan[] {
  const phases: RequestPhasePlan[] = [];
  const evidenceClaims =
    embodiedPlanning.verificationPlan.requiredEvidenceClaims ?? [];

  if (embodiedPlanning.clarificationNeeded.required) {
    phases.push({
      phaseKey: "clarify_constraints",
      title: "Clarify execution, access, and proof constraints",
      summary:
        "Lock the missing facts that materially affect route selection, execution safety, or closure truth.",
      roleKeys: [leadRole],
      requiredEvidenceClaims: [],
    });
  }

  if (embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling) {
    phases.push({
      phaseKey: deriveEmbodiedExecutionPhaseKey(
        embodiedPlanning.executionProfile.executionModes,
      ),
      title: deriveEmbodiedExecutionPhaseTitle(
        embodiedPlanning.executionProfile.executionModes,
      ),
      summary:
        "Execute the physical or local-access work inside the request lane before treating anything as complete.",
      roleKeys: getExecutionRoleKeys(roleSlots),
      requiredEvidenceClaims: [],
    });

    phases.push({
      phaseKey: "proof_delivery",
      title: "Capture proof and publish the delivery package",
      summary:
        "Attach evidence and the final delivery inside the same request thread so review and closure stay truthful.",
      roleKeys: getProofRoleKeys(roleSlots),
      requiredEvidenceClaims: evidenceClaims,
    });

    return phases.slice(0, 3);
  }

  const explicitTeamMode =
    /\bteam\b|\bmulti\b|\bcollab\b|\bpair\b|\bsquad\b/.test(teamMode);
  const needsStructuredExecution =
    roleSlots.length > 1 || outputKinds.length > 2 || explicitTeamMode;

  if (needsStructuredExecution) {
    phases.push({
      phaseKey: "scope_route",
      title: "Lock scope and the lead execution lane",
      summary:
        "Confirm the lead owner, route boundary, and how supporting roles attach to the request.",
      roleKeys: [leadRole],
      requiredEvidenceClaims: [],
    });
  }

  phases.push({
    phaseKey: "execute_delivery",
    title: needsStructuredExecution
      ? "Produce the core deliverables"
      : "Complete the requested deliverable",
    summary:
      "Keep execution inside one request thread and avoid exploding the work into a brittle task tree too early.",
    roleKeys: roleSlots
      .filter((slot) => slot.required)
      .map((slot) => slot.roleKey),
    requiredEvidenceClaims: [],
  });

  if (
    outputKinds.some((kind) => /handoff|training|doc|report|plan/.test(kind)) ||
    roleSlots.length > 1
  ) {
    phases.push({
      phaseKey: "handoff_review",
      title: "Publish handoff package and owner review",
      summary:
        "Bundle the outputs, context, and approval-facing material before final closure.",
      roleKeys: getProofRoleKeys(roleSlots),
      requiredEvidenceClaims: evidenceClaims,
    });
  }

  return phases.slice(0, 3);
}

function deriveEmbodiedExecutionPhaseKey(
  executionModes: RequestExecutionMode[],
): BorealRequestPhaseKey {
  if (executionModes.includes("field_inspection")) {
    return "field_execution";
  }

  if (executionModes.includes("pickup_dropoff")) {
    return "handoff_execution";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "witness_execution";
  }

  return "onsite_execution";
}

function deriveEmbodiedExecutionPhaseTitle(
  executionModes: RequestExecutionMode[],
): string {
  if (executionModes.includes("field_inspection")) {
    return "Complete the onsite inspection";
  }

  if (executionModes.includes("pickup_dropoff")) {
    return "Complete the pickup, dropoff, or handoff";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "Complete the witnessed handoff";
  }

  return "Complete the onsite work";
}

function getExecutionRoleKeys(
  roleSlots: RequestRoleSlot[],
): BorealRequestRoleKey[] {
  const requiredRoleKeys = roleSlots
    .filter((slot) => slot.required)
    .map((slot) => slot.roleKey);

  return requiredRoleKeys.length > 0
    ? requiredRoleKeys
    : roleSlots.slice(0, 1).map((slot) => slot.roleKey);
}

function getProofRoleKeys(
  roleSlots: RequestRoleSlot[],
): BorealRequestRoleKey[] {
  const proofRoleKeys = roleSlots
    .filter((slot) => /documentation|qa|report|evidence/.test(slot.roleKey))
    .map((slot) => slot.roleKey);

  if (proofRoleKeys.length > 0) {
    return proofRoleKeys;
  }

  return getExecutionRoleKeys(roleSlots);
}

function normalizeRoleKey(value: string): BorealRequestRoleKey {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  switch (normalized) {
    case "field_inspection":
      return "field_inspector";
    case "field_verification":
      return "field_technician";
    case "human_service":
      return "service_lead";
    case "agent_worker":
      return "agent_operator";
    case "local_runner":
    case "pickup_dropoff":
      return "courier_runner";
    case "provider_capability":
      return "tool_operator";
    case "runtime_executor":
    case "desktop_runtime":
      return "runtime_operator";
    default:
      return (
        normalizeFingerprintValue(normalized, borealRequestRoleKeys) ??
        "support_role"
      );
  }
}

function collapseGenericPlanningSupplyKinds(supplyKinds: BorealSupplyKind[]) {
  const genericKinds = new Set([
    "agent_worker",
    "desktop_runtime",
    "human_service",
    "digital_product",
    "runtime_executor",
    "provider_capability",
    "team_service",
  ]);
  const normalizedSupplyKinds = supplyKinds.filter(
    (kind): kind is BorealSupplyKind => kind.trim().length > 0,
  );
  const hasSpecificKinds = normalizedSupplyKinds.some(
    (kind) => !genericKinds.has(kind),
  );

  if (!hasSpecificKinds) {
    return normalizedSupplyKinds;
  }

  return normalizedSupplyKinds.filter((kind) => !genericKinds.has(kind));
}

function formatPlanningLabel(value: string): string {
  return value
    .split("_")
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ");
}

function getConstraintBoolean(
  constraints: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = constraints[key];
  return typeof value === "boolean" ? value : undefined;
}

function getConstraintText(
  constraints: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = constraints[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getConstraintStringArray(
  constraints: Record<string, unknown>,
  key: string,
): string[] {
  const value = constraints[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function inferExecutionModes(text: string): RequestExecutionMode[] {
  const normalizedText = text.toLowerCase();
  const inferredModes = new Set<RequestExecutionMode>();

  if (
    /\bcall\b|\bmeeting\b|\bzoom\b|\binterview\b|\bworkshop\b|\bsession\b/.test(
      normalizedText,
    )
  ) {
    inferredModes.add("remote_sync");
  }

  if (
    /\bon[-\s]?site\b|\bsite visit\b|\bin person\b|\bin-person\b/.test(
      normalizedText,
    )
  ) {
    inferredModes.add("onsite_visit");
  }

  if (
    /\bvisit\b.*\b(site|store|kiosk|office|property|venue|branch|location)\b/.test(
      normalizedText,
    )
  ) {
    inferredModes.add("onsite_visit");
  }

  if (
    /\binspect(?:ion)?\b|\bfield audit\b|\binventory audit\b|\bcount inventory\b/.test(
      normalizedText,
    )
  ) {
    inferredModes.add("field_inspection");
  }

  if (
    /\b(verify|confirm|check)\b.*\b(installed|signage|setup|condition|display)\b/.test(
      normalizedText,
    ) ||
    /\btimestamp(?:ed)? (?:photo|picture)|\bphotos?\b|\bpictures?\b|\bvideo proof\b/.test(
      normalizedText,
    )
  ) {
    inferredModes.add("field_inspection");
  }

  if (/\bpick[\s-]?up\b|\bdrop[\s-]?off\b|\bcourier\b/.test(normalizedText)) {
    inferredModes.add("pickup_dropoff");
  }

  if (
    /\bwitness(?:ed|ing)?\b|\bhandoff\b|\bsigned handoff\b/.test(normalizedText)
  ) {
    inferredModes.add("witnessed_handoff");
  }

  return Array.from(inferredModes);
}

function inferServiceLocation(text: string): string | undefined {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /\b(?:around|near|within)\s+([A-Za-z]+(?:\s+(?!to\b|for\b|before\b|after\b|tomorrow\b|today\b|this\b|on\b|by\b)[A-Za-z]+){0,2})(?=,|\.|$|\s+(?:to|for|before|after|tomorrow|today|this|on|by))\b/i,
    /\blocal in\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/,
    /\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(?:to|for|before|after|tomorrow|today|this|on)\b/,
    /\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})(?=,|\.|$)/,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    const location = match?.[1]?.trim();
    if (location) {
      return normalizeLocationLabel(location);
    }
  }

  return undefined;
}

function normalizeLocationLabel(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function inferTimeWindows(text: string): string[] {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const matches: string[] = [];
  const patterns = [
    /\b(tomorrow before\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
    /\b(today before\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
    /\b(this\s+[A-Za-z]+\s+\d{1,2})\b/i,
    /\b(on\s+[A-Za-z]+\s+\d{1,2})\b/i,
    /\b(by\s+[A-Za-z]+\s+\d{1,2})\b/i,
    /\b(tomorrow)\b/i,
    /\b(today)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    const value = match?.[1]?.trim();
    if (value && !matches.includes(value)) {
      matches.push(value);
    }
  }

  return matches;
}

function inferVerificationRequirements(
  text: string,
): BorealRequestEvidenceClaim[] {
  const normalizedText = text.toLowerCase();
  const requirements = new Set<BorealRequestEvidenceClaim>();

  if (/\btimestamp(?:ed)? (?:photos?|pictures?)\b/.test(normalizedText)) {
    requirements.add("timestamped_photos");
  } else if (/\bphotos?\b|\bpictures?\b|\bphoto proof\b/.test(normalizedText)) {
    requirements.add("photo_proof");
  }

  if (/\bserial numbers?\b|\bserials?\b/.test(normalizedText)) {
    requirements.add("serial_number_capture");
  }

  if (/\bverification note\b|\bverify note\b/.test(normalizedText)) {
    requirements.add("verification_note");
  }

  if (/\bwritten report\b|\breport\b/.test(normalizedText)) {
    requirements.add("written_report");
  }

  if (
    /\bhandoff\b|\bsignature\b|\bsigned\b|\bwitness(?:ed)?\b/.test(
      normalizedText,
    )
  ) {
    requirements.add("handoff_signature");
  }

  if (
    /\bdelivery confirmation\b|\bconfirm delivery\b|\bdelivery receipt\b/.test(
      normalizedText,
    )
  ) {
    requirements.add("delivery_confirmation");
  }

  return Array.from(requirements);
}

function isEmbodiedExecutionMode(mode: RequestExecutionMode): boolean {
  return (
    mode === "onsite_visit" ||
    mode === "field_inspection" ||
    mode === "pickup_dropoff" ||
    mode === "witnessed_handoff"
  );
}

function requiresSchedulingContext(
  text: string,
  explicitExecutionModes: RequestExecutionMode[],
): boolean {
  if (explicitExecutionModes.some(isEmbodiedExecutionMode)) {
    return true;
  }

  return /\btoday\b|\btomorrow\b|\bby\b|\bbefore\b|\bafter\b|\bwindow\b|\bschedule\b|\bappointment\b|\bvisit\b/.test(
    text.toLowerCase(),
  );
}

function shouldRequireExplicitAccessRequirements({
  accessRequirements,
  explicitEmbodiedMode,
  inferredEmbodiedModes,
  requestText,
  requiresLocalAccess,
  resolvedExecutionModes,
}: {
  accessRequirements: string[];
  explicitEmbodiedMode: boolean;
  inferredEmbodiedModes: RequestExecutionMode[];
  requestText: string;
  requiresLocalAccess: boolean;
  resolvedExecutionModes: RequestExecutionMode[];
}) {
  if (accessRequirements.length > 0) {
    return false;
  }

  if (
    !requiresLocalAccess &&
    !explicitEmbodiedMode &&
    inferredEmbodiedModes.length === 0
  ) {
    return false;
  }

  if (
    resolvedExecutionModes.includes("pickup_dropoff") ||
    resolvedExecutionModes.includes("witnessed_handoff")
  ) {
    return true;
  }

  const normalizedText = requestText.toLowerCase();
  const controlledAccessSignal =
    /\b(access|permission|permit|appointment|site contact|store manager|property manager|owner|tenant|seller|recipient|security|gate|gated|key|keys|badge|credential|credentials|inside|interior|backroom|stockroom|warehouse|office|home|house|apartment|condo|private|property)\b/.test(
      normalizedText,
    );

  if (controlledAccessSignal) {
    return true;
  }

  return false;
}

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function normalizeRecord(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!value || Array.isArray(value)) {
    return {};
  }

  return value;
}

function normalizeExecutionModes(
  value: string[] | undefined,
): RequestExecutionMode[] {
  return normalizeFingerprintArray(value, borealRequestExecutionModes);
}

function normalizeActorKinds(
  value: RequestActorKind[] | undefined,
): RequestActorKind[] {
  return normalizeFingerprintArray(value, borealActorKinds);
}

function getClarificationReason(detail: string): string {
  switch (detail) {
    case "execution_modes":
      return "Boreal still needs the execution mode before routing this request safely.";
    case "service_location":
      return "Boreal still needs the service location before assigning embodied work.";
    case "time_windows":
      return "Boreal still needs the timing window before assigning or sequencing embodied work.";
    case "access_requirements":
      return "Boreal still needs the access requirements before assigning embodied work.";
    case "verification_requirements":
      return "Boreal still needs the proof requirements before it can trust closure.";
    default:
      return `Boreal still needs ${detail.replace(/_/g, " ")} before moving this request forward safely.`;
  }
}

function buildPlanCollapseReasons({
  needsEmbodiedHandling,
  missingDetails,
  requiresVerifiedEvidence,
  requiresWitness,
  resolvedExecutionModes,
}: {
  needsEmbodiedHandling: boolean;
  missingDetails: string[];
  requiresVerifiedEvidence: boolean;
  requiresWitness: boolean;
  resolvedExecutionModes: RequestExecutionMode[];
}) {
  const reasons: string[] = [];

  if (!needsEmbodiedHandling) {
    return reasons;
  }

  reasons.push("request includes embodied or access-constrained work");

  for (const detail of missingDetails) {
    reasons.push(getClarificationReason(detail));
  }

  if (requiresVerifiedEvidence) {
    reasons.push("request requires verification beyond generated text");
  }

  if (requiresWitness) {
    reasons.push("request depends on witness- or signature-grade proof");
  }

  if (
    resolvedExecutionModes.includes("pickup_dropoff") ||
    resolvedExecutionModes.includes("witnessed_handoff")
  ) {
    reasons.push(
      "request includes handoff-style execution that cannot collapse into a generic summary",
    );
  }

  return reasons;
}

function deriveVerificationArtifactKinds({
  needsEmbodiedHandling,
  requiresWitness,
  verificationRequirements,
}: {
  needsEmbodiedHandling: boolean;
  requiresWitness: boolean;
  verificationRequirements: BorealRequestEvidenceClaim[];
}): RequestArtifactKind[] {
  const kinds = new Set<RequestArtifactKind>();

  if (needsEmbodiedHandling || verificationRequirements.length > 0) {
    kinds.add("evidence");
  }

  if (requiresWitness) {
    kinds.add("signature");
  }

  if (
    verificationRequirements.some((claim) =>
      /\breport\b|\bsummary\b|\bissue_log\b|\blog\b/.test(claim.toLowerCase()),
    )
  ) {
    kinds.add("delivery");
  }

  return Array.from(kinds);
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

function normalizeClaimKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function summarizeSentence(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return "";
  }

  const firstSentenceMatch = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return firstSentenceMatch?.[1]?.trim() ?? normalized;
}

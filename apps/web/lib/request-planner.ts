import type {
  BorealRequestDraft,
  RequestActorKind,
  RequestArtifactKind,
  RequestClarificationNeeded,
  RequestEmbodiedConstraintSet,
  RequestExecutionMode,
  RequestExecutionProfile,
  RequestPhasePlan,
  RequestPlanCollapseRisk,
  RequestRoleSlot,
  RequestVerificationPlan,
} from "./request";

export type RequestOutcomeClaim = {
  claimKey: string;
  summary: string;
  source: "brief" | "output_kind" | "execution" | "verification";
  nonSubstitutable: boolean;
  proofRequired: boolean;
};

export type RequestPlannerConfidence = "low" | "moderate" | "high";

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
  roleKey: string;
  supplyId?: string;
  source: RequestPlannerMatchSource;
  status: RequestPlannerMatchStatus;
  confidence: RequestPlannerConfidence;
  summary: string;
};

export type RequestRoleMatch = {
  roleKey: string;
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
  leadRole?: string;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
  executionProfile: RequestExecutionProfile;
  embodiedConstraintSet: RequestEmbodiedConstraintSet;
  verificationPlan: RequestVerificationPlan;
  planCollapseRisk: RequestPlanCollapseRisk;
  clarificationNeeded: RequestClarificationNeeded;
  outcomeClaims: RequestOutcomeClaim[];
  leadRanking: RequestLeadRankingEntry[];
  roleMatches: RequestRoleMatch[];
  assignmentProposal: RequestAssignmentProposal;
  replanReasons: string[];
  embodiedSummary: string;
};

export function deriveRequestPlannerState(
  draft: Pick<
    BorealRequestDraft,
    "brief" | "seeking" | "routing" | "activeRefs" | "derived"
  >
): RequestPlannerState {
  const embodiedPlanning = deriveEmbodiedPlanningState(draft);
  const structuralPlanning = deriveStructuralPlanningState(draft, embodiedPlanning);
  const outcomeClaims = deriveOutcomeClaims({
    brief: draft.brief,
    embodiedPlanning,
  });
  const preferredSupplyRouteSelected = isPreferredSupplyRouteSelected({
    candidatePool: draft.derived.candidatePool ?? [],
    matchingMode: normalizeText(draft.derived.matchingMode),
    preferredSupplyId: normalizeText(draft.routing.preferredSupplyId),
    routeFamily: normalizeText(draft.derived.routeFamily),
    routeSummary: normalizeText(draft.derived.routeSummary),
  });
  const leadRanking = deriveLeadRanking({
    candidatePool: draft.derived.candidatePool ?? [],
    leadRole: structuralPlanning.leadRole,
    preferredSupplyId: normalizeText(draft.routing.preferredSupplyId),
    hasActiveFulfillment: hasText(draft.activeRefs.activeFulfillmentId),
    preferredSupplyRouteSelected,
  });
  const roleMatches = deriveRoleMatches({
    candidatePool: draft.derived.candidatePool ?? [],
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
    leadRanking,
    roleMatches,
    assignmentProposal,
    replanReasons,
    embodiedSummary: embodiedPlanning.summary,
  };
}

function deriveEmbodiedPlanningState(
  draft: Pick<BorealRequestDraft, "brief">
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
    getConstraintStringArray(constraints, "executionModes")
  );
  const requiresHumanPresence = getConstraintBoolean(
    constraints,
    "requiresHumanPresence"
  );
  const requiresLocalAccess = getConstraintBoolean(
    constraints,
    "requiresLocalAccess"
  );
  const requiresVerifiedEvidence = getConstraintBoolean(
    constraints,
    "requiresVerifiedEvidence"
  );
  const requiresWitness = getConstraintBoolean(constraints, "requiresWitness");
  const requiresWitnessResolved = requiresWitness === true;
  const explicitServiceLocation = getConstraintText(constraints, "serviceLocation");
  const explicitTimeWindows = getConstraintStringArray(constraints, "timeWindows");
  const accessRequirements = getConstraintStringArray(
    constraints,
    "accessRequirements"
  );
  const safetyRequirements = getConstraintStringArray(
    constraints,
    "safetyRequirements"
  );
  const explicitVerificationRequirements = getConstraintStringArray(
    constraints,
    "verificationRequirements"
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
    isEmbodiedExecutionMode
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
        mode === "witnessed_handoff"
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
  if (needsEmbodiedHandling && executionModes.length === 0) {
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
    accessRequirements.length === 0 &&
    (requiresLocalAccessResolved ||
      explicitEmbodiedMode ||
      inferredEmbodiedModes.includes("onsite_visit") ||
      inferredEmbodiedModes.includes("field_inspection") ||
      inferredEmbodiedModes.includes("witnessed_handoff"))
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
    getClarificationReason(detail)
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
    mustHaveLocationSignal:
      needsEmbodiedHandling && Boolean(serviceLocation),
    mustHaveSignature:
      requiresWitnessResolved ||
      verificationRequirements.some((claim) =>
        /\bsignature\b|\bsigned\b/.test(claim.toLowerCase())
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
  }
): {
  leadRole?: string;
  roleSlots: RequestRoleSlot[];
  phases: RequestPhasePlan[];
  noMicrotaskExplosion: boolean;
} {
  const supplyKinds = collapseGenericPlanningSupplyKinds(
    normalizeStringArray(draft.seeking.supplyKinds)
  );
  const actorKinds = normalizeActorKinds(draft.seeking.actorKinds);
  const outputKinds = normalizeStringArray(draft.brief.outputKinds);
  const teamMode = normalizeText(draft.seeking.teamMode).toLowerCase();
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
  const leadPreferredSupplyKinds = supplyKinds.length > 0 ? [supplyKinds[0]] : [];
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
      })
    );
  }

  const needsDocumentationSupport =
    embodiedPlanning.verificationPlan.requiredEvidenceClaims.length > 0 &&
    !roleSlots.some((slot) =>
      /documentation|qa|report|evidence/.test(slot.roleKey)
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
      })
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
  const outputKinds = normalizeStringArray(brief.outputKinds);
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
          embodiedPlanning.executionProfile.executionModes
        ) || "embodied_execution",
      summary:
        deriveEmbodiedExecutionPhaseTitle(
          embodiedPlanning.executionProfile.executionModes
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
    4
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
  leadRole,
  preferredSupplyId,
  hasActiveFulfillment,
  preferredSupplyRouteSelected,
}: {
  candidatePool: string[];
  leadRole?: string;
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
  leadRole,
  preferredSupplyId,
  roleSlots,
  hasActiveFulfillment,
  preferredSupplyRouteSelected,
}: {
  candidatePool: string[];
  leadRole?: string;
  preferredSupplyId: string;
  roleSlots: RequestRoleSlot[];
  hasActiveFulfillment: boolean;
  preferredSupplyRouteSelected: boolean;
}): RequestRoleMatch[] {
  const remainingCandidates = candidatePool.filter(
    (supplyId) => supplyId && supplyId !== preferredSupplyId
  );

  return roleSlots.map((slot) => {
    const isLead = slot.roleKey === leadRole;
    if (isLead && preferredSupplyId && preferredSupplyRouteSelected) {
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
      reasons.add("candidate lanes exist, but no real selected lead is attached yet");
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

function isPreferredSupplyRouteSelected({
  candidatePool,
  matchingMode,
  preferredSupplyId,
  routeFamily,
  routeSummary,
}: {
  candidatePool: string[];
  matchingMode?: string;
  preferredSupplyId: string;
  routeFamily?: string;
  routeSummary?: string;
}) {
  if (!preferredSupplyId) {
    return false;
  }

  if (matchingMode?.startsWith("preferred_supply_")) {
    return true;
  }

  const firstCandidate = candidatePool.find((candidateId) => hasText(candidateId));
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
  roleKey: string;
  preferredSupplyKinds: string[];
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
  outputKinds: string[];
  supplyKinds: string[];
  executionModes: RequestExecutionMode[];
}): string {
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
    return "pickup_operator";
  }

  if (executionModes.includes("witnessed_handoff")) {
    return "witness_operator";
  }

  if (outputKinds.some((kind) => /migration|integration|handoff/.test(kind))) {
    return "delivery_lead";
  }

  if (actorKinds.length === 1) {
    return `${actorKinds[0]}_lead`;
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
  roleKey: string;
  supplyKind?: string;
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
      ? normalizedActorKinds.filter((kind) => kind !== "tool" && kind !== "runtime")
      : (["agent"] satisfies RequestActorKind[]);
  }

  if (/documentation|qa|report|evidence/.test(roleFingerprint)) {
    if (normalizedActorKinds.length > 0) {
      const documentationActorKinds = normalizedActorKinds.filter(
        (kind) => kind === "human" || kind === "agent"
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
  outputKinds: string[];
  roleKey: string;
}): string {
  if (isLead && embodiedPlanning.embodiedConstraintSet.requiresEmbodiedHandling) {
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
  outputKinds: string[];
  supplyKinds: string[];
  teamMode: string;
}): boolean {
  const explicitTeamMode = /\bteam\b|\bmulti\b|\bcollab\b|\bpair\b|\bsquad\b/.test(
    teamMode
  );
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
  leadRole: string;
  outputKinds: string[];
  roleSlots: RequestRoleSlot[];
  teamMode: string;
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
        embodiedPlanning.executionProfile.executionModes
      ),
      title: deriveEmbodiedExecutionPhaseTitle(
        embodiedPlanning.executionProfile.executionModes
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

  const explicitTeamMode = /\bteam\b|\bmulti\b|\bcollab\b|\bpair\b|\bsquad\b/.test(
    teamMode
  );
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
    roleKeys: roleSlots.filter((slot) => slot.required).map((slot) => slot.roleKey),
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
  executionModes: RequestExecutionMode[]
): string {
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
  executionModes: RequestExecutionMode[]
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

function getExecutionRoleKeys(roleSlots: RequestRoleSlot[]): string[] {
  const requiredRoleKeys = roleSlots
    .filter((slot) => slot.required)
    .map((slot) => slot.roleKey);

  return requiredRoleKeys.length > 0
    ? requiredRoleKeys
    : roleSlots.slice(0, 1).map((slot) => slot.roleKey);
}

function getProofRoleKeys(roleSlots: RequestRoleSlot[]): string[] {
  const proofRoleKeys = roleSlots
    .filter((slot) =>
      /documentation|qa|report|evidence/.test(slot.roleKey)
    )
    .map((slot) => slot.roleKey);

  if (proofRoleKeys.length > 0) {
    return proofRoleKeys;
  }

  return getExecutionRoleKeys(roleSlots);
}

function normalizeRoleKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  switch (normalized) {
    case "field_inspection":
      return "field_inspector";
    case "human_service":
      return "service_lead";
    case "agent_worker":
      return "agent_operator";
    case "provider_capability":
      return "tool_operator";
    case "runtime_executor":
    case "desktop_runtime":
      return "runtime_operator";
    default:
      return normalized || "support_role";
  }
}

function collapseGenericPlanningSupplyKinds(supplyKinds: string[]) {
  const genericKinds = new Set([
    "agent_worker",
    "human_service",
    "digital_product",
    "runtime_executor",
    "provider_capability",
    "team_service",
  ]);
  const normalizedSupplyKinds = supplyKinds.filter((kind) => kind.trim().length > 0);
  const hasSpecificKinds = normalizedSupplyKinds.some(
    (kind) => !genericKinds.has(kind)
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
  key: string
): boolean | undefined {
  const value = constraints[key];
  return typeof value === "boolean" ? value : undefined;
}

function getConstraintText(
  constraints: Record<string, unknown>,
  key: string
): string | undefined {
  const value = constraints[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getConstraintStringArray(
  constraints: Record<string, unknown>,
  key: string
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
      normalizedText
    )
  ) {
    inferredModes.add("remote_sync");
  }

  if (
    /\bon[-\s]?site\b|\bsite visit\b|\bin person\b|\bin-person\b/.test(
      normalizedText
    )
  ) {
    inferredModes.add("onsite_visit");
  }

  if (
    /\bvisit\b.*\b(site|store|kiosk|office|property|venue|branch|location)\b/.test(
      normalizedText
    )
  ) {
    inferredModes.add("onsite_visit");
  }

  if (
    /\binspect(?:ion)?\b|\bfield audit\b|\binventory audit\b|\bcount inventory\b/.test(
      normalizedText
    )
  ) {
    inferredModes.add("field_inspection");
  }

  if (
    /\b(verify|confirm|check)\b.*\b(installed|signage|setup|condition|display)\b/.test(
      normalizedText
    ) ||
    /\btimestamp(?:ed)? photo|\bphotos?\b|\bvideo proof\b/.test(normalizedText)
  ) {
    inferredModes.add("field_inspection");
  }

  if (/\bpick[\s-]?up\b|\bdrop[\s-]?off\b|\bcourier\b/.test(normalizedText)) {
    inferredModes.add("pickup_dropoff");
  }

  if (/\bwitness(?:ed|ing)?\b|\bhandoff\b|\bsigned handoff\b/.test(normalizedText)) {
    inferredModes.add("witnessed_handoff");
  }

  return Array.from(inferredModes);
}

function inferServiceLocation(text: string): string | undefined {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /\blocal in\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/,
    /\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(?:to|for|before|after|tomorrow|today|this|on)\b/,
    /\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})(?=,|\.|$)/,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    const location = match?.[1]?.trim();
    if (location) {
      return location;
    }
  }

  return undefined;
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

function inferVerificationRequirements(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const requirements = new Set<string>();

  if (/\btimestamp(?:ed)? photos?\b/.test(normalizedText)) {
    requirements.add("timestamped_photos");
  } else if (/\bphotos?\b|\bphoto proof\b/.test(normalizedText)) {
    requirements.add("photo_evidence");
  }

  if (/\bvideo proof\b|\bvideo\b/.test(normalizedText)) {
    requirements.add("video_evidence");
  }

  if (/\bwritten report\b|\breport\b/.test(normalizedText)) {
    requirements.add("written_report");
  }

  if (/\bissues?\b/.test(normalizedText)) {
    requirements.add("issue_log");
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
  explicitExecutionModes: RequestExecutionMode[]
): boolean {
  if (explicitExecutionModes.some(isEmbodiedExecutionMode)) {
    return true;
  }

  return /\btoday\b|\btomorrow\b|\bby\b|\bbefore\b|\bafter\b|\bwindow\b|\bschedule\b|\bappointment\b|\bvisit\b/.test(
    text.toLowerCase()
  );
}

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function normalizeRecord(
  value: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!value || Array.isArray(value)) {
    return {};
  }

  return value;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(value.map((entry) => entry.trim()).filter(Boolean))
  );
}

function normalizeExecutionModes(
  value: string[] | undefined
): RequestExecutionMode[] {
  const allowedModes = new Set<RequestExecutionMode>([
    "remote_digital",
    "remote_sync",
    "onsite_visit",
    "field_inspection",
    "pickup_dropoff",
    "witnessed_handoff",
  ]);

  return Array.from(
    new Set(
      (value ?? []).filter(
        (entry): entry is RequestExecutionMode =>
          allowedModes.has(entry as RequestExecutionMode)
      )
    )
  );
}

function normalizeActorKinds(
  value: RequestActorKind[] | undefined
): RequestActorKind[] {
  if (!value) {
    return [];
  }

  return Array.from(new Set(value));
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
    reasons.push("request includes handoff-style execution that cannot collapse into a generic summary");
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
  verificationRequirements: string[];
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
      /\breport\b|\bsummary\b|\bissue_log\b|\blog\b/.test(claim.toLowerCase())
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

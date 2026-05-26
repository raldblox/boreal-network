import { z } from "zod";
import {
  applyRequestPatch,
  createInitialRequestDraft,
  type BorealRequestDraft,
  type RequestPatch,
} from "./request";
import {
  borealActorKinds,
  borealActorKindSchema,
  borealOutputKinds,
  borealExecutionChannelSchema,
  borealOutputKindSchema,
  borealRequestExecutionKinds,
  borealRequestExecutionKindSchema,
  borealRequestMatchingModes,
  borealRequestMatchingModeSchema,
  borealRequestPaymentModes,
  borealRequestPaymentModeSchema,
  borealRequestRoleKeys,
  borealRequestRouteFamilies,
  borealRequestRouteFamilySchema,
  borealRequestTeamModeSchema,
  borealSupplyKinds,
  borealSupplyKindSchema,
  type BorealActorKind,
  type BorealOutputKind,
  type BorealRequestExecutionKind,
  type BorealRequestMatchingMode,
  type BorealRequestPaymentMode,
  type BorealRequestRoleKey,
  type BorealRequestRouteFamily,
  type BorealSupplyKind,
} from "./matching-fingerprints";
import {
  buildRequestMatchCandidate,
  deriveCandidatePoolOrder,
} from "./request-planner";
import type { BorealSupplyDraft } from "./supply";

export const requestBriefSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  body: z.string().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  outputKinds: z.array(borealOutputKindSchema).optional(),
  tags: z.array(z.string()).optional(),
});

export const requestSeekingSchema = z.object({
  actorKinds: z.array(borealActorKindSchema).optional(),
  supplyKinds: z.array(borealSupplyKindSchema).optional(),
  teamMode: borealRequestTeamModeSchema.optional(),
  notes: z.string().optional(),
});

export const requestBudgetSchema = z
  .union([
    z.object({
      mode: z.enum(["none", "open"]),
      currency: z.string().optional(),
      fixedAmount: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
    z.object({
      mode: z.literal("fixed"),
      currency: z.string().optional(),
      fixedAmount: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
    z.object({
      mode: z.literal("range"),
      currency: z.string().optional(),
      fixedAmount: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
  ])
  .nullable()
  .optional();

export const requestDeadlineSchema = z
  .object({
    targetAt: z.string().optional(),
    notes: z.string().optional(),
  })
  .nullable()
  .optional();

export const requestPatchSchema = z.object({
  visibility: z.enum(["private", "public"]).optional(),
  brief: requestBriefSchema.optional(),
  seeking: requestSeekingSchema.optional(),
  routing: z
    .object({
      preferredSupplyId: z.string().optional(),
    })
    .optional(),
  budget: requestBudgetSchema,
  deadline: requestDeadlineSchema,
  derived: z
    .object({
      routeFamily: borealRequestRouteFamilySchema.optional(),
      executionKind: borealRequestExecutionKindSchema.optional(),
      paymentMode: borealRequestPaymentModeSchema.optional(),
      matchingMode: borealRequestMatchingModeSchema.optional(),
      routeSummary: z.string().optional(),
    })
    .optional(),
});

const supplyPricingSchema = z
  .union([
    z.object({
      mode: z.enum(["quote", "open"]),
      currency: z.string().optional(),
      fixedAmount: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
    z.object({
      mode: z.literal("fixed"),
      currency: z.string().optional(),
      fixedAmount: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
    z.object({
      mode: z.literal("range"),
      currency: z.string().optional(),
      fixedAmount: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
  ])
  .nullable();

const candidateSupplySchema = z.object({
  id: z.string(),
  key: z.string(),
  ownerId: z.string(),
  status: z.enum(["draft", "published", "paused", "retired"]),
  visibility: z.enum(["private", "unlisted", "public"]),
  profile: z.object({
    displayName: z.string(),
    headline: z.string().optional(),
    summary: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
  }),
  capability: z.object({
    supplyKinds: z.array(borealSupplyKindSchema),
    fulfillmentActorKinds: z.array(borealActorKindSchema),
    outputKinds: z.array(borealOutputKindSchema),
    executionChannels: z.array(borealExecutionChannelSchema),
  }),
  availability: z.object({
    acceptingRequests: z.boolean(),
    maxConcurrentRequests: z.number().optional(),
    currentLoad: z.number().optional(),
    responseTimeHours: z.number().optional(),
  }),
  pricing: supplyPricingSchema,
  source: z.object({
    kind: z.enum(["manual", "runtime", "provider", "catalog"]),
  }),
  bindings: z
    .object({
      runtimeActorId: z.string().optional(),
      resolverClientId: z.string().optional(),
      providerRef: z.string().optional(),
    })
    .default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
  retiredAt: z.string().optional(),
});

export const requestMatchingLabFixtureSchema = z.object({
  fixtureType: z.literal("planner_matcher_eval").optional(),
  schemaVersion: z.number().optional(),
  scenarioId: z.string(),
  description: z.string(),
  requestInput: z
    .object({
      actor: z
        .object({
          id: z.string(),
        })
        .passthrough(),
      rawAsk: z.string().optional(),
    })
    .passthrough(),
  requestPatch: requestPatchSchema,
  candidateSupplies: z.array(candidateSupplySchema),
  expectedRouting: z
    .object({
      routeFamily: borealRequestRouteFamilySchema,
    })
    .passthrough(),
  expectedExtraction: z.record(z.string(), z.unknown()).optional(),
  expectedPlanning: z.record(z.string(), z.unknown()).optional(),
  expectedMatching: z.record(z.string(), z.unknown()).optional(),
  expectedPolicy: z.record(z.string(), z.unknown()).optional(),
});

export type RequestMatchingLabFixture = z.infer<
  typeof requestMatchingLabFixtureSchema
>;

export type RequestMatchingLabActual = ReturnType<
  typeof buildRequestMatcherActualOutput
>;

export type RequestMatchingLabScenario = {
  fixture: RequestMatchingLabFixture;
  draft: BorealRequestDraft;
  actual: RequestMatchingLabActual;
};

export type RequestMatchingLabSearchHit = {
  supplyId: string;
  score: number;
  summary: string;
  matchedTerms: string[];
  matchedKinds: string[];
  matchedOutputs: string[];
};

export type RequestMatchingLabPhaseRoleMatch = {
  roleKey: BorealRequestRoleKey;
  title: string;
  required: boolean;
  supplyId?: string;
  supplyTitle?: string;
  summary: string;
  status: string;
  confidence: string;
};

export type RequestMatchingLabPhaseMatch = {
  phaseKey: string;
  title: string;
  summary: string;
  roleMatches: RequestMatchingLabPhaseRoleMatch[];
  requiredEvidenceClaims: string[];
};

export type RequestMatchingLabWorkflowRun = RequestMatchingLabScenario & {
  searchHits: RequestMatchingLabSearchHit[];
  phaseMatches: RequestMatchingLabPhaseMatch[];
  normalization: {
    source: "heuristic" | "llm" | "heuristic_fallback";
    modelId?: string;
    note?: string;
  };
};

export function buildRequestMatcherScenario(
  fixture: RequestMatchingLabFixture,
  options?: { requestBody?: string }
): RequestMatchingLabScenario {
  const effectiveFixture =
    options && "requestBody" in options
      ? overrideFixtureRequestBody(fixture, options.requestBody ?? "")
      : fixture;
  const draft = buildRequestMatcherDraft(effectiveFixture);

  return {
    fixture: effectiveFixture,
    draft,
    actual: buildRequestMatcherActualOutput({
      draft,
      fixture: effectiveFixture,
    }),
  };
}

export function buildRequestMatcherDraft(
  fixture: RequestMatchingLabFixture
): BorealRequestDraft {
  const ownerId = fixture.requestInput.actor.id;
  const visibility = fixture.requestPatch.visibility ?? "private";
  const createdAt =
    fixture.candidateSupplies[0]?.createdAt ?? "2026-05-22T00:00:00.000Z";

  let draft = createInitialRequestDraft({
    id: `req_${fixture.scenarioId}`,
    chatId: `chat_${fixture.scenarioId}`,
    documentId: `doc_${fixture.scenarioId}`,
    userId: ownerId,
    visibility,
    createdAt,
  });

  draft = applyRequestPatch(
    draft,
    fixture.requestPatch as RequestPatch,
    fixture.candidateSupplies[0]?.updatedAt ?? createdAt
  );

  const matchCandidates = fixture.candidateSupplies
    .map((supply) =>
      buildRequestMatchCandidate({
        requestDraft: draft,
        supply: supply as BorealSupplyDraft,
      })
    )
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate)
    );

  const candidatePool = deriveCandidatePoolOrder({
    leadRole: draft.derived.leadRole,
    matchCandidates,
    roleSlots: draft.derived.roleSlots,
  });

  draft = applyRequestPatch(
    draft,
    {
      derived: {
        candidatePool,
        matchCandidates,
      },
    },
    fixture.candidateSupplies[0]?.updatedAt ?? createdAt
  );

  return draft;
}

export function buildRequestMatchingLabRun({
  ask,
  supplies,
  actorId = "actor_matching_lab",
}: {
  ask: string;
  supplies: RequestMatchingLabFixture["candidateSupplies"];
  actorId?: string;
}): RequestMatchingLabWorkflowRun {
  const fixture = createRequestMatchingLabFixture({
    actorId,
    ask,
    supplies,
  });
  return buildRequestMatchingLabWorkflowRunFromFixture(fixture, {
    normalization: {
      source: "heuristic",
    },
  });
}

export function buildRequestMatchingLabWorkflowRunFromFixture(
  fixture: RequestMatchingLabFixture,
  options?: {
    normalization?: RequestMatchingLabWorkflowRun["normalization"];
  }
): RequestMatchingLabWorkflowRun {
  const scenario = buildRequestMatcherScenario(fixture);

  return {
    ...scenario,
    searchHits: searchRequestMatchingLabSupplies({
      ask:
        fixture.requestInput.rawAsk ??
        fixture.requestPatch.brief?.body ??
        fixture.description,
      supplies: fixture.candidateSupplies,
    }),
    phaseMatches: buildRequestMatchingLabPhaseMatches({
      draft: scenario.draft,
      supplies: fixture.candidateSupplies,
    }),
    normalization: options?.normalization ?? {
      source: "heuristic",
    },
  };
}

export function searchRequestMatchingLabSupplies({
  ask,
  supplies,
}: {
  ask: string;
  supplies: RequestMatchingLabFixture["candidateSupplies"];
}) {
  const normalizedAsk = normalizeSearchText(ask);
  const tokens = tokenizeSearchText(normalizedAsk);

  return supplies
    .map((supply) => {
      const matchedTerms = new Set<string>();
      const matchedKinds = new Set<string>();
      const matchedOutputs = new Set<string>();
      let score = 0;

      const displayName = normalizeSearchText(supply.profile.displayName);
      const headline = normalizeSearchText(supply.profile.headline ?? "");
      const summary = normalizeSearchText(supply.profile.summary);
      const description = normalizeSearchText(supply.profile.description ?? "");
      const tags = supply.profile.tags.map(normalizeSearchText);
      const supplyKinds = supply.capability.supplyKinds.map(normalizeSearchText);
      const outputKinds = supply.capability.outputKinds.map(normalizeSearchText);
      const metadataText = flattenMetadataText(supply.metadata);

      if (normalizedAsk && displayName.includes(normalizedAsk)) {
        score += 30;
      }

      if (normalizedAsk && headline.includes(normalizedAsk)) {
        score += 22;
      }

      for (const token of tokens) {
        if (displayName.includes(token)) {
          score += 18;
          matchedTerms.add(token);
        }
        if (headline.includes(token)) {
          score += 14;
          matchedTerms.add(token);
        }
        if (summary.includes(token)) {
          score += 10;
          matchedTerms.add(token);
        }
        if (description.includes(token)) {
          score += 6;
          matchedTerms.add(token);
        }
        if (tags.some((tag) => tag.includes(token))) {
          score += 12;
          matchedTerms.add(token);
        }
        for (const supplyKind of supplyKinds) {
          if (supplyKind.includes(token)) {
            score += 14;
            matchedKinds.add(supplyKind);
          }
        }
        for (const outputKind of outputKinds) {
          if (outputKind.includes(token)) {
            score += 10;
            matchedOutputs.add(outputKind);
          }
        }
        if (metadataText.includes(token)) {
          score += 4;
          matchedTerms.add(token);
        }
      }

      if (supply.availability.acceptingRequests) {
        score += 2;
      }

      return {
        supplyId: supply.id,
        score,
        summary: supply.profile.summary,
        matchedTerms: Array.from(matchedTerms).slice(0, 4),
        matchedKinds: Array.from(matchedKinds).slice(0, 3),
        matchedOutputs: Array.from(matchedOutputs).slice(0, 3),
      } satisfies RequestMatchingLabSearchHit;
    })
    .filter((hit) => hit.score > 0)
    .sort((left, right) => right.score - left.score);
}

function buildRequestMatchingLabPhaseMatches({
  draft,
  supplies,
}: {
  draft: BorealRequestDraft;
  supplies: RequestMatchingLabFixture["candidateSupplies"];
}) {
  const supplyTitleById = new Map(
    supplies.map((supply) => [supply.id, supply.profile.displayName])
  );
  const roleSlotByKey = new Map(
    draft.derived.roleSlots.map((roleSlot) => [roleSlot.roleKey, roleSlot])
  );
  const roleMatchByKey = new Map(
    draft.derived.roleMatches.map((roleMatch) => [roleMatch.roleKey, roleMatch])
  );

  return draft.derived.phases.map((phase) => ({
    phaseKey: phase.phaseKey,
    title: phase.title,
    summary: phase.summary,
    requiredEvidenceClaims: phase.requiredEvidenceClaims,
    roleMatches: phase.roleKeys.map((roleKey) => {
      const roleSlot = roleSlotByKey.get(roleKey);
      const roleMatch = roleMatchByKey.get(roleKey);
      const fallbackCandidate = getBestRoleCandidateForLab({
        matchCandidates: draft.derived.matchCandidates,
        roleKey,
      });
      const selectedSupplyId = roleMatch?.supplyId ?? fallbackCandidate?.supplyId;

      return {
        roleKey,
        title: roleSlot?.title ?? roleKey,
        required: roleSlot?.required ?? false,
        supplyId: selectedSupplyId,
        supplyTitle: selectedSupplyId
          ? supplyTitleById.get(selectedSupplyId)
          : undefined,
        summary:
          roleMatch?.summary ??
          fallbackCandidate?.summary ??
          "No strong candidate attached yet.",
        status: roleMatch?.status ?? (selectedSupplyId ? "candidate" : "open"),
        confidence:
          roleMatch?.confidence ??
          roleScoreToConfidenceLabel(
            fallbackCandidate
              ? getRoleCandidateScore(fallbackCandidate, roleKey)
              : 0
          ),
      } satisfies RequestMatchingLabPhaseRoleMatch;
    }),
  }));
}

function buildRequestMatcherActualOutput({
  draft,
  fixture,
}: {
  draft: BorealRequestDraft;
  fixture: RequestMatchingLabFixture;
}) {
  const nextAction = deriveNextAction(draft);
  const leadRanking = uniqueStrings(
    draft.derived.leadRanking.map((entry) => entry.supplyId)
  );
  const roleMatches = Object.fromEntries(
    draft.derived.roleMatches
      .filter((entry) => entry.supplyId)
      .map((entry) => [entry.roleKey, entry.supplyId])
  );
  const routeFamily =
    draft.derived.routeFamily ?? fixture.expectedRouting.routeFamily;

  return {
    schemaVersion: 1,
    scenarioId: fixture.scenarioId,
    fingerprints: {
      actorKinds: draft.seeking.actorKinds ?? [],
      supplyKinds: draft.seeking.supplyKinds ?? [],
      outputKinds: draft.brief.outputKinds ?? [],
      executionModes: draft.derived.executionProfile.executionModes,
      evidenceClaims: draft.derived.verificationPlan.requiredEvidenceClaims,
      routeFamily,
      executionKind: draft.derived.executionKind ?? null,
      paymentMode: draft.derived.paymentMode ?? null,
      matchingMode: draft.derived.matchingMode ?? null,
      leadRole: draft.derived.leadRole ?? null,
      phaseKeys: draft.derived.phases.map((phase) => phase.phaseKey),
    },
    extraction: {
      title: draft.brief.title ?? "",
      summary: draft.brief.summary?.trim() || draft.brief.body?.trim() || "",
      body: draft.brief.body ?? "",
      seeking: {
        ...(draft.seeking.actorKinds?.length
          ? { actorKinds: draft.seeking.actorKinds }
          : {}),
        ...(draft.seeking.supplyKinds?.length
          ? { supplyKinds: draft.seeking.supplyKinds }
          : {}),
        ...(draft.seeking.teamMode ? { teamMode: draft.seeking.teamMode } : {}),
      },
      outputKinds: draft.brief.outputKinds ?? [],
      missingDetails: draft.derived.missingDetails,
      constraints: buildExtractionConstraints(draft),
    },
    routing: {
      routeFamily,
      complexityLevel: deriveComplexityLevel(draft),
      needsPlan: deriveNeedsPlan(draft),
      humanRequired: deriveHumanRequired(draft),
      needsClarification: draft.derived.clarificationNeeded.required,
    },
    planning: {
      leadRole: draft.derived.leadRole ?? null,
      executionProfile: draft.derived.executionProfile,
      verificationPlan: draft.derived.verificationPlan,
      planCollapseRisk: draft.derived.planCollapseRisk,
      clarificationNeeded: draft.derived.clarificationNeeded,
      phases: draft.derived.phases,
      roleSlots: draft.derived.roleSlots,
      noMicrotaskExplosion: draft.derived.noMicrotaskExplosion,
      outcomeClaims: draft.derived.outcomeClaims,
    },
    matching: {
      candidatePool: draft.derived.candidatePool ?? [],
      matchCandidates: draft.derived.matchCandidates,
      leadRanking,
      leadRankingDetails: draft.derived.leadRanking,
      roleMatches,
      roleMatchDetails: draft.derived.roleMatches,
      assignmentProposal: draft.derived.assignmentProposal,
      replanReasons: draft.derived.replanReasons,
    },
    policy: {
      nextAction,
      requiresOwnerApproval: nextAction === "draft_commitment",
      preferredSupplyId: draft.routing.preferredSupplyId,
      shouldOpenRequest: Boolean(draft.brief.body?.trim()),
      shouldCreateFulfillment: false,
      shouldCreateFulfillmentSteps: false,
    },
  };
}

function overrideFixtureRequestBody(
  fixture: RequestMatchingLabFixture,
  requestBody: string
): RequestMatchingLabFixture {
  return {
    ...fixture,
    requestInput: {
      ...fixture.requestInput,
      rawAsk: requestBody,
    },
    requestPatch: {
      ...fixture.requestPatch,
      brief: {
        ...(fixture.requestPatch.brief ?? {}),
        body: requestBody,
      },
    },
  };
}

export function createRequestMatchingLabFixture({
  actorId,
  ask,
  supplies,
  requestPatch,
}: {
  actorId: string;
  ask: string;
  supplies: RequestMatchingLabFixture["candidateSupplies"];
  requestPatch?: RequestMatchingLabFixture["requestPatch"];
}): RequestMatchingLabFixture {
  const resolvedRequestPatch = requestPatch ?? buildRequestPatchFromAsk(ask);

  return {
    fixtureType: "planner_matcher_eval",
    schemaVersion: 1,
    scenarioId: "matching-lab-live",
    description:
      "Live mock workflow generated from one freeform ask against the detailed matching lab catalog.",
    requestInput: {
      actor: {
        id: actorId,
      },
      rawAsk: ask,
    },
    requestPatch: resolvedRequestPatch,
    candidateSupplies: supplies,
    expectedRouting: {
      routeFamily: resolvedRequestPatch.derived?.routeFamily ?? "worker_market",
    },
  };
}

export function buildRequestPatchFromAsk(
  ask: string
): RequestMatchingLabFixture["requestPatch"] {
  const normalizedAsk = ask.trim();
  const supplyKinds = inferSupplyKindsFromAsk(normalizedAsk);
  const outputKinds = inferOutputKindsFromAsk(normalizedAsk, supplyKinds);
  const actorKinds = inferActorKindsFromAsk(normalizedAsk, supplyKinds);
  const budget = inferBudgetFromAsk(normalizedAsk);
  const deadline = inferDeadlineFromAsk(normalizedAsk);
  const teamMode = shouldUseTeamMode(normalizedAsk, supplyKinds, outputKinds)
    ? "solo_or_team"
    : undefined;
  const routeFamily = inferRouteFamilyFromAsk({
    actorKinds,
    normalizedAsk,
    outputKinds,
    supplyKinds,
  });
  const executionKind = inferExecutionKindFromAsk({
    actorKinds,
    outputKinds,
    routeFamily,
    supplyKinds,
  });
  const paymentMode = inferPaymentModeFromAsk({
    budget,
    routeFamily,
    supplyKinds,
  });
  const matchingMode = inferMatchingModeFromAsk(routeFamily);
  const title = inferTitleFromAsk(normalizedAsk);
  const summary = inferSummaryFromAsk(normalizedAsk);

  return {
    visibility: "private",
    brief: {
      title,
      summary,
      body: normalizedAsk,
      constraints: {},
      outputKinds,
      tags: buildTagsFromAsk(normalizedAsk, supplyKinds, outputKinds),
    },
    seeking: {
      ...(actorKinds.length > 0 ? { actorKinds } : {}),
      ...(supplyKinds.length > 0 ? { supplyKinds } : {}),
      ...(teamMode ? { teamMode } : {}),
      notes:
        routeFamily === "direct_tool"
          ? "Lab-inferred direct tool path."
          : "Lab-inferred lead-first route with optional collaborator lanes.",
    },
    ...(budget ? { budget } : {}),
    ...(deadline ? { deadline } : {}),
    derived: {
      routeFamily,
      executionKind,
      paymentMode,
      matchingMode,
      routeSummary: buildRouteSummary({
        executionKind,
        routeFamily,
        supplyKinds,
      }),
    },
  };
}

function buildExtractionConstraints(draft: BorealRequestDraft) {
  const constraints = {
    ...((draft.brief.constraints as Record<string, unknown> | undefined) ?? {}),
  };

  if (draft.budget?.currency && !("budgetCurrency" in constraints)) {
    constraints.budgetCurrency = draft.budget.currency;
  }

  if (draft.budget?.mode === "fixed" && typeof draft.budget.fixedAmount === "number") {
    constraints.fixedAmount = draft.budget.fixedAmount;
  }

  if (draft.budget?.mode === "range") {
    if (typeof draft.budget.minAmount === "number") {
      constraints.budgetMin = draft.budget.minAmount;
    }

    if (typeof draft.budget.maxAmount === "number") {
      constraints.budgetMax = draft.budget.maxAmount;
    }
  }

  if (draft.deadline?.targetAt && !("targetAt" in constraints)) {
    constraints.targetAt = draft.deadline.targetAt;
  }

  return constraints;
}

function isSimpleClarifyLane(draft: BorealRequestDraft) {
  const requiredRoleCount = draft.derived.roleSlots.filter((slot) => slot.required).length;
  const nonDocumentationOptionalRoles = draft.derived.roleSlots.filter(
    (slot) => !slot.required && slot.roleKey !== "qa_documentation"
  ).length;

  return (
    draft.derived.clarificationNeeded.required &&
    requiredRoleCount <= 1 &&
    nonDocumentationOptionalRoles === 0
  );
}

function deriveNeedsPlan(draft: BorealRequestDraft) {
  const requiredRoleCount = draft.derived.roleSlots.filter((slot) => slot.required).length;
  const totalRoleCount = draft.derived.roleSlots.length;

  if (isSimpleClarifyLane(draft)) {
    return false;
  }

  if (requiredRoleCount >= 2 || totalRoleCount > 1) {
    return true;
  }

  if (draft.derived.phases.length > 1 && !draft.derived.clarificationNeeded.required) {
    return true;
  }

  return draft.derived.executionProfile.requiresVerifiedEvidence;
}

function deriveComplexityLevel(draft: BorealRequestDraft) {
  const requiredRoleCount = draft.derived.roleSlots.filter((slot) => slot.required).length;
  const totalRoleCount = draft.derived.roleSlots.length;
  const phaseCount = draft.derived.phases.length;
  const embodied = draft.derived.embodiedConstraintSet.requiresEmbodiedHandling;

  if (isSimpleClarifyLane(draft)) {
    return "low";
  }

  if (requiredRoleCount >= 2 || phaseCount >= 3 || (!embodied && totalRoleCount >= 3)) {
    return "high";
  }

  if (
    embodied ||
    totalRoleCount > 1 ||
    phaseCount > 1 ||
    draft.derived.verificationPlan.requiredEvidenceClaims.length > 0
  ) {
    return "medium";
  }

  return "low";
}

function deriveHumanRequired(draft: BorealRequestDraft) {
  if (draft.derived.executionProfile.requiresHumanPresence) {
    return true;
  }

  return draft.derived.roleSlots.some((slot) =>
    slot.requiredActorKinds.includes("human")
  );
}

function deriveNextAction(draft: BorealRequestDraft) {
  if (draft.derived.clarificationNeeded.required) {
    return "clarify_request";
  }

  if (draft.derived.leadRanking.some((entry) => entry.supplyId)) {
    return "draft_commitment";
  }

  if (draft.derived.matchCandidates.length > 0) {
    return "show_lead_shortlist";
  }

  return "block_and_escalate";
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    )
  );
}

function inferSupplyKindsFromAsk(ask: string): BorealSupplyKind[] {
  const normalizedAsk = normalizeSearchText(ask);
  const inferredKinds = new Set<BorealSupplyKind>();
  const rules: Array<{
    keywords: string[];
    supplyKinds: BorealSupplyKind[];
  }> = [
    {
      keywords: ["hubspot", "crm", "migration", "airtable", "notion", "sales ops", "support ops"],
      supplyKinds: ["migration_lead", "automation_builder", "documentation_support"],
    },
    {
      keywords: ["automation", "workflow", "integration", "zapier", "make", "n8n", "agentic"],
      supplyKinds: ["automation_builder", "ai_automation"],
    },
    {
      keywords: ["documentation", "sop", "handoff", "playbook", "training", "enablement"],
      supplyKinds: ["documentation_support", "qa_documentation"],
    },
    {
      keywords: ["hardware", "signage", "serial", "device", "install", "kiosk", "display"],
      supplyKinds: ["hardware_ops", "field_verification"],
    },
    {
      keywords: ["inspect", "inspection", "audit", "site visit", "property", "branch", "venue", "walkthrough"],
      supplyKinds: ["field_inspection", "reporting_support"],
    },
    {
      keywords: ["pickup", "dropoff", "courier", "handoff", "deliver", "delivery"],
      supplyKinds: ["local_runner", "pickup_dropoff"],
    },
    {
      keywords: ["video", "caption", "edit", "promo", "launch clip"],
      supplyKinds: ["video_generation"],
    },
    {
      keywords: ["runtime", "desktop", "local file", "codex"],
      supplyKinds: ["runtime_executor"],
    },
    {
      keywords: ["provider", "api", "webhook", "sync"],
      supplyKinds: ["provider_capability"],
    },
    {
      keywords: ["team", "collective", "squad"],
      supplyKinds: ["team_service", "operations_build"],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalizedAsk.includes(keyword))) {
      for (const supplyKind of rule.supplyKinds) {
        inferredKinds.add(supplyKind);
      }
    }
  }

  if (inferredKinds.size === 0) {
    inferredKinds.add("generalist");
    if (/\boperator\b|\bops\b|\bworkflow\b/.test(normalizedAsk)) {
      inferredKinds.add("operator");
    }
  }

  return Array.from(inferredKinds).filter((kind) =>
    borealSupplyKinds.includes(kind)
  );
}

function inferOutputKindsFromAsk(
  ask: string,
  supplyKinds: BorealSupplyKind[]
): BorealOutputKind[] {
  const normalizedAsk = normalizeSearchText(ask);
  const inferredKinds = new Set<BorealOutputKind>();
  const rules: Array<{
    keywords: string[];
    outputKinds: BorealOutputKind[];
  }> = [
    {
      keywords: ["migration", "hubspot", "airtable", "crm"],
      outputKinds: ["migration_plan", "workflow_build", "handoff_doc"],
    },
    {
      keywords: ["automation", "workflow", "integration"],
      outputKinds: ["workflow_build", "workflow_map", "automation_build"],
    },
    {
      keywords: ["training", "enablement"],
      outputKinds: ["operator_training", "handoff_doc"],
    },
    {
      keywords: ["documentation", "sop", "playbook", "handoff"],
      outputKinds: ["handoff_doc", "workflow_map"],
    },
    {
      keywords: ["inspect", "inspection", "audit", "property"],
      outputKinds: ["inspection_report", "photo_evidence", "verification_note"],
    },
    {
      keywords: ["hardware", "serial", "device", "signage"],
      outputKinds: ["serial_inventory", "photo_evidence", "verification_note"],
    },
    {
      keywords: ["pickup", "dropoff", "courier", "handoff", "deliver"],
      outputKinds: ["delivery_confirmation", "handoff_receipt", "signature"],
    },
    {
      keywords: ["video", "edit", "promo", "launch clip"],
      outputKinds: ["video"],
    },
    {
      keywords: ["draft", "rough cut", "storyboard"],
      outputKinds: ["draft"],
    },
    {
      keywords: ["caption", "subtitle", "srt"],
      outputKinds: ["file"],
    },
    {
      keywords: ["delivery package", "handoff", "publish", "final export"],
      outputKinds: ["delivery", "handoff_doc"],
    },
    {
      keywords: ["file", "template", "playbook", "pack", "download"],
      outputKinds: ["file", "handoff_doc"],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalizedAsk.includes(keyword))) {
      for (const outputKind of rule.outputKinds) {
        inferredKinds.add(outputKind);
      }
    }
  }

  if (inferredKinds.size === 0) {
    if (supplyKinds.includes("provider_capability")) {
      inferredKinds.add("delivery");
      inferredKinds.add("file");
    } else {
      inferredKinds.add("delivery");
      inferredKinds.add("draft");
    }
  }

  return Array.from(inferredKinds).filter((kind) =>
    borealOutputKinds.includes(kind)
  );
}

function inferActorKindsFromAsk(
  ask: string,
  supplyKinds: BorealSupplyKind[]
): BorealActorKind[] {
  const normalizedAsk = normalizeSearchText(ask);
  const actorKinds = new Set<BorealActorKind>();

  if (
    supplyKinds.some((kind) =>
      [
        "migration_lead",
        "documentation_support",
        "field_inspection",
        "field_verification",
        "hardware_ops",
        "human_service",
        "local_runner",
        "operator",
        "pickup_dropoff",
        "qa_documentation",
        "reporting_support",
        "team_service",
      ].includes(kind)
    ) ||
    /\bhuman\b|\bonsite\b|\bvisit\b|\binspect\b|\bcourier\b/.test(normalizedAsk)
  ) {
    actorKinds.add("human");
  }

  if (
    supplyKinds.some((kind) =>
      ["ai_automation", "automation_builder", "agent_worker"].includes(kind)
    ) ||
    /\bai\b|\bagent\b|\bautomation\b/.test(normalizedAsk)
  ) {
    actorKinds.add("agent");
  }

  if (
    supplyKinds.some((kind) =>
      ["provider_capability", "digital_product"].includes(kind)
    ) ||
    /\bapi\b|\bprovider\b|\bdownload\b|\btemplate\b/.test(normalizedAsk)
  ) {
    actorKinds.add("tool");
  }

  if (
    supplyKinds.includes("runtime_executor") ||
    /\bruntime\b|\blocal file\b|\bdesktop\b/.test(normalizedAsk)
  ) {
    actorKinds.add("runtime");
  }

  if (actorKinds.size === 0) {
    actorKinds.add("human");
  }

  return Array.from(actorKinds).filter((kind) =>
    borealActorKinds.includes(kind)
  );
}

function inferBudgetFromAsk(ask: string): RequestPatch["budget"] {
  const normalizedAsk = ask.replace(/,/g, "");
  const rangeMatch = normalizedAsk.match(
    /(?:\$|usd|php)?\s*(\d+(?:\.\d+)?)\s*(k)?\s*(?:to|-)\s*(?:\$|usd|php)?\s*(\d+(?:\.\d+)?)\s*(k)?/i
  );

  if (rangeMatch) {
    const currency = inferCurrencyFromAsk(ask);
    const minAmount = parseLabAmount(rangeMatch[1], rangeMatch[2]);
    const maxAmount = parseLabAmount(rangeMatch[3], rangeMatch[4]);
    if (minAmount != null && maxAmount != null) {
      return {
        mode: "range",
        ...(currency ? { currency } : {}),
        minAmount,
        maxAmount,
      };
    }
  }

  const fixedMatch = normalizedAsk.match(
    /(?:budget|around|for)\s*(?:is|of)?\s*(?:\$|usd|php)?\s*(\d+(?:\.\d+)?)\s*(k)?/i
  );
  if (fixedMatch) {
    const currency = inferCurrencyFromAsk(ask);
    const fixedAmount = parseLabAmount(fixedMatch[1], fixedMatch[2]);
    if (fixedAmount != null) {
      return {
        mode: "fixed",
        ...(currency ? { currency } : {}),
        fixedAmount,
      };
    }
  }

  return null;
}

function inferDeadlineFromAsk(ask: string): RequestPatch["deadline"] {
  const normalizedAsk = ask.trim();
  const patterns = [
    /\b(in about \d+\s+(?:day|days|week|weeks|month|months))\b/i,
    /\b(in \d+\s+(?:day|days|week|weeks|month|months))\b/i,
    /\b(about \d+\s+(?:day|days|week|weeks|month|months))\b/i,
    /\b(before \d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    /\b(today)\b/i,
    /\b(tomorrow)\b/i,
    /\b(this week)\b/i,
    /\b(next week)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedAsk.match(pattern);
    if (match?.[1]) {
      return {
        notes: match[1],
      };
    }
  }

  return null;
}

function shouldUseTeamMode(
  ask: string,
  supplyKinds: BorealSupplyKind[],
  outputKinds: BorealOutputKind[]
) {
  const normalizedAsk = normalizeSearchText(ask);
  return (
    supplyKinds.length >= 2 ||
    outputKinds.length >= 3 ||
    /\bteam\b|\bsquad\b|\bcollab\b|\boperator training\b/.test(normalizedAsk)
  );
}

function inferRouteFamilyFromAsk({
  actorKinds,
  normalizedAsk,
  outputKinds,
  supplyKinds,
}: {
  actorKinds: BorealActorKind[];
  normalizedAsk: string;
  outputKinds: BorealOutputKind[];
  supplyKinds: BorealSupplyKind[];
}): BorealRequestRouteFamily {
  const humanRequired =
    actorKinds.includes("human") ||
    /\bonsite\b|\binspect\b|\bpickup\b|\bcourier\b|\bwitness\b/.test(normalizedAsk);

  if (
    !humanRequired &&
    (supplyKinds.includes("provider_capability") ||
      supplyKinds.includes("digital_product") ||
      outputKinds.includes("file"))
  ) {
    return "direct_tool";
  }

  if (!humanRequired && supplyKinds.length <= 1) {
    return "direct_specialist";
  }

  return "worker_market";
}

function inferExecutionKindFromAsk({
  actorKinds,
  outputKinds,
  routeFamily,
  supplyKinds,
}: {
  actorKinds: BorealActorKind[];
  outputKinds: BorealOutputKind[];
  routeFamily: BorealRequestRouteFamily;
  supplyKinds: BorealSupplyKind[];
}): BorealRequestExecutionKind {
  if (supplyKinds.includes("runtime_executor")) {
    return "local_runtime";
  }

  if (routeFamily === "direct_tool") {
    if (supplyKinds.includes("digital_product") || outputKinds.includes("file")) {
      return "instant_delivery";
    }

    return "provider_api";
  }

  if (actorKinds.includes("human") && actorKinds.includes("agent")) {
    return "hybrid_human_agent";
  }

  if (actorKinds.length === 1 && actorKinds[0] === "agent") {
    return "agent_request_room";
  }

  if (actorKinds.length === 1 && actorKinds[0] === "runtime") {
    return "runtime_request_room";
  }

  if (actorKinds.length === 1 && actorKinds[0] === "tool") {
    return "hybrid_tool_room";
  }

  if (actorKinds.includes("human")) {
    return "human_request_room";
  }

  return "specialist_request_room";
}

function inferPaymentModeFromAsk({
  budget,
  routeFamily,
  supplyKinds,
}: {
  budget: RequestPatch["budget"];
  routeFamily: BorealRequestRouteFamily;
  supplyKinds: BorealSupplyKind[];
}): BorealRequestPaymentMode {
  if (budget?.mode === "range") {
    return "range_quote";
  }

  if (budget?.mode === "fixed") {
    return "fixed_request";
  }

  if (routeFamily === "direct_tool" || supplyKinds.includes("provider_capability")) {
    return "open_pricing";
  }

  return "quote_request";
}

function inferMatchingModeFromAsk(
  routeFamily: BorealRequestRouteFamily
): BorealRequestMatchingMode {
  if (routeFamily === "direct_tool") {
    return "lead_first_then_collaborators";
  }

  return "lead_first_then_collaborators";
}

function inferTitleFromAsk(ask: string) {
  if (!ask) {
    return "Matching lab request";
  }

  const firstSentence = ask.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? ask;
  return firstSentence.slice(0, 90).trim();
}

function inferSummaryFromAsk(ask: string) {
  if (ask.length <= 180) {
    return ask;
  }

  return `${ask.slice(0, 177).trimEnd()}...`;
}

function buildTagsFromAsk(
  ask: string,
  supplyKinds: BorealSupplyKind[],
  outputKinds: BorealOutputKind[]
) {
  const normalizedAsk = normalizeSearchText(ask);
  const tags = new Set<string>();

  for (const keyword of [
    "hubspot",
    "airtable",
    "notion",
    "hardware",
    "inspection",
    "property",
    "courier",
    "handoff",
    "video",
    "api",
    "runtime",
  ]) {
    if (normalizedAsk.includes(keyword)) {
      tags.add(keyword);
    }
  }

  for (const supplyKind of supplyKinds.slice(0, 3)) {
    tags.add(supplyKind);
  }

  for (const outputKind of outputKinds.slice(0, 3)) {
    tags.add(outputKind);
  }

  return Array.from(tags);
}

function buildRouteSummary({
  executionKind,
  routeFamily,
  supplyKinds,
}: {
  executionKind: BorealRequestExecutionKind;
  routeFamily: BorealRequestRouteFamily;
  supplyKinds: BorealSupplyKind[];
}) {
  const leadKinds = supplyKinds
    .slice(0, 3)
    .map((kind) => kind.replace(/_/g, " "))
    .join(", ");

  return `Lab inferred ${routeFamily.replace(/_/g, " ")} via ${executionKind.replace(/_/g, " ")} with candidate lanes in ${leadKinds || "generalist coverage"}.`;
}

function flattenMetadataText(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return "";
  }

  return Object.values(metadata)
    .flatMap((value) => {
      if (typeof value === "string") {
        return [value];
      }

      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === "string");
      }

      return [];
    })
    .map(normalizeSearchText)
    .join(" ");
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenizeSearchText(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

function parseLabAmount(value: string, suffix: string | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return suffix?.toLowerCase() === "k" ? numeric * 1000 : numeric;
}

function inferCurrencyFromAsk(ask: string) {
  const normalizedAsk = ask.toLowerCase();
  if (normalizedAsk.includes("php") || normalizedAsk.includes("₱")) {
    return "PHP";
  }

  if (
    normalizedAsk.includes("usd") ||
    normalizedAsk.includes("$") ||
    normalizedAsk.includes("dollar")
  ) {
    return "USD";
  }

  return undefined;
}

function getBestRoleCandidateForLab({
  matchCandidates,
  roleKey,
}: {
  matchCandidates: BorealRequestDraft["derived"]["matchCandidates"];
  roleKey: BorealRequestRoleKey;
}) {
  return matchCandidates
    .slice()
    .sort((left, right) => {
      const scoreDelta =
        getRoleCandidateScore(right, roleKey) -
        getRoleCandidateScore(left, roleKey);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.overallScore - left.overallScore;
    })[0];
}

function getRoleCandidateScore(
  candidate: BorealRequestDraft["derived"]["matchCandidates"][number],
  roleKey: BorealRequestRoleKey
) {
  return (
    candidate.roleScores.find((roleScore) => roleScore.roleKey === roleKey)?.score ?? 0
  );
}

function roleScoreToConfidenceLabel(score: number) {
  if (score >= 80) {
    return "high";
  }

  if (score >= 45) {
    return "moderate";
  }

  return "low";
}

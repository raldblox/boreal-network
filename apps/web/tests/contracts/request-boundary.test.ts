import assert from "node:assert/strict";
import { selectChatModelRoute } from "@/lib/ai/model-routing";
import { composerChatModels, isComposerChatModelId } from "@/lib/ai/models";
import {
  chatDeleteQuerySchema,
  chatMessagesQuerySchema,
  deleteTrailingMessagesSchema,
  requestByChatQuerySchema,
  votePatchSchema,
  voteQuerySchema,
} from "@/lib/chat-route-validation";
import { getModelProviderRouteEntries } from "@/lib/ai/providers";
import { buildRequestPreflightPreview } from "@/lib/request-preflight";
import { buildDraftRequestFlowGraph } from "@/lib/request-flow";
import {
  type BorealRequestDraft,
  canUseDirectOwnerPrivateFulfillmentLane,
  toPublicRequestPoolEntry,
} from "@/lib/request";
import {
  canReadChatEnvelope,
  canUseRequestChatTranscript,
} from "@/lib/request-chat-access";

assert.equal(
  chatMessagesQuerySchema.safeParse({ chatId: "undefined" }).success,
  false,
);
assert.equal(
  chatMessagesQuerySchema.safeParse({ chatId: "not-a-uuid" }).success,
  false,
);
assert.equal(
  chatMessagesQuerySchema.safeParse({
    chatId: "11111111-1111-4111-8111-111111111111",
  }).success,
  true,
);
assert.equal(
  deleteTrailingMessagesSchema.safeParse({ messageId: "not-a-uuid" }).success,
  false,
);
assert.equal(
  deleteTrailingMessagesSchema.safeParse({
    messageId: "22222222-2222-4222-8222-222222222222",
  }).success,
  true,
);
assert.equal(
  requestByChatQuerySchema.safeParse({ chatId: "undefined" }).success,
  false,
);
assert.equal(
  requestByChatQuerySchema.safeParse({
    chatId: "33333333-3333-4333-8333-333333333333",
  }).success,
  true,
);
assert.equal(voteQuerySchema.safeParse({ chatId: "undefined" }).success, false);
assert.equal(
  voteQuerySchema.safeParse({
    chatId: "44444444-4444-4444-8444-444444444444",
  }).success,
  true,
);
assert.equal(
  votePatchSchema.safeParse({
    chatId: "44444444-4444-4444-8444-444444444444",
    messageId: "not-a-uuid",
    type: "up",
  }).success,
  false,
);
assert.equal(
  votePatchSchema.safeParse({
    chatId: "44444444-4444-4444-8444-444444444444",
    messageId: "55555555-5555-4555-8555-555555555555",
    type: "up",
  }).success,
  true,
);
assert.equal(chatDeleteQuerySchema.safeParse({ id: "not-a-uuid" }).success, false);
assert.equal(
  chatDeleteQuerySchema.safeParse({
    id: "66666666-6666-4666-8666-666666666666",
  }).success,
  true,
);

function makeDraft(
  overrides: Partial<BorealRequestDraft> = {},
): BorealRequestDraft {
  return {
    id: "req_test",
    chatId: "chat_test",
    documentId: "doc_test",
    key: "test-request",
    status: "open",
    visibility: "public",
    createdById: "buyer_1",
    ownerId: "buyer_1",
    brief: {
      title: "Test public request",
      summary: "Public-safe summary",
      body: "Public-safe body",
      constraints: { publicConstraint: true },
      outputKinds: ["delivery"],
      tags: ["pilot"],
    },
    seeking: {
      actorKinds: ["human"],
      supplyKinds: ["human_service"],
      teamMode: "solo_or_team",
      notes: "public-safe notes",
    },
    routing: {
      preferredSupplyId: "owner_private_supply_should_not_project",
    },
    budget: {
      mode: "fixed",
      currency: "USD",
      fixedAmount: 100,
    },
    deadline: null,
    activeRefs: {
      latestArtifactId: "artifact_public",
    },
    latest: {
      summary: "Latest public-safe activity",
      lastEventAt: "2026-05-29T00:00:00.000Z",
    },
    derived: {
      routeFamily: "worker_market",
      executionKind: "human_request_room",
      paymentMode: "fixed_funded_request",
      matchingMode: "lead_first_then_collaborators",
      candidatePool: ["internal_candidate_should_not_project"],
      matchCandidates: [],
      leadRole: "lead",
      roleSlots: [],
      phases: [],
      noMicrotaskExplosion: true,
      outcomeClaims: [],
      leadRanking: [],
      roleMatches: [],
      assignmentProposal: { state: "not_started" },
      replanReasons: ["internal_replan_reason_should_not_project"],
      missingDetails: [],
      readiness: {
        readyForOpen: true,
        readyForMatch: true,
        state: "ready_to_match",
        summary: "Ready for public pilot matching",
      },
      routeSummary: "Human-led pilot lane",
      executionProfile: null,
      embodiedConstraintSet: null,
      verificationPlan: {
        requiredArtifactKinds: [],
        requiredEvidenceClaims: [],
        requiredChecks: [],
      },
      planCollapseRisk: null,
      clarificationNeeded: {
        required: false,
        missingDetails: [],
      },
    },
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  } as BorealRequestDraft;
}

const publicProjection = toPublicRequestPoolEntry(makeDraft());

assert.equal(publicProjection.visibility, "public");
assert.equal("routing" in publicProjection, false);
assert.equal("candidatePool" in publicProjection.derived, false);
assert.equal("matchCandidates" in publicProjection.derived, false);
assert.equal("leadRanking" in publicProjection.derived, false);
assert.equal("assignmentProposal" in publicProjection.derived, false);
assert.equal(publicProjection.derived.routeSummary, "Human-led pilot lane");
assert.equal(publicProjection.agentActionAffordances.schemaVersion, 1);
assert.equal(publicProjection.agentActionAffordances.subject.type, "Request");
assert.equal(publicProjection.agentActionAffordances.subject.id, publicProjection.id);
assert.equal(publicProjection.agentActionAffordances.roleHint, "public_request");
assert.equal(
  publicProjection.agentActionAffordances.actions.some(
    (action) =>
      action.id === "apply_to_request" &&
      action.href.endsWith(`/api/requests/${publicProjection.id}/commitments`) &&
      action.availability === "available_with_auth" &&
      action.canonicalWrites.includes("Commitment") &&
      action.idempotencyRequired
  ),
  true,
);
assert.equal(
  publicProjection.agentActionAffordances.actions.some(
    (action) =>
      action.id === "monitor_request" &&
      action.href.includes("after_sequence=0") &&
      action.canonicalWrites.length === 0
  ),
  true,
);
assert.equal(
  publicProjection.agentActionAffordances.actions.some(
    (action) =>
      action.id === "submit_artifact" &&
      action.availability === "requires_authorization" &&
      action.canonicalWrites.includes("Artifact")
  ),
  true,
);
assert.equal(
  publicProjection.agentActionAffordances.actions.some(
    (action) => action.id === "run_public_solution"
  ),
  false,
);

const publicSolutionProjection = toPublicRequestPoolEntry(
  makeDraft({
    status: "completed",
    activeRefs: {
      acceptedArtifactId: "artifact_accepted",
      latestArtifactId: "artifact_accepted",
    },
  })
);
assert.equal(publicSolutionProjection.agentActionAffordances.roleHint, "public_solution");
assert.equal(
  publicSolutionProjection.agentActionAffordances.actions.some(
    (action) =>
      action.id === "run_public_solution" &&
      action.href.endsWith(`/api/requests/${publicSolutionProjection.id}/solution-runs`) &&
      action.canonicalWrites.includes("Transaction") &&
      action.idempotencyRequired
  ),
  true,
);

const draftFlowRequest = makeDraft({
  status: "draft",
  derived: {
    ...makeDraft().derived,
    readiness: {
      readyForOpen: true,
      readyForMatch: false,
      state: "ready_to_open",
      summary: "Ready to post.",
    },
    phases: [
      {
        phaseKey: "scope_route",
        title: "Confirm scope",
        summary: "Confirm the buyer ask before opening the Request.",
        roleKeys: ["field_inspector"],
        requiredEvidenceClaims: [],
      },
      {
        phaseKey: "proof_delivery",
        title: "Package proof",
        summary: "Attach proof inside the same Request after work is done.",
        roleKeys: ["field_inspector"],
        requiredEvidenceClaims: ["photo_proof"],
      },
    ],
    embodiedConstraintSet: {
      requiresEmbodiedHandling: true,
      executionModes: ["onsite_visit"],
      serviceLocation: "Quezon City",
      timeWindows: ["tomorrow"],
      accessRequirements: [],
      safetyRequirements: [],
      verificationRequirements: ["photo_proof"],
      requiresHumanPresence: true,
      requiresLocalAccess: true,
      requiresVerifiedEvidence: true,
      requiresWitness: false,
    },
    verificationPlan: {
      requiredArtifactKinds: [],
      requiredEvidenceClaims: ["photo_proof"],
      mustHaveOwnerAcceptance: true,
      mustHaveLocationSignal: false,
      mustHaveSignature: false,
    },
    clarificationNeeded: {
      required: false,
      missingDetails: [],
      reasons: [],
    },
  },
});
const draftFlowGraph = buildDraftRequestFlowGraph(draftFlowRequest);
assert.deepEqual(
  draftFlowGraph.nodes.map((node) => node.kind),
  ["request", "phase", "phase"],
);
assert.equal(
  draftFlowGraph.nodes.some(
    (node) => node.kind === "worker" || node.kind === "delivery"
  ),
  false,
);
assert.deepEqual(
  draftFlowGraph.edges.map((edge) => edge.source),
  ["request", "request"],
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "buyer_1",
    request: makeDraft({ visibility: "private" }),
  }),
  true,
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "buyer_1",
    request: makeDraft({ visibility: "public" }),
  }),
  false,
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "responder_1",
    request: makeDraft({ visibility: "private" }),
  }),
  false,
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "buyer_1",
    commitmentId: "commitment_required_lane",
    request: makeDraft({ visibility: "private" }),
  }),
  false,
);

assert.equal(
  canUseRequestChatTranscript({
    hasRequest: false,
    chatOwnerUserId: "buyer_1",
    viewerUserId: "viewer_1",
  }),
  true,
);
assert.equal(
  canUseRequestChatTranscript({
    hasRequest: true,
    chatOwnerUserId: "buyer_1",
    viewerUserId: "buyer_1",
  }),
  true,
);
assert.equal(
  canUseRequestChatTranscript({
    hasRequest: true,
    chatOwnerUserId: "buyer_1",
    viewerUserId: "responder_1",
  }),
  false,
);
assert.equal(
  canUseRequestChatTranscript({
    hasRequest: true,
    chatOwnerUserId: "buyer_1",
    viewerUserId: null,
  }),
  false,
);
assert.equal(
  canReadChatEnvelope({
    hasRequest: false,
    chatVisibility: "public",
    chatOwnerUserId: "buyer_1",
    viewerUserId: null,
  }),
  true,
);
assert.equal(
  canReadChatEnvelope({
    hasRequest: false,
    chatVisibility: "private",
    chatOwnerUserId: "buyer_1",
    viewerUserId: "viewer_1",
  }),
  false,
);
assert.equal(
  canReadChatEnvelope({
    hasRequest: true,
    requestStatus: "draft",
    requestVisibility: "public",
    chatVisibility: "public",
    chatOwnerUserId: "buyer_1",
    viewerUserId: "viewer_1",
  }),
  false,
);
assert.equal(
  canReadChatEnvelope({
    hasRequest: true,
    requestStatus: "open",
    requestVisibility: "public",
    chatVisibility: "private",
    chatOwnerUserId: "buyer_1",
    viewerUserId: "viewer_1",
  }),
  true,
);
assert.equal(
  canReadChatEnvelope({
    hasRequest: true,
    requestStatus: "open",
    requestVisibility: "private",
    chatVisibility: "public",
    chatOwnerUserId: "buyer_1",
    viewerUserId: "viewer_1",
  }),
  false,
);

const lightModelRoute = selectChatModelRoute({
  requestedModelId: "openai/gpt-5.4-nano",
  modelMessages: [{ role: "user", content: "short request" }],
  hasActiveRequest: false,
  recentActivityCount: 0,
  requestMode: false,
});

assert.equal(lightModelRoute.effectiveModelId, "openai/gpt-5.4-nano");
assert.deepEqual(lightModelRoute.fallbackModelIds, [
  "openai/gpt-5.4-mini",
  "openai/o3-mini",
  "openai/o4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
]);

const heavyModelRoute = selectChatModelRoute({
  requestedModelId: "openai/gpt-5.4-nano",
  modelMessages: [{ role: "user", content: "x".repeat(60_000) }],
  hasActiveRequest: false,
  recentActivityCount: 0,
  requestMode: false,
});

assert.equal(heavyModelRoute.effectiveModelId, "openai/gpt-5.4-mini");
assert.deepEqual(heavyModelRoute.fallbackModelIds, [
  "openai/o3-mini",
  "openai/o4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
]);

const requestedFallbackRoute = selectChatModelRoute({
  requestedModelId: "openai/o3-mini",
  modelMessages: [{ role: "user", content: "reason through this request" }],
  hasActiveRequest: true,
  recentActivityCount: 0,
  requestMode: false,
});

assert.equal(requestedFallbackRoute.effectiveModelId, "openai/o3-mini");
assert.deepEqual(requestedFallbackRoute.fallbackModelIds, [
  "openai/o4-mini",
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
]);

assert.deepEqual(
  composerChatModels.map((model) => model.id),
  [
    "openai/gpt-5.4-nano",
    "openai/gpt-5.4-mini",
    "openai/o3-mini",
    "openai/o4-mini",
    "openai/gpt-5-mini",
    "openai/gpt-4.1-nano",
  ],
);
assert.equal(isComposerChatModelId("openai/gpt-5.4-mini"), true);
assert.equal(isComposerChatModelId("openai/gpt-5-pro"), false);
assert.equal(isComposerChatModelId("openai/gpt-5.1-codex-mini"), false);

const fuzzyPreflight = buildRequestPreflightPreview([
  {
    role: "user",
    parts: [
      {
        type: "text",
        text: "Need someone to inspect a used car before I buy it",
      },
    ],
  },
  {
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Where is the car located, and what proof should the inspector capture?",
      },
    ],
  },
]);

assert.equal(
  fuzzyPreflight.capturedAsk,
  "Need someone to inspect a used car before I buy it",
);
assert.equal(fuzzyPreflight.readyToDraft, false);
assert.deepEqual(fuzzyPreflight.missingEssentials, [
  "Proof or acceptance",
  "Location or access",
]);
assert.equal(
  fuzzyPreflight.nextQuestion,
  "Where is the car located, and what proof should the inspector capture?",
);

const readyPreflight = buildRequestPreflightPreview([
  {
    role: "user",
    parts: [
      {
        type: "text",
        text: "I need an in person technician to inspect a used car in Quezon City tomorrow. Done means I get a photo report and video proof confirming condition before I buy. Budget is under $80.",
      },
    ],
  },
]);

assert.equal(readyPreflight.readyToDraft, true);
assert.deepEqual(readyPreflight.missingEssentials, []);
assert.equal(readyPreflight.humanOrLocalNeeds.length > 0, true);
assert.equal(readyPreflight.proofNeeds.length > 0, true);
assert.equal(readyPreflight.budget, "Budget is under $80.");
assert.equal(readyPreflight.deadline, "tomorrow.");

const originalOpenAIKey = process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;
assert.deepEqual(getModelProviderRouteEntries(["openai/gpt-5.4-nano"]), [
  {
    kind: "vercel_gateway",
    modelId: "openai/gpt-5.4-nano",
    providerModelId: "openai/gpt-5.4-nano",
  },
]);

process.env.OPENAI_API_KEY = "test-key";
assert.deepEqual(getModelProviderRouteEntries(["openai/gpt-5.4-nano"]), [
  {
    kind: "openai_direct",
    modelId: "openai/gpt-5.4-nano",
    providerModelId: "gpt-5.4-nano",
  },
  {
    kind: "vercel_gateway",
    modelId: "openai/gpt-5.4-nano",
    providerModelId: "openai/gpt-5.4-nano",
  },
]);

if (originalOpenAIKey === undefined) {
  delete process.env.OPENAI_API_KEY;
} else {
  process.env.OPENAI_API_KEY = originalOpenAIKey;
}

console.log("Request boundaries and model routing passed.");

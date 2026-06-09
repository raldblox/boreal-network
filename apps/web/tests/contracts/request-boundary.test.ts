import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selectChatModelRoute } from "@/lib/ai/model-routing";
import { composerChatModels, isComposerChatModelId } from "@/lib/ai/models";
import { getModelProviderRouteEntries } from "@/lib/ai/providers";
import {
  createHumanizerSupplyDraft,
  humanizerWorker,
  humanizerWorkerArtifactSchema,
} from "@/lib/boreal-workers/humanizer";
import { listBorealWorkers } from "@/lib/boreal-workers/registry";
import { getBorealWorkerKeyFromSupply } from "@/lib/boreal-workers/starter-catalog";
import {
  borealWorkerArtifactDescriptorSchema,
  borealWorkerStoredAssetSchema,
} from "@/lib/boreal-workers/types";
import {
  videoGenerationWorkerArtifactSchema,
} from "@/lib/boreal-workers/video-generation";
import {
  chatDeleteQuerySchema,
  chatMessagesQuerySchema,
  deleteTrailingMessagesSchema,
  requestByChatQuerySchema,
  votePatchSchema,
  voteQuerySchema,
} from "@/lib/chat-route-validation";
import {
  applyRequestPatch,
  buildRequestAgentActionCardHints,
  buildRequestAgentActionPolicy,
  type BorealRequestDraft,
  assertOwnerPrivateDirectFulfillmentApproval,
  canUseDirectOwnerPrivateFulfillmentLane,
  createInitialRequestDraft,
  type RequestAgentActionCardHint,
  toPublicRequestPoolEntry,
} from "@/lib/request";
import {
  canReadChatEnvelope,
  canUseRequestChatTranscript,
} from "@/lib/request-chat-access";
import {
  buildBuyerFacingDraftPlanSteps,
  buildDraftRequestFlowGraph,
  getRequestFlowActionOptions,
  getRequestFlowNodeAction,
  getRequestFlowNodeTaxonomy,
} from "@/lib/request-flow";
import { buildRequestPreflightPreview } from "@/lib/request-preflight";
import {
  assertSupplyCanAttachToCommitment,
  resolveFulfillmentSupplyAttachment,
} from "@/lib/request-supply-boundary";

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
assert.equal(
  chatDeleteQuerySchema.safeParse({ id: "not-a-uuid" }).success,
  false,
);
assert.equal(
  chatDeleteQuerySchema.safeParse({
    id: "66666666-6666-4666-8666-666666666666",
  }).success,
  true,
);

const documentBackedWorkerAsset = borealWorkerStoredAssetSchema.parse({
  title: "Humanized launch copy",
  summary: "Document-backed first-party worker output.",
  content: "Plain-language launch copy that preserves buyer facts.",
  documentKind: "text",
});
assert.equal("content" in documentBackedWorkerAsset, true);
const documentBackedWorkerArtifact = borealWorkerArtifactDescriptorSchema.parse({
  artifactKind: "delivery",
  title: "Humanized launch copy",
  summary: "Document-backed worker delivery with review-safe metadata.",
  content: "Plain-language launch copy that preserves buyer facts.",
  documentKind: "text",
  metadata: {
    evidenceClaims: ["owner review required before completion"],
  },
});
assert.equal("content" in documentBackedWorkerArtifact, true);
assert.equal(
  documentBackedWorkerArtifact.metadata?.evidenceClaims?.[0],
  "owner review required before completion",
);
const objectBackedWorkerArtifact = borealWorkerArtifactDescriptorSchema.parse({
  artifactKind: "media",
  mediaKind: "video",
  title: "Launch teaser video",
  container: {
    kind: "object_ref",
    objectKey: "boreal-workers/video-generation/req/video.mp4",
    storageProvider: "vercel_blob",
    mediaKind: "video",
    mimeType: "video/mp4",
  },
});
assert.equal("container" in objectBackedWorkerArtifact, true);
assert.equal(
  videoGenerationWorkerArtifactSchema.safeParse(objectBackedWorkerArtifact)
    .success,
  true,
);
assert.equal(
  videoGenerationWorkerArtifactSchema.safeParse(documentBackedWorkerArtifact)
    .success,
  false,
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
      planningMode: "assisted",
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
      workerEligibility: testWorkerEligibility({
        humanRequired: true,
        policy: "human_first_skip_agents",
        preferredActorKinds: ["human"],
        preferredOutputKinds: ["delivery"],
        preferredSupplyKinds: ["human_service"],
        roleKeys: ["human_lead"],
        shouldWakeAgents: false,
        skipProviderOnlyAgents: true,
        skipReasons: ["human_required_boundary", "human_actor_kind"],
      }),
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

function testWorkerEligibility(
  overrides: Partial<
    BorealRequestDraft["derived"]["workerEligibility"]
  > = {},
): BorealRequestDraft["derived"]["workerEligibility"] {
  return {
    source: "planner_projection",
    policy: "no_agent_signal",
    humanRequired: false,
    shouldWakeAgents: false,
    skipProviderOnlyAgents: true,
    preferredActorKinds: [],
    preferredSupplyKinds: [],
    preferredOutputKinds: [],
    roleKeys: [],
    wakeSignals: [],
    skipReasons: ["no_agent_qualification_signal"],
    namedAgentCandidates: [],
    nonAuthority: [
      "not_matching_or_assignment",
      "no_supply_assigned",
      "no_commitment_created",
      "no_fulfillment_started",
      "no_provider_call",
      "no_payment_authorized",
      "no_request_event_written",
    ],
    ...overrides,
  };
}

assert.equal(
  listBorealWorkers().some((worker) => worker.workerKey === "humanizer"),
  true,
);
const humanizerStarterSupply = createHumanizerSupplyDraft({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userId: "worker_1",
  createdAt: "2026-06-04T00:00:00.000Z",
});
assert.equal(humanizerStarterSupply.profile.displayName, "Boreal Humanizer");
assert.equal(humanizerStarterSupply.status, "draft");
assert.equal(humanizerStarterSupply.visibility, "unlisted");
assert.equal(humanizerStarterSupply.availability.acceptingRequests, true);
assert.deepEqual(humanizerStarterSupply.capability.outputKinds, [
  "draft",
  "handoff_doc",
  "verification_note",
]);
assert.equal(getBorealWorkerKeyFromSupply(humanizerStarterSupply), "humanizer");
assert.equal(
  getBorealWorkerKeyFromSupply({
    key: "generic-docs",
    profile: {
      displayName: "Generic documentation support",
      summary: "Manual documentation help.",
      tags: ["documentation_support"],
    },
    capability: {
      supplyKinds: ["documentation_support"],
      fulfillmentActorKinds: ["human"],
      outputKinds: ["draft"],
      executionChannels: ["request_room"],
    },
    bindings: {},
    metadata: {},
  }),
  null,
);
const humanizerDraft = makeDraft({
  id: "77777777-7777-4777-8777-777777777777",
  brief: {
    title: "Humanize launch copy",
    summary: "Polish the launch copy without inventing shipped features.",
    body: "We need this copy clearer, more founder-led, and more human.",
    outputKinds: ["draft"],
    tags: ["copy"],
  },
  seeking: {
    actorKinds: ["agent"],
    supplyKinds: ["documentation_support"],
    teamMode: "solo_or_team",
    notes: "Audience is early buyers.",
  },
});
assert.equal(humanizerWorker.score(humanizerDraft) > 0, true);
const humanizerInput = humanizerWorker.buildInput(humanizerDraft);
assert.equal(humanizerInput.requestId, humanizerDraft.id);
assert.equal(humanizerInput.requestedTone, "founder_clear");
const humanizerArtifact = humanizerWorker.buildArtifact({
  title: "Humanize launch copy - humanized draft",
  summary: "Owner review required.",
  content: "Boreal turns buyer requests into completed work.",
  documentKind: "text",
});
assert.equal("content" in humanizerArtifact, true);
assert.equal(
  humanizerWorkerArtifactSchema.safeParse(humanizerArtifact).success,
  true,
);
assert.equal(
  humanizerWorker.score(
    makeDraft({
      brief: {
        title: "Create a launch video",
        summary: "Generate media.",
        body: "Need a video clip.",
        outputKinds: ["video"],
        tags: ["video"],
      },
      seeking: {
        actorKinds: ["agent"],
        supplyKinds: ["video_generation"],
      },
    }),
  ),
  0,
);

const publicProjection = toPublicRequestPoolEntry(makeDraft());

function assertNonAuthorityCard(card: RequestAgentActionCardHint) {
  assert.equal(card.authority.permissionGranted, false);
  assert.equal(card.authority.approvalRecorded, false);
  assert.equal(card.authority.credentialIssued, false);
  assert.equal(card.authority.paymentAuthorized, false);
  assert.equal(card.authority.durableWriteCreated, false);
  assert.equal(card.authority.completionProven, false);
}

assert.equal(publicProjection.visibility, "public");
assert.equal("routing" in publicProjection, false);
assert.equal("candidatePool" in publicProjection.derived, false);
assert.equal("matchCandidates" in publicProjection.derived, false);
assert.equal("leadRanking" in publicProjection.derived, false);
assert.equal("assignmentProposal" in publicProjection.derived, false);
assert.equal(publicProjection.derived.routeSummary, "Human-led pilot lane");
assert.equal(
  publicProjection.derived.workerEligibility?.policy,
  "human_first_skip_agents",
);
assert.equal(publicProjection.derived.workerEligibility?.shouldWakeAgents, false);
assert.equal(publicProjection.agentActionCardHints.subject.type, "Request");
assert.equal(publicProjection.agentActionCardHints.subject.id, publicProjection.id);
assert.equal(publicProjection.agentActionCardHints.roleHint, "public_request");
assert.equal(
  publicProjection.agentActionCardHints.authorityBoundary.permissionSource,
  "agentActionPolicy"
);
assert.equal(
  publicProjection.agentActionCardHints.authorityBoundary.nonAuthority.includes(
    "does not grant permission"
  ),
  true
);
const publicApplyCard = publicProjection.agentActionCardHints.cards.find(
  (card) => card.actionId === "apply_to_request"
);
assert.ok(publicApplyCard);
assert.equal(publicApplyCard.title, "Apply with a proposal");
assert.equal(publicApplyCard.state, "requires_auth");
assert.equal(publicApplyCard.humanDecisionRequired, true);
assert.equal(publicApplyCard.policyCheckpoint, "agentActionPolicy");
assert.deepEqual(publicApplyCard.canonicalWritesIfAuthorized, [
  "Commitment",
  "RequestEvent",
]);
assert.equal(
  publicApplyCard.requiredBeforeAction.includes(
    "Read request detail and agentActionPolicy before any write-capable action."
  ),
  true
);
assertNonAuthorityCard(publicApplyCard);
const publicOptimizeCard = publicProjection.agentActionCardHints.cards.find(
  (card) => card.actionId === "optimize_request_brief"
);
assert.ok(publicOptimizeCard);
assert.equal(publicOptimizeCard.state, "target_only");
assert.equal(publicOptimizeCard.humanDecisionRequired, true);
assert.deepEqual(publicOptimizeCard.canonicalWritesIfAuthorized, []);
assertNonAuthorityCard(publicOptimizeCard);

const publicSolutionProjection = toPublicRequestPoolEntry(
  makeDraft({
    status: "completed",
    activeRefs: {
      latestArtifactId: "artifact_public",
      acceptedArtifactId: "artifact_public",
    },
  })
);
const runSolutionCard = publicSolutionProjection.agentActionCardHints.cards.find(
  (card) => card.actionId === "run_public_solution"
);
assert.ok(runSolutionCard);
assert.equal(publicSolutionProjection.agentActionCardHints.roleHint, "public_solution");
assert.equal(runSolutionCard.humanDecisionRequired, true);
assert.equal(
  runSolutionCard.requiredBeforeAction.includes(
    "Confirm buyer payment or credit authority at the solution-run endpoint."
  ),
  true
);
assertNonAuthorityCard(runSolutionCard);

const anonymousPolicyCards = buildRequestAgentActionCardHints(
  buildRequestAgentActionPolicy({
    actor: { kind: "anonymous" },
    request: makeDraft(),
  })
);
const anonymousApplyCard = anonymousPolicyCards.cards.find(
  (card) => card.actionId === "apply_to_request"
);
assert.ok(anonymousApplyCard);
assert.equal(anonymousApplyCard.state, "blocked");
assert.equal(
  anonymousApplyCard.requiredBeforeAction.includes(
    "Stop until the policy reason is resolved."
  ),
  true
);
assert.equal(
  anonymousApplyCard.safeRenderClaims.some((claim) =>
    claim.includes("agentActionPolicy currently reports blocked.")
  ),
  true
);
assertNonAuthorityCard(anonymousApplyCard);

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
const draftPlanSteps = buildBuyerFacingDraftPlanSteps(draftFlowRequest);
const draftPlanNodes = draftFlowGraph.nodes.filter(
  (node) => node.kind === "phase",
);
assert.deepEqual(
  draftFlowGraph.nodes.map((node) => node.kind),
  ["request", "phase", "phase"],
);
assert.equal(
  draftFlowGraph.nodes.some(
    (node) => node.kind === "worker" || node.kind === "delivery",
  ),
  false,
);
assert.deepEqual(
  draftFlowGraph.edges.map((edge) => edge.source),
  ["request", "request"],
);
assert.equal(draftFlowGraph.nodes[0]?.title, draftFlowRequest.brief.title);
assert.deepEqual(
  draftPlanNodes.map((node) => node.title),
  ["Plan 1", "Plan 2"],
);
assert.deepEqual(
  draftPlanNodes.map((node) => node.subtitle),
  draftPlanSteps.map((step) => step.title),
);
assert.deepEqual(
  draftPlanNodes.map((node) => node.summary),
  draftPlanSteps.map((step) => step.summary),
);
assert.equal(
  draftFlowGraph.nodes.every((node) => Boolean(node.dragAction)),
  true,
);
assert.equal(
  draftFlowGraph.nodes.every((node) =>
    node.taxonomy.nextActionIntents.includes(node.dragAction.id)
  ),
  true,
);
assert.equal(
  draftFlowGraph.nodes.every((node) =>
    node.taxonomy.authorityBoundary.nonAuthority.includes(
      "card_taxonomy_is_not_permission"
    )
  ),
  true,
);
assert.equal(draftFlowGraph.nodes[0]?.taxonomy.stageId, "draft_review");
assert.deepEqual(
  draftPlanNodes.map((node) => node.taxonomy.stageId),
  ["path_planning", "path_planning"],
);
assert.deepEqual(
  draftPlanNodes.map((node) => node.taxonomy.cardKind),
  ["action_card", "action_card"],
);
assert.equal(
  draftFlowGraph.nodes[0]?.dragAction.id,
  "make_or_refine_request_plan",
);
assert.equal(draftFlowGraph.nodes[0]?.dragAction.targetNodeKind, "phase");
assert.ok(
  draftFlowGraph.nodes[0]?.dragAction.nonAuthority.includes(
    "no_worker_assignment",
  ),
);
assert.deepEqual(
  draftPlanNodes.map((node) => node.dragAction.id),
  ["prepare_worker_application", "prepare_worker_application"],
);
assert.deepEqual(
  draftPlanNodes.map((node) => node.dragAction.targetNodeKind),
  ["worker", "worker"],
);
const requestFlowActionOptions = getRequestFlowActionOptions(
  draftFlowGraph,
  "request",
);
assert.equal(requestFlowActionOptions.length, 2);
assert.deepEqual(
  requestFlowActionOptions.map((option) => option.nodeId),
  draftPlanNodes.map((node) => node.id),
);
assert.deepEqual(
  requestFlowActionOptions.map((option) => option.virtualTarget),
  [false, false],
);
assert.deepEqual(
  requestFlowActionOptions.map((option) => option.targetNodeKind),
  ["phase", "phase"],
);
const taxonomyBlockedGraph = {
  ...draftFlowGraph,
  nodes: draftFlowGraph.nodes.map((node, index) =>
    index === 0
      ? {
          ...node,
          taxonomy: {
            ...node.taxonomy,
            nextActionIntents: [],
          },
        }
      : node
  ),
};
assert.deepEqual(getRequestFlowActionOptions(taxonomyBlockedGraph, "request"), []);
const firstPlanActionOptions = getRequestFlowActionOptions(
  draftFlowGraph,
  draftPlanNodes[0]?.id ?? "",
);
assert.equal(firstPlanActionOptions.length, 1);
assert.equal(firstPlanActionOptions[0]?.actionId, "prepare_worker_application");
assert.equal(firstPlanActionOptions[0]?.targetNodeKind, "worker");
assert.equal(firstPlanActionOptions[0]?.virtualTarget, true);
assert.equal(firstPlanActionOptions[0]?.nodeId, draftPlanNodes[0]?.id);
assert.equal(
  firstPlanActionOptions[0]?.boundary,
  "worker_application_boundary",
);
assert.deepEqual(firstPlanActionOptions[0]?.canonicalWritesIfAuthorized, [
  "Commitment",
  "Fulfillment",
  "RequestEvent",
]);
for (const nonAuthority of [
  "no_request_mutation",
  "no_worker_assignment",
  "no_commitment_created",
  "no_fulfillment_started",
  "no_artifact_published",
]) {
  assert.ok(firstPlanActionOptions[0]?.nonAuthority.includes(nonAuthority));
}
assert.match(
  firstPlanActionOptions[0]?.description ?? "",
  /target worker card is not present yet/i,
);
assert.deepEqual(getRequestFlowActionOptions(draftFlowGraph, "missing"), []);
assert.deepEqual(
  [
    getRequestFlowNodeAction("request").id,
    getRequestFlowNodeAction("phase").id,
    getRequestFlowNodeAction("stage").id,
    getRequestFlowNodeAction("worker").id,
    getRequestFlowNodeAction("delivery").id,
    getRequestFlowNodeAction("step").id,
  ],
  [
    "make_or_refine_request_plan",
    "prepare_worker_application",
    "prepare_worker_application",
    "review_worker_delivery",
    "inspect_delivery_proof",
    "inspect_delivery_proof",
  ],
);
assert.deepEqual(
  [
    getRequestFlowNodeTaxonomy("request").stageId,
    getRequestFlowNodeTaxonomy("phase").stageId,
    getRequestFlowNodeTaxonomy("stage").stageId,
    getRequestFlowNodeTaxonomy("worker").stageId,
    getRequestFlowNodeTaxonomy("delivery").stageId,
    getRequestFlowNodeTaxonomy("step").stageId,
  ],
  [
    "draft_review",
    "path_planning",
    "path_planning",
    "fulfillment_handoff",
    "proof_submission",
    "proof_submission",
  ],
);
assert.equal(
  (draftPlanNodes[1]?.position.y ?? 0) - (draftPlanNodes[0]?.position.y ?? 0) >=
    248,
  true,
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

assert.doesNotThrow(() =>
  assertOwnerPrivateDirectFulfillmentApproval({
    approval: {
      mode: "trusted_worker_auto_approval",
      approvedByOwner: true,
      selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      workerKey: "video-generation",
    },
    selectedSupplyId: "11111111-1111-4111-8111-111111111111",
    workerKey: "video-generation",
  })
);
assert.throws(
  () =>
    assertOwnerPrivateDirectFulfillmentApproval({
      selectedSupplyId: "11111111-1111-4111-8111-111111111111",
    }),
  /requires auto-approval evidence/
);
assert.throws(
  () =>
    assertOwnerPrivateDirectFulfillmentApproval({
      approval: {
        mode: "trusted_worker_auto_approval",
        approvedByOwner: true,
        selectedSupplyId: "22222222-2222-4222-8222-222222222222",
      },
      selectedSupplyId: "11111111-1111-4111-8111-111111111111",
    }),
  /approval supply mismatch/
);
assert.throws(
  () =>
    assertOwnerPrivateDirectFulfillmentApproval({
      approval: {
        mode: "trusted_worker_auto_approval",
        approvedByOwner: true,
        selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      },
      selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      workerKey: "video-generation",
    }),
  /approval worker key required/
);
assert.throws(
  () =>
    assertOwnerPrivateDirectFulfillmentApproval({
      approval: {
        mode: "trusted_worker_auto_approval",
        approvedByOwner: true,
        selectedSupplyId: "11111111-1111-4111-8111-111111111111",
        workerKey: "humanizer",
      },
      selectedSupplyId: "11111111-1111-4111-8111-111111111111",
      workerKey: "video-generation",
    }),
  /approval worker mismatch/
);

assert.doesNotThrow(() =>
  assertSupplyCanAttachToCommitment({
    actorUserId: "worker_1",
    actorResolverClientId: "resolver_1",
    request: {
      brief: {
        outputKinds: ["delivery"],
      },
      seeking: {
        supplyKinds: ["human_service"],
      },
    },
    supply: {
      ownerId: "worker_1",
      status: "published",
      capability: {
        outputKinds: ["delivery"],
        supplyKinds: ["human_service"],
      },
      bindings: {
        resolverClientId: "resolver_1",
      },
    },
  })
);
assert.doesNotThrow(() =>
  assertSupplyCanAttachToCommitment({
    actorUserId: "worker_1",
    request: {
      brief: {
        outputKinds: ["draft"],
      },
      seeking: {
        supplyKinds: ["documentation_support"],
      },
    },
    supply: {
      ownerId: "worker_1",
      status: "published",
      capability: {
        outputKinds: ["draft", "handoff_doc", "verification_note"],
        supplyKinds: ["agent_worker", "documentation_support"],
      },
    },
  })
);
assert.throws(
  () =>
    assertSupplyCanAttachToCommitment({
      actorUserId: "worker_1",
      supply: {
        ownerId: "other_worker",
        status: "published",
      },
    }),
  /Supply does not belong to commitment actor/
);
assert.throws(
  () =>
    assertSupplyCanAttachToCommitment({
      actorUserId: "worker_1",
      supply: {
        ownerId: "worker_1",
        status: "draft",
      },
    }),
  /Published supply required/
);
assert.throws(
  () =>
    assertSupplyCanAttachToCommitment({
      actorUserId: "worker_1",
      actorResolverClientId: "resolver_2",
      supply: {
        ownerId: "worker_1",
        status: "published",
        bindings: {
          resolverClientId: "resolver_1",
        },
      },
    }),
  /Supply is not bound to this resolver client/
);
assert.throws(
  () =>
    assertSupplyCanAttachToCommitment({
      actorUserId: "worker_1",
      request: {
        seeking: {
          supplyKinds: ["video_generation"],
        },
      },
      supply: {
        ownerId: "worker_1",
        status: "published",
        capability: {
          supplyKinds: ["documentation_support"],
        },
      },
    }),
  /Supply does not match request supply kinds/
);
assert.throws(
  () =>
    assertSupplyCanAttachToCommitment({
      actorUserId: "worker_1",
      request: {
        brief: {
          outputKinds: ["video"],
        },
      },
      supply: {
        ownerId: "worker_1",
        status: "published",
        capability: {
          outputKinds: ["handoff_doc"],
        },
      },
    }),
  /Supply does not match request output kinds/
);

assert.equal(
  resolveFulfillmentSupplyAttachment({
    commitmentSupplyId: "11111111-1111-4111-8111-111111111111",
  }),
  "11111111-1111-4111-8111-111111111111",
);
assert.equal(
  resolveFulfillmentSupplyAttachment({
    commitmentSupplyId: "11111111-1111-4111-8111-111111111111",
    suppliedSupplyId: "11111111-1111-4111-8111-111111111111",
  }),
  "11111111-1111-4111-8111-111111111111",
);
assert.equal(
  resolveFulfillmentSupplyAttachment({
    directOwnerPreferredSupplyId: "33333333-3333-4333-8333-333333333333",
  }),
  "33333333-3333-4333-8333-333333333333",
);
assert.throws(
  () =>
    resolveFulfillmentSupplyAttachment({
      commitmentSupplyId: "11111111-1111-4111-8111-111111111111",
      suppliedSupplyId: "22222222-2222-4222-8222-222222222222",
    }),
  /Commitment supply mismatch/,
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

const storefrontFixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../../../fixtures/request/public-storefront-photo-readiness.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
);
const storefrontPreflight = buildRequestPreflightPreview([
  {
    role: "user",
    parts: [
      {
        type: "text",
        text: storefrontFixture.requestInput.rawAsk,
      },
    ],
  },
]);

assert.equal(storefrontPreflight.readyToDraft, true);
assert.deepEqual(storefrontPreflight.missingEssentials, []);

const storefrontDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_storefront_photo",
    chatId: "chat_storefront_photo",
    documentId: "doc_storefront_photo",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  storefrontFixture.requestPatch,
  "2026-06-01T00:01:00.000Z",
);

assert.equal(storefrontDraft.derived.readiness.readyForOpen, true);
assert.equal(
  storefrontDraft.derived.executionProfile.requiresHumanPresence,
  true,
);
assert.equal(
  storefrontDraft.derived.executionProfile.requiresLocalAccess,
  true,
);
assert.equal(
  storefrontDraft.derived.executionProfile.requiresVerifiedEvidence,
  true,
);
assert.deepEqual(
  storefrontDraft.derived.embodiedConstraintSet.serviceLocation,
  storefrontFixture.expectedDerived.embodiedConstraintSet.serviceLocation,
);
assert.deepEqual(
  storefrontDraft.derived.embodiedConstraintSet.timeWindows,
  storefrontFixture.expectedDerived.embodiedConstraintSet.timeWindows,
);
assert.deepEqual(
  storefrontDraft.derived.embodiedConstraintSet.verificationRequirements,
  storefrontFixture.expectedDerived.embodiedConstraintSet
    .verificationRequirements,
);
assert.equal(
  storefrontFixture.expectedDerived.missingDetailsExcluded.every(
    (detail: string) =>
      !storefrontDraft.derived.missingDetails.includes(detail),
  ),
  true,
);
assert.equal(
  storefrontDraft.derived.workerEligibility.policy,
  "human_first_skip_agents",
);
assert.equal(storefrontDraft.derived.workerEligibility.humanRequired, true);
assert.equal(storefrontDraft.derived.workerEligibility.shouldWakeAgents, false);
assert.equal(
  storefrontDraft.derived.workerEligibility.skipProviderOnlyAgents,
  true,
);
assert.ok(
  storefrontDraft.derived.workerEligibility.skipReasons.includes(
    "human_required_boundary",
  ),
);

const outputOnlyDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_output_only_draft",
    chatId: "chat_output_only_draft",
    documentId: "doc_output_only_draft",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  {
    brief: {
      body: "Draft a short launch note.",
      outputKinds: ["draft"],
    },
  },
  "2026-06-01T00:03:00.000Z",
);

assert.equal(outputOnlyDraft.derived.workerEligibility.shouldWakeAgents, false);
assert.equal(
  outputOnlyDraft.derived.workerEligibility.wakeSignals.includes(
    "output:draft",
  ),
  false,
);
assert.equal(
  outputOnlyDraft.derived.workerEligibility.namedAgentCandidates.every(
    (candidate) => candidate.readiness === "skip",
  ),
  true,
);

const humanVideoOutputOnlyDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_human_video_output_only",
    chatId: "chat_human_video_output_only",
    documentId: "doc_human_video_output_only",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  {
    brief: {
      body: "Have a human producer inspect footage and deliver a video review.",
      outputKinds: ["video"],
    },
    seeking: {
      actorKinds: ["human"],
      supplyKinds: ["human_service"],
    },
    derived: {
      routeFamily: "worker_market",
    },
  },
  "2026-06-01T00:03:30.000Z",
);

assert.equal(
  humanVideoOutputOnlyDraft.derived.workerEligibility.policy,
  "human_first_skip_agents",
);
assert.equal(
  humanVideoOutputOnlyDraft.derived.workerEligibility.shouldWakeAgents,
  false,
);
assert.equal(
  humanVideoOutputOnlyDraft.derived.workerEligibility.wakeSignals.includes(
    "output:video",
  ),
  false,
);
assert.equal(
  humanVideoOutputOnlyDraft.derived.workerEligibility.namedAgentCandidates.every(
    (candidate) => candidate.readiness === "skip",
  ),
  true,
);

const generatedVideoDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_generated_video",
    chatId: "chat_generated_video",
    documentId: "doc_generated_video",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  {
    brief: {
      body: "Generate a short product teaser video from our launch copy and assets.",
      outputKinds: ["video"],
    },
    seeking: {
      actorKinds: ["agent"],
      supplyKinds: ["video_generation", "provider_capability"],
    },
    derived: {
      executionKind: "provider_api",
      matchingMode: "preferred_supply_tool",
      routeFamily: "direct_tool",
    },
  },
  "2026-06-01T00:04:00.000Z",
);

assert.equal(
  generatedVideoDraft.derived.workerEligibility.policy,
  "wake_named_agents",
);
assert.equal(generatedVideoDraft.derived.workerEligibility.humanRequired, false);
assert.equal(generatedVideoDraft.derived.workerEligibility.shouldWakeAgents, true);
assert.equal(
  generatedVideoDraft.derived.workerEligibility.skipProviderOnlyAgents,
  false,
);
assert.ok(
  generatedVideoDraft.derived.workerEligibility.wakeSignals.includes(
    "supply:video_generation",
  ),
);
assert.ok(
  generatedVideoDraft.derived.workerEligibility.wakeSignals.includes(
    "execution:provider_api",
  ),
);
const generatedVideoMiraCandidate =
  generatedVideoDraft.derived.workerEligibility.namedAgentCandidates.find(
    (candidate) => candidate.agentKey === "mira-video",
  );
assert.equal(generatedVideoMiraCandidate?.readiness, "can_prepare");
assert.equal(
  generatedVideoMiraCandidate?.suggestedNextAction,
  "prepare_application",
);
assert.ok(
  generatedVideoMiraCandidate?.matchedSignals.includes(
    "supply:video_generation",
  ),
);
const generatedVideoTalaCandidate =
  generatedVideoDraft.derived.workerEligibility.namedAgentCandidates.find(
    (candidate) => candidate.agentKey === "tala-humanizer",
  );
assert.equal(generatedVideoTalaCandidate?.readiness, "skip");
assert.ok(
  generatedVideoTalaCandidate?.skipReasons.includes(
    "provider_media_generation_request",
  ),
);

const humanLedVideoSupportDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_human_led_video_support",
    chatId: "chat_human_led_video_support",
    documentId: "doc_human_led_video_support",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  {
    brief: {
      body: "Have a human producer review the script, then generate a short product teaser video from approved assets.",
      outputKinds: ["video"],
    },
    seeking: {
      actorKinds: ["human", "agent"],
      supplyKinds: ["human_service", "video_generation"],
    },
    derived: {
      executionKind: "hybrid_human_agent",
      routeFamily: "worker_market",
    },
  },
  "2026-06-01T00:04:30.000Z",
);

assert.equal(
  humanLedVideoSupportDraft.derived.workerEligibility.policy,
  "human_first_agent_support",
);
assert.equal(
  humanLedVideoSupportDraft.derived.workerEligibility.humanRequired,
  true,
);
assert.equal(
  humanLedVideoSupportDraft.derived.workerEligibility.shouldWakeAgents,
  true,
);
assert.equal(
  humanLedVideoSupportDraft.derived.workerEligibility.skipProviderOnlyAgents,
  false,
);
assert.equal(
  humanLedVideoSupportDraft.derived.workerEligibility.namedAgentCandidates.find(
    (candidate) => candidate.agentKey === "mira-video",
  )?.readiness,
  "can_prepare",
);

const humanizerAgentDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_humanizer_agent",
    chatId: "chat_humanizer_agent",
    documentId: "doc_humanizer_agent",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  {
    brief: {
      body: "Polish this launch copy so it sounds human without inventing shipped features.",
      outputKinds: ["draft"],
    },
    seeking: {
      actorKinds: ["agent"],
      supplyKinds: ["documentation_support"],
    },
    derived: {
      executionKind: "agent_request_room",
      routeFamily: "direct_specialist",
    },
  },
  "2026-06-01T00:05:00.000Z",
);

assert.equal(
  humanizerAgentDraft.derived.workerEligibility.policy,
  "wake_named_agents",
);
assert.ok(
  humanizerAgentDraft.derived.workerEligibility.wakeSignals.includes(
    "supply:documentation_support",
  ),
);
const humanizerTalaCandidate =
  humanizerAgentDraft.derived.workerEligibility.namedAgentCandidates.find(
    (candidate) => candidate.agentKey === "tala-humanizer",
  );
assert.equal(humanizerTalaCandidate?.readiness, "can_prepare");
assert.equal(humanizerTalaCandidate?.requiredSupplyKind, "documentation_support");
assert.ok(
  humanizerTalaCandidate?.matchedSignals.includes(
    "supply:documentation_support",
  ),
);
assert.equal(
  humanizerAgentDraft.derived.workerEligibility.namedAgentCandidates.find(
    (candidate) => candidate.agentKey === "mira-video",
  )?.readiness,
  "skip",
);

const rawRequestFixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../../../fixtures/request/raw-request-intake-no-planner.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
);
const rawRequestDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_raw_request",
    chatId: "chat_raw_request",
    documentId: "doc_raw_request",
    userId: "buyer_1",
    visibility: "public",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  rawRequestFixture.requestPatch,
  "2026-06-01T00:01:00.000Z",
);

assert.equal(rawRequestDraft.derived.planningMode, "raw");
assert.equal(rawRequestDraft.brief.body, rawRequestFixture.requestInput.rawAsk);
assert.equal(rawRequestDraft.brief.title, rawRequestFixture.expectedDerived.brief.title);
assert.equal(
  rawRequestDraft.brief.summary,
  rawRequestFixture.expectedDerived.brief.summary,
);
assert.equal(rawRequestDraft.key.startsWith(rawRequestFixture.expectedDerived.keyPrefix), true);
assert.equal(rawRequestDraft.derived.readiness.readyForOpen, true);
assert.equal(rawRequestDraft.derived.readiness.readyForMatch, false);
assert.deepEqual(
  rawRequestDraft.derived.executionProfile.executionModes,
  rawRequestFixture.expectedDerived.executionModes,
);
assert.deepEqual(
  rawRequestDraft.derived.embodiedConstraintSet.executionModes,
  rawRequestFixture.expectedDerived.executionModes,
);
assert.equal(
  rawRequestDraft.derived.assignmentProposal.summary,
  rawRequestFixture.expectedDerived.assignmentSummary,
);
assert.equal(rawRequestDraft.derived.workerEligibility.policy, "raw_not_planned");
assert.equal(rawRequestDraft.derived.workerEligibility.shouldWakeAgents, false);
for (const field of rawRequestFixture.expectedDerived
  .emptyPlannerFields as Array<keyof typeof rawRequestDraft.derived>) {
  assert.deepEqual(rawRequestDraft.derived[field], []);
}
assert.equal(rawRequestDraft.derived.leadRole, undefined);
assert.equal(rawRequestDraft.derived.routeFamily, undefined);
assert.equal(rawRequestDraft.derived.routeSummary, undefined);
assert.deepEqual(buildBuyerFacingDraftPlanSteps(rawRequestDraft), []);
assert.deepEqual(
  buildDraftRequestFlowGraph(rawRequestDraft).nodes
    .filter((node) => node.kind === "phase")
    .map((node) => node.id),
  [],
);

const rawRequestResumedWithPlanner = applyRequestPatch(
  rawRequestDraft,
  rawRequestFixture.resumePatch,
  "2026-06-01T00:02:00.000Z",
);

assert.equal(rawRequestResumedWithPlanner.derived.planningMode, "assisted");
assert.equal(rawRequestResumedWithPlanner.id, rawRequestDraft.id);
assert.equal(rawRequestResumedWithPlanner.brief.body, rawRequestDraft.brief.body);
assert.equal(rawRequestResumedWithPlanner.derived.phases.length > 0, true);

const rawShortRequestDraft = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_raw_short",
    chatId: "chat_raw_short",
    documentId: "doc_raw_short",
    userId: "buyer_1",
    visibility: "private",
    createdAt: "2026-06-01T00:00:00.000Z",
  }),
  {
    brief: {
      body: "i need blockchain dev",
    },
    derived: {
      planningMode: "raw",
    },
  },
  "2026-06-01T00:03:00.000Z",
);

assert.equal(rawShortRequestDraft.brief.title, "");
assert.equal(rawShortRequestDraft.brief.summary, "");
assert.equal(rawShortRequestDraft.brief.body, "i need blockchain dev");
assert.equal(rawShortRequestDraft.key.startsWith("request-"), true);
assert.equal(rawShortRequestDraft.key.includes("blockchain"), false);
assert.deepEqual(rawShortRequestDraft.derived.executionProfile.executionModes, []);

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

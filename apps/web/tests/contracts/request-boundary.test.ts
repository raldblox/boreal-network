import assert from "node:assert/strict";
import {
  canUseDirectOwnerPrivateFulfillmentLane,
  toPublicRequestPoolEntry,
  type BorealRequestDraft,
} from "@/lib/request";

function makeDraft(overrides: Partial<BorealRequestDraft> = {}): BorealRequestDraft {
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

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "buyer_1",
    request: makeDraft({ visibility: "private" }),
  }),
  true
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "buyer_1",
    request: makeDraft({ visibility: "public" }),
  }),
  false
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "responder_1",
    request: makeDraft({ visibility: "private" }),
  }),
  false
);

assert.equal(
  canUseDirectOwnerPrivateFulfillmentLane({
    actorUserId: "buyer_1",
    commitmentId: "commitment_required_lane",
    request: makeDraft({ visibility: "private" }),
  }),
  false
);

console.log("Request public projection and owner-private fulfillment boundaries passed.");

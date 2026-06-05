import assert from "node:assert/strict";
import {
  homeBetaWorkCards,
  showcaseRequestCatalog,
} from "@/lib/showcase-request-catalog";
import {
  borealServiceFamilies,
  buildServiceRequestStarterText,
} from "@/lib/service-catalog";

const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const expectedSlotKeys = [
  "request",
  "plan",
  "workers",
  "funding",
  "outcome",
] as const;

assert.equal(showcaseRequestCatalog.length, 8);
assert.equal(homeBetaWorkCards.length, showcaseRequestCatalog.length);

const humanEditorialEntry = showcaseRequestCatalog.find(
  (entry) => entry.catalogKey === "service/human-editorial-polish/publish-polish",
);
assert.ok(humanEditorialEntry);
assert.deepEqual(humanEditorialEntry.request.seeking.actorKinds, [
  "human",
  "agent",
]);
assert.deepEqual(humanEditorialEntry.request.seeking.supplyKinds, [
  "human_service",
  "documentation_support",
  "operator",
]);
assert.equal(
  (humanEditorialEntry.request.seeking.supplyKinds ?? []).includes(
    "provider_capability",
  ),
  false,
);
assert.deepEqual(humanEditorialEntry.request.brief.outputKinds, [
  "draft",
  "handoff_doc",
  "verification_note",
]);
assert.equal(
  humanEditorialEntry.request.brief.constraints?.serviceAttachmentMode,
  "request_starter_no_supply_attached",
);
assert.equal(humanEditorialEntry.request.derived.executionKind, "hybrid_human_agent");
assert.match(
  humanEditorialEntry.request.brief.body ?? "",
  /Attachment mode: request_starter_no_supply_attached/,
);
assert.match(
  humanEditorialEntry.request.brief.body ?? "",
  /Request-flow entry stage: request_intake/,
);
assert.match(
  humanEditorialEntry.request.brief.body ?? "",
  /Request-flow next intents: create_request_draft/,
);
assert.match(
  humanEditorialEntry.request.brief.body ?? "",
  /does not assign a worker, attach Supply, start Fulfillment/,
);
assert.equal(
  humanEditorialEntry.request.brief.constraints?.requestFlowEntryStageId,
  "request_intake",
);
assert.deepEqual(
  humanEditorialEntry.request.brief.constraints?.requestFlowNextActionIntents,
  ["create_request_draft"],
);
assert.deepEqual(
  humanEditorialEntry.request.brief.constraints
    ?.requestFlowPresetPlanRequiredBeforeExecution,
  [
    "buyer-specific brief fields are complete",
    "checkout or payment authority is recorded",
    "selected Supply passes route policy",
    "Commitment or owner-private fulfillment gate succeeds",
  ],
);

for (const family of borealServiceFamilies) {
  const requestFlow = family.requestDefaults.requestFlow;
  assert.equal(requestFlow.entryStageId, "request_intake");
  assert.equal(requestFlow.cardKind, "action_card");
  assert.equal(requestFlow.nextActionIntents.includes("create_request_draft"), true);
  assert.equal(requestFlow.planStageIds.includes("funding_authorization"), true);
  assert.equal(requestFlow.planStageIds.includes("fulfillment_handoff"), true);
  assert.equal(requestFlow.planStageIds.includes("proof_submission"), true);
  assert.equal(
    requestFlow.authorityBoundary.permissionSource,
    "owner_approval",
  );
  assert.equal(
    requestFlow.authorityBoundary.nonAuthority.includes(
      "no_worker_assignment_from_listing",
    ),
    true,
  );
  assert.equal(
    requestFlow.authorityBoundary.nonAuthority.includes(
      "no_fulfillment_started_from_listing",
    ),
    true,
  );
  assert.equal(
    requestFlow.notDoneHere.includes("publish Artifact"),
    true,
  );

  for (const plan of family.plans) {
    assert.equal(plan.requestFlow.cardKind, "status_card");
    assert.equal(plan.requestFlow.stageIds.includes("path_planning"), true);
    assert.equal(
      plan.requestFlow.stageIds.includes("funding_authorization"),
      true,
    );
    assert.equal(
      plan.requestFlow.stageIds.includes("fulfillment_handoff"),
      true,
    );
    assert.equal(plan.requestFlow.stageIds.includes("proof_submission"), true);
    assert.equal(
      plan.requestFlow.plannedActionIntents.includes("authorize_funding"),
      true,
    );
    assert.equal(
      plan.requestFlow.requiredBeforeExecution.includes(
        "selected Supply passes route policy",
      ),
      true,
    );

    const starterText = buildServiceRequestStarterText({ family, plan });
    assert.match(starterText, /Request-flow plan stages:/);
    assert.match(starterText, /Preset plan requires before execution:/);
  }
}

const ids = new Set<string>();
const catalogKeys = new Set<string>();

for (const entry of showcaseRequestCatalog) {
  assert.equal(entry.source.provenance, "showcase_catalog");
  assert.equal(entry.source.databaseBacked, false);
  assert.equal(entry.request.visibility, "public");
  assert.equal(uuidLikePattern.test(entry.request.id), true);
  assert.equal(entry.request.key.startsWith("showcase."), true);
  assert.equal(entry.flowProjection.length, 5);
  assert.deepEqual(
    entry.flowProjection.map((slot) => slot.key),
    expectedSlotKeys,
  );
  assert.equal(entry.request.agentActionCardHints.subject.id, entry.request.id);
  assert.equal(
    entry.request.agentActionCardHints.authorityBoundary.permissionSource,
    "agentActionPolicy",
  );

  for (const card of entry.request.agentActionCardHints.cards) {
    assert.equal(card.authority.permissionGranted, false);
    assert.equal(card.authority.approvalRecorded, false);
    assert.equal(card.authority.credentialIssued, false);
    assert.equal(card.authority.paymentAuthorized, false);
    assert.equal(card.authority.durableWriteCreated, false);
    assert.equal(card.authority.completionProven, false);
  }

  assert.equal(ids.has(entry.request.id), false);
  assert.equal(catalogKeys.has(entry.catalogKey), false);
  ids.add(entry.request.id);
  catalogKeys.add(entry.catalogKey);
}

for (const card of homeBetaWorkCards) {
  const entry = showcaseRequestCatalog.find(
    (candidate) => candidate.request.id === card.id,
  );

  assert.ok(entry);
  assert.equal(card.request.id, entry.request.id);
  assert.equal(card.slots, entry.flowProjection);
  assert.equal(card.taxonomy.canonicalRoot, "Request");
  assert.equal(card.taxonomy.sourceKind, entry.source.kind);
  assert.ok(card.taxonomy.inScope.length > 0);
  assert.ok(card.taxonomy.outOfScope.length > 0);
  assert.ok(card.taxonomy.requestFlow.doneHere.length > 0);
  assert.ok(card.taxonomy.requestFlow.notDoneHere.length > 0);
  assert.equal(
    card.taxonomy.requestFlow.nextActionIntents.includes(
      card.primaryAction.requestFlowActionIntentId,
    ),
    true,
  );
  assert.equal(
    card.taxonomy.requestFlow.authorityBoundary.nonAuthority.includes(
      "listing_card_is_not_permission",
    ),
    true,
  );
  assert.equal(
    card.workroomHref,
    `/home/beta/${encodeURIComponent(entry.request.id)}`,
  );

  if (entry.source.kind === "service_plan") {
    assert.equal(card.primaryAction.actionId, "start_service_request");
    assert.equal(
      card.primaryAction.requestFlowActionIntentId,
      "create_request_draft",
    );
    assert.equal(card.primaryAction.source, "showcaseServiceAdapter");
    assert.equal(card.primaryAction.method, "LOCAL_DRAFT");
    assert.equal(card.taxonomy.listingKind, "service_request_starter");
    assert.equal(card.taxonomy.requestFlow.stageId, "request_intake");
    assert.equal(card.taxonomy.requestFlow.cardKind, "action_card");
    assert.equal(
      card.taxonomy.requestFlow.authorityBoundary.permissionSource,
      "owner_approval",
    );
    assert.equal(
      card.taxonomy.workerAttachment,
      "service_path_known_supply_not_attached",
    );
    assert.equal(card.taxonomy.nextCanonicalBoundary, "Request");
    assert.ok(
      card.taxonomy.outOfScope.includes("not a published Supply listing"),
    );
    assert.equal(
      card.slots.find((slot) => slot.key === "workers")?.state,
      "active",
    );
    assert.match(
      card.slots.find((slot) => slot.key === "workers")?.detail ?? "",
      /attaches after checkout or request routing/,
    );
    assert.equal(
      card.primaryAction.href.includes(
        `showcaseRequestId=${encodeURIComponent(entry.request.id)}`,
      ),
      true,
    );
    assert.equal(card.primaryAction.href.includes("serviceFamilyKey="), true);
    assert.equal(card.filters.includes("services"), true);
    continue;
  }

  assert.equal(card.primaryAction.source, "agentActionCardHints");
  assert.notEqual(card.taxonomy.listingKind, "service_request_starter");
  assert.ok(
    card.taxonomy.outOfScope.includes("no worker assignment from listing") ||
      card.taxonomy.outOfScope.includes(
        "do not mutate the original completed Request",
      ),
  );

  if (entry.request.status === "open") {
    assert.equal(card.primaryAction.actionId, "apply_to_request");
    assert.equal(
      card.primaryAction.requestFlowActionIntentId,
      "propose_commitment",
    );
    assert.equal(card.primaryAction.label, "Prepare proposal");
    assert.equal(card.taxonomy.requestFlow.stageId, "commitment_review");
    assert.equal(card.taxonomy.requestFlow.cardKind, "action_card");
    assert.equal(
      card.taxonomy.requestFlow.authorityBoundary.permissionSource,
      "agentActionPolicy",
    );
    assert.equal(card.taxonomy.nextCanonicalBoundary, "Commitment");
  }

  if (entry.request.status === "completed") {
    assert.equal(card.primaryAction.actionId, "run_public_solution");
    assert.equal(
      card.primaryAction.requestFlowActionIntentId,
      "create_private_run_request",
    );
    assert.equal(card.primaryAction.label, "Prepare paid run");
    assert.equal(card.filters.includes("reuse-ready"), true);
    assert.equal(card.taxonomy.listingKind, "reuse_ready_listing");
    assert.equal(card.taxonomy.requestFlow.stageId, "reuse_export");
    assert.equal(card.taxonomy.requestFlow.cardKind, "action_card");
    assert.equal(
      card.taxonomy.requestFlow.authorityBoundary.permissionSource,
      "account_session",
    );
    assert.equal(card.taxonomy.nextCanonicalBoundary, "NewRequestFromArtifact");
  }
}

console.log("Showcase request catalog passed.");

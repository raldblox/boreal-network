import assert from "node:assert/strict";
import {
  homeBetaWorkCards,
  showcaseRequestCatalog,
} from "@/lib/showcase-request-catalog";

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

  if (entry.source.kind === "service_plan") {
    assert.equal(card.primaryAction.actionId, "start_service_request");
    assert.equal(card.primaryAction.source, "showcaseServiceAdapter");
    assert.equal(card.primaryAction.method, "LOCAL_DRAFT");
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

  if (entry.request.status === "open") {
    assert.equal(card.primaryAction.actionId, "apply_to_request");
    assert.equal(card.primaryAction.label, "Prepare proposal");
  }

  if (entry.request.status === "completed") {
    assert.equal(card.primaryAction.actionId, "run_public_solution");
    assert.equal(card.primaryAction.label, "Prepare paid run");
    assert.equal(card.filters.includes("reuse-ready"), true);
  }
}

console.log("Showcase request catalog passed.");

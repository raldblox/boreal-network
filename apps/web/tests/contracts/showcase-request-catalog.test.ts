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
  assert.equal(card.taxonomy.canonicalRoot, "Request");
  assert.equal(card.taxonomy.sourceKind, entry.source.kind);
  assert.ok(card.taxonomy.inScope.length > 0);
  assert.ok(card.taxonomy.outOfScope.length > 0);
  assert.equal(
    card.workroomHref,
    `/home/beta/${encodeURIComponent(entry.request.id)}`,
  );

  if (entry.source.kind === "service_plan") {
    assert.equal(card.primaryAction.actionId, "start_service_request");
    assert.equal(card.primaryAction.source, "showcaseServiceAdapter");
    assert.equal(card.primaryAction.method, "LOCAL_DRAFT");
    assert.equal(card.taxonomy.listingKind, "service_request_starter");
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
    assert.equal(card.primaryAction.label, "Prepare proposal");
    assert.equal(card.taxonomy.nextCanonicalBoundary, "Commitment");
  }

  if (entry.request.status === "completed") {
    assert.equal(card.primaryAction.actionId, "run_public_solution");
    assert.equal(card.primaryAction.label, "Prepare paid run");
    assert.equal(card.filters.includes("reuse-ready"), true);
    assert.equal(card.taxonomy.listingKind, "reuse_ready_listing");
    assert.equal(card.taxonomy.nextCanonicalBoundary, "NewRequestFromArtifact");
  }
}

console.log("Showcase request catalog passed.");

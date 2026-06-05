import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findJsonSchemaAsset } from "@/lib/agent-discovery";
import {
  getRequestFlowCardTemplate,
  getRequestFlowStage,
  requestFlowActionMethods,
  requestFlowActorModes,
  requestFlowCanonicalObjects,
  requestFlowCardKinds,
  requestFlowCardTemplates,
  requestFlowStageCatalog,
  requestFlowStageIds,
  requestFlowTaxonomyProfile,
} from "@/lib/request-flow-taxonomy";

type JsonRecord = Record<string, any>;

const schema = readJson(
  "schemas/json/request-flow-stage-card-taxonomy.schema.json"
);
const fixture = readJson(
  "fixtures/request/request-flow-stage-card-taxonomy.sample.json"
);

const forbiddenRootObjects = [
  "Work",
  "Job",
  "Order",
  "Issue",
  "Offer",
  "Intent",
  "Task",
  "Workflow",
  "Solution",
] as const;

assert.equal(schema.title, "RequestFlowStageCardTaxonomy");
assert.equal(
  schema.properties.status.const,
  requestFlowTaxonomyProfile.status
);
assert.deepEqual(schema.$defs.stageId.enum, [...requestFlowStageIds]);
assert.deepEqual(schema.$defs.cardKind.enum, [...requestFlowCardKinds]);
assert.deepEqual(schema.$defs.actorMode.enum, [...requestFlowActorModes]);
assert.deepEqual(
  schema.$defs.canonicalObject.enum,
  [...requestFlowCanonicalObjects]
);
assert.deepEqual(schema.$defs.actionMethod.enum, [...requestFlowActionMethods]);

assert.equal(
  findJsonSchemaAsset("request-flow-stage-card-taxonomy.schema.json")
    ?.sourcePath,
  "schemas/json/request-flow-stage-card-taxonomy.schema.json"
);

assert.equal(requestFlowTaxonomyProfile.schemaVersion, 1);
assert.equal(requestFlowTaxonomyProfile.canonicalBoundary.rootObject, "Request");
assert.equal(
  requestFlowTaxonomyProfile.canonicalBoundary.stageAndCardAre,
  "projection_taxonomy"
);
for (const forbidden of forbiddenRootObjects) {
  assert.equal(
    requestFlowTaxonomyProfile.canonicalBoundary.notRootObjects.includes(
      forbidden
    ),
    true,
    `${forbidden} must stay non-root in request-flow taxonomy`
  );
}

assert.deepEqual(fixture.closedEnums.stageIds, [...requestFlowStageIds]);
assert.deepEqual(fixture.closedEnums.cardKinds, [...requestFlowCardKinds]);
assert.deepEqual(fixture.closedEnums.actorModes, [...requestFlowActorModes]);
assert.deepEqual(
  fixture.closedEnums.canonicalObjects,
  [...requestFlowCanonicalObjects]
);
assert.deepEqual(fixture.closedEnums.actionMethods, [...requestFlowActionMethods]);
assert.equal(fixture.canonicalBoundary.rootObject, "Request");

const stageIds = new Set(requestFlowStageIds);
const cardKinds = new Set(requestFlowCardKinds);
const actorModes = new Set(requestFlowActorModes);
const canonicalObjects = new Set(requestFlowCanonicalObjects);
const actionMethods = new Set(requestFlowActionMethods);
const stageCatalogIds = new Set(requestFlowStageCatalog.map((stage) => stage.id));

assert.equal(requestFlowStageCatalog.length, requestFlowStageIds.length);
assert.deepEqual(stageCatalogIds, stageIds);
assert.ok(getRequestFlowStage("commitment_review"));

for (const stage of requestFlowStageCatalog) {
  assert.equal(stage.schemaVersion, 1);
  assert.equal(stage.canonicalProjection, "RequestFlowStage");
  assert.equal(stage.recoveryStageId, "recovery");
  assertNonEmpty(stage.doneHere, `${stage.id}.doneHere`);
  assertNonEmpty(stage.notDoneHere, `${stage.id}.notDoneHere`);
  assertNonEmpty(stage.forbiddenWrites, `${stage.id}.forbiddenWrites`);
  assertAllowedValues(stage.actorModes, actorModes, `${stage.id}.actorModes`);
  assertAllowedValues(
    stage.canonicalReads,
    canonicalObjects,
    `${stage.id}.canonicalReads`
  );
  assertAllowedValues(
    stage.allowedCanonicalWrites,
    canonicalObjects,
    `${stage.id}.allowedCanonicalWrites`
  );
  assertAllowedValues(stage.nextStageIds, stageIds, `${stage.id}.nextStageIds`);
}

const cardIds = new Set(requestFlowCardTemplates.map((card) => card.id));
const actionIds = new Set<string>();
assert.ok(getRequestFlowCardTemplate("commitment_review.proposal"));

for (const card of requestFlowCardTemplates) {
  assert.equal(card.schemaVersion, 1);
  assert.equal(stageIds.has(card.stageId), true);
  assert.equal(card.id.startsWith(`${card.stageId}.`), true);
  assert.equal(cardKinds.has(card.cardKind), true);
  assertAllowedValues(card.actorModes, actorModes, `${card.id}.actorModes`);
  assertNonEmpty(card.in, `${card.id}.in`);
  assertNonEmpty(card.out, `${card.id}.out`);
  assertNonEmpty(card.doneHere, `${card.id}.doneHere`);
  assertNonEmpty(card.notDoneHere, `${card.id}.notDoneHere`);
  assertNonEmpty(card.requiredBeforeAction, `${card.id}.requiredBeforeAction`);
  assertNonEmpty(card.safeRenderClaims, `${card.id}.safeRenderClaims`);
  assertNonEmpty(card.unsafeClaims, `${card.id}.unsafeClaims`);
  assertAllowedValues(card.next.stageIds, stageIds, `${card.id}.next.stageIds`);
  assert.equal(stageIds.has(card.next.safeFallbackStageId), true);
  assertAction(card.primaryAction, `${card.id}.primaryAction`);
  actionIds.add(card.primaryAction.id);

  for (const action of card.supportingActions) {
    assertAction(action, `${card.id}.supportingAction.${action.id}`);
    actionIds.add(action.id);
  }

  if (card.primaryAction.method === "ADAPTER_EXPORT") {
    assert.equal(card.primaryAction.targetAdapter, "n8n");
    assert.equal(card.adapterExportPolicy.exportableToN8n, true);
    assert.equal(card.adapterExportPolicy.sidecarRequired, true);
    assert.equal(card.adapterExportPolicy.stripCredentials, true);
    assert.equal(card.adapterExportPolicy.lossinessRequired, true);
  }

  assertNonEmpty(card.unsafeClaims, `${card.id}.unsafeClaims`);
}

for (const policy of requestFlowTaxonomyProfile.adapterMappingPolicies) {
  assert.equal(policy.adapterKind, "n8n");
  assert.equal(policy.roundTripSafe, false);
  assert.equal(policy.sidecarRequired, true);
  assert.equal(policy.stripCredentials, true);
  assert.equal(stageIds.has(policy.stageId), true);
  assertAllowedValues(policy.cardIds, cardIds, `${policy.direction}.cardIds`);
  assertAllowedValues(
    policy.actionIds,
    actionIds,
    `${policy.direction}.actionIds`
  );
  assertNonEmpty(policy.lossiness, `${policy.direction}.lossiness`);
  assertNonEmpty(policy.credentialSlots, `${policy.direction}.credentialSlots`);
}

for (const sampleStage of fixture.stageCatalog) {
  assert.equal(stageIds.has(sampleStage.id), true);
  assertAllowedValues(
    sampleStage.nextStageIds,
    stageIds,
    `${sampleStage.id}.nextStageIds`
  );
}

for (const sampleCard of fixture.cardTemplates) {
  assert.equal(stageIds.has(sampleCard.stageId), true);
  assert.equal(cardKinds.has(sampleCard.cardKind), true);
  assert.equal(sampleCard.id.startsWith(`${sampleCard.stageId}.`), true);
  assertAction(sampleCard.primaryAction, `${sampleCard.id}.primaryAction`);
}

for (const samplePolicy of fixture.adapterMappingPolicies) {
  assert.equal(samplePolicy.adapterKind, "n8n");
  assert.equal(samplePolicy.roundTripSafe, false);
  assert.equal(samplePolicy.sidecarRequired, true);
  assert.equal(samplePolicy.stripCredentials, true);
}

console.log("Request-flow taxonomy contract passed.");

function assertAction(action: JsonRecord, label: string) {
  assert.equal(actionMethods.has(action.method), true, `${label}.method`);

  if (action.method === "POST") {
    assert.equal(typeof action.route, "string", `${label}.route`);
    assert.equal(action.route.startsWith("/api/"), true, `${label}.route`);
    assert.equal(action.idempotencyRequired, true, `${label}.idempotency`);
    assertNonEmpty(action.canonicalWritesIfAuthorized, `${label}.writes`);
    assertAllowedValues(
      action.canonicalWritesIfAuthorized,
      canonicalObjects,
      `${label}.writes`
    );
  }

  if (action.method === "LOCAL_DRAFT") {
    assert.equal(action.route, null, `${label}.localDraftRoute`);
    assert.deepEqual(
      action.canonicalWritesIfAuthorized,
      [],
      `${label}.localDraftWrites`
    );
  }

  if (action.method === "ADAPTER_EXPORT") {
    assert.equal(action.route, null, `${label}.adapterRoute`);
    assert.equal(action.targetAdapter, "n8n", `${label}.targetAdapter`);
    assert.deepEqual(
      action.canonicalWritesIfAuthorized,
      [],
      `${label}.adapterWrites`
    );
  }
}

function assertAllowedValues<T>(
  values: readonly T[],
  allowedValues: Set<T>,
  label: string
) {
  for (const value of values) {
    assert.equal(allowedValues.has(value), true, `${label}: ${String(value)}`);
  }
}

function assertNonEmpty(values: readonly unknown[], label: string) {
  assert.equal(values.length > 0, true, `${label} must not be empty`);
}

function readJson(relativePath: string) {
  const rootPath = join(process.cwd(), relativePath);
  const appPath = join(process.cwd(), "..", "..", relativePath);
  const path = existsSync(rootPath) ? rootPath : appPath;
  return JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
}

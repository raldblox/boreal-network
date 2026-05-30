import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(ROOT, "fixtures/request/idempotency-replay-mutation-surfaces.json");

const requiredSurfaces = new Set([
  "payment",
  "credit",
  "commitment",
  "artifact",
  "fulfillment"
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function stable(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function refLookups(fixture) {
  return {
    requestId: new Map([[fixture.request.id, fixture.request]]),
    commitmentId: byId(fixture.commitments ?? []),
    fulfillmentId: byId(fixture.fulfillments ?? []),
    artifactId: byId(fixture.artifacts ?? []),
    transactionId: byId(fixture.transactions ?? []),
    ledgerEntryId: byId(fixture.buyerCreditLedgerEntries ?? []),
    eventIds: new Map((fixture.events ?? []).map((event) => [event.eventId, event]))
  };
}

function validateRefs(operation, attemptName, attempt, lookups, errors) {
  for (const [refKind, refValue] of Object.entries(attempt.durableRefs ?? {})) {
    if (refKind === "eventIds") {
      for (const eventId of refValue) {
        assert(lookups.eventIds.has(eventId), `${operation.surface} ${attemptName} event ${eventId} must resolve`, errors);
      }
      continue;
    }

    const lookup = lookups[refKind];
    assert(lookup, `${operation.surface} ${attemptName} ref kind ${refKind} is supported`, errors);
    assert(lookup?.has(refValue), `${operation.surface} ${attemptName} ${refKind} ${refValue} must resolve`, errors);
  }
}

function validateOperation(operation, lookups, errors) {
  assert(requiredSurfaces.has(operation.surface), `unexpected idempotency surface ${operation.surface}`, errors);
  assert(operation.method === "POST" || operation.method === "PATCH", `${operation.surface} method must be mutating`, errors);
  assert(operation.endpoint.startsWith("/api/"), `${operation.surface} endpoint must be an API path`, errors);
  assert(operation.idempotencyKey, `${operation.surface} must define idempotencyKey`, errors);

  const { first, replay, conflict } = operation;
  assert(first?.status === "created" || first?.status === "updated", `${operation.surface} first attempt must create or update`, errors);
  assert(replay?.status === "idempotent_replay", `${operation.surface} replay attempt must be idempotent_replay`, errors);
  assert(conflict?.status === "idempotency_conflict", `${operation.surface} conflict attempt must be idempotency_conflict`, errors);
  assert(first.inputFingerprint === replay.inputFingerprint, `${operation.surface} replay input fingerprint must match first attempt`, errors);
  assert(first.inputFingerprint !== conflict.inputFingerprint, `${operation.surface} conflict fingerprint must differ`, errors);
  assert(first.durableWriteCount > 0, `${operation.surface} first attempt must record durable writes`, errors);
  assert(replay.durableWriteCount === 0, `${operation.surface} replay must not create durable writes`, errors);
  assert(conflict.durableWriteCount === 0, `${operation.surface} conflict must not create durable writes`, errors);
  assert(
    stable(first.durableRefs) === stable(replay.durableRefs),
    `${operation.surface} replay must return the same durable refs as first attempt`,
    errors
  );
  assert(
    Object.keys(conflict.durableRefs ?? {}).length === 0,
    `${operation.surface} conflict must not return new durable refs`,
    errors
  );

  validateRefs(operation, "first", first, lookups, errors);
  validateRefs(operation, "replay", replay, lookups, errors);

  if (operation.surface === "credit") {
    assert(first.balanceAfter === replay.balanceAfter, "credit replay must preserve the same balanceAfter", errors);
    assert(conflict.balanceAfter === replay.balanceAfter, "credit conflict must not change balanceAfter", errors);
  }
}

function validateFixture(fixture) {
  const errors = [];
  const lookups = refLookups(fixture);
  const seenSurfaces = new Set();
  const seenKeys = new Set();

  assert(fixture.fixtureType === "idempotency_replay_mutation_surfaces", "fixtureType must be idempotency_replay_mutation_surfaces", errors);
  assert(fixture.scenarioId === "idempotency-replay-mutation-surfaces", "scenarioId must be idempotency-replay-mutation-surfaces", errors);

  for (const operation of fixture.operations ?? []) {
    seenSurfaces.add(operation.surface);
    assert(!seenKeys.has(operation.idempotencyKey), `duplicate operation idempotencyKey ${operation.idempotencyKey}`, errors);
    seenKeys.add(operation.idempotencyKey);
    validateOperation(operation, lookups, errors);
  }

  for (const surface of requiredSurfaces) {
    assert(seenSurfaces.has(surface), `fixture must cover ${surface} idempotency`, errors);
  }

  for (const event of fixture.events ?? []) {
    assert(seenKeys.has(event.idempotencyKey), `event ${event.eventId} must use a covered idempotency key`, errors);
  }

  return errors;
}

const fixture = readJson(fixturePath);
const errors = validateFixture(fixture);

if (errors.length > 0) {
  console.error("Idempotency replay fixture validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validated idempotency replay mutation surfaces.");

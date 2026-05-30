import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePaths = [
  path.join(ROOT, "fixtures/request/public-pilot-happy-path.json")
];

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

function buildLookup(fixture) {
  const request = fixture.request;
  const commitments = byId(fixture.commitments ?? []);
  const fulfillments = byId(fixture.fulfillments ?? []);
  const artifacts = byId(fixture.artifacts ?? []);
  const transactions = byId(fixture.transactions ?? []);

  return {
    request,
    request: new Map([[request.id, request]]),
    commitment: commitments,
    fulfillment: fulfillments,
    artifact: artifacts,
    transaction: transactions
  };
}

function cardTitle(event, record) {
  if (event.eventType.startsWith("commitment.")) {
    return record.summary;
  }
  if (event.eventType.startsWith("artifact.")) {
    return record.title;
  }
  if (event.eventType.startsWith("fulfillment.")) {
    return record.summary;
  }
  if (event.eventType.startsWith("transaction.")) {
    return `${record.kind}:${record.status}`;
  }
  return event.payload?.summary ?? event.payload?.completionNote ?? event.eventType;
}

function replayRequestRoomTimeline(fixture, errors) {
  const lookup = buildLookup(fixture);
  const sortedEvents = [...(fixture.events ?? [])].sort((a, b) => a.sequence - b.sequence);
  const cards = [];

  for (const [index, event] of sortedEvents.entries()) {
    assert(event.sequence === index + 1, `${fixture.scenarioId} event ${event.eventId} sequence must be contiguous`, errors);
    assert(event.requestId === fixture.request.id, `${fixture.scenarioId} event ${event.eventId} must belong to fixture Request`, errors);

    const aggregateRecords = lookup[event.aggregateType];
    assert(aggregateRecords, `${fixture.scenarioId} event ${event.eventId} has unsupported aggregateType ${event.aggregateType}`, errors);

    const aggregateRecord = aggregateRecords?.get(event.aggregateId);
    assert(aggregateRecord, `${fixture.scenarioId} event ${event.eventId} aggregateId ${event.aggregateId} must resolve`, errors);

    cards.push({
      sequence: event.sequence,
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      title: aggregateRecord ? cardTitle(event, aggregateRecord) : event.eventType
    });
  }

  return cards;
}

function validateEventPayloadRefs(fixture, errors) {
  const commitments = byId(fixture.commitments ?? []);
  const fulfillments = byId(fixture.fulfillments ?? []);
  const artifacts = byId(fixture.artifacts ?? []);
  const transactions = byId(fixture.transactions ?? []);

  for (const event of fixture.events ?? []) {
    if (event.payload?.commitmentId) {
      assert(commitments.has(event.payload.commitmentId), `${fixture.scenarioId} event ${event.eventId} payload.commitmentId must resolve`, errors);
    }
    if (event.payload?.fulfillmentId) {
      assert(fulfillments.has(event.payload.fulfillmentId), `${fixture.scenarioId} event ${event.eventId} payload.fulfillmentId must resolve`, errors);
    }
    if (event.payload?.artifactId) {
      assert(artifacts.has(event.payload.artifactId), `${fixture.scenarioId} event ${event.eventId} payload.artifactId must resolve`, errors);
    }
    if (event.payload?.transactionId) {
      assert(transactions.has(event.payload.transactionId), `${fixture.scenarioId} event ${event.eventId} payload.transactionId must resolve`, errors);
    }
  }
}

function validateReplayFixture(fixture) {
  const errors = [];
  const cards = replayRequestRoomTimeline(fixture, errors);
  validateEventPayloadRefs(fixture, errors);

  const replayedTypes = cards.map((card) => card.eventType);
  const expectedTypes = fixture.expectedProjection?.timelineEventTypes;
  assert(Array.isArray(expectedTypes), `${fixture.scenarioId} must define expectedProjection.timelineEventTypes`, errors);
  assert(
    JSON.stringify(replayedTypes) === JSON.stringify(expectedTypes),
    `${fixture.scenarioId} replayed timeline event order must match expected projection`,
    errors
  );

  const hasCommitmentCard = cards.some((card) => card.aggregateType === "commitment");
  const hasArtifactCard = cards.some((card) => card.aggregateType === "artifact");
  const hasFulfillmentCard = cards.some((card) => card.aggregateType === "fulfillment");
  const hasTransactionCard = cards.some((card) => card.aggregateType === "transaction");

  assert(hasCommitmentCard, `${fixture.scenarioId} replay must include Commitment activity`, errors);
  assert(hasArtifactCard, `${fixture.scenarioId} replay must include Artifact activity`, errors);
  assert(hasFulfillmentCard, `${fixture.scenarioId} replay must include Fulfillment activity`, errors);
  assert(hasTransactionCard, `${fixture.scenarioId} replay must include Transaction activity`, errors);

  return errors;
}

const allErrors = [];

for (const fixturePath of fixturePaths) {
  const fixture = readJson(fixturePath);
  allErrors.push(...validateReplayFixture(fixture));
}

if (allErrors.length > 0) {
  console.error("Request-room replay fixture validation failed:\n");
  for (const error of allErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated request-room replay for ${fixturePaths.length} fixture(s).`);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(ROOT, "fixtures/request/public-pilot-happy-path.json");

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

function timestamp(value) {
  return new Date(value).getTime();
}

function eventIndex(events, eventType) {
  return events.findIndex((event) => event.eventType === eventType);
}

function assertContiguousEvents(events, errors) {
  const seenEventIds = new Set();
  const seenIdempotencyKeys = new Set();

  for (const [index, event] of events.entries()) {
    assert(
      event.sequence === index + 1,
      `event ${event.eventId} must have contiguous sequence ${index + 1}`,
      errors
    );
    assert(!seenEventIds.has(event.eventId), `duplicate eventId ${event.eventId}`, errors);
    assert(
      !seenIdempotencyKeys.has(event.idempotencyKey),
      `duplicate idempotencyKey ${event.idempotencyKey}`,
      errors
    );
    seenEventIds.add(event.eventId);
    seenIdempotencyKeys.add(event.idempotencyKey);
  }
}

function validatePublicPilotHappyPath(fixture) {
  const errors = [];
  const request = fixture.request;
  const commitments = fixture.commitments ?? [];
  const fulfillments = fixture.fulfillments ?? [];
  const artifacts = fixture.artifacts ?? [];
  const transactions = fixture.transactions ?? [];
  const events = fixture.events ?? [];
  const commitmentsById = byId(commitments);
  const fulfillmentsById = byId(fulfillments);
  const artifactsById = byId(artifacts);
  const transactionsById = byId(transactions);

  assert(fixture.fixtureType === "public_pilot_happy_path", "fixtureType must be public_pilot_happy_path", errors);
  assert(fixture.scenarioId === "public-pilot-happy-path", "scenarioId must be public-pilot-happy-path", errors);
  assert(request?.id, "fixture must contain one request", errors);
  assert(!Array.isArray(fixture.requests), "fixture must not introduce a second Request collection", errors);
  assert(!Array.isArray(fixture.childRequests), "fixture must not introduce child request roots", errors);
  assert(request.status === "completed", "request must finish completed", errors);
  assert(request.visibility === "public", "pilot happy path must exercise a public request", errors);

  const activeCommitment = commitmentsById.get(request.activeRefs?.activeCommitmentId);
  const activeFulfillment = fulfillmentsById.get(request.activeRefs?.activeFulfillmentId);
  const acceptedArtifact = artifactsById.get(request.activeRefs?.acceptedArtifactId);
  const latestTransaction = transactionsById.get(request.activeRefs?.latestTransactionId);

  assert(activeCommitment, "request activeCommitmentId must resolve to a Commitment", errors);
  assert(activeFulfillment, "request activeFulfillmentId must resolve to a Fulfillment", errors);
  assert(acceptedArtifact, "request acceptedArtifactId must resolve to an Artifact", errors);
  assert(latestTransaction, "request latestTransactionId must resolve to a Transaction", errors);

  for (const commitment of commitments) {
    assert(commitment.requestId === request.id, `commitment ${commitment.id} must attach to the request`, errors);
  }
  for (const fulfillment of fulfillments) {
    assert(fulfillment.requestId === request.id, `fulfillment ${fulfillment.id} must attach to the request`, errors);
  }
  for (const artifact of artifacts) {
    assert(artifact.requestId === request.id, `artifact ${artifact.id} must attach to the request`, errors);
  }
  for (const transaction of transactions) {
    assert(transaction.requestId === request.id, `transaction ${transaction.id} must attach to the request`, errors);
  }
  for (const event of events) {
    assert(event.requestId === request.id, `event ${event.eventId} must attach to the request`, errors);
  }

  assert(activeCommitment?.status === "accepted", "public pilot work must have an accepted Commitment", errors);
  assert(
    activeFulfillment?.commitmentId === activeCommitment?.id,
    "Fulfillment must be authorized by the accepted Commitment",
    errors
  );
  assert(
    activeCommitment?.activeFulfillmentId === activeFulfillment?.id,
    "Commitment must point back to the active Fulfillment",
    errors
  );
  assert(
    activeFulfillment?.artifactIds?.includes(acceptedArtifact?.id),
    "Fulfillment must list the accepted delivery Artifact",
    errors
  );
  assert(
    acceptedArtifact?.fulfillmentId === activeFulfillment?.id,
    "accepted Artifact must point to the active Fulfillment",
    errors
  );

  const verifiedFunding = transactions.find(
    (transaction) =>
      transaction.commitmentId === activeCommitment?.id &&
      ["verified", "settled", "paid_out"].includes(transaction.status) &&
      timestamp(transaction.verifiedAt ?? transaction.settledAt ?? transaction.paidOutAt) <
        timestamp(activeFulfillment?.startedAt)
  );
  assert(verifiedFunding, "payment or credit verification must exist before Fulfillment starts", errors);
  assert(
    timestamp(activeCommitment?.acceptedAt) < timestamp(activeFulfillment?.startedAt),
    "Commitment acceptance must precede Fulfillment start",
    errors
  );
  assert(
    timestamp(acceptedArtifact?.createdAt) >= timestamp(activeFulfillment?.startedAt),
    "Artifact delivery must not predate Fulfillment start",
    errors
  );
  assert(
    timestamp(latestTransaction?.paidOutAt ?? latestTransaction?.settledAt ?? latestTransaction?.verifiedAt) >=
      timestamp(activeFulfillment?.acceptedAt),
    "latest payout or settlement must follow Fulfillment acceptance",
    errors
  );

  assertContiguousEvents(events, errors);

  const requiredEventTypes = [
    "request.opened",
    "commitment.proposed",
    "commitment.accepted",
    "transaction.verified",
    "fulfillment.created",
    "fulfillment.started",
    "artifact.added",
    "fulfillment.delivered",
    "fulfillment.accepted",
    "transaction.paid_out",
    "request.completed"
  ];

  for (const eventType of requiredEventTypes) {
    assert(eventIndex(events, eventType) >= 0, `missing required event ${eventType}`, errors);
  }

  assert(
    eventIndex(events, "transaction.verified") < eventIndex(events, "fulfillment.started"),
    "transaction.verified event must precede fulfillment.started",
    errors
  );
  assert(
    eventIndex(events, "commitment.accepted") < eventIndex(events, "fulfillment.created"),
    "commitment.accepted event must precede fulfillment.created",
    errors
  );
  assert(
    eventIndex(events, "artifact.added") < eventIndex(events, "fulfillment.delivered"),
    "artifact.added event must precede fulfillment.delivered",
    errors
  );

  const replayedTimeline = events.map((event) => event.eventType);
  assert(
    JSON.stringify(replayedTimeline) === JSON.stringify(fixture.expectedProjection?.timelineEventTypes),
    "expectedProjection.timelineEventTypes must match replayed RequestEvent order",
    errors
  );

  const replayedRefs = {
    requestId: request.id,
    status: request.status,
    activeCommitmentId: activeCommitment?.id,
    activeFulfillmentId: activeFulfillment?.id,
    acceptedArtifactId: acceptedArtifact?.id,
    latestTransactionId: latestTransaction?.id
  };

  for (const [key, value] of Object.entries(replayedRefs)) {
    assert(
      fixture.expectedProjection?.[key] === value,
      `expectedProjection.${key} must replay to ${value}`,
      errors
    );
  }

  return errors;
}

const fixture = readJson(fixturePath);
const errors = validatePublicPilotHappyPath(fixture);

if (errors.length > 0) {
  console.error("Public pilot happy-path fixture validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validated public pilot happy-path fixture.");

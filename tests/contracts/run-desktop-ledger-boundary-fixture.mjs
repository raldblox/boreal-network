import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(ROOT, "fixtures/request/desktop-ledger-boundary.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function hasForbiddenPayloadKey(value, forbiddenKeys) {
  if (!value || typeof value !== "object") {
    return false;
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.includes(key)) {
      return true;
    }
    if (hasForbiddenPayloadKey(child, forbiddenKeys)) {
      return true;
    }
  }

  return false;
}

function validateWebTruth(caseFixture, desktopLocalState, forbiddenKeys, errors) {
  const { desktopExecution, webTruth } = caseFixture;
  const { request, commitments = [], fulfillments = [], artifacts = [], events = [] } = webTruth;
  const activeCommitment = commitments.find((item) => item.id === request.activeRefs?.activeCommitmentId);
  const selectedFulfillment = fulfillments.find((item) => item.id === desktopExecution.selectedFulfillmentId);
  const selectedArtifact = artifacts.find(
    (item) => item.id === request.activeRefs?.acceptedArtifactId || item.id === request.activeRefs?.latestArtifactId
  );

  assert(desktopExecution.selectedRequestId === request.id, `${caseFixture.caseId} must bind desktop to web Request truth`, errors);
  assert(desktopExecution.durableWriteTarget === "boreal_web_api", `${caseFixture.caseId} durable writes must target Boreal web API`, errors);
  assert(webTruth.request.metadata?.sourceOfTruth === "boreal_web", `${caseFixture.caseId} request source of truth must be Boreal web`, errors);
  assert(desktopExecution.syncFullTranscriptByDefault === false, `${caseFixture.caseId} must not sync full transcript by default`, errors);
  assert(desktopExecution.localDurableObjects.length === 0, `${caseFixture.caseId} must not create local durable objects`, errors);
  assert(desktopExecution.requestWorkspace.includes(`.boreal-work/desktop/request-workspaces/${request.id}`), `${caseFixture.caseId} must use a request-scoped desktop workspace`, errors);
  assert(selectedFulfillment, `${caseFixture.caseId} selected Fulfillment must exist in web truth`, errors);
  assert(selectedFulfillment?.requestId === request.id, `${caseFixture.caseId} Fulfillment must attach to selected Request`, errors);
  assert(selectedArtifact, `${caseFixture.caseId} selected Artifact must exist in web truth`, errors);
  assert(selectedArtifact?.requestId === request.id, `${caseFixture.caseId} Artifact must attach to selected Request`, errors);
  assert(selectedArtifact?.fulfillmentId === selectedFulfillment?.id, `${caseFixture.caseId} Artifact must attach to selected Fulfillment`, errors);

  for (const commitment of commitments) {
    assert(commitment.requestId === request.id, `${caseFixture.caseId} Commitment ${commitment.id} must attach to Request`, errors);
  }
  for (const event of events) {
    assert(event.requestId === request.id, `${caseFixture.caseId} event ${event.eventId} must attach to Request`, errors);
    assert(!hasForbiddenPayloadKey(event.payload, forbiddenKeys), `${caseFixture.caseId} event ${event.eventId} contains forbidden desktop payload`, errors);
  }

  if (desktopExecution.trustTier === "owner_private") {
    assert(request.visibility === "private", `${caseFixture.caseId} direct desktop lane must be private`, errors);
    assert(request.owner?.id === desktopLocalState.borealActorId, `${caseFixture.caseId} direct desktop lane must be owned by connected actor`, errors);
    assert(commitments.length === 0, `${caseFixture.caseId} owner-private direct lane should not fake a Commitment`, errors);
    assert(desktopExecution.allowedDirectFulfillmentWithoutCommitment === true, `${caseFixture.caseId} must explicitly allow direct fulfillment`, errors);
    assert(!selectedFulfillment?.commitmentId, `${caseFixture.caseId} direct Fulfillment must omit commitmentId`, errors);
    assert(selectedFulfillment?.metadata?.authorizationKind === "owner_private_direct", `${caseFixture.caseId} must mark owner_private_direct authorization`, errors);
  } else {
    assert(request.visibility === "public", `${caseFixture.caseId} public tracked lane must use public request truth`, errors);
    assert(desktopExecution.allowedDirectFulfillmentWithoutCommitment === false, `${caseFixture.caseId} must forbid direct commitmentless fulfillment`, errors);
    assert(desktopExecution.fullRuntimeBlocked === true, `${caseFixture.caseId} must block Full runtime`, errors);
    assert(desktopExecution.networkEnabled === false, `${caseFixture.caseId} must keep network disabled`, errors);
    assert(desktopExecution.extraWritableRoots.length === 0, `${caseFixture.caseId} must clear extra writable roots`, errors);
    assert(activeCommitment?.status === "accepted", `${caseFixture.caseId} must have an accepted Commitment`, errors);
    assert(selectedFulfillment?.commitmentId === activeCommitment?.id, `${caseFixture.caseId} Fulfillment must use accepted Commitment`, errors);
    assert(
      events.findIndex((event) => event.eventType === "commitment.accepted") <
        events.findIndex((event) => event.eventType === "fulfillment.started"),
      `${caseFixture.caseId} commitment.accepted must precede fulfillment.started`,
      errors
    );
  }
}

function validateDesktopLedgerBoundary(fixture) {
  const errors = [];
  const forbiddenKeys = fixture.forbiddenDurablePayloadKeys ?? [];

  assert(fixture.fixtureType === "desktop_ledger_boundary", "fixtureType must be desktop_ledger_boundary", errors);
  assert(fixture.scenarioId === "desktop-ledger-boundary", "scenarioId must be desktop-ledger-boundary", errors);
  assert(fixture.desktopLocalState.requestLedger === null, "desktop local requestLedger must be null", errors);
  assert(fixture.desktopLocalState.requestEvents.length === 0, "desktop local RequestEvent store must be empty", errors);
  assert(fixture.desktopLocalState.artifacts.length === 0, "desktop local Artifact store must be empty", errors);
  assert(fixture.desktopLocalState.transactions.length === 0, "desktop local Transaction store must be empty", errors);
  assert(fixture.desktopLocalState.durableWriteTarget === "boreal_web_api", "desktop durable write target must be Boreal web API", errors);
  assert(fixture.desktopLocalState.transcriptPersistence.localOnly === true, "desktop transcript must be local-only by default", errors);
  assert(
    fixture.desktopLocalState.transcriptPersistence.persistedToBorealByDefault === false,
    "desktop transcript must not persist to Boreal by default",
    errors
  );

  for (const signal of fixture.desktopLocalState.ephemeralSignals) {
    assert(signal.durable === false, `ephemeral signal ${signal.kind} must not be durable`, errors);
  }

  for (const caseFixture of fixture.cases ?? []) {
    validateWebTruth(caseFixture, fixture.desktopLocalState, forbiddenKeys, errors);
  }

  assert(
    fixture.cases?.some((caseFixture) => caseFixture.caseId === "owner-private-direct-auto-fulfillment"),
    "fixture must include owner-private direct desktop lane",
    errors
  );
  assert(
    fixture.cases?.some((caseFixture) => caseFixture.caseId === "public-tracked-request-commitment-gated"),
    "fixture must include public tracked commitment-gated lane",
    errors
  );

  return errors;
}

const fixture = readJson(fixturePath);
const errors = validateDesktopLedgerBoundary(fixture);

if (errors.length > 0) {
  console.error("Desktop ledger-boundary fixture validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validated desktop ledger-boundary fixture.");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(ROOT, "fixtures/request/public-solution-run-v0.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function validatePublicSolutionRunFixture(fixture) {
  const errors = [];
  const {
    sourceArtifact,
    sourceRequest,
    runRequest,
    transaction,
    ledgerEntry,
  } = fixture;

  assert(
    sourceRequest.status === "completed",
    "sourceRequest must be completed",
    errors
  );
  assert(
    sourceRequest.visibility === "public",
    "sourceRequest must be public",
    errors
  );
  assert(
    sourceRequest.activeRefs?.acceptedArtifactId === sourceArtifact.id,
    "sourceRequest acceptedArtifactId must match sourceArtifact",
    errors
  );
  assert(
    sourceArtifact.requestId === sourceRequest.id,
    "sourceArtifact must belong to sourceRequest",
    errors
  );
  assert(
    runRequest.id !== sourceRequest.id,
    "runRequest must be distinct from sourceRequest",
    errors
  );
  assert(
    runRequest.visibility === "private",
    "runRequest must be private",
    errors
  );
  assert(
    runRequest.brief?.constraints?.solutionRun?.profile ===
      "public_solution_run_v0",
    "runRequest must carry public_solution_run_v0 metadata",
    errors
  );
  assert(
    runRequest.brief?.constraints?.solutionRun?.sourceRequestId ===
      sourceRequest.id,
    "runRequest must reference sourceRequest",
    errors
  );
  assert(
    runRequest.brief?.constraints?.solutionRun?.sourceArtifactId ===
      sourceArtifact.id,
    "runRequest must reference sourceArtifact",
    errors
  );
  assert(
    transaction.requestId === runRequest.id,
    "transaction must attach to runRequest",
    errors
  );
  assert(
    transaction.metadata?.sourceRequestId === sourceRequest.id,
    "transaction metadata must reference sourceRequest",
    errors
  );
  assert(
    transaction.metadata?.sourceArtifactId === sourceArtifact.id,
    "transaction metadata must reference sourceArtifact",
    errors
  );
  assert(
    transaction.metadata?.fundingSource === "buyer_credit",
    "transaction must use buyer_credit funding source",
    errors
  );
  assert(
    ledgerEntry.kind === "debit" && ledgerEntry.status === "settled",
    "ledgerEntry must be a settled buyer-credit debit",
    errors
  );
  assert(
    ledgerEntry.requestId === runRequest.id,
    "ledgerEntry must attach to runRequest",
    errors
  );
  assert(
    ledgerEntry.transactionId === transaction.id,
    "ledgerEntry must reference transaction",
    errors
  );
  assert(
    runRequest.activeRefs?.latestTransactionId === transaction.id,
    "runRequest latestTransactionId must reference transaction",
    errors
  );

  return errors;
}

const fixture = readJson(fixturePath);
const errors = validatePublicSolutionRunFixture(fixture);

if (errors.length > 0) {
  console.error("Public solution run fixture validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validated public solution run fixture.");

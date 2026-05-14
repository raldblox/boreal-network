import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  buildFixtureMap,
  compareActual,
  listEvalFixtures,
  readJson,
  validateFixture
} from "./request-processing-eval-lib.mjs";

function usage() {
  console.log("Usage:");
  console.log("  node tests/contracts/run-request-processing-evals.mjs");
  console.log("  node tests/contracts/run-request-processing-evals.mjs --actual <path-to-actual-json>");
}

const args = process.argv.slice(2);
let actualPath = null;

if (args.length === 0) {
  const fixtureFiles = listEvalFixtures();
  const allErrors = fixtureFiles.flatMap((filePath) => validateFixture(readJson(filePath), filePath));

  if (allErrors.length > 0) {
    console.error("Request-processing fixture validation failed:\n");
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${fixtureFiles.length} request-processing eval fixture(s).`);
  console.log("No actual output was compared.");
  console.log("Use --actual <path> to compare a planner or matcher result against its fixture.");
  process.exit(0);
}

if (args[0] === "--actual" && args[1]) {
  actualPath = path.resolve(args[1]);
} else {
  usage();
  process.exit(1);
}

if (!fs.existsSync(actualPath)) {
  console.error(`Actual output file not found: ${actualPath}`);
  process.exit(1);
}

const fixtureFiles = listEvalFixtures();
const fixtureMap = buildFixtureMap(fixtureFiles);
const fixtureErrors = fixtureFiles.flatMap((filePath) => validateFixture(readJson(filePath), filePath));
if (fixtureErrors.length > 0) {
  console.error("Fixture validation failed before actual comparison:\n");
  for (const error of fixtureErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const actual = readJson(actualPath);
const fixtureEntry = fixtureMap.get(actual.scenarioId);
if (!fixtureEntry) {
  console.error(`No fixture found for scenarioId: ${actual.scenarioId}`);
  process.exit(1);
}

const comparisonErrors = compareActual(fixtureEntry.fixture, actual, actualPath);
if (comparisonErrors.length > 0) {
  console.error(`Request-processing eval failed for ${actual.scenarioId}:\n`);
  for (const error of comparisonErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Request-processing eval passed for ${actual.scenarioId}.`);
console.log(`Fixture: ${path.relative(ROOT, fixtureEntry.filePath)}`);
console.log(`Actual:  ${path.relative(ROOT, actualPath)}`);

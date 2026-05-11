import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const FIXTURE_DIR = path.join(ROOT, "fixtures", "request");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function listEvalFixtures() {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.startsWith("eval-") && name.endsWith(".json") && !name.includes(".actual."))
    .map((name) => path.join(FIXTURE_DIR, name));
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function includesAll(actual, expected) {
  return expected.every((value) => actual.includes(value));
}

function validateFixture(fixture, filePath) {
  const errors = [];
  const label = path.basename(filePath);

  if (fixture.fixtureType !== "planner_matcher_eval") {
    errors.push(`${label}: fixtureType must be planner_matcher_eval`);
  }

  if (fixture.schemaVersion !== 1) {
    errors.push(`${label}: schemaVersion must be 1`);
  }

  for (const field of [
    "scenarioId",
    "description",
    "requestInput",
    "candidateSupplies",
    "expectedExtraction",
    "expectedRouting",
    "expectedPlanning",
    "expectedMatching",
    "expectedPolicy",
    "negativeAssertions"
  ]) {
    if (!(field in fixture)) {
      errors.push(`${label}: missing ${field}`);
    }
  }

  if (!Array.isArray(fixture.candidateSupplies) || fixture.candidateSupplies.length === 0) {
    errors.push(`${label}: candidateSupplies must be a non-empty array`);
  }

  if (!Array.isArray(fixture.negativeAssertions)) {
    errors.push(`${label}: negativeAssertions must be an array`);
  }

  const routeFamily = fixture?.expectedRouting?.routeFamily;
  const complexityLevel = fixture?.expectedRouting?.complexityLevel;
  const leadSupplyId = fixture?.expectedMatching?.topLeadSupplyId;

  if (typeof routeFamily !== "string" || routeFamily.length === 0) {
    errors.push(`${label}: expectedRouting.routeFamily is required`);
  }

  if (!["low", "medium", "high"].includes(complexityLevel)) {
    errors.push(`${label}: expectedRouting.complexityLevel must be low, medium, or high`);
  }

  const candidateSupplyIds = new Set((fixture.candidateSupplies || []).map((item) => item.supplyId));
  if (leadSupplyId && !candidateSupplyIds.has(leadSupplyId)) {
    errors.push(`${label}: topLeadSupplyId must exist inside candidateSupplies`);
  }

  return errors;
}

function compareActual(fixture, actual, actualPath) {
  const errors = [];
  const label = path.basename(actualPath);

  if (actual.schemaVersion !== 1) {
    errors.push(`${label}: actual.schemaVersion must be 1`);
  }

  if (actual.scenarioId !== fixture.scenarioId) {
    errors.push(`${label}: scenarioId must match fixture scenarioId`);
  }

  const extraction = actual.extraction || {};
  const routing = actual.routing || {};
  const planning = actual.planning || {};
  const matching = actual.matching || {};
  const policy = actual.policy || {};

  if (extraction.title !== fixture.expectedExtraction.title) {
    errors.push(`${label}: extraction.title mismatch`);
  }

  const summary = extraction.summary || "";
  for (const token of fixture.expectedExtraction.summaryMustContain || []) {
    if (!summary.includes(token)) {
      errors.push(`${label}: extraction.summary must contain ${JSON.stringify(token)}`);
    }
  }

  const actualOutputKinds = extraction.outputKinds || [];
  if (!includesAll(actualOutputKinds, fixture.expectedExtraction.outputKinds || [])) {
    errors.push(`${label}: extraction.outputKinds missing expected values`);
  }

  const actualSeeking = extraction.seeking || {};
  for (const [key, expectedValue] of Object.entries(fixture.expectedExtraction.seeking || {})) {
    if (!deepEqual(actualSeeking[key], expectedValue)) {
      errors.push(`${label}: extraction.seeking.${key} mismatch`);
    }
  }

  const actualConstraints = extraction.constraints || {};
  for (const [key, expectedValue] of Object.entries(fixture.expectedExtraction.constraints || {})) {
    if (!deepEqual(actualConstraints[key], expectedValue)) {
      errors.push(`${label}: extraction.constraints.${key} mismatch`);
    }
  }

  for (const [key, expectedValue] of Object.entries(fixture.expectedRouting || {})) {
    if (!deepEqual(routing[key], expectedValue)) {
      errors.push(`${label}: routing.${key} mismatch`);
    }
  }

  if (planning.leadRole !== fixture.expectedPlanning.leadRole) {
    errors.push(`${label}: planning.leadRole mismatch`);
  }

  const phases = planning.phases || [];
  if (!Array.isArray(phases)) {
    errors.push(`${label}: planning.phases must be an array`);
  } else {
    if (phases.length < fixture.expectedPlanning.phaseCountMin || phases.length > fixture.expectedPlanning.phaseCountMax) {
      errors.push(`${label}: planning.phases length out of expected range`);
    }
  }

  if (fixture.expectedPlanning.noMicrotaskExplosion === true && planning.noMicrotaskExplosion !== true) {
    errors.push(`${label}: planning.noMicrotaskExplosion must be true`);
  }

  const roleSlots = planning.roleSlots || [];
  for (const expectedSlot of fixture.expectedPlanning.roleSlots || []) {
    const actualSlot = roleSlots.find((slot) => slot.roleKey === expectedSlot.roleKey);
    if (!actualSlot) {
      errors.push(`${label}: missing planning.roleSlots entry for ${expectedSlot.roleKey}`);
      continue;
    }

    if (actualSlot.required !== expectedSlot.required) {
      errors.push(`${label}: role slot required mismatch for ${expectedSlot.roleKey}`);
    }

    const actualKinds = actualSlot.requiredActorKinds || [];
    if (!includesAll(actualKinds, expectedSlot.requiredActorKinds || [])) {
      errors.push(`${label}: role slot actor kinds mismatch for ${expectedSlot.roleKey}`);
    }
  }

  const leadRanking = matching.leadRanking || [];
  if (!Array.isArray(leadRanking) || leadRanking.length === 0) {
    errors.push(`${label}: matching.leadRanking must be a non-empty array`);
  } else if (leadRanking[0] !== fixture.expectedMatching.topLeadSupplyId) {
    errors.push(`${label}: matching.leadRanking[0] must equal topLeadSupplyId`);
  }

  const top3 = leadRanking.slice(0, 3);
  if (!includesAll(top3, fixture.expectedMatching.top3MustInclude || [])) {
    errors.push(`${label}: lead top-3 missing required supplies`);
  }

  for (const supplyId of fixture.expectedMatching.mustRankBelowTop2 || []) {
    const position = leadRanking.indexOf(supplyId);
    if (position >= 0 && position < 2) {
      errors.push(`${label}: ${supplyId} must not rank inside top 2`);
    }
  }

  for (const [roleKey, expectedSupplyId] of Object.entries(fixture.expectedMatching.roleMatches || {})) {
    if (matching.roleMatches?.[roleKey] !== expectedSupplyId) {
      errors.push(`${label}: matching.roleMatches.${roleKey} mismatch`);
    }
  }

  for (const [key, expectedValue] of Object.entries(fixture.expectedPolicy || {})) {
    if (!deepEqual(policy[key], expectedValue)) {
      errors.push(`${label}: policy.${key} mismatch`);
    }
  }

  for (const assertion of fixture.negativeAssertions || []) {
    switch (assertion) {
      case "must_not_route_as_direct_tool":
        if (routing.routeFamily === "direct_tool") {
          errors.push(`${label}: negative assertion failed: routed as direct_tool`);
        }
        break;
      case "must_not_route_as_direct_specialist_without_plan":
        if (routing.routeFamily === "direct_specialist" && routing.needsPlan !== true) {
          errors.push(`${label}: negative assertion failed: direct_specialist without plan`);
        }
        break;
      case "must_not_create_fulfillment_before_commitment":
        if (policy.shouldCreateFulfillment === true) {
          errors.push(`${label}: negative assertion failed: create fulfillment too early`);
        }
        break;
      case "must_not_create_fulfillment_steps_before_fulfillment":
        if (policy.shouldCreateFulfillmentSteps === true) {
          errors.push(`${label}: negative assertion failed: create fulfillment steps too early`);
        }
        break;
      case "must_not_choose_generic_chat_agent_as_lead":
        if (leadRanking[0] === "sup_generic_chat_agent") {
          errors.push(`${label}: negative assertion failed: generic chat agent chosen as lead`);
        }
        break;
      default:
        errors.push(`${label}: unknown negative assertion ${assertion}`);
    }
  }

  return errors;
}

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
const fixtureMap = new Map(fixtureFiles.map((filePath) => {
  const fixture = readJson(filePath);
  return [fixture.scenarioId, { fixture, filePath }];
}));

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


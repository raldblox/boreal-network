import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT = path.resolve(__dirname, "..", "..");
export const FIXTURE_DIR = path.join(ROOT, "fixtures", "request");
export const BENCHMARK_DIR = path.join(FIXTURE_DIR, "benchmark-actuals");

const EMBODIED_EXECUTION_MODES = new Set([
  "onsite_visit",
  "field_inspection",
  "pickup_dropoff",
  "witnessed_handoff",
  "local_access",
  "field_verification"
]);

const CANONICAL_EMBODIED_SYNONYMS = {
  onsite_visit: ["onsite", "on-site", "site visit", "visit kiosk", "visit site", "visit the kiosk"],
  field_inspection: ["inspection", "inspect", "field inspection", "onsite inspection"],
  pickup_dropoff: ["pickup", "pick up", "dropoff", "drop off", "handoff pickup", "pickup delivery"],
  witnessed_handoff: ["witnessed handoff", "witness handoff", "witnessed delivery", "witness"],
  local_access: ["local access", "onsite access", "site access", "entry procedure", "access instructions"],
  field_verification: ["field verification", "verification", "verify", "confirm", "confirmation"]
};

const CANONICAL_VERIFICATION_SYNONYMS = {
  delivery_confirmation: ["delivery confirmation", "confirm delivery", "handoff proof", "proof of delivery"],
  handoff_signature: ["handoff signature", "signed handoff", "signature proof", "signed receipt"],
  photo_proof: ["photo proof", "proof photo", "photo evidence", "evidence photos"],
  serial_number_capture: ["serial number capture", "serial numbers", "record serials", "capture serials"],
  timestamped_photos: ["timestamped photo", "timestamped photos", "photo evidence", "photos showing", "capture timestamped"],
  verification_note: ["verification note", "short verification note", "verification summary"],
  written_report: ["written report", "short written report", "inspection report", "submit report", "file report"]
};

const CLOSURE_ACTIONS = new Set([
  "create_fulfillment",
  "close_request",
  "mark_complete",
  "publish_delivery"
]);

const ROLE_KEY_SYNONYMS = {
  field_inspector: ["onsite_field_inspector", "field_technician", "inspector", "onsite_inspector"],
  qa_documentation: ["documentation_support", "reporting_support", "qa_reporter"],
  field_technician: ["technician", "onsite_field_technician", "installer_verifier"],
  courier_runner: ["courier", "runner", "handoff_runner", "pickup_runner"],
  migration_lead: ["ops_migration_lead", "implementation_lead", "project_lead"],
  automation_builder: ["automation_support", "automation_specialist", "workflow_builder"],
  documentation_support: ["qa_documentation", "handoff_documentation", "enablement_support"]
};

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

export function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

export function listEvalFixtures() {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.startsWith("eval-") && name.endsWith(".json") && !name.includes(".actual."))
    .map((name) => path.join(FIXTURE_DIR, name))
    .sort();
}

export function buildFixtureMap(fixtureFiles = listEvalFixtures()) {
  return new Map(
    fixtureFiles.map((filePath) => {
      const fixture = readJson(filePath);
      return [fixture.scenarioId, { fixture, filePath }];
    })
  );
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function includesAll(actual, expected) {
  return expected.every((value) => actual.includes(value));
}

function uniqueStrings(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === "string" && value.length > 0))
  );
}

function getCandidateSupplyId(candidateSupply) {
  if (!candidateSupply || typeof candidateSupply !== "object") {
    return "";
  }

  if (typeof candidateSupply.id === "string" && candidateSupply.id.length > 0) {
    return candidateSupply.id;
  }

  if (typeof candidateSupply.supplyId === "string" && candidateSupply.supplyId.length > 0) {
    return candidateSupply.supplyId;
  }

  return "";
}

function pushStringFragments(target, value) {
  if (typeof value === "string" && value.length > 0) {
    target.push(value.toLowerCase());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      pushStringFragments(target, item);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      target.push(String(key).toLowerCase());
      pushStringFragments(target, nestedValue);
    }
  }
}

function normalizeRoleKey(roleKey) {
  return String(roleKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function roleKeysEquivalent(a, b) {
  const left = normalizeRoleKey(a);
  const right = normalizeRoleKey(b);

  if (left === right) {
    return true;
  }

  const leftSynonyms = new Set([left, ...(ROLE_KEY_SYNONYMS[left] || [])].map(normalizeRoleKey));
  const rightSynonyms = new Set([right, ...(ROLE_KEY_SYNONYMS[right] || [])].map(normalizeRoleKey));

  for (const token of leftSynonyms) {
    if (rightSynonyms.has(token)) {
      return true;
    }
  }

  return false;
}

function ratio(matchedCount, totalCount) {
  if (totalCount === 0) {
    return null;
  }

  return matchedCount / totalCount;
}

function rateFromBooleans(values) {
  const defined = values.filter((value) => typeof value === "boolean");
  if (defined.length === 0) {
    return null;
  }

  return defined.filter(Boolean).length / defined.length;
}

function average(values) {
  const defined = values.filter((value) => typeof value === "number");
  if (defined.length === 0) {
    return null;
  }

  return defined.reduce((sum, value) => sum + value, 0) / defined.length;
}

export function validateFixture(fixture, filePath) {
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
    "requestPatch",
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

  if (!fixture.requestPatch || typeof fixture.requestPatch !== "object") {
    errors.push(`${label}: requestPatch must be an object`);
  } else {
    const requestPatch = fixture.requestPatch;
    if (!requestPatch.brief || typeof requestPatch.brief !== "object") {
      errors.push(`${label}: requestPatch.brief must be present`);
    } else {
      if (typeof requestPatch.brief.body !== "string" || requestPatch.brief.body.trim().length === 0) {
        errors.push(`${label}: requestPatch.brief.body must be a non-empty string`);
      }

      if (!Array.isArray(requestPatch.brief.outputKinds)) {
        errors.push(`${label}: requestPatch.brief.outputKinds must be an array`);
      }
    }
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

  const candidateSupplyIds = new Set((fixture.candidateSupplies || []).map((item) => getCandidateSupplyId(item)));
  if (leadSupplyId && !candidateSupplyIds.has(leadSupplyId)) {
    errors.push(`${label}: topLeadSupplyId must exist inside candidateSupplies`);
  }

  for (const candidateSupply of fixture.candidateSupplies || []) {
    const candidateSupplyId = getCandidateSupplyId(candidateSupply);
    if (!candidateSupplyId) {
      errors.push(`${label}: candidateSupplies entries must include id or supplyId`);
      continue;
    }

    if (candidateSupply.profile && typeof candidateSupply.profile !== "object") {
      errors.push(`${label}: candidateSupplies.${candidateSupplyId}.profile must be an object`);
    }

    if (candidateSupply.profile && typeof candidateSupply.profile.displayName !== "string") {
      errors.push(`${label}: candidateSupplies.${candidateSupplyId}.profile.displayName is required`);
    }

    if (candidateSupply.capability && typeof candidateSupply.capability !== "object") {
      errors.push(`${label}: candidateSupplies.${candidateSupplyId}.capability must be an object`);
    }

    if (candidateSupply.capability && !Array.isArray(candidateSupply.capability.supplyKinds)) {
      errors.push(`${label}: candidateSupplies.${candidateSupplyId}.capability.supplyKinds must be an array`);
    }

    if (
      candidateSupply.capability &&
      !Array.isArray(candidateSupply.capability.fulfillmentActorKinds)
    ) {
      errors.push(
        `${label}: candidateSupplies.${candidateSupplyId}.capability.fulfillmentActorKinds must be an array`
      );
    }
  }

  return errors;
}

export function compareActual(fixture, actual, actualPath) {
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

  if (fixture.expectedPlanning.executionProfile) {
    if (!deepEqual(planning.executionProfile, fixture.expectedPlanning.executionProfile)) {
      errors.push(`${label}: planning.executionProfile mismatch`);
    }
  }

  if (fixture.expectedPlanning.verificationPlan) {
    if (!deepEqual(planning.verificationPlan, fixture.expectedPlanning.verificationPlan)) {
      errors.push(`${label}: planning.verificationPlan mismatch`);
    }
  }

  if (fixture.expectedPlanning.planCollapseRisk) {
    if (!deepEqual(planning.planCollapseRisk, fixture.expectedPlanning.planCollapseRisk)) {
      errors.push(`${label}: planning.planCollapseRisk mismatch`);
    }
  }

  const phases = planning.phases || [];
  if (!Array.isArray(phases)) {
    errors.push(`${label}: planning.phases must be an array`);
  } else if (
    phases.length < fixture.expectedPlanning.phaseCountMin ||
    phases.length > fixture.expectedPlanning.phaseCountMax
  ) {
    errors.push(`${label}: planning.phases length out of expected range`);
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
      case "must_not_flatten_onsite_work_into_digital_only_plan":
        if (
          planning.executionProfile?.executionModes &&
          Array.isArray(planning.executionProfile.executionModes) &&
          planning.executionProfile.executionModes.length === 1 &&
          planning.executionProfile.executionModes[0] === "remote_digital"
        ) {
          errors.push(`${label}: negative assertion failed: onsite work flattened into remote_digital only`);
        }
        break;
      case "must_not_allow_false_closure_without_proof":
        if (
          policy.nextAction === "create_fulfillment" &&
          planning.verificationPlan &&
          Array.isArray(planning.verificationPlan.requiredEvidenceClaims) &&
          planning.verificationPlan.requiredEvidenceClaims.length > 0 &&
          policy.shouldCreateFulfillment === true
        ) {
          errors.push(`${label}: negative assertion failed: fulfillment chosen before proof-critical route review`);
        }
        break;
      case "must_require_clarification_for_missing_embodied_constraints":
        if (policy.nextAction !== "clarify_request") {
          errors.push(`${label}: negative assertion failed: missing embodied constraints did not trigger clarify_request`);
        }
        break;
      default:
        errors.push(`${label}: unknown negative assertion ${assertion}`);
    }
  }

  return errors;
}

export function getExpectedEmbodiedSteps(fixture) {
  return uniqueStrings(
    (fixture?.expectedPlanning?.executionProfile?.executionModes || []).filter((mode) =>
      EMBODIED_EXECUTION_MODES.has(mode)
    )
  );
}

export function getActualEmbodiedSteps(actual) {
  return uniqueStrings(
    (actual?.planning?.executionProfile?.executionModes || []).filter((mode) => EMBODIED_EXECUTION_MODES.has(mode))
  );
}

export function getExpectedVerificationRequirements(fixture) {
  return uniqueStrings(
    fixture?.expectedPlanning?.verificationPlan?.requiredEvidenceClaims ||
      fixture?.expectedExtraction?.constraints?.verificationRequirements ||
      []
  );
}

export function getActualVerificationArtifacts(actual) {
  return uniqueStrings(
    actual?.planning?.verificationPlan?.requiredEvidenceClaims ||
      actual?.extraction?.constraints?.verificationRequirements ||
      []
  );
}

export function computeEmbodiedStepRecall(fixture, actual) {
  const expected = getExpectedEmbodiedSteps(fixture);
  if (expected.length === 0) {
    return null;
  }

  const actualSteps = getActualEmbodiedSteps(actual);
  const matched = expected.filter((step) => actualSteps.includes(step)).length;
  return ratio(matched, expected.length);
}

export function computeVerificationCompleteness(fixture, actual) {
  const expected = getExpectedVerificationRequirements(fixture);
  if (expected.length === 0) {
    return null;
  }

  const actualArtifacts = getActualVerificationArtifacts(actual);
  const matched = expected.filter((artifact) => actualArtifacts.includes(artifact)).length;
  return ratio(matched, expected.length);
}

export function collectActualTextFragments(actual) {
  const fragments = [];
  pushStringFragments(fragments, actual?.extraction);
  pushStringFragments(fragments, actual?.routing);
  pushStringFragments(fragments, actual?.planning);
  pushStringFragments(fragments, actual?.matching);
  pushStringFragments(fragments, actual?.policy);
  return uniqueStrings(fragments);
}

function collectSemanticMatches(actual, canonicalMap, directValues = []) {
  const fragments = collectActualTextFragments(actual);
  const matches = new Set(
    uniqueStrings(directValues).filter((value) => Object.prototype.hasOwnProperty.call(canonicalMap, value))
  );

  for (const [canonical, synonyms] of Object.entries(canonicalMap)) {
    if (matches.has(canonical)) {
      continue;
    }

    if (synonyms.some((synonym) => fragments.some((fragment) => fragment.includes(synonym)))) {
      matches.add(canonical);
    }
  }

  return Array.from(matches);
}

export function computeSemanticEmbodiedStepRecall(fixture, actual) {
  const expected = getExpectedEmbodiedSteps(fixture);
  if (expected.length === 0) {
    return null;
  }

  const directValues = uniqueStrings(actual?.planning?.executionProfile?.executionModes);
  const actualSteps = collectSemanticMatches(actual, CANONICAL_EMBODIED_SYNONYMS, directValues);
  const matched = expected.filter((step) => actualSteps.includes(step)).length;
  return ratio(matched, expected.length);
}

export function computeSemanticVerificationCompleteness(fixture, actual) {
  const expected = getExpectedVerificationRequirements(fixture);
  if (expected.length === 0) {
    return null;
  }

  const directValues = uniqueStrings(actual?.planning?.verificationPlan?.requiredEvidenceClaims);
  const actualClaims = collectSemanticMatches(actual, CANONICAL_VERIFICATION_SYNONYMS, directValues);
  const matched = expected.filter((claim) => actualClaims.includes(claim)).length;
  return ratio(matched, expected.length);
}

function actualRoleSlotCoversExpected(expectedSlot, actualSlot, requireRequiredFlag) {
  if (!actualSlot) {
    return false;
  }

  if (requireRequiredFlag && actualSlot.required !== true) {
    return false;
  }

  const expectedKinds = uniqueStrings(expectedSlot?.requiredActorKinds);
  const actualKinds = uniqueStrings(actualSlot?.requiredActorKinds);
  return includesAll(actualKinds, expectedKinds);
}

function findActualRoleSlotBySupply(expectedSupplyId, actual) {
  if (!expectedSupplyId) {
    return null;
  }

  const roleMatches = actual?.matching?.roleMatches || {};
  const actualRoleSlots = Array.isArray(actual?.planning?.roleSlots) ? actual.planning.roleSlots : [];

  for (const [actualRoleKey, supplyId] of Object.entries(roleMatches)) {
    if (supplyId !== expectedSupplyId) {
      continue;
    }

    const actualSlot = actualRoleSlots.find((slot) => slot.roleKey === actualRoleKey);
    if (actualSlot) {
      return actualSlot;
    }
  }

  return null;
}

function findRoleCoverage(expectedSlot, fixture, actual, requireRequiredFlag) {
  const actualRoleSlots = Array.isArray(actual?.planning?.roleSlots) ? actual.planning.roleSlots : [];
  const expectedSupplyId = fixture?.expectedMatching?.roleMatches?.[expectedSlot.roleKey];

  const directSlot = actualRoleSlots.find((slot) => roleKeysEquivalent(slot.roleKey, expectedSlot.roleKey));
  if (actualRoleSlotCoversExpected(expectedSlot, directSlot, requireRequiredFlag)) {
    return true;
  }

  const supplyLinkedSlot = findActualRoleSlotBySupply(expectedSupplyId, actual);
  if (actualRoleSlotCoversExpected(expectedSlot, supplyLinkedSlot, requireRequiredFlag)) {
    return true;
  }

  return false;
}

export function computeRoleSlotCoverage(fixture, actual, { requiredOnly } = { requiredOnly: true }) {
  const expectedRoleSlots = (fixture?.expectedPlanning?.roleSlots || []).filter((slot) =>
    requiredOnly ? slot.required === true : slot.required !== true
  );

  if (expectedRoleSlots.length === 0) {
    return null;
  }

  const matched = expectedRoleSlots.filter((slot) =>
    findRoleCoverage(slot, fixture, actual, requiredOnly === true)
  ).length;

  return ratio(matched, expectedRoleSlots.length);
}

export function computePolicyActionAcceptable(fixture, actual) {
  const expectedAction = fixture?.expectedPolicy?.nextAction;
  const actualAction = actual?.policy?.nextAction;

  if (typeof expectedAction !== "string" || typeof actualAction !== "string") {
    return false;
  }

  if (actualAction === expectedAction) {
    return true;
  }

  switch (expectedAction) {
    case "draft_commitment":
      if (actualAction === "show_team_plan" && fixture?.expectedRouting?.needsPlan === true) {
        return true;
      }

      if (actualAction === "show_lead_shortlist") {
        return true;
      }

      if (actualAction === "clarify_request" && actual?.routing?.needsClarification === true) {
        return true;
      }

      return false;
    case "show_team_plan":
      return actualAction === "draft_commitment" || actualAction === "clarify_request";
    case "show_lead_shortlist":
      return actualAction === "draft_commitment" || actualAction === "clarify_request";
    case "clarify_request":
      return actualAction === "block_and_escalate";
    default:
      return false;
  }
}

export function computeScenarioMetrics(fixture, actual, actualPath) {
  const comparisonErrors = compareActual(fixture, actual, actualPath);
  const leadRanking = Array.isArray(actual?.matching?.leadRanking) ? actual.matching.leadRanking : [];
  const phaseCount = Array.isArray(actual?.planning?.phases) ? actual.planning.phases.length : 0;
  const expectedPhaseMax = fixture?.expectedPlanning?.phaseCountMax;
  const expectedTopLead = fixture?.expectedMatching?.topLeadSupplyId;
  const embodiedStepRecall = computeEmbodiedStepRecall(fixture, actual);
  const semanticEmbodiedStepRecall = computeSemanticEmbodiedStepRecall(fixture, actual);
  const verificationCompleteness = computeVerificationCompleteness(fixture, actual);
  const semanticVerificationCompleteness = computeSemanticVerificationCompleteness(fixture, actual);
  const requiredRoleSlotCoverage = computeRoleSlotCoverage(fixture, actual, {
    requiredOnly: true
  });
  const optionalRoleSlotCoverage = computeRoleSlotCoverage(fixture, actual, {
    requiredOnly: false
  });
  const shouldCloseLike =
    actual?.policy?.shouldCreateFulfillment === true ||
    actual?.policy?.shouldCreateFulfillmentSteps === true ||
    CLOSURE_ACTIONS.has(actual?.policy?.nextAction);
  const falseCompletion =
    shouldCloseLike &&
    (
      fixture?.expectedRouting?.needsClarification === true ||
      (typeof embodiedStepRecall === "number" && embodiedStepRecall < 1) ||
      (typeof verificationCompleteness === "number" && verificationCompleteness < 1)
    );

  return {
    scenarioId: fixture.scenarioId,
    actualPath: path.relative(ROOT, actualPath),
    comparisonErrors,
    contractPass: comparisonErrors.length === 0,
    leadTop1Correct: leadRanking[0] === expectedTopLead,
    leadRecallAt3: leadRanking.slice(0, 3).includes(expectedTopLead),
    overDecomposition:
      (typeof expectedPhaseMax === "number" && phaseCount > expectedPhaseMax) ||
      actual?.planning?.noMicrotaskExplosion !== true,
    forbiddenMutation:
      (fixture?.expectedPolicy?.shouldCreateFulfillment !== true && actual?.policy?.shouldCreateFulfillment === true) ||
      (fixture?.expectedPolicy?.shouldCreateFulfillmentSteps !== true &&
        actual?.policy?.shouldCreateFulfillmentSteps === true),
    policyActionAcceptable: computePolicyActionAcceptable(fixture, actual),
    requiredRoleSlotCoverage,
    optionalRoleSlotCoverage,
    embodiedStepRecall,
    semanticEmbodiedStepRecall,
    generativePlanCollapse: typeof embodiedStepRecall === "number" ? 1 - embodiedStepRecall : null,
    verificationCompleteness,
    semanticVerificationCompleteness,
    falseCompletion
  };
}

export function listBenchmarkSystems(benchmarkDir = BENCHMARK_DIR) {
  if (!fs.existsSync(benchmarkDir)) {
    return [];
  }

  return fs
    .readdirSync(benchmarkDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(benchmarkDir, entry.name))
    .sort();
}

export function listBenchmarkActuals(systemDir) {
  if (!fs.existsSync(systemDir)) {
    return [];
  }

  return fs
    .readdirSync(systemDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(systemDir, name))
    .sort();
}

export function runBenchmark({ benchmarkDir = BENCHMARK_DIR } = {}) {
  const fixtureFiles = listEvalFixtures();
  const fixtureErrors = fixtureFiles.flatMap((filePath) => validateFixture(readJson(filePath), filePath));
  if (fixtureErrors.length > 0) {
    throw new Error(`Fixture validation failed:\n- ${fixtureErrors.join("\n- ")}`);
  }

  const fixtureMap = buildFixtureMap(fixtureFiles);
  const fixtureIds = Array.from(fixtureMap.keys()).sort();
  const systems = listBenchmarkSystems(benchmarkDir).map((systemDir) => {
    const actualEntries = new Map();
    for (const actualPath of listBenchmarkActuals(systemDir)) {
      const actual = readJson(actualPath);
      actualEntries.set(actual.scenarioId, { actual, actualPath });
    }

    const scenarioResults = fixtureIds.map((scenarioId) => {
      const fixtureEntry = fixtureMap.get(scenarioId);
      const actualEntry = actualEntries.get(scenarioId);
      if (!actualEntry) {
        return {
          scenarioId,
          actualPath: null,
          comparisonErrors: ["missing benchmark actual"],
          contractPass: false,
          leadTop1Correct: null,
          leadRecallAt3: null,
          overDecomposition: null,
          forbiddenMutation: null,
          policyActionAcceptable: null,
          requiredRoleSlotCoverage: null,
          optionalRoleSlotCoverage: null,
          embodiedStepRecall: null,
          semanticEmbodiedStepRecall: null,
          generativePlanCollapse: null,
          verificationCompleteness: null,
          semanticVerificationCompleteness: null,
          falseCompletion: null
        };
      }

      return computeScenarioMetrics(fixtureEntry.fixture, actualEntry.actual, actualEntry.actualPath);
    });

    return {
      systemId: path.basename(systemDir),
      scenarioCount: scenarioResults.filter((result) => result.actualPath !== null).length,
      metrics: {
        scenarioCoverage: ratio(
          scenarioResults.filter((result) => result.actualPath !== null).length,
          fixtureIds.length
        ),
        contractPassRate: rateFromBooleans(scenarioResults.map((result) => result.contractPass)),
        leadTop1Accuracy: rateFromBooleans(scenarioResults.map((result) => result.leadTop1Correct)),
        leadRecallAt3: rateFromBooleans(scenarioResults.map((result) => result.leadRecallAt3)),
        overDecompositionRate: rateFromBooleans(scenarioResults.map((result) => result.overDecomposition)),
        forbiddenMutationRate: rateFromBooleans(scenarioResults.map((result) => result.forbiddenMutation)),
        policyActionAcceptability: rateFromBooleans(
          scenarioResults.map((result) => result.policyActionAcceptable)
        ),
        requiredRoleSlotCoverage: average(
          scenarioResults.map((result) => result.requiredRoleSlotCoverage)
        ),
        optionalRoleSlotCoverage: average(
          scenarioResults.map((result) => result.optionalRoleSlotCoverage)
        ),
        embodiedStepRecall: average(scenarioResults.map((result) => result.embodiedStepRecall)),
        semanticEmbodiedStepRecall: average(
          scenarioResults.map((result) => result.semanticEmbodiedStepRecall)
        ),
        generativePlanCollapse: average(scenarioResults.map((result) => result.generativePlanCollapse)),
        verificationCompleteness: average(scenarioResults.map((result) => result.verificationCompleteness)),
        semanticVerificationCompleteness: average(
          scenarioResults.map((result) => result.semanticVerificationCompleteness)
        ),
        falseCompletionRate: rateFromBooleans(scenarioResults.map((result) => result.falseCompletion))
      },
      scenarios: scenarioResults
    };
  });

  return {
    schemaVersion: 1,
    fixtureCount: fixtureIds.length,
    benchmarkDir: path.relative(ROOT, benchmarkDir),
    systems
  };
}

function titleizeSystemId(systemId) {
  return systemId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join("-");
}

function formatPercent(value) {
  if (typeof value !== "number") {
    return "n/a";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatPercentForTex(value) {
  if (typeof value !== "number") {
    return "n/a";
  }

  return `${(value * 100).toFixed(1)}\\%`;
}

export function renderBenchmarkMarkdown(summary) {
  const lines = [];
  lines.push("# Request-Processing Benchmark");
  lines.push("");
  lines.push(`Scenarios: ${summary.fixtureCount}`);
  lines.push(`Systems: ${summary.systems.length}`);
  lines.push("");
  lines.push("| System | Pass Rate | Lead Top-1 | Recall@3 | Policy Accept | Required Roles | Optional Roles | Over-Decomp | Forbidden Mutation | Embodied | Semantic Embodied | Verification | Semantic Verification | False Completion |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const system of summary.systems) {
    const metrics = system.metrics;
    lines.push(
      `| ${titleizeSystemId(system.systemId)} | ${formatPercent(metrics.contractPassRate)} | ${formatPercent(metrics.leadTop1Accuracy)} | ${formatPercent(metrics.leadRecallAt3)} | ${formatPercent(metrics.policyActionAcceptability)} | ${formatPercent(metrics.requiredRoleSlotCoverage)} | ${formatPercent(metrics.optionalRoleSlotCoverage)} | ${formatPercent(metrics.overDecompositionRate)} | ${formatPercent(metrics.forbiddenMutationRate)} | ${formatPercent(metrics.embodiedStepRecall)} | ${formatPercent(metrics.semanticEmbodiedStepRecall)} | ${formatPercent(metrics.verificationCompleteness)} | ${formatPercent(metrics.semanticVerificationCompleteness)} | ${formatPercent(metrics.falseCompletionRate)} |`
    );
  }

  lines.push("");
  lines.push("## Scenario Notes");
  lines.push("");

  for (const system of summary.systems) {
    lines.push(`### ${titleizeSystemId(system.systemId)}`);
    lines.push("");
    for (const scenario of system.scenarios) {
      const errorNote =
        scenario.comparisonErrors.length > 0
          ? `; errors: ${scenario.comparisonErrors.join(" | ")}`
          : "";
      lines.push(
        `- ${scenario.scenarioId}: pass=${scenario.contractPass}; leadTop1=${scenario.leadTop1Correct}; policyAccept=${scenario.policyActionAcceptable ?? "n/a"}; requiredRoles=${scenario.requiredRoleSlotCoverage ?? "n/a"}; optionalRoles=${scenario.optionalRoleSlotCoverage ?? "n/a"}; embodiedRecall=${scenario.embodiedStepRecall ?? "n/a"}; semanticEmbodied=${scenario.semanticEmbodiedStepRecall ?? "n/a"}; verification=${scenario.verificationCompleteness ?? "n/a"}; semanticVerification=${scenario.semanticVerificationCompleteness ?? "n/a"}; falseCompletion=${scenario.falseCompletion}${errorNote}`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function renderBenchmarkTex(summary) {
  const systems = summary.systems;
  const symbolicCoords = systems.map((system) => titleizeSystemId(system.systemId)).join(",");
  const leadCoords = systems
    .map((system) => `(${titleizeSystemId(system.systemId)}, ${(system.metrics.leadTop1Accuracy ?? 0) * 100})`)
    .join(" ");
  const embodiedCoords = systems
    .map((system) => `(${titleizeSystemId(system.systemId)}, ${(system.metrics.embodiedStepRecall ?? 0) * 100})`)
    .join(" ");
  const verificationCoords = systems
    .map((system) => `(${titleizeSystemId(system.systemId)}, ${(system.metrics.verificationCompleteness ?? 0) * 100})`)
    .join(" ");

  const rows = systems
    .map((system) => {
      const metrics = system.metrics;
      return `${titleizeSystemId(system.systemId)} & ${formatPercentForTex(metrics.contractPassRate)} & ${formatPercentForTex(metrics.leadTop1Accuracy)} & ${formatPercentForTex(metrics.leadRecallAt3)} & ${formatPercentForTex(metrics.policyActionAcceptability)} & ${formatPercentForTex(metrics.requiredRoleSlotCoverage)} & ${formatPercentForTex(metrics.embodiedStepRecall)} & ${formatPercentForTex(metrics.semanticEmbodiedStepRecall)} & ${formatPercentForTex(metrics.verificationCompleteness)} & ${formatPercentForTex(metrics.semanticVerificationCompleteness)} & ${formatPercentForTex(metrics.falseCompletionRate)} \\\\`;
    })
    .join("\n");

  return `% Generated by tests/contracts/run-request-processing-benchmark.mjs
\\begin{table*}[t]
\\centering
\\caption{Deterministic request-processing benchmark across ${summary.fixtureCount} scenarios. Higher is better for pass rate, lead accuracy, policy safety, role coverage, embodied recall, and verification completeness. Lower is better for false completion.}
\\label{tab:deterministic-benchmark}
\\resizebox{\\textwidth}{!}{%
\\begin{tabular}{lcccccccccc}
\\toprule
System & Pass Rate & Lead Top-1 & Recall@3 & Policy Accept & Required Roles & Exact Embodied & Semantic Embodied & Verification & Semantic Verification & False Completion \\\\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
}
\\end{table*}

\\begin{figure}[t]
\\centering
\\begin{tikzpicture}
\\begin{axis}[
  ybar,
  bar width=7pt,
  width=0.94\\columnwidth,
  height=0.62\\columnwidth,
  ymin=0,
  ymax=100,
  ylabel={Percent},
  symbolic x coords={${symbolicCoords}},
  xtick=data,
  x tick label style={rotate=18, anchor=east},
  legend style={font=\\scriptsize, at={(0.5,1.03)}, anchor=south, legend columns=2},
  nodes near coords,
  every node near coord/.append style={font=\\scriptsize},
  enlarge x limits=0.18
]
\\addplot coordinates {${leadCoords}};
\\addplot coordinates {${embodiedCoords}};
\\addplot coordinates {${verificationCoords}};
\\legend{Lead, Embodied, Verification}
\\end{axis}
\\end{tikzpicture}
\\caption{Outcome quality on the deterministic benchmark. The request-rooted baseline preserves both routing quality and embodied verification fidelity, while the direct-tool baseline collapses on physical-work retention.}
\\label{fig:deterministic-benchmark}
\\end{figure}
`;
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const schemaPath = "schemas/json/in-house-worker-application-profile.schema.json";
const fixturePath = "fixtures/agent/in-house-worker-application-profile.sample.json";
const decisionPath = "docs/decisions/0027-in-house-boreal-agents-scan-and-apply-as-workers.md";
const standardPath = "standards/in-house-boreal-worker-application-lane.md";

const canonicalObjects = new Set([
  "Actor",
  "Supply",
  "Request",
  "RequestParticipant",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Artifact",
  "Transaction",
  "RequestEvent"
]);

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8").replace(/^\uFEFF/, "");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function includesAll(actual, expected, label, errors) {
  const actualSet = new Set(actual ?? []);
  for (const item of expected) {
    assert(actualSet.has(item), `${label} must include ${item}`, errors);
  }
}

function equalsSet(actual, expected, label, errors) {
  const actualSet = new Set(actual ?? []);
  const expectedSet = new Set(expected);
  assert(actualSet.size === expectedSet.size, `${label} must contain exactly ${expected.join(", ")}`, errors);
  for (const item of expectedSet) {
    assert(actualSet.has(item), `${label} must include ${item}`, errors);
  }
}

function byId(items) {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

function validateSchema(schema, errors) {
  assert(schema.$schema === "https://json-schema.org/draft/2020-12/schema", "schema must use JSON Schema draft 2020-12", errors);
  assert(schema.title === "InHouseBorealWorkerApplicationProfile", "schema title must be InHouseBorealWorkerApplicationProfile", errors);
  assert(schema.properties?.schemaVersion?.const === 1, "schema must lock schemaVersion to 1", errors);
  assert(schema.properties?.status?.const === "in_house_worker_application_profile", "schema must lock profile status", errors);
  assert(schema.$defs?.nonAuthority?.properties?.durableWriteCreated?.const === false, "scanner non-authority must lock durableWriteCreated false", errors);
  assert(schema.$defs?.applicationLane?.properties?.idempotencyRequired?.const === true, "application lanes must require idempotency", errors);
  assert(schema.$defs?.applicationLane?.properties?.completionAuthority?.const === false, "application lanes must lock completionAuthority false", errors);
  includesAll(
    schema.$defs?.canonicalObject?.enum,
    [...canonicalObjects],
    "schema canonical object enum",
    errors
  );
}

function validateProfile(profile, errors) {
  assert(profile.schemaVersion === 1, "fixture schemaVersion must be 1", errors);
  assert(profile.status === "in_house_worker_application_profile", "fixture status must be in_house_worker_application_profile", errors);
  assert(profile.sourceDecision?.path === decisionPath, "fixture must point at decision 0027", errors);

  equalsSet(profile.liveWorkerSet?.currentLiveWorkerKeys, ["video-generation"], "live worker set", errors);
  assert(
    (profile.liveWorkerSet?.targetOnlyWorkerKeys ?? []).includes("humanizer"),
    "humanizer must stay target-only in this profile",
    errors
  );

  const namedAgents = byId((profile.namedAgentTemplates ?? []).map((agent) => ({
    ...agent,
    id: agent.agentKey
  })));
  const mira = namedAgents.get("mira-video");
  const tala = namedAgents.get("tala-humanizer");
  assert(mira, "profile must define Mira video agent", errors);
  assert(tala, "profile must define Tala humanizer target agent", errors);
  assert(mira?.uniqueName === "Mira", "Mira must have a unique name", errors);
  assert(mira?.apiRoute === "/api/boreal-agents/mira-video", "Mira must have a stable API route", errors);
  assert(mira?.status === "live_template", "Mira must be the live template", errors);
  assert(mira?.workerKey === "video-generation", "Mira must bind to video-generation", errors);
  assert(
    mira?.modelBindings?.some((binding) => binding.provider === "openai" && binding.env === "OPENAI_API_KEY"),
    "Mira must declare OpenAI key binding",
    errors
  );
  assert(
    mira?.modelBindings?.some((binding) => binding.provider === "runway" && binding.env === "RUNWAY_API_KEY"),
    "Mira must declare Runway key binding",
    errors
  );
  includesAll(
    mira?.qualificationTags?.supplyKinds,
    ["video_generation", "provider_capability"],
    "Mira supply qualification tags",
    errors
  );
  includesAll(
    mira?.qualificationTags?.outputKinds,
    ["video", "media"],
    "Mira output qualification tags",
    errors
  );
  assert(
    mira?.qualificationTags?.skipWhen?.some((rule) => rule.includes("requiresHumanPresence")),
    "Mira must skip human-presence plans",
    errors
  );
  includesAll(
    (mira?.taskPipeline ?? []).map((step) => step.kind),
    [
      "inspect_request",
      "filter_qualification",
      "submit_commitment",
      "create_owner_private_fulfillment",
      "run_provider",
      "publish_artifact"
    ],
    "Mira task pipeline",
    errors
  );
  assert(tala?.uniqueName === "Tala", "Tala must have a unique name", errors);
  assert(tala?.apiRoute === "/api/boreal-agents/tala-humanizer", "Tala must have a stable API route", errors);
  assert(tala?.status === "target_template", "Tala must stay target-only", errors);
  assert(tala?.workerKey === "humanizer", "Tala must bind to humanizer target", errors);
  assert(
    tala?.qualificationTags?.skipWhen?.some((rule) => rule.includes("supply factory is not implemented")),
    "Tala must stay blocked until its supply factory exists",
    errors
  );

  includesAll(
    profile.agentBoilerplate?.requiredFiles,
    [
      "agent definition",
      "route handler under /api/boreal-agents/{agentKey}",
      "contract fixture",
      "route-level mutation tests"
    ],
    "agent boilerplate files",
    errors
  );
  includesAll(
    (profile.agentBoilerplate?.requiredEnvironment ?? []).map((binding) => binding.name),
    ["OPENAI_API_KEY", "RUNWAY_API_KEY"],
    "agent boilerplate environment",
    errors
  );
  includesAll(
    profile.briefingQualificationTags?.writeTargets,
    [
      "Request.seeking.actorKinds",
      "Request.seeking.supplyKinds",
      "Request.brief.outputKinds",
      "Request.derived.leadRole",
      "Request.derived.roleSlots"
    ],
    "briefing qualification tag write targets",
    errors
  );
  assert(
    profile.briefingQualificationTags?.rules?.some((rule) => rule.includes("skip provider-only agents")),
    "briefing tags must reduce wasteful agent scans on human-required plans",
    errors
  );

  const scanner = profile.scannerContract;
  assert(scanner?.status === "read_only_projection", "scanner status must be read_only_projection", errors);
  assert(scanner?.method === "GET", "scanner method must be GET", errors);
  equalsSet(scanner?.writes, [], "scanner writes", errors);
  includesAll(scanner?.reads, ["Request", "Supply"], "scanner reads", errors);
  for (const [key, value] of Object.entries(scanner?.authority ?? {})) {
    assert(value === false, `scanner authority ${key} must be false`, errors);
  }

  const lanes = byId(profile.applicationLanes);
  const publicLane = lanes.get("public_or_cross_actor_commitment_application");
  const directLane = lanes.get("owner_private_direct_worker_fulfillment");
  assert(publicLane, "profile must define public_or_cross_actor_commitment_application", errors);
  assert(directLane, "profile must define owner_private_direct_worker_fulfillment", errors);

  equalsSet(
    publicLane?.canonicalWritesIfAuthorized,
    ["Commitment", "RequestEvent"],
    "public application writes",
    errors
  );
  includesAll(
    publicLane?.forbiddenWrites,
    ["Fulfillment", "FulfillmentStep", "Artifact", "Transaction"],
    "public application forbidden writes",
    errors
  );
  assert(publicLane?.idempotencyRequired === true, "public application must require idempotency", errors);
  assert(publicLane?.completionAuthority === false, "public application must not have completion authority", errors);
  assert(
    profile.applicationPacket?.submissionPreflight?.actionId === "apply_to_request",
    "application packet must preflight public applications with apply_to_request",
    errors
  );
  assert(
    profile.applicationPacket?.submissionPreflight?.directLaneActionId ===
      "create_owner_private_fulfillment",
    "application packet must preflight direct fulfillment with create_owner_private_fulfillment",
    errors
  );
  includesAll(
    profile.applicationPacket?.submissionPreflight?.requiredInput
      ?.directLaneRequestedScopes,
    ["fulfillments:create"],
    "direct fulfillment preflight scopes",
    errors
  );

  equalsSet(
    directLane?.canonicalWritesIfAuthorized,
    ["Fulfillment", "RequestEvent"],
    "owner-private direct lane writes",
    errors
  );
  includesAll(
    directLane?.forbiddenWrites,
    ["Artifact", "Transaction"],
    "owner-private direct lane forbidden writes",
    errors
  );
  assert(directLane?.idempotencyRequired === true, "owner-private direct lane must require idempotency", errors);
  assert(directLane?.completionAuthority === false, "owner-private direct lane must not have completion authority", errors);
  includesAll(
    directLane?.requires,
    [
      "POST /api/requests/{id}/fulfillments body includes ownerPrivateDirectApproval for the selected Supply",
      "routing.preferredSupplyId or explicit supplyId points to the selected Supply"
    ],
    "owner-private direct lane requirements",
    errors
  );

  includesAll(
    profile.autoApprovalPolicy?.forbiddenEffects,
    [
      "publish Artifact by itself",
      "authorize payment",
      "accept review",
      "complete Request",
      "silently fall back to another Supply when selected Supply is unavailable"
    ],
    "auto-approval forbidden effects",
    errors
  );
  assert(
    profile.autoApprovalPolicy?.scope === "trusted_first_party_supply_only",
    "auto-approval must be trusted first-party supply only",
    errors
  );

  includesAll(
    profile.promptAssetBoundary?.cannotBeFrontpageSupplyUntil,
    [
      "owner Actor exists",
      "capability fingerprints exist",
      "availability is declared",
      "execution or handoff path exists",
      "proof requirements exist",
      "Fulfillment boundary exists",
      "unsafe-case tests or fixtures exist"
    ],
    "prompt asset supply gates",
    errors
  );

  assert(profile.canonicalBoundary?.rootObject === "Request", "canonical root must be Request", errors);
  includesAll(
    profile.canonicalBoundary?.durableTruthObjects,
    [...canonicalObjects],
    "canonical durable truth objects",
    errors
  );
  includesAll(
    profile.canonicalBoundary?.notRoots,
    ["AgentStage", "Task", "Workflow", "Job", "Order", "Offer", "Intent"],
    "forbidden roots",
    errors
  );

  const examples = byId(profile.examples);
  assert(examples.has("video_generation_public_apply"), "fixture must include public video-generation apply example", errors);
  assert(examples.has("video_generation_owner_private_direct"), "fixture must include owner-private video-generation direct example", errors);
  assert(examples.has("humanizer_target_only"), "fixture must include target-only humanizer example", errors);

  equalsSet(
    examples.get("video_generation_public_apply")?.expectedCanonicalWritesIfTaken,
    ["Commitment", "RequestEvent"],
    "public video-generation example writes",
    errors
  );
  equalsSet(
    examples.get("video_generation_owner_private_direct")?.expectedCanonicalWritesIfTaken,
    ["Fulfillment", "RequestEvent"],
    "owner-private video-generation example writes",
    errors
  );
  assert(
    examples.get("humanizer_target_only")?.notAuthority?.includes("not live starter supply"),
    "humanizer example must say it is not live starter supply",
    errors
  );
}

function validateDocs(profile, errors) {
  const decision = readText(decisionPath);
  const standard = readText(standardPath);
  assert(decision.includes("typed in-house worker opportunity/application profile"), "decision 0027 must name the typed profile follow-on", errors);
  assert(decision.includes("humanizer should not be listed as a starter worker"), "decision 0027 must keep humanizer target-only", errors);
  assert(standard.includes("scanner reads do not mutate durable truth"), "standard must include scanner read-only test guidance", errors);
  assert(standard.includes("public application writes `Commitment` plus `RequestEvent`"), "standard must include public application write guidance", errors);
  assert(standard.includes("/api/boreal-agents/{agentKey}"), "standard must name the per-agent API route template", errors);
  assert(standard.includes("human-required plans"), "standard must describe human-required plan scan reduction", errors);
  assert(
    profile.promptAssetBoundary.rules.some((rule) => rule.includes("Prompt-only assets")),
    "fixture must preserve prompt-only asset boundary",
    errors
  );
}

const errors = [];
const schema = readJson(schemaPath);
const profile = readJson(fixturePath);

validateSchema(schema, errors);
validateProfile(profile, errors);
validateDocs(profile, errors);

if (errors.length > 0) {
  console.error("In-house worker application profile contract failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("PASS in-house worker application profile contract");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const manifestPath = "fixtures/agent/sandbox-manifest.sample.json";
const conformanceReportPath = "fixtures/agent/conformance-report.sample.json";
const schemaPath = "schemas/json/agent-sandbox.schema.json";
const conformanceReportSchemaPath = "schemas/json/agent-conformance-report.schema.json";
const implementationPath = "apps/web/lib/agent-sandbox.ts";

const requiredFlows = new Map([
  ["inspect_public_requests", { method: "GET", writes: [] }],
  ["make_request_for_human", { method: "POST", writes: ["Request"] }],
  ["apply_to_request", { method: "POST", writes: ["Commitment", "RequestEvent"] }],
  ["submit_artifact", { method: "POST", writes: ["Artifact", "RequestEvent"] }],
  ["monitor_request", { method: "GET", writes: [] }],
  ["run_public_solution", { method: "POST", writes: ["Request", "Transaction", "RequestEvent"] }],
  ["signed_monitor_webhook", { method: "POST", writes: [] }],
  ["optimize_request_brief", { method: "LOCAL_DRAFT", writes: [] }]
]);

const requiredScopes = new Set([
  "requests:read_public",
  "requests:create",
  "requests:update_draft",
  "commitments:propose",
  "artifacts:publish",
  "requests:read_activity",
  "solution_runs:create",
  "transactions:read"
]);

const requiredResources = [
  "/agents/start.md",
  "/agents/sandbox.md",
  "/agents/actions.md",
  "/agents/access-review.json",
  "/agents/auth.json",
  "/agents/conformance.json",
  "/agents/completion.json",
  "/agents/evidence.json",
  "/agents/execution.json",
  "/agents/human-handoffs.json",
  "/agents/optimization.json",
  "/agents/payments.json",
  "/agents/prompts.json",
  "/agents/workflows.json",
  "/agents/protocols.md",
  "/agents/protocols.json",
  "/agents/recovery.json",
  "/agents/readiness.json",
  "/agents/tools.json",
  "/agents/monitor-webhooks.md",
  "/agents/monitoring.json",
  "/agents/onboarding.json",
  "/openapi.json",
  "/openapi/request-briefing.yaml",
  "/api/requests?scope=public"
];

const requiredDocs = [
  "docs/API_CONTRACTS.md",
  "docs/LIVE_VS_TARGET.md",
  "docs/TEST_MATRIX.md",
  "docs/strategy/AGENT_NATIVE_USAGE_BLUEPRINT.md",
  "standards/agent-protocol-profile.md"
];

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

function byId(items) {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

function includesAll(actual, expected, label, errors) {
  const actualSet = new Set(actual ?? []);
  for (const item of expected) {
    assert(actualSet.has(item), `${label} must include ${item}`, errors);
  }
}

function validateSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent sandbox schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(schema.title === "AgentSandbox", "agent sandbox schema must be titled AgentSandbox", errors);
  assert(schema.properties?.notAcceptedByProduction?.const === true, "schema must lock notAcceptedByProduction to true", errors);
  assert(
    schema.properties?.mockCredentialsAcceptedByProduction?.const === false,
    "schema must lock mockCredentialsAcceptedByProduction to false",
    errors
  );
  assert(schema.$defs?.flow?.properties?.productionWrite?.const === false, "flow schema must lock productionWrite to false", errors);
}

function validateConformanceReportSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent conformance report schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(
    schema.title === "AgentConformanceReport",
    "agent conformance report schema must be titled AgentConformanceReport",
    errors
  );
  assert(
    schema.properties?.reportKind?.const === "agent_conformance_report",
    "agent conformance report schema must lock reportKind",
    errors
  );
  assert(
    schema.$defs?.replayScenarioResult?.properties?.productionEffects?.const === false,
    "agent conformance report schema must lock replay productionEffects to false",
    errors
  );
  assert(
    schema.$defs?.protocolClaims?.properties?.mcp?.const === "target_only",
    "agent conformance report schema must keep MCP target-only",
    errors
  );
}

function validateManifestShape(manifest, errors) {
  assert(manifest.schemaVersion === 1, "manifest schemaVersion must be 1", errors);
  assert(manifest.status === "live_contract_sandbox", "manifest status must be live_contract_sandbox", errors);
  assert(manifest.mode === "contract_only", "manifest mode must be contract_only", errors);
  assert(manifest.notAcceptedByProduction === true, "manifest must be marked notAcceptedByProduction", errors);
  assert(
    manifest.mockCredentialsAcceptedByProduction === false,
    "manifest mock credentials must not be accepted by production",
    errors
  );
  assert(
    manifest.schemaUrl?.endsWith("/schemas/agent-sandbox.schema.json"),
    "manifest schemaUrl must point at the public agent sandbox schema route",
    errors
  );
  assert(
    manifest.guideUrl?.endsWith("/agents/sandbox.md"),
    "manifest guideUrl must point at the public sandbox guide",
    errors
  );
  assert(
    manifest.contractFixturePath === manifestPath,
    "manifest contractFixturePath must point at the checked fixture",
    errors
  );
  assert(
    manifest.validationCommand === "pnpm contracts:agent-sandbox",
    "manifest validationCommand must expose the sandbox fixture runner",
    errors
  );
  assert(
    (manifest.productionEffects ?? []).some((effect) => effect.includes("No real Request")),
    "manifest must say no real canonical objects are created",
    errors
  );

  const sampleIds = Object.entries(manifest.sampleIds ?? {});
  assert(sampleIds.length >= 8, "manifest must include stable sample ids for request, supply, writes, delivery, and subscription", errors);
  assert(new Set(sampleIds.map(([, value]) => value)).size === sampleIds.length, "sample ids must be unique", errors);
  for (const [key, value] of sampleIds) {
    assert(
      typeof value === "string" && /^00000000-0000-4000-8000-[0-9a-f]{12}$/i.test(value),
      `sample id ${key} must be a stable sandbox UUID`,
      errors
    );
  }

  const resourceText = JSON.stringify(manifest.resources ?? []);
  for (const resource of requiredResources) {
    assert(resourceText.includes(resource), `manifest resources must include ${resource}`, errors);
  }
}

function validateMockIdentities(manifest, errors) {
  const identities = manifest.mockIdentities ?? [];
  const identityIds = identities.map((identity) => identity.id);
  assert(new Set(identityIds).size === identityIds.length, "mock identity ids must be unique", errors);
  assert(identities.length >= 6, "manifest must include scout, requester, solver, publisher, monitor, and buyer identities", errors);

  const scopes = new Set();
  for (const identity of identities) {
    assert(identity.notAcceptedByProduction === true, `${identity.id} must be marked notAcceptedByProduction`, errors);
    assert(
      ["none", "mock_bearer", "mock_session"].includes(identity.credentialKind),
      `${identity.id} credentialKind must be a mock-safe kind`,
      errors
    );
    for (const scope of identity.scopes ?? []) {
      scopes.add(scope);
    }
  }

  for (const scope of requiredScopes) {
    assert(scopes.has(scope), `mock identities must cover ${scope}`, errors);
  }
}

function validateFlows(manifest, errors) {
  const flows = manifest.flows ?? [];
  const flowIds = flows.map((flow) => flow.id);
  const flowMap = byId(flows);
  assert(new Set(flowIds).size === flowIds.length, "flow ids must be unique", errors);

  for (const [flowId, expected] of requiredFlows) {
    const flow = flowMap.get(flowId);
    assert(flow, `manifest must include ${flowId}`, errors);
    if (!flow) {
      continue;
    }

    assert(flow.method === expected.method, `${flowId} method must be ${expected.method}`, errors);
    assert(flow.productionWrite === false, `${flowId} must not perform production writes`, errors);
    includesAll(flow.canonicalWrites, expected.writes, `${flowId} canonical writes`, errors);
  }

  for (const flow of flows) {
    assert(
      flow.availability === "live_public_read" ||
        flow.availability === "contract_sample_only" ||
        flow.availability === "target_profile_contract_sample",
      `${flow.id} availability must be a sandbox-safe state`,
      errors
    );
    assert(
      Array.isArray(flow.canonicalReads) && Array.isArray(flow.canonicalWrites),
      `${flow.id} must declare canonical reads and writes`,
      errors
    );
  }

  for (const flowId of ["apply_to_request", "submit_artifact", "run_public_solution"]) {
    const flow = flowMap.get(flowId);
    assert(flow?.idempotencyRequired === true, `${flowId} must require idempotency`, errors);
    assert(
      /^00000000-0000-4000-8000-[0-9a-f]{12}$/i.test(flow?.sample?.headers?.["Idempotency-Key"] ?? ""),
      `${flowId} must include a stable sandbox Idempotency-Key`,
      errors
    );
  }

  const inspect = flowMap.get("inspect_public_requests");
  assert(inspect?.auth === "none", "inspect_public_requests must stay anonymous", errors);
  assert((inspect?.canonicalWrites ?? []).length === 0, "inspect_public_requests must not write canon", errors);
  assert(
    (inspect?.sample?.expectedResponseFields ?? []).includes("requests[].agentActionAffordances"),
    "inspect_public_requests must teach agents to read request-level action affordances",
    errors
  );

  const makeRequest = flowMap.get("make_request_for_human");
  assert(makeRequest?.auth === "mock_session:requests:create", "make_request_for_human must use mock session auth", errors);
  assert(makeRequest?.sample?.body?.visibility === "private", "make_request_for_human must create a private draft sample", errors);
  assert(
    makeRequest?.sample?.followUp?.body?.action === "save_draft",
    "make_request_for_human must stop at save_draft before opening",
    errors
  );
  assert(
    String(makeRequest?.sample?.stopBefore ?? "").includes("explicit buyer approval"),
    "make_request_for_human must require explicit buyer approval before open_request",
    errors
  );

  const artifact = flowMap.get("submit_artifact");
  assert(artifact?.sample?.body?.artifactKind === "evidence", "submit_artifact sample must publish evidence", errors);
  assert(artifact?.sample?.body?.documentKind === "text", "submit_artifact sample must use a text document sample", errors);

  const monitor = flowMap.get("monitor_request");
  assert(monitor?.path?.includes("after_sequence=0"), "monitor_request sample must use after_sequence", errors);
  assert(monitor?.path?.includes("limit=10"), "monitor_request sample must include a bounded limit", errors);
  assert(
    monitor?.sample?.expectedCursorField === "cursor.nextAfterSequence",
    "monitor_request sample must teach cursor.nextAfterSequence",
    errors
  );

  const webhook = flowMap.get("signed_monitor_webhook");
  const webhookHeaders = webhook?.sample?.headers ?? {};
  assert(webhookHeaders["Boreal-Webhook-Id"], "signed_monitor_webhook must include Boreal-Webhook-Id", errors);
  assert(webhookHeaders["Boreal-Webhook-Timestamp"], "signed_monitor_webhook must include Boreal-Webhook-Timestamp", errors);
  assert(
    String(webhookHeaders["Boreal-Webhook-Signature"] ?? "").startsWith("v1="),
    "signed_monitor_webhook must include v1 signature header",
    errors
  );

  const optimize = flowMap.get("optimize_request_brief");
  assert(optimize?.sample?.output?.durableWrite === false, "optimize_request_brief must be draft-only", errors);
  assert(optimize?.sample?.output?.needsOwnerApproval === true, "optimize_request_brief must require owner approval", errors);
}

function validateScenarios(manifest, errors) {
  const flowIds = new Set((manifest.flows ?? []).map((flow) => flow.id));
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);
  const scenarios = manifest.scenarios ?? [];
  const scenarioIds = scenarios.map((scenario) => scenario.id);

  assert(scenarios.length >= 4, "manifest must include deterministic replay scenarios", errors);
  assert(new Set(scenarioIds).size === scenarioIds.length, "scenario ids must be unique", errors);

  for (const scenario of scenarios) {
    assert(scenario.mode === "deterministic_replay", `${scenario.id} mode must be deterministic_replay`, errors);
    assert(
      scenario.notAcceptedByProduction === true,
      `${scenario.id} must be marked notAcceptedByProduction`,
      errors
    );
    assert(
      Array.isArray(scenario.coveredActions) && scenario.coveredActions.length > 0,
      `${scenario.id} must cover at least one action`,
      errors
    );
    assert(
      Array.isArray(scenario.steps) && scenario.steps.length > 0,
      `${scenario.id} must include replay steps`,
      errors
    );
    assert(
      typeof scenario.expectedTerminalState?.claimState === "string",
      `${scenario.id} must declare an expected terminal claimState`,
      errors
    );

    for (const action of scenario.coveredActions ?? []) {
      assert(flowIds.has(action), `${scenario.id} covered action ${action} must reference a manifest flow`, errors);
    }

    for (const write of scenario.expectedCanonicalWrites ?? []) {
      assert(durableWrites.has(write), `${scenario.id} expected write ${write} must be a canonical durable write`, errors);
    }

    for (const step of scenario.steps ?? []) {
      assert(flowIds.has(step.flowId), `${scenario.id}.${step.id} flowId must reference a manifest flow`, errors);
      for (const write of step.writes ?? []) {
        assert(durableWrites.has(write), `${scenario.id}.${step.id} write ${write} must be canonical`, errors);
      }
      if ((step.writes ?? []).length > 0 && step.kind !== "simulated_external_gate") {
        assert(
          step.idempotencyKey === null || /^00000000-0000-4000-8000-[0-9a-f]{12}$/i.test(step.idempotencyKey),
          `${scenario.id}.${step.id} idempotencyKey must be null or a stable sandbox UUID`,
          errors
        );
      }
    }
  }

  const solverReplay = scenarios.find((scenario) => scenario.id === "solver_apply_submit_monitor_replay");
  includesAll(
    solverReplay?.coveredActions,
    ["inspect_public_requests", "apply_to_request", "submit_artifact", "monitor_request"],
    "solver replay covered actions",
    errors
  );
  assert(
    solverReplay?.expectedTerminalState?.claimState === "proof_submitted_waiting_for_owner_acceptance",
    "solver replay must stop before claiming completion",
    errors
  );
  assert(
    solverReplay?.steps?.some(
      (step) =>
        step.kind === "simulated_external_gate" &&
        (step.writes ?? []).includes("Fulfillment") &&
        step.expected?.requiredBefore === "submit_artifact"
    ),
    "solver replay must model the accepted Commitment gate before Artifact proof",
    errors
  );

  const paidRunReplay = scenarios.find((scenario) => scenario.id === "public_solution_paid_run_shape_replay");
  assert(
    paidRunReplay?.expectedTerminalState?.sourceRequestMutated === false,
    "paid-run replay must not mutate the source Request",
    errors
  );
  includesAll(
    paidRunReplay?.expectedCanonicalWrites,
    ["Request", "Transaction", "RequestEvent"],
    "paid-run replay expected writes",
    errors
  );

  const recoveryReplay = scenarios.find((scenario) => scenario.id === "idempotent_recovery_replay");
  assert(
    recoveryReplay?.steps?.some((step) => step.expected?.bodyMustMatchOriginal === true),
    "recovery replay must require the retry body to match the original write",
    errors
  );
  assert(
    recoveryReplay?.expectedTerminalState?.duplicateDurableTruth === false,
    "recovery replay must avoid duplicate durable truth",
    errors
  );
}

function validateCanonBoundary(manifest, errors) {
  const boundary = manifest.canonicalBoundary ?? {};
  assert(boundary.rootObject === "Request", "sandbox boundary must keep Request as root", errors);
  includesAll(
    boundary.durableWrites,
    ["Request", "Commitment", "Fulfillment", "FulfillmentStep", "Artifact", "Transaction", "RequestEvent"],
    "sandbox durable writes",
    errors
  );
  includesAll(
    boundary.notRoots,
    ["sandbox manifest", "mock credential", "MCP session", "A2A task", "x402 payment payload", "webhook delivery"],
    "sandbox non-root list",
    errors
  );
}

function validateConformanceReport(report, manifest, errors) {
  const scenarioIds = new Set((manifest.scenarios ?? []).map((scenario) => scenario.id));
  const checklistIds = new Set(
    readText("apps/web/lib/agent-discovery.ts").match(/id: "([a-z_]+)"/g)?.map((match) =>
      match.replace('id: "', "").replace('"', "")
    ) ?? []
  );
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);

  assert(report.schemaVersion === 1, "conformance report schemaVersion must be 1", errors);
  assert(
    report.reportKind === "agent_conformance_report",
    "conformance report kind must be agent_conformance_report",
    errors
  );
  assert(
    report.requestedProductionAccess?.status === "operator_review_required",
    "conformance report must require operator review for production access",
    errors
  );
  assert(
    report.sandboxValidation?.validationCommand === "pnpm contracts:agent-sandbox",
    "conformance report must cite the sandbox validation command",
    errors
  );
  assert(
    report.sandboxValidation?.notAcceptedByProduction === true,
    "conformance report sandbox validation must remain non-production",
    errors
  );
  assert(
    report.secretHandling?.containsSecrets === false,
    "conformance report must not contain secrets",
    errors
  );
  assert(
    report.protocolClaims?.mcp === "target_only" &&
      report.protocolClaims?.a2a === "target_only" &&
      report.protocolClaims?.x402 === "target_only" &&
      report.protocolClaims?.oauthCompatibleDelegation === "target_only",
    "conformance report must keep target protocol adapters target-only",
    errors
  );
  assert(report.canonicalBoundary?.rootObject === "Request", "conformance report must keep Request as root", errors);

  for (const result of report.replayScenarioResults ?? []) {
    assert(scenarioIds.has(result.scenarioId), `report scenario ${result.scenarioId} must reference sandbox manifest`, errors);
    assert(result.productionEffects === false, `${result.scenarioId} must not have production effects`, errors);
    for (const write of result.observedWrites ?? []) {
      assert(durableWrites.has(write), `${result.scenarioId} observed write ${write} must be canonical`, errors);
    }
  }

  for (const scenarioId of scenarioIds) {
    assert(
      (report.replayScenarioResults ?? []).some((result) => result.scenarioId === scenarioId && result.status === "passed"),
      `conformance report must include passed replay result for ${scenarioId}`,
      errors
    );
  }

  for (const result of report.checklistResults ?? []) {
    assert(checklistIds.has(result.checklistId), `report checklist ${result.checklistId} must match conformance profile ids`, errors);
    assert((result.failedChecks ?? []).length === 0, `report checklist ${result.checklistId} must not include failed checks`, errors);
  }

  assert(
    (report.canonicalBoundary?.reportIsNot ?? []).includes("production credential"),
    "conformance report must say it is not a production credential",
    errors
  );
  assert(
    (report.canonicalBoundary?.notRoots ?? []).includes("conformance report"),
    "conformance report must not be a root object",
    errors
  );
}

function validateImplementationAndDocs(manifest, errors) {
  const implementation = readText(implementationPath);
  for (const flow of manifest.flows ?? []) {
    assert(implementation.includes(`id: "${flow.id}"`), `implementation must define flow ${flow.id}`, errors);
  }
  for (const scenario of manifest.scenarios ?? []) {
    assert(
      implementation.includes(`id: "${scenario.id}"`),
      `implementation must define scenario ${scenario.id}`,
      errors
    );
  }
  for (const routePath of [
    "apps/web/app/agents/sandbox.md/route.ts",
    "apps/web/app/agents/sandbox.json/route.ts"
  ]) {
    assert(fs.existsSync(path.join(ROOT, routePath)), `${routePath} must exist`, errors);
  }

  for (const docPath of requiredDocs) {
    const text = readText(docPath);
    assert(text.includes("/agents/sandbox.md"), `${docPath} must mention the sandbox guide`, errors);
    assert(text.includes("/agents/sandbox.json") || docPath === "standards/agent-protocol-profile.md", `${docPath} must mention the sandbox manifest`, errors);
  }
}

const schema = readJson(schemaPath);
const conformanceReportSchema = readJson(conformanceReportSchemaPath);
const manifest = readJson(manifestPath);
const conformanceReport = readJson(conformanceReportPath);
const errors = [];

validateSchema(schema, errors);
validateConformanceReportSchema(conformanceReportSchema, errors);
validateManifestShape(manifest, errors);
validateMockIdentities(manifest, errors);
validateFlows(manifest, errors);
validateScenarios(manifest, errors);
validateCanonBoundary(manifest, errors);
validateConformanceReport(conformanceReport, manifest, errors);
validateImplementationAndDocs(manifest, errors);

const serialized = JSON.stringify({ manifest, conformanceReport });
assert(!serialized.includes("PRIVATE KEY"), "sandbox manifest must not include private keys", errors);
assert(!serialized.includes("BEGIN "), "sandbox manifest must not include PEM-like secrets", errors);

if (errors.length > 0) {
  console.error("Agent sandbox fixture validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validated agent contract sandbox fixture and public surface alignment.");

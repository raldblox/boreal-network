import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const manifestPath = "fixtures/agent/sandbox-manifest.sample.json";
const conformanceReportPath = "fixtures/agent/conformance-report.sample.json";
const errorExamplesPath = "fixtures/agent/error-examples.sample.json";
const humanHandoffPacketsPath = "fixtures/agent/human-handoff-packets.sample.json";
const opportunityCardsPath = "fixtures/agent/opportunity-cards.sample.json";
const productionAccessPacketPath = "fixtures/agent/production-access-packet.sample.json";
const protocolAdapterSamplesPath = "fixtures/agent/protocol-adapter-samples.sample.json";
const schemaPath = "schemas/json/agent-sandbox.schema.json";
const conformanceReportSchemaPath = "schemas/json/agent-conformance-report.schema.json";
const errorExamplesSchemaPath = "schemas/json/agent-error-examples.schema.json";
const humanHandoffPacketsSchemaPath = "schemas/json/agent-human-handoff-packets.schema.json";
const opportunityCardsSchemaPath = "schemas/json/agent-opportunity-cards.schema.json";
const productionAccessPacketSchemaPath = "schemas/json/agent-production-access-packet.schema.json";
const protocolAdapterSamplesSchemaPath = "schemas/json/agent-protocol-adapter-samples.schema.json";
const implementationPath = "apps/web/lib/agent-sandbox.ts";

const requiredFlows = new Map([
  ["inspect_public_requests", { method: "GET", writes: [] }],
  ["make_request_for_human", { method: "POST", writes: ["Request"] }],
  ["apply_to_request", { method: "POST", writes: ["Commitment", "RequestEvent"] }],
  ["submit_artifact", { method: "POST", writes: ["Artifact", "RequestEvent"] }],
  ["validate_completion_claim", { method: "POST", writes: [] }],
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
  "/agents/sandbox/replay",
  "/agents/actions.md",
  "/agents/actions/preflight",
  "/agents/access-review.json",
  "/agents/access-review/prepare",
  "/agents/auth.json",
  "/agents/auth/prepare",
  "/agents/conformance.json",
  "/agents/conformance-report.example.json",
  "/agents/completion.json",
  "/agents/completion/validate",
  "/agents/delegation.json",
  "/agents/evidence.json",
  "/agents/evidence/validate",
  "/agents/error-examples.json",
  "/agents/execution.json",
  "/agents/human-handoffs.json",
  "/agents/human-handoff-packets.example.json",
  "/agents/http.json",
  "/agents/ux.json",
  "/agents/intake/validate",
  "/agents/optimization.json",
  "/agents/optimization/prepare",
  "/agents/payments.json",
  "/agents/production-access-packet.example.json",
  "/agents/prompts.json",
  "/agents/workflows.json",
  "/agents/protocols.md",
  "/agents/protocols.json",
  "/agents/protocol-adapter-samples.json",
  "/agents/recovery.json",
  "/agents/readiness.json",
  "/agents/tools.json",
  "/agents/monitor-webhooks.md",
  "/agents/monitoring.json",
  "/agents/monitoring/prepare",
  "/agents/monitoring/validate",
  "/agents/onboarding.json",
  "/agents/opportunity-cards.example.json",
  "/agents/opportunities.json",
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

function validateProductionAccessPacketSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent production access packet schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(
    schema.title === "AgentProductionAccessPacketExample",
    "agent production access packet schema must be titled AgentProductionAccessPacketExample",
    errors
  );
  assert(
    schema.properties?.packetKind?.const === "agent_production_access_packet",
    "agent production access packet schema must lock packetKind",
    errors
  );
  assert(
    schema.properties?.status?.const === "target_operator_review_packet_example",
    "agent production access packet schema must lock target operator review example status",
    errors
  );
  assert(
    schema.properties?.notAcceptedByProduction?.const === true,
    "agent production access packet schema must lock production acceptance to false",
    errors
  );
  assert(
    schema.$defs?.sandboxEvidence?.properties?.productionEffects?.const === false,
    "agent production access packet schema must lock sandbox evidence production effects to false",
    errors
  );
  assert(
    schema.$defs?.protocolClaims?.properties?.mcp?.const === "target_only",
    "agent production access packet schema must keep MCP target-only",
    errors
  );
}

function validateErrorExamplesSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent error examples schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(
    schema.title === "AgentErrorExamples",
    "agent error examples schema must be titled AgentErrorExamples",
    errors
  );
  assert(
    schema.properties?.status?.const === "live_error_example_pack",
    "agent error examples schema must lock live example status",
    errors
  );
  assert(
    schema.$defs?.errorExample?.properties?.contentType?.const === "application/problem+json",
    "agent error examples schema must lock RFC 9457 problem content type",
    errors
  );
}

function validateProtocolAdapterSamplesSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent protocol adapter samples schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(
    schema.title === "AgentProtocolAdapterSamples",
    "agent protocol adapter samples schema must be titled AgentProtocolAdapterSamples",
    errors
  );
  assert(
    schema.properties?.status?.const === "target_protocol_sample_pack",
    "agent protocol adapter samples schema must lock target-only status",
    errors
  );
  assert(
    schema.$defs?.sample?.properties?.notAcceptedByProduction?.const === true,
    "agent protocol adapter samples schema must lock production acceptance to false",
    errors
  );
}

function validateHumanHandoffPacketsSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent human handoff packet schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(
    schema.title === "AgentHumanHandoffPacketExamples",
    "agent human handoff packet schema must be titled AgentHumanHandoffPacketExamples",
    errors
  );
  assert(
    schema.properties?.status?.const === "live_handoff_packet_examples",
    "agent human handoff packet schema must lock live example status",
    errors
  );
  assert(
    schema.$defs?.handoffPacket?.properties?.status?.const === "example_only",
    "agent human handoff packet schema must lock packet examples to example_only",
    errors
  );
}

function validateOpportunityCardsSchema(schema, errors) {
  assert(
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "agent opportunity cards schema must use JSON Schema draft 2020-12",
    errors
  );
  assert(
    schema.title === "AgentOpportunityCardExamples",
    "agent opportunity cards schema must be titled AgentOpportunityCardExamples",
    errors
  );
  assert(
    schema.properties?.status?.const === "live_opportunity_card_examples",
    "agent opportunity cards schema must lock live example status",
    errors
  );
  assert(
    schema.$defs?.opportunityCard?.properties?.status?.const === "example_only",
    "agent opportunity card examples must lock cards to example_only",
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

function validateProductionAccessPacket(packet, manifest, errors) {
  const flowIds = new Set((manifest.flows ?? []).map((flow) => flow.id));
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);

  assert(packet.schemaVersion === 1, "production access packet schemaVersion must be 1", errors);
  assert(
    packet.packetKind === "agent_production_access_packet",
    "production access packet kind must be agent_production_access_packet",
    errors
  );
  assert(
    packet.status === "target_operator_review_packet_example",
    "production access packet must be target operator review example",
    errors
  );
  assert(packet.exampleOnly === true, "production access packet must be example only", errors);
  assert(
    packet.notAcceptedByProduction === true,
    "production access packet must not be accepted by production",
    errors
  );
  assert(
    packet.requestedAccess?.status === "operator_review_required",
    "production access packet must require operator review",
    errors
  );
  assert(
    packet.sandboxEvidence?.validationCommand === "pnpm contracts:agent-sandbox",
    "production access packet must cite the sandbox validation command",
    errors
  );
  assert(
    packet.sandboxEvidence?.productionEffects === false,
    "production access packet sandbox evidence must remain non-production",
    errors
  );
  assert(
    packet.dataHandling?.containsSecrets === false,
    "production access packet must not contain secrets",
    errors
  );
  assert(
    packet.paymentAndSpendBoundary?.paymentAuthorityRequested === false,
    "production access packet must not request payment authority",
    errors
  );
  assert(
    packet.paymentAndSpendBoundary?.x402Status === "target_only",
    "production access packet must keep x402 target-only",
    errors
  );
  assert(
    packet.protocolClaims?.mcp === "target_only" &&
      packet.protocolClaims?.a2a === "target_only" &&
      packet.protocolClaims?.x402 === "target_only" &&
      packet.protocolClaims?.oauthCompatibleDelegation === "target_only" &&
      packet.protocolClaims?.signedPushDelivery === "target_only",
    "production access packet must keep target protocols target-only",
    errors
  );
  assert(packet.canonicalBoundary?.rootObject === "Request", "production access packet must keep Request as root", errors);

  for (const action of packet.requestedAccess?.intendedActions ?? []) {
    assert(flowIds.has(action), `production access action ${action} must reference a sandbox flow`, errors);
  }

  for (const objectName of packet.canonicalBoundary?.durableTruthObjects ?? []) {
    assert(durableWrites.has(objectName), `production access durable truth ${objectName} must be canonical`, errors);
  }

  includesAll(
    packet.sandboxEvidence?.coveredRequiredChecks,
    ["package_production_access_packet", "contract_sandbox_only", "target_protocols_stay_target"],
    "production access packet covered checks",
    errors
  );
  includesAll(
    packet.canonicalBoundary?.packetIsNot,
    ["production credential", "permission grant", "payment authorization", "completion proof", "production sandbox"],
    "production access packet non-authority list",
    errors
  );
  assert(
    (packet.canonicalBoundary?.notRoots ?? []).includes("production access packet"),
    "production access packet must not be a root object",
    errors
  );
}

function validateErrorExamples(errorExamples, manifest, errors) {
  const flowIds = new Set((manifest.flows ?? []).map((flow) => flow.id));
  const recoveryRuleIds = new Set(
    readText("apps/web/lib/agent-discovery.ts").match(/id: "([a-z_]+)"/g)?.map((match) =>
      match.replace('id: "', "").replace('"', "")
    ) ?? []
  );
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);
  const exampleIds = new Set((errorExamples.examples ?? []).map((example) => example.id));

  assert(errorExamples.schemaVersion === 1, "error examples schemaVersion must be 1", errors);
  assert(
    errorExamples.status === "live_error_example_pack",
    "error examples must use live example status",
    errors
  );
  assert(
    errorExamples.standard?.contentType === "application/problem+json",
    "error examples must use application/problem+json",
    errors
  );
  assert(errorExamples.canonicalBoundary?.rootObject === "Request", "error examples must keep Request as root", errors);
  includesAll(
    Array.from(exampleIds),
    [
      "missing_scope_commitment_proposal",
      "artifact_idempotency_conflict",
      "monitor_rate_limited",
      "private_request_not_visible",
      "blocked_fulfillment_retry_needed",
      "payment_uncertain_solution_run",
      "unknown_write_result_after_timeout"
    ],
    "agent error examples",
    errors
  );

  for (const example of errorExamples.examples ?? []) {
    assert(recoveryRuleIds.has(example.recoveryRuleId), `${example.id} recoveryRuleId must reference recovery profile`, errors);
    assert(example.contentType === "application/problem+json", `${example.id} contentType must be problem+json`, errors);
    assert(example.problem?.status === example.httpStatus, `${example.id} problem status must match httpStatus`, errors);
    assert(example.problem?.type?.startsWith("https://boreal.work/problems/agent/"), `${example.id} must use a stable Boreal problem type URI`, errors);
    assert(
      example.problem?.requestId === "00000000-0000-4000-8000-000000000001" ||
        example.id === "private_request_not_visible",
      `${example.id} must use the stable sandbox request id unless demonstrating private/not-found`,
      errors
    );
    for (const actionId of example.actionIds ?? []) {
      assert(flowIds.has(actionId), `${example.id} action ${actionId} must reference a sandbox flow`, errors);
    }
    for (const write of example.canonicalWritesAllowed ?? []) {
      assert(durableWrites.has(write), `${example.id} write ${write} must be canonical`, errors);
    }
    assert(
      (example.notAuthority ?? []).some((boundary) =>
        /permission|approval|completion|payment|RequestEvent|Artifact|Commitment/i.test(boundary)
      ),
      `${example.id} must declare non-authority boundaries`,
      errors
    );
  }

  assert(
    (errorExamples.examples ?? []).some(
      (example) =>
        example.recoveryRuleId === "terminal_or_unknown_server_failure" &&
        example.retryPolicy === "verify_state_before_retry"
    ),
    "error examples must include unknown write verification before retry",
    errors
  );
  assert(
    (errorExamples.examples ?? []).some(
      (example) =>
        example.recoveryRuleId === "payment_or_credit_uncertain" &&
        (example.canonicalReadsBeforeRetry ?? []).includes("Transaction")
    ),
    "error examples must include payment uncertainty Transaction read",
    errors
  );
  assert(
    (errorExamples.canonicalBoundary?.problemExamplesAreNot ?? []).includes("durable history"),
    "error examples must not be durable history",
    errors
  );
  assert(
    (errorExamples.canonicalBoundary?.notRoots ?? []).includes("HTTP problem"),
    "error examples must keep HTTP problems out of root truth",
    errors
  );
}

function validateHumanHandoffPackets(packets, manifest, errors) {
  const flowIds = new Set((manifest.flows ?? []).map((flow) => flow.id));
  const handoffMomentIds = new Set(
    readText("apps/web/lib/agent-discovery.ts").match(/id: "([a-z_]+)"/g)?.map((match) =>
      match.replace('id: "', "").replace('"', "")
    ) ?? []
  );
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);
  const packetIds = new Set((packets.examples ?? []).map((packet) => packet.id));

  assert(packets.schemaVersion === 1, "human handoff packets schemaVersion must be 1", errors);
  assert(
    packets.status === "live_handoff_packet_examples",
    "human handoff packets must use live example status",
    errors
  );
  assert(
    packets.canonicalBoundary?.rootObject === "Request",
    "human handoff packets must keep Request as root",
    errors
  );
  includesAll(
    Array.from(packetIds),
    [
      "request_draft_approval_packet",
      "commitment_owner_review_packet",
      "proof_review_packet",
      "monitor_escalation_packet",
      "payment_authorization_packet"
    ],
    "human handoff packet examples",
    errors
  );

  for (const packet of packets.examples ?? []) {
    assert(packet.status === "example_only", `${packet.id} must be example_only`, errors);
    assert(flowIds.has(packet.actionId), `${packet.id} actionId must reference a sandbox flow`, errors);
    assert(
      handoffMomentIds.has(packet.handoffMomentId),
      `${packet.id} handoffMomentId must reference the human handoff profile`,
      errors
    );
    assert(
      packet.example?.requestId === "00000000-0000-4000-8000-000000000001",
      `${packet.id} must use the stable sandbox request id`,
      errors
    );
    assert(
      (packet.notAuthority ?? []).some((boundary) =>
        /approval|permission|completion|payment/i.test(boundary)
      ),
      `${packet.id} must declare non-authority boundaries`,
      errors
    );
    assert(
      (packet.example?.agentWillNotDo ?? []).length > 0,
      `${packet.id} must tell the human what the agent will not do`,
      errors
    );
    for (const write of packet.canonicalWritesIfApproved ?? []) {
      assert(durableWrites.has(write), `${packet.id} write ${write} must be canonical`, errors);
    }
  }

  assert(
    (packets.examples ?? []).some(
      (packet) => packet.approvalRequired === true && packet.actionId === "run_public_solution"
    ),
    "human handoff packets must include explicit payment authorization example",
    errors
  );
  assert(
    (packets.examples ?? []).some(
      (packet) => packet.approvalRequired === false && packet.actionId === "monitor_request"
    ),
    "human handoff packets must include monitor escalation example",
    errors
  );
  assert(
    (packets.canonicalBoundary?.handoffPacketsAreNot ?? []).includes("human approval record"),
    "human handoff packets must not be approval records",
    errors
  );
  assert(
    (packets.canonicalBoundary?.notRoots ?? []).includes("handoff packet"),
    "human handoff packets must not be root objects",
    errors
  );
}

function validateOpportunityCards(cards, manifest, errors) {
  const flowIds = new Set((manifest.flows ?? []).map((flow) => flow.id));
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);
  const cardIds = new Set((cards.examples ?? []).map((card) => card.id));

  assert(cards.schemaVersion === 1, "opportunity card examples schemaVersion must be 1", errors);
  assert(
    cards.status === "live_opportunity_card_examples",
    "opportunity card examples must have live example status",
    errors
  );
  assert(cards.canonicalBoundary?.rootObject === "Request", "opportunity cards must keep Request as root", errors);
  includesAll(
    Array.from(cardIds),
    [
      "strong_fit_apply_card",
      "monitor_only_card",
      "run_solution_candidate_card",
      "optimize_only_card"
    ],
    "opportunity card examples",
    errors
  );

  for (const card of cards.examples ?? []) {
    assert(card.status === "example_only", `${card.id} must be example_only`, errors);
    assert(flowIds.has(card.recommendedNextAction), `${card.id} recommended action must reference a sandbox flow`, errors);
    for (const action of card.availableActionIds ?? []) {
      assert(flowIds.has(action), `${card.id} available action ${action} must reference a sandbox flow`, errors);
    }
    for (const write of card.canonicalWritesIfActionTaken ?? []) {
      assert(durableWrites.has(write), `${card.id} write ${write} must be canonical`, errors);
    }
    assert(
      (card.notAuthority ?? []).some((boundary) =>
        /permission|assignment|payment|completion|fulfillment/i.test(boundary)
      ),
      `${card.id} must declare non-authority boundaries`,
      errors
    );
    assert(
      (card.example?.agentShouldNotDo ?? []).length > 0,
      `${card.id} must tell agents what not to do`,
      errors
    );
  }

  assert(
    (cards.examples ?? []).some(
      (card) =>
        card.recommendedNextAction === "apply_to_request" &&
        (card.canonicalWritesIfActionTaken ?? []).includes("Commitment")
    ),
    "opportunity cards must include an apply example with Commitment write effect",
    errors
  );
  assert(
    (cards.examples ?? []).some(
      (card) =>
        card.recommendedNextAction === "run_public_solution" &&
        (card.canonicalWritesIfActionTaken ?? []).includes("Transaction")
    ),
    "opportunity cards must include a solution-run example with Transaction write effect",
    errors
  );
  assert(
    (cards.examples ?? []).some(
      (card) =>
        card.recommendedNextAction === "monitor_request" &&
        (card.canonicalWritesIfActionTaken ?? []).length === 0
    ),
    "opportunity cards must include a monitor-only no-write example",
    errors
  );
  assert(
    (cards.canonicalBoundary?.opportunityCardsAreNot ?? []).includes("permission grant"),
    "opportunity cards must not grant permission",
    errors
  );
  assert(
    (cards.canonicalBoundary?.notRoots ?? []).includes("fit score"),
    "opportunity fit scores must not be root objects",
    errors
  );
}

function validateProtocolAdapterSamples(samples, manifest, errors) {
  const flowIds = new Set((manifest.flows ?? []).map((flow) => flow.id));
  const durableWrites = new Set(manifest.canonicalBoundary?.durableWrites ?? []);
  const standards = new Set((samples.samples ?? []).map((sample) => sample.standard));

  assert(samples.schemaVersion === 1, "protocol adapter samples schemaVersion must be 1", errors);
  assert(
    samples.status === "target_protocol_sample_pack",
    "protocol adapter samples must stay target-only",
    errors
  );
  assert(samples.canonicalBoundary?.rootObject === "Request", "protocol adapter samples must keep Request as root", errors);
  includesAll(Array.from(standards), ["mcp", "a2a", "x402"], "protocol adapter samples standards", errors);

  for (const sample of samples.samples ?? []) {
    assert(sample.notAcceptedByProduction === true, `${sample.id} must not be accepted by production`, errors);
    assert(flowIds.has(sample.actionId), `${sample.id} actionId must reference a sandbox flow`, errors);
    for (const write of sample.borealOperation?.canonicalWrites ?? []) {
      assert(durableWrites.has(write), `${sample.id} write ${write} must be canonical`, errors);
    }
    assert(
      (sample.promotionRules ?? []).some((rule) =>
        /not completion proof|not a Request id|Transaction/i.test(rule)
      ),
      `${sample.id} must include a promotion boundary rule`,
      errors
    );
  }

  assert(
    (samples.canonicalBoundary?.adapterSamplesAreNot ?? []).includes("permission grant"),
    "protocol adapter samples must not grant permission",
    errors
  );
  assert(
    (samples.canonicalBoundary?.notRoots ?? []).includes("A2A task") &&
      (samples.canonicalBoundary?.notRoots ?? []).includes("x402 payment payload"),
    "protocol adapter samples must keep adapter envelopes out of root truth",
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
const errorExamplesSchema = readJson(errorExamplesSchemaPath);
const humanHandoffPacketsSchema = readJson(humanHandoffPacketsSchemaPath);
const opportunityCardsSchema = readJson(opportunityCardsSchemaPath);
const productionAccessPacketSchema = readJson(productionAccessPacketSchemaPath);
const protocolAdapterSamplesSchema = readJson(protocolAdapterSamplesSchemaPath);
const manifest = readJson(manifestPath);
const conformanceReport = readJson(conformanceReportPath);
const errorExamples = readJson(errorExamplesPath);
const humanHandoffPackets = readJson(humanHandoffPacketsPath);
const opportunityCards = readJson(opportunityCardsPath);
const productionAccessPacket = readJson(productionAccessPacketPath);
const protocolAdapterSamples = readJson(protocolAdapterSamplesPath);
const errors = [];

validateSchema(schema, errors);
validateConformanceReportSchema(conformanceReportSchema, errors);
validateErrorExamplesSchema(errorExamplesSchema, errors);
validateHumanHandoffPacketsSchema(humanHandoffPacketsSchema, errors);
validateOpportunityCardsSchema(opportunityCardsSchema, errors);
validateProductionAccessPacketSchema(productionAccessPacketSchema, errors);
validateProtocolAdapterSamplesSchema(protocolAdapterSamplesSchema, errors);
validateManifestShape(manifest, errors);
validateMockIdentities(manifest, errors);
validateFlows(manifest, errors);
validateScenarios(manifest, errors);
validateCanonBoundary(manifest, errors);
validateConformanceReport(conformanceReport, manifest, errors);
validateErrorExamples(errorExamples, manifest, errors);
validateHumanHandoffPackets(humanHandoffPackets, manifest, errors);
validateOpportunityCards(opportunityCards, manifest, errors);
validateProductionAccessPacket(productionAccessPacket, manifest, errors);
validateProtocolAdapterSamples(protocolAdapterSamples, manifest, errors);
validateImplementationAndDocs(manifest, errors);

const serialized = JSON.stringify({ manifest, conformanceReport, errorExamples, humanHandoffPackets, opportunityCards, productionAccessPacket, protocolAdapterSamples });
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

import assert from "node:assert/strict";
import {
  allAgentDiscoveryAssets,
  buildAgentActionCatalog,
  buildAgentActionsMarkdown,
  buildAgentCard,
  buildAgentMonitorWebhooksMarkdown,
  buildAgentProtocolProfile,
  buildAgentProtocolProfileMarkdown,
  buildAgentRecoveryProfile,
  buildAgentStartMarkdown,
  buildAgentWorkflowCatalog,
  buildOpenApiDiscoveryIndex,
  findEventAsset,
  findJsonSchemaAsset,
  findOpenApiAsset,
  readDiscoveryAsset,
} from "@/lib/agent-discovery";
import {
  buildAgentSandboxManifest,
  buildAgentSandboxMarkdown,
} from "@/lib/agent-sandbox";
import {
  buildRequestAgentActionAffordances,
  buildRequestAgentActionPolicy,
} from "@/lib/request";
import { GET as getAgentCard } from "@/app/.well-known/agent-card.json/route";
import { GET as getAgentActions } from "@/app/agents/actions.md/route";
import { GET as getAgentMonitorWebhooks } from "@/app/agents/monitor-webhooks.md/route";
import { GET as getAgentProtocols } from "@/app/agents/protocols.md/route";
import { GET as getAgentProtocolsJson } from "@/app/agents/protocols.json/route";
import { GET as getAgentRecovery } from "@/app/agents/recovery.json/route";
import { GET as getAgentSandboxJson } from "@/app/agents/sandbox.json/route";
import { GET as getAgentSandboxMd } from "@/app/agents/sandbox.md/route";
import { GET as getAgentStart } from "@/app/agents/start.md/route";
import { GET as getAgentWorkflows } from "@/app/agents/workflows.json/route";
import { GET as getAsyncApiContract } from "@/app/events/[contract]/route";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import { GET as getOpenApiContract } from "@/app/openapi/[contract]/route";
import { GET as getOpenApiIndex } from "@/app/openapi.json/route";
import { GET as getJsonSchema } from "@/app/schemas/[schema]/route";
import {
  buildRequestActivityCursor,
  parseRequestActivityCursor,
} from "@/lib/request-activity-cursor";
import {
  createAgentMonitorWebhookSignature,
  verifyAgentMonitorWebhookSignature,
} from "@/lib/agent-monitor-webhook-signature";

async function main() {
  const agentCard = buildAgentCard();

  assert.equal(agentCard.name, "Boreal Network");
  assert.equal(agentCard.xBorealBoundary.rootObject, "Request");
  assert.equal(agentCard.xBorealBoundary.notRoots.includes("A2A Task"), true);
  assert.equal(agentCard.capabilities.contractSandbox, true);
  assert.equal(agentCard.sandboxUrl.endsWith("/agents/sandbox.json"), true);
  assert.equal(
    agentCard.workflowCatalogUrl.endsWith("/agents/workflows.json"),
    true,
  );
  assert.equal(
    agentCard.protocolProfileJsonUrl.endsWith("/agents/protocols.json"),
    true,
  );
  assert.equal(
    agentCard.recoveryProfileUrl.endsWith("/agents/recovery.json"),
    true,
  );
  assert.equal(
    agentCard.workflows.some(
      (workflow) => workflow.id === "apply_complete_monitor"
    ),
    true,
  );
  assert.equal(
    agentCard.authentication.schemes.includes("resolver_bearer"),
    true,
  );
  assert.equal(
    agentCard.protocols.some(
      (protocol) => protocol.id === "mcp" && protocol.status === "target_adapter_profile"
    ),
    true,
  );
  assert.equal(agentCard.recovery.status, "live_recovery_profile");
  assert.equal(
    agentCard.skills.some((skill) => skill.id === "inspect_public_requests"),
    true,
  );
  assert.equal(
    agentCard.skills.some((skill) => skill.canonicalWrite === "Artifact"),
    true,
  );

  const agentActions = buildAgentActionCatalog();
  assert.equal(
    agentActions.some(
      (action) =>
        action.id === "apply_to_request" &&
        action.canonicalWrites.includes("Commitment") &&
        action.auth.includes("commitments:propose")
    ),
    true,
  );
  assert.equal(
    agentActions.some(
      (action) =>
        action.id === "submit_artifact" &&
        action.canonicalWrites.includes("Artifact") &&
        action.auth.includes("artifacts:publish")
    ),
    true,
  );
  assert.equal(
    agentActions.some(
      (action) =>
        action.id === "monitor_request" &&
        action.standards.includes("AsyncAPI")
    ),
    true,
  );
  assert.equal(
    agentActions.some(
      (action) =>
        action.id === "optimize_request_brief" &&
        action.availability === "target_profile"
    ),
    true,
  );
  assert.equal(
    agentActions.some((action) =>
      action.entrypoints.some((entrypoint) =>
        entrypoint.endsWith("/api/requests/{id}/commitments")
      )
    ),
    true,
  );
  assert.equal(
    agentActions.some((action) =>
      action.guideUrl.endsWith("/agents/actions.md#apply_to_request")
    ),
    true,
  );

  const actionGuide = buildAgentActionsMarkdown();
  assert.match(actionGuide, /Boreal Agent Action Playbook/);
  assert.match(actionGuide, /POST \/api\/requests\/\{id\}\/commitments/);
  assert.match(actionGuide, /POST \/api\/requests\/\{id\}\/artifacts/);
  assert.match(
    actionGuide,
    /GET \/api\/requests\/\{id\}\/activity\?after_sequence=/
  );
  assert.match(actionGuide, /cursor\.nextAfterSequence/);
  assert.match(actionGuide, /Optimization is a target profile/);

  const parsedDefaultCursor = parseRequestActivityCursor(
    new URLSearchParams()
  );
  assert.equal(parsedDefaultCursor.ok, true);
  if (parsedDefaultCursor.ok) {
    assert.equal(parsedDefaultCursor.value.limit, 40);
    assert.equal(parsedDefaultCursor.value.afterSequence, undefined);
  }

  const parsedResumeCursor = parseRequestActivityCursor(
    new URLSearchParams("after_sequence=12&limit=2")
  );
  assert.equal(parsedResumeCursor.ok, true);
  if (parsedResumeCursor.ok) {
    assert.equal(parsedResumeCursor.value.afterSequence, 12);
    assert.equal(parsedResumeCursor.value.limit, 2);
  }

  const rejectedCursor = parseRequestActivityCursor(
    new URLSearchParams("after_sequence=-1")
  );
  assert.equal(rejectedCursor.ok, false);

  const monitorCursor = buildRequestActivityCursor({
    activity: [{ sequence: 13 }, { sequence: 14 }],
    afterSequence: 12,
    fetchedCount: 3,
    limit: 2,
  });
  assert.equal(monitorCursor.order, "replay");
  assert.equal(monitorCursor.nextAfterSequence, 14);
  assert.equal(monitorCursor.hasMoreNewer, true);

  const webhookBody = JSON.stringify({
    cursor: monitorCursor,
    deliveryId: "00000000-0000-0000-0000-000000000001",
    requestId: "00000000-0000-0000-0000-000000000002",
    schemaVersion: 1,
  });
  const webhookSignature = createAgentMonitorWebhookSignature({
    body: webhookBody,
    deliveryId: "00000000-0000-0000-0000-000000000001",
    secret: "agent-monitor-secret",
    timestamp: 1_780_000_000,
  });
  assert.equal(
    verifyAgentMonitorWebhookSignature({
      body: webhookBody,
      deliveryId: "00000000-0000-0000-0000-000000000001",
      now: 1_780_000_050_000,
      secret: "agent-monitor-secret",
      signatureHeader: webhookSignature,
      timestamp: 1_780_000_000,
    }),
    true,
  );
  assert.equal(
    verifyAgentMonitorWebhookSignature({
      body: `${webhookBody} `,
      deliveryId: "00000000-0000-0000-0000-000000000001",
      now: 1_780_000_050_000,
      secret: "agent-monitor-secret",
      signatureHeader: webhookSignature,
      timestamp: 1_780_000_000,
    }),
    false,
  );

  const monitorWebhookGuide = buildAgentMonitorWebhooksMarkdown();
  assert.match(monitorWebhookGuide, /Boreal Agent Monitor Webhook Profile/);
  assert.match(monitorWebhookGuide, /Boreal-Webhook-Signature/);
  assert.match(monitorWebhookGuide, /target profile/);

  const protocolProfile = buildAgentProtocolProfileMarkdown();
  assert.match(protocolProfile, /Boreal Agent Protocol Profile/);
  assert.match(protocolProfile, /MCP sessions, A2A tasks, x402 payment payloads/);
  assert.match(protocolProfile, /MCP must not carry high-frequency token deltas/);
  assert.match(protocolProfile, /A2A task ids must be stored as adapter correlation ids/);
  assert.match(protocolProfile, /x402 verification\/settlement must reconcile into Boreal `Transaction`/);

  const protocolProfileJson = buildAgentProtocolProfile();
  assert.equal(protocolProfileJson.status, "live_protocol_profile");
  assert.equal(protocolProfileJson.canonicalBoundary.rootObject, "Request");
  assert.equal(
    protocolProfileJson.canonicalBoundary.notRoots.includes("A2A task"),
    true,
  );
  assert.equal(
    protocolProfileJson.standards.some(
      (standard) =>
        standard.id === "mcp" &&
        standard.officialSpecUrl.includes("modelcontextprotocol.io") &&
        standard.tools.some((tool) => tool.id === "propose_commitment")
    ),
    true,
  );
  assert.equal(
    protocolProfileJson.standards.some(
      (standard) =>
        standard.id === "a2a" &&
        standard.adapterMappings.some(
          (mapping) =>
            mapping.externalConcept === "Task" &&
            mapping.borealMapping.includes("never the Boreal root object")
        )
    ),
    true,
  );
  assert.equal(
    protocolProfileJson.standards.some(
      (standard) =>
        standard.id === "x402" &&
        standard.adapterMappings.some((mapping) =>
          mapping.durableWrites.includes("Transaction")
        )
    ),
    true,
  );

  const recoveryProfile = buildAgentRecoveryProfile();
  assert.equal(recoveryProfile.status, "live_recovery_profile");
  assert.equal(recoveryProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    recoveryProfile.idempotencyPolicy.requiredFor.includes("run_public_solution"),
    true,
  );
  assert.equal(
    recoveryProfile.recoveryRules.some(
      (rule) =>
        rule.id === "forbidden_or_missing_scope" &&
        rule.nextAction.includes("agentActionPolicy")
    ),
    true,
  );
  assert.equal(
    recoveryProfile.recoveryRules.some(
      (rule) =>
        rule.id === "blocked_fulfillment_or_retryable_provider_failure" &&
        rule.canonicalWritesAllowed.includes("Fulfillment")
    ),
    true,
  );
  assert.equal(
    recoveryProfile.recoveryRules.some(
      (rule) =>
        rule.id === "payment_or_credit_uncertain" &&
        rule.canonicalWritesAllowed.includes("Transaction")
    ),
    true,
  );

  const sandboxManifest = buildAgentSandboxManifest();
  assert.equal(sandboxManifest.mode, "contract_only");
  assert.equal(sandboxManifest.status, "live_contract_sandbox");
  assert.equal(sandboxManifest.notAcceptedByProduction, true);
  assert.equal(sandboxManifest.mockCredentialsAcceptedByProduction, false);
  assert.equal(sandboxManifest.validationCommand, "pnpm contracts:agent-sandbox");
  assert.equal(
    sandboxManifest.contractFixturePath,
    "fixtures/agent/sandbox-manifest.sample.json",
  );
  assert.equal(sandboxManifest.canonicalBoundary.rootObject, "Request");
  assert.equal(
    sandboxManifest.schemaUrl.endsWith("/schemas/agent-sandbox.schema.json"),
    true,
  );
  assert.equal(
    sandboxManifest.mockIdentities.every(
      (identity) => identity.notAcceptedByProduction
    ),
    true,
  );
  const sandboxText = JSON.stringify(sandboxManifest);
  assert.match(sandboxText, /apply_to_request/);
  assert.match(sandboxText, /submit_artifact/);
  assert.match(sandboxText, /monitor_request/);
  assert.match(sandboxText, /run_public_solution/);
  assert.match(sandboxText, /signed_monitor_webhook/);
  assert.match(sandboxText, /optimize_request_brief/);
  assert.match(sandboxText, /Idempotency-Key/);
  assert.match(sandboxText, /artifactKind/);
  assert.match(sandboxText, /after_sequence=0/);
  assert.match(sandboxText, /cursor.nextAfterSequence/);
  assert.match(sandboxText, /Boreal-Webhook-Signature/);

  const sandboxGuide = buildAgentSandboxMarkdown();
  assert.match(sandboxGuide, /contract-only sandbox/);
  assert.match(sandboxGuide, /not accepted by production endpoints/);
  assert.match(sandboxGuide, /Apply To A Request/);
  assert.match(sandboxGuide, /Submit Proof/);

  const workflowCatalog = buildAgentWorkflowCatalog();
  assert.equal(workflowCatalog.status, "live_workflow_catalog");
  assert.equal(workflowCatalog.canonicalBoundary.rootObject, "Request");
  assert.equal(
    workflowCatalog.canonicalBoundary.notRoots.includes("agentActionPolicy"),
    true,
  );
  assert.equal(
    workflowCatalog.policyRule.includes("agentActionPolicy"),
    true,
  );
  assert.equal(
    workflowCatalog.workflows.some(
      (workflow) =>
        workflow.id === "apply_complete_monitor" &&
        workflow.policyCheckpoint.requiredBeforeWrite &&
        workflow.requiredResolverScopes.includes("commitments:propose") &&
        workflow.idempotencyRequiredFor.includes("submit_artifact")
    ),
    true,
  );
  assert.equal(
    workflowCatalog.workflows.some(
      (workflow) =>
        workflow.id === "make_request_for_human" &&
        workflow.forbiddenMoves.some((move) =>
          move.includes("without explicit buyer approval")
        )
    ),
    true,
  );
  assert.equal(
    workflowCatalog.workflows.some(
      (workflow) =>
        workflow.id === "run_public_solution" &&
        workflow.forbiddenMoves.some((move) =>
          move.includes("Do not debit credits for public inspection")
        )
    ),
    true,
  );

  const publicRequestAffordances = buildRequestAgentActionAffordances({
    activeRefs: {},
    id: "00000000-0000-4000-8000-000000000201",
    status: "open",
    visibility: "public",
  });
  assert.equal(publicRequestAffordances.schemaVersion, 1);
  assert.equal(publicRequestAffordances.subject.type, "Request");
  assert.equal(publicRequestAffordances.roleHint, "public_request");
  assert.equal(
    publicRequestAffordances.actions.some(
      (action) =>
        action.id === "apply_to_request" &&
        action.href.endsWith("/commitments") &&
        action.availability === "available_with_auth" &&
        action.canonicalWrites.includes("Commitment") &&
        action.idempotencyRequired
    ),
    true,
  );
  assert.equal(
    publicRequestAffordances.actions.some(
      (action) =>
        action.id === "monitor_request" &&
        action.href.includes("after_sequence=0") &&
        action.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    publicRequestAffordances.actions.some(
      (action) => action.id === "run_public_solution"
    ),
    false,
  );

  const publicSolutionAffordances = buildRequestAgentActionAffordances({
    activeRefs: {
      acceptedArtifactId: "00000000-0000-4000-8000-000000000202",
    },
    id: "00000000-0000-4000-8000-000000000203",
    status: "completed",
    visibility: "public",
  });
  assert.equal(publicSolutionAffordances.roleHint, "public_solution");
  assert.equal(
    publicSolutionAffordances.actions.some(
      (action) =>
        action.id === "run_public_solution" &&
        action.href.endsWith("/solution-runs") &&
        action.canonicalWrites.includes("Transaction") &&
        action.idempotencyRequired
    ),
    true,
  );

  const anonymousPublicPolicy = buildRequestAgentActionPolicy({
    actor: { kind: "anonymous" },
    request: {
      activeRefs: {},
      id: "00000000-0000-4000-8000-000000000204",
      ownerId: "owner-user",
      status: "open",
      visibility: "public",
    },
  });
  assert.equal(anonymousPublicPolicy.actor.kind, "anonymous");
  assert.equal(
    anonymousPublicPolicy.decisions.find(
      (decision) => decision.id === "inspect_public_requests"
    )?.state,
    "allowed",
  );
  assert.equal(
    anonymousPublicPolicy.decisions.find(
      (decision) => decision.id === "monitor_request"
    )?.state,
    "allowed",
  );
  assert.equal(
    anonymousPublicPolicy.decisions.find(
      (decision) => decision.id === "apply_to_request"
    )?.state,
    "blocked",
  );

  const resolverApplyPolicy = buildRequestAgentActionPolicy({
    actor: {
      kind: "resolver",
      userId: "solver-user",
      scopes: ["commitments:propose"],
    },
    request: {
      activeRefs: {},
      id: "00000000-0000-4000-8000-000000000205",
      ownerId: "owner-user",
      status: "open",
      visibility: "public",
    },
  });
  const resolverApplyDecision = resolverApplyPolicy.decisions.find(
    (decision) => decision.id === "apply_to_request"
  );
  assert.equal(resolverApplyDecision?.state, "allowed_with_idempotency");
  assert.equal(
    resolverApplyDecision?.requiredScopes.includes("commitments:propose"),
    true,
  );
  assert.deepEqual(resolverApplyDecision?.missingScopes, []);

  const resolverMissingScopePolicy = buildRequestAgentActionPolicy({
    actor: {
      kind: "resolver",
      userId: "solver-user",
      scopes: [],
    },
    request: {
      activeRefs: {},
      id: "00000000-0000-4000-8000-000000000206",
      ownerId: "owner-user",
      status: "open",
      visibility: "public",
    },
  });
  const missingScopeApplyDecision = resolverMissingScopePolicy.decisions.find(
    (decision) => decision.id === "apply_to_request"
  );
  assert.equal(missingScopeApplyDecision?.state, "blocked");
  assert.deepEqual(missingScopeApplyDecision?.missingScopes, [
    "commitments:propose",
  ]);

  const sessionSolutionPolicy = buildRequestAgentActionPolicy({
    actor: {
      kind: "session",
      userId: "buyer-user",
    },
    request: {
      activeRefs: {
        acceptedArtifactId: "00000000-0000-4000-8000-000000000207",
      },
      id: "00000000-0000-4000-8000-000000000208",
      ownerId: "owner-user",
      status: "completed",
      visibility: "public",
    },
  });
  assert.equal(sessionSolutionPolicy.roleHint, "public_solution");
  assert.equal(
    sessionSolutionPolicy.decisions.find(
      (decision) => decision.id === "run_public_solution"
    )?.state,
    "allowed_with_idempotency",
  );

  const resolverSolutionPolicy = buildRequestAgentActionPolicy({
    actor: {
      kind: "resolver",
      userId: "buyer-user",
      scopes: ["requests:read_public"],
    },
    request: {
      activeRefs: {
        acceptedArtifactId: "00000000-0000-4000-8000-000000000209",
      },
      id: "00000000-0000-4000-8000-000000000210",
      ownerId: "owner-user",
      status: "completed",
      visibility: "public",
    },
  });
  assert.equal(
    resolverSolutionPolicy.decisions.find(
      (decision) => decision.id === "run_public_solution"
    )?.state,
    "blocked",
  );

  const startGuide = buildAgentStartMarkdown();
  assert.match(startGuide, /GET \/api\/requests\?scope=public/);
  assert.match(startGuide, /agentActionAffordances/);
  assert.match(startGuide, /agentActionPolicy/);
  assert.match(startGuide, /GET \/agents\/workflows\.json/);
  assert.match(startGuide, /GET \/agents\/protocols\.json/);
  assert.match(startGuide, /GET \/agents\/recovery\.json/);
  assert.match(startGuide, /Agent action playbook/);
  assert.match(startGuide, /Agent contract sandbox/);
  assert.match(startGuide, /Agent Workflow Catalog/);
  assert.match(startGuide, /Optimize this/);
  assert.match(startGuide, /`Request` is the durable root object/);
  assert.match(startGuide, /If the request requires physical presence/);
  assert.match(startGuide, /MCP server support, A2A task adapters/);

  const discoveryIndex = buildOpenApiDiscoveryIndex();
  assert.equal(discoveryIndex.openapi, "3.1.0");
  assert.equal(discoveryIndex["x-boreal-boundary"].rootObject, "Request");
  assert.equal(
    discoveryIndex["x-boreal-agent-actions"].some(
      (action) => action.id === "run_public_solution"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-contracts"].jsonSchemas.some((asset) =>
      asset.url.endsWith("/schemas/request.schema.json")
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/.well-known/agent-card.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/actions.md"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/workflows.json"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/monitor-webhooks.md"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/protocols.md"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/protocols.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/recovery.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/sandbox.md"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/sandbox.json"), true);
  assert.equal(
    discoveryIndex["x-boreal-agent-protocols"].standards.some(
      (standard) => standard.id === "x402"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-recovery"].rules.some(
      (rule) => rule.id === "payment_or_credit_uncertain"
    ),
    true,
  );

  assert.equal(
    findOpenApiAsset("request-briefing.yaml")?.sourcePath,
    "schemas/openapi/request-briefing.openapi.yaml",
  );
  assert.equal(
    findOpenApiAsset("request-briefing.openapi.yaml")?.routePath,
    "/openapi/request-briefing.yaml",
  );
  assert.equal(
    findJsonSchemaAsset("request.schema.json")?.sourcePath,
    "schemas/json/request.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-sandbox.schema.json")?.sourcePath,
    "schemas/json/agent-sandbox.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-workflows.schema.json")?.sourcePath,
    "schemas/json/agent-workflows.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-protocols.schema.json")?.sourcePath,
    "schemas/json/agent-protocols.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-recovery.schema.json")?.sourcePath,
    "schemas/json/agent-recovery.schema.json",
  );
  assert.equal(
    findEventAsset("request-room.asyncapi.yaml")?.sourcePath,
    "schemas/events/request-room.asyncapi.yaml",
  );
  assert.equal(findJsonSchemaAsset(".gitkeep"), undefined);

  const requestOpenApiAsset = findOpenApiAsset("request-briefing.yaml");
  assert.ok(requestOpenApiAsset);
  const requestOpenApi = await readDiscoveryAsset(requestOpenApiAsset);
  assert.match(requestOpenApi, /securitySchemes:/);
  assert.match(requestOpenApi, /BorealAccountSession:/);
  assert.match(requestOpenApi, /ResolverBearer:/);
  assert.match(requestOpenApi, /x-boreal-required-scopes:/);
  assert.match(requestOpenApi, /commitments:propose/);
  assert.match(requestOpenApi, /artifacts:publish/);
  assert.match(requestOpenApi, /x-boreal-response-policy-field: agentActionPolicy/);

  const supplyOpenApiAsset = findOpenApiAsset("supply-management.yaml");
  assert.ok(supplyOpenApiAsset);
  const supplyOpenApi = await readDiscoveryAsset(supplyOpenApiAsset);
  assert.match(supplyOpenApi, /securitySchemes:/);
  assert.match(supplyOpenApi, /ResolverBearer:/);
  assert.match(supplyOpenApi, /supplies:read_private/);

  const paymentOpenApiAsset = findOpenApiAsset("payment-and-credit.yaml");
  assert.ok(paymentOpenApiAsset);
  const paymentOpenApi = await readDiscoveryAsset(paymentOpenApiAsset);
  assert.match(paymentOpenApi, /securitySchemes:/);
  assert.match(paymentOpenApi, /BorealAccountSession:/);
  assert.match(paymentOpenApi, /ResolverBearer:/);
  assert.match(paymentOpenApi, /\/api\/requests\/\{id\}\/solution-runs:/);
  assert.match(paymentOpenApi, /requests:read_private/);

  const resolverAuthOpenApiAsset = findOpenApiAsset("resolver-auth.yaml");
  assert.ok(resolverAuthOpenApiAsset);
  const resolverAuthOpenApi = await readDiscoveryAsset(
    resolverAuthOpenApiAsset,
  );
  assert.match(resolverAuthOpenApi, /x-boreal-auth-boundary:/);
  assert.match(resolverAuthOpenApi, /rate-limited before pending resolver records/);

  for (const asset of allAgentDiscoveryAssets) {
    const content = await readDiscoveryAsset(asset);
    assert.equal(content.length > 100, true, `${asset.sourcePath} is too small`);
    assert.equal(
      content.includes("PRIVATE KEY"),
      false,
      `${asset.sourcePath} should not expose private keys`
    );
  }

  const agentCardResponse = await getAgentCard();
  assert.equal(agentCardResponse.status, 200);
  assert.equal((await agentCardResponse.json()).name, "Boreal Network");

  const agentStartResponse = await getAgentStart();
  assert.equal(agentStartResponse.status, 200);
  assert.match(await agentStartResponse.text(), /Boreal Agent Start/);

  const agentActionsResponse = await getAgentActions();
  assert.equal(agentActionsResponse.status, 200);
  assert.match(
    await agentActionsResponse.text(),
    /Boreal Agent Action Playbook/
  );

  const agentWorkflowsResponse = await getAgentWorkflows();
  assert.equal(agentWorkflowsResponse.status, 200);
  assert.equal(
    (await agentWorkflowsResponse.json()).status,
    "live_workflow_catalog"
  );

  const agentMonitorWebhooksResponse = await getAgentMonitorWebhooks();
  assert.equal(agentMonitorWebhooksResponse.status, 200);
  assert.match(
    await agentMonitorWebhooksResponse.text(),
    /Boreal Agent Monitor Webhook Profile/
  );

  const agentProtocolsResponse = await getAgentProtocols();
  assert.equal(agentProtocolsResponse.status, 200);
  assert.match(
    await agentProtocolsResponse.text(),
    /Boreal Agent Protocol Profile/
  );

  const agentProtocolsJsonResponse = await getAgentProtocolsJson();
  assert.equal(agentProtocolsJsonResponse.status, 200);
  assert.equal(
    (await agentProtocolsJsonResponse.json()).status,
    "live_protocol_profile"
  );

  const agentRecoveryResponse = await getAgentRecovery();
  assert.equal(agentRecoveryResponse.status, 200);
  assert.equal(
    (await agentRecoveryResponse.json()).status,
    "live_recovery_profile"
  );

  const agentSandboxMdResponse = await getAgentSandboxMd();
  assert.equal(agentSandboxMdResponse.status, 200);
  assert.match(await agentSandboxMdResponse.text(), /Boreal Agent Sandbox/);

  const agentSandboxJsonResponse = await getAgentSandboxJson();
  assert.equal(agentSandboxJsonResponse.status, 200);
  assert.equal((await agentSandboxJsonResponse.json()).mode, "contract_only");

  const llmsResponse = await getLlmsTxt();
  assert.equal(llmsResponse.status, 200);
  const llmsText = await llmsResponse.text();
  assert.match(llmsText, /Agent Discovery/);
  assert.match(llmsText, /Agent action playbook/);
  assert.match(llmsText, /Agent protocol profile JSON/);
  assert.match(llmsText, /Agent recovery profile/);
  assert.match(llmsText, /Agent contract sandbox/);

  const openApiIndexResponse = await getOpenApiIndex();
  assert.equal(openApiIndexResponse.status, 200);
  assert.equal((await openApiIndexResponse.json()).openapi, "3.1.0");

  const openApiContractResponse = await getOpenApiContract(new Request("http://boreal.test"), {
    params: Promise.resolve({ contract: "request-briefing.yaml" }),
  });
  assert.equal(openApiContractResponse.status, 200);
  assert.match(await openApiContractResponse.text(), /openapi:/);

  const schemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "request.schema.json" }),
  });
  assert.equal(schemaResponse.status, 200);
  assert.equal((await schemaResponse.json()).title, "Request");

  const sandboxSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-sandbox.schema.json" }),
  });
  assert.equal(sandboxSchemaResponse.status, 200);
  assert.equal((await sandboxSchemaResponse.json()).title, "AgentSandbox");

  const workflowSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-workflows.schema.json" }),
  });
  assert.equal(workflowSchemaResponse.status, 200);
  assert.equal(
    (await workflowSchemaResponse.json()).title,
    "AgentWorkflowCatalog"
  );

  const protocolSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-protocols.schema.json" }),
  });
  assert.equal(protocolSchemaResponse.status, 200);
  assert.equal(
    (await protocolSchemaResponse.json()).title,
    "AgentProtocolProfile"
  );

  const recoverySchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-recovery.schema.json" }),
  });
  assert.equal(recoverySchemaResponse.status, 200);
  assert.equal(
    (await recoverySchemaResponse.json()).title,
    "AgentRecoveryProfile"
  );

  const eventResponse = await getAsyncApiContract(new Request("http://boreal.test"), {
    params: Promise.resolve({ contract: "request-room.asyncapi.yaml" }),
  });
  assert.equal(eventResponse.status, 200);
  assert.match(await eventResponse.text(), /asyncapi:/);

  console.log("Agent discovery contracts passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

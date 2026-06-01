import assert from "node:assert/strict";
import {
  allAgentDiscoveryAssets,
  buildAgentAccessReviewProfile,
  buildAgentActionCatalog,
  buildAgentActionsMarkdown,
  buildAgentAuthProfile,
  buildAgentCard,
  buildAgentConformanceProfile,
  buildAgentCompletionProfile,
  buildAgentEvidenceProfile,
  buildAgentRecoveryProfile,
  buildAgentExecutionProfile,
  buildAgentHumanHandoffProfile,
  buildAgentMonitoringProfile,
  buildAgentMonitorWebhooksMarkdown,
  buildAgentOnboardingProfile,
  buildAgentOptimizationProfile,
  buildAgentPaymentProfile,
  buildAgentPromptCatalog,
  buildAgentProtocolProfile,
  buildAgentProtocolProfileMarkdown,
  buildAgentReadinessProfile,
  buildAgentStartMarkdown,
  buildAgentToolRegistry,
  buildAgentWorkflowCatalog,
  buildOpenApiDiscoveryIndex,
  findEventAsset,
  findJsonSchemaAsset,
  findOpenApiAsset,
  readAgentConformanceReportExample,
  readAgentErrorExamples,
  readAgentHumanHandoffPacketExamples,
  readAgentProtocolAdapterSamples,
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
import { GET as getAgentAccessReview } from "@/app/agents/access-review.json/route";
import { GET as getAgentAuth } from "@/app/agents/auth.json/route";
import { GET as getAgentConformance } from "@/app/agents/conformance.json/route";
import { GET as getAgentConformanceReportExample } from "@/app/agents/conformance-report.example.json/route";
import { GET as getAgentCompletion } from "@/app/agents/completion.json/route";
import { GET as getAgentEvidence } from "@/app/agents/evidence.json/route";
import { GET as getAgentErrorExamples } from "@/app/agents/error-examples.json/route";
import { GET as getAgentExecution } from "@/app/agents/execution.json/route";
import { GET as getAgentHumanHandoffPacketExamples } from "@/app/agents/human-handoff-packets.example.json/route";
import { GET as getAgentHumanHandoffs } from "@/app/agents/human-handoffs.json/route";
import { GET as getAgentMonitoring } from "@/app/agents/monitoring.json/route";
import { GET as getAgentMonitorWebhooks } from "@/app/agents/monitor-webhooks.md/route";
import { GET as getAgentOnboarding } from "@/app/agents/onboarding.json/route";
import { GET as getAgentOptimization } from "@/app/agents/optimization.json/route";
import { GET as getAgentPayments } from "@/app/agents/payments.json/route";
import { GET as getAgentPrompts } from "@/app/agents/prompts.json/route";
import { GET as getAgentProtocols } from "@/app/agents/protocols.md/route";
import { GET as getAgentProtocolsJson } from "@/app/agents/protocols.json/route";
import { GET as getAgentProtocolAdapterSamples } from "@/app/agents/protocol-adapter-samples.json/route";
import { GET as getAgentRecovery } from "@/app/agents/recovery.json/route";
import { GET as getAgentReadiness } from "@/app/agents/readiness.json/route";
import { GET as getAgentSandboxJson } from "@/app/agents/sandbox.json/route";
import { GET as getAgentSandboxMd } from "@/app/agents/sandbox.md/route";
import { GET as getAgentStart } from "@/app/agents/start.md/route";
import { GET as getAgentTools } from "@/app/agents/tools.json/route";
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
    agentCard.readinessProfileUrl.endsWith("/agents/readiness.json"),
    true,
  );
  assert.equal(agentCard.toolRegistryUrl.endsWith("/agents/tools.json"), true);
  assert.equal(
    agentCard.accessReviewProfileUrl.endsWith("/agents/access-review.json"),
    true,
  );
  assert.equal(agentCard.authProfileUrl.endsWith("/agents/auth.json"), true);
  assert.equal(
    agentCard.conformanceProfileUrl.endsWith("/agents/conformance.json"),
    true,
  );
  assert.equal(
    agentCard.completionProfileUrl.endsWith("/agents/completion.json"),
    true,
  );
  assert.equal(
    agentCard.evidenceProfileUrl.endsWith("/agents/evidence.json"),
    true,
  );
  assert.equal(
    agentCard.errorExamplesUrl.endsWith("/agents/error-examples.json"),
    true,
  );
  assert.equal(
    agentCard.humanHandoffProfileUrl.endsWith("/agents/human-handoffs.json"),
    true,
  );
  assert.equal(
    agentCard.humanHandoffPacketExamplesUrl.endsWith(
      "/agents/human-handoff-packets.example.json"
    ),
    true,
  );
  assert.equal(
    agentCard.monitoringProfileUrl.endsWith("/agents/monitoring.json"),
    true,
  );
  assert.equal(
    agentCard.onboardingProfileUrl.endsWith("/agents/onboarding.json"),
    true,
  );
  assert.equal(
    agentCard.optimizationProfileUrl.endsWith("/agents/optimization.json"),
    true,
  );
  assert.equal(
    agentCard.paymentProfileUrl.endsWith("/agents/payments.json"),
    true,
  );
  assert.equal(agentCard.promptCatalogUrl.endsWith("/agents/prompts.json"), true);
  assert.equal(agentCard.authentication.profileUrl.endsWith("/agents/auth.json"), true);
  assert.equal(agentCard.accessReview.status, "live_access_review_profile");
  assert.equal(
    agentCard.accessReview.decisionOutcomes.includes("approved_scoped_pilot"),
    true,
  );
  assert.equal(agentCard.auth.status, "live_auth_profile");
  assert.equal(agentCard.auth.liveActorClasses.includes("resolver_agent"), true);
  assert.equal(agentCard.conformance.status, "live_conformance_profile");
  assert.equal(agentCard.onboarding.status, "live_onboarding_profile");
  assert.equal(
    agentCard.onboarding.productionAccessFields.includes("requestedScopes"),
    true,
  );
  assert.equal(agentCard.prompts.status, "live_prompt_catalog");
  assert.equal(
    agentCard.prompts.prompts.some((prompt) => prompt.id === "submit_proof"),
    true,
  );
  assert.equal(agentCard.conformance.checklistCount >= 5, true);
  assert.equal(
    agentCard.conformance.requiredCheckIds.includes("proof_before_completion"),
    true,
  );
  assert.equal(agentCard.completion.status, "live_completion_profile");
  assert.equal(
    agentCard.completion.rules.some((rule) => rule.claimState === "completed"),
    true,
  );
  assert.equal(agentCard.evidence.status, "live_evidence_profile");
  assert.equal(agentCard.evidence.packetFields.includes("requestId"), true);
  assert.equal(agentCard.evidence.reviewSignalCount >= 5, true);
  assert.equal(agentCard.errorExamples.status, "live_error_example_pack");
  assert.equal(
    agentCard.errorExamples.standard,
    "RFC 9457 Problem Details for HTTP APIs",
  );
  assert.equal(agentCard.humanHandoffs.status, "live_human_handoff_profile");
  assert.equal(
    agentCard.humanHandoffs.packetExamplesUrl.endsWith(
      "/agents/human-handoff-packets.example.json"
    ),
    true,
  );
  assert.equal(
    agentCard.humanHandoffs.moments.some(
      (moment) =>
        moment.id === "payment_authorization_required" &&
        moment.canonicalWrites.includes("Transaction")
    ),
    true,
  );
  assert.equal(agentCard.monitoring.status, "live_monitoring_profile");
  assert.equal(agentCard.monitoring.liveMode, "live_cursor_polling");
  assert.equal(
    agentCard.monitoring.escalationTriggers.includes("blocked_fulfillment"),
    true,
  );
  assert.equal(agentCard.optimization.status, "live_optimization_profile");
  assert.equal(
    agentCard.optimization.surfaces.some(
      (surface) =>
        surface.id === "request_brief_optimization" &&
        surface.defaultMode === "draft_only" &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(agentCard.payments.status, "live_payment_profile");
  assert.equal(
    agentCard.payments.spendSurfaces.some(
      (surface) =>
        surface.id === "public_solution_run" &&
        surface.canonicalWrites.includes("Transaction")
    ),
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
  assert.equal(agentCard.readiness.status, "live_readiness_profile");
  assert.equal(agentCard.readiness.liveCapabilityCount >= 7, true);
  assert.equal(agentCard.readiness.targetCapabilityCount >= 2, true);
  assert.equal(agentCard.tools.status, "live_tool_registry");
  assert.equal(
    agentCard.tools.tools.some(
      (tool) =>
        tool.id === "boreal.artifacts.publish" &&
        tool.canonicalWrites.includes("Artifact")
    ),
    true,
  );
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
        action.id === "make_request_for_human" &&
        action.canonicalWrites.includes("Request") &&
        action.auth.includes("Boreal account session")
    ),
    true,
  );
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
  assert.match(actionGuide, /Create a request for me/);
  assert.match(actionGuide, /POST \/api\/requests/);
  assert.match(actionGuide, /open_request` only after explicit buyer approval/);
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
        standard.tools.some((tool) => tool.id === "draft_request") &&
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

  const protocolAdapterSamples = await readAgentProtocolAdapterSamples();
  assert.equal(protocolAdapterSamples.status, "target_protocol_sample_pack");
  assert.equal(protocolAdapterSamples.canonicalBoundary.rootObject, "Request");
  assert.equal(
    protocolAdapterSamples.samples.some(
      (sample: { id: string; standard: string }) =>
        sample.id === "mcp_propose_commitment_tool" &&
        sample.standard === "mcp"
    ),
    true,
  );
  assert.equal(
    protocolAdapterSamples.samples.some(
      (sample: { id: string; standard: string }) =>
        sample.id === "a2a_submit_artifact_task" &&
        sample.standard === "a2a"
    ),
    true,
  );
  assert.equal(
    protocolAdapterSamples.samples.some(
      (sample: { id: string; standard: string }) =>
        sample.id === "x402_paid_solution_run_shape" &&
        sample.standard === "x402"
    ),
    true,
  );
  assert.equal(
    protocolAdapterSamples.canonicalBoundary.adapterSamplesAreNot.includes(
      "permission grant"
    ),
    true,
  );

  const recoveryProfile = buildAgentRecoveryProfile();
  assert.equal(recoveryProfile.status, "live_recovery_profile");
  assert.equal(recoveryProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    recoveryProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/error-examples.json")
    ),
    true,
  );
  assert.equal(
    recoveryProfile.standardProfiles.some(
      (profile) =>
        profile.name === "Problem Details" &&
        profile.status === "live_example_profile"
    ),
    true,
  );
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

  const errorExamples = await readAgentErrorExamples();
  assert.equal(errorExamples.status, "live_error_example_pack");
  assert.equal(errorExamples.canonicalBoundary.rootObject, "Request");
  assert.equal(errorExamples.standard.contentType, "application/problem+json");
  assert.equal(
    errorExamples.examples.some(
      (example: { recoveryRuleId: string; retryPolicy: string }) =>
        example.recoveryRuleId === "terminal_or_unknown_server_failure" &&
        example.retryPolicy === "verify_state_before_retry"
    ),
    true,
  );
  assert.equal(
    errorExamples.examples.some(
      (example: {
        recoveryRuleId: string;
        canonicalReadsBeforeRetry: string[];
      }) =>
        example.recoveryRuleId === "payment_or_credit_uncertain" &&
        example.canonicalReadsBeforeRetry.includes("Transaction")
    ),
    true,
  );

  const readinessProfile = buildAgentReadinessProfile();
  assert.equal(readinessProfile.status, "live_readiness_profile");
  assert.equal(readinessProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    readinessProfile.standardPlanes.some(
      (plane) => plane.id === "http_contracts" && plane.standard === "OpenAPI 3.1"
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "submit_or_complete_work" &&
        capability.actions.includes("submit_artifact") &&
        capability.stopOrEscalateWhen.some((rule) =>
          rule.includes("MCP")
        )
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "protocol_adapters" &&
        capability.status === "target_adapter_profile"
    ),
    true,
  );
  assert.equal(
    readinessProfile.agentUxFlow.some(
      (stage) =>
        stage.stage === "Check auth and policy" &&
        stage.stopWhen.includes("missing scope")
    ),
    true,
  );
  assert.equal(
    readinessProfile.goNoGoChecks.some(
      (check) =>
        check.id === "proof_completion_boundary" &&
        check.failWhen.includes("payment settlement")
    ),
    true,
  );
  assert.equal(
    readinessProfile.nextImplementationPriorities.some(
      (priority) => priority.id === "production_agent_auth"
    ),
    true,
  );

  const authProfile = buildAgentAuthProfile();
  assert.equal(authProfile.status, "live_auth_profile");
  assert.equal(authProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    authProfile.authSchemes.some(
      (scheme) =>
        scheme.id === "resolver_bearer" &&
        scheme.officialSpecUrl?.includes("rfc6750") &&
        scheme.status === "live_resolver_bearer"
    ),
    true,
  );
  assert.equal(
    authProfile.authSchemes.some(
      (scheme) =>
        scheme.id === "external_oauth2" &&
        scheme.status === "target_external_agent_auth"
    ),
    true,
  );
  assert.equal(
    authProfile.scopes.some(
      (scope) =>
        scope.id === "commitments:propose" &&
        scope.doesNotGrant.some((boundary) =>
          boundary.includes("fulfillment start")
        )
    ),
    true,
  );
  assert.equal(
    authProfile.actionAuthRequirements.some(
      (requirement) =>
        requirement.actionId === "submit_artifact" &&
        requirement.requiredScopes.includes("artifacts:publish") &&
        requirement.idempotencyRequired
    ),
    true,
  );
  assert.equal(
    authProfile.actionAuthRequirements.some(
      (requirement) =>
        requirement.actionId === "make_request_for_human" &&
        requirement.requiredScopes.includes("requests:create") &&
        requirement.humanApproval.includes("opening")
    ),
    true,
  );
  assert.equal(
    authProfile.secretHandling.some((rule) => rule.includes("Never place")),
    true,
  );

  const conformanceProfile = buildAgentConformanceProfile();
  assert.equal(conformanceProfile.status, "live_conformance_profile");
  assert.equal(conformanceProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    conformanceProfile.checklists.some(
      (checklist) =>
        checklist.id === "policy_and_auth" &&
        checklist.requiredProfiles.some((profile) =>
          profile.endsWith("/agents/human-handoffs.json")
        ) &&
        checklist.requiredProfiles.some((profile) =>
          profile.endsWith("/agents/human-handoff-packets.example.json")
        )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.checklists.some((checklist) =>
      checklist.checks.some(
        (check) =>
          check.id === "problem_details_error_handling" &&
          check.required &&
          check.evidence.some((item) =>
            item.endsWith("/agents/error-examples.json")
          )
      )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.checklists.some((checklist) =>
      checklist.checks.some(
        (check) =>
          check.id === "render_handoff_packet_examples" &&
          check.required &&
          check.evidence.some((item) =>
            item.endsWith("/agents/human-handoff-packets.example.json")
          )
      )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.checklists.some((checklist) =>
      checklist.checks.some(
        (check) =>
          check.id === "transaction_not_completion" &&
          check.required &&
          check.failWhen.includes("x402 payload")
      )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.validationCommands.some(
      (command) => command.command === "pnpm contracts:agent-sandbox"
    ),
    true,
  );
  assert.equal(
    conformanceProfile.reportContract.schemaUrl.endsWith(
      "/schemas/agent-conformance-report.schema.json"
    ),
    true,
  );
  assert.equal(
    conformanceProfile.reportContract.sampleUrl.endsWith(
      "/agents/conformance-report.example.json"
    ),
    true,
  );
  assert.equal(
    conformanceProfile.reportContract.sampleFixturePath,
    "fixtures/agent/conformance-report.sample.json",
  );
  assert.equal(
    conformanceProfile.reportContract.reportIsNot.includes(
      "production credential"
    ),
    true,
  );
  assert.equal(
    conformanceProfile.canonicalBoundary.conformanceProfileIsNot.includes(
      "certification"
    ),
    true,
  );

  const conformanceReportExample = await readAgentConformanceReportExample();
  assert.equal(conformanceReportExample.reportKind, "agent_conformance_report");
  assert.equal(
    conformanceReportExample.requestedProductionAccess.status,
    "operator_review_required",
  );
  assert.equal(conformanceReportExample.canonicalBoundary.rootObject, "Request");
  assert.equal(
    conformanceReportExample.canonicalBoundary.reportIsNot.includes(
      "production credential"
    ),
    true,
  );

  const completionProfile = buildAgentCompletionProfile();
  assert.equal(completionProfile.status, "live_completion_profile");
  assert.equal(completionProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    completionProfile.proofPacket.requiredFor.includes("submit_artifact"),
    true,
  );
  assert.equal(
    completionProfile.completionRules.some(
      (rule) =>
        rule.id === "proof_submitted_for_review" &&
        rule.canonicalWrites.includes("Artifact") &&
        rule.notEnough.includes("payment success")
    ),
    true,
  );
  assert.equal(
    completionProfile.completionRules.some(
      (rule) =>
        rule.id === "work_completed" &&
        rule.requiredTruth.some((truth) => truth.includes("Request.status=completed")) &&
        rule.notEnough.includes("payment settled")
    ),
    true,
  );
  assert.equal(
    completionProfile.artifactGuidance.some(
      (guidance) =>
        guidance.artifactKind === "evidence" &&
        guidance.mustNotInclude.includes("raw secrets")
    ),
    true,
  );
  assert.equal(
    completionProfile.reviewBoundaries.some((boundary) =>
      boundary.includes("Payment settled is not work completed")
    ),
    true,
  );
  assert.equal(
    completionProfile.canonicalBoundary.notCompletionTruth.includes(
      "A2A task status alone"
    ),
    true,
  );

  const evidenceProfile = buildAgentEvidenceProfile();
  assert.equal(evidenceProfile.status, "live_evidence_profile");
  assert.equal(evidenceProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(evidenceProfile.canonicalBoundary.evidenceTruthObject, "Artifact");
  assert.equal(
    evidenceProfile.artifactPacket.requiredFields.includes("redactionStatement"),
    true,
  );
  assert.equal(
    evidenceProfile.evidenceLevels.some(
      (level) =>
        level.id === "verifiable_proof_packet" && level.enoughForCompletion
    ),
    true,
  );
  assert.equal(
    evidenceProfile.artifactKindGuidance.some(
      (guidance) =>
        guidance.artifactKind === "receipt" &&
        guidance.mustNotInclude.includes("wallet private keys")
    ),
    true,
  );
  assert.equal(
    evidenceProfile.submitChecklist.some(
      (check) =>
        check.id === "claim_bounded" &&
        check.failWhen.includes("payment")
    ),
    true,
  );

  const executionProfile = buildAgentExecutionProfile();
  assert.equal(executionProfile.status, "live_execution_profile");
  assert.equal(executionProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    executionProfile.canonicalBoundary.executionTruthObjects.includes(
      "FulfillmentStep"
    ),
    true,
  );
  assert.equal(
    executionProfile.executionLanes.some(
      (lane) =>
        lane.id === "cross_actor_accepted_commitment" &&
        lane.requiredBeforeStart.some((gate) => gate.includes("Commitment")) &&
        lane.canonicalWrites.includes("FulfillmentStep")
    ),
    true,
  );
  assert.equal(
    executionProfile.executionLanes.some(
      (lane) =>
        lane.id === "owner_private_direct_runtime" &&
        lane.status === "live_narrow_exception" &&
        lane.mustNotDo.includes(
          "apply direct-owner assumptions to public or external work"
        )
    ),
    true,
  );
  assert.equal(
    executionProfile.runtimeSignalRules.some(
      (rule) =>
        rule.id === "ephemeral_by_default" &&
        rule.signalKinds.includes("heartbeat")
    ),
    true,
  );
  assert.equal(
    executionProfile.stepGuidance.defaultSubworkObject,
    "FulfillmentStep",
  );
  assert.equal(
    executionProfile.canonicalBoundary.notRoots.includes("MCP session"),
    true,
  );

  const humanHandoffProfile = buildAgentHumanHandoffProfile();
  assert.equal(humanHandoffProfile.status, "live_human_handoff_profile");
  assert.equal(humanHandoffProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    humanHandoffProfile.handoffMoments.some(
      (moment) =>
        moment.id === "draft_ready_for_buyer_review" &&
        moment.approvalRequired &&
        moment.canonicalWrites.includes("Request")
    ),
    true,
  );
  assert.equal(
    humanHandoffProfile.handoffMoments.some(
      (moment) =>
        moment.id === "proof_submitted_for_review" &&
        moment.primaryProfiles.some((profile) =>
          profile.endsWith("/agents/completion.json")
        )
    ),
    true,
  );
  assert.equal(
    humanHandoffProfile.humanApprovalGates.some(
      (gate) =>
        gate.id === "open_or_fund_request" &&
        gate.requiredTruth.includes("agentActionPolicy decision")
    ),
    true,
  );
  assert.equal(
    humanHandoffProfile.visibleUxPatterns.some(
      (pattern) =>
        pattern.id === "proof_first_delivery" &&
        pattern.notCanonicalObject
    ),
    true,
  );
  assert.equal(
    humanHandoffProfile.agentLanguage.mustNotSay.some((line) =>
      line.includes("Payment succeeded")
    ),
    true,
  );

  const humanHandoffPackets = await readAgentHumanHandoffPacketExamples();
  assert.equal(humanHandoffPackets.status, "live_handoff_packet_examples");
  assert.equal(humanHandoffPackets.canonicalBoundary.rootObject, "Request");
  assert.equal(
    humanHandoffPackets.examples.some(
      (packet: { id: string; actionId: string; approvalRequired: boolean }) =>
        packet.id === "request_draft_approval_packet" &&
        packet.actionId === "make_request_for_human" &&
        packet.approvalRequired
    ),
    true,
  );
  assert.equal(
    humanHandoffPackets.examples.some(
      (packet: { id: string; actionId: string; claimState: string }) =>
        packet.id === "proof_review_packet" &&
        packet.actionId === "submit_artifact" &&
        packet.claimState === "proof_submitted_waiting_for_owner_acceptance"
    ),
    true,
  );
  assert.equal(
    humanHandoffPackets.examples.some(
      (packet: { actionId: string; approvalRequired: boolean }) =>
        packet.actionId === "monitor_request" && !packet.approvalRequired
    ),
    true,
  );
  assert.equal(
    humanHandoffPackets.canonicalBoundary.handoffPacketsAreNot.includes(
      "human approval record"
    ),
    true,
  );

  const monitoringProfile = buildAgentMonitoringProfile();
  assert.equal(monitoringProfile.status, "live_monitoring_profile");
  assert.equal(monitoringProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(monitoringProfile.pollingBaseline.status, "live_cursor_polling");
  assert.equal(
    monitoringProfile.pollingBaseline.cursorField,
    "cursor.nextAfterSequence",
  );
  assert.equal(
    monitoringProfile.cursorRules.some(
      (rule) => rule.id === "no_heartbeat_events"
    ),
    true,
  );
  assert.equal(
    monitoringProfile.escalationTriggers.some(
      (trigger) =>
        trigger.id === "payment_uncertain" &&
        trigger.packetFields.includes("transactionId")
    ),
    true,
  );
  assert.equal(
    monitoringProfile.webhookBoundary.status,
    "target_signed_push_profile",
  );

  const accessReviewProfile = buildAgentAccessReviewProfile();
  assert.equal(accessReviewProfile.status, "live_access_review_profile");
  assert.equal(accessReviewProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    accessReviewProfile.reviewStages.some(
      (stage) => stage.id === "scope_minimization_review"
    ),
    true,
  );
  assert.equal(
    accessReviewProfile.scopePolicy.some(
      (policy) =>
        policy.scopeFamily === "proposal_and_artifact_write" &&
        policy.requiresHuman
    ),
    true,
  );
  assert.equal(
    accessReviewProfile.rateLimitPolicy.some(
      (policy) => policy.id === "write_pilot_low_volume"
    ),
    true,
  );
  assert.equal(
    accessReviewProfile.revocationPolicy.some(
      (policy) => policy.id === "duplicate_or_spam_mutation"
    ),
    true,
  );
  assert.equal(
    accessReviewProfile.decisionOutcomes.some(
      (outcome) => outcome.id === "approved_scoped_pilot"
    ),
    true,
  );
  assert.equal(
    accessReviewProfile.canonicalBoundary.accessReviewProfileIsNot.includes(
      "credential issuer"
    ),
    true,
  );

  const onboardingProfile = buildAgentOnboardingProfile();
  assert.equal(onboardingProfile.status, "live_onboarding_profile");
  assert.equal(onboardingProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    onboardingProfile.onboardingStages.some(
      (stage) =>
        stage.id === "contract_sandbox_validation" &&
        stage.validationCommand === "pnpm contracts:agent-sandbox"
    ),
    true,
  );
  assert.equal(
    onboardingProfile.credentialPaths.some(
      (path) =>
        path.id === "oauth_compatible_external_agent" &&
        path.status === "target_external_agent_auth"
    ),
    true,
  );
  assert.equal(
    onboardingProfile.productionAccessPacket.requiredFields.includes(
      "requestedScopes"
    ),
    true,
  );
  assert.equal(
    onboardingProfile.goLiveChecks.some(
      (check) => check.id === "scope_minimization" && check.blocking
    ),
    true,
  );
  assert.equal(
    onboardingProfile.canonicalBoundary.onboardingProfileIsNot.includes(
      "credential issuer"
    ),
    true,
  );

  const optimizationProfile = buildAgentOptimizationProfile();
  assert.equal(optimizationProfile.status, "live_optimization_profile");
  assert.equal(optimizationProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(optimizationProfile.outputContract.durableWriteDefault, false);
  assert.equal(
    optimizationProfile.optimizationSurfaces.some(
      (surface) =>
        surface.id === "evidence_packet_optimization" &&
        surface.canonicalWrites.length === 0 &&
        surface.mustNotInvent.includes("completion state")
    ),
    true,
  );
  assert.equal(
    optimizationProfile.optimizationSurfaces.some(
      (surface) =>
        surface.id === "public_solution_reuse_optimization" &&
        surface.ownerApprovalRequiredFor.includes("paid private run Request")
    ),
    true,
  );
  assert.equal(
    optimizationProfile.noInventionRules.some((rule) =>
      rule.includes("Do not convert a question into a fact")
    ),
    true,
  );

  const paymentProfile = buildAgentPaymentProfile();
  assert.equal(paymentProfile.status, "live_payment_profile");
  assert.equal(paymentProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(paymentProfile.canonicalBoundary.paymentTruthObject, "Transaction");
  assert.equal(
    paymentProfile.spendSurfaces.some(
      (surface) =>
        surface.id === "public_solution_inspection" &&
        surface.transactionEffect === "none" &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    paymentProfile.spendSurfaces.some(
      (surface) =>
        surface.id === "public_solution_run" &&
        surface.canonicalWrites.includes("Request") &&
        surface.canonicalWrites.includes("Transaction") &&
        surface.idempotencyRequired
    ),
    true,
  );
  assert.equal(
    paymentProfile.paymentRules.some(
      (rule) =>
        rule.id === "payment_not_completion" &&
        rule.rule.includes("never work completion")
    ),
    true,
  );
  assert.equal(paymentProfile.x402Boundary.status, "target_payment_profile");
  assert.equal(
    paymentProfile.x402Boundary.notLiveToday.includes(
      "x402 challenge emission"
    ),
    true,
  );
  assert.equal(
    paymentProfile.canonicalBoundary.notRoots.includes("Order"),
    true,
  );

  const promptCatalog = buildAgentPromptCatalog();
  assert.equal(promptCatalog.status, "live_prompt_catalog");
  assert.equal(promptCatalog.canonicalBoundary.rootObject, "Request");
  assert.equal(promptCatalog.outputContract.durableWriteDefault, false);
  assert.equal(
    promptCatalog.prompts.some(
      (prompt) =>
        prompt.id === "apply_to_request" &&
        prompt.actionId === "apply_to_request" &&
        prompt.canonicalWrites.length === 0 &&
        prompt.forbiddenClaims.includes("Commitment accepted")
    ),
    true,
  );
  assert.equal(
    promptCatalog.prompts.some(
      (prompt) =>
        prompt.id === "submit_proof" &&
        prompt.actionId === "submit_artifact" &&
        prompt.outputFields.includes("redactionStatement")
    ),
    true,
  );
  assert.equal(
    promptCatalog.canonicalBoundary.promptCatalogIsNot.includes(
      "mutation endpoint"
    ),
    true,
  );

  const toolRegistry = buildAgentToolRegistry();
  assert.equal(toolRegistry.status, "live_tool_registry");
  assert.equal(toolRegistry.canonicalBoundary.rootObject, "Request");
  assert.equal(toolRegistry.canonicalBoundary.policyObject, "agentActionPolicy");
  assert.equal(
    toolRegistry.invocationRules.some((rule) =>
      rule.includes("agentActionPolicy")
    ),
    true,
  );
  assert.equal(
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.commitments.propose" &&
        tool.idempotencyRequired &&
        tool.canonicalWrites.includes("Commitment") &&
        tool.standardMappings.mcp.type === "tool"
    ),
    true,
  );
  assert.equal(
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.solutions.run_public" &&
        tool.invocationKind === "payment_mutation" &&
        tool.canonicalWrites.includes("Transaction")
    ),
    true,
  );
  assert.equal(
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.requests.optimize_brief" &&
        tool.invocationKind === "draft_only" &&
        tool.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    toolRegistry.adapterMappings.some(
      (mapping) =>
        mapping.standard === "Model Context Protocol" &&
        mapping.status === "target_adapter_mapping"
    ),
    true,
  );
  assert.equal(
    toolRegistry.canonicalBoundary.notRoots.includes("MCP Tool"),
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
  assert.match(sandboxText, /make_request_for_human/);
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
  assert.match(sandboxText, /open_request without explicit buyer approval/);
  assert.equal(
    sandboxManifest.scenarios.some(
      (scenario) =>
        scenario.id === "solver_apply_submit_monitor_replay" &&
        scenario.coveredActions.includes("apply_to_request") &&
        scenario.coveredActions.includes("submit_artifact") &&
        scenario.expectedTerminalState.claimState ===
          "proof_submitted_waiting_for_owner_acceptance"
    ),
    true,
  );
  assert.equal(
    sandboxManifest.scenarios.some(
      (scenario) =>
        scenario.id === "public_solution_paid_run_shape_replay" &&
        JSON.stringify(scenario.expectedTerminalState).includes(
          '"sourceRequestMutated":false'
        )
    ),
    true,
  );
  assert.equal(
    sandboxManifest.scenarios.some(
      (scenario) =>
        scenario.id === "idempotent_recovery_replay" &&
        JSON.stringify(scenario.expectedTerminalState).includes(
          '"duplicateDurableTruth":false'
        )
    ),
    true,
  );

  const sandboxGuide = buildAgentSandboxMarkdown();
  assert.match(sandboxGuide, /contract-only sandbox/);
  assert.match(sandboxGuide, /not accepted by production endpoints/);
  assert.match(sandboxGuide, /Replay Scenarios/);
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
        workflow.steps.some(
          (step) =>
            step.id === "create_draft" &&
            step.actionId === "make_request_for_human"
        ) &&
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
  assert.match(startGuide, /GET \/agents\/access-review\.json/);
  assert.match(startGuide, /GET \/agents\/auth\.json/);
  assert.match(startGuide, /GET \/agents\/conformance\.json/);
  assert.match(startGuide, /GET \/agents\/conformance-report\.example\.json/);
  assert.match(startGuide, /GET \/agents\/completion\.json/);
  assert.match(startGuide, /GET \/agents\/evidence\.json/);
  assert.match(startGuide, /GET \/agents\/error-examples\.json/);
  assert.match(startGuide, /GET \/agents\/execution\.json/);
  assert.match(startGuide, /GET \/agents\/human-handoffs\.json/);
  assert.match(startGuide, /GET \/agents\/human-handoff-packets\.example\.json/);
  assert.match(startGuide, /GET \/agents\/monitoring\.json/);
  assert.match(startGuide, /GET \/agents\/onboarding\.json/);
  assert.match(startGuide, /GET \/agents\/optimization\.json/);
  assert.match(startGuide, /GET \/agents\/payments\.json/);
  assert.match(startGuide, /GET \/agents\/prompts\.json/);
  assert.match(startGuide, /GET \/agents\/workflows\.json/);
  assert.match(startGuide, /GET \/agents\/protocols\.json/);
  assert.match(startGuide, /GET \/agents\/protocol-adapter-samples\.json/);
  assert.match(startGuide, /GET \/agents\/recovery\.json/);
  assert.match(startGuide, /GET \/agents\/readiness\.json/);
  assert.match(startGuide, /GET \/agents\/tools\.json/);
  assert.match(startGuide, /Agent action playbook/);
  assert.match(startGuide, /Agent access review profile/);
  assert.match(startGuide, /Agent conformance report example/);
  assert.match(startGuide, /Agent contract sandbox/);
  assert.match(startGuide, /Agent error examples/);
  assert.match(startGuide, /Agent human handoff packet examples/);
  assert.match(startGuide, /Agent protocol adapter samples/);
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
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/access-review.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/actions.md"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/auth.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/conformance.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/conformance-report.example.json"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/completion.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/evidence.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/error-examples.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/execution.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/human-handoffs.json"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/human-handoff-packets.example.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/monitoring.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/onboarding.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/optimization.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/payments.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/prompts.json"), true);
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
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/protocol-adapter-samples.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/recovery.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/readiness.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/tools.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/sandbox.md"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/sandbox.json"), true);
  assert.equal(
    discoveryIndex["x-boreal-agent-protocols"].standards.some(
      (standard) => standard.id === "x402"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-protocols"].samplePackUrl.endsWith(
      "/agents/protocol-adapter-samples.json"
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
    discoveryIndex["x-boreal-agent-auth"].schemes.some(
      (scheme) => scheme.id === "resolver_bearer"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-access-review"].decisions.includes(
      "approved_scoped_pilot"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-conformance"].checklists.some(
      (checklist) => checklist.id === "proof_payment_and_recovery"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-conformance"].reportSchemaUrl.endsWith(
      "/schemas/agent-conformance-report.schema.json"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-conformance"].reportExampleUrl.endsWith(
      "/agents/conformance-report.example.json"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-completion"].rules.some(
      (rule) => rule.claimState === "completed"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-evidence"].artifactKinds.includes("evidence"),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-error-examples"].standard,
    "RFC 9457 Problem Details for HTTP APIs",
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-recovery"].errorExamplesUrl.endsWith(
      "/agents/error-examples.json"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-execution"].lanes.some(
      (lane) => lane.id === "cross_actor_accepted_commitment"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-human-handoffs"].moments.some(
      (moment) => moment.id === "completion_claim_requires_review"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-human-handoffs"].packetExamplesUrl.endsWith(
      "/agents/human-handoff-packets.example.json"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-monitoring"].escalationTriggers.includes(
      "payment_uncertain"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-onboarding"].productionAccessFields.includes(
      "requestedScopes"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-optimization"].surfaces.some(
      (surface) => surface.id === "monitor_escalation_optimization"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-payments"].spendSurfaces.some(
      (surface) => surface.id === "public_solution_run"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-prompts"].prompts.some(
      (prompt) => prompt.id === "submit_proof"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-readiness"].capabilityBands.some(
      (capability) => capability.id === "protocol_adapters"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-tools"].tools.some(
      (tool) => tool.id === "boreal.activity.monitor"
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
    findJsonSchemaAsset("agent-access-review.schema.json")?.sourcePath,
    "schemas/json/agent-access-review.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-sandbox.schema.json")?.sourcePath,
    "schemas/json/agent-sandbox.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-auth.schema.json")?.sourcePath,
    "schemas/json/agent-auth.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-conformance.schema.json")?.sourcePath,
    "schemas/json/agent-conformance.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-conformance-report.schema.json")?.sourcePath,
    "schemas/json/agent-conformance-report.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-completion.schema.json")?.sourcePath,
    "schemas/json/agent-completion.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-evidence.schema.json")?.sourcePath,
    "schemas/json/agent-evidence.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-error-examples.schema.json")?.sourcePath,
    "schemas/json/agent-error-examples.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-execution.schema.json")?.sourcePath,
    "schemas/json/agent-execution.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-human-handoffs.schema.json")?.sourcePath,
    "schemas/json/agent-human-handoffs.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-human-handoff-packets.schema.json")?.sourcePath,
    "schemas/json/agent-human-handoff-packets.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-monitoring.schema.json")?.sourcePath,
    "schemas/json/agent-monitoring.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-onboarding.schema.json")?.sourcePath,
    "schemas/json/agent-onboarding.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-optimization.schema.json")?.sourcePath,
    "schemas/json/agent-optimization.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-payments.schema.json")?.sourcePath,
    "schemas/json/agent-payments.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-prompts.schema.json")?.sourcePath,
    "schemas/json/agent-prompts.schema.json",
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
    findJsonSchemaAsset("agent-protocol-adapter-samples.schema.json")?.sourcePath,
    "schemas/json/agent-protocol-adapter-samples.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-recovery.schema.json")?.sourcePath,
    "schemas/json/agent-recovery.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-readiness.schema.json")?.sourcePath,
    "schemas/json/agent-readiness.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-tools.schema.json")?.sourcePath,
    "schemas/json/agent-tools.schema.json",
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

  const agentAccessReviewResponse = await getAgentAccessReview();
  assert.equal(agentAccessReviewResponse.status, 200);
  assert.equal(
    (await agentAccessReviewResponse.json()).status,
    "live_access_review_profile"
  );

  const agentAuthResponse = await getAgentAuth();
  assert.equal(agentAuthResponse.status, 200);
  assert.equal((await agentAuthResponse.json()).status, "live_auth_profile");

  const agentConformanceResponse = await getAgentConformance();
  assert.equal(agentConformanceResponse.status, 200);
  assert.equal(
    (await agentConformanceResponse.json()).status,
    "live_conformance_profile"
  );

  const agentConformanceReportExampleResponse =
    await getAgentConformanceReportExample();
  assert.equal(agentConformanceReportExampleResponse.status, 200);
  const agentConformanceReportExample =
    await agentConformanceReportExampleResponse.json();
  assert.equal(
    agentConformanceReportExample.reportKind,
    "agent_conformance_report"
  );
  assert.equal(
    agentConformanceReportExample.requestedProductionAccess.status,
    "operator_review_required"
  );

  const agentCompletionResponse = await getAgentCompletion();
  assert.equal(agentCompletionResponse.status, 200);
  assert.equal(
    (await agentCompletionResponse.json()).status,
    "live_completion_profile"
  );

  const agentEvidenceResponse = await getAgentEvidence();
  assert.equal(agentEvidenceResponse.status, 200);
  assert.equal(
    (await agentEvidenceResponse.json()).status,
    "live_evidence_profile"
  );

  const agentErrorExamplesResponse = await getAgentErrorExamples();
  assert.equal(agentErrorExamplesResponse.status, 200);
  assert.equal(
    (await agentErrorExamplesResponse.json()).status,
    "live_error_example_pack"
  );

  const agentExecutionResponse = await getAgentExecution();
  assert.equal(agentExecutionResponse.status, 200);
  assert.equal(
    (await agentExecutionResponse.json()).status,
    "live_execution_profile"
  );

  const agentHumanHandoffsResponse = await getAgentHumanHandoffs();
  assert.equal(agentHumanHandoffsResponse.status, 200);
  assert.equal(
    (await agentHumanHandoffsResponse.json()).status,
    "live_human_handoff_profile"
  );

  const agentHumanHandoffPacketExamplesResponse =
    await getAgentHumanHandoffPacketExamples();
  assert.equal(agentHumanHandoffPacketExamplesResponse.status, 200);
  assert.equal(
    (await agentHumanHandoffPacketExamplesResponse.json()).status,
    "live_handoff_packet_examples"
  );

  const agentMonitoringResponse = await getAgentMonitoring();
  assert.equal(agentMonitoringResponse.status, 200);
  assert.equal(
    (await agentMonitoringResponse.json()).status,
    "live_monitoring_profile"
  );

  const agentOnboardingResponse = await getAgentOnboarding();
  assert.equal(agentOnboardingResponse.status, 200);
  assert.equal(
    (await agentOnboardingResponse.json()).status,
    "live_onboarding_profile"
  );

  const agentOptimizationResponse = await getAgentOptimization();
  assert.equal(agentOptimizationResponse.status, 200);
  assert.equal(
    (await agentOptimizationResponse.json()).status,
    "live_optimization_profile"
  );

  const agentPaymentsResponse = await getAgentPayments();
  assert.equal(agentPaymentsResponse.status, 200);
  assert.equal(
    (await agentPaymentsResponse.json()).status,
    "live_payment_profile"
  );

  const agentPromptsResponse = await getAgentPrompts();
  assert.equal(agentPromptsResponse.status, 200);
  assert.equal(
    (await agentPromptsResponse.json()).status,
    "live_prompt_catalog"
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

  const agentProtocolAdapterSamplesResponse =
    await getAgentProtocolAdapterSamples();
  assert.equal(agentProtocolAdapterSamplesResponse.status, 200);
  assert.equal(
    (await agentProtocolAdapterSamplesResponse.json()).status,
    "target_protocol_sample_pack"
  );

  const agentRecoveryResponse = await getAgentRecovery();
  assert.equal(agentRecoveryResponse.status, 200);
  assert.equal(
    (await agentRecoveryResponse.json()).status,
    "live_recovery_profile"
  );

  const agentReadinessResponse = await getAgentReadiness();
  assert.equal(agentReadinessResponse.status, 200);
  assert.equal(
    (await agentReadinessResponse.json()).status,
    "live_readiness_profile"
  );

  const agentToolsResponse = await getAgentTools();
  assert.equal(agentToolsResponse.status, 200);
  assert.equal(
    (await agentToolsResponse.json()).status,
    "live_tool_registry"
  );

  const agentSandboxMdResponse = await getAgentSandboxMd();
  assert.equal(agentSandboxMdResponse.status, 200);
  assert.match(await agentSandboxMdResponse.text(), /Boreal Agent Sandbox/);

  const agentSandboxJsonResponse = await getAgentSandboxJson();
  assert.equal(agentSandboxJsonResponse.status, 200);
  const agentSandboxJson = await agentSandboxJsonResponse.json();
  assert.equal(agentSandboxJson.mode, "contract_only");
  assert.equal(
    agentSandboxJson.scenarios.some(
      (scenario: { id: string }) =>
        scenario.id === "solver_apply_submit_monitor_replay"
    ),
    true,
  );

  const llmsResponse = await getLlmsTxt();
  assert.equal(llmsResponse.status, 200);
  const llmsText = await llmsResponse.text();
  assert.match(llmsText, /Agent Discovery/);
  assert.match(llmsText, /Agent access review profile/);
  assert.match(llmsText, /Agent action playbook/);
  assert.match(llmsText, /Agent auth profile/);
  assert.match(llmsText, /Agent conformance profile/);
  assert.match(llmsText, /Agent conformance report schema/);
  assert.match(llmsText, /Agent conformance report example/);
  assert.match(llmsText, /Agent completion profile/);
  assert.match(llmsText, /Agent evidence profile/);
  assert.match(llmsText, /Agent error examples/);
  assert.match(llmsText, /Agent execution profile/);
  assert.match(llmsText, /Agent human handoff profile/);
  assert.match(llmsText, /Agent human handoff packet examples/);
  assert.match(llmsText, /Agent monitoring profile/);
  assert.match(llmsText, /Agent onboarding profile/);
  assert.match(llmsText, /Agent optimization profile/);
  assert.match(llmsText, /Agent payment profile/);
  assert.match(llmsText, /Agent prompt catalog/);
  assert.match(llmsText, /Agent protocol profile JSON/);
  assert.match(llmsText, /Agent protocol adapter samples/);
  assert.match(llmsText, /Agent recovery profile/);
  assert.match(llmsText, /Agent readiness profile/);
  assert.match(llmsText, /Agent tool registry/);
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

  const accessReviewSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-access-review.schema.json" }),
  });
  assert.equal(accessReviewSchemaResponse.status, 200);
  assert.equal(
    (await accessReviewSchemaResponse.json()).title,
    "AgentAccessReviewProfile"
  );

  const sandboxSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-sandbox.schema.json" }),
  });
  assert.equal(sandboxSchemaResponse.status, 200);
  assert.equal((await sandboxSchemaResponse.json()).title, "AgentSandbox");

  const authSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-auth.schema.json" }),
  });
  assert.equal(authSchemaResponse.status, 200);
  assert.equal((await authSchemaResponse.json()).title, "AgentAuthProfile");

  const conformanceSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-conformance.schema.json" }),
  });
  assert.equal(conformanceSchemaResponse.status, 200);
  assert.equal(
    (await conformanceSchemaResponse.json()).title,
    "AgentConformanceProfile"
  );

  const conformanceReportSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({ schema: "agent-conformance-report.schema.json" }),
    }
  );
  assert.equal(conformanceReportSchemaResponse.status, 200);
  assert.equal(
    (await conformanceReportSchemaResponse.json()).title,
    "AgentConformanceReport"
  );

  const completionSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-completion.schema.json" }),
  });
  assert.equal(completionSchemaResponse.status, 200);
  assert.equal(
    (await completionSchemaResponse.json()).title,
    "AgentCompletionProfile"
  );

  const evidenceSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-evidence.schema.json" }),
  });
  assert.equal(evidenceSchemaResponse.status, 200);
  assert.equal(
    (await evidenceSchemaResponse.json()).title,
    "AgentEvidenceProfile"
  );

  const errorExamplesSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({ schema: "agent-error-examples.schema.json" }),
    }
  );
  assert.equal(errorExamplesSchemaResponse.status, 200);
  assert.equal(
    (await errorExamplesSchemaResponse.json()).title,
    "AgentErrorExamples"
  );

  const executionSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-execution.schema.json" }),
  });
  assert.equal(executionSchemaResponse.status, 200);
  assert.equal(
    (await executionSchemaResponse.json()).title,
    "AgentExecutionProfile"
  );

  const humanHandoffSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-human-handoffs.schema.json" }),
  });
  assert.equal(humanHandoffSchemaResponse.status, 200);
  assert.equal(
    (await humanHandoffSchemaResponse.json()).title,
    "AgentHumanHandoffProfile"
  );

  const humanHandoffPacketsSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-human-handoff-packets.schema.json",
      }),
    }
  );
  assert.equal(humanHandoffPacketsSchemaResponse.status, 200);
  assert.equal(
    (await humanHandoffPacketsSchemaResponse.json()).title,
    "AgentHumanHandoffPacketExamples"
  );

  const monitoringSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-monitoring.schema.json" }),
  });
  assert.equal(monitoringSchemaResponse.status, 200);
  assert.equal(
    (await monitoringSchemaResponse.json()).title,
    "AgentMonitoringProfile"
  );

  const onboardingSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-onboarding.schema.json" }),
  });
  assert.equal(onboardingSchemaResponse.status, 200);
  assert.equal(
    (await onboardingSchemaResponse.json()).title,
    "AgentOnboardingProfile"
  );

  const optimizationSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-optimization.schema.json" }),
  });
  assert.equal(optimizationSchemaResponse.status, 200);
  assert.equal(
    (await optimizationSchemaResponse.json()).title,
    "AgentOptimizationProfile"
  );

  const paymentSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-payments.schema.json" }),
  });
  assert.equal(paymentSchemaResponse.status, 200);
  assert.equal(
    (await paymentSchemaResponse.json()).title,
    "AgentPaymentProfile"
  );

  const promptsSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-prompts.schema.json" }),
  });
  assert.equal(promptsSchemaResponse.status, 200);
  assert.equal(
    (await promptsSchemaResponse.json()).title,
    "AgentPromptCatalog"
  );

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

  const protocolAdapterSamplesSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-protocol-adapter-samples.schema.json",
      }),
    }
  );
  assert.equal(protocolAdapterSamplesSchemaResponse.status, 200);
  assert.equal(
    (await protocolAdapterSamplesSchemaResponse.json()).title,
    "AgentProtocolAdapterSamples"
  );

  const recoverySchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-recovery.schema.json" }),
  });
  assert.equal(recoverySchemaResponse.status, 200);
  assert.equal(
    (await recoverySchemaResponse.json()).title,
    "AgentRecoveryProfile"
  );

  const readinessSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-readiness.schema.json" }),
  });
  assert.equal(readinessSchemaResponse.status, 200);
  assert.equal(
    (await readinessSchemaResponse.json()).title,
    "AgentReadinessProfile"
  );

  const toolSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-tools.schema.json" }),
  });
  assert.equal(toolSchemaResponse.status, 200);
  assert.equal(
    (await toolSchemaResponse.json()).title,
    "AgentToolRegistry"
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

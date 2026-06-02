import assert from "node:assert/strict";
import {
  allAgentDiscoveryAssets,
  buildAgentAccessReviewProfile,
  buildAgentActionCatalog,
  buildAgentActionsMarkdown,
  buildAgentAuthProfile,
  buildAgentCard,
  buildAgentClientKitProfile,
  buildAgentConformanceProfile,
  buildAgentJourneyProfile,
  buildAgentCompletionProfile,
  buildAgentDelegationProfile,
  buildAgentEvidenceProfile,
  buildAgentRecoveryProfile,
  buildAgentExecutionProfile,
  buildAgentHumanHandoffProfile,
  buildAgentHttpProfile,
  buildAgentUxProfile,
  buildAgentMonitoringProfile,
  buildAgentMonitorWebhooksMarkdown,
  buildAgentOnboardingProfile,
  buildAgentOpportunityDiscoveryProfile,
  buildAgentOptimizationProfile,
  buildAgentPaymentProfile,
  buildAgentPromptCatalog,
  buildAgentProtocolProfile,
  buildAgentProtocolProfileMarkdown,
  buildAgentReadinessProfile,
  buildAgentStartMarkdown,
  buildAgentStandardsProfile,
  buildAgentToolRegistry,
  buildAgentWorkflowCatalog,
  buildOpenApiDiscoveryIndex,
  findEventAsset,
  findJsonSchemaAsset,
  findOpenApiAsset,
  readAgentConformanceReportExample,
  readAgentActionCardExamples,
  readAgentErrorExamples,
  readAgentHumanHandoffPacketExamples,
  readAgentOpportunityCardExamples,
  readAgentProductionAccessPacketExample,
  readAgentProtocolAdapterSamples,
  readDiscoveryAsset,
} from "@/lib/agent-discovery";
import { validateAgentActionPreflight } from "@/lib/agent-action-preflight";
import { validateAgentCompletionPayload } from "@/lib/agent-completion-validation";
import { validateAgentEvidencePayload } from "@/lib/agent-evidence-validation";
import { validateAgentIntakePayload } from "@/lib/agent-intake-validation";
import { prepareAgentAccessReviewPayload } from "@/lib/agent-access-review-preparation";
import { prepareAgentAuthPayload } from "@/lib/agent-auth-preparation";
import { prepareAgentMonitoringPayload } from "@/lib/agent-monitoring-preparation";
import { prepareAgentOptimizationPayload } from "@/lib/agent-optimization-preparation";
import { validateAgentMonitoringPayload } from "@/lib/agent-monitoring-validation";
import { validateAgentSandboxReplayPayload } from "@/lib/agent-sandbox-replay-validation";
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
import { POST as postAgentActionPreflight } from "@/app/agents/actions/preflight/route";
import { GET as getAgentClientKit } from "@/app/agents/client-kit.json/route";
import { GET as getAgentJourneys } from "@/app/agents/journeys.json/route";
import { GET as getAgentAccessReview } from "@/app/agents/access-review.json/route";
import { POST as postAgentAccessReviewPreparation } from "@/app/agents/access-review/prepare/route";
import { GET as getAgentAuth } from "@/app/agents/auth.json/route";
import { POST as postAgentAuthPreparation } from "@/app/agents/auth/prepare/route";
import { GET as getAgentConformance } from "@/app/agents/conformance.json/route";
import { GET as getAgentConformanceReportExample } from "@/app/agents/conformance-report.example.json/route";
import { GET as getAgentCompletion } from "@/app/agents/completion.json/route";
import { POST as postAgentCompletionValidation } from "@/app/agents/completion/validate/route";
import { GET as getAgentDelegation } from "@/app/agents/delegation.json/route";
import { GET as getAgentEvidence } from "@/app/agents/evidence.json/route";
import { POST as postAgentEvidenceValidation } from "@/app/agents/evidence/validate/route";
import { GET as getAgentErrorExamples } from "@/app/agents/error-examples.json/route";
import { GET as getAgentExecution } from "@/app/agents/execution.json/route";
import { GET as getAgentHumanHandoffPacketExamples } from "@/app/agents/human-handoff-packets.example.json/route";
import { GET as getAgentHumanHandoffs } from "@/app/agents/human-handoffs.json/route";
import { GET as getAgentHttp } from "@/app/agents/http.json/route";
import { GET as getAgentUx } from "@/app/agents/ux.json/route";
import { POST as postAgentIntakeValidation } from "@/app/agents/intake/validate/route";
import { GET as getAgentMonitoring } from "@/app/agents/monitoring.json/route";
import { POST as postAgentMonitoringPreparation } from "@/app/agents/monitoring/prepare/route";
import { POST as postAgentMonitoringValidation } from "@/app/agents/monitoring/validate/route";
import { GET as getAgentMonitorWebhooks } from "@/app/agents/monitor-webhooks.md/route";
import { GET as getAgentOnboarding } from "@/app/agents/onboarding.json/route";
import { GET as getAgentActionCardExamples } from "@/app/agents/action-cards.example.json/route";
import { GET as getAgentOpportunityCardExamples } from "@/app/agents/opportunity-cards.example.json/route";
import { GET as getAgentOpportunities } from "@/app/agents/opportunities.json/route";
import { GET as getAgentOptimization } from "@/app/agents/optimization.json/route";
import { POST as postAgentOptimizationPreparation } from "@/app/agents/optimization/prepare/route";
import { GET as getAgentPayments } from "@/app/agents/payments.json/route";
import { GET as getAgentProductionAccessPacketExample } from "@/app/agents/production-access-packet.example.json/route";
import { GET as getAgentPrompts } from "@/app/agents/prompts.json/route";
import { GET as getAgentProtocols } from "@/app/agents/protocols.md/route";
import { GET as getAgentProtocolsJson } from "@/app/agents/protocols.json/route";
import { GET as getAgentProtocolAdapterSamples } from "@/app/agents/protocol-adapter-samples.json/route";
import { GET as getAgentRecovery } from "@/app/agents/recovery.json/route";
import { GET as getAgentReadiness } from "@/app/agents/readiness.json/route";
import { GET as getAgentSandboxJson } from "@/app/agents/sandbox.json/route";
import { GET as getAgentSandboxMd } from "@/app/agents/sandbox.md/route";
import { POST as postAgentSandboxReplayValidation } from "@/app/agents/sandbox/replay/route";
import { GET as getAgentStart } from "@/app/agents/start.md/route";
import { GET as getAgentStandards } from "@/app/agents/standards.json/route";
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
    agentCard.sandboxReplayValidationUrl.endsWith("/agents/sandbox/replay"),
    true,
  );
  assert.equal(
    agentCard.workflowCatalogUrl.endsWith("/agents/workflows.json"),
    true,
  );
  assert.equal(
    agentCard.protocolProfileJsonUrl.endsWith("/agents/protocols.json"),
    true,
  );
  assert.equal(
    agentCard.standardsProfileUrl.endsWith("/agents/standards.json"),
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
  assert.equal(
    agentCard.accessReviewPrepareUrl.endsWith("/agents/access-review/prepare"),
    true,
  );
  assert.equal(agentCard.authProfileUrl.endsWith("/agents/auth.json"), true);
  assert.equal(
    agentCard.authPrepareUrl.endsWith("/agents/auth/prepare"),
    true,
  );
  assert.equal(
    agentCard.conformanceProfileUrl.endsWith("/agents/conformance.json"),
    true,
  );
  assert.equal(
    agentCard.completionProfileUrl.endsWith("/agents/completion.json"),
    true,
  );
  assert.equal(
    agentCard.completionValidationUrl.endsWith("/agents/completion/validate"),
    true,
  );
  assert.equal(
    agentCard.delegationProfileUrl.endsWith("/agents/delegation.json"),
    true,
  );
  assert.equal(
    agentCard.evidenceProfileUrl.endsWith("/agents/evidence.json"),
    true,
  );
  assert.equal(
    agentCard.evidenceValidationUrl.endsWith("/agents/evidence/validate"),
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
  assert.equal(agentCard.httpProfileUrl.endsWith("/agents/http.json"), true);
  assert.equal(agentCard.uxProfileUrl.endsWith("/agents/ux.json"), true);
  assert.equal(
    agentCard.intakeValidationUrl.endsWith("/agents/intake/validate"),
    true,
  );
  assert.equal(
    agentCard.actionPreflightUrl.endsWith("/agents/actions/preflight"),
    true,
  );
  assert.equal(
    agentCard.actionCardExamplesUrl.endsWith("/agents/action-cards.example.json"),
    true,
  );
  assert.equal(agentCard.actionCards.status, "live_action_card_examples");
  assert.equal(
    agentCard.actionCards.actionIds.includes("submit_artifact"),
    true,
  );
  assert.equal(
    agentCard.actionCards.nonAuthority.includes("completion proof"),
    true,
  );
  assert.equal(
    agentCard.clientKitUrl.endsWith("/agents/client-kit.json"),
    true,
  );
  assert.equal(
    agentCard.journeyProfileUrl.endsWith("/agents/journeys.json"),
    true,
  );
  assert.equal(agentCard.journeys.status, "live_journey_profile");
  assert.equal(
    agentCard.journeys.roles.some(
      (role: { role: string; canonicalWrites: string[] }) =>
        role.role === "solver" && role.canonicalWrites.includes("Artifact")
    ),
    true,
  );
  assert.equal(
    agentCard.journeys.decisionRules.includes(
      "completion_requires_canonical_truth"
    ),
    true,
  );
  assert.equal(agentCard.standards.status, "live_standards_profile");
  assert.equal(agentCard.standards.url.endsWith("/agents/standards.json"), true);
  assert.equal(
    agentCard.standards.liveStandardIds.includes("openapi_3_1"),
    true,
  );
  assert.equal(
    agentCard.standards.targetStandardIds.includes("mcp_latest"),
    true,
  );
  assert.equal(
    agentCard.standards.resolutionOrder.includes("preflight_before_write"),
    true,
  );
  assert.equal(
    agentCard.monitoringProfileUrl.endsWith("/agents/monitoring.json"),
    true,
  );
  assert.equal(
    agentCard.monitoringPrepareUrl.endsWith("/agents/monitoring/prepare"),
    true,
  );
  assert.equal(
    agentCard.monitoringValidationUrl.endsWith("/agents/monitoring/validate"),
    true,
  );
  assert.equal(
    agentCard.onboardingProfileUrl.endsWith("/agents/onboarding.json"),
    true,
  );
  assert.equal(
    agentCard.opportunityProfileUrl.endsWith("/agents/opportunities.json"),
    true,
  );
  assert.equal(
    agentCard.opportunityCardExamplesUrl.endsWith(
      "/agents/opportunity-cards.example.json"
    ),
    true,
  );
  assert.equal(
    agentCard.optimizationProfileUrl.endsWith("/agents/optimization.json"),
    true,
  );
  assert.equal(
    agentCard.optimizationPrepareUrl.endsWith("/agents/optimization/prepare"),
    true,
  );
  assert.equal(
    agentCard.paymentProfileUrl.endsWith("/agents/payments.json"),
    true,
  );
  assert.equal(
    agentCard.productionAccessPacketExampleUrl.endsWith(
      "/agents/production-access-packet.example.json"
    ),
    true,
  );
  assert.equal(agentCard.promptCatalogUrl.endsWith("/agents/prompts.json"), true);
  assert.equal(agentCard.authentication.profileUrl.endsWith("/agents/auth.json"), true);
  assert.equal(agentCard.accessReview.status, "live_access_review_profile");
  assert.equal(
    agentCard.accessReview.decisionOutcomes.includes("approved_scoped_pilot"),
    true,
  );
  assert.equal(
    agentCard.accessReviewPreparation.status,
    "live_handoff_preparation_only",
  );
  assert.equal(
    agentCard.accessReviewPreparation.nonAuthority.includes(
      "review submission"
    ),
    true,
  );
  assert.equal(agentCard.auth.status, "live_auth_profile");
  assert.equal(agentCard.auth.liveActorClasses.includes("resolver_agent"), true);
  assert.equal(
    agentCard.auth.preparationUrl.endsWith("/agents/auth/prepare"),
    true,
  );
  assert.equal(
    agentCard.authPreparation.status,
    "live_plan_preparation_only",
  );
  assert.equal(
    agentCard.authPreparation.nonAuthority.includes("credential issuer"),
    true,
  );
  assert.equal(agentCard.conformance.status, "live_conformance_profile");
  assert.equal(agentCard.onboarding.status, "live_onboarding_profile");
  assert.equal(
    agentCard.onboarding.productionAccessFields.includes("requestedScopes"),
    true,
  );
  assert.equal(
    agentCard.onboarding.productionAccessPacketExampleUrl.endsWith(
      "/agents/production-access-packet.example.json"
    ),
    true,
  );
  assert.equal(agentCard.delegation.status, "live_human_delegation_profile");
  assert.equal(
    agentCard.delegation.liveModes.includes("account_session_assisted"),
    true,
  );
  assert.equal(
    agentCard.delegation.consentFlows.some(
      (flow: { actionId: string; requiredScopes: string[] }) =>
        flow.actionId === "apply_to_request" &&
        flow.requiredScopes.includes("commitments:propose")
    ),
    true,
  );
  assert.equal(
    agentCard.delegation.revocationRoutes.includes(
      "/api/auth/resolver/token/revoke"
    ),
    true,
  );
  assert.equal(agentCard.http.status, "live_http_reference_profile");
  assert.equal(
    agentCard.http.routeFamilies.some(
      (family: { id: string; routeCount: number }) =>
        family.id === "request_work" && family.routeCount >= 5
    ),
    true,
  );
  assert.equal(agentCard.http.liveHttpIntents.includes("apply_to_request"), true);
  assert.equal(agentCard.ux.status, "live_agent_ux_profile");
  assert.equal(
    agentCard.ux.processStages.some(
      (stage: { id: string; primaryActionIds: string[] }) =>
        stage.id === "apply_submit_and_execute" &&
        stage.primaryActionIds.includes("submit_artifact")
    ),
    true,
  );
  assert.equal(
    agentCard.ux.interactionSurfaces.some(
      (surface: { id: string; canonicalWrites: string[] }) =>
        surface.id === "payment_authorization_card" &&
        surface.canonicalWrites.includes("Transaction")
    ),
    true,
  );
  assert.equal(agentCard.intakeValidation.status, "live_validation_only");
  assert.equal(
    agentCard.intakeValidation.acceptedKinds.includes("conformance_report"),
    true,
  );
  assert.equal(
    agentCard.intakeValidation.nonAuthority.includes("permission grant"),
    true,
  );
  assert.equal(agentCard.actionPreflight.status, "live_validation_only");
  assert.equal(
    agentCard.actionPreflight.acceptedActionIds.includes("apply_to_request"),
    true,
  );
  assert.equal(
    agentCard.actionPreflight.nonAuthority.includes("request mutation"),
    true,
  );
  assert.equal(agentCard.clientKit.status, "live_client_manifest");
  assert.equal(
    agentCard.clientKit.generationOrder.includes("split_client_authority"),
    true,
  );
  assert.equal(
    agentCard.clientKit.clientSurfaces.some(
      (surface: { id: string; canonicalWrites: string[] }) =>
        surface.id === "guardrail_client" &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(agentCard.sandboxReplayValidation.status, "live_validation_only");
  assert.equal(
    agentCard.sandboxReplayValidation.acceptedScenarioIds.includes(
      "solver_apply_submit_monitor_replay"
    ),
    true,
  );
  assert.equal(
    agentCard.sandboxReplayValidation.nonAuthority.includes(
      "production credential"
    ),
    true,
  );
  assert.equal(
    agentCard.monitoringPreparation.status,
    "live_plan_preparation_only",
  );
  assert.equal(
    agentCard.monitoringPreparation.nonAuthority.includes(
      "request activity read"
    ),
    true,
  );
  assert.equal(
    agentCard.monitoring.preparationUrl.endsWith("/agents/monitoring/prepare"),
    true,
  );
  assert.equal(agentCard.opportunities.status, "live_opportunity_discovery_profile");
  assert.equal(
    agentCard.opportunities.cardExamplesUrl.endsWith(
      "/agents/opportunity-cards.example.json"
    ),
    true,
  );
  assert.equal(
    agentCard.opportunities.entrypoint.endsWith("/api/requests?scope=public"),
    true,
  );
  assert.equal(
    agentCard.opportunities.nextActions.includes("apply_to_request"),
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
    agentCard.completion.validationUrl.endsWith("/agents/completion/validate"),
    true,
  );
  assert.equal(
    agentCard.completion.rules.some((rule) => rule.claimState === "completed"),
    true,
  );
  assert.equal(agentCard.completionValidation.status, "live_validation_only");
  assert.equal(
    agentCard.completionValidation.acceptedClaimStates.includes(
      "proof_submitted"
    ),
    true,
  );
  assert.equal(
    agentCard.completionValidation.nonAuthority.includes("completion proof"),
    true,
  );
  assert.equal(agentCard.evidence.status, "live_evidence_profile");
  assert.equal(agentCard.evidence.packetFields.includes("requestId"), true);
  assert.equal(agentCard.evidence.reviewSignalCount >= 5, true);
  assert.equal(agentCard.evidenceValidation.status, "live_validation_only");
  assert.equal(
    agentCard.evidenceValidation.acceptedArtifactKinds.includes("delivery"),
    true,
  );
  assert.equal(
    agentCard.evidenceValidation.nonAuthority.includes("artifact publication"),
    true,
  );
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
    agentCard.optimization.preparationUrl.endsWith(
      "/agents/optimization/prepare"
    ),
    true,
  );
  assert.equal(
    agentCard.optimization.surfaces.some(
      (surface) =>
        surface.id === "request_brief_optimization" &&
        surface.defaultMode === "draft_only" &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    agentCard.optimizationPreparation.status,
    "live_plan_preparation_only",
  );
  assert.equal(
    agentCard.optimizationPreparation.nonAuthority.includes(
      "durable mutation"
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

  const standardsProfile = buildAgentStandardsProfile();
  assert.equal(standardsProfile.status, "live_standards_profile");
  assert.equal(standardsProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    standardsProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/client-kit.json")
    ),
    true,
  );
  assert.equal(
    standardsProfile.standards.some(
      (standard) =>
        standard.id === "openapi_3_1" &&
        standard.status === "live_contract_standard" &&
        standard.currentArtifactVersions.includes("3.1.0")
    ),
    true,
  );
  assert.equal(
    standardsProfile.standards.some(
      (standard) =>
        standard.id === "asyncapi_2_6" &&
        standard.currentArtifactVersions.includes("2.6.0")
    ),
    true,
  );
  assert.equal(
    standardsProfile.standards.some(
      (standard) =>
        standard.id === "mcp_latest" &&
        standard.status === "target_adapter_standard" &&
        standard.officialReferences.some((reference) =>
          reference.url.includes("modelcontextprotocol.io/specification/latest")
        )
    ),
    true,
  );
  assert.equal(
    standardsProfile.standards.some(
      (standard) =>
        standard.id === "oauth_2_and_bearer" &&
        standard.doNotUseFor.includes("raw user credential collection")
    ),
    true,
  );
  assert.equal(
    standardsProfile.resolutionOrder.some(
      (step) =>
        step.id === "load_standards_and_status" &&
        step.read.some((url) => url.endsWith("/agents/readiness.json"))
    ),
    true,
  );
  assert.equal(
    standardsProfile.canonicalBoundary.standardsProfileIsNot.includes(
      "adapter implementation"
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
    readinessProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/access-review/prepare")
    ),
    true,
  );
  assert.equal(
    readinessProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/client-kit.json")
    ),
    true,
  );
  assert.equal(
    readinessProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/journeys.json")
    ),
    true,
  );
  assert.equal(
    readinessProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/standards.json")
    ),
    true,
  );
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
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "review_packet_validation" &&
        capability.status === "live_validation_only" &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/intake/validate")
        )
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "action_preflight" &&
        capability.status === "live_validation_only" &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/actions/preflight")
        )
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "evidence_packet_validation" &&
        capability.status === "live_validation_only" &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/evidence/validate")
        )
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "monitor_checkpoint_validation" &&
        capability.status === "live_validation_and_plan_preparation" &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/monitoring/validate")
        ) &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/monitoring/prepare")
        )
    ),
    true,
  );
  assert.equal(
    readinessProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/completion/validate")
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "completion_claim_validation" &&
        capability.status === "live_validation_only" &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/completion/validate")
        )
    ),
    true,
  );
  assert.equal(
    readinessProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/optimization/prepare")
    ),
    true,
  );
  assert.equal(
    readinessProfile.capabilityBands.some(
      (capability) =>
        capability.id === "optimization_plan_preparation" &&
        capability.status === "live_plan_preparation_only" &&
        capability.evidence.some((url) =>
          url.endsWith("/agents/optimization/prepare")
        )
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

  const clientKit = buildAgentClientKitProfile();
  assert.equal(clientKit.status, "live_client_manifest");
  assert.equal(clientKit.canonicalBoundary.rootObject, "Request");
  assert.equal(
    clientKit.resources.some((resource) =>
      resource.url.endsWith("/agents/standards.json")
    ),
    true,
  );
  assert.equal(
    clientKit.generationOrder.some(
      (step) => step.id === "split_client_authority"
    ),
    true,
  );
  assert.equal(
    clientKit.contractSources.some(
      (source) =>
        source.standard === "OpenAPI 3.1" &&
        source.url.endsWith("/openapi/request-briefing.yaml")
    ),
    true,
  );
  assert.equal(
    clientKit.contractSources.some(
      (source) =>
        source.standard === "JSON Schema 2020-12" &&
        source.url.endsWith("/schemas/agent-client-kit.schema.json")
    ),
    true,
  );
  assert.equal(
    clientKit.clientSurfaces.some(
      (surface) =>
        surface.id === "guardrail_client" &&
        surface.status === "live_validation_and_preparation" &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(clientKit.nonGoals.includes("generated SDK package"), true);
  assert.equal(
    clientKit.canonicalBoundary.clientKitIsNot.includes("permission grant"),
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
  assert.equal(
    authProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/auth/prepare")
    ),
    true,
  );
  assert.equal(authProfile.preparationEndpoint.path, "/agents/auth/prepare");
  assert.equal(
    authProfile.preparationEndpoint.nonAuthority.includes("permission grant"),
    true,
  );

  const authPreparation = prepareAgentAuthPayload({
    schemaVersion: 1,
    preparationIntent: "agent_auth_route",
    actionId: "apply_to_request",
    requestedAuthScheme: "resolver_bearer",
    requestedScopes: ["commitments:propose"],
    hasHumanApproval: true,
    hasRequestPolicyCheck: true,
    hasIdempotencyKey: true,
    notCredentialRequest: true,
    noSecretsIncluded: true,
    claimsCredentialIssued: false,
    claimsPermissionGranted: false,
    claimsProductionAccess: false,
    claimsPaymentAuthority: false,
  });
  assert.equal(authPreparation.status, "auth_plan_ready");
  assert.equal(
    authPreparation.authPlan.recommendedAuthScheme,
    "resolver_bearer",
  );
  assert.equal(authPreparation.authPlan.missingScopes.length, 0);
  assert.equal(authPreparation.credentialIssued, false);
  assert.equal(authPreparation.permissionGranted, false);
  assert.equal(authPreparation.durableWriteCreated, false);
  assert.equal(
    authPreparation.operatorReview.requiredForProductionExternalAgent,
    false,
  );

  const blockedAuthPreparation = prepareAgentAuthPayload({
    schemaVersion: 1,
    preparationIntent: "agent_auth_route",
    actionId: "apply_to_request",
    requestedAuthScheme: "external_oauth2",
    requestedScopes: [],
    hasHumanApproval: false,
    hasRequestPolicyCheck: false,
    hasIdempotencyKey: false,
    notCredentialRequest: false,
    noSecretsIncluded: false,
    claimsCredentialIssued: true,
    claimsPermissionGranted: true,
    claimsProductionAccess: true,
    claimsPaymentAuthority: true,
  });
  assert.equal(blockedAuthPreparation.status, "auth_plan_blocked");
  assert.equal(
    blockedAuthPreparation.missingFields.includes("notCredentialRequest=true"),
    true,
  );
  assert.equal(
    blockedAuthPreparation.missingFields.includes(
      "requestedAuthScheme allowed for actionId"
    ),
    true,
  );
  assert.equal(
    blockedAuthPreparation.missingFields.includes(
      "requestedScopes includes commitments:propose"
    ),
    true,
  );
  assert.equal(
    blockedAuthPreparation.missingFields.includes("hasHumanApproval=true"),
    true,
  );
  assert.equal(
    blockedAuthPreparation.missingFields.includes("hasRequestPolicyCheck=true"),
    true,
  );
  assert.equal(
    blockedAuthPreparation.missingFields.includes("hasIdempotencyKey=true"),
    true,
  );
  assert.equal(blockedAuthPreparation.credentialIssued, false);

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
          check.id === "render_human_first_agent_ux" &&
          check.required &&
          check.evidence.some((item) => item.endsWith("/agents/ux.json"))
      )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.checklists.some((checklist) =>
      checklist.checks.some(
        (check) =>
          check.id === "scope_human_delegation" &&
          check.required &&
          check.evidence.some((item) => item.endsWith("/agents/delegation.json"))
      )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.checklists.some((checklist) =>
      checklist.checks.some(
        (check) =>
          check.id === "package_production_access_packet" &&
          check.required &&
          check.evidence.some((item) =>
            item.endsWith("/agents/production-access-packet.example.json")
          )
      )
    ),
    true,
  );
  assert.equal(
    conformanceProfile.checklists.some((checklist) =>
      checklist.checks.some(
        (check) =>
          check.id === "rank_public_opportunity_cards" &&
          check.required &&
          check.evidence.some((item) =>
            item.endsWith("/agents/opportunity-cards.example.json")
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
    completionProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/evidence/validate")
    ),
    true,
  );
  assert.equal(
    completionProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/completion/validate")
    ),
    true,
  );
  assert.equal(
    completionProfile.validationEndpoint.path,
    "/agents/completion/validate",
  );
  assert.equal(
    completionProfile.validationEndpoint.nonAuthority.includes(
      "completion proof"
    ),
    true,
  );
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

  const completionValidation = validateAgentCompletionPayload({
    schemaVersion: 1,
    claim: {
      requestId: "req_public_design_001",
      claimState: "proof_submitted",
      summary: "Proof was submitted for owner review.",
      evidenceSummary:
        "Artifact art_123 is attached to the accepted fulfillment lane.",
      reviewStatus: "owner_review_required",
      artifactId: "art_123",
      hasRequestLifecycleTruth: false,
      hasCommitmentTruth: false,
      hasFulfillmentTruth: false,
      hasArtifactTruth: true,
      hasReviewTruth: false,
      hasTransactionTruth: false,
      hasRequestEventTruth: false,
      containsSecrets: false,
      rawPromptTranscriptIncluded: false,
      rawRuntimeLogsIncluded: false,
      paymentOnlyProof: false,
      claimsFromToolSuccess: false,
      claimsFromProviderCallback: false,
      claimsFromRuntimeLogs: false,
      claimsFromA2ATask: false,
      claimsFromMcpTool: false,
    },
  });
  assert.equal(completionValidation.status, "validation_passed");
  assert.equal(
    completionValidation.matchedRuleId,
    "proof_submitted_for_review",
  );
  assert.equal(completionValidation.completionProven, false);
  assert.equal(completionValidation.artifactPublished, false);
  assert.equal(completionValidation.durableWriteCreated, false);

  const failedCompletionValidation = validateAgentCompletionPayload({
    schemaVersion: 1,
    claim: {
      requestId: "req_public_design_001",
      claimState: "completed",
      summary: "The work is complete.",
      evidenceSummary: "The tool finished.",
      reviewStatus: "not_reviewed",
      hasRequestLifecycleTruth: false,
      hasCommitmentTruth: false,
      hasFulfillmentTruth: false,
      hasArtifactTruth: false,
      hasReviewTruth: false,
      hasTransactionTruth: false,
      hasRequestEventTruth: false,
      containsSecrets: true,
      rawPromptTranscriptIncluded: true,
      rawRuntimeLogsIncluded: true,
      paymentOnlyProof: true,
      claimsFromToolSuccess: true,
      claimsFromProviderCallback: true,
      claimsFromRuntimeLogs: true,
      claimsFromA2ATask: true,
      claimsFromMcpTool: true,
    },
  });
  assert.equal(failedCompletionValidation.status, "validation_failed");
  assert.equal(
    failedCompletionValidation.missingFields.includes(
      "hasRequestLifecycleTruth=true"
    ),
    true,
  );
  assert.equal(
    failedCompletionValidation.missingFields.includes(
      "hasFulfillmentTruth=true"
    ),
    true,
  );
  assert.equal(
    failedCompletionValidation.missingFields.includes("hasReviewTruth=true"),
    true,
  );
  assert.equal(
    failedCompletionValidation.missingFields.includes(
      "acceptedArtifactId or artifactId"
    ),
    true,
  );
  assert.equal(failedCompletionValidation.completionProven, false);
  assert.equal(failedCompletionValidation.reviewAccepted, false);
  assert.equal(failedCompletionValidation.requestEventWritten, false);

  const delegationProfile = buildAgentDelegationProfile();
  assert.equal(delegationProfile.status, "live_human_delegation_profile");
  assert.equal(delegationProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    delegationProfile.delegationModes.some(
      (mode) =>
        mode.id === "account_session_assisted" &&
        mode.status === "live_account_session" &&
        mode.secretsSharedWithAgent === false
    ),
    true,
  );
  assert.equal(
    delegationProfile.delegationModes.some(
      (mode) =>
        mode.id === "resolver_device_delegation" &&
        mode.status === "live_resolver_bearer" &&
        mode.credentialKind === "scoped_bearer_token"
    ),
    true,
  );
  assert.equal(
    delegationProfile.delegationModes.some(
      (mode) =>
        mode.id === "external_oauth2_delegation" &&
        mode.status === "target_external_agent_auth"
    ),
    true,
  );
  assert.equal(
    delegationProfile.humanConsentFlows.some(
      (flow) =>
        flow.id === "delegate_application" &&
        flow.actionId === "apply_to_request" &&
        flow.requiredScopes.includes("commitments:propose") &&
        flow.canonicalWritesIfApproved.includes("Commitment")
    ),
    true,
  );
  assert.equal(
    delegationProfile.humanConsentFlows.some(
      (flow) =>
        flow.id === "delegate_paid_run" &&
        flow.actionId === "run_public_solution" &&
        flow.authOptions.includes("boreal_account_session") &&
        flow.canonicalWritesIfApproved.includes("Transaction")
    ),
    true,
  );
  assert.equal(
    delegationProfile.revocation.liveRoutes.some(
      (route) => route.path === "/api/auth/resolver/token/revoke"
    ),
    true,
  );
  assert.equal(
    delegationProfile.consentReceipt.mustNotInclude.includes("session cookie"),
    true,
  );
  assert.equal(
    delegationProfile.canonicalBoundary.delegationProfileIsNot.includes(
      "permission grant"
    ),
    true,
  );

  const httpProfile = buildAgentHttpProfile();
  assert.equal(httpProfile.status, "live_http_reference_profile");
  assert.equal(httpProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    httpProfile.contractSources.some(
      (source) =>
        source.id === "request_briefing" &&
        source.url.endsWith("/openapi/request-briefing.yaml")
    ),
    true,
  );
  assert.equal(
    httpProfile.routeFamilies.some(
      (family) =>
        family.id === "request_work" &&
        family.routes.some(
          (route) =>
            route.path === "/api/requests/{id}/commitments" &&
            route.idempotencyRequired &&
            route.canonicalWrites.includes("Commitment")
        )
    ),
    true,
  );
  assert.equal(
    httpProfile.routeFamilies.some(
      (family) =>
        family.id === "payment_and_runs" &&
        family.routes.some(
          (route) =>
            route.path === "/api/requests/{id}/solution-runs" &&
            route.canonicalWrites.includes("Transaction")
        )
    ),
    true,
  );
  assert.equal(
    httpProfile.intentToHttp.some(
      (intent) =>
        intent.toolId === "boreal.commitments.propose" &&
        intent.idempotencyRequired
    ),
    true,
  );
  assert.equal(
    httpProfile.nonHttpIntentFallbacks.some(
      (fallback) => fallback.actionId === "optimize_request_brief"
    ),
    true,
  );
  assert.equal(
    httpProfile.canonicalBoundary.httpProfileIsNot.includes("new API surface"),
    true,
  );

  const uxProfile = buildAgentUxProfile();
  assert.equal(uxProfile.status, "live_agent_ux_profile");
  assert.equal(uxProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    uxProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/actions/preflight")
    ),
    true,
  );
  assert.equal(
    uxProfile.entrypoints.some(
      (entrypoint) =>
        entrypoint.id === "live_route_invocation" &&
        entrypoint.primaryUrl.endsWith("/agents/http.json")
    ),
    true,
  );
  assert.equal(
    uxProfile.processStages.some(
      (stage) =>
        stage.id === "delegate_and_preflight" &&
        stage.primaryActionIds.includes("run_public_solution") &&
        stage.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    uxProfile.processStages.some(
      (stage) =>
        stage.id === "apply_submit_and_execute" &&
        stage.canonicalWrites.includes("Commitment") &&
        stage.canonicalWrites.includes("Artifact")
    ),
    true,
  );
  assert.equal(
    uxProfile.interactionSurfaces.some(
      (surface) =>
        surface.id === "completion_claim_banner" &&
        surface.humanDecisionRequired &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    uxProfile.humanFirstRules.some((rule) => rule.id === "human_owns_intent"),
    true,
  );
  assert.equal(
    uxProfile.claimStateLabels.some(
      (label) =>
        label.id === "completed" &&
        label.notEnough.includes("HTTP 2xx") &&
        label.requiredTruth.some((truth) => truth.includes("Request.status=completed"))
    ),
    true,
  );
  assert.equal(
    uxProfile.canonicalBoundary.uxProfileIsNot.includes("workflow engine"),
    true,
  );

  const journeyProfile = buildAgentJourneyProfile();
  assert.equal(journeyProfile.status, "live_journey_profile");
  assert.equal(journeyProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(
    journeyProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/client-kit.json")
    ),
    true,
  );
  assert.equal(
    journeyProfile.journeys.some(
      (journey) =>
        journey.id === "solver_apply_submit_monitor" &&
        journey.canonicalWrites.includes("Artifact")
    ),
    true,
  );
  assert.equal(
    journeyProfile.journeys.some(
      (journey) =>
        journey.role === "optimizer" && journey.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    journeyProfile.decisionRules.some(
      (rule) => rule.id === "completion_requires_canonical_truth"
    ),
    true,
  );
  assert.equal(
    journeyProfile.canonicalBoundary.journeyProfileIsNot.includes(
      "permission grant"
    ),
    true,
  );
  assert.equal(
    journeyProfile.canonicalBoundary.journeyProfileIsNot.includes(
      "completion proof"
    ),
    true,
  );

  const evidenceProfile = buildAgentEvidenceProfile();
  assert.equal(evidenceProfile.status, "live_evidence_profile");
  assert.equal(evidenceProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(evidenceProfile.canonicalBoundary.evidenceTruthObject, "Artifact");
  assert.equal(
    evidenceProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/evidence/validate")
    ),
    true,
  );
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

  const validEvidenceValidation = validateAgentEvidencePayload({
    schemaVersion: 1,
    packet: {
      requestId: "req_public_design_001",
      artifactKind: "evidence",
      claimState: "proof_submitted",
      title: "Implementation proof packet",
      summary: "Reviewable summary and verification notes.",
      content: "What changed, where to inspect it, and what remains unverified.",
      fulfillmentId: "fulfillment_001",
      evidenceClaims: ["output attached", "tests passed"],
      redactionStatement: "No secrets, raw prompts, or runtime logs included.",
      reviewRequest: "Review this Artifact candidate against acceptance criteria.",
      hasIdempotencyKey: true,
      containsSecrets: false,
      rawRuntimeLogsIncluded: false,
      rawPromptTranscriptIncluded: false,
      paymentOnlyProof: false,
      claimsCompletion: false,
    },
  });
  assert.equal(validEvidenceValidation.status, "validation_passed");
  assert.equal(validEvidenceValidation.artifactPublished, false);
  assert.equal(validEvidenceValidation.reviewAccepted, false);
  assert.equal(validEvidenceValidation.completionProven, false);
  assert.equal(validEvidenceValidation.paymentAuthorized, false);
  assert.equal(validEvidenceValidation.permissionGranted, false);
  assert.equal(validEvidenceValidation.durableWriteCreated, false);
  assert.equal(
    validEvidenceValidation.canonicalBoundary.validationIsNot.includes(
      "durable RequestEvent"
    ),
    true,
  );

  const failedEvidenceValidation = validateAgentEvidencePayload({
    schemaVersion: 1,
    packet: {
      requestId: "req_public_design_001",
      artifactKind: "evidence",
      claimState: "completed",
      title: "Done",
      summary: "Tool finished.",
      content: "Provider callback succeeded.",
      evidenceClaims: [],
      redactionStatement: "No redaction.",
      reviewRequest: "Accept as complete.",
      hasIdempotencyKey: false,
      containsSecrets: true,
      rawRuntimeLogsIncluded: true,
      rawPromptTranscriptIncluded: true,
      paymentOnlyProof: true,
      claimsCompletion: true,
    },
  });
  assert.equal(failedEvidenceValidation.status, "validation_failed");
  assert.equal(failedEvidenceValidation.missingFields.includes("claimState"), true);
  assert.equal(
    failedEvidenceValidation.missingFields.includes("containsSecrets=false"),
    true,
  );
  assert.equal(
    failedEvidenceValidation.missingFields.includes("claimsCompletion=false"),
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
    monitoringProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/monitoring/validate")
    ),
    true,
  );
  assert.equal(
    monitoringProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/monitoring/prepare")
    ),
    true,
  );
  assert.equal(
    monitoringProfile.validationEndpoint.path,
    "/agents/monitoring/validate",
  );
  assert.equal(
    monitoringProfile.preparationEndpoint.path,
    "/agents/monitoring/prepare",
  );
  assert.equal(
    monitoringProfile.preparationEndpoint.nonAuthority.includes(
      "request activity read"
    ),
    true,
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

  const pollMonitorValidation = validateAgentMonitoringPayload({
    schemaVersion: 1,
    monitor: {
      mode: "poll_cursor",
      requestId: "req_public_design_001",
      visibility: "public",
      hasRequestAccess: true,
      requestedScopes: [],
      cursor: {
        afterSequence: 0,
      },
      poll: {
        intervalSeconds: 60,
        limit: 40,
      },
      escalationTriggers: ["owner_review_needed", "stale_activity"],
      storesCursor: true,
      createsHeartbeatEvents: false,
      claimsCompletion: false,
      includesPrivatePayloads: false,
    },
  });
  assert.equal(pollMonitorValidation.status, "validation_passed");
  assert.equal(pollMonitorValidation.pollingReady, true);
  assert.equal(pollMonitorValidation.subscriptionPersisted, false);
  assert.equal(pollMonitorValidation.pushDeliveryActivated, false);
  assert.equal(pollMonitorValidation.heartbeatEventCreated, false);
  assert.equal(pollMonitorValidation.requestEventWritten, false);
  assert.equal(pollMonitorValidation.completionProven, false);
  assert.equal(pollMonitorValidation.paymentAuthorized, false);
  assert.equal(pollMonitorValidation.permissionGranted, false);
  assert.equal(pollMonitorValidation.durableWriteCreated, false);

  const webhookMonitorValidation = validateAgentMonitoringPayload({
    schemaVersion: 1,
    monitor: {
      mode: "signed_webhook_target",
      requestId: "req_public_design_001",
      visibility: "public",
      hasRequestAccess: true,
      requestedScopes: [],
      webhook: {
        callbackUrl: "https://agent.example/boreal/request-activity",
        signatureVersion: "v1",
        timestampToleranceSeconds: 300,
        canVerifySignature: true,
      },
      escalationTriggers: ["owner_review_needed", "stale_activity"],
      storesCursor: true,
      createsHeartbeatEvents: false,
      claimsCompletion: false,
      includesPrivatePayloads: false,
    },
  });
  assert.equal(webhookMonitorValidation.status, "validation_passed");
  assert.equal(webhookMonitorValidation.signedWebhookTargetReady, true);
  assert.equal(webhookMonitorValidation.pushDeliveryActivated, false);
  assert.equal(
    webhookMonitorValidation.warnings.some((warning) =>
      warning.includes("target-only")
    ),
    true,
  );

  const failedMonitorValidation = validateAgentMonitoringPayload({
    schemaVersion: 1,
    monitor: {
      mode: "poll_cursor",
      requestId: "req_private_design_001",
      visibility: "private",
      requestedScopes: [],
      cursor: {},
      escalationTriggers: ["unknown_trigger"],
      storesCursor: false,
      createsHeartbeatEvents: true,
      claimsCompletion: true,
      includesPrivatePayloads: true,
    },
  });
  assert.equal(failedMonitorValidation.status, "validation_failed");
  assert.equal(
    failedMonitorValidation.missingFields.includes("storesCursor=true"),
    true,
  );
  assert.equal(
    failedMonitorValidation.missingFields.includes(
      "hasRequestAccess=true or requestedScopes includes requests:read_activity"
    ),
    true,
  );
  assert.equal(
    failedMonitorValidation.missingFields.includes(
      "cursor.afterSequence or cursor.nextAfterSequence"
    ),
    true,
  );
  assert.equal(
    failedMonitorValidation.missingFields.includes("claimsCompletion=false"),
    true,
  );

  const monitorPreparation = prepareAgentMonitoringPayload({
    schemaVersion: 1,
    preparationIntent: "monitor_request",
    preparationMode: "monitor_execution_plan",
    claimsActivityRead: false,
    createsSubscription: false,
    activatesPushDelivery: false,
    createsHeartbeatEvents: false,
    claimsCompletion: false,
    claimsDurableWrite: false,
    monitor: {
      mode: "poll_cursor",
      requestId: "req_public_design_001",
      visibility: "public",
      hasRequestAccess: true,
      requestedScopes: [],
      cursor: {
        afterSequence: 0,
      },
      poll: {
        intervalSeconds: 60,
        limit: 40,
      },
      escalationTriggers: ["owner_review_needed", "stale_activity"],
      storesCursor: true,
      createsHeartbeatEvents: false,
      claimsCompletion: false,
      includesPrivatePayloads: false,
    },
  });
  assert.equal(monitorPreparation.status, "monitor_plan_ready");
  assert.equal(monitorPreparation.validationStatus, "validation_passed");
  assert.equal(monitorPreparation.pollingReady, true);
  assert.equal(monitorPreparation.activityReadCreated, false);
  assert.equal(monitorPreparation.subscriptionPersisted, false);
  assert.equal(monitorPreparation.pushDeliveryActivated, false);
  assert.equal(monitorPreparation.requestEventWritten, false);
  assert.equal(
    monitorPreparation.cursorPollPlan.routeTemplate,
    "/api/requests/{requestId}/activity",
  );
  assert.equal(monitorPreparation.cursorPollPlan.query.after_sequence, 0);
  assert.equal(monitorPreparation.cursorPollPlan.query.limit, 40);
  assert.equal(monitorPreparation.cursorPollPlan.canonicalWrites.length, 0);
  assert.equal(
    monitorPreparation.escalationHandoff.triggers.includes("stale_activity"),
    true,
  );
  assert.equal(
    monitorPreparation.targetWebhookReceiver.subscriptionEndpointLive,
    false,
  );

  const blockedMonitorPreparation = prepareAgentMonitoringPayload({
    schemaVersion: 1,
    preparationIntent: "monitor_request",
    preparationMode: "monitor_execution_plan",
    claimsActivityRead: true,
    createsSubscription: true,
    activatesPushDelivery: true,
    createsHeartbeatEvents: true,
    claimsCompletion: true,
    claimsDurableWrite: true,
    monitor: {
      mode: "poll_cursor",
      requestId: "req_private_design_001",
      visibility: "private",
      requestedScopes: [],
      cursor: {},
      escalationTriggers: ["unknown_trigger"],
      storesCursor: false,
      createsHeartbeatEvents: true,
      claimsCompletion: true,
      includesPrivatePayloads: true,
    },
  });
  assert.equal(blockedMonitorPreparation.status, "monitor_plan_blocked");
  assert.equal(
    blockedMonitorPreparation.missingFields.includes("claimsActivityRead=false"),
    true,
  );
  assert.equal(
    blockedMonitorPreparation.missingFields.includes("createsSubscription=false"),
    true,
  );
  assert.equal(
    blockedMonitorPreparation.missingFields.includes("monitor.storesCursor=true"),
    true,
  );
  assert.equal(
    blockedMonitorPreparation.missingFields.includes(
      "monitor.cursor.afterSequence or cursor.nextAfterSequence"
    ),
    true,
  );
  assert.equal(blockedMonitorPreparation.permissionGranted, false);

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
    accessReviewProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/production-access-packet.example.json")
    ),
    true,
  );
  assert.equal(
    accessReviewProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/access-review/prepare")
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
    onboardingProfile.productionAccessPacket.schemaUrl.endsWith(
      "/schemas/agent-production-access-packet.schema.json"
    ),
    true,
  );
  assert.equal(
    onboardingProfile.productionAccessPacket.exampleUrl.endsWith(
      "/agents/production-access-packet.example.json"
    ),
    true,
  );
  assert.equal(
    onboardingProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/access-review/prepare")
    ),
    true,
  );
  assert.equal(
    onboardingProfile.onboardingStages.some(
      (stage) =>
        stage.id === "production_access_request" &&
        stage.requiredReads.some((profile) =>
          profile.endsWith("/agents/production-access-packet.example.json")
        )
    ),
    true,
  );
  const productionAccessPacket =
    await readAgentProductionAccessPacketExample();
  assert.equal(
    productionAccessPacket.packetKind,
    "agent_production_access_packet",
  );
  assert.equal(
    productionAccessPacket.status,
    "target_operator_review_packet_example",
  );
  assert.equal(productionAccessPacket.notAcceptedByProduction, true);
  assert.equal(
    productionAccessPacket.requestedAccess.status,
    "operator_review_required",
  );
  assert.equal(
    productionAccessPacket.sandboxEvidence.coveredRequiredChecks.includes(
      "package_production_access_packet"
    ),
    true,
  );
  assert.equal(
    productionAccessPacket.protocolClaims.mcp,
    "target_only",
  );
  assert.equal(
    productionAccessPacket.paymentAndSpendBoundary.paymentAuthorityRequested,
    false,
  );
  assert.equal(
    productionAccessPacket.canonicalBoundary.packetIsNot.includes(
      "production credential"
    ),
    true,
  );
  const conformanceValidation = validateAgentIntakePayload({
    schemaVersion: 1,
    intakeKind: "conformance_report",
    payload: conformanceReportExample,
  });
  assert.equal(conformanceValidation.status, "validation_passed");
  assert.equal(conformanceValidation.acceptedByProduction, false);
  assert.equal(conformanceValidation.credentialsIssued, false);
  assert.equal(conformanceValidation.permissionGranted, false);
  assert.equal(conformanceValidation.paymentAuthorized, false);
  assert.equal(conformanceValidation.completionProven, false);
  assert.equal(
    conformanceValidation.canonicalBoundary.validationIsNot.includes(
      "durable RequestEvent"
    ),
    true,
  );

  const productionAccessValidation = validateAgentIntakePayload({
    schemaVersion: 1,
    intakeKind: "production_access_packet",
    payload: productionAccessPacket,
  });
  assert.equal(productionAccessValidation.status, "validation_passed");
  assert.equal(productionAccessValidation.reviewSubmissionCreated, false);
  assert.equal(productionAccessValidation.acceptedByProduction, false);

  const accessReviewPreparation = prepareAgentAccessReviewPayload({
    schemaVersion: 1,
    submissionIntent: "production_access_review",
    submissionMode: "manual_operator_review_handoff",
    operatorReviewRequired: true,
    notCredentialRequest: true,
    noSecretsIncluded: true,
    claimsProductionAccess: false,
    claimsProductionSandbox: false,
    productionAccessPacket,
  });
  assert.equal(accessReviewPreparation.status, "handoff_packet_ready");
  assert.equal(
    accessReviewPreparation.intakeValidationStatus,
    "validation_passed",
  );
  assert.equal(accessReviewPreparation.reviewSubmissionCreated, false);
  assert.equal(accessReviewPreparation.credentialsIssued, false);
  assert.equal(accessReviewPreparation.productionSandboxCreated, false);
  assert.equal(accessReviewPreparation.durableWriteCreated, false);
  assert.equal(
    accessReviewPreparation.operatorHandoff.decisionOptions.includes(
      "approved_scoped_pilot"
    ),
    true,
  );
  assert.equal(
    accessReviewPreparation.packetSummary.requestedScopes.includes(
      "commitments:propose"
    ),
    true,
  );

  const blockedAccessReviewPreparation = prepareAgentAccessReviewPayload({
    schemaVersion: 1,
    submissionIntent: "production_access_review",
    submissionMode: "manual_operator_review_handoff",
    operatorReviewRequired: true,
    notCredentialRequest: false,
    noSecretsIncluded: false,
    claimsProductionAccess: true,
    claimsProductionSandbox: true,
    productionAccessPacket: {},
  });
  assert.equal(blockedAccessReviewPreparation.status, "handoff_blocked");
  assert.equal(
    blockedAccessReviewPreparation.missingFields.includes(
      "notCredentialRequest=true"
    ),
    true,
  );
  assert.equal(
    blockedAccessReviewPreparation.missingFields.includes(
      "noSecretsIncluded=true"
    ),
    true,
  );
  assert.equal(
    blockedAccessReviewPreparation.missingFields.includes(
      "claimsProductionAccess=false"
    ),
    true,
  );
  assert.equal(
    blockedAccessReviewPreparation.missingFields.includes(
      "productionAccessPacket.packetKind=agent_production_access_packet"
    ),
    true,
  );

  const malformedValidation = validateAgentIntakePayload({
    schemaVersion: 1,
    intakeKind: "production_access_packet",
    payload: {
      packetKind: "agent_production_access_packet",
      protocolClaims: { mcp: "live" },
    },
  });
  assert.equal(malformedValidation.status, "validation_failed");
  assert.equal(
    malformedValidation.missingFields.includes(
      "protocolClaims.mcp=target_only"
    ),
    true,
  );
  assert.equal(malformedValidation.credentialsIssued, false);

  const applyPreflight = validateAgentActionPreflight({
    schemaVersion: 1,
    actionId: "apply_to_request",
    requestId: "req_public_design_001",
    representedActor: {
      kind: "resolver_agent",
      reference: "agent:portfolio-builder",
    },
    hasHumanApproval: true,
    hasIdempotencyKey: true,
    requestedScopes: ["commitments:propose"],
    payloadSummary: "Commitment proposal for one public request.",
  });
  assert.equal(applyPreflight.status, "preflight_passed");
  assert.equal(
    applyPreflight.actionAvailability,
    "live_authenticated_http_contract",
  );
  assert.equal(applyPreflight.requiredScopes.includes("commitments:propose"), true);
  assert.equal(applyPreflight.canonicalWrites.includes("Commitment"), true);
  assert.equal(applyPreflight.permissionGranted, false);
  assert.equal(applyPreflight.approvalRecorded, false);
  assert.equal(applyPreflight.credentialIssued, false);
  assert.equal(applyPreflight.paymentAuthorized, false);
  assert.equal(applyPreflight.completionProven, false);
  assert.equal(applyPreflight.durableWriteCreated, false);
  assert.equal(
    applyPreflight.canonicalBoundary.preflightIsNot.includes(
      "durable RequestEvent"
    ),
    true,
  );

  const monitorPreflight = validateAgentActionPreflight({
    schemaVersion: 1,
    actionId: "monitor_request",
    requestId: "req_public_design_001",
  });
  assert.equal(monitorPreflight.status, "preflight_passed");
  assert.equal(monitorPreflight.canonicalReads.includes("RequestEvent"), true);
  assert.equal(monitorPreflight.durableWriteCreated, false);
  assert.equal(
    monitorPreflight.warnings.some((warning) =>
      warning.includes("requests:read_activity")
    ),
    true,
  );

  const missingApplyPreflight = validateAgentActionPreflight({
    schemaVersion: 1,
    actionId: "apply_to_request",
    requestId: "req_public_design_001",
  });
  assert.equal(missingApplyPreflight.status, "preflight_failed");
  assert.equal(
    missingApplyPreflight.missingRequirements.includes(
      "representedActor.reference"
    ),
    true,
  );
  assert.equal(
    missingApplyPreflight.missingRequirements.includes(
      "requestedScopes includes commitments:propose"
    ),
    true,
  );
  assert.equal(missingApplyPreflight.durableWriteCreated, false);

  const unknownActionPreflight = validateAgentActionPreflight({
    schemaVersion: 1,
    actionId: "delete_request",
  });
  assert.equal(unknownActionPreflight.status, "preflight_failed");
  assert.equal(unknownActionPreflight.actionAvailability, "unknown");
  assert.equal(unknownActionPreflight.missingRequirements.includes("actionId"), true);

  const validSandboxReplayPayload = {
    schemaVersion: 1,
    replay: {
      scenarioId: "solver_apply_submit_monitor_replay",
      validationCommand: "pnpm contracts:agent-sandbox",
      representedActor: {
        kind: "resolver_agent",
        reference: "agent:portfolio-builder",
      },
      notAcceptedByProduction: true,
      productionEffects: false,
      usesMockCredentialsOnly: true,
      mockCredentialsUsedInProduction: false,
      secretsIncluded: false,
      claimsProductionAccess: false,
      claimsCompletion: false,
      completedSteps: [
        {
          id: "inspect_public_fit",
          flowId: "inspect_public_requests",
          actor: "anonymous-public-scout",
          kind: "read",
          writes: [],
          productionWrite: false,
        },
        {
          id: "submit_commitment_proposal",
          flowId: "apply_to_request",
          actor: "sandbox-solver-proposer",
          kind: "mutation_sample",
          writes: ["Commitment", "RequestEvent"],
          productionWrite: false,
          idempotencyKey: "00000000-0000-4000-8000-000000000101",
        },
        {
          id: "accepted_commitment_gate",
          flowId: "apply_to_request",
          actor: "human-owner",
          kind: "simulated_external_gate",
          writes: ["Commitment", "Fulfillment", "RequestEvent"],
          productionWrite: false,
        },
        {
          id: "publish_proof_artifact",
          flowId: "submit_artifact",
          actor: "sandbox-solver-publisher",
          kind: "mutation_sample",
          writes: ["Artifact", "RequestEvent"],
          productionWrite: false,
          idempotencyKey: "00000000-0000-4000-8000-000000000102",
        },
        {
          id: "validate_proof_submitted_claim",
          flowId: "validate_completion_claim",
          actor: "sandbox-solver-publisher",
          kind: "validation",
          writes: [],
          productionWrite: false,
        },
        {
          id: "resume_monitor_cursor",
          flowId: "monitor_request",
          actor: "sandbox-monitor",
          kind: "monitor",
          writes: [],
          productionWrite: false,
        },
      ],
      observedTerminalState: {
        claimState: "proof_submitted_waiting_for_owner_acceptance",
        durableCompletion: false,
        publicVisibility: true,
      },
    },
  };
  const passedSandboxReplayValidation =
    validateAgentSandboxReplayPayload(validSandboxReplayPayload);
  assert.equal(passedSandboxReplayValidation.status, "validation_passed");
  assert.equal(
    passedSandboxReplayValidation.acceptedScenarioIds.includes(
      "solver_apply_submit_monitor_replay"
    ),
    true,
  );
  assert.equal(passedSandboxReplayValidation.acceptedByProduction, false);
  assert.equal(passedSandboxReplayValidation.reviewSubmissionCreated, false);
  assert.equal(passedSandboxReplayValidation.credentialsIssued, false);
  assert.equal(passedSandboxReplayValidation.productionSandboxCreated, false);
  assert.equal(passedSandboxReplayValidation.paymentAuthorized, false);
  assert.equal(passedSandboxReplayValidation.completionProven, false);
  assert.equal(passedSandboxReplayValidation.durableWriteCreated, false);

  const failedSandboxReplayValidation = validateAgentSandboxReplayPayload({
    ...validSandboxReplayPayload,
    replay: {
      ...validSandboxReplayPayload.replay,
      productionEffects: true,
      mockCredentialsUsedInProduction: true,
      claimsCompletion: true,
      completedSteps: [validSandboxReplayPayload.replay.completedSteps[0]],
    },
  });
  assert.equal(failedSandboxReplayValidation.status, "validation_failed");
  assert.equal(
    failedSandboxReplayValidation.missingFields.includes(
      "productionEffects=false"
    ),
    true,
  );
  assert.equal(
    failedSandboxReplayValidation.missingFields.includes(
      "mockCredentialsUsedInProduction=false"
    ),
    true,
  );
  assert.equal(
    failedSandboxReplayValidation.missingFields.includes(
      "claimsCompletion=false"
    ),
    true,
  );
  assert.equal(
    failedSandboxReplayValidation.missingFields.includes(
      "completedSteps includes publish_proof_artifact"
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

  const opportunityProfile = buildAgentOpportunityDiscoveryProfile();
  assert.equal(opportunityProfile.status, "live_opportunity_discovery_profile");
  assert.equal(opportunityProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(opportunityProfile.publicDiscovery.method, "GET");
  assert.equal(opportunityProfile.publicDiscovery.writes.length, 0);
  assert.equal(
    opportunityProfile.publicDiscovery.requiredResponseFields.includes(
      "requests[].agentActionAffordances"
    ),
    true,
  );
  assert.equal(opportunityProfile.opportunityCard.status, "derived_read_only");
  assert.equal(
    opportunityProfile.opportunityCard.examplesUrl.endsWith(
      "/agents/opportunity-cards.example.json"
    ),
    true,
  );
  assert.equal(
    opportunityProfile.fitScoring.dimensions.some(
      (dimension) => dimension.id === "authorization_fit"
    ),
    true,
  );
  assert.equal(
    opportunityProfile.nextActionSelection.some(
      (rule) =>
        rule.actionId === "apply_to_request" &&
        rule.canonicalWritesAfterAction.includes("Commitment")
    ),
    true,
  );
  assert.equal(
    opportunityProfile.canonicalBoundary.opportunityProfileIsNot.includes(
      "permission grant"
    ),
    true,
  );
  const opportunityCards = await readAgentOpportunityCardExamples();
  assert.equal(opportunityCards.status, "live_opportunity_card_examples");
  assert.equal(opportunityCards.canonicalBoundary.rootObject, "Request");
  assert.equal(
    opportunityCards.examples.some(
      (card: { id: string; recommendedNextAction: string }) =>
        card.id === "strong_fit_apply_card" &&
        card.recommendedNextAction === "apply_to_request"
    ),
    true,
  );
  assert.equal(
    opportunityCards.examples.some(
      (card: { fitBand: string; canonicalWritesIfActionTaken: string[] }) =>
        card.fitBand === "run_solution_candidate" &&
        card.canonicalWritesIfActionTaken.includes("Transaction")
    ),
    true,
  );
  assert.equal(
    opportunityCards.canonicalBoundary.opportunityCardsAreNot.includes(
      "permission grant"
    ),
    true,
  );

  const actionCards = await readAgentActionCardExamples();
  assert.equal(actionCards.status, "live_action_card_examples");
  assert.equal(actionCards.canonicalBoundary.rootObject, "Request");
  assert.equal(
    actionCards.examples.some(
      (card: {
        actionId: string;
        canonicalWritesIfActionTaken: string[];
        humanDecisionRequired: boolean;
      }) =>
        card.actionId === "apply_to_request" &&
        card.canonicalWritesIfActionTaken.includes("Commitment") &&
        card.humanDecisionRequired
    ),
    true,
  );
  assert.equal(
    actionCards.examples.some(
      (card: {
        actionId: string;
        canonicalWritesIfActionTaken: string[];
        safeRenderClaims: string[];
      }) =>
        card.actionId === "submit_artifact" &&
        card.canonicalWritesIfActionTaken.includes("Artifact") &&
        card.safeRenderClaims.includes("Proof submitted, waiting for review")
    ),
    true,
  );
  assert.equal(
    actionCards.examples.some(
      (card: { actionId: string; canonicalWritesIfActionTaken: string[] }) =>
        card.actionId === "optimize_request_brief" &&
        card.canonicalWritesIfActionTaken.length === 0
    ),
    true,
  );
  assert.equal(
    actionCards.examples.some(
      (card: { id: string; notAuthority: string[] }) =>
        card.id === "recover_blocked_action_card" &&
        card.notAuthority.includes("not duplicate-safe guarantee")
    ),
    true,
  );
  assert.equal(
    actionCards.canonicalBoundary.actionCardExamplesAreNot.includes(
      "human approval record"
    ),
    true,
  );
  assert.equal(
    actionCards.canonicalBoundary.actionCardExamplesAreNot.includes(
      "payment authorization"
    ),
    true,
  );
  assert.equal(
    actionCards.canonicalBoundary.actionCardExamplesAreNot.includes(
      "completion proof"
    ),
    true,
  );

  const optimizationProfile = buildAgentOptimizationProfile();
  assert.equal(optimizationProfile.status, "live_optimization_profile");
  assert.equal(optimizationProfile.canonicalBoundary.rootObject, "Request");
  assert.equal(optimizationProfile.outputContract.durableWriteDefault, false);
  assert.equal(
    optimizationProfile.resources.some((resource) =>
      resource.url.endsWith("/agents/optimization/prepare")
    ),
    true,
  );
  assert.equal(
    optimizationProfile.preparationEndpoint.path,
    "/agents/optimization/prepare",
  );
  assert.equal(
    optimizationProfile.preparationEndpoint.nonAuthority.includes(
      "durable mutation"
    ),
    true,
  );
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

  const optimizationPreparation = prepareAgentOptimizationPayload({
    schemaVersion: 1,
    preparationIntent: "optimize_without_writing",
    surfaceId: "request_brief_optimization",
    requestId: "req_public_design_001",
    requestedOutputMode: "suggested_patch",
    hasSourceContext: true,
    willInventMissingFacts: false,
    claimsDurableWrite: false,
    claimsOwnerApproval: false,
    claimsPolicyOverride: false,
    claimsPermissionGrant: false,
    claimsPaymentAuthority: false,
    claimsCompletion: false,
    containsSecrets: false,
    rawPromptTranscriptIncluded: false,
    rawRuntimeLogsIncluded: false,
  });
  assert.equal(optimizationPreparation.status, "optimization_plan_ready");
  assert.equal(optimizationPreparation.optimizationPlan.defaultMode, "draft_only");
  assert.equal(optimizationPreparation.optimizationPlan.canonicalWrites.length, 0);
  assert.equal(optimizationPreparation.durableWriteCreated, false);
  assert.equal(optimizationPreparation.requestMutated, false);
  assert.equal(optimizationPreparation.ownerApprovalRecorded, false);
  assert.equal(optimizationPreparation.completionProven, false);

  const blockedOptimizationPreparation = prepareAgentOptimizationPayload({
    schemaVersion: 1,
    preparationIntent: "optimize_without_writing",
    surfaceId: "unknown_surface",
    requestId: "",
    requestedOutputMode: "raw_mutation",
    hasSourceContext: false,
    willInventMissingFacts: true,
    claimsDurableWrite: true,
    claimsOwnerApproval: true,
    claimsPolicyOverride: true,
    claimsPermissionGrant: true,
    claimsPaymentAuthority: true,
    claimsCompletion: true,
    containsSecrets: true,
    rawPromptTranscriptIncluded: true,
    rawRuntimeLogsIncluded: true,
  });
  assert.equal(
    blockedOptimizationPreparation.status,
    "optimization_plan_blocked",
  );
  assert.equal(
    blockedOptimizationPreparation.missingFields.includes("surfaceId"),
    true,
  );
  assert.equal(
    blockedOptimizationPreparation.missingFields.includes("requestId"),
    true,
  );
  assert.equal(
    blockedOptimizationPreparation.missingFields.includes(
      "hasSourceContext=true"
    ),
    true,
  );
  assert.equal(
    blockedOptimizationPreparation.missingFields.includes(
      "willInventMissingFacts=false"
    ),
    true,
  );
  assert.equal(
    blockedOptimizationPreparation.missingFields.includes(
      "claimsDurableWrite=false"
    ),
    true,
  );
  assert.equal(
    blockedOptimizationPreparation.missingFields.includes(
      "requestedOutputMode"
    ),
    true,
  );
  assert.equal(blockedOptimizationPreparation.requestMutated, false);
  assert.equal(blockedOptimizationPreparation.ownerApprovalRecorded, false);
  assert.equal(blockedOptimizationPreparation.paymentAuthorized, false);
  assert.equal(blockedOptimizationPreparation.completionProven, false);

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
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.actions.preflight" &&
        tool.invocationKind === "validation" &&
        tool.status === "live_validation_only" &&
        tool.standardMappings.http.href.endsWith("/agents/actions/preflight") &&
        tool.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.completion.validate_claim" &&
        tool.invocationKind === "validation" &&
        tool.status === "live_validation_only" &&
        tool.standardMappings.http.href.endsWith("/agents/completion/validate") &&
        tool.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.monitoring.prepare_plan" &&
        tool.invocationKind === "preparation" &&
        tool.status === "live_preparation_only" &&
        tool.standardMappings.http.href.endsWith("/agents/monitoring/prepare") &&
        tool.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    toolRegistry.tools.some(
      (tool) =>
        tool.id === "boreal.optimization.prepare_brief" &&
        tool.invocationKind === "preparation" &&
        tool.status === "live_preparation_only" &&
        tool.standardMappings.http.href.endsWith("/agents/optimization/prepare") &&
        tool.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    toolRegistry.invocationRules.some((rule) =>
      rule.includes("Validation and preparation tools")
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
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/actions/preflight")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/auth/prepare")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/completion/validate")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/sandbox/replay")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/evidence/validate")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/monitoring/prepare")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/optimization/prepare")
    ),
    true,
  );
  assert.equal(
    sandboxManifest.flows.some(
      (flow) =>
        flow.id === "validate_completion_claim" &&
        flow.path === "/agents/completion/validate" &&
        flow.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    sandboxManifest.resources.some((resource) =>
      resource.url.endsWith("/agents/monitoring/validate")
    ),
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
  assert.match(startGuide, /POST \/agents\/auth\/prepare/);
  assert.match(startGuide, /GET \/agents\/conformance\.json/);
  assert.match(startGuide, /GET \/agents\/conformance-report\.example\.json/);
  assert.match(startGuide, /GET \/agents\/completion\.json/);
  assert.match(startGuide, /POST \/agents\/completion\/validate/);
  assert.match(startGuide, /GET \/agents\/delegation\.json/);
  assert.match(startGuide, /GET \/agents\/evidence\.json/);
  assert.match(startGuide, /POST \/agents\/evidence\/validate/);
  assert.match(startGuide, /GET \/agents\/error-examples\.json/);
  assert.match(startGuide, /GET \/agents\/execution\.json/);
  assert.match(startGuide, /GET \/agents\/human-handoffs\.json/);
  assert.match(startGuide, /GET \/agents\/human-handoff-packets\.example\.json/);
  assert.match(startGuide, /GET \/agents\/http\.json/);
  assert.match(startGuide, /GET \/agents\/ux\.json/);
  assert.match(startGuide, /GET \/agents\/action-cards\.example\.json/);
  assert.match(startGuide, /POST \/agents\/actions\/preflight/);
  assert.match(startGuide, /POST \/agents\/intake\/validate/);
  assert.match(startGuide, /GET \/agents\/monitoring\.json/);
  assert.match(startGuide, /POST \/agents\/monitoring\/validate/);
  assert.match(startGuide, /GET \/agents\/onboarding\.json/);
  assert.match(startGuide, /GET \/agents\/optimization\.json/);
  assert.match(startGuide, /POST \/agents\/optimization\/prepare/);
  assert.match(startGuide, /GET \/agents\/payments\.json/);
  assert.match(startGuide, /GET \/agents\/prompts\.json/);
  assert.match(startGuide, /GET \/agents\/workflows\.json/);
  assert.match(startGuide, /GET \/agents\/protocols\.json/);
  assert.match(startGuide, /GET \/agents\/protocol-adapter-samples\.json/);
  assert.match(startGuide, /GET \/agents\/recovery\.json/);
  assert.match(startGuide, /GET \/agents\/readiness\.json/);
  assert.match(startGuide, /GET \/agents\/tools\.json/);
  assert.match(startGuide, /POST \/agents\/access-review\/prepare/);
  assert.match(startGuide, /POST \/agents\/monitoring\/prepare/);
  assert.match(startGuide, /Agent action playbook/);
  assert.match(startGuide, /Agent action card examples/);
  assert.match(startGuide, /Agent access review profile/);
  assert.match(startGuide, /Agent access review preparation endpoint/);
  assert.match(startGuide, /Agent auth preparation endpoint/);
  assert.match(startGuide, /recommended auth scheme/);
  assert.match(startGuide, /Agent completion validation endpoint/);
  assert.match(startGuide, /completion-sensitive language/);
  assert.match(startGuide, /Agent conformance report example/);
  assert.match(startGuide, /Agent contract sandbox/);
  assert.match(startGuide, /Agent sandbox replay validation endpoint/);
  assert.match(startGuide, /Agent error examples/);
  assert.match(startGuide, /Agent human delegation profile/);
  assert.match(startGuide, /Agent evidence validation endpoint/);
  assert.match(startGuide, /Agent human handoff packet examples/);
  assert.match(startGuide, /Agent HTTP reference profile/);
  assert.match(startGuide, /Agent client kit/);
  assert.match(startGuide, /Agent UX profile/);
  assert.match(startGuide, /Agent journey profile/);
  assert.match(startGuide, /Agent action preflight endpoint/);
  assert.match(startGuide, /Agent intake validation endpoint/);
  assert.match(startGuide, /manual handoff packet/);
  assert.match(startGuide, /Agent monitoring preparation endpoint/);
  assert.match(startGuide, /cursor polling plan/);
  assert.match(startGuide, /Agent monitoring validation endpoint/);
  assert.match(startGuide, /Agent protocol adapter samples/);
  assert.match(startGuide, /Agent production access packet example/);
  assert.match(startGuide, /Agent standards profile/);
  assert.match(startGuide, /Agent opportunity card examples/);
  assert.match(startGuide, /Agent opportunity discovery profile/);
  assert.match(startGuide, /Agent optimization preparation endpoint/);
  assert.match(startGuide, /no-invention rules/);
  assert.match(startGuide, /owner-approval gate/);
  assert.match(startGuide, /Agent Workflow Catalog/);
  assert.match(startGuide, /Optimize this/);
  assert.match(startGuide, /`Request` is the durable root object/);
  assert.match(startGuide, /If the request requires physical presence/);
  assert.match(startGuide, /MCP server support, A2A task adapters/);
  assert.match(startGuide, /does not create a review submission/);
  assert.match(startGuide, /does not create a commitment/);
  assert.match(startGuide, /does not publish an `Artifact`/);
  assert.match(startGuide, /POST \/agents\/sandbox\/replay/);

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
    discoveryIndex["x-boreal-agent-action-cards"].status,
    "live_action_card_examples"
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-action-cards"].coveredActionIds.includes(
      "apply_to_request"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-action-cards"].nonAuthority.includes(
      "human approval record"
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
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/access-review/prepare"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/actions.md"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/action-cards.example.json"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.components.schemas, "AgentActionCardExamples"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/actions/preflight"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/client-kit.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/auth.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/auth/prepare"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/conformance.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/conformance-report.example.json"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/completion.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/delegation.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/evidence.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/evidence/validate"),
    true,
  );
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
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/http.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/ux.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/journeys.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/monitoring.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/monitoring/prepare"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/monitoring/validate"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/onboarding.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/opportunity-cards.example.json"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/opportunities.json"), true);
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/optimization.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/optimization/prepare"),
    true,
  );
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/payments.json"), true);
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/production-access-packet.example.json"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/intake/validate"),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentIntakeValidationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentAccessReviewPreparationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentAuthPreparationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/completion/validate"),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentCompletionValidationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentActionPreflightResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.components.schemas, "AgentClientKit"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.components.schemas, "AgentJourneyProfile"),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.components.schemas, "AgentStandardsProfile"),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentEvidenceValidationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentMonitoringValidationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentMonitoringPreparationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentOptimizationPreparationResult"
    ),
    true,
  );
  assert.equal(
    Object.hasOwn(discoveryIndex.paths, "/agents/sandbox/replay"),
    true,
  );
  assert.equal(
    Object.hasOwn(
      discoveryIndex.components.schemas,
      "AgentSandboxReplayValidationResult"
    ),
    true,
  );
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
  assert.equal(Object.hasOwn(discoveryIndex.paths, "/agents/standards.json"), true);
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
    discoveryIndex["x-boreal-agent-standards"].status,
    "live_standards_profile",
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-standards"].standards.some(
      (standard: { id: string; status: string }) =>
        standard.id === "x402" && standard.status === "target_payment_standard"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-standards"].resolutionOrder.includes(
      "load_contracts_before_clients"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-standards"].nonAuthority.includes(
      "credential issuer"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-action-preflight"].acceptedActionIds.includes(
      "submit_artifact"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-action-preflight"].nonAuthority.includes(
      "commitment proposal"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-client-kit"].status,
    "live_client_manifest",
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-client-kit"].generationOrder.includes(
      "split_client_authority"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-client-kit"].clientSurfaces.some(
      (surface: { id: string; canonicalWrites: string[] }) =>
        surface.id === "guardrail_client" &&
        surface.canonicalWrites.length === 0
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-client-kit"].nonGoals.includes(
      "generated SDK package"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-journeys"].status,
    "live_journey_profile",
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-journeys"].roles.some(
      (role: { id: string; canonicalWrites: string[] }) =>
        role.id === "requester_make_request" &&
        role.canonicalWrites.includes("Request")
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-journeys"].decisionRules.includes(
      "validation_is_not_authority"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-journeys"].nonAuthority.includes(
      "permission grant"
    ),
    true,
  );
  assert.equal(
    discoveryIndex[
      "x-boreal-agent-sandbox-replay-validation"
    ].acceptedScenarioIds.includes("solver_apply_submit_monitor_replay"),
    true,
  );
  assert.equal(
    discoveryIndex[
      "x-boreal-agent-sandbox-replay-validation"
    ].nonAuthority.includes("production credential"),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-evidence-validation"].acceptedClaimStates.includes(
      "proof_submitted"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-evidence-validation"].nonAuthority.includes(
      "artifact publication"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-monitoring-validation"].acceptedModes.includes(
      "poll_cursor"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-monitoring-validation"].nonAuthority.includes(
      "subscription record"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-monitoring"].preparationUrl.endsWith(
      "/agents/monitoring/prepare"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-monitoring-preparation"].status,
    "live_plan_preparation_only",
  );
  assert.equal(
    discoveryIndex[
      "x-boreal-agent-monitoring-preparation"
    ].nonAuthority.includes("request activity read"),
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
    discoveryIndex["x-boreal-agent-auth"].preparationUrl.endsWith(
      "/agents/auth/prepare"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-auth-preparation"].status,
    "live_plan_preparation_only",
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-auth-preparation"].nonAuthority.includes(
      "credential issuer"
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
    discoveryIndex["x-boreal-agent-access-review"].preparationUrl.endsWith(
      "/agents/access-review/prepare"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-access-review-preparation"].status,
    "live_handoff_preparation_only",
  );
  assert.equal(
    discoveryIndex[
      "x-boreal-agent-access-review-preparation"
    ].nonAuthority.includes("review submission"),
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
    discoveryIndex["x-boreal-agent-completion"].validationUrl.endsWith(
      "/agents/completion/validate"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-completion-validation"].status,
    "live_validation_only",
  );
  assert.equal(
    discoveryIndex[
      "x-boreal-agent-completion-validation"
    ].nonAuthority.includes("completion proof"),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-delegation"].liveModes.includes(
      "account_session_assisted"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-delegation"].consentFlowIds.includes(
      "delegate_paid_run"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-delegation"].revocationRoutes.includes(
      "/api/auth/resolver/token/revoke"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-http"].contractSources.some(
      (source: { id: string }) => source.id === "request_briefing"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-http"].routeFamilies.some(
      (family: { id: string }) => family.id === "request_work"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-http"].liveHttpToolIds.includes(
      "boreal.commitments.propose"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-ux"].processStages.some(
      (stage: { id: string }) => stage.id === "monitor_recover_and_escalate"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-ux"].interactionSurfaces.some(
      (surface: { id: string }) => surface.id === "consent_and_scope_sheet"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-ux"].nonAuthority.includes(
      "workflow engine"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-intake-validation"].status,
    "live_validation_only",
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-intake-validation"].acceptedKinds.includes(
      "production_access_packet"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-intake-validation"].nonAuthority.includes(
      "permission grant"
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
    discoveryIndex["x-boreal-agent-onboarding"].productionAccessPacketExampleUrl.endsWith(
      "/agents/production-access-packet.example.json"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-opportunities"].fitDimensions.includes(
      "authorization_fit"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-opportunities"].cardExamplesUrl.endsWith(
      "/agents/opportunity-cards.example.json"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-opportunities"].nextActions.includes(
      "apply_to_request"
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
    discoveryIndex["x-boreal-agent-optimization"].preparationUrl.endsWith(
      "/agents/optimization/prepare"
    ),
    true,
  );
  assert.equal(
    discoveryIndex["x-boreal-agent-optimization-preparation"].status,
    "live_plan_preparation_only",
  );
  assert.equal(
    discoveryIndex[
      "x-boreal-agent-optimization-preparation"
    ].nonAuthority.includes("optimization engine"),
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
    discoveryIndex["x-boreal-agent-tools"].tools.some(
      (tool) => tool.id === "boreal.completion.validate_claim"
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
    findJsonSchemaAsset("agent-access-review-preparation.schema.json")
      ?.sourcePath,
    "schemas/json/agent-access-review-preparation.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-sandbox.schema.json")?.sourcePath,
    "schemas/json/agent-sandbox.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-sandbox-replay.schema.json")?.sourcePath,
    "schemas/json/agent-sandbox-replay.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-auth.schema.json")?.sourcePath,
    "schemas/json/agent-auth.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-auth-preparation.schema.json")?.sourcePath,
    "schemas/json/agent-auth-preparation.schema.json",
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
    findJsonSchemaAsset("agent-production-access-packet.schema.json")?.sourcePath,
    "schemas/json/agent-production-access-packet.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-intake-validation.schema.json")?.sourcePath,
    "schemas/json/agent-intake-validation.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-action-preflight.schema.json")?.sourcePath,
    "schemas/json/agent-action-preflight.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-action-cards.schema.json")?.sourcePath,
    "schemas/json/agent-action-cards.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-client-kit.schema.json")?.sourcePath,
    "schemas/json/agent-client-kit.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-journeys.schema.json")?.sourcePath,
    "schemas/json/agent-journeys.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-standards.schema.json")?.sourcePath,
    "schemas/json/agent-standards.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-completion.schema.json")?.sourcePath,
    "schemas/json/agent-completion.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-completion-validation.schema.json")?.sourcePath,
    "schemas/json/agent-completion-validation.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-delegation.schema.json")?.sourcePath,
    "schemas/json/agent-delegation.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-evidence.schema.json")?.sourcePath,
    "schemas/json/agent-evidence.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-evidence-validation.schema.json")?.sourcePath,
    "schemas/json/agent-evidence-validation.schema.json",
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
    findJsonSchemaAsset("agent-http.schema.json")?.sourcePath,
    "schemas/json/agent-http.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-ux.schema.json")?.sourcePath,
    "schemas/json/agent-ux.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-monitoring.schema.json")?.sourcePath,
    "schemas/json/agent-monitoring.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-monitoring-preparation.schema.json")?.sourcePath,
    "schemas/json/agent-monitoring-preparation.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-monitoring-validation.schema.json")?.sourcePath,
    "schemas/json/agent-monitoring-validation.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-onboarding.schema.json")?.sourcePath,
    "schemas/json/agent-onboarding.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-opportunity-cards.schema.json")?.sourcePath,
    "schemas/json/agent-opportunity-cards.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-opportunities.schema.json")?.sourcePath,
    "schemas/json/agent-opportunities.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-optimization.schema.json")?.sourcePath,
    "schemas/json/agent-optimization.schema.json",
  );
  assert.equal(
    findJsonSchemaAsset("agent-optimization-preparation.schema.json")
      ?.sourcePath,
    "schemas/json/agent-optimization-preparation.schema.json",
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
  assert.match(requestOpenApi, /agentActionCardHints/);
  assert.match(requestOpenApi, /WebRequestAgentActionCardHintSet/);
  assert.match(requestOpenApi, /canonicalWritesIfAuthorized/);
  assert.match(requestOpenApi, /permissionGranted/);
  assert.match(requestOpenApi, /completionProven/);

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

  const agentClientKitResponse = await getAgentClientKit();
  assert.equal(agentClientKitResponse.status, 200);
  assert.equal(
    (await agentClientKitResponse.json()).status,
    "live_client_manifest"
  );

  const agentJourneysResponse = await getAgentJourneys();
  assert.equal(agentJourneysResponse.status, 200);
  assert.equal(
    (await agentJourneysResponse.json()).status,
    "live_journey_profile"
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

  const authPreparationResponse = await postAgentAuthPreparation(
    new Request("http://boreal.test/agents/auth/prepare", {
      body: JSON.stringify({
        schemaVersion: 1,
        preparationIntent: "agent_auth_route",
        actionId: "apply_to_request",
        requestedAuthScheme: "resolver_bearer",
        requestedScopes: ["commitments:propose"],
        hasHumanApproval: true,
        hasRequestPolicyCheck: true,
        hasIdempotencyKey: true,
        notCredentialRequest: true,
        noSecretsIncluded: true,
        claimsCredentialIssued: false,
        claimsPermissionGranted: false,
        claimsProductionAccess: false,
        claimsPaymentAuthority: false,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(authPreparationResponse.status, 200);
  const authPreparationRouteResult = await authPreparationResponse.json();
  assert.equal(authPreparationRouteResult.status, "auth_plan_ready");
  assert.equal(authPreparationRouteResult.credentialIssued, false);
  assert.equal(authPreparationRouteResult.permissionGranted, false);
  assert.equal(
    authPreparationRouteResult.authPlan.recommendedAuthScheme,
    "resolver_bearer",
  );

  const failedAuthPreparationResponse = await postAgentAuthPreparation(
    new Request("http://boreal.test/agents/auth/prepare", {
      body: JSON.stringify({
        schemaVersion: 1,
        preparationIntent: "agent_auth_route",
        actionId: "apply_to_request",
        requestedAuthScheme: "external_oauth2",
        requestedScopes: [],
        hasHumanApproval: false,
        hasRequestPolicyCheck: false,
        hasIdempotencyKey: false,
        notCredentialRequest: false,
        noSecretsIncluded: false,
        claimsCredentialIssued: true,
        claimsPermissionGranted: true,
        claimsProductionAccess: true,
        claimsPaymentAuthority: true,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(failedAuthPreparationResponse.status, 400);
  const failedAuthPreparationRouteResult =
    await failedAuthPreparationResponse.json();
  assert.equal(
    failedAuthPreparationRouteResult.status,
    "auth_plan_blocked",
  );
  assert.equal(failedAuthPreparationRouteResult.credentialIssued, false);
  assert.equal(failedAuthPreparationRouteResult.permissionGranted, false);

  const malformedAuthPreparationResponse = await postAgentAuthPreparation(
    new Request("http://boreal.test/agents/auth/prepare", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(malformedAuthPreparationResponse.status, 400);
  assert.equal(
    (await malformedAuthPreparationResponse.json()).productionAccessGranted,
    false,
  );

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

  const agentProductionAccessPacketExampleResponse =
    await getAgentProductionAccessPacketExample();
  assert.equal(agentProductionAccessPacketExampleResponse.status, 200);
  const agentProductionAccessPacketExample =
    await agentProductionAccessPacketExampleResponse.json();
  assert.equal(
    agentProductionAccessPacketExample.packetKind,
    "agent_production_access_packet"
  );
  assert.equal(
    agentProductionAccessPacketExample.status,
    "target_operator_review_packet_example"
  );

  const agentCompletionResponse = await getAgentCompletion();
  assert.equal(agentCompletionResponse.status, 200);
  assert.equal(
    (await agentCompletionResponse.json()).status,
    "live_completion_profile"
  );

  const completionValidationResponse = await postAgentCompletionValidation(
    new Request("http://boreal.test/agents/completion/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        claim: {
          requestId: "req_public_design_001",
          claimState: "proof_submitted",
          summary: "Proof was submitted for owner review.",
          evidenceSummary:
            "Artifact art_123 is attached to the accepted fulfillment lane.",
          reviewStatus: "owner_review_required",
          artifactId: "art_123",
          hasRequestLifecycleTruth: false,
          hasCommitmentTruth: false,
          hasFulfillmentTruth: false,
          hasArtifactTruth: true,
          hasReviewTruth: false,
          hasTransactionTruth: false,
          hasRequestEventTruth: false,
          containsSecrets: false,
          rawPromptTranscriptIncluded: false,
          rawRuntimeLogsIncluded: false,
          paymentOnlyProof: false,
          claimsFromToolSuccess: false,
          claimsFromProviderCallback: false,
          claimsFromRuntimeLogs: false,
          claimsFromA2ATask: false,
          claimsFromMcpTool: false,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(completionValidationResponse.status, 200);
  const completionValidationRouteResult =
    await completionValidationResponse.json();
  assert.equal(completionValidationRouteResult.status, "validation_passed");
  assert.equal(completionValidationRouteResult.completionProven, false);
  assert.equal(completionValidationRouteResult.artifactPublished, false);
  assert.equal(completionValidationRouteResult.requestEventWritten, false);

  const failedCompletionValidationResponse =
    await postAgentCompletionValidation(
      new Request("http://boreal.test/agents/completion/validate", {
        body: JSON.stringify({
          schemaVersion: 1,
          claim: {
            requestId: "req_public_design_001",
            claimState: "completed",
            summary: "The work is complete.",
            evidenceSummary: "The tool finished.",
            reviewStatus: "not_reviewed",
            hasRequestLifecycleTruth: false,
            hasCommitmentTruth: false,
            hasFulfillmentTruth: false,
            hasArtifactTruth: false,
            hasReviewTruth: false,
            hasTransactionTruth: false,
            hasRequestEventTruth: false,
            containsSecrets: true,
            rawPromptTranscriptIncluded: true,
            rawRuntimeLogsIncluded: true,
            paymentOnlyProof: true,
            claimsFromToolSuccess: true,
            claimsFromProviderCallback: true,
            claimsFromRuntimeLogs: true,
            claimsFromA2ATask: true,
            claimsFromMcpTool: true,
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(failedCompletionValidationResponse.status, 400);
  const failedCompletionValidationRouteResult =
    await failedCompletionValidationResponse.json();
  assert.equal(
    failedCompletionValidationRouteResult.status,
    "validation_failed",
  );
  assert.equal(failedCompletionValidationRouteResult.completionProven, false);
  assert.equal(failedCompletionValidationRouteResult.reviewAccepted, false);
  assert.equal(failedCompletionValidationRouteResult.durableWriteCreated, false);

  const malformedCompletionValidationResponse =
    await postAgentCompletionValidation(
      new Request("http://boreal.test/agents/completion/validate", {
        body: "{",
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(malformedCompletionValidationResponse.status, 400);
  assert.equal(
    (await malformedCompletionValidationResponse.json()).completionProven,
    false,
  );

  const agentDelegationResponse = await getAgentDelegation();
  assert.equal(agentDelegationResponse.status, 200);
  assert.equal(
    (await agentDelegationResponse.json()).status,
    "live_human_delegation_profile"
  );

  const agentHttpResponse = await getAgentHttp();
  assert.equal(agentHttpResponse.status, 200);
  assert.equal(
    (await agentHttpResponse.json()).status,
    "live_http_reference_profile"
  );

  const agentUxResponse = await getAgentUx();
  assert.equal(agentUxResponse.status, 200);
  assert.equal(
    (await agentUxResponse.json()).status,
    "live_agent_ux_profile"
  );

  const intakeValidationResponse = await postAgentIntakeValidation(
    new Request("http://boreal.test/agents/intake/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        intakeKind: "production_access_packet",
        payload: productionAccessPacket,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(intakeValidationResponse.status, 200);
  const intakeValidation = await intakeValidationResponse.json();
  assert.equal(intakeValidation.status, "validation_passed");
  assert.equal(intakeValidation.acceptedByProduction, false);
  assert.equal(intakeValidation.reviewSubmissionCreated, false);
  assert.equal(intakeValidation.credentialsIssued, false);

  const failedIntakeValidationResponse = await postAgentIntakeValidation(
    new Request("http://boreal.test/agents/intake/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        intakeKind: "conformance_report",
        payload: {},
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(failedIntakeValidationResponse.status, 400);
  const failedIntakeValidation = await failedIntakeValidationResponse.json();
  assert.equal(failedIntakeValidation.status, "validation_failed");
  assert.equal(failedIntakeValidation.paymentAuthorized, false);

  const malformedIntakeValidationResponse = await postAgentIntakeValidation(
    new Request("http://boreal.test/agents/intake/validate", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(malformedIntakeValidationResponse.status, 400);
  assert.equal(
    (await malformedIntakeValidationResponse.json()).credentialsIssued,
    false,
  );

  const accessReviewPreparationResponse = await postAgentAccessReviewPreparation(
    new Request("http://boreal.test/agents/access-review/prepare", {
      body: JSON.stringify({
        schemaVersion: 1,
        submissionIntent: "production_access_review",
        submissionMode: "manual_operator_review_handoff",
        operatorReviewRequired: true,
        notCredentialRequest: true,
        noSecretsIncluded: true,
        claimsProductionAccess: false,
        claimsProductionSandbox: false,
        productionAccessPacket,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(accessReviewPreparationResponse.status, 200);
  const accessReviewPreparationRouteResult =
    await accessReviewPreparationResponse.json();
  assert.equal(
    accessReviewPreparationRouteResult.status,
    "handoff_packet_ready",
  );
  assert.equal(
    accessReviewPreparationRouteResult.reviewSubmissionCreated,
    false,
  );
  assert.equal(accessReviewPreparationRouteResult.credentialsIssued, false);

  const failedAccessReviewPreparationResponse =
    await postAgentAccessReviewPreparation(
      new Request("http://boreal.test/agents/access-review/prepare", {
        body: JSON.stringify({
          schemaVersion: 1,
          submissionIntent: "production_access_review",
          submissionMode: "manual_operator_review_handoff",
          operatorReviewRequired: true,
          notCredentialRequest: false,
          noSecretsIncluded: false,
          claimsProductionAccess: true,
          claimsProductionSandbox: true,
          productionAccessPacket: {},
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(failedAccessReviewPreparationResponse.status, 400);
  const failedAccessReviewPreparationRouteResult =
    await failedAccessReviewPreparationResponse.json();
  assert.equal(
    failedAccessReviewPreparationRouteResult.status,
    "handoff_blocked",
  );
  assert.equal(failedAccessReviewPreparationRouteResult.permissionGranted, false);

  const malformedAccessReviewPreparationResponse =
    await postAgentAccessReviewPreparation(
      new Request("http://boreal.test/agents/access-review/prepare", {
        body: "{",
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(malformedAccessReviewPreparationResponse.status, 400);
  assert.equal(
    (await malformedAccessReviewPreparationResponse.json()).credentialsIssued,
    false,
  );

  const actionPreflightResponse = await postAgentActionPreflight(
    new Request("http://boreal.test/agents/actions/preflight", {
      body: JSON.stringify({
        schemaVersion: 1,
        actionId: "apply_to_request",
        requestId: "req_public_design_001",
        representedActor: {
          kind: "resolver_agent",
          reference: "agent:portfolio-builder",
        },
        hasHumanApproval: true,
        hasIdempotencyKey: true,
        requestedScopes: ["commitments:propose"],
        payloadSummary: "Commitment proposal for one public request.",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(actionPreflightResponse.status, 200);
  const actionPreflight = await actionPreflightResponse.json();
  assert.equal(actionPreflight.status, "preflight_passed");
  assert.equal(actionPreflight.permissionGranted, false);
  assert.equal(actionPreflight.approvalRecorded, false);
  assert.equal(actionPreflight.durableWriteCreated, false);

  const failedActionPreflightResponse = await postAgentActionPreflight(
    new Request("http://boreal.test/agents/actions/preflight", {
      body: JSON.stringify({
        schemaVersion: 1,
        actionId: "submit_artifact",
        requestId: "req_public_design_001",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(failedActionPreflightResponse.status, 400);
  const failedActionPreflight = await failedActionPreflightResponse.json();
  assert.equal(failedActionPreflight.status, "preflight_failed");
  assert.equal(
    failedActionPreflight.missingRequirements.includes(
      "requestedScopes includes artifacts:publish"
    ),
    true,
  );
  assert.equal(failedActionPreflight.paymentAuthorized, false);

  const malformedActionPreflightResponse = await postAgentActionPreflight(
    new Request("http://boreal.test/agents/actions/preflight", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(malformedActionPreflightResponse.status, 400);
  assert.equal(
    (await malformedActionPreflightResponse.json()).completionProven,
    false,
  );

  const sandboxReplayValidationResponse = await postAgentSandboxReplayValidation(
    new Request("http://boreal.test/agents/sandbox/replay", {
      body: JSON.stringify(validSandboxReplayPayload),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(sandboxReplayValidationResponse.status, 200);
  const sandboxReplayValidation = await sandboxReplayValidationResponse.json();
  assert.equal(sandboxReplayValidation.status, "validation_passed");
  assert.equal(sandboxReplayValidation.acceptedByProduction, false);
  assert.equal(sandboxReplayValidation.reviewSubmissionCreated, false);
  assert.equal(sandboxReplayValidation.credentialsIssued, false);
  assert.equal(sandboxReplayValidation.durableWriteCreated, false);

  const failedSandboxReplayValidationResponse =
    await postAgentSandboxReplayValidation(
      new Request("http://boreal.test/agents/sandbox/replay", {
        body: JSON.stringify({
          ...validSandboxReplayPayload,
          replay: {
            ...validSandboxReplayPayload.replay,
            productionEffects: true,
            claimsCompletion: true,
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(failedSandboxReplayValidationResponse.status, 400);
  const failedSandboxReplayValidationRouteResult =
    await failedSandboxReplayValidationResponse.json();
  assert.equal(
    failedSandboxReplayValidationRouteResult.status,
    "validation_failed"
  );
  assert.equal(failedSandboxReplayValidationRouteResult.completionProven, false);

  const malformedSandboxReplayValidationResponse =
    await postAgentSandboxReplayValidation(
      new Request("http://boreal.test/agents/sandbox/replay", {
        body: "{",
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(malformedSandboxReplayValidationResponse.status, 400);
  assert.equal(
    (await malformedSandboxReplayValidationResponse.json()).permissionGranted,
    false,
  );

  const evidenceValidationResponse = await postAgentEvidenceValidation(
    new Request("http://boreal.test/agents/evidence/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        packet: {
          requestId: "req_public_design_001",
          artifactKind: "delivery",
          claimState: "delivery_candidate",
          title: "Delivery packet",
          summary: "Reviewable delivery and verification summary.",
          externalReference: "https://example.com/delivery",
          fulfillmentId: "fulfillment_001",
          evidenceClaims: ["deliverable attached", "review steps included"],
          redactionStatement: "No secrets or raw runtime logs included.",
          reviewRequest: "Review this delivery candidate.",
          hasIdempotencyKey: true,
          containsSecrets: false,
          rawRuntimeLogsIncluded: false,
          rawPromptTranscriptIncluded: false,
          paymentOnlyProof: false,
          claimsCompletion: false,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(evidenceValidationResponse.status, 200);
  const evidenceValidation = await evidenceValidationResponse.json();
  assert.equal(evidenceValidation.status, "validation_passed");
  assert.equal(evidenceValidation.artifactPublished, false);
  assert.equal(evidenceValidation.reviewAccepted, false);
  assert.equal(evidenceValidation.durableWriteCreated, false);

  const failedEvidenceValidationResponse = await postAgentEvidenceValidation(
    new Request("http://boreal.test/agents/evidence/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        packet: {
          requestId: "req_public_design_001",
          artifactKind: "receipt",
          claimState: "completed",
          title: "Payment receipt",
          summary: "Payment succeeded.",
          content: "Payment only.",
          evidenceClaims: [],
          redactionStatement: "No redaction.",
          reviewRequest: "Mark complete.",
          hasIdempotencyKey: false,
          containsSecrets: true,
          rawRuntimeLogsIncluded: true,
          rawPromptTranscriptIncluded: true,
          paymentOnlyProof: true,
          claimsCompletion: true,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(failedEvidenceValidationResponse.status, 400);
  const failedEvidenceValidationRouteResult =
    await failedEvidenceValidationResponse.json();
  assert.equal(failedEvidenceValidationRouteResult.status, "validation_failed");
  assert.equal(
    failedEvidenceValidationRouteResult.missingFields.includes(
      "paymentOnlyProof=false"
    ),
    true,
  );
  assert.equal(failedEvidenceValidationRouteResult.completionProven, false);

  const malformedEvidenceValidationResponse = await postAgentEvidenceValidation(
    new Request("http://boreal.test/agents/evidence/validate", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(malformedEvidenceValidationResponse.status, 400);
  assert.equal(
    (await malformedEvidenceValidationResponse.json()).artifactPublished,
    false,
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

  const monitorValidationResponse = await postAgentMonitoringValidation(
    new Request("http://boreal.test/agents/monitoring/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        monitor: {
          mode: "poll_cursor",
          requestId: "req_public_design_001",
          visibility: "public",
          hasRequestAccess: true,
          requestedScopes: [],
          cursor: {
            afterSequence: 0,
          },
          poll: {
            intervalSeconds: 60,
            limit: 40,
          },
          escalationTriggers: ["owner_review_needed", "stale_activity"],
          storesCursor: true,
          createsHeartbeatEvents: false,
          claimsCompletion: false,
          includesPrivatePayloads: false,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(monitorValidationResponse.status, 200);
  const monitorValidation = await monitorValidationResponse.json();
  assert.equal(monitorValidation.status, "validation_passed");
  assert.equal(monitorValidation.pollingReady, true);
  assert.equal(monitorValidation.subscriptionPersisted, false);
  assert.equal(monitorValidation.requestEventWritten, false);

  const failedMonitorValidationResponse = await postAgentMonitoringValidation(
    new Request("http://boreal.test/agents/monitoring/validate", {
      body: JSON.stringify({
        schemaVersion: 1,
        monitor: {
          mode: "signed_webhook_target",
          requestId: "req_private_design_001",
          visibility: "private",
          requestedScopes: [],
          webhook: {
            callbackUrl: "https://agent.example/boreal/request-activity",
            signatureVersion: "v0",
            timestampToleranceSeconds: 999,
            canVerifySignature: false,
          },
          escalationTriggers: ["owner_review_needed"],
          storesCursor: true,
          createsHeartbeatEvents: true,
          claimsCompletion: false,
          includesPrivatePayloads: false,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(failedMonitorValidationResponse.status, 400);
  const failedMonitorValidationRouteResult =
    await failedMonitorValidationResponse.json();
  assert.equal(failedMonitorValidationRouteResult.status, "validation_failed");
  assert.equal(
    failedMonitorValidationRouteResult.missingFields.includes(
      "webhook.canVerifySignature=true"
    ),
    true,
  );
  assert.equal(
    failedMonitorValidationRouteResult.missingFields.includes(
      "createsHeartbeatEvents=false"
    ),
    true,
  );
  assert.equal(failedMonitorValidationRouteResult.pushDeliveryActivated, false);

  const malformedMonitorValidationResponse = await postAgentMonitoringValidation(
    new Request("http://boreal.test/agents/monitoring/validate", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(malformedMonitorValidationResponse.status, 400);
  assert.equal(
    (await malformedMonitorValidationResponse.json()).permissionGranted,
    false,
  );

  const monitorPreparationResponse = await postAgentMonitoringPreparation(
    new Request("http://boreal.test/agents/monitoring/prepare", {
      body: JSON.stringify({
        schemaVersion: 1,
        preparationIntent: "monitor_request",
        preparationMode: "monitor_execution_plan",
        claimsActivityRead: false,
        createsSubscription: false,
        activatesPushDelivery: false,
        createsHeartbeatEvents: false,
        claimsCompletion: false,
        claimsDurableWrite: false,
        monitor: {
          mode: "poll_cursor",
          requestId: "req_public_design_001",
          visibility: "public",
          hasRequestAccess: true,
          requestedScopes: [],
          cursor: {
            afterSequence: 0,
          },
          poll: {
            intervalSeconds: 60,
            limit: 40,
          },
          escalationTriggers: ["owner_review_needed", "stale_activity"],
          storesCursor: true,
          createsHeartbeatEvents: false,
          claimsCompletion: false,
          includesPrivatePayloads: false,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(monitorPreparationResponse.status, 200);
  const monitorPreparationRouteResult =
    await monitorPreparationResponse.json();
  assert.equal(monitorPreparationRouteResult.status, "monitor_plan_ready");
  assert.equal(monitorPreparationRouteResult.activityReadCreated, false);
  assert.equal(monitorPreparationRouteResult.subscriptionPersisted, false);
  assert.equal(monitorPreparationRouteResult.pushDeliveryActivated, false);
  assert.equal(
    monitorPreparationRouteResult.cursorPollPlan.cursorToPersist,
    "cursor.nextAfterSequence",
  );

  const failedMonitorPreparationResponse = await postAgentMonitoringPreparation(
    new Request("http://boreal.test/agents/monitoring/prepare", {
      body: JSON.stringify({
        schemaVersion: 1,
        preparationIntent: "monitor_request",
        preparationMode: "monitor_execution_plan",
        claimsActivityRead: true,
        createsSubscription: true,
        activatesPushDelivery: true,
        createsHeartbeatEvents: true,
        claimsCompletion: true,
        claimsDurableWrite: true,
        monitor: {
          mode: "poll_cursor",
          requestId: "req_private_design_001",
          visibility: "private",
          requestedScopes: [],
          cursor: {},
          escalationTriggers: ["unknown_trigger"],
          storesCursor: false,
          createsHeartbeatEvents: true,
          claimsCompletion: true,
          includesPrivatePayloads: true,
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  assert.equal(failedMonitorPreparationResponse.status, 400);
  const failedMonitorPreparationRouteResult =
    await failedMonitorPreparationResponse.json();
  assert.equal(
    failedMonitorPreparationRouteResult.status,
    "monitor_plan_blocked",
  );
  assert.equal(failedMonitorPreparationRouteResult.permissionGranted, false);
  assert.equal(failedMonitorPreparationRouteResult.requestEventWritten, false);

  const malformedMonitorPreparationResponse =
    await postAgentMonitoringPreparation(
      new Request("http://boreal.test/agents/monitoring/prepare", {
        body: "{",
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(malformedMonitorPreparationResponse.status, 400);
  assert.equal(
    (await malformedMonitorPreparationResponse.json()).subscriptionPersisted,
    false,
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

  const agentActionCardExamplesResponse = await getAgentActionCardExamples();
  assert.equal(agentActionCardExamplesResponse.status, 200);
  assert.equal(
    (await agentActionCardExamplesResponse.json()).status,
    "live_action_card_examples"
  );

  const agentOpportunityCardExamplesResponse =
    await getAgentOpportunityCardExamples();
  assert.equal(agentOpportunityCardExamplesResponse.status, 200);
  assert.equal(
    (await agentOpportunityCardExamplesResponse.json()).status,
    "live_opportunity_card_examples"
  );

  const agentOpportunitiesResponse = await getAgentOpportunities();
  assert.equal(agentOpportunitiesResponse.status, 200);
  assert.equal(
    (await agentOpportunitiesResponse.json()).status,
    "live_opportunity_discovery_profile"
  );

  const agentOptimizationResponse = await getAgentOptimization();
  assert.equal(agentOptimizationResponse.status, 200);
  assert.equal(
    (await agentOptimizationResponse.json()).status,
    "live_optimization_profile"
  );

  const agentOptimizationPreparationResponse =
    await postAgentOptimizationPreparation(
      new Request("http://boreal.test/agents/optimization/prepare", {
        body: JSON.stringify({
          schemaVersion: 1,
          preparationIntent: "optimize_without_writing",
          surfaceId: "request_brief_optimization",
          requestId: "req_public_design_001",
          requestedOutputMode: "suggested_patch",
          hasSourceContext: true,
          willInventMissingFacts: false,
          claimsDurableWrite: false,
          claimsOwnerApproval: false,
          claimsPolicyOverride: false,
          claimsPermissionGrant: false,
          claimsPaymentAuthority: false,
          claimsCompletion: false,
          containsSecrets: false,
          rawPromptTranscriptIncluded: false,
          rawRuntimeLogsIncluded: false,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(agentOptimizationPreparationResponse.status, 200);
  const agentOptimizationPreparationRouteResult =
    await agentOptimizationPreparationResponse.json();
  assert.equal(
    agentOptimizationPreparationRouteResult.status,
    "optimization_plan_ready",
  );
  assert.equal(
    agentOptimizationPreparationRouteResult.optimizationPlan.defaultMode,
    "draft_only",
  );
  assert.equal(agentOptimizationPreparationRouteResult.requestMutated, false);
  assert.equal(
    agentOptimizationPreparationRouteResult.ownerApprovalRecorded,
    false,
  );
  assert.equal(agentOptimizationPreparationRouteResult.paymentAuthorized, false);
  assert.equal(agentOptimizationPreparationRouteResult.completionProven, false);

  const failedAgentOptimizationPreparationResponse =
    await postAgentOptimizationPreparation(
      new Request("http://boreal.test/agents/optimization/prepare", {
        body: JSON.stringify({
          schemaVersion: 1,
          preparationIntent: "optimize_without_writing",
          surfaceId: "unknown_surface",
          requestId: "",
          requestedOutputMode: "raw_mutation",
          hasSourceContext: false,
          willInventMissingFacts: true,
          claimsDurableWrite: true,
          claimsOwnerApproval: true,
          claimsPolicyOverride: true,
          claimsPermissionGrant: true,
          claimsPaymentAuthority: true,
          claimsCompletion: true,
          containsSecrets: true,
          rawPromptTranscriptIncluded: true,
          rawRuntimeLogsIncluded: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(failedAgentOptimizationPreparationResponse.status, 400);
  const failedAgentOptimizationPreparationRouteResult =
    await failedAgentOptimizationPreparationResponse.json();
  assert.equal(
    failedAgentOptimizationPreparationRouteResult.status,
    "optimization_plan_blocked",
  );
  assert.equal(failedAgentOptimizationPreparationRouteResult.requestMutated, false);
  assert.equal(
    failedAgentOptimizationPreparationRouteResult.ownerApprovalRecorded,
    false,
  );
  assert.equal(
    failedAgentOptimizationPreparationRouteResult.paymentAuthorized,
    false,
  );
  assert.equal(
    failedAgentOptimizationPreparationRouteResult.completionProven,
    false,
  );

  const malformedAgentOptimizationPreparationResponse =
    await postAgentOptimizationPreparation(
      new Request("http://boreal.test/agents/optimization/prepare", {
        body: "{",
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  assert.equal(malformedAgentOptimizationPreparationResponse.status, 400);
  assert.equal(
    (await malformedAgentOptimizationPreparationResponse.json())
      .durableWriteCreated,
    false,
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

  const agentStandardsResponse = await getAgentStandards();
  assert.equal(agentStandardsResponse.status, 200);
  assert.equal(
    (await agentStandardsResponse.json()).status,
    "live_standards_profile"
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
  assert.match(llmsText, /Agent access review preparation endpoint/);
  assert.match(llmsText, /Agent action playbook/);
  assert.match(llmsText, /Agent action card examples/);
  assert.match(llmsText, /Agent action preflight endpoint/);
  assert.match(llmsText, /Agent client kit/);
  assert.match(llmsText, /Agent auth profile/);
  assert.match(llmsText, /Agent auth preparation endpoint/);
  assert.match(llmsText, /Agent conformance profile/);
  assert.match(llmsText, /Agent conformance report schema/);
  assert.match(llmsText, /Agent conformance report example/);
  assert.match(llmsText, /Agent completion profile/);
  assert.match(llmsText, /Agent completion validation endpoint/);
  assert.match(llmsText, /Agent human delegation profile/);
  assert.match(llmsText, /Agent evidence profile/);
  assert.match(llmsText, /Agent evidence validation endpoint/);
  assert.match(llmsText, /Agent error examples/);
  assert.match(llmsText, /Agent execution profile/);
  assert.match(llmsText, /Agent human handoff profile/);
  assert.match(llmsText, /Agent human handoff packet examples/);
  assert.match(llmsText, /Agent HTTP reference profile/);
  assert.match(llmsText, /Agent UX profile/);
  assert.match(llmsText, /Agent journey profile/);
  assert.match(llmsText, /Agent intake validation endpoint/);
  assert.match(llmsText, /Agent monitoring profile/);
  assert.match(llmsText, /Agent monitoring preparation endpoint/);
  assert.match(llmsText, /Agent monitoring validation endpoint/);
  assert.match(llmsText, /Agent onboarding profile/);
  assert.match(llmsText, /Agent opportunity card examples/);
  assert.match(llmsText, /Agent opportunity discovery profile/);
  assert.match(llmsText, /Agent optimization profile/);
  assert.match(llmsText, /Agent optimization preparation endpoint/);
  assert.match(llmsText, /Agent payment profile/);
  assert.match(llmsText, /Agent production access packet example/);
  assert.match(llmsText, /Agent prompt catalog/);
  assert.match(llmsText, /Agent protocol profile JSON/);
  assert.match(llmsText, /Agent protocol adapter samples/);
  assert.match(llmsText, /Agent standards profile/);
  assert.match(llmsText, /Agent recovery profile/);
  assert.match(llmsText, /Agent readiness profile/);
  assert.match(llmsText, /Agent tool registry/);
  assert.match(llmsText, /Agent contract sandbox/);
  assert.match(llmsText, /Agent sandbox replay validation endpoint/);

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

  const accessReviewPreparationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-access-review-preparation.schema.json",
      }),
    }
  );
  assert.equal(accessReviewPreparationSchemaResponse.status, 200);
  assert.equal(
    (await accessReviewPreparationSchemaResponse.json()).title,
    "AgentAccessReviewPreparation",
  );

  const sandboxSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-sandbox.schema.json" }),
  });
  assert.equal(sandboxSchemaResponse.status, 200);
  assert.equal((await sandboxSchemaResponse.json()).title, "AgentSandbox");

  const sandboxReplaySchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({ schema: "agent-sandbox-replay.schema.json" }),
    }
  );
  assert.equal(sandboxReplaySchemaResponse.status, 200);
  assert.equal(
    (await sandboxReplaySchemaResponse.json()).title,
    "AgentSandboxReplayValidation"
  );

  const authSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-auth.schema.json" }),
  });
  assert.equal(authSchemaResponse.status, 200);
  assert.equal((await authSchemaResponse.json()).title, "AgentAuthProfile");

  const authPreparationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({ schema: "agent-auth-preparation.schema.json" }),
    }
  );
  assert.equal(authPreparationSchemaResponse.status, 200);
  assert.equal(
    (await authPreparationSchemaResponse.json()).title,
    "AgentAuthPreparation",
  );

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

  const productionAccessPacketSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-production-access-packet.schema.json",
      }),
    }
  );
  assert.equal(productionAccessPacketSchemaResponse.status, 200);
  assert.equal(
    (await productionAccessPacketSchemaResponse.json()).title,
    "AgentProductionAccessPacketExample"
  );

  const intakeValidationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-intake-validation.schema.json",
      }),
    }
  );
  assert.equal(intakeValidationSchemaResponse.status, 200);
  assert.equal(
    (await intakeValidationSchemaResponse.json()).title,
    "AgentIntakeValidation"
  );

  const actionPreflightSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-action-preflight.schema.json",
      }),
    }
  );
  assert.equal(actionPreflightSchemaResponse.status, 200);
  assert.equal(
    (await actionPreflightSchemaResponse.json()).title,
    "AgentActionPreflight"
  );

  const actionCardsSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-action-cards.schema.json",
      }),
    }
  );
  assert.equal(actionCardsSchemaResponse.status, 200);
  assert.equal(
    (await actionCardsSchemaResponse.json()).title,
    "AgentActionCardExamples"
  );

  const clientKitSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-client-kit.schema.json",
      }),
    }
  );
  assert.equal(clientKitSchemaResponse.status, 200);
  assert.equal(
    (await clientKitSchemaResponse.json()).title,
    "AgentClientKit"
  );

  const completionSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-completion.schema.json" }),
  });
  assert.equal(completionSchemaResponse.status, 200);
  assert.equal(
    (await completionSchemaResponse.json()).title,
    "AgentCompletionProfile"
  );

  const completionValidationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-completion-validation.schema.json",
      }),
    }
  );
  assert.equal(completionValidationSchemaResponse.status, 200);
  assert.equal(
    (await completionValidationSchemaResponse.json()).title,
    "AgentCompletionValidation",
  );

  const delegationSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-delegation.schema.json" }),
  });
  assert.equal(delegationSchemaResponse.status, 200);
  assert.equal(
    (await delegationSchemaResponse.json()).title,
    "AgentDelegationProfile"
  );

  const httpSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-http.schema.json" }),
  });
  assert.equal(httpSchemaResponse.status, 200);
  assert.equal((await httpSchemaResponse.json()).title, "AgentHttpProfile");

  const uxSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-ux.schema.json" }),
  });
  assert.equal(uxSchemaResponse.status, 200);
  assert.equal((await uxSchemaResponse.json()).title, "AgentUxProfile");

  const journeySchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-journeys.schema.json" }),
  });
  assert.equal(journeySchemaResponse.status, 200);
  assert.equal((await journeySchemaResponse.json()).title, "AgentJourneyProfile");

  const standardsSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({ schema: "agent-standards.schema.json" }),
    }
  );
  assert.equal(standardsSchemaResponse.status, 200);
  assert.equal(
    (await standardsSchemaResponse.json()).title,
    "AgentStandardsProfile"
  );

  const evidenceSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-evidence.schema.json" }),
  });
  assert.equal(evidenceSchemaResponse.status, 200);
  assert.equal(
    (await evidenceSchemaResponse.json()).title,
    "AgentEvidenceProfile"
  );

  const evidenceValidationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-evidence-validation.schema.json",
      }),
    }
  );
  assert.equal(evidenceValidationSchemaResponse.status, 200);
  assert.equal(
    (await evidenceValidationSchemaResponse.json()).title,
    "AgentEvidenceValidation"
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

  const monitoringPreparationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-monitoring-preparation.schema.json",
      }),
    }
  );
  assert.equal(monitoringPreparationSchemaResponse.status, 200);
  assert.equal(
    (await monitoringPreparationSchemaResponse.json()).title,
    "AgentMonitoringPreparation",
  );

  const monitoringValidationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-monitoring-validation.schema.json",
      }),
    }
  );
  assert.equal(monitoringValidationSchemaResponse.status, 200);
  assert.equal(
    (await monitoringValidationSchemaResponse.json()).title,
    "AgentMonitoringValidation"
  );

  const onboardingSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-onboarding.schema.json" }),
  });
  assert.equal(onboardingSchemaResponse.status, 200);
  assert.equal(
    (await onboardingSchemaResponse.json()).title,
    "AgentOnboardingProfile"
  );

  const opportunitySchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-opportunities.schema.json" }),
  });
  assert.equal(opportunitySchemaResponse.status, 200);
  assert.equal(
    (await opportunitySchemaResponse.json()).title,
    "AgentOpportunityDiscoveryProfile"
  );

  const opportunityCardsSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({ schema: "agent-opportunity-cards.schema.json" }),
    }
  );
  assert.equal(opportunityCardsSchemaResponse.status, 200);
  assert.equal(
    (await opportunityCardsSchemaResponse.json()).title,
    "AgentOpportunityCardExamples"
  );

  const optimizationSchemaResponse = await getJsonSchema(new Request("http://boreal.test"), {
    params: Promise.resolve({ schema: "agent-optimization.schema.json" }),
  });
  assert.equal(optimizationSchemaResponse.status, 200);
  assert.equal(
    (await optimizationSchemaResponse.json()).title,
    "AgentOptimizationProfile"
  );

  const optimizationPreparationSchemaResponse = await getJsonSchema(
    new Request("http://boreal.test"),
    {
      params: Promise.resolve({
        schema: "agent-optimization-preparation.schema.json",
      }),
    }
  );
  assert.equal(optimizationPreparationSchemaResponse.status, 200);
  assert.equal(
    (await optimizationPreparationSchemaResponse.json()).title,
    "AgentOptimizationPreparation",
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

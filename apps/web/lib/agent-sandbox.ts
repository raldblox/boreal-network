import { agentMonitorWebhookSignatureVersion } from "@/lib/agent-monitor-webhook-signature";
import { absoluteUrl } from "@/lib/seo";

export const agentSandboxPaths = {
  accessReview: "/agents/access-review.json",
  actions: "/agents/actions.md",
  auth: "/agents/auth.json",
  conformance: "/agents/conformance.json",
  conformanceReportExample: "/agents/conformance-report.example.json",
  completion: "/agents/completion.json",
  delegation: "/agents/delegation.json",
  evidence: "/agents/evidence.json",
  errorExamples: "/agents/error-examples.json",
  execution: "/agents/execution.json",
  humanHandoffPacketExamples: "/agents/human-handoff-packets.example.json",
  guide: "/agents/sandbox.md",
  humanHandoffs: "/agents/human-handoffs.json",
  http: "/agents/http.json",
  intakeValidation: "/agents/intake/validate",
  manifest: "/agents/sandbox.json",
  ux: "/agents/ux.json",
  monitorWebhooks: "/agents/monitor-webhooks.md",
  monitoring: "/agents/monitoring.json",
  onboarding: "/agents/onboarding.json",
  opportunityCardExamples: "/agents/opportunity-cards.example.json",
  opportunities: "/agents/opportunities.json",
  optimization: "/agents/optimization.json",
  payments: "/agents/payments.json",
  productionAccessPacketExample: "/agents/production-access-packet.example.json",
  prompts: "/agents/prompts.json",
  protocolAdapterSamples: "/agents/protocol-adapter-samples.json",
  protocols: "/agents/protocols.md",
  protocolsJson: "/agents/protocols.json",
  recovery: "/agents/recovery.json",
  readiness: "/agents/readiness.json",
  schema: "/schemas/agent-sandbox.schema.json",
  start: "/agents/start.md",
  tools: "/agents/tools.json",
} as const;

export function buildAgentSandboxManifest() {
  const sampleIds = {
    artifactId: "00000000-0000-4000-8000-000000000004",
    chatId: "00000000-0000-4000-8000-000000000011",
    commitmentId: "00000000-0000-4000-8000-000000000003",
    deliveryId: "00000000-0000-4000-8000-000000000008",
    fulfillmentId: "00000000-0000-4000-8000-000000000005",
    requestId: "00000000-0000-4000-8000-000000000001",
    sourceRequestId: "00000000-0000-4000-8000-000000000006",
    subscriptionId: "00000000-0000-4000-8000-000000000009",
    supplyId: "00000000-0000-4000-8000-000000000002",
    transactionId: "00000000-0000-4000-8000-000000000007",
  };

  return {
    schemaVersion: 1,
    status: "live_contract_sandbox",
    mode: "contract_only",
    name: "Boreal Agent Contract Sandbox",
    description:
      "Deterministic mock identities, sample IDs, and payloads for agents testing Boreal action shapes without creating live work or spending money.",
    baseUrl: absoluteUrl("/"),
    schemaUrl: absoluteUrl(agentSandboxPaths.schema),
    guideUrl: absoluteUrl(agentSandboxPaths.guide),
    contractFixturePath: "fixtures/agent/sandbox-manifest.sample.json",
    validationCommand: "pnpm contracts:agent-sandbox",
    notAcceptedByProduction: true,
    mockCredentialsAcceptedByProduction: false,
    productionEffects: [
      "No real Request, Commitment, Fulfillment, Artifact, Transaction, or RequestEvent is created by this manifest.",
      "Mock bearer tokens, mock sessions, sample IDs, and sample webhook secrets are not accepted by live mutation endpoints.",
      "Use a real Boreal account session or approved resolver bearer token before touching production data.",
    ],
    sampleIds,
    resources: [
      { label: "Start guide", url: absoluteUrl(agentSandboxPaths.start) },
      { label: "Sandbox guide", url: absoluteUrl(agentSandboxPaths.guide) },
      { label: "Action playbook", url: absoluteUrl(agentSandboxPaths.actions) },
      {
        label: "Access review profile",
        url: absoluteUrl(agentSandboxPaths.accessReview),
      },
      {
        label: "Auth profile",
        url: absoluteUrl(agentSandboxPaths.auth),
      },
      {
        label: "Conformance profile",
        url: absoluteUrl(agentSandboxPaths.conformance),
      },
      {
        label: "Conformance report example",
        url: absoluteUrl(agentSandboxPaths.conformanceReportExample),
      },
      {
        label: "Completion profile",
        url: absoluteUrl(agentSandboxPaths.completion),
      },
      {
        label: "Human delegation profile",
        url: absoluteUrl(agentSandboxPaths.delegation),
      },
      {
        label: "Evidence profile",
        url: absoluteUrl(agentSandboxPaths.evidence),
      },
      {
        label: "Error examples",
        url: absoluteUrl(agentSandboxPaths.errorExamples),
      },
      {
        label: "Execution profile",
        url: absoluteUrl(agentSandboxPaths.execution),
      },
      {
        label: "Human handoff profile",
        url: absoluteUrl(agentSandboxPaths.humanHandoffs),
      },
      {
        label: "Human handoff packet examples",
        url: absoluteUrl(agentSandboxPaths.humanHandoffPacketExamples),
      },
      {
        label: "HTTP reference profile",
        url: absoluteUrl(agentSandboxPaths.http),
      },
      {
        label: "Agent UX profile",
        url: absoluteUrl(agentSandboxPaths.ux),
      },
      {
        label: "Agent intake validation endpoint",
        url: absoluteUrl(agentSandboxPaths.intakeValidation),
      },
      {
        label: "Optimization profile",
        url: absoluteUrl(agentSandboxPaths.optimization),
      },
      {
        label: "Payment profile",
        url: absoluteUrl(agentSandboxPaths.payments),
      },
      {
        label: "Production access packet example",
        url: absoluteUrl(agentSandboxPaths.productionAccessPacketExample),
      },
      {
        label: "Prompt catalog",
        url: absoluteUrl(agentSandboxPaths.prompts),
      },
      {
        label: "Workflow catalog",
        url: absoluteUrl("/agents/workflows.json"),
      },
      {
        label: "Protocol profile",
        url: absoluteUrl(agentSandboxPaths.protocols),
      },
      {
        label: "Protocol profile JSON",
        url: absoluteUrl(agentSandboxPaths.protocolsJson),
      },
      {
        label: "Protocol adapter samples",
        url: absoluteUrl(agentSandboxPaths.protocolAdapterSamples),
      },
      {
        label: "Recovery profile",
        url: absoluteUrl(agentSandboxPaths.recovery),
      },
      {
        label: "Readiness profile",
        url: absoluteUrl(agentSandboxPaths.readiness),
      },
      {
        label: "Tool registry",
        url: absoluteUrl(agentSandboxPaths.tools),
      },
      {
        label: "Monitor webhook profile",
        url: absoluteUrl(agentSandboxPaths.monitorWebhooks),
      },
      {
        label: "Monitoring profile",
        url: absoluteUrl(agentSandboxPaths.monitoring),
      },
      {
        label: "Onboarding profile",
        url: absoluteUrl(agentSandboxPaths.onboarding),
      },
      {
        label: "Opportunity discovery profile",
        url: absoluteUrl(agentSandboxPaths.opportunities),
      },
      {
        label: "Opportunity card examples",
        url: absoluteUrl(agentSandboxPaths.opportunityCardExamples),
      },
      {
        label: "Discovery index",
        url: absoluteUrl("/openapi.json"),
      },
      {
        label: "Request OpenAPI",
        url: absoluteUrl("/openapi/request-briefing.yaml"),
      },
      {
        label: "Public requests",
        url: absoluteUrl("/api/requests?scope=public"),
      },
    ],
    mockIdentities: [
      {
        id: "anonymous-public-scout",
        role: "public request scout",
        credentialKind: "none",
        credential: null,
        scopes: ["requests:read_public"],
        notAcceptedByProduction: true,
      },
      {
        id: "sandbox-requester",
        role: "requester agent",
        credentialKind: "mock_session",
        credential: "sandbox_account_session",
        scopes: ["requests:create", "requests:update_draft"],
        notAcceptedByProduction: true,
      },
      {
        id: "sandbox-solver-proposer",
        role: "solver proposal agent",
        credentialKind: "mock_bearer",
        credential: "Bearer sandbox_commitments_propose",
        scopes: ["commitments:propose"],
        notAcceptedByProduction: true,
      },
      {
        id: "sandbox-solver-publisher",
        role: "solver artifact publisher",
        credentialKind: "mock_bearer",
        credential: "Bearer sandbox_artifacts_publish",
        scopes: ["artifacts:publish"],
        notAcceptedByProduction: true,
      },
      {
        id: "sandbox-monitor",
        role: "request monitor agent",
        credentialKind: "mock_bearer",
        credential: "Bearer sandbox_requests_read_activity",
        scopes: ["requests:read_activity"],
        notAcceptedByProduction: true,
      },
      {
        id: "sandbox-buyer",
        role: "buyer agent",
        credentialKind: "mock_session",
        credential: "sandbox_buyer_session",
        scopes: ["solution_runs:create", "transactions:read"],
        notAcceptedByProduction: true,
      },
    ],
    flows: [
      {
        id: "inspect_public_requests",
        intent: "What can I solve?",
        method: "GET",
        path: "/api/requests?scope=public&limit=5",
        auth: "none",
        availability: "live_public_read",
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: [],
        idempotencyRequired: false,
        productionWrite: false,
        sample: {
          request: {
            method: "GET",
            path: "/api/requests?scope=public&limit=5",
          },
          expectedResponseFields: [
            "requests[].agentActionAffordances",
            "requests[].agentActionAffordances.actions[].href",
          ],
        },
      },
      {
        id: "make_request_for_human",
        intent: "Create a request for me",
        method: "POST",
        path: "/api/requests",
        auth: "mock_session:requests:create",
        availability: "contract_sample_only",
        canonicalReads: ["Request"],
        canonicalWrites: ["Request"],
        idempotencyRequired: false,
        productionWrite: false,
        sample: {
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            chatId: sampleIds.chatId,
            visibility: "private",
          },
          followUp: {
            method: "PATCH",
            path: `/api/requests/${sampleIds.requestId}`,
            body: {
              action: "save_draft",
              requestId: sampleIds.requestId,
              request: {
                brief: {
                  title: "Sandbox buyer request",
                  summary: "Draft a request for human review only.",
                  body: "Capture requested outcome, constraints, proof expectations, budget, deadline, and missing questions before opening.",
                },
              },
            },
          },
          stopBefore: "open_request without explicit buyer approval",
        },
      },
      {
        id: "apply_to_request",
        intent: "Apply to this",
        method: "POST",
        path: `/api/requests/${sampleIds.requestId}/commitments`,
        auth: "mock_bearer:commitments:propose",
        availability: "contract_sample_only",
        canonicalReads: ["Request", "Supply"],
        canonicalWrites: ["Commitment", "RequestEvent"],
        idempotencyRequired: true,
        productionWrite: false,
        sample: {
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "00000000-0000-4000-8000-000000000101",
          },
          body: {
            kind: "proposal",
            summary:
              "I can complete the requested automation cleanup and submit proof artifacts.",
            terms: {
              fundingRequired: true,
              amountMode: "fixed",
              currency: "USD",
              fixedAmount: 250,
              deliverableSummary:
                "Working automation fix plus evidence artifact and handoff notes.",
            },
          },
        },
      },
      {
        id: "submit_artifact",
        intent: "Submit here",
        method: "POST",
        path: `/api/requests/${sampleIds.requestId}/artifacts`,
        auth: "mock_bearer:artifacts:publish",
        availability: "contract_sample_only",
        canonicalReads: ["Request", "Commitment", "Fulfillment"],
        canonicalWrites: ["Artifact", "RequestEvent"],
        idempotencyRequired: true,
        productionWrite: false,
        sample: {
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "00000000-0000-4000-8000-000000000102",
          },
          body: {
            artifactKind: "evidence",
            documentKind: "text",
            title: "Sandbox proof artifact",
            summary: "Reviewable proof for the sandbox request.",
            content:
              "The solver completed the requested work and attached evidence for review.",
            fulfillmentId: sampleIds.fulfillmentId,
          },
        },
      },
      {
        id: "monitor_request",
        intent: "Monitor this",
        method: "GET",
        path: `/api/requests/${sampleIds.requestId}/activity?after_sequence=0&limit=10`,
        auth: "public_or_mock_bearer:requests:read_activity",
        availability: "contract_sample_only",
        canonicalReads: ["Request", "RequestEvent", "Artifact", "Transaction"],
        canonicalWrites: [],
        idempotencyRequired: false,
        productionWrite: false,
        sample: {
          request: {
            method: "GET",
            path: `/api/requests/${sampleIds.requestId}/activity?after_sequence=0&limit=10`,
          },
          expectedCursorField: "cursor.nextAfterSequence",
        },
      },
      {
        id: "run_public_solution",
        intent: "Run this solution",
        method: "POST",
        path: `/api/requests/${sampleIds.sourceRequestId}/solution-runs`,
        auth: "mock_session:solution_runs:create",
        availability: "contract_sample_only",
        canonicalReads: ["Request", "Artifact"],
        canonicalWrites: ["Request", "Transaction", "RequestEvent"],
        idempotencyRequired: true,
        productionWrite: false,
        sample: {
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "00000000-0000-4000-8000-000000000103",
          },
          body: {
            amount: "10.00",
            acceptedArtifactId: sampleIds.artifactId,
            customization:
              "Run the accepted solution with this sandbox buyer context.",
          },
        },
      },
      {
        id: "signed_monitor_webhook",
        intent: "Receive monitor push",
        method: "POST",
        path: "https://agent.example/boreal/request-activity",
        auth: "sample_shared_secret",
        availability: "target_profile_contract_sample",
        canonicalReads: ["RequestEvent"],
        canonicalWrites: [],
        idempotencyRequired: true,
        productionWrite: false,
        sample: {
          headers: {
            "Content-Type": "application/json",
            "Boreal-Webhook-Id": sampleIds.deliveryId,
            "Boreal-Webhook-Timestamp": "1780000000",
            "Boreal-Webhook-Signature": `${agentMonitorWebhookSignatureVersion}=<hex-hmac-sha256>`,
          },
          body: {
            schemaVersion: 1,
            deliveryId: sampleIds.deliveryId,
            subscriptionId: sampleIds.subscriptionId,
            requestId: sampleIds.requestId,
            activity: {
              eventId: "00000000-0000-4000-8000-000000000010",
              requestId: sampleIds.requestId,
              sequence: 7,
              eventType: "artifact.added",
              aggregateType: "artifact",
              aggregateId: sampleIds.artifactId,
              occurredAt: "2026-06-01T00:00:00.000Z",
              recordedAt: "2026-06-01T00:00:00.000Z",
              summary: "Sandbox artifact added.",
            },
            cursor: {
              afterSequence: 6,
              hasMoreNewer: false,
              latestSequence: 7,
              limit: 1,
              nextAfterSequence: 7,
              order: "replay",
              returned: 1,
            },
            emittedAt: "2026-06-01T00:00:01.000Z",
          },
        },
      },
      {
        id: "optimize_request_brief",
        intent: "Optimize this",
        method: "LOCAL_DRAFT",
        path: "agent-local:optimize-request-brief",
        auth: "authorized_request_context",
        availability: "target_profile_contract_sample",
        canonicalReads: ["Request", "Artifact", "RequestEvent"],
        canonicalWrites: [],
        idempotencyRequired: false,
        productionWrite: false,
        sample: {
          output: {
            suggestedBriefPatch: {
              summary:
                "Clarify the desired deliverable, proof expectation, and review boundary.",
              acceptanceCriteria: [
                "The artifact includes before and after evidence.",
                "The owner can reproduce or inspect the result.",
              ],
            },
            missingQuestions: [
              "What is the hard deadline?",
              "Which systems are allowed for solver access?",
            ],
            needsOwnerApproval: true,
            durableWrite: false,
          },
        },
      },
    ],
    scenarios: [
      {
        id: "requester_draft_optimize_approval_replay",
        title: "Make and optimize a human-owned draft",
        mode: "deterministic_replay",
        description:
          "Replay the safe requester-agent path from a fuzzy human need to a private draft and draft-only optimization output.",
        actorPath: ["sandbox-requester", "human-owner"],
        coveredActions: ["make_request_for_human", "optimize_request_brief"],
        preconditions: [
          "The human buyer has asked the agent to prepare a request draft.",
          "No public request exists yet, and opening requires explicit human approval.",
        ],
        steps: [
          {
            id: "create_private_draft",
            flowId: "make_request_for_human",
            actor: "sandbox-requester",
            kind: "mutation_sample",
            description:
              "Create a private draft Request sample and save buyer-authored brief fields only.",
            writes: ["Request"],
            idempotencyKey: null,
            expected: {
              visibility: "private",
              stopBefore: "open_request",
            },
          },
          {
            id: "draft_local_optimization",
            flowId: "optimize_request_brief",
            actor: "sandbox-requester",
            kind: "draft",
            description:
              "Return a suggested brief patch and missing questions without durable mutation.",
            writes: [],
            idempotencyKey: null,
            expected: {
              durableWrite: false,
              needsOwnerApproval: true,
            },
          },
          {
            id: "human_approval_gate",
            flowId: "make_request_for_human",
            actor: "human-owner",
            kind: "simulated_external_gate",
            description:
              "Stop until the human owner reviews the draft and explicitly chooses whether to open it.",
            writes: [],
            idempotencyKey: null,
            expected: {
              mayOpenRequest: false,
              reason: "Contract sandbox does not model live owner approval.",
            },
          },
        ],
        expectedCanonicalWrites: ["Request"],
        expectedTerminalState: {
          claimState: "draft_ready",
          durableCompletion: false,
          publicVisibility: false,
        },
        notAcceptedByProduction: true,
      },
      {
        id: "solver_apply_submit_monitor_replay",
        title: "Apply, submit proof, and monitor owner review",
        mode: "deterministic_replay",
        description:
          "Replay the solver-agent path from public inspection through Commitment proposal, accepted execution lane, Artifact proof, and cursor monitoring.",
        actorPath: [
          "anonymous-public-scout",
          "sandbox-solver-proposer",
          "human-owner",
          "sandbox-solver-publisher",
          "sandbox-monitor",
        ],
        coveredActions: [
          "inspect_public_requests",
          "apply_to_request",
          "submit_artifact",
          "monitor_request",
        ],
        preconditions: [
          "The target Request is public-safe to inspect.",
          "The solver must not start cross-actor fulfillment until an accepted Commitment or direct-owner authorization exists.",
        ],
        steps: [
          {
            id: "inspect_public_fit",
            flowId: "inspect_public_requests",
            actor: "anonymous-public-scout",
            kind: "read",
            description:
              "Read public request projections and agentActionAffordances before choosing a request.",
            writes: [],
            idempotencyKey: null,
            expected: {
              requiredField: "requests[].agentActionAffordances",
            },
          },
          {
            id: "submit_commitment_proposal",
            flowId: "apply_to_request",
            actor: "sandbox-solver-proposer",
            kind: "mutation_sample",
            description:
              "Submit one Commitment proposal with scope, price, proof, and handoff terms.",
            writes: ["Commitment", "RequestEvent"],
            idempotencyKey: "00000000-0000-4000-8000-000000000101",
            expected: {
              duplicateCreates: false,
            },
          },
          {
            id: "accepted_commitment_gate",
            flowId: "apply_to_request",
            actor: "human-owner",
            kind: "simulated_external_gate",
            description:
              "Simulate the owner accepting the Commitment and creating an execution lane before proof submission.",
            writes: ["Commitment", "Fulfillment", "RequestEvent"],
            idempotencyKey: null,
            expected: {
              requiredBefore: "submit_artifact",
            },
          },
          {
            id: "publish_proof_artifact",
            flowId: "submit_artifact",
            actor: "sandbox-solver-publisher",
            kind: "mutation_sample",
            description:
              "Publish a reviewable Artifact attached to the accepted Fulfillment.",
            writes: ["Artifact", "RequestEvent"],
            idempotencyKey: "00000000-0000-4000-8000-000000000102",
            expected: {
              claimState: "proof_submitted",
              ownerAcceptanceRequired: true,
            },
          },
          {
            id: "resume_monitor_cursor",
            flowId: "monitor_request",
            actor: "sandbox-monitor",
            kind: "monitor",
            description:
              "Read activity with after_sequence and persist cursor.nextAfterSequence.",
            writes: [],
            idempotencyKey: null,
            expected: {
              cursorField: "cursor.nextAfterSequence",
            },
          },
        ],
        expectedCanonicalWrites: [
          "Commitment",
          "Fulfillment",
          "Artifact",
          "RequestEvent",
        ],
        expectedTerminalState: {
          claimState: "proof_submitted_waiting_for_owner_acceptance",
          durableCompletion: false,
          publicVisibility: true,
        },
        notAcceptedByProduction: true,
      },
      {
        id: "public_solution_paid_run_shape_replay",
        title: "Run a public solution without mutating the source Request",
        mode: "deterministic_replay",
        description:
          "Replay the paid-run shape where public inspection stays free, execution creates a private run Request, and spend reconciles into Transaction truth.",
        actorPath: ["anonymous-public-scout", "sandbox-buyer", "sandbox-monitor"],
        coveredActions: [
          "inspect_public_requests",
          "run_public_solution",
          "monitor_request",
        ],
        preconditions: [
          "The source Request is completed, public, and has an accepted reusable Artifact.",
          "The buyer has spend authority in production; this sandbox uses mock session labels only.",
        ],
        steps: [
          {
            id: "inspect_source_solution",
            flowId: "inspect_public_requests",
            actor: "anonymous-public-scout",
            kind: "read",
            description:
              "Inspect the public solution projection without spending credits.",
            writes: [],
            idempotencyKey: null,
            expected: {
              inspectionCost: "free",
            },
          },
          {
            id: "create_paid_run_shape",
            flowId: "run_public_solution",
            actor: "sandbox-buyer",
            kind: "payment_shape",
            description:
              "Create the sample paid-run shape that would produce private run Request and Transaction truth in production.",
            writes: ["Request", "Transaction", "RequestEvent"],
            idempotencyKey: "00000000-0000-4000-8000-000000000103",
            expected: {
              sourceRequestMutated: false,
              duplicateCreates: false,
            },
          },
          {
            id: "monitor_run_transaction",
            flowId: "monitor_request",
            actor: "sandbox-monitor",
            kind: "monitor",
            description:
              "Monitor the run request and payment state before claiming execution started.",
            writes: [],
            idempotencyKey: null,
            expected: {
              requiredTruth: ["Transaction", "RequestEvent"],
            },
          },
        ],
        expectedCanonicalWrites: ["Request", "Transaction", "RequestEvent"],
        expectedTerminalState: {
          claimState: "run_started_after_transaction_truth",
          durableCompletion: false,
          sourceRequestMutated: false,
        },
        notAcceptedByProduction: true,
      },
      {
        id: "idempotent_recovery_replay",
        title: "Recover from an uncertain write without duplicate truth",
        mode: "deterministic_replay",
        description:
          "Replay the recovery path for an uncertain proposal or artifact write by reusing the same idempotency key, re-reading activity, and escalating only when state is still ambiguous.",
        actorPath: ["sandbox-solver-proposer", "sandbox-monitor"],
        coveredActions: ["apply_to_request", "monitor_request"],
        preconditions: [
          "The agent lost the response after sending a write-like sample.",
          "The agent still has the original request body and idempotency key.",
        ],
        steps: [
          {
            id: "retry_same_semantic_write",
            flowId: "apply_to_request",
            actor: "sandbox-solver-proposer",
            kind: "recovery",
            description:
              "Retry the same proposal body with the same Idempotency-Key instead of creating a second proposal.",
            writes: ["Commitment", "RequestEvent"],
            idempotencyKey: "00000000-0000-4000-8000-000000000101",
            expected: {
              duplicateCreates: false,
              bodyMustMatchOriginal: true,
            },
          },
          {
            id: "reread_activity_after_retry",
            flowId: "monitor_request",
            actor: "sandbox-monitor",
            kind: "monitor",
            description:
              "Read request activity with the last known cursor before attempting any replacement mutation.",
            writes: [],
            idempotencyKey: null,
            expected: {
              inspectBeforeNewKey: true,
            },
          },
          {
            id: "escalate_if_commit_unknown",
            flowId: "monitor_request",
            actor: "sandbox-monitor",
            kind: "recovery",
            description:
              "Escalate to the human owner or operator if the agent still cannot prove whether durable truth committed.",
            writes: [],
            idempotencyKey: null,
            expected: {
              createReplacementMutation: false,
            },
          },
        ],
        expectedCanonicalWrites: ["Commitment", "RequestEvent"],
        expectedTerminalState: {
          claimState: "recovered_or_escalated_without_duplicate_mutation",
          duplicateDurableTruth: false,
        },
        notAcceptedByProduction: true,
      },
    ],
    canonicalBoundary: {
      rootObject: "Request",
      durableWrites: [
        "Request",
        "Commitment",
        "Fulfillment",
        "FulfillmentStep",
        "Artifact",
        "Transaction",
        "RequestEvent",
      ],
      notRoots: [
        "sandbox manifest",
        "mock credential",
        "MCP session",
        "A2A task",
        "x402 payment payload",
        "webhook delivery",
        "local draft output",
      ],
    },
  } as const;
}

export function buildAgentSandboxMarkdown() {
  const manifest = buildAgentSandboxManifest();
  const flowRows = manifest.flows
    .map(
      (flow) =>
        `| ${flow.intent} | \`${flow.method}\` | \`${flow.path}\` | ${flow.availability} | ${flow.canonicalWrites.join(", ") || "none"} |`
    )
    .join("\n");
  const identityRows = manifest.mockIdentities
    .map(
      (identity) =>
        `| ${identity.id} | ${identity.role} | \`${identity.credentialKind}\` | ${identity.scopes.join(", ") || "none"} |`
    )
    .join("\n");
  const scenarioRows = manifest.scenarios
    .map(
      (scenario) =>
        `| ${scenario.title} | ${scenario.coveredActions.join(", ")} | ${scenario.expectedCanonicalWrites.join(", ") || "none"} | ${scenario.expectedTerminalState.claimState} |`
    )
    .join("\n");

  return `# Boreal Agent Sandbox

This is a contract-only sandbox for agents.

It gives deterministic mock identities, sample IDs, and request payloads so agents can test shape, idempotency, cursor handling, webhook verification, and canonical-object boundaries before touching live requests.

Mock credentials, mock sessions, sample IDs, sample webhook secrets, and sample payloads in this sandbox are not accepted by production endpoints.

The sandbox does not create real Boreal \`Request\`, \`Commitment\`, \`Fulfillment\`, \`Artifact\`, \`Transaction\`, or \`RequestEvent\` records.

## Manifest

- JSON manifest: [${agentSandboxPaths.manifest}](${absoluteUrl(agentSandboxPaths.manifest)})
- JSON Schema: [${agentSandboxPaths.schema}](${absoluteUrl(agentSandboxPaths.schema)})
- Repo fixture: \`fixtures/agent/sandbox-manifest.sample.json\`
- Fixture validation: \`pnpm contracts:agent-sandbox\`

## Mock Identities

| Identity | Role | Credential kind | Scopes |
| --- | --- | --- | --- |
${identityRows}

These identities are labels and payload examples only. They are not accounts, bearer tokens, sessions, resolver approvals, or payment authorities.

## Flows

| Intent | Method | Path | Availability | Durable writes |
| --- | --- | --- | --- | --- |
${flowRows}

## Replay Scenarios

Use \`scenarios\` in the JSON manifest when you need a full deterministic transcript instead of a single payload sample.

| Scenario | Covered actions | Durable-shaped writes | Terminal claim state |
| --- | --- | --- | --- |
${scenarioRows}

Replay scenarios are still contract-only. They may simulate owner acceptance, fulfillment creation, payment reconciliation, or recovery checks so agents can test process order, but they do not create production objects or grant authority.

## Apply To A Request

Use the \`apply_to_request\` sample to validate \`Commitment\` proposal shape and idempotency-key handling. In production, this requires a Boreal account session or resolver bearer token with \`commitments:propose\`.

## Submit Proof

Use the \`submit_artifact\` sample to validate \`Artifact\` publication shape. In production, proof must attach to an authorized request or fulfillment lane and cannot bypass commitment or owner-review gates.

## Monitor

Use the \`monitor_request\` sample to test \`after_sequence\`, \`limit\`, and \`cursor.nextAfterSequence\` behavior. The signed webhook sample follows [${agentSandboxPaths.monitorWebhooks}](${absoluteUrl(agentSandboxPaths.monitorWebhooks)}) but remains a target push profile until subscription delivery is live.

## Run A Public Solution

Use the \`run_public_solution\` sample to test paid-run shape only. No money moves in this sandbox, and any live payment or credit movement must reconcile into \`Transaction\`.

## Optimize

Use the \`optimize_request_brief\` sample as draft-only output. It should never mutate a buyer-authored request brief unless the owner approves a governed mutation path.

## Rules

- Do not treat mock credentials as real auth.
- Do not treat sample IDs as live object IDs.
- Keep \`Request\` as the durable root object.
- Use idempotency keys on write-like samples.
- Persist \`cursor.nextAfterSequence\` when testing monitor behavior.
- Treat payment samples as shape tests only; no money moves in this sandbox.
- Keep local draft recommendations outside durable truth until an owner approves them.

## Next Step

Use the manifest to generate client tests, then switch to a real Boreal session or resolver token only after the human owner approves the action.
`;
}

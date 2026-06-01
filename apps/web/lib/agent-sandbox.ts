import { agentMonitorWebhookSignatureVersion } from "@/lib/agent-monitor-webhook-signature";
import { absoluteUrl } from "@/lib/seo";

export const agentSandboxPaths = {
  actions: "/agents/actions.md",
  guide: "/agents/sandbox.md",
  manifest: "/agents/sandbox.json",
  monitorWebhooks: "/agents/monitor-webhooks.md",
  protocols: "/agents/protocols.md",
  protocolsJson: "/agents/protocols.json",
  recovery: "/agents/recovery.json",
  schema: "/schemas/agent-sandbox.schema.json",
  start: "/agents/start.md",
} as const;

export function buildAgentSandboxManifest() {
  const sampleIds = {
    artifactId: "00000000-0000-4000-8000-000000000004",
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
        label: "Recovery profile",
        url: absoluteUrl(agentSandboxPaths.recovery),
      },
      {
        label: "Monitor webhook profile",
        url: absoluteUrl(agentSandboxPaths.monitorWebhooks),
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
    canonicalBoundary: {
      rootObject: "Request",
      durableWrites: [
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

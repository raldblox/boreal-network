type JsonRecord = Record<string, unknown>;

type CheckStatus = "passed" | "missing" | "blocked";

type WriteSandboxCheckResult = {
  id: string;
  status: CheckStatus;
  blocking: boolean;
  requirement: string;
  missingRequirements: string[];
};

export type AgentWriteSandboxPreparationResult = {
  schemaVersion: 1;
  status: "write_sandbox_plan_ready" | "write_sandbox_plan_blocked";
  preparationIntent: "isolated_write_sandbox_activation" | "unknown";
  preparationMode: "operator_activation_plan";
  decisionId: "0025-agent-isolated-write-sandbox-boundary";
  acceptedByProduction: false;
  sandboxCredentialsIssued: false;
  credentialsIssued: false;
  permissionGranted: false;
  productionAccessGranted: false;
  productionSandboxCreated: false;
  liveSandboxCreated: false;
  reviewSubmissionCreated: false;
  paymentAuthorized: false;
  completionProven: false;
  durableWriteCreated: false;
  activationGateResults: WriteSandboxCheckResult[];
  minimumFlowCoverageResults: WriteSandboxCheckResult[];
  operatorHandoff: {
    kind: "write_sandbox_activation_handoff";
    requiredAttachments: string[];
    operatorChecks: string[];
    decisionOptions: string[];
    nextHumanActions: string[];
  };
  missingRequirements: string[];
  blockedAssertions: string[];
  warnings: string[];
  nextSteps: string[];
  recommendedNextReads: string[];
  canonicalBoundary: {
    rootObject: "Request";
    preparationIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const decisionId = "0025-agent-isolated-write-sandbox-boundary" as const;

const durableTruthObjects = [
  "Request",
  "RequestParticipant",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Artifact",
  "Transaction",
  "RequestEvent",
] as const;

const preparationIsNot = [
  "credential issuer",
  "sandbox credential issuer",
  "permission grant",
  "production sandbox",
  "production credential",
  "production access grant",
  "operator approval record",
  "human approval record",
  "review submission",
  "payment authorization",
  "payment settlement",
  "completion proof",
  "durable production RequestEvent",
  "MCP server implementation",
  "A2A adapter implementation",
  "x402 endpoint activation",
] as const;

const coverageRequirements = [
  {
    id: "requester_draft_creation",
    path: "activationPlan.coverage.requestDraftCreation",
    requirement:
      "A sandbox Request draft can be created or updated without opening, funding, routing, or assigning it.",
  },
  {
    id: "solver_commitment_proposal",
    path: "activationPlan.coverage.commitmentProposal",
    requirement:
      "A solver can propose a sandbox Commitment with actor scope and idempotency.",
  },
  {
    id: "owner_acceptance_gate",
    path: "activationPlan.coverage.ownerAcceptanceGate",
    requirement:
      "Fulfillment starts only after owner or simulated-owner acceptance.",
  },
  {
    id: "fulfillment_step_execution",
    path: "activationPlan.coverage.fulfillmentAndStepsAfterGate",
    requirement:
      "Worker sub-work stays under FulfillmentStep after the fulfillment gate.",
  },
  {
    id: "artifact_proof_submission",
    path: "activationPlan.coverage.artifactProofSubmission",
    requirement:
      "Proof, receipt, media, file, or delivery output is packaged as an Artifact candidate without premature completion claims.",
  },
  {
    id: "cursor_monitoring",
    path: "activationPlan.coverage.cursorMonitoring",
    requirement:
      "A monitor can resume from RequestEvent sequence checkpoints without heartbeat writes.",
  },
  {
    id: "idempotent_retry",
    path: "activationPlan.coverage.idempotentRetry",
    requirement:
      "Apply, submit, run, and recovery actions handle same-key replay and changed-input conflict safely.",
  },
  {
    id: "paid_run_shape_no_money",
    path: "activationPlan.coverage.paidRunShapeNoMoney",
    requirement:
      "A paid-run shape creates sandbox-only Transaction truth with no real money movement.",
  },
  {
    id: "optimization_draft_only",
    path: "activationPlan.coverage.optimizationDraftOnly",
    requirement:
      "Optimization remains draft-only unless a human approves a governed mutation path.",
  },
  {
    id: "rfc_9457_failures",
    path: "activationPlan.coverage.rfc9457Failures",
    requirement:
      "Auth, scope, idempotency, rate-limit, payment, monitor, fulfillment, and unknown-write failures return RFC 9457 problem details.",
  },
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function atPath(root: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (!isRecord(value)) {
      return undefined;
    }

    return value[segment];
  }, root);
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
}

function addUnique(list: string[], item: string) {
  if (!list.includes(item)) {
    list.push(item);
  }
}

function requiredBoolean(
  input: unknown,
  path: string,
  expected: boolean,
  missingRequirements: string[]
) {
  if (atPath(input, path) !== expected) {
    addUnique(missingRequirements, `${path}=${String(expected)}`);
  }
}

function requiredString(
  input: unknown,
  path: string,
  expected: string,
  missingRequirements: string[]
) {
  if (atPath(input, path) !== expected) {
    addUnique(missingRequirements, `${path}=${expected}`);
  }
}

function requiredFalseAuthority(
  input: unknown,
  path: string,
  missingRequirements: string[],
  blockedAssertions: string[]
) {
  const value = atPath(input, path);

  if (value !== false) {
    addUnique(missingRequirements, `${path}=false`);
  }

  if (value === true) {
    addUnique(blockedAssertions, `${path} overclaims live authority`);
  }
}

function dangerousFalse(
  input: unknown,
  path: string,
  missingRequirements: string[],
  blockedAssertions: string[]
) {
  const value = atPath(input, path);

  if (value !== false) {
    addUnique(missingRequirements, `${path}=false`);
  }

  if (value === true) {
    addUnique(blockedAssertions, `${path} would touch production or live value`);
  }
}

function checkRequiredTrue(
  input: unknown,
  id: string,
  path: string,
  requirement: string
): WriteSandboxCheckResult {
  const passed = atPath(input, path) === true;

  return {
    id,
    status: passed ? "passed" : "missing",
    blocking: true,
    requirement,
    missingRequirements: passed ? [] : [`${path}=true`],
  };
}

function checkResult(
  id: string,
  requirement: string,
  missingRequirements: string[],
  blockedAssertions: string[] = []
): WriteSandboxCheckResult {
  return {
    id,
    status:
      blockedAssertions.length > 0
        ? "blocked"
        : missingRequirements.length > 0
          ? "missing"
          : "passed",
    blocking: true,
    requirement,
    missingRequirements: [...missingRequirements, ...blockedAssertions],
  };
}

function collectMissing(
  output: string[],
  checks: readonly WriteSandboxCheckResult[]
) {
  for (const check of checks) {
    for (const requirement of check.missingRequirements) {
      addUnique(output, requirement);
    }
  }
}

export function prepareAgentWriteSandboxPayload(
  input: unknown
): AgentWriteSandboxPreparationResult {
  const missingRequirements: string[] = [];
  const blockedAssertions: string[] = [];
  const warnings = [
    "Write-sandbox activation preparation creates no credentials, permission grant, live sandbox, production access, payment authority, completion proof, review submission, or durable Boreal write.",
  ];

  if (!isRecord(input)) {
    addUnique(missingRequirements, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addUnique(missingRequirements, "schemaVersion=1");
  }

  const preparationIntent =
    isRecord(input) &&
    input.preparationIntent === "isolated_write_sandbox_activation"
      ? "isolated_write_sandbox_activation"
      : "unknown";
  if (preparationIntent === "unknown") {
    addUnique(
      missingRequirements,
      "preparationIntent=isolated_write_sandbox_activation"
    );
  }

  if (isRecord(input)) {
    requiredString(
      input,
      "preparationMode",
      "operator_activation_plan",
      missingRequirements
    );
    requiredString(input, "decisionId", decisionId, missingRequirements);
    requiredBoolean(input, "operatorReviewRequired", true, missingRequirements);
    requiredBoolean(input, "notCredentialRequest", true, missingRequirements);
    requiredBoolean(input, "noSecretsIncluded", true, missingRequirements);
    requiredFalseAuthority(
      input,
      "claimsLiveSandbox",
      missingRequirements,
      blockedAssertions
    );
    requiredFalseAuthority(
      input,
      "claimsProductionAccess",
      missingRequirements,
      blockedAssertions
    );
    requiredFalseAuthority(
      input,
      "claimsPermissionGranted",
      missingRequirements,
      blockedAssertions
    );
    requiredFalseAuthority(
      input,
      "claimsPaymentAuthority",
      missingRequirements,
      blockedAssertions
    );
    requiredFalseAuthority(
      input,
      "claimsCompletion",
      missingRequirements,
      blockedAssertions
    );
    requiredFalseAuthority(
      input,
      "claimsDurableWrite",
      missingRequirements,
      blockedAssertions
    );
  }

  if (!isRecord(atPath(input, "activationPlan"))) {
    addUnique(missingRequirements, "activationPlan");
  }

  const environmentMissing: string[] = [];
  const environmentBlocked: string[] = [];
  requiredBoolean(
    input,
    "activationPlan.environment.segregatedNonProduction",
    true,
    environmentMissing
  );
  dangerousFalse(
    input,
    "activationPlan.environment.productionDataTouched",
    environmentMissing,
    environmentBlocked
  );
  dangerousFalse(
    input,
    "activationPlan.environment.productionRequestEventWrites",
    environmentMissing,
    environmentBlocked
  );
  dangerousFalse(
    input,
    "activationPlan.environment.realPaymentMovement",
    environmentMissing,
    environmentBlocked
  );
  dangerousFalse(
    input,
    "activationPlan.environment.sandboxRecordsPromotableWithoutSeparateDecision",
    environmentMissing,
    environmentBlocked
  );

  const credentialMissing: string[] = [];
  requiredBoolean(
    input,
    "activationPlan.credentials.representedActorIncluded",
    true,
    credentialMissing
  );
  requiredBoolean(
    input,
    "activationPlan.credentials.credentialKindIncluded",
    true,
    credentialMissing
  );
  requiredString(
    input,
    "activationPlan.credentials.allowedEnvironment",
    "sandbox",
    credentialMissing
  );
  requiredBoolean(
    input,
    "activationPlan.credentials.expiryIncluded",
    true,
    credentialMissing
  );
  requiredBoolean(
    input,
    "activationPlan.credentials.revocationPathIncluded",
    true,
    credentialMissing
  );
  requiredBoolean(
    input,
    "activationPlan.credentials.rateLimitIncluded",
    true,
    credentialMissing
  );
  requiredBoolean(
    input,
    "activationPlan.credentials.idempotencyRequired",
    true,
    credentialMissing
  );
  requiredBoolean(
    input,
    "activationPlan.credentials.issuingPolicyIncluded",
    true,
    credentialMissing
  );

  if (
    getStringArray(atPath(input, "activationPlan.credentials.allowedScopes"))
      .length === 0
  ) {
    addUnique(
      credentialMissing,
      "activationPlan.credentials.allowedScopes includes at least one route scope"
    );
  }

  const productionRejectionMissing: string[] = [];
  requiredBoolean(
    input,
    "activationPlan.credentials.productionRejectionTestIncluded",
    true,
    productionRejectionMissing
  );

  const enforcementMissing = [
    ...credentialMissing.filter((requirement) =>
      [
        "activationPlan.credentials.allowedScopes includes at least one route scope",
        "activationPlan.credentials.rateLimitIncluded=true",
        "activationPlan.credentials.idempotencyRequired=true",
      ].includes(requirement)
    ),
  ];

  const coverageResults = coverageRequirements.map((coverage) =>
    checkRequiredTrue(input, coverage.id, coverage.path, coverage.requirement)
  );

  const fixtureMissing: string[] = [];
  collectMissing(fixtureMissing, coverageResults);

  const humanFirstMissing: string[] = [];
  requiredBoolean(
    input,
    "activationPlan.humanFirstUx.actionCardsIncluded",
    true,
    humanFirstMissing
  );
  requiredBoolean(
    input,
    "activationPlan.humanFirstUx.handoffPromptsIncluded",
    true,
    humanFirstMissing
  );
  requiredBoolean(
    input,
    "activationPlan.humanFirstUx.proofReviewIncluded",
    true,
    humanFirstMissing
  );
  requiredBoolean(
    input,
    "activationPlan.humanFirstUx.monitorEscalationIncluded",
    true,
    humanFirstMissing
  );
  requiredBoolean(
    input,
    "activationPlan.humanFirstUx.paymentAuthorizationIncluded",
    true,
    humanFirstMissing
  );

  const noOverclaimMissing: string[] = [];
  const noOverclaimBlocked: string[] = [];
  dangerousFalse(
    input,
    "activationPlan.environment.realPaymentMovement",
    noOverclaimMissing,
    noOverclaimBlocked
  );
  requiredFalseAuthority(
    input,
    "claimsPaymentAuthority",
    noOverclaimMissing,
    noOverclaimBlocked
  );
  requiredFalseAuthority(
    input,
    "claimsCompletion",
    noOverclaimMissing,
    noOverclaimBlocked
  );

  const operatorReviewMissing: string[] = [];
  requiredBoolean(input, "operatorReviewRequired", true, operatorReviewMissing);
  requiredString(
    input,
    "preparationMode",
    "operator_activation_plan",
    operatorReviewMissing
  );
  requiredBoolean(input, "notCredentialRequest", true, operatorReviewMissing);
  requiredBoolean(input, "noSecretsIncluded", true, operatorReviewMissing);
  requiredFalseAuthority(
    input,
    "claimsPermissionGranted",
    operatorReviewMissing,
    blockedAssertions
  );
  requiredFalseAuthority(
    input,
    "claimsLiveSandbox",
    operatorReviewMissing,
    blockedAssertions
  );

  const activationGateResults = [
    checkResult(
      "environment_separation",
      "Sandbox routes read and write only a segregated non-production dataset.",
      environmentMissing,
      environmentBlocked
    ),
    checkResult(
      "credential_issuance_and_revocation",
      "Sandbox credentials include represented actor, kind, scopes, environment, expiry, revocation, rate limit, idempotency, and issuing policy.",
      credentialMissing
    ),
    checkResult(
      "production_rejection",
      "Production endpoints reject sandbox credentials and return safe problem details.",
      productionRejectionMissing
    ),
    checkResult(
      "scope_idempotency_rate_limit_enforcement",
      "Every write-like sandbox route enforces route scopes, idempotency keys, replay safety, and rate limits.",
      enforcementMissing
    ),
    checkResult(
      "seeded_fixture_and_replay_coverage",
      "Fixtures and replay tests cover requester, solver, owner, fulfillment, proof, monitor, retry, paid-run, optimization, and failure flows.",
      fixtureMissing
    ),
    checkResult(
      "human_first_cards_and_handoffs",
      "Action cards, handoff packets, proof review, monitor escalation, and payment authorization UX stay visible and non-authoritative.",
      humanFirstMissing
    ),
    checkResult(
      "no_payment_or_completion_overclaim",
      "Sandbox paid-run shapes move no real money and completion claims remain blocked until owner-review truth exists.",
      noOverclaimMissing,
      noOverclaimBlocked
    ),
    checkResult(
      "operator_review_handoff",
      "Sandbox evidence can be packaged into conformance and production-access review without creating access by itself.",
      operatorReviewMissing
    ),
  ];

  collectMissing(missingRequirements, activationGateResults);
  collectMissing(missingRequirements, coverageResults);
  for (const assertion of blockedAssertions) {
    addUnique(missingRequirements, assertion);
  }

  const passed =
    missingRequirements.length === 0 &&
    blockedAssertions.length === 0 &&
    activationGateResults.every((gate) => gate.status === "passed") &&
    coverageResults.every((coverage) => coverage.status === "passed");

  return {
    schemaVersion: 1,
    status: passed ? "write_sandbox_plan_ready" : "write_sandbox_plan_blocked",
    preparationIntent,
    preparationMode: "operator_activation_plan",
    decisionId,
    acceptedByProduction: false,
    sandboxCredentialsIssued: false,
    credentialsIssued: false,
    permissionGranted: false,
    productionAccessGranted: false,
    productionSandboxCreated: false,
    liveSandboxCreated: false,
    reviewSubmissionCreated: false,
    paymentAuthorized: false,
    completionProven: false,
    durableWriteCreated: false,
    activationGateResults,
    minimumFlowCoverageResults: coverageResults,
    operatorHandoff: {
      kind: "write_sandbox_activation_handoff",
      requiredAttachments: [
        "writeSandboxActivationPlan",
        "decision0025CoverageMatrix",
        "sandboxCredentialIssuingPolicyDraft",
        "productionCredentialRejectionTestPlan",
        "seededFixtureAndReplayPlan",
        "humanFirstActionCardAndHandoffPlan",
      ],
      operatorChecks: [
        "Environment separation prevents production Request, Artifact, Transaction, and RequestEvent writes.",
        "Sandbox credentials are revocable, scoped, expiring, rate-limited, idempotency-gated, and rejected by production.",
        "Minimum apply, submit, monitor, run, recovery, optimization, and RFC 9457 failure flows are covered by fixtures and replay tests.",
        "Human-visible cards and handoffs stay non-authoritative and preserve owner review before spend, acceptance, and completion claims.",
        "Sandbox evidence can support manual review but never auto-issues production credentials or broad write scopes.",
      ],
      decisionOptions: [
        "ready_for_operator_review",
        "needs_more_activation_evidence",
        "reject_authority_overclaim",
        "defer_until_sandbox_routes_exist",
      ],
      nextHumanActions: passed
        ? [
            "Attach this result to the write-sandbox activation packet for operator review.",
            "Do not treat this result as a credential, permission grant, live sandbox, production access grant, payment authority, completion proof, or durable write.",
            "Build sandbox route tests and credential rejection tests before marking any write sandbox live.",
          ]
        : [
            "Fix every missing requirement named by this response.",
            "Remove live-sandbox, production-access, permission, payment, completion, and durable-write claims.",
            "Re-run preparation before operator handoff.",
          ],
    },
    missingRequirements,
    blockedAssertions,
    warnings,
    nextSteps: passed
      ? [
          "Use this as an operator-review packet only.",
          "Implement sandbox credentials, route guards, production rejection, fixtures, replay tests, and human cards before live activation.",
          "Keep production access behind separate access review, auth, scope, request policy, idempotency, and human approval gates.",
        ]
      : [
          "Fix missing requirements and blocked assertions.",
          "Read /agents/write-sandbox.json and decision 0025 before changing route behavior.",
          "Keep using contract-only sandbox replay and validation endpoints until the segregated write sandbox is implemented.",
        ],
    recommendedNextReads: [
      "/agents/write-sandbox.json",
      "/schemas/agent-write-sandbox.schema.json",
      "/docs/decisions/0025-agent-isolated-write-sandbox-boundary.md",
      "/agents/auth.json",
      "/agents/actions/preflight",
      "/agents/sandbox/replay",
      "/agents/access-review/prepare",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      preparationIsNot,
      durableTruthObjects,
    },
  };
}

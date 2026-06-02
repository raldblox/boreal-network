import { buildAgentCompletionProfile } from "@/lib/agent-discovery";

type JsonRecord = Record<string, unknown>;

type CompletionClaimState =
  | "draft_ready"
  | "proposal_submitted"
  | "proof_submitted"
  | "waiting_for_owner_acceptance"
  | "completed"
  | "run_started_not_completed";

type CompletionTruthKey =
  | "hasRequestLifecycleTruth"
  | "hasCommitmentTruth"
  | "hasFulfillmentTruth"
  | "hasArtifactTruth"
  | "hasReviewTruth"
  | "hasTransactionTruth"
  | "hasRequestEventTruth";

export type AgentCompletionValidationResult = {
  schemaVersion: 1;
  status: "validation_passed" | "validation_failed";
  acceptedClaimStates: readonly CompletionClaimState[];
  claimState: CompletionClaimState | "unknown";
  matchedRuleId: string | null;
  requiredTruth: readonly string[];
  completionProven: false;
  requestClosed: false;
  reviewAccepted: false;
  artifactPublished: false;
  fulfillmentAdvanced: false;
  requestEventWritten: false;
  paymentAuthorized: false;
  permissionGranted: false;
  durableWriteCreated: false;
  summary: string;
  missingFields: string[];
  warnings: string[];
  nextSteps: string[];
  canonicalBoundary: {
    rootObject: "Request";
    completionTruthObjects: readonly string[];
    validationIsNot: readonly string[];
    notCompletionTruth: readonly string[];
  };
};

const acceptedClaimStates = [
  "draft_ready",
  "proposal_submitted",
  "proof_submitted",
  "waiting_for_owner_acceptance",
  "completed",
  "run_started_not_completed",
] as const;

const acceptedClaimStateSet = new Set<string>(acceptedClaimStates);

const durableTruthObjects = [
  "Request",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Artifact",
  "Transaction",
  "RequestEvent",
] as const;

const validationIsNot = [
  "completion proof",
  "request closure",
  "review acceptance",
  "artifact publication",
  "fulfillment state mutation",
  "payment authorization",
  "permission grant",
  "durable RequestEvent",
] as const;

const notCompletionTruth = [
  "chat message alone",
  "agent local draft",
  "MCP tool result alone",
  "A2A task status alone",
  "x402 payload alone",
  "payment settlement alone",
  "provider callback alone",
  "runtime log alone",
] as const;

const truthRequirements: Record<CompletionClaimState, CompletionTruthKey[]> = {
  draft_ready: ["hasRequestLifecycleTruth"],
  proposal_submitted: [
    "hasCommitmentTruth",
    "hasRequestEventTruth",
  ],
  proof_submitted: ["hasArtifactTruth"],
  waiting_for_owner_acceptance: [
    "hasFulfillmentTruth",
    "hasArtifactTruth",
    "hasRequestEventTruth",
  ],
  completed: [
    "hasRequestLifecycleTruth",
    "hasFulfillmentTruth",
    "hasArtifactTruth",
    "hasReviewTruth",
    "hasRequestEventTruth",
  ],
  run_started_not_completed: [
    "hasRequestLifecycleTruth",
    "hasTransactionTruth",
  ],
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function addMissing(missingFields: string[], field: string) {
  if (!missingFields.includes(field)) {
    missingFields.push(field);
  }
}

function requireString(
  claim: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (!getString(claim[key])) {
    addMissing(missingFields, key);
  }
}

function requireFalse(
  claim: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (getBoolean(claim[key]) !== false) {
    addMissing(missingFields, `${key}=false`);
  }
}

function requireTrue(
  claim: JsonRecord,
  key: CompletionTruthKey,
  missingFields: string[]
) {
  if (getBoolean(claim[key]) !== true) {
    addMissing(missingFields, `${key}=true`);
  }
}

export function validateAgentCompletionPayload(
  input: unknown
): AgentCompletionValidationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Completion validation is preflight-only and verifies the packet posture, not live database truth.",
  ];
  const profile = buildAgentCompletionProfile();

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const claim = isRecord(input) ? input.claim : undefined;
  let claimState: CompletionClaimState | "unknown" = "unknown";

  if (!isRecord(claim)) {
    addMissing(missingFields, "claim");
  } else {
    requireString(claim, "requestId", missingFields);
    requireString(claim, "summary", missingFields);
    requireString(claim, "evidenceSummary", missingFields);
    requireString(claim, "reviewStatus", missingFields);

    const rawClaimState = getString(claim.claimState);
    if (rawClaimState && acceptedClaimStateSet.has(rawClaimState)) {
      claimState = rawClaimState as CompletionClaimState;
    } else {
      addMissing(missingFields, "claimState");
    }

    requireFalse(claim, "containsSecrets", missingFields);
    requireFalse(claim, "rawPromptTranscriptIncluded", missingFields);
    requireFalse(claim, "rawRuntimeLogsIncluded", missingFields);
    requireFalse(claim, "paymentOnlyProof", missingFields);
    requireFalse(claim, "claimsFromToolSuccess", missingFields);
    requireFalse(claim, "claimsFromProviderCallback", missingFields);
    requireFalse(claim, "claimsFromRuntimeLogs", missingFields);
    requireFalse(claim, "claimsFromA2ATask", missingFields);
    requireFalse(claim, "claimsFromMcpTool", missingFields);

    if (claimState !== "unknown") {
      for (const key of truthRequirements[claimState]) {
        requireTrue(claim, key, missingFields);
      }
    }

    if (
      claimState === "completed" &&
      !getString(claim.acceptedArtifactId) &&
      !getString(claim.artifactId)
    ) {
      addMissing(missingFields, "acceptedArtifactId or artifactId");
    }

    if (
      claimState === "proposal_submitted" &&
      !getString(claim.commitmentId)
    ) {
      addMissing(missingFields, "commitmentId");
    }

    if (
      (claimState === "proof_submitted" ||
        claimState === "waiting_for_owner_acceptance") &&
      !getString(claim.artifactId)
    ) {
      addMissing(missingFields, "artifactId");
    }

    if (
      (claimState === "waiting_for_owner_acceptance" ||
        claimState === "completed") &&
      !getString(claim.fulfillmentId)
    ) {
      addMissing(missingFields, "fulfillmentId");
    }

    if (
      claimState === "run_started_not_completed" &&
      !getString(claim.transactionId)
    ) {
      warnings.push(
        "Run-start claims that involve credits or money should include transactionId when payment or capacity moved."
      );
    }
  }

  const matchedRule =
    claimState === "unknown"
      ? undefined
      : profile.completionRules.find((rule) => rule.claimState === claimState);
  const passed = missingFields.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "validation_passed" : "validation_failed",
    acceptedClaimStates,
    claimState,
    matchedRuleId: matchedRule?.id ?? null,
    requiredTruth: matchedRule?.requiredTruth ?? [],
    completionProven: false,
    requestClosed: false,
    reviewAccepted: false,
    artifactPublished: false,
    fulfillmentAdvanced: false,
    requestEventWritten: false,
    paymentAuthorized: false,
    permissionGranted: false,
    durableWriteCreated: false,
    summary: passed
      ? "Completion claim packet is shaped for safe human-facing or monitor-facing language, but no completion proof, review acceptance, lifecycle mutation, payment authorization, or durable write was created."
      : "Completion claim packet is incomplete or overclaims authority. Fix missing fields before rendering or acting on the claim.",
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Use the claim language only with the canonical truth named in requiredTruth.",
          "Ask a human owner or reviewer before review-sensitive acceptance, closure, spend, or dispute decisions.",
          "Use governed routes for any Request, Fulfillment, Artifact, Transaction, or RequestEvent mutation.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Read /agents/completion.json and /agents/evidence.json before rendering completion language.",
          "Remove secrets, raw prompt transcripts, raw runtime logs, payment-only proof, and tool-success-only completion claims.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      completionTruthObjects: durableTruthObjects,
      validationIsNot,
      notCompletionTruth,
    },
  };
}

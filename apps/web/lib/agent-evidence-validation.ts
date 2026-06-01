type JsonRecord = Record<string, unknown>;

export type AgentEvidenceValidationResult = {
  schemaVersion: 1;
  status: "validation_passed" | "validation_failed";
  acceptedArtifactKinds: readonly string[];
  acceptedClaimStates: readonly string[];
  artifactPublished: false;
  reviewAccepted: false;
  completionProven: false;
  paymentAuthorized: false;
  permissionGranted: false;
  durableWriteCreated: false;
  summary: string;
  missingFields: string[];
  warnings: string[];
  nextSteps: string[];
  canonicalBoundary: {
    rootObject: "Request";
    evidenceTruthObject: "Artifact";
    validationIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const acceptedArtifactKinds = [
  "delivery",
  "evidence",
  "receipt",
  "handoff",
] as const;

const acceptedClaimStates = [
  "proof_submitted",
  "delivery_candidate",
  "receipt_attached",
  "handoff_note",
] as const;

const acceptedArtifactKindSet = new Set<string>(acceptedArtifactKinds);
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
  "permission grant",
  "artifact publication",
  "file storage",
  "review acceptance",
  "completion proof",
  "payment authorization",
  "durable RequestEvent",
] as const;

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

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
}

function addMissing(missingFields: string[], field: string) {
  if (!missingFields.includes(field)) {
    missingFields.push(field);
  }
}

function requireString(
  packet: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (!getString(packet[key])) {
    addMissing(missingFields, key);
  }
}

function requireFalse(
  packet: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (getBoolean(packet[key]) !== false) {
    addMissing(missingFields, `${key}=false`);
  }
}

export function validateAgentEvidencePayload(
  input: unknown
): AgentEvidenceValidationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Evidence validation is preflight-only and creates no durable Boreal business truth.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const packet = isRecord(input) ? input.packet : undefined;
  if (!isRecord(packet)) {
    addMissing(missingFields, "packet");
  } else {
    requireString(packet, "requestId", missingFields);
    requireString(packet, "title", missingFields);
    requireString(packet, "summary", missingFields);
    requireString(packet, "redactionStatement", missingFields);
    requireString(packet, "reviewRequest", missingFields);

    const artifactKind = getString(packet.artifactKind);
    if (!artifactKind || !acceptedArtifactKindSet.has(artifactKind)) {
      addMissing(missingFields, "artifactKind");
    }

    const claimState = getString(packet.claimState);
    if (!claimState || !acceptedClaimStateSet.has(claimState)) {
      addMissing(missingFields, "claimState");
    }

    if (!getString(packet.content) && !getString(packet.externalReference)) {
      addMissing(missingFields, "content or externalReference");
    }

    if (getStringArray(packet.evidenceClaims).length === 0) {
      addMissing(missingFields, "evidenceClaims[]");
    }

    if (getBoolean(packet.hasIdempotencyKey) !== true) {
      addMissing(missingFields, "hasIdempotencyKey=true");
    }

    requireFalse(packet, "containsSecrets", missingFields);
    requireFalse(packet, "rawRuntimeLogsIncluded", missingFields);
    requireFalse(packet, "rawPromptTranscriptIncluded", missingFields);
    requireFalse(packet, "paymentOnlyProof", missingFields);
    requireFalse(packet, "claimsCompletion", missingFields);

    if (!getString(packet.fulfillmentId) && !getString(packet.commitmentId)) {
      warnings.push(
        "No fulfillmentId or commitmentId was supplied; only submit proof without a lane reference when the live route policy allows direct-owner or request-level evidence."
      );
    }

    if (artifactKind === "receipt" && !getString(packet.transactionId)) {
      warnings.push(
        "Receipt evidence should include transactionId when the receipt supports payment, credit, provider, or settlement reconciliation."
      );
    }
  }

  const passed = missingFields.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "validation_passed" : "validation_failed",
    acceptedArtifactKinds,
    acceptedClaimStates,
    artifactPublished: false,
    reviewAccepted: false,
    completionProven: false,
    paymentAuthorized: false,
    permissionGranted: false,
    durableWriteCreated: false,
    summary: passed
      ? "Evidence packet shape is ready for a governed Artifact submission attempt, but no Artifact, review acceptance, completion proof, payment authorization, or durable event was created."
      : "Evidence packet shape is incomplete or overclaims proof authority. Fix missing fields before attempting Artifact submission.",
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Use the submit_artifact route only after auth, request policy, human approval, scope, and idempotency gates pass.",
          "Keep the same idempotency key only for the same Artifact payload.",
          "Treat owner acceptance and completion as downstream review states, not as proof-validation output.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Remove secrets, raw prompt transcripts, raw runtime logs, payment-only proof, and completion claims.",
          "Re-run action preflight before attempting the real submit_artifact route.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      evidenceTruthObject: "Artifact",
      validationIsNot,
      durableTruthObjects,
    },
  };
}

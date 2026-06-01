import { validateAgentIntakePayload } from "@/lib/agent-intake-validation";

type JsonRecord = Record<string, unknown>;

export type AgentAccessReviewPreparationResult = {
  schemaVersion: 1;
  status: "handoff_packet_ready" | "handoff_blocked";
  submissionIntent: "production_access_review" | "unknown";
  submissionMode: "manual_operator_review_handoff";
  intakeValidationStatus: "validation_passed" | "validation_failed";
  acceptedByProduction: false;
  reviewSubmissionCreated: false;
  credentialsIssued: false;
  permissionGranted: false;
  productionSandboxCreated: false;
  paymentAuthorized: false;
  completionProven: false;
  durableWriteCreated: false;
  packetSummary: {
    packetName: string | null;
    agentName: string | null;
    operatorContact: string | null;
    representedActorReference: string | null;
    requestedScopes: string[];
    intendedActions: string[];
    requestedRoutes: string[];
    requestedProtocolAdapters: string[];
    targetOnlyClaims: string[];
  };
  operatorHandoff: {
    kind: "agent_access_review_handoff";
    subject: string;
    requiredAttachments: string[];
    operatorChecks: string[];
    decisionOptions: string[];
    nextHumanActions: string[];
  };
  missingFields: string[];
  warnings: string[];
  nextSteps: string[];
  canonicalBoundary: {
    rootObject: "Request";
    preparationIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const durableTruthObjects = [
  "Request",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Artifact",
  "Transaction",
  "RequestEvent",
] as const;

const preparationIsNot = [
  "production credential",
  "production access grant",
  "operator approval record",
  "human approval record",
  "review submission",
  "production sandbox",
  "payment authorization",
  "completion proof",
  "durable RequestEvent",
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

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

function requireEqual(
  input: JsonRecord,
  path: string,
  expected: boolean | string,
  missingFields: string[]
) {
  if (atPath(input, path) !== expected) {
    addMissing(missingFields, `${path}=${String(expected)}`);
  }
}

function buildPacketSummary(packet: unknown) {
  const protocolClaims = atPath(packet, "protocolClaims");
  const targetOnlyClaims = isRecord(protocolClaims)
    ? Object.entries(protocolClaims)
        .filter(([, value]) => value === "target_only")
        .map(([key]) => key)
    : [];

  return {
    packetName: getString(atPath(packet, "name")),
    agentName: getString(atPath(packet, "applicant.agentName")),
    operatorContact: getString(atPath(packet, "applicant.operatorContact")),
    representedActorReference: getString(
      atPath(packet, "applicant.representedActor.reference")
    ),
    requestedScopes: getStringArray(atPath(packet, "requestedAccess.requestedScopes")),
    intendedActions: getStringArray(atPath(packet, "requestedAccess.intendedActions")),
    requestedRoutes: getStringArray(atPath(packet, "requestedAccess.requestedRoutes")),
    requestedProtocolAdapters: getStringArray(
      atPath(packet, "requestedAccess.requestedProtocolAdapters")
    ),
    targetOnlyClaims,
  };
}

export function prepareAgentAccessReviewPayload(
  input: unknown
): AgentAccessReviewPreparationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Access-review preparation creates no durable Boreal business truth and does not submit an operator review record.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const submissionIntent =
    isRecord(input) && input.submissionIntent === "production_access_review"
      ? "production_access_review"
      : "unknown";
  if (submissionIntent === "unknown") {
    addMissing(missingFields, "submissionIntent=production_access_review");
  }

  if (isRecord(input)) {
    requireEqual(
      input,
      "submissionMode",
      "manual_operator_review_handoff",
      missingFields
    );
    requireEqual(input, "operatorReviewRequired", true, missingFields);
    requireEqual(input, "notCredentialRequest", true, missingFields);
    requireEqual(input, "noSecretsIncluded", true, missingFields);
    requireEqual(input, "claimsProductionAccess", false, missingFields);
    requireEqual(input, "claimsProductionSandbox", false, missingFields);
  }

  const packet = isRecord(input) ? input.productionAccessPacket : undefined;
  if (!isRecord(packet)) {
    addMissing(missingFields, "productionAccessPacket");
  }

  const intakeValidation = validateAgentIntakePayload({
    schemaVersion: 1,
    intakeKind: "production_access_packet",
    payload: packet,
  });

  for (const field of intakeValidation.missingFields) {
    addMissing(missingFields, `productionAccessPacket.${field}`);
  }

  const packetSummary = buildPacketSummary(packet);
  const subject = packetSummary.agentName
    ? `Boreal agent access review: ${packetSummary.agentName}`
    : "Boreal agent access review";
  const passed = missingFields.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "handoff_packet_ready" : "handoff_blocked",
    submissionIntent,
    submissionMode: "manual_operator_review_handoff",
    intakeValidationStatus: intakeValidation.status,
    acceptedByProduction: false,
    reviewSubmissionCreated: false,
    credentialsIssued: false,
    permissionGranted: false,
    productionSandboxCreated: false,
    paymentAuthorized: false,
    completionProven: false,
    durableWriteCreated: false,
    packetSummary,
    operatorHandoff: {
      kind: "agent_access_review_handoff",
      subject,
      requiredAttachments: [
        "productionAccessPacket",
        "agentIntakeValidationResult",
        "sandboxReplayValidationResult when replay evidence is attached",
        "conformanceReport when production scopes are requested",
      ],
      operatorChecks: [
        "Requested scopes map one-to-one to intended actions and routes.",
        "Sandbox evidence covers every requested write class.",
        "Represented-human approval blocks commitments, artifact submission, spend, and completion claims where required.",
        "Protocol claims keep OAuth-compatible delegation, MCP, A2A, signed push, and x402 target-only unless a live route contract exists.",
        "No secrets, session cookies, bearer tokens, private keys, payment secrets, or wallet material are included.",
      ],
      decisionOptions: [
        "approved_public_read_only",
        "approved_scoped_pilot",
        "needs_more_evidence",
        "rejected",
      ],
      nextHumanActions: passed
        ? [
            "Send the handoff packet and attachments to a Boreal operator for manual review.",
            "Wait for an explicit operator decision before using live write routes as an external agent.",
            "Keep using public reads, account-session assisted actions, or resolver bearers only where existing route contracts allow them.",
          ]
        : [
            "Fix every missing field named by this response.",
            "Re-run intake validation and sandbox replay validation before manual operator handoff.",
            "Remove production-access, sandbox, credential, payment, and completion claims from the packet.",
          ],
    },
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Attach this response to the manual operator-review packet.",
          "Do not treat this handoff packet as a review submission, credential, permission grant, production sandbox, or approval.",
          "Use live HTTP routes only after separate auth, scope, request policy, idempotency, and human approval checks pass.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Validate the production access packet with POST /agents/intake/validate.",
          "Prepare a manual operator handoff only after the packet no longer overclaims authority.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      preparationIsNot,
      durableTruthObjects,
    },
  };
}

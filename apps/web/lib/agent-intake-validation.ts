type JsonRecord = Record<string, unknown>;

export type AgentIntakeKind =
  | "conformance_report"
  | "production_access_packet";

export type AgentIntakeValidationResult = {
  schemaVersion: 1;
  status: "validation_passed" | "validation_failed";
  intakeKind: AgentIntakeKind | "unknown";
  acceptedKinds: readonly AgentIntakeKind[];
  acceptedByProduction: false;
  reviewSubmissionCreated: false;
  credentialsIssued: false;
  permissionGranted: false;
  paymentAuthorized: false;
  completionProven: false;
  summary: string;
  missingFields: string[];
  warnings: string[];
  nextSteps: string[];
  canonicalBoundary: {
    rootObject: "Request";
    validationIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const acceptedKinds = [
  "conformance_report",
  "production_access_packet",
] as const satisfies readonly AgentIntakeKind[];

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
  "production credential",
  "permission grant",
  "operator approval record",
  "human approval record",
  "payment authorization",
  "completion proof",
  "production sandbox",
  "certification",
  "durable RequestEvent",
] as const;

const targetOnlyProtocolClaims = [
  "mcp",
  "a2a",
  "x402",
  "oauthCompatibleDelegation",
  "signedPushDelivery",
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function atPath(root: JsonRecord, path: string) {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (!isRecord(value)) {
      return undefined;
    }
    return value[segment];
  }, root);
}

function addMissing(missingFields: string[], field: string) {
  if (!missingFields.includes(field)) {
    missingFields.push(field);
  }
}

function requireEqual(
  payload: JsonRecord,
  path: string,
  expected: boolean | number | string,
  missingFields: string[]
) {
  if (atPath(payload, path) !== expected) {
    addMissing(missingFields, `${path}=${String(expected)}`);
  }
}

function requireArray(payload: JsonRecord, path: string, missingFields: string[]) {
  const value = atPath(payload, path);
  if (!Array.isArray(value) || value.length === 0) {
    addMissing(missingFields, `${path}[]`);
  }
}

function requireListIncludes(
  payload: JsonRecord,
  path: string,
  expectedItems: readonly string[],
  missingFields: string[]
) {
  const value = atPath(payload, path);
  if (!Array.isArray(value)) {
    addMissing(missingFields, `${path}[]`);
    return;
  }

  const actual = new Set(value.filter((item) => typeof item === "string"));
  for (const expected of expectedItems) {
    if (!actual.has(expected)) {
      addMissing(missingFields, `${path} includes ${expected}`);
    }
  }
}

function validateProtocolTargetOnly(
  payload: JsonRecord,
  missingFields: string[]
) {
  const claims = atPath(payload, "protocolClaims");
  if (!isRecord(claims)) {
    addMissing(missingFields, "protocolClaims");
    return;
  }

  for (const claim of targetOnlyProtocolClaims) {
    if (claim in claims && claims[claim] !== "target_only") {
      addMissing(missingFields, `protocolClaims.${claim}=target_only`);
    }
  }
}

function validateConformanceReport(
  payload: JsonRecord,
  missingFields: string[],
  warnings: string[]
) {
  requireEqual(payload, "reportKind", "agent_conformance_report", missingFields);
  requireArray(payload, "sourceProfiles", missingFields);
  requireEqual(
    payload,
    "requestedProductionAccess.status",
    "operator_review_required",
    missingFields
  );
  requireEqual(
    payload,
    "sandboxValidation.validationCommand",
    "pnpm contracts:agent-sandbox",
    missingFields
  );
  requireEqual(payload, "sandboxValidation.commandPassed", true, missingFields);
  requireEqual(
    payload,
    "sandboxValidation.notAcceptedByProduction",
    true,
    missingFields
  );
  requireArray(payload, "replayScenarioResults", missingFields);
  requireArray(payload, "checklistResults", missingFields);
  requireEqual(payload, "secretHandling.containsSecrets", false, missingFields);
  requireEqual(payload, "canonicalBoundary.rootObject", "Request", missingFields);
  requireListIncludes(
    payload,
    "canonicalBoundary.reportIsNot",
    [
      "production credential",
      "permission grant",
      "payment authorization",
      "completion proof",
    ],
    missingFields
  );
  validateProtocolTargetOnly(payload, missingFields);

  const replayResults = atPath(payload, "replayScenarioResults");
  if (Array.isArray(replayResults)) {
    const missingProductionBoundary = replayResults.some(
      (result) => isRecord(result) && result.productionEffects !== false
    );
    if (missingProductionBoundary) {
      addMissing(missingFields, "replayScenarioResults[].productionEffects=false");
    }
  }

  const requestedScopes = atPath(payload, "requestedProductionAccess.requestedScopes");
  if (!Array.isArray(requestedScopes) || requestedScopes.length === 0) {
    addMissing(missingFields, "requestedProductionAccess.requestedScopes[]");
  }

  warnings.push(
    "Conformance reports are operator-review input only; they do not certify an agent or grant production access."
  );
}

function validateProductionAccessPacket(
  payload: JsonRecord,
  missingFields: string[],
  warnings: string[]
) {
  requireEqual(
    payload,
    "packetKind",
    "agent_production_access_packet",
    missingFields
  );
  requireEqual(
    payload,
    "status",
    "target_operator_review_packet_example",
    missingFields
  );
  requireEqual(payload, "exampleOnly", true, missingFields);
  requireEqual(payload, "notAcceptedByProduction", true, missingFields);
  requireArray(payload, "sourceProfiles", missingFields);
  requireEqual(
    payload,
    "requestedAccess.status",
    "operator_review_required",
    missingFields
  );
  requireArray(payload, "requestedAccess.requestedScopes", missingFields);
  requireArray(payload, "requestedAccess.intendedActions", missingFields);
  requireEqual(
    payload,
    "sandboxEvidence.validationCommand",
    "pnpm contracts:agent-sandbox",
    missingFields
  );
  requireEqual(payload, "sandboxEvidence.commandPassed", true, missingFields);
  requireEqual(payload, "sandboxEvidence.productionEffects", false, missingFields);
  requireEqual(payload, "dataHandling.containsSecrets", false, missingFields);
  requireEqual(
    payload,
    "paymentAndSpendBoundary.paymentAuthorityRequested",
    false,
    missingFields
  );
  requireEqual(
    payload,
    "paymentAndSpendBoundary.x402Status",
    "target_only",
    missingFields
  );
  requireEqual(payload, "canonicalBoundary.rootObject", "Request", missingFields);
  requireListIncludes(
    payload,
    "canonicalBoundary.packetIsNot",
    [
      "production credential",
      "permission grant",
      "payment authorization",
      "completion proof",
      "production sandbox",
    ],
    missingFields
  );
  validateProtocolTargetOnly(payload, missingFields);

  warnings.push(
    "Production access packets are review input only; this endpoint does not create an access request or issue credentials."
  );
}

export function validateAgentIntakePayload(
  input: unknown
): AgentIntakeValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [
    "Validation is preflight-only and creates no durable Boreal business truth.",
  ];
  let intakeKind: AgentIntakeKind | "unknown" = "unknown";

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  if (isRecord(input) && acceptedKinds.includes(input.intakeKind as AgentIntakeKind)) {
    intakeKind = input.intakeKind as AgentIntakeKind;
  } else {
    addMissing(missingFields, "intakeKind");
  }

  const payload = isRecord(input) ? input.payload : undefined;
  if (!isRecord(payload)) {
    addMissing(missingFields, "payload");
  } else if (intakeKind === "conformance_report") {
    validateConformanceReport(payload, missingFields, warnings);
  } else if (intakeKind === "production_access_packet") {
    validateProductionAccessPacket(payload, missingFields, warnings);
  }

  const passed = missingFields.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "validation_passed" : "validation_failed",
    intakeKind,
    acceptedKinds,
    acceptedByProduction: false,
    reviewSubmissionCreated: false,
    credentialsIssued: false,
    permissionGranted: false,
    paymentAuthorized: false,
    completionProven: false,
    summary: passed
      ? "Packet shape is ready for human or operator review, but no access, approval, payment authority, or completion proof was created."
      : "Packet shape is incomplete or overclaims authority. Fix missing fields before review.",
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Attach this validation result to the human or operator review packet.",
          "Use live HTTP routes only where auth, scopes, request policy, and human approval allow the action.",
          "Keep MCP, A2A, x402, signed push delivery, and external-agent OAuth target-only until live adapter contracts exist.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Re-run the contract sandbox with pnpm contracts:agent-sandbox.",
          "Resubmit this endpoint only after target-only protocol and non-authority boundaries are explicit.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      validationIsNot,
      durableTruthObjects,
    },
  };
}

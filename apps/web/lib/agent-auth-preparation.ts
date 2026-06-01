import {
  buildAgentActionCatalog,
  buildAgentAuthProfile,
} from "@/lib/agent-discovery";

type JsonRecord = Record<string, unknown>;

export type AgentAuthPreparationResult = {
  schemaVersion: 1;
  status: "auth_plan_ready" | "auth_plan_blocked";
  preparationIntent: "agent_auth_route" | "unknown";
  actionId: string;
  requestedAuthScheme: string | null;
  acceptedActionIds: string[];
  credentialIssued: false;
  permissionGranted: false;
  approvalRecorded: false;
  productionAccessGranted: false;
  paymentAuthorized: false;
  completionProven: false;
  durableWriteCreated: false;
  authPlan: {
    actionId: string;
    actionName: string | null;
    actionAvailability: string | null;
    recommendedAuthScheme: string | null;
    allowedAuthOptions: string[];
    requiredScopes: string[];
    missingScopes: string[];
    humanApprovalRequired: boolean;
    hasHumanApproval: boolean;
    requestPolicyCheckRequired: boolean;
    hasRequestPolicyCheck: boolean;
    idempotencyRequired: boolean;
    hasIdempotencyKey: boolean;
    policyCheckpoint: string;
    canonicalWrites: readonly string[];
  };
  humanHandoff: {
    kind: "auth_preparation_handoff";
    requiredContext: string[];
    nextHumanActions: string[];
  };
  operatorReview: {
    requiredForProductionExternalAgent: boolean;
    accessReviewProfileUrl: "/agents/access-review.json";
    accessReviewPreparationUrl: "/agents/access-review/prepare";
    productionAccessPacketExampleUrl: "/agents/production-access-packet.example.json";
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
  "credential issuer",
  "permission grant",
  "human approval record",
  "operator approval record",
  "production access grant",
  "payment authorization",
  "completion proof",
  "durable RequestEvent",
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

function requireEqual(
  input: JsonRecord,
  key: string,
  expected: boolean | string,
  missingFields: string[]
) {
  if (input[key] !== expected) {
    addMissing(missingFields, `${key}=${String(expected)}`);
  }
}

function humanApprovalRequired(text: string | undefined) {
  return Boolean(text && !text.startsWith("not required"));
}

function policyCheckRequired(actionId: string) {
  return !["inspect_public_requests", "make_request_for_human"].includes(
    actionId
  );
}

function missingRequiredScopes(
  requestedAuthScheme: string | null,
  requestedScopes: string[],
  requiredScopes: string[]
) {
  const requestedScopeSet = new Set(requestedScopes);

  return requiredScopes.filter((scope) => {
    if (requestedAuthScheme === "none" && scope === "requests:read_public") {
      return false;
    }

    return !requestedScopeSet.has(scope);
  });
}

export function prepareAgentAuthPayload(
  input: unknown
): AgentAuthPreparationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Auth preparation creates no credential, permission grant, approval record, payment authority, completion proof, production access, or durable Boreal write.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const preparationIntent =
    isRecord(input) && input.preparationIntent === "agent_auth_route"
      ? "agent_auth_route"
      : "unknown";
  if (preparationIntent === "unknown") {
    addMissing(missingFields, "preparationIntent=agent_auth_route");
  }

  if (isRecord(input)) {
    requireEqual(input, "notCredentialRequest", true, missingFields);
    requireEqual(input, "noSecretsIncluded", true, missingFields);
    requireEqual(input, "claimsCredentialIssued", false, missingFields);
    requireEqual(input, "claimsPermissionGranted", false, missingFields);
    requireEqual(input, "claimsProductionAccess", false, missingFields);
    requireEqual(input, "claimsPaymentAuthority", false, missingFields);
  }

  const actionId = isRecord(input) ? getString(input.actionId) ?? "unknown" : "unknown";
  const requestedAuthScheme = isRecord(input)
    ? getString(input.requestedAuthScheme)
    : null;
  const requestedScopes = isRecord(input)
    ? getStringArray(input.requestedScopes)
    : [];
  const hasHumanApproval = isRecord(input)
    ? getBoolean(input.hasHumanApproval) === true
    : false;
  const hasRequestPolicyCheck = isRecord(input)
    ? getBoolean(input.hasRequestPolicyCheck) === true
    : false;
  const hasIdempotencyKey = isRecord(input)
    ? getBoolean(input.hasIdempotencyKey) === true
    : false;

  const actionCatalog = buildAgentActionCatalog();
  const acceptedActionIds = actionCatalog.map((action) => action.id);
  const action = actionCatalog.find((candidate) => candidate.id === actionId);
  const authRequirement = buildAgentAuthProfile().actionAuthRequirements.find(
    (requirement) => requirement.actionId === actionId
  );

  if (!action || !authRequirement) {
    addMissing(missingFields, "actionId");
  }

  const allowedAuthOptions = authRequirement?.authOptions ?? [];
  const recommendedAuthScheme =
    requestedAuthScheme && allowedAuthOptions.includes(requestedAuthScheme)
      ? requestedAuthScheme
      : allowedAuthOptions[0] ?? null;

  if (
    requestedAuthScheme &&
    allowedAuthOptions.length > 0 &&
    !allowedAuthOptions.includes(requestedAuthScheme)
  ) {
    addMissing(missingFields, "requestedAuthScheme allowed for actionId");
  }

  const requiredScopes = authRequirement?.requiredScopes ?? [];
  const missingScopes = missingRequiredScopes(
    requestedAuthScheme,
    requestedScopes,
    requiredScopes
  );
  for (const scope of missingScopes) {
    addMissing(missingFields, `requestedScopes includes ${scope}`);
  }

  const needsHumanApproval = humanApprovalRequired(
    authRequirement?.humanApproval
  );
  if (needsHumanApproval && !hasHumanApproval) {
    addMissing(missingFields, "hasHumanApproval=true");
  }

  const needsPolicyCheck = policyCheckRequired(actionId);
  if (needsPolicyCheck && !hasRequestPolicyCheck) {
    addMissing(missingFields, "hasRequestPolicyCheck=true");
  }

  if (authRequirement?.idempotencyRequired && !hasIdempotencyKey) {
    addMissing(missingFields, "hasIdempotencyKey=true");
  }

  if (requestedAuthScheme === "external_oauth2") {
    warnings.push(
      "OAuth-compatible external-agent auth is target direction; prepare an access-review packet before claiming production external-agent access."
    );
  }

  const passed = missingFields.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "auth_plan_ready" : "auth_plan_blocked",
    preparationIntent,
    actionId,
    requestedAuthScheme,
    acceptedActionIds,
    credentialIssued: false,
    permissionGranted: false,
    approvalRecorded: false,
    productionAccessGranted: false,
    paymentAuthorized: false,
    completionProven: false,
    durableWriteCreated: false,
    authPlan: {
      actionId,
      actionName: action?.name ?? null,
      actionAvailability: action?.availability ?? null,
      recommendedAuthScheme,
      allowedAuthOptions,
      requiredScopes,
      missingScopes,
      humanApprovalRequired: needsHumanApproval,
      hasHumanApproval,
      requestPolicyCheckRequired: needsPolicyCheck,
      hasRequestPolicyCheck,
      idempotencyRequired: authRequirement?.idempotencyRequired ?? false,
      hasIdempotencyKey,
      policyCheckpoint:
        authRequirement?.policyCheckpoint ??
        "Read agentActionPolicy before attempting writes.",
      canonicalWrites: action?.canonicalWrites ?? [],
    },
    humanHandoff: {
      kind: "auth_preparation_handoff",
      requiredContext: [
        "represented human or account",
        "actionId",
        "requestedAuthScheme",
        "requestedScopes",
        "requestId when the action is request-bound",
        "human approval state when the action can mutate or spend",
        "agentActionPolicy result before any live write",
      ],
      nextHumanActions: passed
        ? [
            "Use the recommended auth scheme only through the live route that already accepts it.",
            "Keep the represented human in the loop for writes, spend, review, and completion claims.",
            "Re-run action preflight before calling any governed mutation route.",
          ]
        : [
            "Fix every missing field named by this response.",
            "Use the auth profile and action preflight endpoint before attempting live routes.",
            "Do not ask users to share raw session cookies, passwords, bearer tokens, private keys, or payment credentials.",
          ],
    },
    operatorReview: {
      requiredForProductionExternalAgent:
        requestedAuthScheme === "external_oauth2" ||
        Boolean(allowedAuthOptions.some((option) => option.includes("target"))),
      accessReviewProfileUrl: "/agents/access-review.json",
      accessReviewPreparationUrl: "/agents/access-review/prepare",
      productionAccessPacketExampleUrl:
        "/agents/production-access-packet.example.json",
    },
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Treat this auth plan as preparation only, not as a credential or permission grant.",
          "Read request-specific agentActionPolicy before writes.",
          "Use action preflight, idempotency, and human approval gates before any governed mutation.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Prepare a narrower scope set and rerun auth preparation.",
          "Use access-review preparation for external-agent production access requests.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      preparationIsNot,
      durableTruthObjects,
    },
  };
}

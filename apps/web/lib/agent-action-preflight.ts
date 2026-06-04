import {
  buildAgentActionCatalog,
  type AgentActionAvailability,
} from "@/lib/agent-discovery";

type JsonRecord = Record<string, unknown>;

export type AgentActionPreflightRequest = {
  schemaVersion: 1;
  actionId: string;
  requestId?: string;
  representedActor?: {
    kind?: string;
    reference?: string;
  };
  intendedUse?: string;
  hasHumanApproval?: boolean;
  hasIdempotencyKey?: boolean;
  requestedScopes?: string[];
  payloadSummary?: string;
  requestFit?: {
    selectedSupplyId?: string;
    selectedSupplyStatus?: string;
    requestSupplyKinds?: string[];
    requestOutputKinds?: string[];
    selectedSupplyKinds?: string[];
    selectedOutputKinds?: string[];
  };
};

export type AgentActionPreflightResult = {
  schemaVersion: 1;
  status: "preflight_passed" | "preflight_failed";
  actionId: string;
  acceptedActionIds: readonly string[];
  actionAvailability: AgentActionAvailability | "unknown";
  actionName: string | null;
  requiredAuth: string | null;
  requiredScopes: readonly string[];
  idempotencyRequired: boolean;
  humanApprovalRequired: boolean;
  representedActorRequired: boolean;
  requestIdRequired: boolean;
  payloadSummaryRecommended: boolean;
  canonicalReads: readonly string[];
  canonicalWrites: readonly string[];
  requiredContracts: readonly string[];
  entrypoints: readonly string[];
  standards: readonly string[];
  missingRequirements: string[];
  warnings: string[];
  nextSteps: string[];
  permissionGranted: false;
  approvalRecorded: false;
  credentialIssued: false;
  paymentAuthorized: false;
  completionProven: false;
  durableWriteCreated: false;
  canonicalBoundary: {
    rootObject: "Request";
    preflightIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const actionPreflightRules = {
  inspect_public_requests: {
    requiredScopes: [],
    requestIdRequired: false,
    representedActorRequired: false,
    humanApprovalRequired: false,
    idempotencyRequired: false,
    payloadSummaryRecommended: false,
    warnings: [
      "Public inspection must stay inside public-safe Request and Supply projections.",
    ],
  },
  make_request_for_human: {
    requiredScopes: [],
    requestIdRequired: false,
    representedActorRequired: true,
    humanApprovalRequired: false,
    idempotencyRequired: false,
    payloadSummaryRecommended: true,
    warnings: [
      "Passing preflight only supports draft work; opening, funding, or publishing still needs explicit buyer approval.",
    ],
  },
  apply_to_request: {
    requiredScopes: ["commitments:propose"],
    requestIdRequired: true,
    representedActorRequired: true,
    humanApprovalRequired: true,
    idempotencyRequired: true,
    payloadSummaryRecommended: true,
    warnings: [
      "Owner acceptance must happen before cross-actor fulfillment starts.",
    ],
  },
  create_owner_private_fulfillment: {
    requiredScopes: ["fulfillments:create"],
    requestIdRequired: true,
    representedActorRequired: true,
    humanApprovalRequired: true,
    idempotencyRequired: true,
    payloadSummaryRecommended: true,
    warnings: [
      "Use only for owner-private direct fulfillment with selected Supply and ownerPrivateDirectApproval evidence.",
      "Passing preflight does not create Fulfillment truth or publish artifacts.",
    ],
  },
  submit_artifact: {
    requiredScopes: ["artifacts:publish"],
    requestIdRequired: true,
    representedActorRequired: true,
    humanApprovalRequired: true,
    idempotencyRequired: true,
    payloadSummaryRecommended: true,
    warnings: [
      "Artifact submission is proof input only; completion still requires review and closure rules.",
    ],
  },
  monitor_request: {
    requiredScopes: [],
    requestIdRequired: true,
    representedActorRequired: false,
    humanApprovalRequired: false,
    idempotencyRequired: false,
    payloadSummaryRecommended: false,
    warnings: [
      "Private request activity requires requests:read_activity scope even though public activity can be monitored without resolver scope.",
      "Monitoring heartbeats are not durable RequestEvent truth by default.",
    ],
  },
  run_public_solution: {
    requiredScopes: [],
    requestIdRequired: true,
    representedActorRequired: true,
    humanApprovalRequired: true,
    idempotencyRequired: true,
    payloadSummaryRecommended: true,
    warnings: [
      "Paid or credit-consuming execution still requires account-session buyer authorization and request-attached Transaction reconciliation.",
    ],
  },
  optimize_request_brief: {
    requiredScopes: [],
    requestIdRequired: true,
    representedActorRequired: false,
    humanApprovalRequired: false,
    idempotencyRequired: false,
    payloadSummaryRecommended: true,
    warnings: [
      "Optimization output is draft-only unless the owner approves a canonical mutation path.",
      "Do not invent budget, deadline, proof expectations, deliverables, actor requirements, or constraints.",
    ],
  },
} as const;

type AgentActionId = keyof typeof actionPreflightRules;

const durableTruthObjects = [
  "Request",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Artifact",
  "Transaction",
  "RequestEvent",
] as const;

const preflightIsNot = [
  "production credential",
  "permission grant",
  "human approval record",
  "operator approval record",
  "payment authorization",
  "completion proof",
  "artifact publication",
  "commitment proposal",
  "request mutation",
  "durable RequestEvent",
] as const;

const acceptedActionIds = Object.keys(actionPreflightRules);
const selectedSupplyFitActionIds: readonly AgentActionId[] = [
  "apply_to_request",
  "create_owner_private_fulfillment",
];

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

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
    .map((item) => item.trim());
}

function normalizeStringSet(values: readonly string[]) {
  return Array.from(new Set(values));
}

function valuesOverlap(
  leftValues: readonly string[],
  rightValues: readonly string[],
) {
  const rightSet = new Set(rightValues);
  return leftValues.some((value) => rightSet.has(value));
}

function normalizeRequestFit(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    selectedSupplyId: getString(value.selectedSupplyId),
    selectedSupplyStatus: getString(value.selectedSupplyStatus),
    requestSupplyKinds: normalizeStringSet(
      getStringArray(value.requestSupplyKinds),
    ),
    requestOutputKinds: normalizeStringSet(
      getStringArray(value.requestOutputKinds),
    ),
    selectedSupplyKinds: normalizeStringSet(
      getStringArray(value.selectedSupplyKinds),
    ),
    selectedOutputKinds: normalizeStringSet(
      getStringArray(value.selectedOutputKinds),
    ),
  };
}

function validateSelectedSupplyRequestFit({
  actionId,
  missingRequirements,
  requestFit,
}: {
  actionId: AgentActionId | undefined;
  missingRequirements: string[];
  requestFit: ReturnType<typeof normalizeRequestFit>;
}) {
  if (!actionId || !selectedSupplyFitActionIds.includes(actionId)) {
    return;
  }

  if (!requestFit?.selectedSupplyId) {
    addMissing(missingRequirements, "requestFit.selectedSupplyId");
  }

  if (requestFit?.selectedSupplyStatus !== "published") {
    addMissing(missingRequirements, "requestFit.selectedSupplyStatus=published");
  }

  if (
    (requestFit?.requestSupplyKinds.length ?? 0) > 0 &&
    (requestFit?.selectedSupplyKinds.length ?? 0) === 0
  ) {
    addMissing(missingRequirements, "requestFit.selectedSupplyKinds");
  }

  if (
    (requestFit?.requestSupplyKinds.length ?? 0) > 0 &&
    (requestFit?.selectedSupplyKinds.length ?? 0) > 0 &&
    !valuesOverlap(
      requestFit?.requestSupplyKinds ?? [],
      requestFit?.selectedSupplyKinds ?? [],
    )
  ) {
    addMissing(
      missingRequirements,
      "requestFit.selectedSupplyKinds overlaps requestSupplyKinds",
    );
  }

  if (
    (requestFit?.requestOutputKinds.length ?? 0) > 0 &&
    (requestFit?.selectedOutputKinds.length ?? 0) === 0
  ) {
    addMissing(missingRequirements, "requestFit.selectedOutputKinds");
  }

  if (
    (requestFit?.requestOutputKinds.length ?? 0) > 0 &&
    (requestFit?.selectedOutputKinds.length ?? 0) > 0 &&
    !valuesOverlap(
      requestFit?.requestOutputKinds ?? [],
      requestFit?.selectedOutputKinds ?? [],
    )
  ) {
    addMissing(
      missingRequirements,
      "requestFit.selectedOutputKinds overlaps requestOutputKinds",
    );
  }
}

function addMissing(missingRequirements: string[], requirement: string) {
  if (!missingRequirements.includes(requirement)) {
    missingRequirements.push(requirement);
  }
}

function normalizeInput(input: unknown) {
  const missingRequirements: string[] = [];

  if (!isRecord(input)) {
    addMissing(missingRequirements, "request body");
    return {
      actionId: "unknown",
      hasHumanApproval: undefined,
      hasIdempotencyKey: undefined,
      intendedUse: undefined,
      missingRequirements,
      payloadSummary: undefined,
      representedActor: undefined,
      requestedScopes: [],
      requestFit: undefined,
      requestId: undefined,
      schemaVersion: undefined,
    };
  }

  const representedActor = isRecord(input.representedActor)
    ? {
        kind: getString(input.representedActor.kind),
        reference: getString(input.representedActor.reference),
      }
    : undefined;

  return {
    actionId: getString(input.actionId) ?? "unknown",
    hasHumanApproval: getBoolean(input.hasHumanApproval),
    hasIdempotencyKey: getBoolean(input.hasIdempotencyKey),
    intendedUse: getString(input.intendedUse),
    missingRequirements,
    payloadSummary: getString(input.payloadSummary),
    representedActor,
    requestedScopes: getStringArray(input.requestedScopes),
    requestFit: normalizeRequestFit(input.requestFit),
    requestId: getString(input.requestId),
    schemaVersion: input.schemaVersion,
  };
}

export function validateAgentActionPreflight(
  input: unknown
): AgentActionPreflightResult {
  const normalized = normalizeInput(input);
  const missingRequirements = [...normalized.missingRequirements];

  if (normalized.schemaVersion !== 1) {
    addMissing(missingRequirements, "schemaVersion=1");
  }

  const actionId = acceptedActionIds.includes(normalized.actionId)
    ? (normalized.actionId as AgentActionId)
    : undefined;
  if (!actionId) {
    addMissing(missingRequirements, "actionId");
  }

  const action = buildAgentActionCatalog().find(
    (candidate) => candidate.id === normalized.actionId
  );
  const rule = actionId ? actionPreflightRules[actionId] : undefined;
  const requestedScopeSet = new Set(normalized.requestedScopes);
  const requiredScopes = rule?.requiredScopes ?? [];

  if (rule?.requestIdRequired && !normalized.requestId) {
    addMissing(missingRequirements, "requestId");
  }

  if (
    rule?.representedActorRequired &&
    !normalized.representedActor?.reference
  ) {
    addMissing(missingRequirements, "representedActor.reference");
  }

  if (rule?.humanApprovalRequired && normalized.hasHumanApproval !== true) {
    addMissing(missingRequirements, "hasHumanApproval=true");
  }

  if (rule?.idempotencyRequired && normalized.hasIdempotencyKey !== true) {
    addMissing(missingRequirements, "hasIdempotencyKey=true");
  }

  for (const scope of requiredScopes) {
    if (!requestedScopeSet.has(scope)) {
      addMissing(missingRequirements, `requestedScopes includes ${scope}`);
    }
  }

  validateSelectedSupplyRequestFit({
    actionId,
    missingRequirements,
    requestFit: normalized.requestFit,
  });

  const warnings = [
    "Action preflight is validation-only and creates no durable Boreal business truth.",
    ...(rule?.warnings ?? []),
  ];

  if (rule?.payloadSummaryRecommended && !normalized.payloadSummary) {
    warnings.push(
      "Include payloadSummary before attempting the real route so humans and operators can review intent without inspecting private raw payloads."
    );
  }

  if (
    actionId === "monitor_request" &&
    !requestedScopeSet.has("requests:read_activity")
  ) {
    warnings.push(
      "If the target request is private, add requests:read_activity scope or use an authorized account session before polling activity."
    );
  }

  if (
    actionId === "make_request_for_human" &&
    normalized.hasHumanApproval !== true
  ) {
    warnings.push(
      "Without explicit buyer approval, keep the operation as a private draft and do not open, fund, or publish the Request."
    );
  }

  const passed = missingRequirements.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "preflight_passed" : "preflight_failed",
    actionId: action?.id ?? normalized.actionId,
    acceptedActionIds,
    actionAvailability: action?.availability ?? "unknown",
    actionName: action?.name ?? null,
    requiredAuth: action?.auth ?? null,
    requiredScopes,
    idempotencyRequired: rule?.idempotencyRequired ?? false,
    humanApprovalRequired: rule?.humanApprovalRequired ?? false,
    representedActorRequired: rule?.representedActorRequired ?? false,
    requestIdRequired: rule?.requestIdRequired ?? false,
    payloadSummaryRecommended: rule?.payloadSummaryRecommended ?? false,
    canonicalReads: action?.canonicalReads ?? [],
    canonicalWrites: action?.canonicalWrites ?? [],
    requiredContracts: action?.contracts ?? [],
    entrypoints: action?.entrypoints ?? [],
    standards: action?.standards ?? [],
    missingRequirements,
    warnings,
    nextSteps: passed
      ? [
          "Use the listed entrypoints and contracts for the real governed route.",
          "Carry the same idempotency key and human approval evidence when the route requires them.",
          "Treat this response as preflight evidence only; re-check live request policy, auth, scope, payment, and proof gates at execution time.",
        ]
      : [
          "Fix every missing requirement named by this response.",
          "Re-run preflight before attempting the real route.",
          "Escalate to the represented human when approval, scope, payment, proof, or request access is uncertain.",
        ],
    permissionGranted: false,
    approvalRecorded: false,
    credentialIssued: false,
    paymentAuthorized: false,
    completionProven: false,
    durableWriteCreated: false,
    canonicalBoundary: {
      rootObject: "Request",
      preflightIsNot,
      durableTruthObjects,
    },
  };
}

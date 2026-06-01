import { buildAgentOptimizationProfile } from "@/lib/agent-discovery";

type JsonRecord = Record<string, unknown>;

export type AgentOptimizationPreparationResult = {
  schemaVersion: 1;
  status: "optimization_plan_ready" | "optimization_plan_blocked";
  preparationIntent: "optimize_without_writing" | "unknown";
  surfaceId: string;
  requestId: string | null;
  acceptedSurfaceIds: string[];
  requestedOutputMode: string | null;
  durableWriteCreated: false;
  requestMutated: false;
  commitmentSubmitted: false;
  artifactPublished: false;
  fulfillmentStarted: false;
  ownerApprovalRecorded: false;
  policyOverridden: false;
  permissionGranted: false;
  paymentAuthorized: false;
  completionProven: false;
  optimizationPlan: {
    surfaceId: string;
    intent: string | null;
    defaultMode: string | null;
    primaryActionId: string | null;
    canonicalReads: readonly string[];
    canonicalWrites: readonly string[];
    maySuggest: readonly string[];
    mustNotInvent: readonly string[];
    ownerApprovalRequiredFor: string | null;
    outputContract: {
      durableWriteDefault: false;
      requiredFields: readonly string[];
      forbiddenFields: readonly string[];
    };
    recommendedOutputMode: string;
    nextPreflightUrl: "/agents/actions/preflight";
    humanHandoffProfileUrl: "/agents/human-handoffs.json";
  };
  draftHandoff: {
    kind: "optimization_preparation_handoff";
    requiredContext: string[];
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
  "optimization engine",
  "durable mutation",
  "owner approval record",
  "planner override",
  "policy override",
  "permission grant",
  "Artifact publication",
  "Commitment submission",
  "Fulfillment start",
  "payment authorization",
  "completion proof",
  "durable RequestEvent",
] as const;

const acceptedOutputModes = [
  "suggested_patch",
  "suggested_text",
  "missing_questions",
  "analysis_note",
  "owner_review_packet",
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

function recommendedOutputMode(defaultMode: string | undefined) {
  return defaultMode === "analysis_only" ? "analysis_note" : "suggested_patch";
}

export function prepareAgentOptimizationPayload(
  input: unknown
): AgentOptimizationPreparationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Optimization preparation creates no optimized content, durable mutation, owner approval, policy override, permission grant, payment authorization, completion proof, or durable Boreal write.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const preparationIntent =
    isRecord(input) && input.preparationIntent === "optimize_without_writing"
      ? "optimize_without_writing"
      : "unknown";
  if (preparationIntent === "unknown") {
    addMissing(missingFields, "preparationIntent=optimize_without_writing");
  }

  if (isRecord(input)) {
    requireEqual(input, "hasSourceContext", true, missingFields);
    requireEqual(input, "willInventMissingFacts", false, missingFields);
    requireEqual(input, "claimsDurableWrite", false, missingFields);
    requireEqual(input, "claimsOwnerApproval", false, missingFields);
    requireEqual(input, "claimsPolicyOverride", false, missingFields);
    requireEqual(input, "claimsPermissionGrant", false, missingFields);
    requireEqual(input, "claimsPaymentAuthority", false, missingFields);
    requireEqual(input, "claimsCompletion", false, missingFields);
    requireEqual(input, "containsSecrets", false, missingFields);
    requireEqual(input, "rawPromptTranscriptIncluded", false, missingFields);
    requireEqual(input, "rawRuntimeLogsIncluded", false, missingFields);
  }

  const profile = buildAgentOptimizationProfile();
  const acceptedSurfaceIds = profile.optimizationSurfaces.map(
    (surface) => surface.id
  );
  const surfaceId = isRecord(input)
    ? getString(input.surfaceId) ?? "unknown"
    : "unknown";
  const surface = profile.optimizationSurfaces.find(
    (candidate) => candidate.id === surfaceId
  );
  const requestId = isRecord(input) ? getString(input.requestId) : null;
  const requestedOutputMode = isRecord(input)
    ? getString(input.requestedOutputMode)
    : null;

  if (!surface) {
    addMissing(missingFields, "surfaceId");
  }

  if (!requestId) {
    addMissing(missingFields, "requestId");
  }

  if (
    requestedOutputMode &&
    !acceptedOutputModes.includes(
      requestedOutputMode as (typeof acceptedOutputModes)[number]
    )
  ) {
    addMissing(missingFields, "requestedOutputMode");
  }

  if (getBoolean(isRecord(input) ? input.hasOwnerApproval : undefined)) {
    warnings.push(
      "Owner approval still must be recorded through a governed live route; this preparation result does not record approval."
    );
  }

  const passed = missingFields.length === 0;
  const outputMode =
    requestedOutputMode ?? recommendedOutputMode(surface?.defaultMode);

  return {
    schemaVersion: 1,
    status: passed ? "optimization_plan_ready" : "optimization_plan_blocked",
    preparationIntent,
    surfaceId,
    requestId,
    acceptedSurfaceIds,
    requestedOutputMode,
    durableWriteCreated: false,
    requestMutated: false,
    commitmentSubmitted: false,
    artifactPublished: false,
    fulfillmentStarted: false,
    ownerApprovalRecorded: false,
    policyOverridden: false,
    permissionGranted: false,
    paymentAuthorized: false,
    completionProven: false,
    optimizationPlan: {
      surfaceId,
      intent: surface?.intent ?? null,
      defaultMode: surface?.defaultMode ?? null,
      primaryActionId: surface?.primaryActionId ?? null,
      canonicalReads: surface?.reads ?? [],
      canonicalWrites: surface?.canonicalWrites ?? [],
      maySuggest: surface?.maySuggest ?? [],
      mustNotInvent: surface?.mustNotInvent ?? [],
      ownerApprovalRequiredFor: surface?.ownerApprovalRequiredFor ?? null,
      outputContract: {
        durableWriteDefault: false,
        requiredFields: profile.outputContract.requiredFields,
        forbiddenFields: profile.outputContract.forbiddenFields,
      },
      recommendedOutputMode: outputMode,
      nextPreflightUrl: "/agents/actions/preflight",
      humanHandoffProfileUrl: "/agents/human-handoffs.json",
    },
    draftHandoff: {
      kind: "optimization_preparation_handoff",
      requiredContext: [
        "requestId",
        "surfaceId",
        "source Request fields visible to the actor",
        "source Artifact, Commitment, Fulfillment, Transaction, or RequestEvent refs when the surface reads them",
        "missingDetails separated from assumptions",
        "explicit statement that durableWrite=false",
      ],
      nextHumanActions: passed
        ? [
            "Review the optimization output as a draft, suggestion, missing-question list, or analysis note.",
            "Approve any meaning-changing mutation before the agent uses a governed live route.",
            "Run action preflight again before any save, apply, submit, run, retry, payment, or completion-sensitive action.",
          ]
        : [
            "Fix every missing field named by this response.",
            "Use one accepted surfaceId from the optimization profile.",
            "Remove secrets, raw prompt transcripts, runtime logs, durable-write claims, owner-approval claims, payment claims, and completion claims.",
          ],
    },
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Generate optimization output locally using the returned output contract and no-invention rules.",
          "Keep the output draft-only until a human owner approves a governed mutation path.",
          "Use action preflight before any live route that could write Request, Commitment, Artifact, Fulfillment, Transaction, or RequestEvent truth.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Read /agents/optimization.json before producing suggestions.",
          "Do not treat optimization preparation as permission, approval, proof, payment authority, or durable mutation.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      preparationIsNot,
      durableTruthObjects,
    },
  };
}

import { buildAgentSandboxManifest } from "@/lib/agent-sandbox";

type JsonRecord = Record<string, unknown>;

export type AgentSandboxReplayValidationResult = {
  schemaVersion: 1;
  status: "validation_passed" | "validation_failed";
  acceptedScenarioIds: string[];
  scenarioId: string;
  scenarioTitle: string | null;
  coveredActions: readonly string[];
  expectedCanonicalWrites: readonly string[];
  expectedTerminalClaimState: string | null;
  missingFields: string[];
  warnings: string[];
  nextSteps: string[];
  acceptedByProduction: false;
  reviewSubmissionCreated: false;
  credentialsIssued: false;
  permissionGranted: false;
  productionSandboxCreated: false;
  paymentAuthorized: false;
  completionProven: false;
  durableWriteCreated: false;
  canonicalBoundary: {
    rootObject: "Request";
    validationIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const validationIsNot = [
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

function requireFalse(
  replay: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (getBoolean(replay[key]) !== false) {
    addMissing(missingFields, `${key}=false`);
  }
}

function requireTrue(
  replay: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (getBoolean(replay[key]) !== true) {
    addMissing(missingFields, `${key}=true`);
  }
}

export function validateAgentSandboxReplayPayload(
  input: unknown
): AgentSandboxReplayValidationResult {
  const manifest = buildAgentSandboxManifest();
  const scenarioIds = manifest.scenarios.map((scenario) => scenario.id);
  const flowIds = new Set<string>(manifest.flows.map((flow) => flow.id));
  const durableTruthObjects = manifest.canonicalBoundary.durableWrites;
  const durableTruthObjectSet = new Set<string>(durableTruthObjects);
  const missingFields: string[] = [];
  const warnings = [
    "Sandbox replay validation is preflight-only and creates no durable Boreal business truth.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const replay = isRecord(input) ? input.replay : undefined;
  let scenarioId = "unknown";
  let scenario:
    | ReturnType<typeof buildAgentSandboxManifest>["scenarios"][number]
    | undefined;

  if (!isRecord(replay)) {
    addMissing(missingFields, "replay");
  } else {
    scenarioId = getString(replay.scenarioId) ?? "unknown";
    scenario = manifest.scenarios.find(
      (candidate) => candidate.id === scenarioId
    );

    if (!scenario) {
      addMissing(missingFields, "scenarioId");
    }

    if (getString(replay.validationCommand) !== manifest.validationCommand) {
      addMissing(
        missingFields,
        `validationCommand=${manifest.validationCommand}`
      );
    }

    requireTrue(replay, "notAcceptedByProduction", missingFields);
    requireFalse(replay, "productionEffects", missingFields);
    requireTrue(replay, "usesMockCredentialsOnly", missingFields);
    requireFalse(replay, "mockCredentialsUsedInProduction", missingFields);
    requireFalse(replay, "secretsIncluded", missingFields);
    requireFalse(replay, "claimsProductionAccess", missingFields);
    requireFalse(replay, "claimsCompletion", missingFields);

    const completedSteps = Array.isArray(replay.completedSteps)
      ? replay.completedSteps.filter(isRecord)
      : [];
    if (completedSteps.length === 0) {
      addMissing(missingFields, "completedSteps[]");
    }

    if (scenario) {
      const completedStepIds = completedSteps.map((step) => getString(step.id));
      const expectedStepIds = scenario.steps.map((step) => step.id);
      const expectedStepIdSet = new Set<string>(expectedStepIds);

      for (const expectedStep of scenario.steps) {
        if (!completedStepIds.includes(expectedStep.id)) {
          addMissing(missingFields, `completedSteps includes ${expectedStep.id}`);
        }
      }

      const completedExpectedOrder = completedSteps
        .map((step) => getString(step.id))
        .filter((id): id is string =>
          id !== undefined && expectedStepIdSet.has(id)
        );

      const expectedOrderPrefix = expectedStepIds.slice(
        0,
        completedExpectedOrder.length
      );
      if (
        completedExpectedOrder.length > 0 &&
        completedExpectedOrder.some((id, index) => id !== expectedOrderPrefix[index])
      ) {
        addMissing(missingFields, "completedSteps order matches scenario");
      }

      for (const completedStep of completedSteps) {
        const stepId = getString(completedStep.id);
        const flowId = getString(completedStep.flowId);
        const expectedStep = scenario.steps.find((step) => step.id === stepId);

        if (!stepId) {
          addMissing(missingFields, "completedSteps[].id");
        }

        if (!flowId || !flowIds.has(flowId)) {
          addMissing(missingFields, "completedSteps[].flowId");
        }

        if (expectedStep && flowId !== expectedStep.flowId) {
          addMissing(missingFields, `${stepId}.flowId=${expectedStep.flowId}`);
        }

        if (getBoolean(completedStep.productionWrite) !== false) {
          addMissing(missingFields, `${stepId ?? "completedStep"}.productionWrite=false`);
        }

        const writes = getStringArray(completedStep.writes);
        for (const write of writes) {
          if (!durableTruthObjectSet.has(write)) {
            addMissing(missingFields, `${stepId ?? "completedStep"}.writes canonical`);
            break;
          }
        }

        if (expectedStep) {
          const expectedWrites = new Set<string>(expectedStep.writes);
          for (const write of writes) {
            if (!expectedWrites.has(write)) {
              addMissing(missingFields, `${stepId}.writes within expected step writes`);
              break;
            }
          }

          if (
            expectedStep.idempotencyKey &&
            getString(completedStep.idempotencyKey) !== expectedStep.idempotencyKey
          ) {
            addMissing(missingFields, `${stepId}.idempotencyKey`);
          }
        }
      }

      const observedTerminalState = isRecord(replay.observedTerminalState)
        ? replay.observedTerminalState
        : undefined;
      if (!observedTerminalState) {
        addMissing(missingFields, "observedTerminalState");
      } else {
        if (
          getString(observedTerminalState.claimState) !==
          scenario.expectedTerminalState.claimState
        ) {
          addMissing(
            missingFields,
            `observedTerminalState.claimState=${scenario.expectedTerminalState.claimState}`
          );
        }

        for (const [key, expectedValue] of Object.entries(
          scenario.expectedTerminalState
        )) {
          if (
            key !== "claimState" &&
            typeof expectedValue === "boolean" &&
            getBoolean(observedTerminalState[key]) !== expectedValue
          ) {
            addMissing(missingFields, `observedTerminalState.${key}=${expectedValue}`);
          }
        }
      }
    }

    if (isRecord(replay.representedActor) && !getString(replay.representedActor.reference)) {
      warnings.push(
        "representedActor.reference is absent; include it when replay evidence will be attached to a production access packet."
      );
    }
  }

  const passed = missingFields.length === 0;

  return {
    schemaVersion: 1,
    status: passed ? "validation_passed" : "validation_failed",
    acceptedScenarioIds: scenarioIds,
    scenarioId,
    scenarioTitle: scenario?.title ?? null,
    coveredActions: scenario?.coveredActions ?? [],
    expectedCanonicalWrites: scenario?.expectedCanonicalWrites ?? [],
    expectedTerminalClaimState:
      scenario?.expectedTerminalState.claimState ?? null,
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Attach this validation result to a conformance report or production access packet only as sandbox evidence.",
          "Keep mock credentials, sample ids, and replay transcripts out of production mutation attempts.",
          "Use live auth, request-specific agentActionPolicy, scopes, idempotency, and human approval before touching real objects.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Replay the scenario in manifest order with mock credentials only.",
          "Remove production access claims, completion claims, secrets, and production effects before using the replay as evidence.",
        ],
    acceptedByProduction: false,
    reviewSubmissionCreated: false,
    credentialsIssued: false,
    permissionGranted: false,
    productionSandboxCreated: false,
    paymentAuthorized: false,
    completionProven: false,
    durableWriteCreated: false,
    canonicalBoundary: {
      rootObject: "Request",
      validationIsNot,
      durableTruthObjects,
    },
  };
}

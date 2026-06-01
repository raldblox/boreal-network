import { validateAgentMonitoringPayload } from "@/lib/agent-monitoring-validation";

type JsonRecord = Record<string, unknown>;

export type AgentMonitoringPreparationResult = {
  schemaVersion: 1;
  status: "monitor_plan_ready" | "monitor_plan_blocked";
  preparationIntent: "monitor_request" | "unknown";
  preparationMode: "monitor_execution_plan";
  validationStatus: "validation_passed" | "validation_failed";
  pollingReady: boolean;
  signedWebhookTargetReady: boolean;
  activityReadCreated: false;
  subscriptionPersisted: false;
  pushDeliveryActivated: false;
  heartbeatEventCreated: false;
  requestEventWritten: false;
  completionProven: false;
  paymentAuthorized: false;
  permissionGranted: false;
  durableWriteCreated: false;
  monitorSummary: {
    mode: string | null;
    requestId: string | null;
    visibility: string | null;
    requestedScopes: string[];
    escalationTriggers: string[];
    cursorAfterSequence: number | null;
    pollIntervalSeconds: number | null;
    pollLimit: number | null;
    callbackUrl: string | null;
  };
  cursorPollPlan: {
    status: "live_cursor_polling_baseline";
    method: "GET";
    routeTemplate: "/api/requests/{requestId}/activity";
    query: {
      after_sequence: number | null;
      limit: number;
    };
    cursorToPersist: "cursor.nextAfterSequence";
    minimumIntervalSeconds: 30;
    recommendedIntervalSeconds: number;
    backoffOn: string[];
    canonicalReads: readonly string[];
    canonicalWrites: readonly [];
  };
  escalationHandoff: {
    kind: "monitor_escalation_handoff";
    triggers: string[];
    requiredContext: string[];
    nextHumanActions: string[];
  };
  targetWebhookReceiver: {
    status: "target_receiver_shape_only";
    profileUrl: "/agents/monitor-webhooks.md";
    subscriptionEndpointLive: false;
    deliveryWorkerLive: false;
    useFor: string;
  };
  missingFields: string[];
  warnings: string[];
  nextSteps: string[];
  canonicalBoundary: {
    rootObject: "Request";
    activityTruthObject: "RequestEvent";
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
  "request activity read",
  "subscription record",
  "push delivery implementation",
  "heartbeat event",
  "durable RequestEvent",
  "permission grant",
  "payment authorization",
  "completion proof",
] as const;

const canonicalReads = [
  "Request",
  "RequestEvent",
  "Artifact",
  "Transaction",
  "Fulfillment",
  "Commitment",
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

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
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

function getCursorAfterSequence(monitor: unknown) {
  return (
    getNumber(atPath(monitor, "cursor.nextAfterSequence")) ??
    getNumber(atPath(monitor, "cursor.afterSequence"))
  );
}

function buildMonitorSummary(monitor: unknown) {
  return {
    mode: getString(atPath(monitor, "mode")),
    requestId: getString(atPath(monitor, "requestId")),
    visibility: getString(atPath(monitor, "visibility")),
    requestedScopes: getStringArray(atPath(monitor, "requestedScopes")),
    escalationTriggers: getStringArray(atPath(monitor, "escalationTriggers")),
    cursorAfterSequence: getCursorAfterSequence(monitor),
    pollIntervalSeconds: getNumber(atPath(monitor, "poll.intervalSeconds")),
    pollLimit: getNumber(atPath(monitor, "poll.limit")),
    callbackUrl: getString(atPath(monitor, "webhook.callbackUrl")),
  };
}

export function prepareAgentMonitoringPayload(
  input: unknown
): AgentMonitoringPreparationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Monitoring preparation creates no request activity read, subscription, push delivery, heartbeat event, permission grant, payment authorization, completion proof, or durable Boreal write.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const preparationIntent =
    isRecord(input) && input.preparationIntent === "monitor_request"
      ? "monitor_request"
      : "unknown";
  if (preparationIntent === "unknown") {
    addMissing(missingFields, "preparationIntent=monitor_request");
  }

  if (isRecord(input)) {
    requireEqual(
      input,
      "preparationMode",
      "monitor_execution_plan",
      missingFields
    );
    requireEqual(input, "claimsActivityRead", false, missingFields);
    requireEqual(input, "createsSubscription", false, missingFields);
    requireEqual(input, "activatesPushDelivery", false, missingFields);
    requireEqual(input, "createsHeartbeatEvents", false, missingFields);
    requireEqual(input, "claimsCompletion", false, missingFields);
    requireEqual(input, "claimsDurableWrite", false, missingFields);
  }

  const monitor = isRecord(input) ? input.monitor : undefined;
  const validation = validateAgentMonitoringPayload({
    schemaVersion: 1,
    monitor,
  });

  for (const field of validation.missingFields) {
    addMissing(missingFields, `monitor.${field}`);
  }

  const monitorSummary = buildMonitorSummary(monitor);
  const pollLimit = monitorSummary.pollLimit ?? 40;
  const recommendedIntervalSeconds = Math.max(
    monitorSummary.pollIntervalSeconds ?? 60,
    30
  );
  const passed = missingFields.length === 0;
  const isSignedWebhookTarget =
    monitorSummary.mode === "signed_webhook_target" &&
    validation.signedWebhookTargetReady;

  return {
    schemaVersion: 1,
    status: passed ? "monitor_plan_ready" : "monitor_plan_blocked",
    preparationIntent,
    preparationMode: "monitor_execution_plan",
    validationStatus: validation.status,
    pollingReady: validation.pollingReady,
    signedWebhookTargetReady: validation.signedWebhookTargetReady,
    activityReadCreated: false,
    subscriptionPersisted: false,
    pushDeliveryActivated: false,
    heartbeatEventCreated: false,
    requestEventWritten: false,
    completionProven: false,
    paymentAuthorized: false,
    permissionGranted: false,
    durableWriteCreated: false,
    monitorSummary,
    cursorPollPlan: {
      status: "live_cursor_polling_baseline",
      method: "GET",
      routeTemplate: "/api/requests/{requestId}/activity",
      query: {
        after_sequence: monitorSummary.cursorAfterSequence,
        limit: Math.min(Math.max(pollLimit, 1), 100),
      },
      cursorToPersist: "cursor.nextAfterSequence",
      minimumIntervalSeconds: 30,
      recommendedIntervalSeconds,
      backoffOn: [
        "401 or missing scope",
        "403 private request access denied",
        "409 cursor or idempotency conflict",
        "429 rate limit",
        "5xx unknown server state until request truth is re-read",
      ],
      canonicalReads,
      canonicalWrites: [],
    },
    escalationHandoff: {
      kind: "monitor_escalation_handoff",
      triggers: monitorSummary.escalationTriggers,
      requiredContext: [
        "requestId",
        "last persisted cursor.nextAfterSequence",
        "latest durable RequestEvent ids or sequence numbers seen",
        "latest Artifact, Transaction, Fulfillment, or Commitment refs involved",
        "reason the monitor escalated instead of claiming completion",
      ],
      nextHumanActions: passed
        ? [
            "Poll request activity from the prepared cursor only when the actor has public or authorized read access.",
            "Persist cursor.nextAfterSequence after each successful read outside RequestEvent history.",
            "Escalate stale activity, missing proof, blocked fulfillment, payment uncertainty, or owner-review needs through the human handoff profile.",
          ]
        : [
            "Fix every missing field named by this response.",
            "Re-run POST /agents/monitoring/validate before monitoring the Request.",
            "Remove subscription, push-delivery, heartbeat, payment, durable-write, and completion claims.",
          ],
    },
    targetWebhookReceiver: {
      status: "target_receiver_shape_only",
      profileUrl: "/agents/monitor-webhooks.md",
      subscriptionEndpointLive: false,
      deliveryWorkerLive: false,
      useFor: isSignedWebhookTarget
        ? "Receiver implementation readiness only; no Boreal push subscription or delivery was created."
        : "Read the profile only if preparing a future signed receiver; cursor polling remains the live baseline.",
    },
    missingFields,
    warnings: [...warnings, ...validation.warnings],
    nextSteps: passed
      ? [
          "Use cursor polling as the live monitor baseline.",
          "Treat target signed webhooks as receiver-shape readiness only until a live subscription contract exists.",
          "Do not claim payment, completion, permission, subscription, or durable activity writes from this preparation result.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Run the monitoring validation endpoint before attempting a live activity read.",
          "Keep monitor output tied to RequestEvent, Artifact, Transaction, Fulfillment, and Commitment truth.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      activityTruthObject: "RequestEvent",
      preparationIsNot,
      durableTruthObjects,
    },
  };
}

import {
  agentMonitorWebhookSignatureVersion,
  agentMonitorWebhookTimestampToleranceSeconds,
} from "@/lib/agent-monitor-webhook-signature";

type JsonRecord = Record<string, unknown>;

export type AgentMonitoringValidationResult = {
  schemaVersion: 1;
  status: "validation_passed" | "validation_failed";
  acceptedModes: readonly string[];
  acceptedEscalationTriggers: readonly string[];
  pollingReady: boolean;
  signedWebhookTargetReady: boolean;
  subscriptionPersisted: false;
  pushDeliveryActivated: false;
  heartbeatEventCreated: false;
  requestEventWritten: false;
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
    activityTruthObject: "RequestEvent";
    validationIsNot: readonly string[];
    durableTruthObjects: readonly string[];
  };
};

const acceptedModes = ["poll_cursor", "signed_webhook_target"] as const;

const acceptedEscalationTriggers = [
  "owner_review_needed",
  "missing_or_unreviewable_proof",
  "payment_uncertain",
  "blocked_fulfillment",
  "private_access_or_scope_missing",
  "stale_activity",
] as const;

const acceptedModeSet = new Set<string>(acceptedModes);
const acceptedEscalationTriggerSet = new Set<string>(
  acceptedEscalationTriggers
);

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
  "request activity read",
  "subscription record",
  "push delivery implementation",
  "heartbeat event",
  "durable RequestEvent",
  "completion proof",
  "payment authorization",
  "payment reconciliation",
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

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
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
  monitor: JsonRecord,
  key: string,
  missingFields: string[]
) {
  if (getBoolean(monitor[key]) !== false) {
    addMissing(missingFields, `${key}=false`);
  }
}

function hasCursorCheckpoint(cursor: unknown) {
  if (!isRecord(cursor)) {
    return false;
  }

  const afterSequence = getNumber(cursor.afterSequence);
  const nextAfterSequence = getNumber(cursor.nextAfterSequence);

  return (
    (afterSequence !== undefined && afterSequence >= 0) ||
    (nextAfterSequence !== undefined && nextAfterSequence >= 0)
  );
}

export function validateAgentMonitoringPayload(
  input: unknown
): AgentMonitoringValidationResult {
  const missingFields: string[] = [];
  const warnings = [
    "Monitoring validation is preflight-only and creates no durable Boreal business truth.",
  ];

  if (!isRecord(input)) {
    addMissing(missingFields, "request body");
  }

  if (isRecord(input) && input.schemaVersion !== 1) {
    addMissing(missingFields, "schemaVersion=1");
  }

  const monitor = isRecord(input) ? input.monitor : undefined;
  let mode: string | undefined;
  let pollingReady = false;
  let signedWebhookTargetReady = false;

  if (!isRecord(monitor)) {
    addMissing(missingFields, "monitor");
  } else {
    mode = getString(monitor.mode);

    if (!mode || !acceptedModeSet.has(mode)) {
      addMissing(missingFields, "mode");
    }

    if (!getString(monitor.requestId)) {
      addMissing(missingFields, "requestId");
    }

    if (getBoolean(monitor.storesCursor) !== true) {
      addMissing(missingFields, "storesCursor=true");
    }

    requireFalse(monitor, "createsHeartbeatEvents", missingFields);
    requireFalse(monitor, "claimsCompletion", missingFields);
    requireFalse(monitor, "includesPrivatePayloads", missingFields);

    const requestedScopes = getStringArray(monitor.requestedScopes);
    const requestedScopeSet = new Set(requestedScopes);
    const visibility = getString(monitor.visibility) ?? "unknown";
    const hasRequestAccess = getBoolean(monitor.hasRequestAccess);

    if (
      visibility === "private" &&
      hasRequestAccess !== true &&
      !requestedScopeSet.has("requests:read_activity")
    ) {
      addMissing(
        missingFields,
        "hasRequestAccess=true or requestedScopes includes requests:read_activity"
      );
    }

    if (visibility === "unknown") {
      warnings.push(
        "Request visibility is unknown; private activity still requires owner access, account session authority, or requests:read_activity scope."
      );
    }

    const escalationTriggers = getStringArray(monitor.escalationTriggers);
    if (escalationTriggers.length === 0) {
      addMissing(missingFields, "escalationTriggers[]");
    }

    for (const trigger of escalationTriggers) {
      if (!acceptedEscalationTriggerSet.has(trigger)) {
        addMissing(missingFields, `accepted escalationTriggers[]`);
        break;
      }
    }

    if (mode === "poll_cursor") {
      if (!hasCursorCheckpoint(monitor.cursor)) {
        addMissing(missingFields, "cursor.afterSequence or cursor.nextAfterSequence");
      }

      const poll = isRecord(monitor.poll) ? monitor.poll : undefined;
      const intervalSeconds = getNumber(poll?.intervalSeconds);
      const limit = getNumber(poll?.limit);

      if (intervalSeconds === undefined) {
        warnings.push(
          "Poll interval was not supplied; use a bounded local interval and back off on rate limits."
        );
      } else if (intervalSeconds < 30) {
        warnings.push(
          "Poll interval below 30 seconds can create unnecessary monitor load; prefer backoff unless the live route policy allows it."
        );
      }

      if (limit !== undefined && (limit < 1 || limit > 100)) {
        addMissing(missingFields, "poll.limit between 1 and 100");
      }
    }

    if (mode === "signed_webhook_target") {
      const webhook = isRecord(monitor.webhook) ? monitor.webhook : undefined;

      if (!webhook) {
        addMissing(missingFields, "webhook");
      } else {
        if (!getString(webhook.callbackUrl)) {
          addMissing(missingFields, "webhook.callbackUrl");
        }

        if (
          getString(webhook.signatureVersion) !==
          agentMonitorWebhookSignatureVersion
        ) {
          addMissing(
            missingFields,
            `webhook.signatureVersion=${agentMonitorWebhookSignatureVersion}`
          );
        }

        if (getBoolean(webhook.canVerifySignature) !== true) {
          addMissing(missingFields, "webhook.canVerifySignature=true");
        }

        const tolerance = getNumber(webhook.timestampToleranceSeconds);
        if (
          tolerance === undefined ||
          tolerance > agentMonitorWebhookTimestampToleranceSeconds ||
          tolerance < 0
        ) {
          addMissing(
            missingFields,
            `webhook.timestampToleranceSeconds<=${agentMonitorWebhookTimestampToleranceSeconds}`
          );
        }
      }

      warnings.push(
        "Signed monitor webhooks are target-only until subscription persistence and delivery workers are live; keep cursor polling as the production baseline."
      );
    }
  }

  const passed = missingFields.length === 0;
  pollingReady = passed && mode === "poll_cursor";
  signedWebhookTargetReady = passed && mode === "signed_webhook_target";

  return {
    schemaVersion: 1,
    status: passed ? "validation_passed" : "validation_failed",
    acceptedModes,
    acceptedEscalationTriggers,
    pollingReady,
    signedWebhookTargetReady,
    subscriptionPersisted: false,
    pushDeliveryActivated: false,
    heartbeatEventCreated: false,
    requestEventWritten: false,
    completionProven: false,
    paymentAuthorized: false,
    permissionGranted: false,
    durableWriteCreated: false,
    summary: passed
      ? "Monitoring plan shape is ready for a cursor-safe monitor attempt, but no request activity read, subscription, push delivery, heartbeat event, permission, payment, completion proof, or durable event was created."
      : "Monitoring plan shape is incomplete or overclaims monitor authority. Fix missing fields before polling, implementing target webhooks, or escalating work.",
    missingFields,
    warnings,
    nextSteps: passed
      ? [
          "Use cursor polling as the live production baseline and persist cursor.nextAfterSequence outside RequestEvent history.",
          "Escalate owner review, missing proof, blocked fulfillment, payment uncertainty, stale activity, or private-scope failures through the human handoff profile.",
          "Treat signed webhooks as a receiver-shape target until Boreal ships subscription persistence and delivery.",
        ]
      : [
          "Fix every missing field named by this response.",
          "Remove heartbeat event writes, completion claims, private payload echoes, and payment authority claims.",
          "Re-run action preflight and read the monitoring profile before attempting real activity polling.",
        ],
    canonicalBoundary: {
      rootObject: "Request",
      activityTruthObject: "RequestEvent",
      validationIsNot,
      durableTruthObjects,
    },
  };
}

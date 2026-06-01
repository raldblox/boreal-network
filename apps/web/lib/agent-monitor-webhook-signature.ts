import { createHmac, timingSafeEqual } from "node:crypto";

export const agentMonitorWebhookSignatureVersion = "v1";
export const agentMonitorWebhookTimestampToleranceSeconds = 300;

export type AgentMonitorWebhookSignatureInput = {
  body: string;
  deliveryId: string;
  secret: string;
  timestamp: number;
};

export function buildAgentMonitorWebhookSignedPayload({
  body,
  deliveryId,
  timestamp,
}: Omit<AgentMonitorWebhookSignatureInput, "secret">) {
  return [
    "boreal-agent-monitor-webhook-v1",
    deliveryId,
    String(timestamp),
    body,
  ].join("\n");
}

export function createAgentMonitorWebhookSignature({
  body,
  deliveryId,
  secret,
  timestamp,
}: AgentMonitorWebhookSignatureInput) {
  const signature = createHmac("sha256", secret)
    .update(
      buildAgentMonitorWebhookSignedPayload({
        body,
        deliveryId,
        timestamp,
      })
    )
    .digest("hex");

  return `${agentMonitorWebhookSignatureVersion}=${signature}`;
}

export function verifyAgentMonitorWebhookSignature({
  body,
  deliveryId,
  now = Date.now(),
  secret,
  signatureHeader,
  timestamp,
  toleranceSeconds = agentMonitorWebhookTimestampToleranceSeconds,
}: AgentMonitorWebhookSignatureInput & {
  now?: number;
  signatureHeader: string;
  toleranceSeconds?: number;
}) {
  if (
    deliveryId.trim().length === 0 ||
    secret.trim().length === 0 ||
    !Number.isSafeInteger(timestamp) ||
    !Number.isFinite(now) ||
    toleranceSeconds < 0
  ) {
    return false;
  }

  const nowSeconds = Math.floor(now / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const expectedSignature = createAgentMonitorWebhookSignature({
    body,
    deliveryId,
    secret,
    timestamp,
  });

  return extractVersionedSignatures(signatureHeader).some((signature) =>
    timingSafeStringEqual(signature, expectedSignature)
  );
}

function extractVersionedSignatures(signatureHeader: string) {
  return signatureHeader
    .split(",")
    .map((part) => part.trim())
    .filter((part) =>
      part.startsWith(`${agentMonitorWebhookSignatureVersion}=`)
    );
}

function timingSafeStringEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

import type { FulfillmentStatus } from "@/lib/request";

export type BorealWorkerFulfillmentExecutionControlStatus = Extract<
  FulfillmentStatus,
  "planned" | "ready" | "active" | "blocked"
>;

const executionControlStatuses = new Set<FulfillmentStatus>([
  "planned",
  "ready",
  "active",
  "blocked",
]);

export function canControlBorealWorkerFulfillmentExecution(
  status: FulfillmentStatus
): status is BorealWorkerFulfillmentExecutionControlStatus {
  return executionControlStatuses.has(status);
}

export function canStartBorealWorkerFulfillmentExecution(
  status: FulfillmentStatus
) {
  return status === "planned" || status === "ready";
}

export function shouldResumeBorealWorkerExecutionFromMetadata(
  status: BorealWorkerFulfillmentExecutionControlStatus
) {
  return status === "active" || status === "blocked";
}

export function getBorealWorkerExecutionProviderStatus(
  status: BorealWorkerFulfillmentExecutionControlStatus
) {
  switch (status) {
    case "blocked":
      return "retrying";
    case "active":
      return "running";
    case "planned":
    case "ready":
      return "starting";
  }
}

export function getBorealWorkerExecutionSummary({
  displayName,
  status,
}: {
  displayName: string;
  status: BorealWorkerFulfillmentExecutionControlStatus;
}) {
  switch (status) {
    case "blocked":
      return `${displayName} resumed this delivery lane.`;
    case "active":
      return `${displayName} is checking provider delivery progress.`;
    case "planned":
    case "ready":
      return `${displayName} started this delivery lane.`;
  }
}

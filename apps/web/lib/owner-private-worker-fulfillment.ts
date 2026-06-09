import {
  getBorealWorkerKeyFromSupply,
  type BorealWorkerStarterKey,
} from "@/lib/boreal-workers/starter-catalog";
import type {
  BorealRequestDraft,
  RequestFulfillment,
  RequestStatus,
} from "@/lib/request";
import type { BorealSupplyDraft } from "@/lib/supply";

const ownerPrivateWorkerStartableStatuses = new Set<RequestStatus>([
  "open",
  "funded",
  "in_progress",
  "waiting_for_owner",
]);

export type OwnerPrivateWorkerFulfillmentStart = {
  supplyId: string;
  supplyLabel: string;
  workerKey: BorealWorkerStarterKey;
};

export function buildOwnerPrivateWorkerFulfillmentStartPayload({
  idempotencyKey,
  supplyId,
  supplyLabel,
  workerKey,
}: {
  idempotencyKey: string;
  supplyId: string;
  supplyLabel?: string | null;
  workerKey: string;
}) {
  return {
    idempotencyKey,
    initialStatus: "planned" as const,
    summary: `${
      supplyLabel?.trim() || "Selected Boreal worker"
    } is approved for an owner-private fulfillment lane.`,
    supplyId,
    ownerPrivateDirectApproval: {
      mode: "trusted_worker_auto_approval" as const,
      approvedByOwner: true as const,
      selectedSupplyId: supplyId,
      workerKey,
    },
    metadata: {
      createdFrom: "request_workroom_owner_private_worker_start",
      providerCallsStarted: false,
      selectedSupplyId: supplyId,
      workerKey,
    },
  };
}

export function getOwnerPrivateWorkerFulfillmentStart({
  activeFulfillment,
  hasCreateAction,
  isReadonly,
  isRequestOwner,
  request,
  supply,
}: {
  activeFulfillment: RequestFulfillment | null;
  hasCreateAction: boolean;
  isReadonly: boolean;
  isRequestOwner: boolean;
  request: BorealRequestDraft;
  supply: BorealSupplyDraft | null;
}): OwnerPrivateWorkerFulfillmentStart | null {
  if (
    isReadonly ||
    !isRequestOwner ||
    request.visibility !== "private" ||
    !hasCreateAction ||
    activeFulfillment ||
    !ownerPrivateWorkerStartableStatuses.has(request.status)
  ) {
    return null;
  }

  if (
    !supply ||
    supply.status !== "published" ||
    request.routing.preferredSupplyId !== supply.id ||
    !doesSupplyMatchRequest(request, supply)
  ) {
    return null;
  }

  const workerKey = getBorealWorkerKeyFromSupply(supply);
  if (!workerKey) {
    return null;
  }

  return {
    supplyId: supply.id,
    supplyLabel: getSupplyLabel(supply),
    workerKey,
  };
}

function getSupplyLabel(
  supply: Pick<BorealSupplyDraft, "key" | "profile"> | null | undefined,
) {
  return (
    supply?.profile.displayName.trim() || supply?.key || "Selected Boreal worker"
  );
}

function doesSupplyMatchRequest(
  request: Pick<BorealRequestDraft, "seeking"> | null | undefined,
  supply: Pick<BorealSupplyDraft, "capability"> | null | undefined,
) {
  const requestedKinds = request?.seeking.supplyKinds ?? [];

  if (requestedKinds.length === 0) {
    return true;
  }

  const supplyKinds = supply?.capability.supplyKinds ?? [];
  return requestedKinds.some((kind) => supplyKinds.includes(kind));
}

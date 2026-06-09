export type OwnerPrivateDirectWorkerGateRequest = {
  visibility?: string | null;
  status?: string | null;
  routing?: {
    preferredSupplyId?: string | null;
  } | null;
  ownerApproval?: {
    trustedWorkerAutoApproval?: boolean | null;
    allowedWorkerKeys?: readonly string[] | null;
    selectedSupplyId?: string | null;
  } | null;
};

export type OwnerPrivateDirectWorkerGateResult = {
  allowed: boolean;
  reasons: string[];
  rejectedBy: string[];
  selectedSupplyId: string | null;
};

export function evaluateOwnerPrivateDirectWorkerGates({
  request,
  suppliedSupplyId,
  workerKey,
}: {
  request: OwnerPrivateDirectWorkerGateRequest;
  suppliedSupplyId?: string | null;
  workerKey: string;
}): OwnerPrivateDirectWorkerGateResult {
  const reasons: string[] = [];
  const rejectedBy: string[] = [];

  if (request.visibility !== "private") {
    return {
      allowed: false,
      reasons,
      rejectedBy: ["not_owner_private_request"],
      selectedSupplyId: null,
    };
  }

  const selectedSupplyId =
    request.ownerApproval?.selectedSupplyId?.trim() ||
    request.routing?.preferredSupplyId?.trim() ||
    null;
  const allowedWorkerKeys =
    request.ownerApproval?.allowedWorkerKeys
      ?.map((allowedWorkerKey) => allowedWorkerKey.trim())
      .filter((allowedWorkerKey) => allowedWorkerKey.length > 0) ?? [];
  const normalizedSuppliedSupplyId = suppliedSupplyId?.trim() || null;

  if (!isDirectOwnerPrivateStatus(request.status ?? undefined)) {
    rejectedBy.push("private_request_status_not_direct_eligible");
  }

  if (request.ownerApproval?.trustedWorkerAutoApproval !== true) {
    rejectedBy.push("owner_auto_approval_not_enabled");
  }

  if (
    allowedWorkerKeys.length > 0 &&
    !allowedWorkerKeys.includes(workerKey)
  ) {
    rejectedBy.push("worker_not_owner_auto_approved");
  }

  if (!selectedSupplyId) {
    rejectedBy.push("selected_supply_required_for_auto_approval");
  } else if (
    normalizedSuppliedSupplyId &&
    normalizedSuppliedSupplyId !== selectedSupplyId
  ) {
    rejectedBy.push("selected_supply_mismatch");
  }

  if (rejectedBy.length === 0) {
    reasons.push("owner_private_auto_approval_gates_present");
  }

  return {
    allowed: rejectedBy.length === 0,
    reasons,
    rejectedBy,
    selectedSupplyId,
  };
}

export function isDirectOwnerPrivateStatus(status: string | undefined) {
  return (
    status === "open" ||
    status === "funded" ||
    status === "in_progress" ||
    status === "waiting_for_owner"
  );
}

type RequestBoundarySupply = {
  ownerId: string;
  status: string;
  capability?: {
    outputKinds?: readonly string[] | null;
    supplyKinds?: readonly string[] | null;
  } | null;
  bindings?: {
    resolverClientId?: string | null;
  } | null;
};

type RequestBoundaryRequest = {
  brief?: {
    outputKinds?: readonly string[] | null;
  } | null;
  seeking?: {
    supplyKinds?: readonly string[] | null;
  } | null;
};

export function assertSupplyCanAttachToCommitment({
  actorResolverClientId,
  actorUserId,
  request,
  supply,
}: {
  actorResolverClientId?: string;
  actorUserId: string;
  request?: RequestBoundaryRequest;
  supply: RequestBoundarySupply;
}) {
  if (supply.ownerId !== actorUserId) {
    throw new Error("Supply does not belong to commitment actor");
  }

  if (supply.status !== "published") {
    throw new Error("Published supply required");
  }

  if (
    actorResolverClientId &&
    supply.bindings?.resolverClientId &&
    supply.bindings.resolverClientId !== actorResolverClientId
  ) {
    throw new Error("Supply is not bound to this resolver client");
  }

  if (request) {
    assertSupplyMatchesRequest({ request, supply });
  }
}

export function assertSupplyMatchesRequest({
  request,
  supply,
}: {
  request: RequestBoundaryRequest;
  supply: RequestBoundarySupply;
}) {
  const requestedSupplyKinds = normalizeBoundaryList(
    request.seeking?.supplyKinds,
  );
  const supplyKinds = normalizeBoundaryList(supply.capability?.supplyKinds);
  if (
    requestedSupplyKinds.length > 0 &&
    supplyKinds.length > 0 &&
    !listsOverlap(requestedSupplyKinds, supplyKinds)
  ) {
    throw new Error("Supply does not match request supply kinds");
  }

  const requestedOutputKinds = normalizeBoundaryList(request.brief?.outputKinds);
  const supplyOutputKinds = normalizeBoundaryList(supply.capability?.outputKinds);
  if (
    requestedOutputKinds.length > 0 &&
    supplyOutputKinds.length > 0 &&
    !listsOverlap(requestedOutputKinds, supplyOutputKinds)
  ) {
    throw new Error("Supply does not match request output kinds");
  }
}

function normalizeBoundaryList(values: readonly string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function listsOverlap(leftValues: string[], rightValues: string[]) {
  const rightSet = new Set(rightValues);
  return leftValues.some((value) => rightSet.has(value));
}

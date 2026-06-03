type RequestBoundarySupply = {
  ownerId: string;
  status: string;
  bindings?: {
    resolverClientId?: string | null;
  } | null;
};

export function assertSupplyCanAttachToCommitment({
  actorResolverClientId,
  actorUserId,
  supply,
}: {
  actorResolverClientId?: string;
  actorUserId: string;
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
}

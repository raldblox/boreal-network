import "server-only";

import {
  createInitialSupplyDraft,
  applySupplyPatch,
  getSupplyPublishReadiness,
  type BorealSupplyDraft,
  type SupplyPatch,
  type SupplyPreset,
} from "@/lib/supply";
import { generateUUID } from "@/lib/utils";
import {
  deleteSupplyById,
  getSupplyById,
  getSupplyUsageSummaryById,
  saveSupplyDraft,
  toSupplyDraft,
  updateSupplyDraftById,
} from "./db/queries";

export async function createSupplyDraft({
  userId,
  preset = "agent_worker",
}: {
  userId: string;
  preset?: SupplyPreset;
}): Promise<BorealSupplyDraft> {
  const now = new Date().toISOString();
  const supplyId = generateUUID();
  const draft = createInitialSupplyDraft({
    id: supplyId,
    userId,
    preset,
    createdAt: now,
  });

  await saveSupplyDraft({
    id: draft.id,
    key: draft.key,
    ownerId: draft.ownerId,
    status: draft.status,
    visibility: draft.visibility,
    profile: draft.profile,
    capability: draft.capability,
    availability: draft.availability,
    pricing: draft.pricing,
    source: draft.source,
    bindings: draft.bindings,
    metadata: draft.metadata,
  });

  return draft;
}

export async function persistSupplyPatch({
  supplyId,
  userId,
  patch,
}: {
  supplyId: string;
  userId: string;
  patch: SupplyPatch;
}): Promise<BorealSupplyDraft> {
  const existingSupply = await getSupplyById({ id: supplyId });
  if (!existingSupply) {
    throw new Error("Supply not found");
  }

  if (existingSupply.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  if (existingSupply.status === "retired") {
    throw new Error("Retired supply cannot be changed");
  }

  if (patch.visibility === "public") {
    throw new Error("Public supply publish not enabled yet");
  }

  const currentDraft = toSupplyDraft(existingSupply);
  const nextDraft = applySupplyPatch(
    currentDraft,
    patch,
    new Date().toISOString()
  );

  const updatedSupply = await updateSupplyDraftById({
    id: nextDraft.id,
    key: nextDraft.key,
    status: nextDraft.status,
    visibility: nextDraft.visibility,
    profile: nextDraft.profile,
    capability: nextDraft.capability,
    availability: nextDraft.availability,
    pricing: nextDraft.pricing,
    source: nextDraft.source,
    bindings: nextDraft.bindings,
    metadata: nextDraft.metadata,
    ...(nextDraft.publishedAt
      ? { publishedAt: new Date(nextDraft.publishedAt) }
      : {}),
    ...(nextDraft.retiredAt
      ? { retiredAt: new Date(nextDraft.retiredAt) }
      : {}),
  });

  if (!updatedSupply) {
    throw new Error("Failed to update supply");
  }

  return toSupplyDraft(updatedSupply);
}

export async function publishSupplyDraft({
  supplyId,
  userId,
  patch,
}: {
  supplyId: string;
  userId: string;
  patch?: SupplyPatch;
}) {
  const existingSupply = await getSupplyById({ id: supplyId });
  if (!existingSupply) {
    throw new Error("Supply not found");
  }

  if (existingSupply.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  const currentDraft = toSupplyDraft(existingSupply);
  const preparedDraft = applySupplyPatch(
    currentDraft,
    patch ?? {},
    new Date().toISOString()
  );
  const readiness = getSupplyPublishReadiness(preparedDraft);

  if (!readiness.readyForPublish) {
    throw new Error("Supply not ready to publish");
  }

  if (preparedDraft.status === "retired") {
    throw new Error("Retired supply cannot be republished");
  }

  const publishedAt = currentDraft.publishedAt ?? new Date().toISOString();

  return persistSupplyPatch({
    supplyId,
    userId,
    patch: {
      ...(patch ?? {}),
      status: "published",
      publishedAt,
      retiredAt: null,
    },
  });
}

export async function pauseSupplyDraft({
  supplyId,
  userId,
}: {
  supplyId: string;
  userId: string;
}) {
  const existingSupply = await getSupplyById({ id: supplyId });
  if (!existingSupply) {
    throw new Error("Supply not found");
  }

  if (existingSupply.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  if (existingSupply.status !== "published") {
    throw new Error("Only published supply can be paused");
  }

  return persistSupplyPatch({
    supplyId,
    userId,
    patch: {
      status: "paused",
    },
  });
}

export async function retireSupplyDraft({
  supplyId,
  userId,
}: {
  supplyId: string;
  userId: string;
}) {
  const existingSupply = await getSupplyById({ id: supplyId });
  if (!existingSupply) {
    throw new Error("Supply not found");
  }

  if (existingSupply.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  if (existingSupply.status === "retired") {
    return toSupplyDraft(existingSupply);
  }

  return persistSupplyPatch({
    supplyId,
    userId,
    patch: {
      status: "retired",
      retiredAt: new Date().toISOString(),
    },
  });
}

export async function deleteSupplyDraft({
  supplyId,
  userId,
}: {
  supplyId: string;
  userId: string;
}) {
  const existingSupply = await getSupplyById({ id: supplyId });
  if (!existingSupply) {
    throw new Error("Supply not found");
  }

  if (existingSupply.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  if (
    existingSupply.status !== "draft" &&
    existingSupply.status !== "retired"
  ) {
    throw new Error("Only draft or retired supply can be deleted");
  }

  const usageSummary = await getSupplyUsageSummaryById({ id: supplyId });
  if (usageSummary.commitmentCount > 0 || usageSummary.fulfillmentCount > 0) {
    throw new Error("Supply with durable activity cannot be deleted");
  }

  const deletedSupply = await deleteSupplyById({ id: supplyId });
  if (!deletedSupply) {
    throw new Error("Supply not found");
  }

  return toSupplyDraft(deletedSupply);
}

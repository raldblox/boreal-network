import "server-only";

import {
  getSupplyById,
  getWorkflowPackById,
  getWorkflowPackVersionById,
  saveSupplyDraft,
  toSupplyDraft,
  toWorkflowPack,
  toWorkflowPackVersion,
  updateSupplyDraftById,
} from "@/lib/db/queries";
import {
  applySupplyPatch,
  createInitialSupplyDraft,
  type BorealSupplyDraft,
  type SupplyPatch,
} from "@/lib/supply";
import { generateUUID } from "@/lib/utils";
import {
  createWorkflowSupplyMetadata,
  getWorkflowSupplyMetadata,
  withWorkflowSupplyMetadata,
  type WorkflowAdapterKind,
  type WorkflowPack,
  type WorkflowPackVersion,
} from "@/lib/workflow-pack";

export type WorkflowBackedSupplyResolution = {
  supply: BorealSupplyDraft;
  workflowPack: WorkflowPack;
  workflowPackVersion: WorkflowPackVersion;
};

export async function createCharacterCallStarterSupplyDraft({
  supplyId = generateUUID(),
  userId,
  workflowPackVersionId,
  publish = false,
}: {
  supplyId?: string;
  userId: string;
  workflowPackVersionId: string;
  publish?: boolean;
}): Promise<BorealSupplyDraft> {
  const existingSupply = await getSupplyById({ id: supplyId });
  if (existingSupply) {
    if (existingSupply.ownerId !== userId) {
      throw new Error("Forbidden");
    }

    return toSupplyDraft(existingSupply);
  }

  const now = new Date().toISOString();
  const draft = createInitialSupplyDraft({
    id: supplyId,
    userId,
    preset: "provider_capability",
    createdAt: now,
  });
  const preparedDraft = applySupplyPatch(
    draft,
    {
      status: publish ? "published" : "draft",
      visibility: "unlisted",
      profile: {
        displayName: "Character Call Starter",
        headline:
          "A live AI character video-call setup from one image and persona brief",
        summary:
          "Boreal configures a Runway Character, prepares the persona, reviews one test call, and delivers a server-side session launch handoff.",
        description:
          "One bounded service package for buyers who want a working interactive character call, not a tool setup project.",
        tags: [
          "workflow_backed",
          "runway",
          "character_call",
          "interactive_avatar",
        ],
      },
      capability: {
        supplyKinds: [
          "provider_capability",
          "video_generation",
          "documentation_support",
        ],
        fulfillmentActorKinds: ["human", "agent", "tool"],
        outputKinds: ["draft", "media", "handoff_doc", "delivery"],
        executionChannels: ["request_room", "api", "operator_review"],
      },
      availability: {
        acceptingRequests: true,
        maxConcurrentRequests: 5,
        responseTimeHours: 24,
      },
      pricing: {
        mode: "fixed",
        currency: "USD",
        fixedAmount: 1,
        notes:
          "Starter Call launch price: one character setup, one included test session, persona sheet, session-launch handoff, and delivery notes.",
      },
      source: {
        kind: "provider",
      },
      bindings: {
        providerRef: "runway/characters",
      },
      metadata: {
        serviceFamilyKey: "character-call-starter",
        servicePlanKey: "starter-call",
        deliveryProfile: {
          includedTestSessions: 1,
          maxSessionMinutes: 5,
          includesPersonaSheet: true,
          includesSessionLaunchHandoff: true,
          providerKey: "runway",
          model: "gwm1_avatars",
        },
      },
      ...(publish ? { publishedAt: now } : {}),
    },
    now
  );
  const boundDraft = await withWorkflowPackVersionOnSupplyDraft({
    draft: preparedDraft,
    workflowPackVersionId,
    adapterKind: "provider_direct",
  });

  const createdSupply = await saveSupplyDraft({
    id: boundDraft.id,
    key: boundDraft.key,
    ownerId: boundDraft.ownerId,
    status: boundDraft.status,
    visibility: boundDraft.visibility,
    profile: boundDraft.profile,
    capability: boundDraft.capability,
    availability: boundDraft.availability,
    pricing: boundDraft.pricing,
    source: boundDraft.source,
    bindings: boundDraft.bindings,
    metadata: boundDraft.metadata,
    ...(boundDraft.publishedAt
      ? { publishedAt: new Date(boundDraft.publishedAt) }
      : {}),
  });

  return toSupplyDraft(createdSupply);
}

export async function createFounderAvatarClipPackSupplyDraft({
  userId,
  workflowPackVersionId,
  publish = false,
}: {
  userId: string;
  workflowPackVersionId: string;
  publish?: boolean;
}): Promise<BorealSupplyDraft> {
  const now = new Date().toISOString();
  const draft = createInitialSupplyDraft({
    id: generateUUID(),
    userId,
    preset: "provider_capability",
    createdAt: now,
  });
  const preparedDraft = applySupplyPatch(
    draft,
    {
      status: publish ? "published" : "draft",
      visibility: "unlisted",
      profile: {
        displayName: "Founder Avatar Clip Pack",
        headline:
          "Done-for-you avatar videos for launches, sales replies, and onboarding",
        summary:
          "Boreal produces a ready-to-post avatar video pack with scripts, Runway generations, captions, review, and delivery proof.",
        description:
          "One bounded service package for buyers who want finished short-form avatar or character videos, not a SaaS tool to configure.",
        tags: ["workflow_backed", "runway", "avatar_video", "clip_pack"],
      },
      capability: {
        supplyKinds: [
          "video_generation",
          "provider_capability",
          "documentation_support",
        ],
        fulfillmentActorKinds: ["human", "agent", "tool"],
        outputKinds: ["draft", "video", "media", "handoff_doc", "delivery"],
        executionChannels: ["request_room", "api", "operator_review"],
      },
      availability: {
        acceptingRequests: true,
        maxConcurrentRequests: 3,
        responseTimeHours: 48,
      },
      pricing: {
        mode: "fixed",
        currency: "USD",
        fixedAmount: 1250,
        notes:
          "Sales Reply Pack: eight short avatar clips, scripts, Runway generations, captions, delivery notes, and one revision pass.",
      },
      source: {
        kind: "provider",
      },
      bindings: {
        providerRef: "runway",
      },
      metadata: {
        serviceFamilyKey: "founder-avatar-clip-pack",
        servicePlanKey: "sales-reply-pack",
        deliveryProfile: {
          clipCount: 8,
          targetFormats: ["9:16", "1:1"],
          maxClipDurationSeconds: 30,
          revisionPasses: 1,
          providerKey: "runway",
        },
      },
      ...(publish ? { publishedAt: now } : {}),
    },
    now
  );
  const boundDraft = await withWorkflowPackVersionOnSupplyDraft({
    draft: preparedDraft,
    workflowPackVersionId,
    adapterKind: "provider_direct",
  });

  const createdSupply = await saveSupplyDraft({
    id: boundDraft.id,
    key: boundDraft.key,
    ownerId: boundDraft.ownerId,
    status: boundDraft.status,
    visibility: boundDraft.visibility,
    profile: boundDraft.profile,
    capability: boundDraft.capability,
    availability: boundDraft.availability,
    pricing: boundDraft.pricing,
    source: boundDraft.source,
    bindings: boundDraft.bindings,
    metadata: boundDraft.metadata,
    ...(boundDraft.publishedAt
      ? { publishedAt: new Date(boundDraft.publishedAt) }
      : {}),
  });

  return toSupplyDraft(createdSupply);
}

export async function bindWorkflowPackVersionToSupply({
  userId,
  supplyId,
  workflowPackVersionId,
  adapterKind,
}: {
  userId: string;
  supplyId: string;
  workflowPackVersionId: string;
  adapterKind: WorkflowAdapterKind;
}) {
  const selectedSupply = await getSupplyById({ id: supplyId });
  if (!selectedSupply) {
    throw new Error("Supply not found");
  }

  if (selectedSupply.ownerId !== userId) {
    throw new Error("Forbidden");
  }

  const currentDraft = toSupplyDraft(selectedSupply);
  const boundDraft = await withWorkflowPackVersionOnSupplyDraft({
    draft: currentDraft,
    workflowPackVersionId,
    adapterKind,
  });
  const updatedSupply = await updateSupplyDraftById({
    id: boundDraft.id,
    key: boundDraft.key,
    status: boundDraft.status,
    visibility: boundDraft.visibility,
    profile: boundDraft.profile,
    capability: boundDraft.capability,
    availability: boundDraft.availability,
    pricing: boundDraft.pricing,
    source: boundDraft.source,
    bindings: boundDraft.bindings,
    metadata: boundDraft.metadata,
    ...(boundDraft.publishedAt
      ? { publishedAt: new Date(boundDraft.publishedAt) }
      : {}),
    ...(boundDraft.retiredAt ? { retiredAt: new Date(boundDraft.retiredAt) } : {}),
  });

  if (!updatedSupply) {
    throw new Error("Failed to bind workflow pack version to supply");
  }

  return toSupplyDraft(updatedSupply);
}

export async function resolveWorkflowBackedSupply({
  supplyId,
}: {
  supplyId: string;
}): Promise<WorkflowBackedSupplyResolution | null> {
  const selectedSupply = await getSupplyById({ id: supplyId });
  if (!selectedSupply) {
    return null;
  }

  const workflowMetadata = getWorkflowSupplyMetadata(selectedSupply.metadata);
  if (!workflowMetadata) {
    return null;
  }

  const [selectedPack, selectedVersion] = await Promise.all([
    getWorkflowPackById({ id: workflowMetadata.packId }),
    getWorkflowPackVersionById({ id: workflowMetadata.packVersionId }),
  ]);

  if (
    !selectedPack ||
    !selectedVersion ||
    selectedVersion.workflowPackId !== selectedPack.id
  ) {
    return null;
  }

  return {
    supply: toSupplyDraft(selectedSupply),
    workflowPack: toWorkflowPack(selectedPack),
    workflowPackVersion: toWorkflowPackVersion(selectedVersion),
  };
}

async function withWorkflowPackVersionOnSupplyDraft({
  draft,
  workflowPackVersionId,
  adapterKind,
}: {
  draft: BorealSupplyDraft;
  workflowPackVersionId: string;
  adapterKind: WorkflowAdapterKind;
}): Promise<BorealSupplyDraft> {
  const selectedVersion = await getWorkflowPackVersionById({
    id: workflowPackVersionId,
  });
  if (!selectedVersion) {
    throw new Error("Workflow pack version not found");
  }

  const selectedPack = await getWorkflowPackById({
    id: selectedVersion.workflowPackId,
  });
  if (!selectedPack) {
    throw new Error("Workflow pack not found");
  }

  if (selectedPack.ownerActorId !== draft.ownerId) {
    throw new Error("Workflow pack does not belong to supply owner");
  }

  if (selectedVersion.adapterKind !== adapterKind) {
    throw new Error("Workflow pack version adapter mismatch");
  }

  const workflow = createWorkflowSupplyMetadata({
    packId: selectedPack.id,
    packVersionId: selectedVersion.id,
    adapterKind,
  });
  const patch: SupplyPatch = {
    metadata: withWorkflowSupplyMetadata(draft.metadata, workflow),
  };

  return applySupplyPatch(draft, patch, new Date().toISOString());
}

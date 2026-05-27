import "server-only";

import {
  saveWorkflowPack,
  saveWorkflowPackVersion,
  toWorkflowPack,
  toWorkflowPackVersion,
  updateWorkflowPackById,
} from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import {
  buildWorkflowPackImportFromN8n,
  type N8nWorkflowImportResult,
} from "@/lib/workflow-n8n";
import {
  buildRunwayCharacterCallStarter,
  buildRunwayFounderAvatarClipPack,
  type RunwayCharacterCallStarterResult,
  type RunwayFounderAvatarClipPackResult,
} from "@/lib/workflow-runway";
import type { WorkflowPackStatus, WorkflowPackProvenance } from "@/lib/workflow-pack";

export async function importN8nWorkflowPack({
  userId,
  workflow,
  title,
  summary,
  packStatus = "draft",
  provenance,
}: {
  userId: string;
  workflow: unknown;
  title?: string;
  summary?: string;
  packStatus?: WorkflowPackStatus;
  provenance?: WorkflowPackProvenance;
}): Promise<N8nWorkflowImportResult> {
  const importResult = buildWorkflowPackImportFromN8n({
    packId: generateUUID(),
    versionId: generateUUID(),
    ownerActorId: userId,
    workflow,
    title,
    summary,
    packStatus,
    provenance,
  });

  const createdPack = await saveWorkflowPack({
    id: importResult.workflowPack.id,
    key: importResult.workflowPack.key,
    ownerActorId: importResult.workflowPack.ownerActorId,
    title: importResult.workflowPack.title,
    summary: importResult.workflowPack.summary,
    status: importResult.workflowPack.status,
    provenance: importResult.workflowPack.provenance,
    metadata: importResult.workflowPack.metadata,
  });

  const createdVersion = await saveWorkflowPackVersion({
    id: importResult.workflowPackVersion.id,
    key: importResult.workflowPackVersion.key,
    workflowPackId: importResult.workflowPackVersion.workflowPackId,
    version: importResult.workflowPackVersion.version,
    adapterKind: importResult.workflowPackVersion.adapterKind,
    graph: importResult.workflowPackVersion.graph,
    inputContract: importResult.workflowPackVersion.inputContract,
    outputContract: importResult.workflowPackVersion.outputContract,
    credentialRequirements: importResult.workflowPackVersion.credentialRequirements,
    humanCheckpoints: importResult.workflowPackVersion.humanCheckpoints,
    proofRequirements: importResult.workflowPackVersion.proofRequirements,
    sourceRefs: importResult.workflowPackVersion.sourceRefs,
    readiness: importResult.workflowPackVersion.readiness,
    unsupportedFeatures: importResult.workflowPackVersion.unsupportedFeatures,
    metadata: importResult.workflowPackVersion.metadata,
  });

  const updatedPack = await updateWorkflowPackById({
    id: createdPack.id,
    key: createdPack.key,
    title: createdPack.title,
    summary: createdPack.summary,
    status: createdPack.status,
    currentVersionId: createdVersion.id,
    provenance: createdPack.provenance,
    metadata: createdPack.metadata ?? undefined,
  });

  return {
    ...importResult,
    workflowPack: toWorkflowPack(updatedPack ?? createdPack),
    workflowPackVersion: toWorkflowPackVersion(createdVersion),
  };
}

export async function createRunwayFounderAvatarClipPackWorkflowPack({
  userId,
  packStatus = "draft",
  provenance,
}: {
  userId: string;
  packStatus?: WorkflowPackStatus;
  provenance?: WorkflowPackProvenance;
}): Promise<RunwayFounderAvatarClipPackResult> {
  const result = buildRunwayFounderAvatarClipPack({
    packId: generateUUID(),
    versionId: generateUUID(),
    ownerActorId: userId,
    packStatus,
    provenance,
  });

  const createdPack = await saveWorkflowPack({
    id: result.workflowPack.id,
    key: result.workflowPack.key,
    ownerActorId: result.workflowPack.ownerActorId,
    title: result.workflowPack.title,
    summary: result.workflowPack.summary,
    status: result.workflowPack.status,
    provenance: result.workflowPack.provenance,
    metadata: result.workflowPack.metadata,
  });

  const createdVersion = await saveWorkflowPackVersion({
    id: result.workflowPackVersion.id,
    key: result.workflowPackVersion.key,
    workflowPackId: result.workflowPackVersion.workflowPackId,
    version: result.workflowPackVersion.version,
    adapterKind: result.workflowPackVersion.adapterKind,
    graph: result.workflowPackVersion.graph,
    inputContract: result.workflowPackVersion.inputContract,
    outputContract: result.workflowPackVersion.outputContract,
    credentialRequirements: result.workflowPackVersion.credentialRequirements,
    humanCheckpoints: result.workflowPackVersion.humanCheckpoints,
    proofRequirements: result.workflowPackVersion.proofRequirements,
    sourceRefs: result.workflowPackVersion.sourceRefs,
    readiness: result.workflowPackVersion.readiness,
    unsupportedFeatures: result.workflowPackVersion.unsupportedFeatures,
    metadata: result.workflowPackVersion.metadata,
  });

  const updatedPack = await updateWorkflowPackById({
    id: createdPack.id,
    key: createdPack.key,
    title: createdPack.title,
    summary: createdPack.summary,
    status: createdPack.status,
    currentVersionId: createdVersion.id,
    provenance: createdPack.provenance,
    metadata: createdPack.metadata ?? undefined,
  });

  return {
    ...result,
    workflowPack: toWorkflowPack(updatedPack ?? createdPack),
    workflowPackVersion: toWorkflowPackVersion(createdVersion),
  };
}

export async function createRunwayCharacterCallStarterWorkflowPack({
  userId,
  packStatus = "draft",
  provenance,
}: {
  userId: string;
  packStatus?: WorkflowPackStatus;
  provenance?: WorkflowPackProvenance;
}): Promise<RunwayCharacterCallStarterResult> {
  const result = buildRunwayCharacterCallStarter({
    packId: generateUUID(),
    versionId: generateUUID(),
    ownerActorId: userId,
    packStatus,
    provenance,
  });

  const createdPack = await saveWorkflowPack({
    id: result.workflowPack.id,
    key: result.workflowPack.key,
    ownerActorId: result.workflowPack.ownerActorId,
    title: result.workflowPack.title,
    summary: result.workflowPack.summary,
    status: result.workflowPack.status,
    provenance: result.workflowPack.provenance,
    metadata: result.workflowPack.metadata,
  });

  const createdVersion = await saveWorkflowPackVersion({
    id: result.workflowPackVersion.id,
    key: result.workflowPackVersion.key,
    workflowPackId: result.workflowPackVersion.workflowPackId,
    version: result.workflowPackVersion.version,
    adapterKind: result.workflowPackVersion.adapterKind,
    graph: result.workflowPackVersion.graph,
    inputContract: result.workflowPackVersion.inputContract,
    outputContract: result.workflowPackVersion.outputContract,
    credentialRequirements: result.workflowPackVersion.credentialRequirements,
    humanCheckpoints: result.workflowPackVersion.humanCheckpoints,
    proofRequirements: result.workflowPackVersion.proofRequirements,
    sourceRefs: result.workflowPackVersion.sourceRefs,
    readiness: result.workflowPackVersion.readiness,
    unsupportedFeatures: result.workflowPackVersion.unsupportedFeatures,
    metadata: result.workflowPackVersion.metadata,
  });

  const updatedPack = await updateWorkflowPackById({
    id: createdPack.id,
    key: createdPack.key,
    title: createdPack.title,
    summary: createdPack.summary,
    status: createdPack.status,
    currentVersionId: createdVersion.id,
    provenance: createdPack.provenance,
    metadata: createdPack.metadata ?? undefined,
  });

  return {
    ...result,
    workflowPack: toWorkflowPack(updatedPack ?? createdPack),
    workflowPackVersion: toWorkflowPackVersion(createdVersion),
  };
}

import type { BorealOutputKind } from "@/lib/matching-fingerprints";
import type { RequestActorKind, RequestArtifactKind, RequestEvidenceClaim } from "@/lib/request";

export type WorkflowPackStatus = "draft" | "active" | "retired";
export type WorkflowAdapterKind =
  | "n8n"
  | "boreal_worker"
  | "desktop_runtime"
  | "provider_direct"
  | "manual_playbook";
export type WorkflowPackReadinessState =
  | "draft"
  | "needs_credentials"
  | "needs_review"
  | "ready_to_run"
  | "blocked"
  | "retired";
export type WorkflowAdapterRunStatus =
  | "pending"
  | "running"
  | "blocked"
  | "succeeded"
  | "failed"
  | "cancelled";
export type WorkflowProvenanceKind =
  | "first_party"
  | "buyer_provided"
  | "curated_import";
export type WorkflowInputKind =
  | "text"
  | "number"
  | "boolean"
  | "enum"
  | "json"
  | "string_array"
  | "object_ref";
export type WorkflowCredentialScope =
  | "buyer_workspace"
  | "boreal_first_party"
  | "shared_operator";
export type WorkflowCheckpointStage =
  | "pre_run"
  | "pre_publish"
  | "pre_delivery";
export type WorkflowBlockKind =
  | "trigger"
  | "input"
  | "credential"
  | "transform"
  | "condition"
  | "llm"
  | "generation"
  | "integration"
  | "review"
  | "delivery"
  | "proof";
export type WorkflowSourceRefKind =
  | "n8n_workflow_json"
  | "n8n_workflow_ref"
  | "provider_blueprint"
  | "artifact_ref"
  | "url";

export const workflowBackedSupplyProfile = "workflow_backed_v1";

export type WorkflowBackedSupplyProfile = typeof workflowBackedSupplyProfile;

export type WorkflowPackProvenance = {
  kind: WorkflowProvenanceKind;
  sourcePlatform?: string;
  sourceUrl?: string | null;
  licenseNotes?: string | null;
};

export type WorkflowPort = {
  portKey: string;
  title?: string;
};

export type WorkflowRetryPolicy = {
  mode: "inherit" | "never" | "simple_retry";
  maxAttempts?: number;
};

export type WorkflowBlock = {
  blockKey: string;
  title: string;
  kind: WorkflowBlockKind;
  adapterOperation: string;
  config: Record<string, unknown>;
  inputPorts: WorkflowPort[];
  outputPorts: WorkflowPort[];
  requiredSecrets: string[];
  emitsArtifactKinds: BorealOutputKind[];
  requiresHumanApproval: boolean;
  retryPolicy?: WorkflowRetryPolicy;
  failureSummary?: string;
};

export type WorkflowConnectionEndpoint = {
  blockKey: string;
  portKey: string;
};

export type WorkflowConnection = {
  from: WorkflowConnectionEndpoint;
  to: WorkflowConnectionEndpoint;
};

export type WorkflowGraph = {
  blocks: WorkflowBlock[];
  connections: WorkflowConnection[];
};

export type WorkflowInputField = {
  key: string;
  kind: WorkflowInputKind;
  required: boolean;
  options?: string[];
  summary?: string;
};

export type WorkflowPackInputContract = {
  buyerInputs: WorkflowInputField[];
  environmentInputs: WorkflowInputField[];
  credentialSlots: WorkflowInputField[];
  operatorInputs: WorkflowInputField[];
};

export type WorkflowPackOutputContract = {
  artifacts: BorealOutputKind[];
  summary?: string;
};

export type WorkflowCredentialRequirement = {
  slotKey: string;
  providerKey: string;
  scope: WorkflowCredentialScope;
  required: boolean;
  notes?: string;
  nodeKeys: string[];
};

export type WorkflowHumanCheckpoint = {
  checkpointKey: string;
  title: string;
  required: boolean;
  blocking: boolean;
  stage: WorkflowCheckpointStage;
  approvalActorKind: RequestActorKind;
  summary: string;
};

export type WorkflowProofRequirement = {
  proofKey: string;
  requiredArtifactKinds: RequestArtifactKind[];
  requiredEvidenceClaims: RequestEvidenceClaim[];
  requiredForCompletion: boolean;
  summary: string;
};

export type WorkflowSourceRef = {
  kind: WorkflowSourceRefKind;
  title: string;
  externalId?: string;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type WorkflowUnsupportedFeature = {
  featureKey: string;
  summary: string;
  blocking: boolean;
  nodeKeys: string[];
};

export type WorkflowPackReadiness = {
  state: WorkflowPackReadinessState;
  summary: string;
  blockingReasons: string[];
};

export type WorkflowPack = {
  id: string;
  key: string;
  ownerActorId: string;
  title: string;
  summary: string;
  status: WorkflowPackStatus;
  currentVersionId?: string;
  provenance: WorkflowPackProvenance;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  retiredAt?: string;
};

export type WorkflowPackVersion = {
  id: string;
  key: string;
  workflowPackId: string;
  version: number;
  adapterKind: WorkflowAdapterKind;
  graph: WorkflowGraph;
  inputContract: WorkflowPackInputContract;
  outputContract: WorkflowPackOutputContract;
  credentialRequirements: WorkflowCredentialRequirement[];
  humanCheckpoints: WorkflowHumanCheckpoint[];
  proofRequirements: WorkflowProofRequirement[];
  sourceRefs: WorkflowSourceRef[];
  readiness: WorkflowPackReadiness;
  unsupportedFeatures: WorkflowUnsupportedFeature[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  retiredAt?: string;
};

export type WorkflowAdapterRun = {
  id: string;
  workflowPackVersionId: string;
  requestId: string;
  fulfillmentId: string;
  status: WorkflowAdapterRunStatus;
  adapterKind: WorkflowAdapterKind;
  remoteRunRef?: string;
  attempt: number;
  summary: string;
  errorSummary?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  lastHeartbeatAt?: string;
};

export type WorkflowSupplyMetadata = {
  profile: WorkflowBackedSupplyProfile;
  packId: string;
  packVersionId: string;
  adapterKind: WorkflowAdapterKind;
};

export function createWorkflowSupplyMetadata({
  packId,
  packVersionId,
  adapterKind,
}: {
  packId: string;
  packVersionId: string;
  adapterKind: WorkflowAdapterKind;
}): WorkflowSupplyMetadata {
  return {
    profile: workflowBackedSupplyProfile,
    packId,
    packVersionId,
    adapterKind,
  };
}

export function getWorkflowSupplyMetadata(
  metadata: Record<string, unknown> | null | undefined
): WorkflowSupplyMetadata | undefined {
  const rawWorkflow = asRecord(metadata?.workflow);
  if (!rawWorkflow) {
    return undefined;
  }

  const profile =
    typeof rawWorkflow.profile === "string" ? rawWorkflow.profile : undefined;
  const packId =
    typeof rawWorkflow.packId === "string" ? rawWorkflow.packId : undefined;
  const packVersionId =
    typeof rawWorkflow.packVersionId === "string"
      ? rawWorkflow.packVersionId
      : undefined;
  const adapterKind =
    typeof rawWorkflow.adapterKind === "string"
      ? rawWorkflow.adapterKind
      : undefined;

  if (
    profile !== workflowBackedSupplyProfile ||
    !packId ||
    !packVersionId ||
    !isWorkflowAdapterKind(adapterKind)
  ) {
    return undefined;
  }

  return {
    profile,
    packId,
    packVersionId,
    adapterKind,
  };
}

export function withWorkflowSupplyMetadata(
  metadata: Record<string, unknown> | null | undefined,
  workflow: WorkflowSupplyMetadata
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    workflow,
  };
}

export function slugifyWorkflowPackKey(title: string | undefined, id: string) {
  const base =
    title
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workflow-pack";

  return `${base}-${id.slice(0, 8)}`;
}

export function buildWorkflowPackVersionKey({
  workflowPackKey,
  version,
}: {
  workflowPackKey: string;
  version: number;
}) {
  return `${workflowPackKey}-v${version}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function isWorkflowAdapterKind(
  value: string | undefined
): value is WorkflowAdapterKind {
  return (
    value === "n8n" ||
    value === "boreal_worker" ||
    value === "desktop_runtime" ||
    value === "provider_direct" ||
    value === "manual_playbook"
  );
}

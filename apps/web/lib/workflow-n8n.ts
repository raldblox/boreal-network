import type { BorealOutputKind } from "@/lib/matching-fingerprints";
import {
  buildWorkflowPackVersionKey,
  slugifyWorkflowPackKey,
  type WorkflowAdapterKind,
  type WorkflowBlock,
  type WorkflowBlockKind,
  type WorkflowConnection,
  type WorkflowCredentialRequirement,
  type WorkflowHumanCheckpoint,
  type WorkflowPack,
  type WorkflowPackInputContract,
  type WorkflowPackOutputContract,
  type WorkflowPackProvenance,
  type WorkflowPackReadiness,
  type WorkflowPackStatus,
  type WorkflowPackVersion,
  type WorkflowProofRequirement,
  type WorkflowSourceRef,
  type WorkflowUnsupportedFeature,
} from "@/lib/workflow-pack";

type N8nWorkflowNode = {
  id?: string | number;
  name?: string;
  type?: string;
  typeVersion?: number;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
};

type N8nWorkflowTarget = {
  node?: string;
  type?: string;
  index?: number;
};

type N8nWorkflowRoot = {
  id?: string | number;
  name?: string;
  nodes?: N8nWorkflowNode[];
  connections?: Record<string, unknown>;
  active?: boolean;
  settings?: Record<string, unknown>;
  tags?: unknown[];
};

export type N8nWorkflowTriggerClassification =
  | "manual"
  | "scheduled"
  | "event_webhook"
  | "polling"
  | "hybrid";

export type N8nWorkflowFitAssessment = {
  buyable: boolean;
  serviceFamilyHint:
    | "automation_rescue"
    | "automation_deploy"
    | "content_pipeline";
  summary: string;
};

export type N8nWorkflowImportResult = {
  workflowPack: WorkflowPack;
  workflowPackVersion: WorkflowPackVersion;
  detectedSystems: string[];
  credentialSlots: WorkflowCredentialRequirement[];
  humanCheckpoints: WorkflowHumanCheckpoint[];
  proofRequirements: WorkflowProofRequirement[];
  unsupportedFeatures: WorkflowUnsupportedFeature[];
  fitAssessment: N8nWorkflowFitAssessment;
};

export function buildWorkflowPackImportFromN8n({
  packId,
  versionId,
  ownerActorId,
  workflow,
  title,
  summary,
  version = 1,
  packStatus = "draft",
  provenance,
}: {
  packId: string;
  versionId: string;
  ownerActorId: string;
  workflow: unknown;
  title?: string;
  summary?: string;
  version?: number;
  packStatus?: WorkflowPackStatus;
  provenance?: WorkflowPackProvenance;
}): N8nWorkflowImportResult {
  const workflowRoot = normalizeWorkflowRoot(workflow);
  const nodes = workflowRoot.nodes ?? [];
  const nodeKeysByName = createNodeKeyMap(nodes);
  const duplicateNodeNames = getDuplicateNodeNames(nodes);
  const detectedSystems = detectSystems(workflowRoot);
  const triggerClassification = classifyTrigger(nodes);
  const credentialSlots = extractCredentialSlots(nodes);
  const unsupportedFeatures = collectUnsupportedFeatures({
    nodes,
    duplicateNodeNames,
    nodeKeysByName,
  });
  const graph = buildWorkflowGraph({
    nodes,
    nodeKeysByName,
    connections: workflowRoot.connections,
    unsupportedFeatures,
  });
  const humanCheckpoints = buildHumanCheckpoints({
    credentialSlots,
    unsupportedFeatures,
    triggerClassification,
  });
  const proofRequirements = buildProofRequirements(graph.blocks);
  const readiness = buildReadiness({
    credentialSlots,
    unsupportedFeatures,
  });
  const fitAssessment = buildFitAssessment({
    nodes,
    unsupportedFeatures,
    triggerClassification,
    detectedSystems,
  });

  const packTitle =
    normalizeText(title) ??
    normalizeText(workflowRoot.name) ??
    "Imported n8n workflow";
  const packKey = slugifyWorkflowPackKey(packTitle, packId);
  const packSummary =
    normalizeText(summary) ??
    buildPackSummary({
      fitAssessment,
      triggerClassification,
      detectedSystems,
    });
  const now = new Date().toISOString();
  const sourceRefs = buildSourceRefs({
    workflowRoot,
    triggerClassification,
    detectedSystems,
    unsupportedFeatures,
  });
  const inputContract = buildInputContract({
    workflowRoot,
    credentialSlots,
    triggerClassification,
  });
  const outputContract = buildOutputContract({
    blocks: graph.blocks,
    fitAssessment,
  });

  const workflowPack: WorkflowPack = {
    id: packId,
    key: packKey,
    ownerActorId,
    title: packTitle,
    summary: packSummary,
    status: packStatus,
    provenance: provenance ?? {
      kind: "buyer_provided",
      sourcePlatform: "n8n",
      sourceUrl: null,
      licenseNotes: null,
    },
    metadata: {
      profile: "workflow_backed_v1",
      serviceFamilyKey: fitAssessment.serviceFamilyHint,
      triggerClassification,
      detectedSystems,
    },
    createdAt: now,
    updatedAt: now,
  };

  const workflowPackVersion: WorkflowPackVersion = {
    id: versionId,
    key: buildWorkflowPackVersionKey({
      workflowPackKey: packKey,
      version,
    }),
    workflowPackId: packId,
    version,
    adapterKind: "n8n",
    graph,
    inputContract,
    outputContract,
    credentialRequirements: credentialSlots,
    humanCheckpoints,
    proofRequirements,
    sourceRefs,
    readiness,
    unsupportedFeatures,
    metadata: {
      profile: "workflow_backed_v1",
      detectedSystems,
      fitAssessment,
      triggerClassification,
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    workflowPack,
    workflowPackVersion,
    detectedSystems,
    credentialSlots,
    humanCheckpoints,
    proofRequirements,
    unsupportedFeatures,
    fitAssessment,
  };
}

function normalizeWorkflowRoot(workflow: unknown): N8nWorkflowRoot {
  const fallback: N8nWorkflowRoot = {
    nodes: [],
    connections: {},
  };

  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    return fallback;
  }

  const root = workflow as Record<string, unknown>;
  return {
    id:
      typeof root.id === "string" || typeof root.id === "number"
        ? root.id
        : undefined,
    name: typeof root.name === "string" ? root.name : undefined,
    nodes: Array.isArray(root.nodes)
      ? root.nodes.filter(isObjectRecord).map((node) => ({
          id:
            typeof node.id === "string" || typeof node.id === "number"
              ? node.id
              : undefined,
          name: typeof node.name === "string" ? node.name : undefined,
          type: typeof node.type === "string" ? node.type : undefined,
          typeVersion:
            typeof node.typeVersion === "number" ? node.typeVersion : undefined,
          parameters: asObjectRecord(node.parameters) ?? {},
          credentials: asObjectRecord(node.credentials) ?? {},
          disabled: typeof node.disabled === "boolean" ? node.disabled : undefined,
          notes: typeof node.notes === "string" ? node.notes : undefined,
        }))
      : [],
    connections: asObjectRecord(root.connections) ?? {},
    active: typeof root.active === "boolean" ? root.active : undefined,
    settings: asObjectRecord(root.settings) ?? {},
    tags: Array.isArray(root.tags) ? root.tags : [],
  };
}

function createNodeKeyMap(nodes: N8nWorkflowNode[]) {
  const entries = new Map<string, string>();

  nodes.forEach((node, index) => {
    const nodeName = normalizeText(node.name) ?? `node-${index + 1}`;
    if (!entries.has(nodeName)) {
      entries.set(nodeName, toBlockKey(nodeName, node.id, index));
    }
  });

  return entries;
}

function getDuplicateNodeNames(nodes: N8nWorkflowNode[]) {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    const nodeName = normalizeText(node.name);
    if (!nodeName) {
      continue;
    }

    counts.set(nodeName, (counts.get(nodeName) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
}

function detectSystems(workflowRoot: N8nWorkflowRoot) {
  const systems = new Set<string>(["n8n"]);

  for (const node of workflowRoot.nodes ?? []) {
    const candidates = [node.type, node.name];
    const credentialKeys = Object.keys(node.credentials ?? {});

    for (const candidate of [...candidates, ...credentialKeys]) {
      const providerKey = inferProviderKey(candidate);
      if (providerKey) {
        systems.add(providerKey);
      }
    }
  }

  return Array.from(systems);
}

function classifyTrigger(
  nodes: N8nWorkflowNode[]
): N8nWorkflowTriggerClassification {
  const classes = new Set<N8nWorkflowTriggerClassification>();

  for (const node of nodes) {
    const type = node.type?.toLowerCase() ?? "";

    if (type.includes("manualtrigger")) {
      classes.add("manual");
      continue;
    }

    if (type.includes("schedule") || type.includes("cron")) {
      classes.add("scheduled");
      continue;
    }

    if (type.includes("webhook")) {
      classes.add("event_webhook");
      continue;
    }

    if (
      type.includes("poll") ||
      type.includes("rssfeedreadtrigger") ||
      containsPollingConfiguration(node.parameters)
    ) {
      classes.add("polling");
    }
  }

  if (classes.size === 0) {
    return "manual";
  }

  if (classes.size === 1) {
    return Array.from(classes)[0];
  }

  return "hybrid";
}

function containsPollingConfiguration(parameters: Record<string, unknown> | undefined) {
  if (!parameters) {
    return false;
  }

  return JSON.stringify(parameters).toLowerCase().includes("polltimes");
}

function extractCredentialSlots(nodes: N8nWorkflowNode[]) {
  const slots = new Map<string, WorkflowCredentialRequirement>();

  for (const node of nodes) {
    const nodeKey =
      normalizeText(node.name) ??
      toBlockKey("node", node.id, 0);
    const credentials = asObjectRecord(node.credentials) ?? {};

    for (const [credentialKey, credentialValue] of Object.entries(credentials)) {
      const credentialRecord = asObjectRecord(credentialValue) ?? {};
      const providerKey =
        inferProviderKey(
          typeof credentialRecord.type === "string"
            ? credentialRecord.type
            : credentialKey
        ) ?? normalizeToken(credentialKey) ?? "external_system";
      const slotIdentity =
        normalizeText(
          typeof credentialRecord.name === "string"
            ? credentialRecord.name
            : typeof credentialRecord.id === "string"
              ? credentialRecord.id
              : undefined
        ) ?? providerKey;
      const slotKey = `${providerKey}_${slugifyToken(slotIdentity).slice(0, 32)}`;
      const notes = `Credential required by ${normalizeText(node.name) ?? "imported node"}.`;
      const existingSlot = slots.get(slotKey);

      if (existingSlot) {
        if (!existingSlot.nodeKeys.includes(nodeKey)) {
          existingSlot.nodeKeys.push(nodeKey);
        }
        continue;
      }

      slots.set(slotKey, {
        slotKey,
        providerKey,
        scope: "buyer_workspace",
        required: true,
        notes,
        nodeKeys: [nodeKey],
      });
    }
  }

  return Array.from(slots.values()).sort((left, right) =>
    left.slotKey.localeCompare(right.slotKey)
  );
}

function collectUnsupportedFeatures({
  nodes,
  duplicateNodeNames,
  nodeKeysByName,
}: {
  nodes: N8nWorkflowNode[];
  duplicateNodeNames: string[];
  nodeKeysByName: Map<string, string>;
}) {
  const features = new Map<string, WorkflowUnsupportedFeature>();

  for (const duplicateNodeName of duplicateNodeNames) {
    addUnsupportedFeature(features, {
      featureKey: "duplicate_node_name",
      summary: `Duplicate node name "${duplicateNodeName}" makes connection mapping ambiguous.`,
      blocking: true,
      nodeKey:
        nodeKeysByName.get(duplicateNodeName) ??
        slugifyToken(duplicateNodeName),
    });
  }

  for (const [index, node] of nodes.entries()) {
    const nodeName = normalizeText(node.name) ?? `node-${index + 1}`;
    const nodeKey = nodeKeysByName.get(nodeName) ?? toBlockKey(nodeName, node.id, index);
    const type = node.type?.toLowerCase() ?? "";

    if (isCodeNodeType(type)) {
      addUnsupportedFeature(features, {
        featureKey: "code_node_review",
        summary: "Code or function nodes need explicit operator review before execution.",
        blocking: true,
        nodeKey,
      });
    }

    if (isLocalProcessNodeType(type)) {
      addUnsupportedFeature(features, {
        featureKey: "local_process_assumption",
        summary: "Local process or shell execution assumptions block safe import execution.",
        blocking: true,
        nodeKey,
      });
    }

    if (isFilesystemNodeType(type)) {
      addUnsupportedFeature(features, {
        featureKey: "filesystem_assumption",
        summary: "Filesystem-dependent nodes require extra storage and runtime handling.",
        blocking: true,
        nodeKey,
      });
    }

    if (isSubworkflowNodeType(type)) {
      addUnsupportedFeature(features, {
        featureKey: "subworkflow_dependency",
        summary: "Referenced sub-workflows must be resolved before the pack can run safely.",
        blocking: true,
        nodeKey,
      });
    }

    if (isCommunityNodeType(type)) {
      addUnsupportedFeature(features, {
        featureKey: "community_node",
        summary: "Community or unknown node packages need adapter compatibility review.",
        blocking: true,
        nodeKey,
      });
    }

    if (hasEnvironmentDependency(node.parameters)) {
      addUnsupportedFeature(features, {
        featureKey: "environment_dependency",
        summary: "Environment-variable dependencies must be expressed as explicit slots before execution.",
        blocking: true,
        nodeKey,
      });
    }

    if (hasExpressionDependency(node.parameters)) {
      addUnsupportedFeature(features, {
        featureKey: "expression_review_required",
        summary: "Imported expressions are preserved, but Boreal cannot validate them automatically yet.",
        blocking: false,
        nodeKey,
      });
    }
  }

  return Array.from(features.values()).sort((left, right) =>
    left.featureKey.localeCompare(right.featureKey)
  );
}

function buildWorkflowGraph({
  nodes,
  nodeKeysByName,
  connections,
  unsupportedFeatures,
}: {
  nodes: N8nWorkflowNode[];
  nodeKeysByName: Map<string, string>;
  connections: Record<string, unknown> | undefined;
  unsupportedFeatures: WorkflowUnsupportedFeature[];
}) {
  const blocks = nodes.map((node, index) =>
    buildWorkflowBlock({
      node,
      nodeKey:
        nodeKeysByName.get(normalizeText(node.name) ?? "") ??
        toBlockKey(normalizeText(node.name) ?? "node", node.id, index),
      unsupportedFeatures,
    })
  );

  const normalizedConnections = flattenConnections({
    nodes,
    nodeKeysByName,
    connections,
  });

  return {
    blocks,
    connections: normalizedConnections,
  };
}

function buildWorkflowBlock({
  node,
  nodeKey,
  unsupportedFeatures,
}: {
  node: N8nWorkflowNode;
  nodeKey: string;
  unsupportedFeatures: WorkflowUnsupportedFeature[];
}): WorkflowBlock {
  const title = normalizeText(node.name) ?? nodeKey;
  const type = node.type ?? "unknown";
  const kind = classifyBlockKind(type, title);
  const blockingFeature = unsupportedFeatures.find(
    (feature) => feature.blocking && feature.nodeKeys.includes(nodeKey)
  );
  const config = summarizeNodeConfig(node);

  return {
    blockKey: nodeKey,
    title,
    kind,
    adapterOperation: type,
    config,
    inputPorts: [{ portKey: "main_in", title: "Main in" }],
    outputPorts: [{ portKey: "main_0", title: "Main out" }],
    requiredSecrets: Object.keys(node.credentials ?? {}).map((credentialKey) =>
      inferProviderKey(credentialKey) ?? credentialKey
    ),
    emitsArtifactKinds: inferOutputKindsForNode(kind, type),
    requiresHumanApproval: kind === "review" || Boolean(blockingFeature),
    retryPolicy:
      kind === "trigger"
        ? { mode: "never" }
        : { mode: "simple_retry", maxAttempts: 3 },
    ...(blockingFeature ? { failureSummary: blockingFeature.summary } : {}),
  };
}

function flattenConnections({
  nodes,
  nodeKeysByName,
  connections,
}: {
  nodes: N8nWorkflowNode[];
  nodeKeysByName: Map<string, string>;
  connections: Record<string, unknown> | undefined;
}) {
  if (!connections) {
    return [] satisfies WorkflowConnection[];
  }

  const knownNodeNames = new Set(
    nodes
      .map((node) => normalizeText(node.name))
      .filter((value): value is string => Boolean(value))
  );
  const normalizedConnections: WorkflowConnection[] = [];

  for (const [fromNodeName, rawTargetsByPort] of Object.entries(connections)) {
    if (!knownNodeNames.has(fromNodeName)) {
      continue;
    }

    const fromBlockKey = nodeKeysByName.get(fromNodeName);
    if (!fromBlockKey) {
      continue;
    }

    const targetsByPort = asObjectRecord(rawTargetsByPort);
    if (!targetsByPort) {
      continue;
    }

    for (const [portKey, rawTargets] of Object.entries(targetsByPort)) {
      if (!Array.isArray(rawTargets)) {
        continue;
      }

      rawTargets.forEach((groupTargets, groupIndex) => {
        if (!Array.isArray(groupTargets)) {
          return;
        }

        groupTargets.forEach((target) => {
          if (!isObjectRecord(target)) {
            return;
          }

          const targetRef = target as N8nWorkflowTarget;
          const targetName =
            typeof targetRef.node === "string" ? targetRef.node : undefined;
          if (!targetName) {
            return;
          }

          const toBlockKey = nodeKeysByName.get(targetName);
          if (!toBlockKey) {
            return;
          }

          normalizedConnections.push({
            from: {
              blockKey: fromBlockKey,
              portKey: `${portKey}_${groupIndex}`,
            },
            to: {
              blockKey: toBlockKey,
              portKey: `${targetRef.type ?? "main"}_${targetRef.index ?? 0}`,
            },
          });
        });
      });
    }
  }

  return normalizedConnections;
}

function buildHumanCheckpoints({
  credentialSlots,
  unsupportedFeatures,
  triggerClassification,
}: {
  credentialSlots: WorkflowCredentialRequirement[];
  unsupportedFeatures: WorkflowUnsupportedFeature[];
  triggerClassification: N8nWorkflowTriggerClassification;
}) {
  const checkpoints: WorkflowHumanCheckpoint[] = [];

  if (credentialSlots.length > 0) {
    checkpoints.push({
      checkpointKey: "confirm_credentials_and_workspace_access",
      title: "Confirm credentials and workspace access",
      required: true,
      blocking: true,
      stage: "pre_run",
      approvalActorKind: "human",
      summary:
        "Buyer or operator must confirm which credential slots are available before any run can begin.",
    });
  }

  if (unsupportedFeatures.some((feature) => feature.blocking)) {
    checkpoints.push({
      checkpointKey: "operator_adapter_review",
      title: "Operator adapter review",
      required: true,
      blocking: true,
      stage: "pre_run",
      approvalActorKind: "human",
      summary:
        "Blocking node or environment assumptions require operator review before the pack can be executed safely.",
    });
  }

  if (triggerClassification !== "manual") {
    checkpoints.push({
      checkpointKey: "confirm_trigger_mode_and_target_environment",
      title: "Confirm trigger mode and target environment",
      required: true,
      blocking: true,
      stage: "pre_run",
      approvalActorKind: "human",
      summary:
        "Scheduled, webhook, polling, or hybrid workflows need an explicit target environment and run mode before launch.",
    });
  }

  checkpoints.push({
    checkpointKey: "confirm_handoff_package",
    title: "Confirm handoff package",
    required: true,
    blocking: false,
    stage: "pre_delivery",
    approvalActorKind: "human",
    summary:
      "Operator confirms that the workflow map, issue log, and delivery summary are ready for buyer handoff.",
  });

  return checkpoints;
}

function buildProofRequirements(blocks: WorkflowBlock[]) {
  const includesGeneration = blocks.some((block) => block.kind === "generation");
  const requirements: WorkflowProofRequirement[] = [
    {
      proofKey: "workflow_handoff_bundle",
      requiredArtifactKinds: ["delivery", "file"],
      requiredEvidenceClaims: ["delivery_confirmation", "written_report"],
      requiredForCompletion: true,
      summary:
        "Completion requires a delivery summary plus a file-backed workflow handoff artifact.",
    },
  ];

  if (includesGeneration) {
    requirements.push({
      proofKey: "generated_output_review",
      requiredArtifactKinds: ["media", "delivery"],
      requiredEvidenceClaims: ["delivery_confirmation"],
      requiredForCompletion: false,
      summary:
        "Generation-heavy workflows should include a reviewable media artifact alongside the delivery package.",
    });
  }

  return requirements;
}

function buildReadiness({
  credentialSlots,
  unsupportedFeatures,
}: {
  credentialSlots: WorkflowCredentialRequirement[];
  unsupportedFeatures: WorkflowUnsupportedFeature[];
}): WorkflowPackReadiness {
  const blockingReasons = unsupportedFeatures
    .filter((feature) => feature.blocking)
    .map((feature) => feature.summary);

  if (blockingReasons.length > 0) {
    return {
      state: "blocked",
      summary:
        "Pack import succeeded, but execution is blocked until unsupported critical features are resolved.",
      blockingReasons,
    };
  }

  if (credentialSlots.length > 0) {
    return {
      state: "needs_credentials",
      summary:
        "Pack can be reviewed now, but execution requires buyer or operator credentials first.",
      blockingReasons: [],
    };
  }

  const reviewOnlyWarnings = unsupportedFeatures
    .filter((feature) => !feature.blocking)
    .map((feature) => feature.summary);

  if (reviewOnlyWarnings.length > 0) {
    return {
      state: "needs_review",
      summary:
        "Pack is structurally imported, but operator review is still required for flagged expressions or compatibility assumptions.",
      blockingReasons: reviewOnlyWarnings,
    };
  }

  return {
    state: "ready_to_run",
    summary:
      "Pack can run after normal operator review because no blocking unsupported features or unresolved credentials were detected.",
    blockingReasons: [],
  };
}

function buildFitAssessment({
  nodes,
  unsupportedFeatures,
  triggerClassification,
  detectedSystems,
}: {
  nodes: N8nWorkflowNode[];
  unsupportedFeatures: WorkflowUnsupportedFeature[];
  triggerClassification: N8nWorkflowTriggerClassification;
  detectedSystems: string[];
}): N8nWorkflowFitAssessment {
  const blockingUnsupportedCount = unsupportedFeatures.filter(
    (feature) => feature.blocking
  ).length;
  const includesContentSystems = detectedSystems.some((system) =>
    ["runway", "openai", "youtube", "tiktok", "instagram"].includes(system)
  );
  const nodeCount = nodes.length;

  const serviceFamilyHint = includesContentSystems
    ? "content_pipeline"
    : triggerClassification === "manual"
      ? "automation_rescue"
      : "automation_deploy";

  if (nodeCount === 0) {
    return {
      buyable: false,
      serviceFamilyHint,
      summary:
        "Import is not buyable yet because the workflow has no runnable node graph.",
    };
  }

  if (blockingUnsupportedCount > 0 || nodeCount > 75) {
    return {
      buyable: false,
      serviceFamilyHint,
      summary:
        "Import is better treated as operator-only support material until critical adapter blockers are resolved.",
    };
  }

  return {
    buyable: true,
    serviceFamilyHint,
    summary:
      serviceFamilyHint === "content_pipeline"
        ? "Good fit for a workflow-backed content pipeline service."
        : serviceFamilyHint === "automation_deploy"
          ? "Good fit for a deploy-or-adapt workflow-backed supply."
          : "Good fit for a fix-or-adapt workflow-backed supply.",
  };
}

function buildPackSummary({
  fitAssessment,
  triggerClassification,
  detectedSystems,
}: {
  fitAssessment: N8nWorkflowFitAssessment;
  triggerClassification: N8nWorkflowTriggerClassification;
  detectedSystems: string[];
}) {
  const systemsSummary =
    detectedSystems.filter((system) => system !== "n8n").slice(0, 3).join(", ");

  return systemsSummary
    ? `${fitAssessment.summary} Trigger mode: ${triggerClassification}. Connected systems: ${systemsSummary}.`
    : `${fitAssessment.summary} Trigger mode: ${triggerClassification}.`;
}

function buildSourceRefs({
  workflowRoot,
  triggerClassification,
  detectedSystems,
  unsupportedFeatures,
}: {
  workflowRoot: N8nWorkflowRoot;
  triggerClassification: N8nWorkflowTriggerClassification;
  detectedSystems: string[];
  unsupportedFeatures: WorkflowUnsupportedFeature[];
}) {
  const sanitizedPayload = sanitizeSourcePayload(workflowRoot);

  return [
    {
      kind: "n8n_workflow_json",
      title: normalizeText(workflowRoot.name) ?? "Imported n8n workflow JSON",
      ...(workflowRoot.id !== undefined
        ? { externalId: String(workflowRoot.id) }
        : {}),
      sourceUrl: null,
      metadata: {
        triggerClassification,
        detectedSystems,
        unsupportedFeatureKeys: unsupportedFeatures.map(
          (feature) => feature.featureKey
        ),
      },
      payload: sanitizedPayload,
    },
  ] satisfies WorkflowSourceRef[];
}

function buildInputContract({
  workflowRoot,
  credentialSlots,
  triggerClassification,
}: {
  workflowRoot: N8nWorkflowRoot;
  credentialSlots: WorkflowCredentialRequirement[];
  triggerClassification: N8nWorkflowTriggerClassification;
}): WorkflowPackInputContract {
  const hasWorkflowId =
    workflowRoot.id !== undefined && workflowRoot.id !== null;

  return {
    buyerInputs: [
      {
        key: "problemSummary",
        kind: "text",
        required: true,
        summary: "What is broken or what outcome the workflow should achieve.",
      },
      {
        key: "intendedOutcome",
        kind: "text",
        required: true,
        summary: "What success should look like after repair or deployment.",
      },
      {
        key: "targetSystems",
        kind: "string_array",
        required: true,
        summary: "Apps, APIs, or destinations the workflow touches.",
      },
    ],
    environmentInputs: [
      {
        key: "n8nWorkflowJson",
        kind: "json",
        required: !hasWorkflowId,
        summary: "Raw workflow JSON when Boreal does not have workspace access.",
      },
      {
        key: "n8nWorkflowId",
        kind: "text",
        required: hasWorkflowId,
        summary: "Existing n8n workflow id when the workflow already exists in a workspace.",
      },
      {
        key: "n8nWorkspaceAccessMode",
        kind: "enum",
        required: true,
        options: ["json_only", "buyer_workspace_access", "operator_workspace_access"],
        summary: `How Boreal should inspect or run the workflow for ${triggerClassification} mode.`,
      },
    ],
    credentialSlots: credentialSlots.map((slot) => ({
      key: slot.slotKey,
      kind: "text",
      required: slot.required,
      summary: slot.notes,
    })),
    operatorInputs: [
      {
        key: "repairNotes",
        kind: "text",
        required: false,
        summary: "Operator-side notes, constraints, or buyer exceptions.",
      },
    ],
  };
}

function buildOutputContract({
  blocks,
  fitAssessment,
}: {
  blocks: WorkflowBlock[];
  fitAssessment: N8nWorkflowFitAssessment;
}): WorkflowPackOutputContract {
  const artifacts = new Set<BorealOutputKind>([
    "workflow_map",
    "handoff_doc",
    "delivery",
  ]);

  if (fitAssessment.serviceFamilyHint !== "content_pipeline") {
    artifacts.add("workflow_build");
    artifacts.add("issue_log");
  }

  if (blocks.some((block) => block.kind === "generation")) {
    artifacts.add("media");
  }

  return {
    artifacts: Array.from(artifacts),
    summary:
      fitAssessment.serviceFamilyHint === "content_pipeline"
        ? "Workflow-backed content pipeline delivery package."
        : "Workflow-backed automation rescue and handoff package.",
  };
}

function sanitizeSourcePayload(workflowRoot: N8nWorkflowRoot) {
  const sanitized = sanitizeValue(workflowRoot);

  if (isObjectRecord(sanitized)) {
    return sanitized;
  }

  return {
    workflow: sanitized,
  };
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(record)) {
    const keyLower = key.toLowerCase();

    if (
      keyLower === "pindata" ||
      keyLower === "staticdata" ||
      keyLower === "binarydata"
    ) {
      continue;
    }

    if (keyLower === "credentials" && isObjectRecord(entryValue)) {
      sanitized[key] = Object.fromEntries(
        Object.entries(entryValue).map(([credentialKey, credentialValue]) => {
          const credentialRecord = asObjectRecord(credentialValue) ?? {};
          return [
            credentialKey,
            {
              ...(typeof credentialRecord.id === "string" ||
              typeof credentialRecord.id === "number"
                ? { id: credentialRecord.id }
                : {}),
              ...(typeof credentialRecord.name === "string"
                ? { name: credentialRecord.name }
                : {}),
              ...(typeof credentialRecord.type === "string"
                ? { type: credentialRecord.type }
                : {}),
            },
          ];
        })
      );
      continue;
    }

    if (isSensitiveKey(keyLower)) {
      sanitized[key] = "[redacted]";
      continue;
    }

    sanitized[key] = sanitizeValue(entryValue);
  }

  return sanitized;
}

function classifyBlockKind(type: string, title: string): WorkflowBlockKind {
  const candidate = `${type} ${title}`.toLowerCase();

  if (
    candidate.includes("trigger") ||
    candidate.includes("webhook") ||
    candidate.includes("schedule") ||
    candidate.includes("cron")
  ) {
    return "trigger";
  }

  if (
    candidate.includes("credential") ||
    candidate.includes("auth")
  ) {
    return "credential";
  }

  if (candidate.includes("if") || candidate.includes("switch") || candidate.includes("filter")) {
    return "condition";
  }

  if (
    candidate.includes("set") ||
    candidate.includes("merge") ||
    candidate.includes("transform") ||
    candidate.includes("code") ||
    candidate.includes("function")
  ) {
    return "transform";
  }

  if (
    candidate.includes("openai") ||
    candidate.includes("anthropic") ||
    candidate.includes("gpt") ||
    candidate.includes("llm")
  ) {
    return "llm";
  }

  if (
    candidate.includes("runway") ||
    candidate.includes("image") ||
    candidate.includes("video") ||
    candidate.includes("audio")
  ) {
    return "generation";
  }

  if (
    candidate.includes("approval") ||
    candidate.includes("human") ||
    candidate.includes("wait")
  ) {
    return "review";
  }

  if (
    candidate.includes("drive") ||
    candidate.includes("s3") ||
    candidate.includes("dropbox") ||
    candidate.includes("email") ||
    candidate.includes("send") ||
    candidate.includes("deliver")
  ) {
    return "delivery";
  }

  if (
    candidate.includes("verify") ||
    candidate.includes("proof") ||
    candidate.includes("evidence")
  ) {
    return "proof";
  }

  if (
    candidate.includes("http") ||
    candidate.includes("request") ||
    candidate.includes("api") ||
    candidate.includes("slack") ||
    candidate.includes("notion") ||
    candidate.includes("github")
  ) {
    return "integration";
  }

  return "input";
}

function summarizeNodeConfig(node: N8nWorkflowNode) {
  const type = node.type ?? "unknown";
  const parameters = node.parameters ?? {};
  const parameterKeys = Object.keys(parameters).slice(0, 8);

  return {
    type,
    typeVersion: node.typeVersion,
    disabled: node.disabled ?? false,
    parameterKeys,
    notes: node.notes,
  } satisfies Record<string, unknown>;
}

function inferOutputKindsForNode(
  kind: WorkflowBlockKind,
  type: string
): BorealOutputKind[] {
  const lowerType = type.toLowerCase();

  switch (kind) {
    case "generation":
      return lowerType.includes("video") ? ["video", "media"] : ["media", "draft"];
    case "llm":
      return ["draft"];
    case "review":
      return ["issue_log"];
    case "delivery":
      return ["delivery"];
    case "proof":
      return ["issue_log"];
    default:
      return [];
  }
}

function hasEnvironmentDependency(parameters: Record<string, unknown> | undefined) {
  return JSON.stringify(parameters ?? {}).match(/process\.env|\$env|env\./i) !== null;
}

function hasExpressionDependency(parameters: Record<string, unknown> | undefined) {
  return JSON.stringify(parameters ?? {}).match(/\{\{|\=\{\{/i) !== null;
}

function inferProviderKey(candidate: string | undefined) {
  const normalized = candidate?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const providerMap: Array<[string, string]> = [
    ["openai", "openai"],
    ["runway", "runway"],
    ["slack", "slack"],
    ["github", "github"],
    ["notion", "notion"],
    ["discord", "discord"],
    ["telegram", "telegram"],
    ["airtable", "airtable"],
    ["hubspot", "hubspot"],
    ["stripe", "stripe"],
    ["paypal", "paypal"],
    ["youtube", "youtube"],
    ["tiktok", "tiktok"],
    ["instagram", "instagram"],
    ["twitter", "x"],
    ["x.com", "x"],
    ["google", "google"],
    ["drive", "google_drive"],
    ["sheets", "google_sheets"],
    ["postgres", "postgres"],
    ["mysql", "mysql"],
    ["supabase", "supabase"],
    ["shopify", "shopify"],
    ["mailchimp", "mailchimp"],
  ];

  for (const [token, providerKey] of providerMap) {
    if (normalized.includes(token)) {
      return providerKey;
    }
  }

  if (normalized.startsWith("n8n")) {
    return "n8n";
  }

  return undefined;
}

function isCodeNodeType(type: string) {
  return (
    type.includes(".code") ||
    type.includes(".function") ||
    type.includes(".functionitem")
  );
}

function isLocalProcessNodeType(type: string) {
  return type.includes("executecommand") || type.includes("ssh");
}

function isFilesystemNodeType(type: string) {
  return (
    type.includes("readbinaryfile") ||
    type.includes("writebinaryfile") ||
    type.includes("readwritefile")
  );
}

function isSubworkflowNodeType(type: string) {
  return type.includes("executeworkflow");
}

function isCommunityNodeType(type: string) {
  if (!type) {
    return false;
  }

  return !type.startsWith("n8n-nodes-base.") && !type.startsWith("@n8n/");
}

function addUnsupportedFeature(
  features: Map<string, WorkflowUnsupportedFeature>,
  {
    featureKey,
    summary,
    blocking,
    nodeKey,
  }: {
    featureKey: string;
    summary: string;
    blocking: boolean;
    nodeKey: string;
  }
) {
  const existing = features.get(featureKey);
  if (existing) {
    if (!existing.nodeKeys.includes(nodeKey)) {
      existing.nodeKeys.push(nodeKey);
    }
    existing.blocking = existing.blocking || blocking;
    return;
  }

  features.set(featureKey, {
    featureKey,
    summary,
    blocking,
    nodeKeys: [nodeKey],
  });
}

function toBlockKey(name: string, id: string | number | undefined, index: number) {
  const label = slugifyToken(name).slice(0, 40) || "node";
  const suffix =
    id !== undefined && id !== null
      ? slugifyToken(String(id)).slice(0, 12)
      : String(index + 1);

  return `${label}_${suffix}`;
}

function normalizeText(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeToken(value: string | undefined | null) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return undefined;
  }

  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function slugifyToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isSensitiveKey(key: string) {
  return (
    key.includes("secret") ||
    key.includes("token") ||
    key.includes("password") ||
    key.includes("apikey") ||
    key.includes("api_key") ||
    key.includes("clientsecret")
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asObjectRecord(value: unknown) {
  return isObjectRecord(value) ? value : undefined;
}

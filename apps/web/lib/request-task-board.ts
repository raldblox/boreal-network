import type {
  BorealRequestDraft,
  RequestActivityEntry,
  RequestActorRef,
  RequestFulfillment,
  RequestPhasePlan,
  RequestRoleKey,
} from "./request";
import type { BorealSupplyDraft } from "./supply";

export type RequestTaskBoardStageId =
  | "todo"
  | "in_progress"
  | "review"
  | "completed";

export type RequestTaskBoardWorker = {
  assigned: boolean;
  detail: string;
  kind: RequestActorRef["kind"] | "lane";
  label: string;
  roleKey?: RequestRoleKey;
  supplyId?: string;
};

export type RequestTaskBoardCard = {
  artifactCount: number;
  dependsOnCount: number;
  id: string;
  proofLabels: string[];
  roleLabels: string[];
  source: "request_phase" | "fulfillment_step";
  stageId: RequestTaskBoardStageId;
  statusLabel: string;
  summary: string;
  title: string;
  worker: RequestTaskBoardWorker;
};

export type RequestTaskBoardColumn = {
  cards: RequestTaskBoardCard[];
  id: RequestTaskBoardStageId;
  summary: string;
  title: string;
};

export type RequestTaskBoardProjection = {
  columns: RequestTaskBoardColumn[];
  hasAssignedWorker: boolean;
  hasFulfillmentSteps: boolean;
  summary: string;
  totalCards: number;
};

export function buildRequestTaskBoardProjection({
  request,
  activities,
  fulfillment,
  activeRouteSupply,
  preferredSupply,
}: {
  request: BorealRequestDraft;
  activities: RequestActivityEntry[];
  fulfillment: RequestFulfillment | null;
  activeRouteSupply?: BorealSupplyDraft | null;
  preferredSupply?: BorealSupplyDraft | null;
}): RequestTaskBoardProjection {
  const artifactsByStepId = groupArtifactsByStepId(activities);
  const supplyById = buildSupplyLookup([activeRouteSupply, preferredSupply]);
  const cards =
    fulfillment && fulfillment.steps.length > 0
      ? fulfillment.steps.map((step, index) => {
          const phase = getPhaseForStep(request.derived.phases, step);
          const roleKeys = getStepRoleKeys(step, phase);
          const proofLabels = getStepProofLabels(step, phase);
          const stepArtifacts = artifactsByStepId.get(step.id) ?? [];

          return {
            artifactCount: stepArtifacts.length,
            dependsOnCount: step.dependsOnStepIds?.length ?? 0,
            id: `step:${step.id}`,
            proofLabels,
            roleLabels: roleKeys.map(formatLabel),
            source: "fulfillment_step" as const,
            stageId: getStageForFulfillmentStep({
              artifactCount: stepArtifacts.length,
              fulfillment,
              index,
              request,
              stepStatus: step.status,
              totalSteps: fulfillment.steps.length,
            }),
            statusLabel: formatLabel(step.status),
            summary: getStepSummary(step, phase, request),
            title: step.title,
            worker: getFulfillmentStepWorker({
              fulfillment,
              phase,
              request,
              roleKeys,
              step,
              supplyById,
            }),
          } satisfies RequestTaskBoardCard;
        })
      : getPlanPhaseCards({
          request,
          supplyById,
        });
  const columns = createTaskBoardColumns(cards);

  return {
    columns,
    hasAssignedWorker: cards.some((card) => card.worker.assigned),
    hasFulfillmentSteps: Boolean(fulfillment && fulfillment.steps.length > 0),
    summary: getTaskBoardSummary({ cards, fulfillment, request }),
    totalCards: cards.length,
  };
}

function getPlanPhaseCards({
  request,
  supplyById,
}: {
  request: BorealRequestDraft;
  supplyById: Map<string, BorealSupplyDraft>;
}): RequestTaskBoardCard[] {
  const phases = getRequestPlanPhases(request);

  return phases.map((phase, index) => {
    const roleKeys = phase.roleKeys.length > 0
      ? phase.roleKeys
      : request.derived.leadRole
        ? [request.derived.leadRole]
        : [];

    return {
      artifactCount: 0,
      dependsOnCount: index > 0 ? 1 : 0,
      id: `phase:${phase.phaseKey}:${index}`,
      proofLabels: phase.requiredEvidenceClaims.map(formatLabel),
      roleLabels: roleKeys.map(formatLabel),
      source: "request_phase",
      stageId: "todo",
      statusLabel: "planned",
      summary: phase.summary,
      title: phase.title,
      worker: getPlanPhaseWorker({
        request,
        roleKeys,
        supplyById,
      }),
    } satisfies RequestTaskBoardCard;
  });
}

function getRequestPlanPhases(request: BorealRequestDraft): RequestPhasePlan[] {
  if (request.derived.phases.length > 0) {
    return request.derived.phases;
  }

  return [
    {
      phaseKey: "execute_delivery",
      title: "Complete the requested deliverable",
      summary:
        request.brief.summary?.trim() ||
        request.brief.body?.trim() ||
        "Carry the request from execution through delivery inside one request lane.",
      roleKeys: request.derived.leadRole ? [request.derived.leadRole] : [],
      requiredEvidenceClaims:
        request.derived.verificationPlan.requiredEvidenceClaims,
    },
  ];
}

function createTaskBoardColumns(
  cards: RequestTaskBoardCard[]
): RequestTaskBoardColumn[] {
  const definitions: Array<Omit<RequestTaskBoardColumn, "cards">> = [
    {
      id: "todo",
      title: "To do",
      summary: "Planned work that has not started yet.",
    },
    {
      id: "in_progress",
      title: "In progress",
      summary: "Work currently owned by a worker lane.",
    },
    {
      id: "review",
      title: "Review",
      summary: "Proof, blockers, or owner acceptance need attention.",
    },
    {
      id: "completed",
      title: "Completed",
      summary: "Finished steps already accepted or done.",
    },
  ];

  return definitions.map((definition) => ({
    ...definition,
    cards: cards.filter((card) => card.stageId === definition.id),
  }));
}

function getStageForFulfillmentStep({
  artifactCount,
  fulfillment,
  index,
  request,
  stepStatus,
  totalSteps,
}: {
  artifactCount: number;
  fulfillment: RequestFulfillment;
  index: number;
  request: BorealRequestDraft;
  stepStatus: RequestFulfillment["steps"][number]["status"];
  totalSteps: number;
}): RequestTaskBoardStageId {
  if (stepStatus === "todo") {
    return "todo";
  }

  if (
    stepStatus === "ready" ||
    stepStatus === "active" ||
    stepStatus === "blocked"
  ) {
    return "in_progress";
  }

  if (stepStatus === "failed" || stepStatus === "cancelled") {
    return "review";
  }

  const isFinalStep = index === totalSteps - 1;
  const isAccepted =
    request.status === "completed" || fulfillment.status === "accepted";

  if (isAccepted) {
    return "completed";
  }

  if (
    isFinalStep &&
    (request.status === "delivered" ||
      request.status === "waiting_for_owner" ||
      fulfillment.status === "delivered" ||
      artifactCount > 0)
  ) {
    return "review";
  }

  return "completed";
}

function getFulfillmentStepWorker({
  fulfillment,
  phase,
  request,
  roleKeys,
  step,
  supplyById,
}: {
  fulfillment: RequestFulfillment;
  phase: RequestPhasePlan | null;
  request: BorealRequestDraft;
  roleKeys: RequestRoleKey[];
  step: RequestFulfillment["steps"][number];
  supplyById: Map<string, BorealSupplyDraft>;
}): RequestTaskBoardWorker {
  if (step.assignee) {
    return actorToWorker(step.assignee, {
      assigned: true,
      detail: "Step assignee",
    });
  }

  const assignedSupplyId = getMetadataString(step.metadata, "assignedSupplyId");
  const assignedSupply = assignedSupplyId
    ? supplyById.get(assignedSupplyId)
    : null;
  if (assignedSupply) {
    return supplyToWorker(assignedSupply, {
      assigned: true,
      detail: "Assigned supply",
      roleKey: roleKeys[0],
    });
  }

  const fulfillmentSupply = fulfillment.supplyId
    ? supplyById.get(fulfillment.supplyId)
    : null;
  if (fulfillmentSupply) {
    return supplyToWorker(fulfillmentSupply, {
      assigned: true,
      detail: "Fulfillment supply",
      roleKey: roleKeys[0],
    });
  }

  if (fulfillment.lead) {
    return actorToWorker(fulfillment.lead, {
      assigned: true,
      detail: "Fulfillment lead",
      roleKey: roleKeys[0],
    });
  }

  return getPlanPhaseWorker({
    request,
    roleKeys: phase?.roleKeys ?? roleKeys,
    supplyById,
  });
}

function getPlanPhaseWorker({
  request,
  roleKeys,
  supplyById,
}: {
  request: BorealRequestDraft;
  roleKeys: RequestRoleKey[];
  supplyById: Map<string, BorealSupplyDraft>;
}): RequestTaskBoardWorker {
  const primaryRoleKey = roleKeys[0] ?? request.derived.leadRole;
  const roleMatches = request.derived.roleMatches ?? [];
  const roleMatch = primaryRoleKey
    ? roleMatches.find(
        (match) => match.roleKey === primaryRoleKey && Boolean(match.supplyId)
      )
    : roleMatches.find((match) => Boolean(match.supplyId));

  if (roleMatch?.supplyId) {
    const matchedSupply = supplyById.get(roleMatch.supplyId);
    if (matchedSupply) {
      return supplyToWorker(matchedSupply, {
        assigned: roleMatch.status === "attached",
        detail:
          roleMatch.status === "attached"
            ? "Attached worker"
            : "Candidate worker",
        roleKey: roleMatch.roleKey,
      });
    }

    return {
      assigned: roleMatch.status === "attached",
      detail:
        roleMatch.status === "attached"
          ? "Attached worker"
          : "Candidate worker",
      kind: "lane",
      label: roleMatch.supplyId,
      roleKey: roleMatch.roleKey,
      supplyId: roleMatch.supplyId,
    };
  }

  const roleSlot = primaryRoleKey
    ? request.derived.roleSlots.find((slot) => slot.roleKey === primaryRoleKey)
    : null;

  return {
    assigned: false,
    detail: roleSlot?.required ? "Required lane open" : "Worker lane open",
    kind: "lane",
    label: roleSlot?.title ?? "Worker lane open",
    ...(primaryRoleKey ? { roleKey: primaryRoleKey } : {}),
  };
}

function getPhaseForStep(
  phases: RequestPhasePlan[],
  step: RequestFulfillment["steps"][number]
) {
  const phaseKey = getMetadataString(step.metadata, "phaseKey") || step.kind;
  return phases.find((phase) => phase.phaseKey === phaseKey) ?? null;
}

function getStepRoleKeys(
  step: RequestFulfillment["steps"][number],
  phase: RequestPhasePlan | null
): RequestRoleKey[] {
  const roleKeys = getMetadataStringArray(step.metadata, "roleKeys");
  if (roleKeys.length > 0) {
    return roleKeys as RequestRoleKey[];
  }

  return phase?.roleKeys ?? [];
}

function getStepProofLabels(
  step: RequestFulfillment["steps"][number],
  phase: RequestPhasePlan | null
) {
  const evidenceClaims = getMetadataStringArray(
    step.metadata,
    "requiredEvidenceClaims"
  );
  const values =
    evidenceClaims.length > 0
      ? evidenceClaims
      : phase?.requiredEvidenceClaims ?? [];

  return values.map(formatLabel);
}

function getStepSummary(
  step: RequestFulfillment["steps"][number],
  phase: RequestPhasePlan | null,
  request: BorealRequestDraft
) {
  const phaseSummary = getMetadataString(step.metadata, "phaseSummary");

  return (
    phaseSummary ||
    phase?.summary ||
    request.brief.summary?.trim() ||
    request.brief.body?.trim() ||
    "Move this request toward proof-bearing delivery."
  );
}

function actorToWorker(
  actor: RequestActorRef,
  {
    assigned,
    detail,
    roleKey,
  }: {
    assigned: boolean;
    detail: string;
    roleKey?: RequestRoleKey;
  }
): RequestTaskBoardWorker {
  return {
    assigned,
    detail,
    kind: actor.kind,
    label:
      actor.displayName?.trim() ||
      actor.handle?.trim() ||
      actor.id ||
      formatLabel(actor.kind),
    ...(roleKey ? { roleKey } : {}),
  };
}

function supplyToWorker(
  supply: BorealSupplyDraft,
  {
    assigned,
    detail,
    roleKey,
  }: {
    assigned: boolean;
    detail: string;
    roleKey?: RequestRoleKey;
  }
): RequestTaskBoardWorker {
  return {
    assigned,
    detail,
    kind: supply.capability.fulfillmentActorKinds[0] ?? "human",
    label:
      supply.profile.displayName.trim() ||
      supply.profile.headline?.trim() ||
      supply.key,
    ...(roleKey ? { roleKey } : {}),
    supplyId: supply.id,
  };
}

function getTaskBoardSummary({
  cards,
  fulfillment,
  request,
}: {
  cards: RequestTaskBoardCard[];
  fulfillment: RequestFulfillment | null;
  request: BorealRequestDraft;
}) {
  if (cards.length === 0) {
    return "No plan phases or execution steps are ready to visualize yet.";
  }

  if (fulfillment && fulfillment.steps.length > 0) {
    return "Fulfillment steps are moving across the board from planned work to proof review and completion.";
  }

  if (request.derived.assignmentProposal?.state === "execution_attached") {
    return "The request has an attached execution lane; steps will move as fulfillment updates land.";
  }

  return "Planner phases are shown as task cards until a real fulfillment lane converts them into executable steps.";
}

function groupArtifactsByStepId(activities: RequestActivityEntry[]) {
  const artifactsByStepId = new Map<
    string,
    NonNullable<RequestActivityEntry["artifact"]>[]
  >();

  for (const activity of activities) {
    const artifact = activity.artifact;
    if (!artifact?.stepId) {
      continue;
    }

    const existing = artifactsByStepId.get(artifact.stepId) ?? [];
    existing.push(artifact);
    artifactsByStepId.set(artifact.stepId, existing);
  }

  return artifactsByStepId;
}

function buildSupplyLookup(supplies: Array<BorealSupplyDraft | null | undefined>) {
  const supplyById = new Map<string, BorealSupplyDraft>();

  for (const supply of supplies) {
    if (supply) {
      supplyById.set(supply.id, supply);
    }
  }

  return supplyById;
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getMetadataStringArray(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

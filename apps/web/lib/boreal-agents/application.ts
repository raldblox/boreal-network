import { z } from "zod";
import type { BorealAgentTemplate } from "@/lib/boreal-agents/registry";

const briefSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().optional(),
    body: z.string().optional(),
    outputKinds: z.array(z.string()).optional(),
  })
  .passthrough();

const derivedSchema = z
  .object({
    seeking: z
      .object({
        supplyKinds: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    executionProfile: z
      .object({
        requiresHumanPresence: z.boolean().optional(),
        requiresLocalAccess: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

export const borealAgentRequestSummarySchema = z
  .object({
    id: z.string().min(1),
    visibility: z.enum(["public", "private"]),
    status: z.string().optional(),
    brief: briefSchema.optional(),
    derived: derivedSchema,
    constraints: z
      .object({
        requiresHumanPresence: z.boolean().optional(),
        requiresLocalAccess: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const borealAgentSupplySummarySchema = z
  .object({
    id: z.string().optional(),
    kind: z.string().optional(),
    capabilityTags: z.array(z.string()).optional(),
    providerRef: z.string().optional(),
  })
  .strict()
  .optional();

export const borealAgentPrepareApplicationSchema = z
  .object({
    action: z.literal("prepare_application"),
    request: borealAgentRequestSummarySchema,
    supply: borealAgentSupplySummarySchema,
  })
  .strict();

export type BorealAgentPrepareApplicationInput = z.infer<
  typeof borealAgentPrepareApplicationSchema
>;

export type BorealAgentApplicationResult = ReturnType<
  typeof prepareBorealAgentApplication
>;

const nonAuthority = {
  canMutateRequest: false,
  canCreateCommitment: false,
  canCreateFulfillment: false,
  canCallProvider: false,
  requiresSeparateAuthorizedMutation: true,
} as const;

export function prepareBorealAgentApplication({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const evaluation = evaluateQualification({ input, template });
  const lane =
    input.request.visibility === "private"
      ? "owner_private_direct_worker_fulfillment"
      : "public_or_cross_actor_commitment_application";

  return {
    kind: "prepared_agent_application",
    agent: {
      agentKey: template.agentKey,
      uniqueName: template.uniqueName,
      displayName: template.displayName,
      status: template.status,
      workerKey: template.workerKey,
      apiRoute: template.apiRoute,
    },
    request: {
      id: input.request.id,
      visibility: input.request.visibility,
      status: input.request.status ?? null,
    },
    qualification: {
      allowedToWake: evaluation.allowedToWake,
      reasons: evaluation.reasons,
      rejectedBy: evaluation.rejectedBy,
      recommendedLane: evaluation.allowedToWake ? lane : "do_not_wake",
    },
    scanner: {
      canonicalReads: ["Request", "Supply", "RequestEvent"],
      canonicalWrites: [],
      sideEffects: [],
    },
    applicationPacket: buildApplicationPacket({ input, lane, template }),
    taskPipeline: template.taskPipeline.map((task) => ({
      ...task,
      state: stateForTask({ lane, taskKind: task.kind, template }),
    })),
    nonAuthority,
  };
}

function evaluateQualification({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const reasons: string[] = [];
  const rejectedBy: string[] = [];

  if (template.status !== "live_template") {
    rejectedBy.push("target_template_not_live");
  }

  const humanRequired = requiresHumanWork(input);
  if (humanRequired) {
    rejectedBy.push("human_required_boundary");
  }

  if (template.agentKey === "mira-video") {
    const videoSignal = hasVideoGenerationSignal(input);
    if (videoSignal) {
      reasons.push("video_generation_signal_detected");
    } else {
      rejectedBy.push("no_video_generation_signal");
    }
  }

  if (template.agentKey === "tala-humanizer") {
    rejectedBy.push("supply_factory_not_implemented");
  }

  const allowedToWake = rejectedBy.length === 0;
  if (allowedToWake) {
    reasons.push("safe_to_prepare_application_without_mutation");
  }

  return {
    allowedToWake,
    reasons,
    rejectedBy,
  };
}

function hasVideoGenerationSignal(input: BorealAgentPrepareApplicationInput) {
  const outputKinds = input.request.brief?.outputKinds ?? [];
  const supplyKinds = input.request.derived?.seeking?.supplyKinds ?? [];
  const text = [
    input.request.brief?.title,
    input.request.brief?.summary,
    input.request.brief?.body,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    outputKinds.some(isVideoLike) ||
    supplyKinds.some((kind) => kind === "video_generation") ||
    /\b(video|teaser|clip|reel)\b/.test(text)
  );
}

function isVideoLike(value: string) {
  const normalized = value.toLowerCase();
  return normalized === "video" || normalized === "media";
}

function requiresHumanWork(input: BorealAgentPrepareApplicationInput) {
  return Boolean(
    input.request.derived?.executionProfile?.requiresHumanPresence ||
      input.request.derived?.executionProfile?.requiresLocalAccess ||
      input.request.constraints?.requiresHumanPresence ||
      input.request.constraints?.requiresLocalAccess
  );
}

function buildApplicationPacket({
  input,
  lane,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  lane: string;
  template: BorealAgentTemplate;
}) {
  const base = {
    requestId: input.request.id,
    agentKey: template.agentKey,
    workerKey: template.workerKey,
    supplyBinding: template.supplyBinding,
    durableWriteStatus: "not_created_prepare_only",
    requiredNextAction: "submit_through_authorized_mutation_route",
  } as const;

  if (lane === "owner_private_direct_worker_fulfillment") {
    return {
      ...base,
      proposedCanonicalWrites: ["Fulfillment", "FulfillmentStep", "RequestEvent"],
      proposedObject: "Fulfillment",
      ownerApprovalMode: "trusted_worker_auto_approval_required",
    };
  }

  return {
    ...base,
    proposedCanonicalWrites: ["Commitment", "RequestEvent"],
    proposedObject: "Commitment",
    ownerApprovalMode: "explicit_owner_acceptance_required",
  };
}

function stateForTask({
  lane,
  taskKind,
  template,
}: {
  lane: string;
  taskKind: string;
  template: BorealAgentTemplate;
}) {
  if (template.status !== "live_template") {
    return "target_only";
  }

  if (
    taskKind === "submit_commitment" &&
    lane === "owner_private_direct_worker_fulfillment"
  ) {
    return "not_needed_for_private_direct_worker_lane";
  }

  if (
    taskKind === "create_owner_private_fulfillment" &&
    lane !== "owner_private_direct_worker_fulfillment"
  ) {
    return "blocked_until_owner_accepts_commitment";
  }

  if (taskKind === "run_provider" || taskKind === "publish_artifact") {
    return "blocked_until_authorized_fulfillment_exists";
  }

  return "prepared_only";
}

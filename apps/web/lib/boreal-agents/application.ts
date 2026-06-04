import { z } from "zod";
import type { BorealAgentTemplate } from "@/lib/boreal-agents/registry";

const briefSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().optional(),
    body: z.string().optional(),
    constraints: z.record(z.unknown()).optional(),
    outputKinds: z.array(z.string()).optional(),
  })
  .passthrough();

const seekingSchema = z
  .object({
    actorKinds: z.array(z.string()).optional(),
    supplyKinds: z.array(z.string()).optional(),
  })
  .passthrough()
  .optional();

const derivedSchema = z
  .object({
    executionKind: z.string().nullable().optional(),
    routeSummary: z.string().nullable().optional(),
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

const routingSchema = z
  .object({
    preferredSupplyId: z.string().nullable().optional(),
  })
  .passthrough()
  .optional();

const ownerApprovalSchema = z
  .object({
    trustedWorkerAutoApproval: z.boolean().optional(),
    allowedWorkerKeys: z.array(z.string()).optional(),
    selectedSupplyId: z.string().nullable().optional(),
  })
  .passthrough()
  .optional();

export const borealAgentRequestSummarySchema = z
  .object({
    id: z.string().min(1),
    visibility: z.enum(["public", "private"]),
    status: z.string().optional(),
    brief: briefSchema.optional(),
    seeking: seekingSchema,
    derived: derivedSchema,
    routing: routingSchema,
    ownerApproval: ownerApprovalSchema,
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
    status: z.string().optional(),
    supplyKinds: z.array(z.string()).optional(),
    outputKinds: z.array(z.string()).optional(),
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
    evaluation.ownerPrivateAutoApproval.allowed
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
      framework: {
        id: template.framework.id,
        version: template.framework.version,
        routeMode: template.framework.routeMode,
      },
      promotion: {
        state: template.promotionGates.state,
        openBlockers: [...template.promotionGates.openBlockers],
      },
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
      ownerPrivateAutoApproval: evaluation.ownerPrivateAutoApproval,
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
  const supplyBinding = evaluateSupplyBinding({ input, template });
  const ownerPrivateAutoApproval = evaluateOwnerPrivateAutoApproval({
    input,
    template,
  });
  reasons.push(...supplyBinding.reasons);
  rejectedBy.push(...supplyBinding.rejectedBy);

  if (template.status !== "live_template") {
    rejectedBy.push("target_template_not_live");
  }

  const humanRequired = requiresHumanWork(input);
  if (humanRequired) {
    rejectedBy.push("human_required_boundary");
  }

  if (
    input.request.visibility === "private" &&
    !ownerPrivateAutoApproval.allowed
  ) {
    rejectedBy.push(...ownerPrivateAutoApproval.rejectedBy);
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
    ownerPrivateAutoApproval,
  };
}

function evaluateSupplyBinding({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const reasons: string[] = [];
  const rejectedBy: string[] = [];

  if (!template.supplyBinding.required) {
    return { reasons, rejectedBy };
  }

  if (!input.supply?.id) {
    rejectedBy.push("missing_required_supply_binding");
    return { reasons, rejectedBy };
  }

  if (input.supply.status !== "published") {
    rejectedBy.push("selected_supply_not_published");
  }

  if (input.supply.kind !== template.supplyBinding.supplyKind) {
    rejectedBy.push("supply_kind_mismatch");
  }

  if (input.supply.providerRef !== template.supplyBinding.providerRef) {
    rejectedBy.push("provider_ref_mismatch");
  }

  if (rejectedBy.length === 0) {
    reasons.push("required_supply_binding_present");
  }

  return { reasons, rejectedBy };
}

function evaluateOwnerPrivateAutoApproval({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const reasons: string[] = [];
  const rejectedBy: string[] = [];

  if (input.request.visibility !== "private") {
    return {
      allowed: false,
      reasons,
      rejectedBy: ["not_owner_private_request"],
      selectedSupplyId: null,
    };
  }

  const selectedSupplyId =
    input.request.ownerApproval?.selectedSupplyId?.trim() ||
    input.request.routing?.preferredSupplyId?.trim() ||
    null;
  const allowedWorkerKeys =
    input.request.ownerApproval?.allowedWorkerKeys ?? [];

  if (!isDirectOwnerPrivateStatus(input.request.status)) {
    rejectedBy.push("private_request_status_not_direct_eligible");
  }

  if (input.request.ownerApproval?.trustedWorkerAutoApproval !== true) {
    rejectedBy.push("owner_auto_approval_not_enabled");
  }

  if (
    allowedWorkerKeys.length > 0 &&
    !allowedWorkerKeys.includes(template.workerKey)
  ) {
    rejectedBy.push("worker_not_owner_auto_approved");
  }

  if (!selectedSupplyId) {
    rejectedBy.push("selected_supply_required_for_auto_approval");
  } else if (input.supply?.id && input.supply.id !== selectedSupplyId) {
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

function isDirectOwnerPrivateStatus(status: string | undefined) {
  return (
    status === "open" ||
    status === "funded" ||
    status === "in_progress" ||
    status === "waiting_for_owner"
  );
}

function hasVideoGenerationSignal(input: BorealAgentPrepareApplicationInput) {
  const outputKinds = input.request.brief?.outputKinds ?? [];
  const supplyKinds = [
    ...(input.request.derived?.seeking?.supplyKinds ?? []),
    ...(input.request.seeking?.supplyKinds ?? []),
  ];
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
  const actorKinds = input.request.seeking?.actorKinds ?? [];
  const executionKind = input.request.derived?.executionKind ?? "";
  const briefConstraints = input.request.brief?.constraints ?? {};

  return Boolean(
    input.request.derived?.executionProfile?.requiresHumanPresence ||
      input.request.derived?.executionProfile?.requiresLocalAccess ||
      input.request.constraints?.requiresHumanPresence ||
      input.request.constraints?.requiresLocalAccess ||
      briefConstraints.requiresHumanPresence === true ||
      briefConstraints.requiresLocalAccess === true ||
      actorKinds.some(isHumanActorKind) ||
      isHumanOrLocalExecutionKind(executionKind)
  );
}

function isHumanActorKind(value: string) {
  return value.toLowerCase().replace(/[-\s]+/g, "_").includes("human");
}

function isHumanOrLocalExecutionKind(value: string) {
  const normalized = value.toLowerCase().replace(/[-\s]+/g, "_");

  return ["human", "field", "local", "embodied", "onsite"].some((token) =>
    normalized.includes(token)
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
    submissionPreflight: buildSubmissionPreflight({ input, lane, template }),
    authorizedExecutionHandoff: buildAuthorizedExecutionHandoff({
      lane,
      template,
    }),
  } as const;

  if (lane === "owner_private_direct_worker_fulfillment") {
    return {
      ...base,
      mutationCall: buildFulfillmentMutationCall({ input, template }),
      proposedCanonicalWrites: ["Fulfillment", "FulfillmentStep", "RequestEvent"],
      proposedObject: "Fulfillment",
      ownerApprovalMode: "trusted_worker_auto_approval_required",
    };
  }

  return {
    ...base,
    mutationCall: buildCommitmentMutationCall({ input, template }),
    proposedCanonicalWrites: ["Commitment", "RequestEvent"],
    proposedObject: "Commitment",
    ownerApprovalMode: "explicit_owner_acceptance_required",
  };
}

function normalizeStrings(values: readonly (string | undefined)[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function buildRequestFit(input: BorealAgentPrepareApplicationInput) {
  return {
    ...(input.supply?.id ? { selectedSupplyId: input.supply.id } : {}),
    ...(input.supply?.status
      ? { selectedSupplyStatus: input.supply.status }
      : {}),
    requestSupplyKinds: normalizeStrings([
      ...(input.request.derived?.seeking?.supplyKinds ?? []),
      ...(input.request.seeking?.supplyKinds ?? []),
    ]),
    requestOutputKinds: normalizeStrings(input.request.brief?.outputKinds ?? []),
    selectedSupplyKinds: normalizeStrings([
      input.supply?.kind,
      ...(input.supply?.supplyKinds ?? []),
    ]),
    selectedOutputKinds: normalizeStrings([
      ...(input.supply?.outputKinds ?? []),
      ...(input.supply?.capabilityTags ?? []),
    ]),
  };
}

function buildPreflightPayloadSummary({
  input,
  directOwnerPrivate,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  directOwnerPrivate: boolean;
  template: BorealAgentTemplate;
}) {
  const laneSummary = directOwnerPrivate
    ? "owner-private direct Fulfillment preparation"
    : "Commitment proposal preparation";
  const supplySummary = input.supply?.id
    ? ` using selected Supply ${input.supply.id}`
    : "";

  return `${template.uniqueName} ${laneSummary} for Request ${input.request.id}${supplySummary}.`;
}

function buildSubmissionPreflight({
  input,
  lane,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  lane: string;
  template: BorealAgentTemplate;
}) {
  const directOwnerPrivate =
    lane === "owner_private_direct_worker_fulfillment";
  const actionId = directOwnerPrivate
    ? "create_owner_private_fulfillment"
    : "apply_to_request";
  const requestedScopes = directOwnerPrivate
    ? ["fulfillments:create"]
    : ["commitments:propose"];
  const requestFit = buildRequestFit(input);
  const representedActor = {
    kind: "agent",
    reference: `boreal-agent:${template.agentKey}`,
  };
  const payloadSummary = buildPreflightPayloadSummary({
    directOwnerPrivate,
    input,
    template,
  });

  return {
    endpoint: "/agents/actions/preflight",
    actionId,
    requiredStatus: "preflight_passed",
    requiredBeforeMutation: true,
    requiredInput: {
      schemaVersion: 1,
      requestId: input.request.id,
      representedActor,
      hasHumanApproval: true,
      hasIdempotencyKey: true,
      requestedScopes,
      payloadSummaryRequired: true,
      requestFit,
    },
    preflightRequest: {
      schemaVersion: 1,
      actionId,
      requestId: input.request.id,
      representedActor,
      hasHumanApproval: true,
      hasIdempotencyKey: true,
      requestedScopes,
      payloadSummary,
      requestFit,
    },
    routePolicyRecheck: {
      requestDetailRequired: true,
      agentActionPolicyRequired: true,
      selectedSupplyRequired: template.supplyBinding.required,
      ownerPrivateAutoApprovalRequired: directOwnerPrivate,
      mutationScopeIfResolverBearer: directOwnerPrivate
        ? "fulfillments:create"
        : "commitments:propose",
    },
    mustReadBeforeSubmit: [
      "request detail",
      "agentActionPolicy",
      "selected Supply",
      "existing activeRefs",
      "funding and proof requirements",
    ],
    forbiddenClaimsBeforeAuthorizedMutation: [
      "owner approval recorded",
      "worker assigned",
      "commitment created",
      "fulfillment started",
      "artifact published",
      "payment authorized",
      "request completed",
    ],
    nonAuthority:
      "Passing preparation is not enough to submit. Run action preflight and re-check the live route policy before the authorized mutation route is attempted.",
  } as const;
}

function buildAuthorizedExecutionHandoff({
  lane,
  template,
}: {
  lane: string;
  template: BorealAgentTemplate;
}) {
  const directOwnerPrivate =
    lane === "owner_private_direct_worker_fulfillment";

  return {
    status:
      template.status === "live_template"
        ? "blocked_until_authorized_fulfillment_exists"
        : "target_only",
    activationBoundary: directOwnerPrivate
      ? "owner_private_direct_fulfillment_route_success"
      : "accepted_commitment_then_fulfillment_route_success",
    providerCallsAllowedBeforeFulfillment: false,
    secretValuesIncluded: false,
    requiredCredentialRefs: template.modelBindings.map((binding) => ({
      provider: binding.provider,
      env: binding.env,
      purpose: binding.purpose,
      models: [...binding.models],
      secretValueIncluded: false,
    })),
    taskSequence: template.taskPipeline.map((task) => ({
      id: task.id,
      kind: task.kind,
      state: stateForTask({
        lane,
        taskKind: task.kind,
        template,
      }),
      summary: task.summary,
      canonicalReads: [...task.canonicalReads],
      canonicalWritesIfAuthorized: [...task.canonicalWritesIfAuthorized],
      toolRefs: toolRefsForTask({ taskKind: task.kind, template }),
    })),
    requiredBeforeProviderRun: [
      "submissionPreflight.status=preflight_passed",
      directOwnerPrivate
        ? "authorized owner-private Fulfillment route succeeded"
        : "Commitment accepted and authorized Fulfillment route succeeded",
      "active Fulfillment id is available",
      "selected Supply is still the request-bound supply",
      "idempotency and retry metadata are ready",
    ],
    canonicalBoundary: {
      rootObject: "Request",
      executionTruthObject: "Fulfillment",
      stepTruthObject: "FulfillmentStep",
      artifactTruthObject: "Artifact",
      eventTruthObject: "RequestEvent",
    },
    nonAuthority:
      "This handoff is a post-authorization execution plan only. It does not call providers, start fulfillment, publish artifacts, authorize payment, or prove completion.",
  } as const;
}

function toolRefsForTask({
  taskKind,
  template,
}: {
  taskKind: string;
  template: BorealAgentTemplate;
}) {
  switch (taskKind) {
    case "inspect_request":
      return template.toolBindings.filter((tool) =>
        tool.startsWith("GET /api/requests")
      );
    case "prepare_application":
    case "submit_commitment":
      return template.toolBindings.filter((tool) =>
        tool.includes("/commitments")
      );
    case "create_owner_private_fulfillment":
    case "run_provider":
    case "monitor_or_retry":
      return template.toolBindings.filter(
        (tool) =>
          tool.includes("/fulfillments") || tool.includes("/retry")
      );
    case "publish_artifact":
      return template.toolBindings.filter((tool) => tool.includes("/artifacts"));
    default:
      return [];
  }
}

function buildCommitmentMutationCall({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const deliverableSummary = buildDeliverableSummary({ input, template });

  return {
    method: "POST",
    route: `/api/requests/${input.request.id}/commitments`,
    auth: "Boreal account session or resolver bearer token with commitments:propose",
    requiredHeaders: ["Idempotency-Key"],
    body: {
      kind: "proposal",
      ...(input.supply?.id ? { supplyId: input.supply.id } : {}),
      summary: `${template.displayName} can apply as ${template.workerKey}: ${deliverableSummary}`,
      terms: {
        fundingRequired: false,
        amountMode: "open",
        deliverableSummary,
        paymentNotes:
          "Prepared by a named Boreal agent. Owner acceptance is required before fulfillment starts.",
      },
    },
    nonAuthority:
      "This packet is not submitted by the agent preparation route and does not create a Commitment.",
  } as const;
}

function buildFulfillmentMutationCall({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const deliverableSummary = buildDeliverableSummary({ input, template });

  return {
    method: "POST",
    route: `/api/requests/${input.request.id}/fulfillments`,
    auth: "Owner account session or resolver bearer token with fulfillments:create",
    requiredHeaders: ["Idempotency-Key"],
    body: {
      summary: `${template.displayName} owner-private worker lane: ${deliverableSummary}`,
      lead: {
        kind: "agent",
        id: `boreal-agent:${template.agentKey}`,
        displayName: template.displayName,
        handle: template.agentKey,
      },
      ...(input.supply?.id ? { supplyId: input.supply.id } : {}),
      ...(input.supply?.id
        ? {
            ownerPrivateDirectApproval: {
              mode: "trusted_worker_auto_approval",
              approvedByOwner: true,
              selectedSupplyId: input.supply.id,
              workerKey: template.workerKey,
            },
          }
        : {}),
      initialStatus: "planned",
      metadata: {
        borealAgent: {
          agentKey: template.agentKey,
          uniqueName: template.uniqueName,
          workerKey: template.workerKey,
          providerRef: template.supplyBinding.providerRef,
          routeMode: "owner_private_direct_worker_fulfillment",
        },
        prepareOnly: true,
      },
    },
    nonAuthority:
      "This packet is not submitted by the agent preparation route and does not create a Fulfillment.",
  } as const;
}

function buildDeliverableSummary({
  input,
  template,
}: {
  input: BorealAgentPrepareApplicationInput;
  template: BorealAgentTemplate;
}) {
  const requestTitle = input.request.brief?.title?.trim();
  const requestSummary = input.request.brief?.summary?.trim();
  const source = requestSummary || requestTitle || input.request.id;
  return `${template.supplyBinding.supplyKind} via ${template.supplyBinding.providerRef} for ${source}`.slice(
    0,
    220
  );
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

import {
  borealActorKinds,
  borealOutputKinds,
  borealRequestExecutionKinds,
  borealSupplyKinds,
  type BorealActorKind,
  type BorealOutputKind,
  type BorealRequestExecutionKind,
  type BorealSupplyKind,
} from "@/lib/matching-fingerprints";

export type BorealAgentStatus = "live_template" | "target_template";

export type BorealAgentTaskKind =
  | "inspect_request"
  | "filter_qualification"
  | "prepare_application"
  | "submit_commitment"
  | "create_owner_private_fulfillment"
  | "run_provider"
  | "publish_artifact"
  | "monitor_or_retry";

export type BorealAgentModelBinding = {
  provider: "openai" | "runway";
  purpose: string;
  env: string;
  models: string[];
};

export type BorealAgentQualificationTags = {
  actorKinds: BorealActorKind[];
  supplyKinds: BorealSupplyKind[];
  outputKinds: BorealOutputKind[];
  executionKinds: BorealRequestExecutionKind[];
  skipWhen: string[];
};

export type BorealAgentTaskStep = {
  id: string;
  kind: BorealAgentTaskKind;
  summary: string;
  canonicalReads: string[];
  canonicalWritesIfAuthorized: string[];
};

export type BorealAgentFramework = {
  id: "boreal_named_agent_v1";
  version: 1;
  routePattern: "/api/boreal-agents/{agentKey}";
  routeMode: "preparation_only";
  supportedActions: ReadonlyArray<
    "read_template" | "scan_request_candidates" | "prepare_application"
  >;
  boilerplateFiles: readonly string[];
  taskPipelineRules: readonly string[];
  nonAuthority: ReadonlyArray<
    | "no_matching_or_assignment"
    | "no_commitment_created"
    | "no_fulfillment_started"
    | "no_provider_call"
    | "no_artifact_published"
    | "no_payment_authorized"
    | "no_completion_claim"
  >;
};

export type BorealAgentPromotionEvidenceKind =
  | "supply_factory"
  | "execution_contract"
  | "proof_path"
  | "failure_fixtures"
  | "route_level_mutation_tests";

export type BorealAgentPromotionGates = {
  state: "live_backed" | "target_blocked";
  requiredEvidence: ReadonlyArray<BorealAgentPromotionEvidenceKind>;
  evidenceRefs: ReadonlyArray<{
    kind: BorealAgentPromotionEvidenceKind;
    label: string;
    path: string;
    status: "implemented" | "tested" | "missing" | "target_required";
  }>;
  openBlockers: readonly string[];
  rules: readonly string[];
};

export type BorealAgentTemplate = {
  agentKey: string;
  uniqueName: string;
  displayName: string;
  status: BorealAgentStatus;
  apiRoute: string;
  workerKey: string;
  framework: BorealAgentFramework;
  promotionGates: BorealAgentPromotionGates;
  supplyBinding: {
    required: true;
    supplyKind: BorealSupplyKind;
    providerRef: string;
  };
  modelBindings: BorealAgentModelBinding[];
  toolBindings: string[];
  qualificationTags: BorealAgentQualificationTags;
  taskPipeline: BorealAgentTaskStep[];
};

export type BorealAgentTemplateValidationIssue = {
  agentKey?: string;
  code:
    | "duplicate_agent_key"
    | "duplicate_api_route"
    | "duplicate_unique_name"
    | "invalid_agent_key"
    | "missing_framework"
    | "missing_framework_action"
    | "missing_framework_boilerplate"
    | "missing_model_binding"
    | "missing_promotion_evidence"
    | "missing_promotion_gates"
    | "missing_required_task"
    | "missing_supply_binding"
    | "target_template_missing_blockers"
    | "target_template_not_blocked"
    | "unknown_actor_kind"
    | "live_template_has_blockers"
    | "live_template_not_backed"
    | "unstable_framework_route"
    | "unknown_canonical_write"
    | "unknown_execution_kind"
    | "unknown_output_kind"
    | "unknown_supply_kind"
    | "unstable_api_route";
  message: string;
};

const canonicalWriteObjects = new Set([
  "Actor",
  "Artifact",
  "Commitment",
  "Fulfillment",
  "FulfillmentStep",
  "Request",
  "RequestParticipant",
  "RequestEvent",
  "Supply",
  "Transaction",
]);

const requiredTaskKinds: BorealAgentTaskKind[] = [
  "inspect_request",
  "filter_qualification",
  "prepare_application",
];

const canonicalActorKindSet = new Set<string>(borealActorKinds);
const canonicalSupplyKindSet = new Set<string>(borealSupplyKinds);
const canonicalOutputKindSet = new Set<string>(borealOutputKinds);
const canonicalExecutionKindSet = new Set<string>(borealRequestExecutionKinds);

const requiredFrameworkActions: BorealAgentFramework["supportedActions"] = [
  "read_template",
  "scan_request_candidates",
  "prepare_application",
];

const requiredFrameworkBoilerplateFiles = [
  "apps/web/lib/boreal-agents/registry.ts",
  "apps/web/app/(chat)/api/boreal-agents/[agentKey]/route.ts",
  "apps/web/tests/contracts/boreal-agents.test.ts",
  "fixtures/agent/in-house-worker-application-profile.sample.json",
] as const;

export const requiredAgentPromotionEvidence = [
  "supply_factory",
  "execution_contract",
  "proof_path",
  "failure_fixtures",
  "route_level_mutation_tests",
] as const satisfies readonly BorealAgentPromotionEvidenceKind[];

export const borealNamedAgentFrameworkV1 = {
  id: "boreal_named_agent_v1",
  version: 1,
  routePattern: "/api/boreal-agents/{agentKey}",
  routeMode: "preparation_only",
  supportedActions: [...requiredFrameworkActions],
  boilerplateFiles: [...requiredFrameworkBoilerplateFiles],
  taskPipelineRules: [
    "Inspect and filter qualification before any model or provider work.",
    "Prepare application packets only; governed routes own durable writes.",
    "Provider execution waits for Commitment acceptance or owner-private direct Fulfillment.",
    "Tool success, model output, provider callback, or local log is not completion proof.",
  ],
  nonAuthority: [
    "no_matching_or_assignment",
    "no_commitment_created",
    "no_fulfillment_started",
    "no_provider_call",
    "no_artifact_published",
    "no_payment_authorized",
    "no_completion_claim",
  ],
} as const satisfies BorealAgentFramework;

export function createBorealAgentApiRoute(agentKey: string) {
  return `/api/boreal-agents/${agentKey}`;
}

export function defineBorealAgentTemplate<T extends BorealAgentTemplate>(
  template: T
) {
  return template;
}

export function defineBorealAgentCatalog<T extends readonly BorealAgentTemplate[]>(
  templates: T
) {
  const issues = validateBorealAgentTemplateCatalog(templates);

  if (issues.length > 0) {
    throw new Error(
      `Invalid Boreal agent template catalog: ${issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }

  return templates;
}

export function validateBorealAgentTemplateCatalog(
  templates: readonly BorealAgentTemplate[]
): BorealAgentTemplateValidationIssue[] {
  const issues: BorealAgentTemplateValidationIssue[] = [];
  const keys = new Set<string>();
  const routes = new Set<string>();
  const names = new Set<string>();

  for (const template of templates) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(template.agentKey)) {
      issues.push({
        agentKey: template.agentKey,
        code: "invalid_agent_key",
        message: `${template.agentKey} must use a stable kebab-case agent key.`,
      });
    }

    if (keys.has(template.agentKey)) {
      issues.push({
        agentKey: template.agentKey,
        code: "duplicate_agent_key",
        message: `${template.agentKey} is declared more than once.`,
      });
    }
    keys.add(template.agentKey);

    if (names.has(template.uniqueName)) {
      issues.push({
        agentKey: template.agentKey,
        code: "duplicate_unique_name",
        message: `${template.uniqueName} is declared more than once.`,
      });
    }
    names.add(template.uniqueName);

    if (routes.has(template.apiRoute)) {
      issues.push({
        agentKey: template.agentKey,
        code: "duplicate_api_route",
        message: `${template.apiRoute} is declared more than once.`,
      });
    }
    routes.add(template.apiRoute);

    if (template.apiRoute !== createBorealAgentApiRoute(template.agentKey)) {
      issues.push({
        agentKey: template.agentKey,
        code: "unstable_api_route",
        message: `${template.agentKey} route must be ${createBorealAgentApiRoute(
          template.agentKey
        )}.`,
      });
    }

    if (!template.framework) {
      issues.push({
        agentKey: template.agentKey,
        code: "missing_framework",
        message: `${template.agentKey} must declare the named-agent framework contract.`,
      });
    } else {
      if (
        template.framework.id !== "boreal_named_agent_v1" ||
        template.framework.version !== 1 ||
        template.framework.routeMode !== "preparation_only" ||
        template.framework.routePattern !== "/api/boreal-agents/{agentKey}"
      ) {
        issues.push({
          agentKey: template.agentKey,
          code: "unstable_framework_route",
          message: `${template.agentKey} must use boreal_named_agent_v1 preparation-only route framework.`,
        });
      }

      const actionSet = new Set(template.framework.supportedActions);
      for (const action of requiredFrameworkActions) {
        if (!actionSet.has(action)) {
          issues.push({
            agentKey: template.agentKey,
            code: "missing_framework_action",
            message: `${template.agentKey} framework must support ${action}.`,
          });
        }
      }

      const boilerplateSet = new Set(template.framework.boilerplateFiles);
      for (const file of requiredFrameworkBoilerplateFiles) {
        if (!boilerplateSet.has(file)) {
          issues.push({
            agentKey: template.agentKey,
            code: "missing_framework_boilerplate",
            message: `${template.agentKey} framework must reference ${file}.`,
          });
        }
      }
    }

    if (!template.promotionGates) {
      issues.push({
        agentKey: template.agentKey,
        code: "missing_promotion_gates",
        message: `${template.agentKey} must declare live-versus-target promotion gates.`,
      });
    } else {
      const evidenceSet = new Set(template.promotionGates.requiredEvidence);
      for (const evidence of requiredAgentPromotionEvidence) {
        if (!evidenceSet.has(evidence)) {
          issues.push({
            agentKey: template.agentKey,
            code: "missing_promotion_evidence",
            message: `${template.agentKey} promotion gates must require ${evidence}.`,
          });
        }
      }

      if (
        template.status === "live_template" &&
        template.promotionGates.state !== "live_backed"
      ) {
        issues.push({
          agentKey: template.agentKey,
          code: "live_template_not_backed",
          message: `${template.agentKey} live template must use live_backed promotion state.`,
        });
      }

      if (
        template.status === "live_template" &&
        template.promotionGates.openBlockers.length > 0
      ) {
        issues.push({
          agentKey: template.agentKey,
          code: "live_template_has_blockers",
          message: `${template.agentKey} live template cannot have open promotion blockers.`,
        });
      }

      if (
        template.status === "target_template" &&
        template.promotionGates.state !== "target_blocked"
      ) {
        issues.push({
          agentKey: template.agentKey,
          code: "target_template_not_blocked",
          message: `${template.agentKey} target template must use target_blocked promotion state.`,
        });
      }

      if (
        template.status === "target_template" &&
        template.promotionGates.openBlockers.length === 0
      ) {
        issues.push({
          agentKey: template.agentKey,
          code: "target_template_missing_blockers",
          message: `${template.agentKey} target template must list open promotion blockers.`,
        });
      }
    }

    if (
      !template.supplyBinding.required ||
      !template.supplyBinding.supplyKind ||
      !template.supplyBinding.providerRef
    ) {
      issues.push({
        agentKey: template.agentKey,
        code: "missing_supply_binding",
        message: `${template.agentKey} must declare a required supply binding.`,
      });
    }
    if (!canonicalSupplyKindSet.has(template.supplyBinding.supplyKind)) {
      issues.push({
        agentKey: template.agentKey,
        code: "unknown_supply_kind",
        message: `${template.agentKey} supply binding uses unknown supply kind ${template.supplyBinding.supplyKind}.`,
      });
    }

    validateCanonicalTagList({
      agentKey: template.agentKey,
      allowedValues: canonicalActorKindSet,
      code: "unknown_actor_kind",
      issues,
      label: "actor kind",
      values: template.qualificationTags.actorKinds,
    });
    validateCanonicalTagList({
      agentKey: template.agentKey,
      allowedValues: canonicalSupplyKindSet,
      code: "unknown_supply_kind",
      issues,
      label: "supply kind",
      values: template.qualificationTags.supplyKinds,
    });
    validateCanonicalTagList({
      agentKey: template.agentKey,
      allowedValues: canonicalOutputKindSet,
      code: "unknown_output_kind",
      issues,
      label: "output kind",
      values: template.qualificationTags.outputKinds,
    });
    validateCanonicalTagList({
      agentKey: template.agentKey,
      allowedValues: canonicalExecutionKindSet,
      code: "unknown_execution_kind",
      issues,
      label: "execution kind",
      values: template.qualificationTags.executionKinds,
    });

    if (template.modelBindings.length === 0) {
      issues.push({
        agentKey: template.agentKey,
        code: "missing_model_binding",
        message: `${template.agentKey} must declare at least one model or provider binding.`,
      });
    }

    const taskKinds = new Set(template.taskPipeline.map((task) => task.kind));
    for (const taskKind of requiredTaskKinds) {
      if (!taskKinds.has(taskKind)) {
        issues.push({
          agentKey: template.agentKey,
          code: "missing_required_task",
          message: `${template.agentKey} must include ${taskKind} in its task pipeline.`,
        });
      }
    }

    for (const task of template.taskPipeline) {
      for (const write of task.canonicalWritesIfAuthorized) {
        if (!canonicalWriteObjects.has(write)) {
          issues.push({
            agentKey: template.agentKey,
            code: "unknown_canonical_write",
            message: `${template.agentKey} task ${task.id} writes unknown canonical object ${write}.`,
          });
        }
      }
    }
  }

  return issues;
}

function validateCanonicalTagList({
  agentKey,
  allowedValues,
  code,
  issues,
  label,
  values,
}: {
  agentKey: string;
  allowedValues: Set<string>;
  code: Extract<
    BorealAgentTemplateValidationIssue["code"],
    | "unknown_actor_kind"
    | "unknown_execution_kind"
    | "unknown_output_kind"
    | "unknown_supply_kind"
  >;
  issues: BorealAgentTemplateValidationIssue[];
  label: string;
  values: readonly string[];
}) {
  for (const value of values) {
    if (!allowedValues.has(value)) {
      issues.push({
        agentKey,
        code,
        message: `${agentKey} qualification tag uses unknown ${label} ${value}.`,
      });
    }
  }
}

export const borealAgentTemplates = defineBorealAgentCatalog([
  {
    agentKey: "mira-video",
    uniqueName: "Mira",
    displayName: "Mira Video Agent",
    status: "live_template",
    apiRoute: createBorealAgentApiRoute("mira-video"),
    workerKey: "video-generation",
    framework: borealNamedAgentFrameworkV1,
    promotionGates: {
      state: "live_backed",
      requiredEvidence: [...requiredAgentPromotionEvidence],
      evidenceRefs: [
        {
          kind: "supply_factory",
          label: "Boreal worker starter supply factory",
          path: "apps/web/lib/boreal-workers/registry.ts",
          status: "implemented",
        },
        {
          kind: "execution_contract",
          label: "Runway-backed video generation worker",
          path: "apps/web/lib/boreal-workers/video-generation.ts",
          status: "implemented",
        },
        {
          kind: "proof_path",
          label: "Generated media artifact builder and blob mirror",
          path: "apps/web/lib/boreal-workers/video-generation.ts",
          status: "implemented",
        },
        {
          kind: "failure_fixtures",
          label: "First-party worker blocked retry fixture",
          path: "fixtures/fulfillment/pilot-blocked-retry-artifact-revision.json",
          status: "tested",
        },
        {
          kind: "route_level_mutation_tests",
          label: "Owner-private fulfillment and worker mismatch guards",
          path: "apps/web/tests/contracts/request-boundary.test.ts",
          status: "tested",
        },
      ],
      openBlockers: [],
      rules: [
        "Live means a real Supply factory and worker execution contract exist.",
        "Scanner readiness still cannot assign, create commitments, start fulfillments, call providers, publish artifacts, or claim completion.",
        "Provider execution waits for accepted Commitment or owner-private direct Fulfillment.",
      ],
    },
    supplyBinding: {
      required: true,
      supplyKind: "video_generation",
      providerRef: "runway/video-generation",
    },
    modelBindings: [
      {
        provider: "openai",
        purpose: "briefing, application drafting, recovery notes",
        env: "OPENAI_API_KEY",
        models: ["configured OpenAI chat route"],
      },
      {
        provider: "runway",
        purpose: "video generation handoff after owner approval",
        env: "RUNWAY_API_KEY",
        models: ["Runway Gen-4.5"],
      },
    ],
    toolBindings: [
      "GET /api/requests?scope=public",
      "GET /api/requests/{id}",
      "POST /api/requests/{id}/commitments",
      "POST /api/requests/{id}/fulfillments",
      "POST /api/requests/{id}/artifacts",
      "POST /api/fulfillments/{id}/retry",
    ],
    qualificationTags: {
      actorKinds: ["agent", "tool"],
      supplyKinds: [
        "agent_worker",
        "provider_capability",
        "video_generation",
      ],
      outputKinds: ["video", "media"],
      executionKinds: ["provider_api", "agent_request_room"],
      skipWhen: [
        "requires_human_presence",
        "requires_local_access",
        "requires_photo_evidence",
        "no_video_output_intent",
      ],
    },
    taskPipeline: [
      {
        id: "inspect-request",
        kind: "inspect_request",
        summary:
          "Read public or owner-authorized request fields and existing activity.",
        canonicalReads: ["Request", "Supply", "RequestEvent"],
        canonicalWritesIfAuthorized: [],
      },
      {
        id: "filter-qualification",
        kind: "filter_qualification",
        summary:
          "Skip work that needs human presence, local access, or non-video output.",
        canonicalReads: ["Request", "Supply"],
        canonicalWritesIfAuthorized: [],
      },
      {
        id: "prepare-application",
        kind: "prepare_application",
        summary:
          "Draft a Commitment application for public work or owner-private fulfillment packet for trusted direct work.",
        canonicalReads: ["Request", "Supply"],
        canonicalWritesIfAuthorized: ["Commitment", "RequestEvent"],
      },
      {
        id: "owner-private-start",
        kind: "create_owner_private_fulfillment",
        summary:
          "Create fulfillment only when the owner selected direct trusted worker auto-approval.",
        canonicalReads: ["Request", "Commitment"],
        canonicalWritesIfAuthorized: [
          "Fulfillment",
          "FulfillmentStep",
          "RequestEvent",
        ],
      },
      {
        id: "provider-run",
        kind: "run_provider",
        summary:
          "Call Runway after approval and attach provider task ids to fulfillment metadata.",
        canonicalReads: ["Fulfillment", "FulfillmentStep"],
        canonicalWritesIfAuthorized: ["FulfillmentStep", "RequestEvent"],
      },
      {
        id: "publish-proof",
        kind: "publish_artifact",
        summary:
          "Publish final media or proof as Artifact and leave owner review explicit.",
        canonicalReads: ["Fulfillment", "FulfillmentStep"],
        canonicalWritesIfAuthorized: ["Artifact", "RequestEvent"],
      },
    ],
  },
  {
    agentKey: "tala-humanizer",
    uniqueName: "Tala",
    displayName: "Tala Humanizer Agent",
    status: "target_template",
    apiRoute: createBorealAgentApiRoute("tala-humanizer"),
    workerKey: "humanizer",
    framework: borealNamedAgentFrameworkV1,
    promotionGates: {
      state: "target_blocked",
      requiredEvidence: [...requiredAgentPromotionEvidence],
      evidenceRefs: [
        {
          kind: "supply_factory",
          label: "Humanizer starter supply factory",
          path: "apps/web/lib/boreal-workers/registry.ts",
          status: "missing",
        },
        {
          kind: "execution_contract",
          label: "Humanizer worker execution contract",
          path: "apps/web/lib/boreal-workers/humanizer.ts",
          status: "implemented",
        },
        {
          kind: "proof_path",
          label: "Humanizer artifact proof path",
          path: "apps/web/lib/boreal-workers/humanizer.ts",
          status: "implemented",
        },
        {
          kind: "failure_fixtures",
          label: "Humanizer unsafe and recoverable failure fixtures",
          path: "fixtures/agent/in-house-worker-application-profile.sample.json",
          status: "target_required",
        },
        {
          kind: "route_level_mutation_tests",
          label: "Humanizer route-level mutation tests",
          path: "apps/web/tests/contracts/boreal-agents.test.ts",
          status: "target_required",
        },
      ],
      openBlockers: [
        "humanizer supply factory is not implemented",
        "humanizer failure fixtures do not exist",
        "humanizer mutating route tests do not exist",
      ],
      rules: [
        "Target templates can be discovered and read, but scanner output must stay target_only.",
        "Do not list prompt-only humanizer assets as starter Supply.",
        "Promotion requires all evidence refs to move out of missing or target_required status.",
      ],
    },
    supplyBinding: {
      required: true,
      supplyKind: "documentation_support",
      providerRef: "boreal/humanizer",
    },
    modelBindings: [
      {
        provider: "openai",
        purpose: "copy review, rewrite planning, acceptance note drafting",
        env: "OPENAI_API_KEY",
        models: ["configured OpenAI chat route"],
      },
    ],
    toolBindings: [
      "GET /api/requests?scope=public",
      "GET /api/requests/{id}",
      "POST /api/requests/{id}/commitments",
      "POST /api/requests/{id}/artifacts",
    ],
    qualificationTags: {
      actorKinds: ["agent", "human"],
      supplyKinds: [
        "documentation_support",
        "reporting_support",
        "human_service",
      ],
      outputKinds: ["draft", "handoff_doc", "verification_note"],
      executionKinds: ["agent_request_room", "hybrid_human_agent"],
      skipWhen: [
        "requiresHumanPresence is true and no human reviewer lane exists",
        "request asks for physical proof",
        "request requires provider media generation",
        "humanizer supply factory is not implemented",
      ],
    },
    taskPipeline: [
      {
        id: "inspect-request",
        kind: "inspect_request",
        summary: "Read public or owner-authorized request fields.",
        canonicalReads: ["Request", "Supply", "RequestEvent"],
        canonicalWritesIfAuthorized: [],
      },
      {
        id: "filter-qualification",
        kind: "filter_qualification",
        summary:
          "Accept only text polish and humanizer requests once the supply factory exists.",
        canonicalReads: ["Request", "Supply"],
        canonicalWritesIfAuthorized: [],
      },
      {
        id: "prepare-application",
        kind: "prepare_application",
        summary:
          "Draft a Commitment application without claiming direct execution authority.",
        canonicalReads: ["Request", "Supply"],
        canonicalWritesIfAuthorized: ["Commitment", "RequestEvent"],
      },
    ],
  },
] as const satisfies readonly BorealAgentTemplate[]);

export type BorealAgentKey = (typeof borealAgentTemplates)[number]["agentKey"];

export function listBorealAgentTemplates() {
  return [...borealAgentTemplates];
}

export function getBorealAgentTemplate(
  agentKey: string
): BorealAgentTemplate | null {
  return (
    borealAgentTemplates.find((template) => template.agentKey === agentKey) ??
    null
  );
}

export function isBorealAgentKey(
  agentKey: string
): agentKey is BorealAgentKey {
  return getBorealAgentTemplate(agentKey) !== null;
}

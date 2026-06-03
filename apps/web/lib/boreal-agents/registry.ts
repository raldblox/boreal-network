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
  actorKinds: string[];
  supplyKinds: string[];
  outputKinds: string[];
  executionKinds: string[];
  skipWhen: string[];
};

export type BorealAgentTaskStep = {
  id: string;
  kind: BorealAgentTaskKind;
  summary: string;
  canonicalReads: string[];
  canonicalWritesIfAuthorized: string[];
};

export type BorealAgentTemplate = {
  agentKey: string;
  uniqueName: string;
  displayName: string;
  status: BorealAgentStatus;
  apiRoute: string;
  workerKey: string;
  supplyBinding: {
    required: true;
    supplyKind: string;
    providerRef: string;
  };
  modelBindings: BorealAgentModelBinding[];
  toolBindings: string[];
  qualificationTags: BorealAgentQualificationTags;
  taskPipeline: BorealAgentTaskStep[];
};

export const borealAgentTemplates = [
  {
    agentKey: "mira-video",
    uniqueName: "Mira",
    displayName: "Mira Video Agent",
    status: "live_template",
    apiRoute: "/api/boreal-agents/mira-video",
    workerKey: "video-generation",
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
    apiRoute: "/api/boreal-agents/tala-humanizer",
    workerKey: "humanizer",
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
      actorKinds: ["agent"],
      supplyKinds: ["agent_worker", "documentation_support", "humanizer"],
      outputKinds: ["text", "copy", "documentation"],
      executionKinds: ["agent_request_room"],
      skipWhen: [
        "requires_human_presence",
        "requires_local_access",
        "requires_provider_media_generation",
        "supply_factory_not_implemented",
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
] as const satisfies readonly BorealAgentTemplate[];

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

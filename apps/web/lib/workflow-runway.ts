import {
  buildWorkflowPackVersionKey,
  slugifyWorkflowPackKey,
  type WorkflowBlock,
  type WorkflowConnection,
  type WorkflowCredentialRequirement,
  type WorkflowHumanCheckpoint,
  type WorkflowPack,
  type WorkflowPackProvenance,
  type WorkflowPackStatus,
  type WorkflowPackVersion,
  type WorkflowProofRequirement,
  type WorkflowSourceRef,
} from "@/lib/workflow-pack";

export type RunwayFounderAvatarClipPackResult = {
  workflowPack: WorkflowPack;
  workflowPackVersion: WorkflowPackVersion;
  credentialSlots: WorkflowCredentialRequirement[];
  humanCheckpoints: WorkflowHumanCheckpoint[];
  proofRequirements: WorkflowProofRequirement[];
};

export function buildRunwayFounderAvatarClipPack({
  packId,
  versionId,
  ownerActorId,
  version = 1,
  packStatus = "draft",
  provenance,
}: {
  packId: string;
  versionId: string;
  ownerActorId: string;
  version?: number;
  packStatus?: WorkflowPackStatus;
  provenance?: WorkflowPackProvenance;
}): RunwayFounderAvatarClipPackResult {
  const title = "Founder Avatar Clip Pack";
  const summary =
    "Done-for-you short avatar and character video clips using Boreal intake, Runway generation, operator review, captions, and delivery proof.";
  const packKey = slugifyWorkflowPackKey(title, packId);
  const now = new Date().toISOString();
  const graph = buildFounderAvatarGraph();
  const credentialSlots = buildCredentialRequirements();
  const humanCheckpoints = buildHumanCheckpoints();
  const proofRequirements = buildProofRequirements();

  const workflowPack: WorkflowPack = {
    id: packId,
    key: packKey,
    ownerActorId,
    title,
    summary,
    status: packStatus,
    provenance: provenance ?? {
      kind: "first_party",
      sourcePlatform: "runway",
      sourceUrl: "https://api.dev.runwayml.com",
      licenseNotes:
        "First-party Boreal service blueprint. Buyer assets and generated media stay attached to the Request and Artifact trail.",
    },
    metadata: {
      profile: "workflow_backed_v1",
      providerKey: "runway",
      serviceFamilyKey: "founder-avatar-clip-pack",
      servicePlanKey: "sales-reply-pack",
      targetOutcome:
        "Buyer receives ready-to-post avatar clips, scripts, captions, and delivery proof.",
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
    adapterKind: "provider_direct",
    graph,
    inputContract: {
      buyerInputs: [
        {
          key: "founder_or_character_profile",
          kind: "text",
          required: true,
          summary: "Who should appear or be represented in the avatar clips.",
        },
        {
          key: "offer_context",
          kind: "text",
          required: true,
          summary: "Product, service, event, or CTA the clips should sell.",
        },
        {
          key: "target_audience",
          kind: "text",
          required: true,
          summary: "Who the clips are meant to persuade.",
        },
        {
          key: "clip_count",
          kind: "number",
          required: false,
          summary: "Default plan delivers eight clips.",
        },
        {
          key: "aspect_ratios",
          kind: "string_array",
          required: false,
          summary: "Default output is vertical 9:16, with optional 1:1 cuts.",
        },
        {
          key: "tone",
          kind: "enum",
          options: ["direct", "warm", "cinematic", "ugc", "expert"],
          required: false,
          summary: "Creative direction for scripts and performance.",
        },
        {
          key: "reference_assets",
          kind: "object_ref",
          required: false,
          summary:
            "Optional face, character, product, brand, or example media assets.",
        },
      ],
      environmentInputs: [
        {
          key: "delivery_workspace",
          kind: "object_ref",
          required: false,
          summary: "Boreal Request room or storage target for final artifacts.",
        },
      ],
      credentialSlots: [
        {
          key: "runway_api_key",
          kind: "text",
          required: true,
          summary: "First-party Runway API credential used for generation.",
        },
        {
          key: "openai_api_key",
          kind: "text",
          required: false,
          summary: "Optional first-party OpenAI credential for script variants.",
        },
      ],
      operatorInputs: [
        {
          key: "approved_script_set",
          kind: "object_ref",
          required: true,
          summary: "Operator-approved script variants before generation spend.",
        },
        {
          key: "delivery_review_notes",
          kind: "text",
          required: true,
          summary: "Human review notes attached before buyer delivery.",
        },
      ],
    },
    outputContract: {
      artifacts: ["draft", "video", "media", "handoff_doc", "delivery"],
      summary:
        "Script variants, generated clips, captioned exports, delivery notes, and proof of handoff.",
    },
    credentialRequirements: credentialSlots,
    humanCheckpoints,
    proofRequirements,
    sourceRefs: buildSourceRefs(),
    readiness: {
      state: "needs_credentials",
      summary:
        "Ready as a service blueprint, but production execution needs a Runway credential before generation.",
      blockingReasons: ["Missing first-party Runway API credential."],
    },
    unsupportedFeatures: [],
    metadata: {
      profile: "workflow_backed_v1",
      providerKey: "runway",
      runway: {
        apiBaseUrl: "https://api.dev.runwayml.com",
        apiVersionHeader: "2024-11-06",
        preferredModels: [
          "act_two",
          "gen4_turbo",
          "gen4_image",
          "eleven_multilingual_v2",
        ],
      },
      deliverableProfile: {
        defaultClipCount: 8,
        defaultDurationSeconds: 30,
        defaultAspectRatio: "9:16",
        revisionPasses: 1,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    workflowPack,
    workflowPackVersion,
    credentialSlots,
    humanCheckpoints,
    proofRequirements,
  };
}

function buildFounderAvatarGraph() {
  const blocks: WorkflowBlock[] = [
    {
      blockKey: "request_intake",
      title: "Request Intake",
      kind: "trigger",
      adapterOperation: "boreal.request.created",
      config: {
        requiredBuyerInputs: [
          "founder_or_character_profile",
          "offer_context",
          "target_audience",
        ],
      },
      inputPorts: [],
      outputPorts: [{ portKey: "brief" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "creative_brief",
      title: "Creative Brief Normalization",
      kind: "input",
      adapterOperation: "boreal.avatar_clip_pack.normalize_brief",
      config: {
        outputSchema: "avatar_clip_pack_brief_v1",
        defaultClipCount: 8,
        defaultAspectRatio: "9:16",
      },
      inputPorts: [{ portKey: "brief" }],
      outputPorts: [{ portKey: "creative_brief" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "script_variants",
      title: "Script Variants",
      kind: "llm",
      adapterOperation: "openai.short_form_avatar_scripts",
      config: {
        fallbackMode: "operator_written",
        variantCount: 8,
        scriptLengthSeconds: 30,
        includeHooks: true,
        includeShotNotes: true,
      },
      inputPorts: [{ portKey: "creative_brief" }],
      outputPorts: [{ portKey: "script_set" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "reference_assets",
      title: "Reference Asset Preparation",
      kind: "transform",
      adapterOperation: "boreal.assets.prepare_runway_references",
      config: {
        acceptedAssetKinds: ["face_reference", "character_reference", "product"],
        fallbackMode: "text_only_character_direction",
      },
      inputPorts: [
        { portKey: "creative_brief" },
        { portKey: "script_set" },
      ],
      outputPorts: [{ portKey: "runway_prompt_pack" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft", "media"],
      requiresHumanApproval: true,
    },
    {
      blockKey: "runway_generation",
      title: "Runway Avatar And Character Generation",
      kind: "generation",
      adapterOperation: "runway.avatar_character_clip_generation",
      config: {
        provider: "runway",
        apiBaseUrl: "https://api.dev.runwayml.com",
        apiVersionHeader: "2024-11-06",
        modelPriority: ["act_two", "gen4_turbo", "gen4_image"],
        generationMode: "avatar_or_character_video",
        expectedOutputs: ["raw_clips", "generation_task_refs"],
      },
      inputPorts: [{ portKey: "runway_prompt_pack" }],
      outputPorts: [{ portKey: "raw_clips" }],
      requiredSecrets: ["runway_api_key"],
      emitsArtifactKinds: ["video", "media"],
      requiresHumanApproval: false,
      retryPolicy: {
        mode: "simple_retry",
        maxAttempts: 2,
      },
      failureSummary:
        "Runway generation failed or exhausted provider limits; request should block before delivery.",
    },
    {
      blockKey: "caption_and_package",
      title: "Caption And Variant Package",
      kind: "transform",
      adapterOperation: "boreal.media.caption_and_package",
      config: {
        includeBurnedCaptions: true,
        includeCleanExports: true,
        includePromptLedger: true,
      },
      inputPorts: [{ portKey: "raw_clips" }],
      outputPorts: [{ portKey: "captioned_package" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["video", "media", "handoff_doc"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "operator_review",
      title: "Operator Review",
      kind: "review",
      adapterOperation: "boreal.operator.pre_delivery_review",
      config: {
        checks: [
          "brand_fit",
          "clip_count",
          "caption_accuracy",
          "asset_safety",
          "handoff_completeness",
        ],
      },
      inputPorts: [{ portKey: "captioned_package" }],
      outputPorts: [{ portKey: "approved_package" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["handoff_doc"],
      requiresHumanApproval: true,
    },
    {
      blockKey: "delivery",
      title: "Buyer Delivery",
      kind: "delivery",
      adapterOperation: "boreal.request.deliver_artifacts",
      config: {
        attachToRequest: true,
        includeDeliverySummary: true,
        includeGenerationRefs: true,
      },
      inputPorts: [{ portKey: "approved_package" }],
      outputPorts: [{ portKey: "delivery_receipt" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["delivery"],
      requiresHumanApproval: false,
    },
  ];

  const connections: WorkflowConnection[] = [
    connect("request_intake", "brief", "creative_brief", "brief"),
    connect("creative_brief", "creative_brief", "script_variants", "creative_brief"),
    connect("script_variants", "script_set", "reference_assets", "script_set"),
    connect(
      "reference_assets",
      "runway_prompt_pack",
      "runway_generation",
      "runway_prompt_pack"
    ),
    connect("runway_generation", "raw_clips", "caption_and_package", "raw_clips"),
    connect(
      "caption_and_package",
      "captioned_package",
      "operator_review",
      "captioned_package"
    ),
    connect("operator_review", "approved_package", "delivery", "approved_package"),
  ];

  return {
    blocks,
    connections,
  };
}

function buildCredentialRequirements(): WorkflowCredentialRequirement[] {
  return [
    {
      slotKey: "runway_api_key",
      providerKey: "runway",
      scope: "boreal_first_party",
      required: true,
      notes: "Used only by provider generation blocks. Never store this in RequestEvent payloads.",
      nodeKeys: ["runway_generation"],
    },
    {
      slotKey: "openai_api_key",
      providerKey: "openai",
      scope: "boreal_first_party",
      required: false,
      notes:
        "Optional script generation support; the service can fall back to operator-written scripts.",
      nodeKeys: ["script_variants"],
    },
  ];
}

function buildHumanCheckpoints(): WorkflowHumanCheckpoint[] {
  return [
    {
      checkpointKey: "script_and_reference_approval",
      title: "Script And Reference Approval",
      required: true,
      blocking: true,
      stage: "pre_run",
      approvalActorKind: "human",
      summary:
        "Operator approves scripts and reference assets before spending Runway generation credits.",
    },
    {
      checkpointKey: "pre_delivery_review",
      title: "Pre-Delivery Review",
      required: true,
      blocking: true,
      stage: "pre_delivery",
      approvalActorKind: "human",
      summary:
        "Operator verifies clip count, captions, brand fit, and handoff notes before buyer delivery.",
    },
  ];
}

function buildProofRequirements(): WorkflowProofRequirement[] {
  return [
    {
      proofKey: "clip_pack_delivery",
      requiredArtifactKinds: ["media", "delivery"],
      requiredEvidenceClaims: ["delivery_confirmation"],
      requiredForCompletion: true,
      summary:
        "Final clips and a delivery receipt must be attached before the Request can be completed.",
    },
    {
      proofKey: "generation_handoff_notes",
      requiredArtifactKinds: ["file"],
      requiredEvidenceClaims: ["written_report"],
      requiredForCompletion: true,
      summary:
        "Include scripts, creative decisions, provider task references, and revision notes.",
    },
  ];
}

function buildSourceRefs(): WorkflowSourceRef[] {
  return [
    {
      kind: "provider_blueprint",
      title: "Runway Avatar And Character Video Provider Blueprint",
      sourceUrl: "https://api.dev.runwayml.com",
      metadata: {
        providerKey: "runway",
        apiVersionHeader: "2024-11-06",
        providerOperations: [
          "avatar_character_clip_generation",
          "image_to_video",
          "captioned_delivery_package",
        ],
      },
    },
  ];
}

function connect(
  fromBlockKey: string,
  fromPortKey: string,
  toBlockKey: string,
  toPortKey: string
): WorkflowConnection {
  return {
    from: {
      blockKey: fromBlockKey,
      portKey: fromPortKey,
    },
    to: {
      blockKey: toBlockKey,
      portKey: toPortKey,
    },
  };
}

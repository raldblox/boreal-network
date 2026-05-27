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

export type RunwayCharacterCallStarterResult = {
  workflowPack: WorkflowPack;
  workflowPackVersion: WorkflowPackVersion;
  credentialSlots: WorkflowCredentialRequirement[];
  humanCheckpoints: WorkflowHumanCheckpoint[];
  proofRequirements: WorkflowProofRequirement[];
};

export function buildRunwayCharacterCallStarter({
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
}): RunwayCharacterCallStarterResult {
  const title = "Character Call Starter";
  const summary =
    "A live Runway Character video-call setup with persona sheet, server-side session launcher, one test call, and Boreal delivery proof.";
  const packKey = slugifyWorkflowPackKey(title, packId);
  const now = new Date().toISOString();
  const graph = buildCharacterCallGraph();
  const credentialSlots = buildCharacterCallCredentialRequirements();
  const humanCheckpoints = buildCharacterCallHumanCheckpoints();
  const proofRequirements = buildCharacterCallProofRequirements();

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
        "First-party Boreal service blueprint. Runway credentials stay server-side and session credentials are one-time use.",
    },
    metadata: {
      profile: "workflow_backed_v1",
      providerKey: "runway",
      serviceFamilyKey: "character-call-starter",
      servicePlanKey: "starter-call",
      targetOutcome:
        "Buyer receives a configured live character call experience, test transcript, persona sheet, and delivery proof.",
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
          key: "character_name",
          kind: "text",
          required: true,
          summary: "Display name for the character.",
        },
        {
          key: "reference_image",
          kind: "object_ref",
          required: true,
          summary:
            "One buyer-provided or approved reference image for the character appearance.",
        },
        {
          key: "personality_notes",
          kind: "text",
          required: true,
          summary: "How the character should talk, behave, and stay in role.",
        },
        {
          key: "call_goal",
          kind: "enum",
          options: [
            "personal_fun",
            "sales_demo",
            "practice_room",
            "education_host",
          ],
          required: true,
          summary: "Primary outcome for the first live call.",
        },
        {
          key: "allowed_topics",
          kind: "string_array",
          required: false,
          summary: "Topics the character may discuss.",
        },
        {
          key: "blocked_topics",
          kind: "string_array",
          required: false,
          summary: "Topics, claims, or behaviors the character must avoid.",
        },
        {
          key: "knowledge_docs",
          kind: "object_ref",
          required: false,
          summary: "Optional uploaded knowledge files for the character.",
        },
        {
          key: "first_message",
          kind: "text",
          required: false,
          summary: "Optional opening line for the character.",
        },
      ],
      environmentInputs: [
        {
          key: "boreal_call_page",
          kind: "object_ref",
          required: false,
          summary:
            "Boreal-hosted call page that requests one-time Runway session credentials server-side.",
        },
      ],
      credentialSlots: [
        {
          key: "runway_api_key",
          kind: "text",
          required: true,
          summary:
            "First-party Runway API credential for avatar and real-time session creation.",
        },
        {
          key: "openai_api_key",
          kind: "text",
          required: false,
          summary:
            "Optional first-party OpenAI credential for persona shaping and post-call summaries.",
        },
      ],
      operatorInputs: [
        {
          key: "approved_persona_sheet",
          kind: "object_ref",
          required: true,
          summary:
            "Operator-approved persona sheet before avatar creation and session testing.",
        },
        {
          key: "test_call_notes",
          kind: "text",
          required: true,
          summary:
            "Human review notes from the included test call before buyer delivery.",
        },
      ],
    },
    outputContract: {
      artifacts: ["draft", "media", "handoff_doc", "delivery"],
      summary:
        "Persona sheet, avatar configuration reference, session launch handoff, test transcript or notes, and delivery receipt.",
    },
    credentialRequirements: credentialSlots,
    humanCheckpoints,
    proofRequirements,
    sourceRefs: buildCharacterCallSourceRefs(),
    readiness: {
      state: "needs_credentials",
      summary:
        "Ready as a service blueprint, but production execution needs a Runway credential before avatar or session creation.",
      blockingReasons: ["Missing first-party Runway API credential."],
    },
    unsupportedFeatures: [],
    metadata: {
      profile: "workflow_backed_v1",
      providerKey: "runway",
      runway: {
        apiBaseUrl: "https://api.dev.runwayml.com",
        apiVersionHeader: "2024-11-06",
        model: "gwm1_avatars",
        avatarEndpoint: "/v1/avatars",
        realtimeSessionEndpoint: "/v1/realtime_sessions",
        sessionMaxMinutes: 5,
        sessionCredentials: "one_time_use",
      },
      deliverableProfile: {
        includedTestSessions: 1,
        maxSessionMinutes: 5,
        includesPersonaSheet: true,
        includesSessionLaunchHandoff: true,
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

function buildCharacterCallGraph() {
  const blocks: WorkflowBlock[] = [
    {
      blockKey: "request_intake",
      title: "Character Call Intake",
      kind: "trigger",
      adapterOperation: "boreal.request.created",
      config: {
        requiredBuyerInputs: [
          "character_name",
          "reference_image",
          "personality_notes",
          "call_goal",
        ],
      },
      inputPorts: [],
      outputPorts: [{ portKey: "brief" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "persona_sheet",
      title: "Persona Sheet",
      kind: "llm",
      adapterOperation: "openai.character_persona_sheet",
      config: {
        fallbackMode: "operator_written",
        outputSchema: "character_call_persona_v1",
        includeSafetyBoundaries: true,
        includeFirstMessage: true,
      },
      inputPorts: [{ portKey: "brief" }],
      outputPorts: [{ portKey: "persona_sheet" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "operator_persona_review",
      title: "Persona And Consent Review",
      kind: "review",
      adapterOperation: "boreal.operator.character_persona_review",
      config: {
        checks: [
          "reference_image_consent",
          "no_impersonation",
          "blocked_topics",
          "safe_claims",
          "call_goal_fit",
        ],
      },
      inputPorts: [{ portKey: "persona_sheet" }],
      outputPorts: [{ portKey: "approved_persona" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["handoff_doc"],
      requiresHumanApproval: true,
    },
    {
      blockKey: "reference_asset_prepare",
      title: "Reference Image Preparation",
      kind: "transform",
      adapterOperation: "boreal.assets.prepare_runway_avatar_reference",
      config: {
        acceptedAssetKinds: ["single_face_reference", "stylized_character"],
        recommendedAspectRatio: "1088:704",
        rejectMultiplePeople: true,
      },
      inputPorts: [{ portKey: "approved_persona" }],
      outputPorts: [{ portKey: "avatar_reference" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["media"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "runway_avatar_create",
      title: "Runway Character Creation",
      kind: "integration",
      adapterOperation: "runway.avatars.create",
      config: {
        provider: "runway",
        endpoint: "/v1/avatars",
        model: "gwm1_avatars",
        voicePresets: ["clara", "victoria", "vincent"],
        expectedOutputs: ["avatar_id", "avatar_status"],
      },
      inputPorts: [{ portKey: "avatar_reference" }],
      outputPorts: [{ portKey: "avatar_ref" }],
      requiredSecrets: ["runway_api_key"],
      emitsArtifactKinds: ["handoff_doc"],
      requiresHumanApproval: false,
      retryPolicy: {
        mode: "simple_retry",
        maxAttempts: 2,
      },
      failureSummary:
        "Runway character creation failed; request should block before test session delivery.",
    },
    {
      blockKey: "session_launch_prepare",
      title: "Session Launch Preparation",
      kind: "integration",
      adapterOperation: "boreal.runway.realtime_session_launcher",
      config: {
        provider: "runway",
        createSessionEndpoint: "/v1/realtime_sessions",
        consumeEndpoint: "/v1/realtime_sessions/{id}/consume",
        credentials: "server_side_one_time_use",
        maxSessionMinutes: 5,
        output: "boreal_hosted_call_page",
      },
      inputPorts: [{ portKey: "avatar_ref" }],
      outputPorts: [{ portKey: "call_page" }],
      requiredSecrets: ["runway_api_key"],
      emitsArtifactKinds: ["handoff_doc"],
      requiresHumanApproval: false,
    },
    {
      blockKey: "test_call_review",
      title: "Test Call Review",
      kind: "review",
      adapterOperation: "boreal.operator.character_test_call_review",
      config: {
        includedTestSessions: 1,
        checks: [
          "connects_successfully",
          "character_stays_in_role",
          "blocked_topics_respected",
          "handoff_notes_complete",
        ],
      },
      inputPorts: [{ portKey: "call_page" }],
      outputPorts: [{ portKey: "approved_call_package" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["draft", "handoff_doc"],
      requiresHumanApproval: true,
    },
    {
      blockKey: "delivery",
      title: "Character Call Delivery",
      kind: "delivery",
      adapterOperation: "boreal.request.deliver_artifacts",
      config: {
        attachToRequest: true,
        includeDeliverySummary: true,
        includeUsageNotes: true,
        includeProviderRefs: true,
      },
      inputPorts: [{ portKey: "approved_call_package" }],
      outputPorts: [{ portKey: "delivery_receipt" }],
      requiredSecrets: [],
      emitsArtifactKinds: ["delivery"],
      requiresHumanApproval: false,
    },
  ];

  const connections: WorkflowConnection[] = [
    connect("request_intake", "brief", "persona_sheet", "brief"),
    connect(
      "persona_sheet",
      "persona_sheet",
      "operator_persona_review",
      "persona_sheet"
    ),
    connect(
      "operator_persona_review",
      "approved_persona",
      "reference_asset_prepare",
      "approved_persona"
    ),
    connect(
      "reference_asset_prepare",
      "avatar_reference",
      "runway_avatar_create",
      "avatar_reference"
    ),
    connect(
      "runway_avatar_create",
      "avatar_ref",
      "session_launch_prepare",
      "avatar_ref"
    ),
    connect(
      "session_launch_prepare",
      "call_page",
      "test_call_review",
      "call_page"
    ),
    connect(
      "test_call_review",
      "approved_call_package",
      "delivery",
      "approved_call_package"
    ),
  ];

  return {
    blocks,
    connections,
  };
}

function buildCharacterCallCredentialRequirements(): WorkflowCredentialRequirement[] {
  return [
    {
      slotKey: "runway_api_key",
      providerKey: "runway",
      scope: "boreal_first_party",
      required: true,
      notes:
        "Used server-side for avatar creation and one-time real-time session credentials. Never expose to the client.",
      nodeKeys: ["runway_avatar_create", "session_launch_prepare"],
    },
    {
      slotKey: "openai_api_key",
      providerKey: "openai",
      scope: "boreal_first_party",
      required: false,
      notes:
        "Optional persona shaping and post-call summary support; operator-written fallback is allowed.",
      nodeKeys: ["persona_sheet"],
    },
  ];
}

function buildCharacterCallHumanCheckpoints(): WorkflowHumanCheckpoint[] {
  return [
    {
      checkpointKey: "persona_and_consent_review",
      title: "Persona And Consent Review",
      required: true,
      blocking: true,
      stage: "pre_run",
      approvalActorKind: "human",
      summary:
        "Operator confirms reference image consent, no impersonation, safe boundaries, and call goal fit before avatar creation.",
    },
    {
      checkpointKey: "test_call_review",
      title: "Test Call Review",
      required: true,
      blocking: true,
      stage: "pre_delivery",
      approvalActorKind: "human",
      summary:
        "Operator verifies the call page, character behavior, and usage notes before buyer delivery.",
    },
  ];
}

function buildCharacterCallProofRequirements(): WorkflowProofRequirement[] {
  return [
    {
      proofKey: "character_call_delivery",
      requiredArtifactKinds: ["link", "delivery"],
      requiredEvidenceClaims: ["delivery_confirmation"],
      requiredForCompletion: true,
      summary:
        "A call page or launch handoff and delivery receipt must be attached before completion.",
    },
    {
      proofKey: "persona_and_test_notes",
      requiredArtifactKinds: ["file"],
      requiredEvidenceClaims: ["written_report"],
      requiredForCompletion: true,
      summary:
        "Include persona sheet, safety boundaries, provider refs, and test call notes.",
    },
  ];
}

function buildCharacterCallSourceRefs(): WorkflowSourceRef[] {
  return [
    {
      kind: "provider_blueprint",
      title: "Runway Character Real-Time Avatar Blueprint",
      sourceUrl: "https://api.dev.runwayml.com",
      metadata: {
        providerKey: "runway",
        apiVersionHeader: "2024-11-06",
        providerOperations: [
          "avatars.create",
          "realtime_sessions.create",
          "realtime_sessions.retrieve",
          "realtime_sessions.consume",
        ],
        model: "gwm1_avatars",
        sessionMaxMinutes: 5,
      },
    },
  ];
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

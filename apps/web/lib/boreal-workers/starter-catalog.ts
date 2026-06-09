import type { BorealAgentKey } from "@/lib/boreal-agents/registry";
import type {
  BorealActorKind,
  BorealExecutionChannel,
  BorealOutputKind,
  BorealRequestExecutionKind,
  BorealSupplyKind,
} from "@/lib/matching-fingerprints";
import type { BorealSupplyDraft } from "@/lib/supply";

type BorealWorkerStarterScannerPolicy = {
  agentKey: BorealAgentKey;
  supportedActorKinds: readonly BorealActorKind[];
  supportedSupplyKinds: readonly BorealSupplyKind[];
  supportedOutputKinds: readonly BorealOutputKind[];
  supportedExecutionKinds: readonly BorealRequestExecutionKind[];
  wakeSignals: readonly string[];
  skipWhen: readonly string[];
  nonAuthority: readonly string[];
};

type BorealWorkerStarterCapability = {
  supplyKinds: readonly BorealSupplyKind[];
  fulfillmentActorKinds: readonly BorealActorKind[];
  outputKinds: readonly BorealOutputKind[];
  executionChannels: readonly BorealExecutionChannel[];
};

type BorealWorkerStarterDefinition = {
  workerKey: string;
  title: string;
  providerLabel: string;
  providerRef: string;
  summary: string;
  description: string;
  inputModes: readonly string[];
  tryPrompt: string;
  capability: BorealWorkerStarterCapability;
  scannerPolicy: BorealWorkerStarterScannerPolicy;
};

const starterScannerNonAuthority = [
  "starter_catalog_is_not_assignment",
  "scanner_policy_is_not_matching",
  "no_supply_attached_from_starter_metadata",
  "no_commitment_created_from_starter_metadata",
  "no_fulfillment_started_from_starter_metadata",
  "no_provider_call_from_starter_metadata",
  "no_artifact_published_from_starter_metadata",
  "no_payment_authorized_from_starter_metadata",
] as const;

export const borealWorkerStarterCatalog = [
  {
    workerKey: "video-generation",
    title: "Video generation",
    providerLabel: "Runway Gen-4.5",
    providerRef: "runway/video-generation",
    summary:
      "Create short launch teasers, explainers, promos, and motion clips from text or a still image.",
    description:
      "Boreal-managed video generation with Runway execution and Blob-mirrored delivery artifacts.",
    inputModes: ["Text to video", "Image to video"],
    tryPrompt:
      "Create a 10-second launch teaser video with clean product motion, confident pacing, and a premium cinematic tone.",
    capability: {
      supplyKinds: ["agent_worker", "video_generation"],
      fulfillmentActorKinds: ["agent"],
      outputKinds: ["media", "delivery", "video"],
      executionChannels: ["request_room", "api"],
    },
    scannerPolicy: {
      agentKey: "mira-video",
      supportedActorKinds: ["agent", "tool"],
      supportedSupplyKinds: [
        "agent_worker",
        "provider_capability",
        "video_generation",
      ],
      supportedOutputKinds: ["video", "media"],
      supportedExecutionKinds: ["provider_api", "agent_request_room"],
      wakeSignals: ["supply:video_generation", "output:video"],
      skipWhen: [
        "requires_human_presence",
        "requires_local_access",
        "requires_photo_evidence",
        "no_video_output_intent",
      ],
      nonAuthority: starterScannerNonAuthority,
    },
  },
  {
    workerKey: "humanizer",
    title: "Humanizer",
    providerLabel: "OpenAI",
    providerRef: "boreal/humanizer",
    summary:
      "Rewrite launch copy, briefs, handoff notes, and review packets without inventing shipped facts.",
    description:
      "Boreal-managed text polish with OpenAI routing and document-backed delivery artifacts.",
    inputModes: ["Source text", "Tone guidance"],
    tryPrompt:
      "Rewrite this launch copy in plain language, preserve every concrete fact, and leave owner review required.",
    capability: {
      supplyKinds: ["agent_worker", "documentation_support"],
      fulfillmentActorKinds: ["agent"],
      outputKinds: ["draft", "handoff_doc", "verification_note"],
      executionChannels: ["request_room", "api"],
    },
    scannerPolicy: {
      agentKey: "tala-humanizer",
      supportedActorKinds: ["agent", "human"],
      supportedSupplyKinds: [
        "documentation_support",
        "reporting_support",
        "human_service",
      ],
      supportedOutputKinds: ["draft", "handoff_doc", "verification_note"],
      supportedExecutionKinds: ["agent_request_room", "hybrid_human_agent"],
      wakeSignals: ["supply:documentation_support", "output:draft"],
      skipWhen: [
        "requiresHumanPresence is true and no human reviewer lane exists",
        "request asks for physical proof",
        "request requires provider media generation",
        "request has no documentation-support or text-polish signal",
      ],
      nonAuthority: starterScannerNonAuthority,
    },
  },
] as const satisfies readonly BorealWorkerStarterDefinition[];

export type BorealWorkerStarter = (typeof borealWorkerStarterCatalog)[number];
export type BorealWorkerStarterKey = BorealWorkerStarter["workerKey"];

export function isBorealWorkerStarterKey(
  value: string
): value is BorealWorkerStarterKey {
  return borealWorkerStarterCatalog.some((starter) => starter.workerKey === value);
}

export function getBorealWorkerStarter(
  workerKey: string
): BorealWorkerStarter | null {
  return (
    borealWorkerStarterCatalog.find((starter) => starter.workerKey === workerKey) ??
    null
  );
}

export function getBorealWorkerKeyFromMetadata(
  metadata: Record<string, unknown> | undefined
): BorealWorkerStarterKey | null {
  if (!metadata) {
    return null;
  }

  const rawWorker = metadata.borealWorker;
  if (!rawWorker || typeof rawWorker !== "object") {
    return null;
  }

  const workerKey = (rawWorker as Record<string, unknown>).workerKey;
  return typeof workerKey === "string" && isBorealWorkerStarterKey(workerKey)
    ? workerKey
    : null;
}

export function getBorealWorkerKeyFromSupply(
  supply:
    | Pick<
        BorealSupplyDraft,
        "bindings" | "capability" | "key" | "metadata" | "profile"
      >
    | null
    | undefined
): BorealWorkerStarterKey | null {
  if (!supply) {
    return null;
  }

  const metadataWorkerKey = getBorealWorkerKeyFromMetadata(supply.metadata);
  if (metadataWorkerKey) {
    return metadataWorkerKey;
  }

  const providerRef = supply.bindings.providerRef?.trim().toLowerCase();
  if (providerRef === "runway/video-generation") {
    return "video-generation";
  }
  if (providerRef === "boreal/humanizer") {
    return "humanizer";
  }

  const capabilityKinds = supply.capability.supplyKinds.map((kind) =>
    kind.trim().toLowerCase()
  );
  if (capabilityKinds.includes("video_generation")) {
    return "video-generation";
  }

  const profileTags = supply.profile.tags.map((tag) => tag.trim().toLowerCase());
  if (profileTags.includes("video_generation")) {
    return "video-generation";
  }
  if (
    profileTags.includes("humanizer") ||
    profileTags.includes("text_polish")
  ) {
    return "humanizer";
  }

  const fingerprint = [
    supply.key,
    supply.profile.displayName,
    supply.profile.headline,
  ]
    .join(" ")
    .toLowerCase();

  if (fingerprint.includes("video generation")) {
    return "video-generation";
  }

  return null;
}

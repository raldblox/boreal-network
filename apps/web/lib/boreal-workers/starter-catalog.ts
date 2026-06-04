import type { BorealSupplyDraft } from "@/lib/supply";

export const borealWorkerStarterCatalog = [
  {
    workerKey: "video-generation",
    title: "Video generation",
    providerLabel: "Runway Gen-4.5",
    summary:
      "Create short launch teasers, explainers, promos, and motion clips from text or a still image.",
    description:
      "Boreal-managed video generation with Runway execution and Blob-mirrored delivery artifacts.",
    inputModes: ["Text to video", "Image to video"],
    tryPrompt:
      "Create a 10-second launch teaser video with clean product motion, confident pacing, and a premium cinematic tone.",
  },
  {
    workerKey: "humanizer",
    title: "Humanizer",
    providerLabel: "OpenAI",
    summary:
      "Rewrite launch copy, briefs, handoff notes, and review packets without inventing shipped facts.",
    description:
      "Boreal-managed text polish with OpenAI routing and document-backed delivery artifacts.",
    inputModes: ["Source text", "Tone guidance"],
    tryPrompt:
      "Rewrite this launch copy in plain language, preserve every concrete fact, and leave owner review required.",
  },
] as const;

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

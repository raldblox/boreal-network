import { z } from "zod";
import type { BorealRequestDraft } from "@/lib/request";
import {
  applySupplyPatch,
  createInitialSupplyDraft,
  type BorealSupplyDraft,
  type SupplyPatch,
} from "@/lib/supply";
import type {
  BorealWorkerCommitmentDraft,
  BorealWorkerDefinition,
  BorealWorkerStoredAsset,
  BorealWorkerSupplyMetadata,
} from "./types";
import {
  borealWorkerArtifactDescriptorSchema,
  borealWorkerStoredAssetSchema,
} from "./types";

export type VideoGenerationWorkerInput = {
  requestId: string;
  title: string;
  brief: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationSeconds?: number;
  styleHints: string[];
};

export type VideoGenerationWorkerResult = {
  providerTaskId: string;
  providerStatus: "queued" | "running" | "completed";
  sourceVideoUrl?: string;
};

export const videoGenerationWorkerInputSchema = z
  .object({
    requestId: z.string().uuid(),
    title: z.string().min(1).max(200),
    brief: z.string().min(1),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
    durationSeconds: z.number().int().positive().max(600).optional(),
    styleHints: z.array(z.string().min(1)),
  })
  .strict();

export const videoGenerationWorkerResultSchema = z
  .object({
    providerTaskId: z.string().min(1).max(200),
    providerStatus: z.enum(["queued", "running", "completed"]),
    sourceVideoUrl: z.string().url().optional(),
  })
  .strict();

export const videoGenerationWorkerStoredAssetSchema = borealWorkerStoredAssetSchema
  .extend({
    container: borealWorkerStoredAssetSchema.shape.container.extend({
      mediaKind: z.literal("video").optional(),
    }),
  })
  .strict();

export const videoGenerationWorkerArtifactSchema = borealWorkerArtifactDescriptorSchema
  .extend({
    artifactKind: z.literal("media"),
    mediaKind: z.literal("video"),
    container: borealWorkerArtifactDescriptorSchema.shape.container.extend({
      mediaKind: z.literal("video").optional(),
    }),
  })
  .strict();

const videoGenerationKeywords = [
  "video",
  "reel",
  "clip",
  "sizzle",
  "trailer",
  "animation",
  "motion",
  "ad creative",
  "avatar video",
];

function requestText(request: BorealRequestDraft) {
  return [
    request.brief.title ?? "",
    request.brief.summary ?? "",
    request.brief.body ?? "",
    request.brief.outputKinds?.join(" ") ?? "",
    request.seeking.supplyKinds?.join(" ") ?? "",
    request.seeking.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function inferAspectRatio(request: BorealRequestDraft): "16:9" | "9:16" | "1:1" {
  const body = requestText(request);

  if (body.includes("tiktok") || body.includes("shorts") || body.includes("vertical")) {
    return "9:16";
  }

  if (body.includes("square") || body.includes("instagram post")) {
    return "1:1";
  }

  return "16:9";
}

function inferDurationSeconds(request: BorealRequestDraft) {
  const body = requestText(request);

  if (body.includes("15 second") || body.includes("15s")) {
    return 15;
  }

  if (body.includes("30 second") || body.includes("30s")) {
    return 30;
  }

  if (body.includes("60 second") || body.includes("1 minute")) {
    return 60;
  }

  return undefined;
}

function buildVideoGenerationTerms(
  request: BorealRequestDraft
): BorealWorkerCommitmentDraft {
  const deliverableTitle = request.brief.title?.trim() || "Video generation request";
  const deliverableSummary =
    request.brief.summary?.trim() ||
    "One provider-backed generated video delivery plus source artifact publication.";

  const budget = request.budget;
  if (budget?.mode === "fixed") {
    return {
      kind: "proposal",
      summary: `Boreal Video Generation can deliver ${deliverableTitle}.`,
      terms: {
        fundingRequired: true,
        amountMode: "fixed",
        currency: budget.currency,
        fixedAmount: budget.fixedAmount,
        deliverableSummary,
        paymentNotes: "Provider-backed multimodal generation with Boreal-managed storage and artifact delivery.",
      },
    };
  }

  if (budget?.mode === "range") {
    return {
      kind: "proposal",
      summary: `Boreal Video Generation can deliver ${deliverableTitle}.`,
      terms: {
        fundingRequired: true,
        amountMode: "range",
        currency: budget.currency,
        minAmount: budget.minAmount,
        maxAmount: budget.maxAmount,
        deliverableSummary,
        paymentNotes: "Final spend depends on provider runtime, render count, and iteration depth.",
      },
    };
  }

  return {
    kind: "proposal",
      summary: `Boreal Video Generation can scope and deliver ${deliverableTitle}.`,
      terms: {
        fundingRequired: false,
        amountMode: "open",
        deliverableSummary,
        paymentNotes: "Quote first when duration, style, or provider choice is still open.",
      },
  };
}

export const videoGenerationWorker: BorealWorkerDefinition<
  VideoGenerationWorkerInput,
  VideoGenerationWorkerResult
> = {
  workerKey: "video-generation",
  version: "1",
  displayName: "Boreal Video Generation",
  description:
    "Provider-backed multimodal video generation supply with Boreal-managed artifact storage.",
  provider: {
    providerRef: "runway/video-generation",
    service: "runway",
    model: "gen4.5",
    mode: "multimodal",
  },
  executionMode: "queued_async",
  storage: {
    mode: "blob_mirror",
    storageProvider: "vercel_blob",
    keepSourceUri: true,
    pathPrefix: "boreal-workers/video-generation",
  },
  autoPropose: {
    enabled: true,
    requireAcceptance: true,
  },
  io: {
    inputSchema: videoGenerationWorkerInputSchema,
    resultSchema: videoGenerationWorkerResultSchema,
    storedAssetSchema: videoGenerationWorkerStoredAssetSchema,
    artifactSchema: videoGenerationWorkerArtifactSchema,
    inputExample: {
      requestId: "00000000-0000-0000-0000-000000000000",
      title: "Launch teaser video",
      brief: "Create a short launch teaser video for Boreal with bold motion and product UI callouts.",
      aspectRatio: "16:9",
      durationSeconds: 30,
      styleHints: ["cinematic", "product teaser"],
    },
    resultExample: {
      providerTaskId: "runway-task-123",
      providerStatus: "queued",
      sourceVideoUrl: "https://example.com/source.mp4",
    },
  },
  supply: {
    profile: {
      displayName: "Boreal Video Generation",
      headline: "Prompt-to-video production",
      summary:
        "Multimodal video generation for promos, explainers, clips, and avatar-led media.",
      description:
        "Boreal-managed video generation lane backed by external model providers and durable Boreal artifact delivery.",
      tags: [
        "boreal_worker",
        "video_generation",
        "multimodal",
        "provider_backed",
      ],
    },
    capability: {
      supplyKinds: ["agent_worker", "video_generation"],
      fulfillmentActorKinds: ["agent"],
      outputKinds: ["media", "delivery", "video"],
      executionChannels: ["request_room", "api"],
    },
    availability: {
      acceptingRequests: true,
      responseTimeHours: 4,
    },
    pricing: {
      mode: "quote",
      notes: "Final pricing depends on render duration, provider path, and iteration count.",
    },
    bindings: {
      providerRef: "runway/video-generation",
    },
  },
  matches(request) {
    return this.score(request) > 0;
  },
  score(request) {
    const body = requestText(request);
    const requestedKinds = request.seeking.supplyKinds ?? [];
    const outputKinds = request.brief.outputKinds ?? [];

    let score = 0;

    if (requestedKinds.includes("video_generation")) {
      score += 6;
    }

    if (requestedKinds.includes("agent_worker")) {
      score += 2;
    }

    if (outputKinds.includes("video") || outputKinds.includes("media")) {
      score += 4;
    }

    if (videoGenerationKeywords.some((keyword) => body.includes(keyword))) {
      score += 3;
    }

    return score;
  },
  draftCommitment(request) {
    if (!this.matches(request)) {
      return null;
    }

    return buildVideoGenerationTerms(request);
  },
  buildInput(request) {
    const title = request.brief.title?.trim() || "Untitled video request";
    const body = request.brief.body?.trim() || request.brief.summary?.trim() || title;

    return videoGenerationWorkerInputSchema.parse({
      requestId: request.id,
      title,
      brief: body,
      aspectRatio: inferAspectRatio(request),
      durationSeconds: inferDurationSeconds(request),
      styleHints: request.brief.tags ?? [],
    });
  },
  buildArtifact(asset: BorealWorkerStoredAsset) {
    const parsedAsset = videoGenerationWorkerStoredAssetSchema.parse(asset);

    return videoGenerationWorkerArtifactSchema.parse({
      artifactKind: "media",
      mediaKind: "video",
      title: parsedAsset.title,
      summary: parsedAsset.summary,
      container: {
        ...parsedAsset.container,
        mediaKind: "video",
      },
    });
  },
  metadata: {
    multimodal: true,
    providerFallbacks: ["heygen/avatar-video"],
    outputStorage: "vercel_blob",
  },
};

export function buildVideoGenerationSupplyPatch(): SupplyPatch {
  const metadata: BorealWorkerSupplyMetadata = {
    borealWorker: {
      workerKey: videoGenerationWorker.workerKey,
      version: videoGenerationWorker.version,
      displayName: videoGenerationWorker.displayName,
      description: videoGenerationWorker.description,
      provider: videoGenerationWorker.provider,
      executionMode: videoGenerationWorker.executionMode,
      storage: videoGenerationWorker.storage,
      autoPropose: videoGenerationWorker.autoPropose,
    },
  };

  return {
    profile: videoGenerationWorker.supply.profile,
    capability: videoGenerationWorker.supply.capability,
    availability: videoGenerationWorker.supply.availability,
    pricing: videoGenerationWorker.supply.pricing,
    source: {
      kind: "provider",
    },
    bindings: videoGenerationWorker.supply.bindings,
    metadata,
  };
}

export function createVideoGenerationSupplyDraft({
  id,
  userId,
  createdAt,
}: {
  id: string;
  userId: string;
  createdAt: string;
}): BorealSupplyDraft {
  const baseDraft = createInitialSupplyDraft({
    id,
    userId,
    preset: "agent_worker",
    createdAt,
  });

  return applySupplyPatch(
    baseDraft,
    {
      ...buildVideoGenerationSupplyPatch(),
      visibility: "unlisted",
    },
    createdAt
  );
}

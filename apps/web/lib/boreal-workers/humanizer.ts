import { generateText } from "ai";
import { z } from "zod";
import type { BorealRequestDraft } from "@/lib/request";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  BorealWorkerRecoverableError,
  borealWorkerDocumentArtifactDescriptorSchema,
  borealWorkerStoredDocumentAssetSchema,
  type BorealWorkerCommitmentDraft,
  type BorealWorkerDefinition,
  type BorealWorkerStoredAsset,
  parseBorealWorkerResult,
} from "./types";

const HUMANIZER_MODEL_ID = "openai/gpt-5.4-mini";
const HUMANIZER_FALLBACK_MODEL_IDS = [
  "openai/gpt-5-mini",
  "openai/gpt-4.1-nano",
] as const;

export const humanizerWorkerInputSchema = z
  .object({
    requestId: z.string().uuid(),
    title: z.string().min(1).max(200),
    sourceText: z.string().min(1).max(24_000),
    requestedTone: z
      .enum([
        "plain_language",
        "founder_clear",
        "warm_professional",
        "concise_operator",
      ])
      .default("plain_language"),
    audience: z.string().min(1).max(300).optional(),
    preservationRules: z.array(z.string().min(1).max(400)).min(1),
    reviewQuestions: z.array(z.string().min(1).max(400)).min(1),
    prohibitedClaims: z.array(z.string().min(1).max(400)).min(1),
  })
  .strict();

export type HumanizerWorkerInput = z.infer<typeof humanizerWorkerInputSchema>;

export const humanizerWorkerStoredAssetSchema =
  borealWorkerStoredDocumentAssetSchema
    .extend({
      documentKind: z.literal("text"),
    })
    .strict();

export const humanizerWorkerArtifactSchema =
  borealWorkerDocumentArtifactDescriptorSchema
    .extend({
      artifactKind: z.literal("delivery"),
      documentKind: z.literal("text"),
    })
    .strict();

export const humanizerWorkerResultSchema = z
  .object({
    providerStatus: z.literal("completed"),
    modelId: z.string().min(1).max(120),
    outputText: z.string().min(1),
    storedAsset: humanizerWorkerStoredAssetSchema,
  })
  .strict();

export type HumanizerWorkerResult = z.infer<typeof humanizerWorkerResultSchema>;

const humanizerKeywords = [
  "humanize",
  "humanizer",
  "rewrite",
  "polish",
  "copy",
  "editorial",
  "tone",
  "plain language",
  "make this clearer",
  "make it sound human",
  "launch copy",
  "website copy",
];

const humanizerOutputKinds = [
  "draft",
  "handoff_doc",
  "verification_note",
] as const;

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

function inferRequestedTone(request: BorealRequestDraft): HumanizerWorkerInput["requestedTone"] {
  const text = requestText(request);

  if (text.includes("founder") || text.includes("investor")) {
    return "founder_clear";
  }

  if (text.includes("warm") || text.includes("friendly")) {
    return "warm_professional";
  }

  if (text.includes("concise") || text.includes("operator")) {
    return "concise_operator";
  }

  return "plain_language";
}

function buildHumanizerTerms(
  request: BorealRequestDraft,
): BorealWorkerCommitmentDraft {
  const deliverableTitle =
    request.brief.title?.trim() || "Humanized text delivery";

  return {
    kind: "proposal",
    summary: `Boreal Humanizer can prepare a review-safe rewrite for ${deliverableTitle}.`,
    terms: {
      fundingRequired: false,
      amountMode: "open",
      deliverableSummary:
        "One document-backed text delivery that preserves buyer facts and keeps owner review required before completion.",
      paymentNotes:
        "Target-only until supply factory, failure fixtures, and route-level mutation tests are promoted.",
    },
  };
}

function buildHumanizerPrompt(input: HumanizerWorkerInput) {
  return [
    `Request id: ${input.requestId}`,
    `Title: ${input.title}`,
    `Requested tone: ${input.requestedTone}`,
    input.audience ? `Audience: ${input.audience}` : null,
    "",
    "Preservation rules:",
    ...input.preservationRules.map((rule) => `- ${rule}`),
    "",
    "Prohibited claims:",
    ...input.prohibitedClaims.map((claim) => `- ${claim}`),
    "",
    "Review questions the owner should still answer:",
    ...input.reviewQuestions.map((question) => `- ${question}`),
    "",
    "Source text:",
    input.sourceText,
    "",
    "Return only the rewritten text. Do not add analysis or completion claims.",
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

function buildStoredDocumentAsset({
  input,
  outputText,
}: {
  input: HumanizerWorkerInput;
  outputText: string;
}) {
  return humanizerWorkerStoredAssetSchema.parse({
    title: `${input.title} - humanized draft`,
    summary:
      "Document-backed humanizer delivery. Owner review is still required before request completion.",
    content: outputText,
    documentKind: "text",
  });
}

export const humanizerWorker: BorealWorkerDefinition<
  HumanizerWorkerInput,
  HumanizerWorkerResult
> = {
  workerKey: "humanizer",
  version: "0.1-target",
  displayName: "Boreal Humanizer",
  description:
    "Target-only OpenAI-backed text polish worker with document-backed artifact output.",
  provider: {
    providerRef: "boreal/humanizer",
    service: "openai",
    model: HUMANIZER_MODEL_ID,
    mode: "text",
  },
  executionMode: "sync_api",
  storage: {
    mode: "blob_mirror",
    storageProvider: "vercel_blob",
    keepSourceUri: false,
    pathPrefix: "boreal-workers/humanizer",
  },
  autoPropose: {
    enabled: false,
    requireAcceptance: true,
  },
  io: {
    inputSchema: humanizerWorkerInputSchema,
    resultSchema: humanizerWorkerResultSchema,
    storedAssetSchema: humanizerWorkerStoredAssetSchema,
    artifactSchema: humanizerWorkerArtifactSchema,
    inputExample: {
      requestId: "00000000-0000-0000-0000-000000000000",
      title: "Launch page copy polish",
      sourceText:
        "Make this Boreal launch copy clearer without inventing shipped features.",
      requestedTone: "founder_clear",
      audience: "early buyers and worker partners",
      preservationRules: [
        "Preserve product facts from the source text.",
        "Do not invent live features, pricing, proof, or customer claims.",
      ],
      reviewQuestions: [
        "Does the owner accept this wording?",
        "Are all live-versus-target claims still accurate?",
      ],
      prohibitedClaims: [
        "Do not claim the Request is complete.",
        "Do not claim owner approval, artifact acceptance, or payment authority.",
      ],
    },
    resultExample: {
      providerStatus: "completed",
      modelId: HUMANIZER_MODEL_ID,
      outputText:
        "Boreal turns requests into completed work while keeping plans, workers, artifacts, and review in one thread.",
      storedAsset: {
        title: "Launch page copy polish - humanized draft",
        summary:
          "Document-backed humanizer delivery. Owner review is still required before request completion.",
        content:
          "Boreal turns requests into completed work while keeping plans, workers, artifacts, and review in one thread.",
        documentKind: "text",
      },
    },
  },
  supply: {
    profile: {
      displayName: "Boreal Humanizer",
      headline: "Review-safe text polish",
      summary:
        "Text rewrite and editorial polish for request briefs, launch copy, handoff notes, and review packets.",
      description:
        "Target-only Boreal-managed humanizer lane backed by OpenAI routing and document-backed artifact delivery.",
      tags: [
        "boreal_worker",
        "humanizer",
        "text_polish",
        "document_backed",
      ],
    },
    capability: {
      supplyKinds: ["agent_worker", "documentation_support"],
      fulfillmentActorKinds: ["agent"],
      outputKinds: ["draft", "handoff_doc", "verification_note"],
      executionChannels: ["request_room", "api"],
    },
    availability: {
      acceptingRequests: false,
      responseTimeHours: 4,
    },
    pricing: {
      mode: "quote",
      notes:
        "Target-only until the supply factory, failure fixtures, and route-level mutation tests exist.",
    },
    bindings: {
      providerRef: "boreal/humanizer",
    },
  },
  matches(request) {
    return this.score(request) > 0;
  },
  score(request) {
    const text = requestText(request);
    const requestedKinds = request.seeking.supplyKinds ?? [];
    const outputKinds = request.brief.outputKinds ?? [];

    if (
      requestedKinds.includes("video_generation") ||
      outputKinds.includes("video") ||
      outputKinds.includes("media")
    ) {
      return 0;
    }

    let score = 0;

    if (requestedKinds.includes("documentation_support")) {
      score += 5;
    }

    if (requestedKinds.includes("reporting_support")) {
      score += 2;
    }

    if (humanizerOutputKinds.some((kind) => outputKinds.includes(kind))) {
      score += 4;
    }

    if (humanizerKeywords.some((keyword) => text.includes(keyword))) {
      score += 4;
    }

    return score;
  },
  draftCommitment(request) {
    if (!this.matches(request)) {
      return null;
    }

    return buildHumanizerTerms(request);
  },
  buildInput(request) {
    const title = request.brief.title?.trim() || "Untitled humanizer request";
    const sourceText =
      request.brief.body?.trim() || request.brief.summary?.trim() || title;

    return humanizerWorkerInputSchema.parse({
      requestId: request.id,
      title,
      sourceText,
      requestedTone: inferRequestedTone(request),
      audience: request.seeking.notes?.trim() || undefined,
      preservationRules: [
        "Preserve buyer-provided facts and concrete constraints.",
        "Keep any live-versus-target boundaries explicit.",
        "Do not expand scope beyond the source text.",
      ],
      reviewQuestions: [
        "Did the rewrite preserve all material facts?",
        "Does the owner approve this wording before delivery is accepted?",
      ],
      prohibitedClaims: [
        "Do not claim the Request is complete.",
        "Do not claim owner approval, review acceptance, payment authority, or fulfillment completion.",
        "Do not invent features, credentials, screenshots, customers, or proof.",
      ],
    });
  },
  buildArtifact(asset: BorealWorkerStoredAsset) {
    const parsedAsset = humanizerWorkerStoredAssetSchema.parse(asset);

    return humanizerWorkerArtifactSchema.parse({
      artifactKind: "delivery",
      title: parsedAsset.title,
      summary: parsedAsset.summary,
      content: parsedAsset.content,
      documentKind: "text",
      metadata: {
        evidenceClaims: [
          "document_backed_text_delivery",
          "owner_review_required_before_completion",
        ],
      },
    });
  },
  async execute(input) {
    const parsedInput = humanizerWorkerInputSchema.parse(input);

    try {
      const result = await generateText({
        model: getLanguageModel(HUMANIZER_MODEL_ID, {
          fallbackModelIds: [...HUMANIZER_FALLBACK_MODEL_IDS],
        }),
        system:
          "You rewrite text for Boreal request fulfillment. Preserve facts, avoid invented claims, and never claim approval, payment, fulfillment, proof, or completion. Return rewritten text only.",
        prompt: buildHumanizerPrompt(parsedInput),
        maxOutputTokens: 1800,
        maxRetries: 0,
      });
      const outputText = result.text.trim();

      if (!outputText) {
        throw new Error("Humanizer returned an empty rewrite.");
      }

      return parseBorealWorkerResult(this, {
        providerStatus: "completed",
        modelId: HUMANIZER_MODEL_ID,
        outputText,
        storedAsset: buildStoredDocumentAsset({
          input: parsedInput,
          outputText,
        }),
      });
    } catch (error) {
      throw new BorealWorkerRecoverableError(
        "Humanizer model execution could not produce a delivery document.",
        {
          recoveryStage: "rerun_worker",
          providerStatus: "failed",
          cause: error,
        },
      );
    }
  },
  metadata: {
    targetOnly: true,
    notStarterSupply: true,
    modelFallbacks: HUMANIZER_FALLBACK_MODEL_IDS,
    outputStorage: "document",
  },
};

import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import {
  embodiedFulfillmentPrompt,
  requestBriefingOptimizerPrompt,
  requestBriefingPrompt,
} from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  mergeRequestConstraintInputs,
  requestEmbodiedConstraintInputSchema,
} from "@/lib/ai/tools/request-briefing-shared";
import {
  borealActorKinds,
  borealOutputKinds,
  borealSupplyKinds,
} from "@/lib/matching-fingerprints";
import {
  buildRequestMatchingLabWorkflowRunFromFixture,
  buildRequestPatchFromAsk,
  createRequestMatchingLabFixture,
  requestPatchSchema,
  type RequestMatchingLabFixture,
} from "@/lib/request-matching-lab";

const matchingLabLlmOutputSchema = requestPatchSchema
  .pick({
    brief: true,
    seeking: true,
    budget: true,
    deadline: true,
  })
  .extend({
    embodiedConstraints: requestEmbodiedConstraintInputSchema.optional(),
  });

type MatchingLabLlmOutput = z.infer<typeof matchingLabLlmOutputSchema>;

export async function buildRequestMatchingLabRunWithLlm({
  ask,
  supplies,
  actorId = "actor_matching_lab",
  modelId,
  requestPromptOptimizerEnabled = true,
}: {
  ask: string;
  supplies: RequestMatchingLabFixture["candidateSupplies"];
  actorId?: string;
  modelId: string;
  requestPromptOptimizerEnabled?: boolean;
}) {
  const heuristicPatch = buildRequestPatchFromAsk(ask);

  try {
    const { object } = await generateObject({
      model: getLanguageModel(modelId),
      schema: matchingLabLlmOutputSchema,
      system: buildMatchingLabLlmSystemPrompt({
        requestPromptOptimizerEnabled,
      }),
      prompt: buildMatchingLabLlmUserPrompt({
        ask,
        heuristicPatch,
      }),
    });

    const requestPatch = mergeMatchingLabRequestPatch({
      ask,
      heuristicPatch,
      llmOutput: object,
    });
    const fixture = createRequestMatchingLabFixture({
      actorId,
      ask,
      supplies,
      requestPatch,
    });

    return buildRequestMatchingLabWorkflowRunFromFixture(fixture, {
      normalization: {
        source: "llm",
        modelId,
      },
    });
  } catch (error) {
    const fixture = createRequestMatchingLabFixture({
      actorId,
      ask,
      supplies,
      requestPatch: heuristicPatch,
    });

    return buildRequestMatchingLabWorkflowRunFromFixture(fixture, {
      normalization: {
        source: "heuristic_fallback",
        modelId,
        note: toNormalizationErrorNote(error),
      },
    });
  }
}

function mergeMatchingLabRequestPatch({
  ask,
  heuristicPatch,
  llmOutput,
}: {
  ask: string;
  heuristicPatch: RequestMatchingLabFixture["requestPatch"];
  llmOutput: MatchingLabLlmOutput;
}): RequestMatchingLabFixture["requestPatch"] {
  const llmConstraints = mergeRequestConstraintInputs({
    constraints: llmOutput.brief?.constraints,
    embodiedConstraints: llmOutput.embodiedConstraints,
  });

  const nextBody = normalizeText(llmOutput.brief?.body) || ask.trim();
  const nextTitle =
    normalizeText(llmOutput.brief?.title) ??
    normalizeText(heuristicPatch.brief?.title) ??
    "";
  const nextSummary =
    normalizeText(llmOutput.brief?.summary) ??
    normalizeText(heuristicPatch.brief?.summary) ??
    "";
  const nextOutputKinds =
    llmOutput.brief?.outputKinds && llmOutput.brief.outputKinds.length > 0
      ? llmOutput.brief.outputKinds
      : heuristicPatch.brief?.outputKinds;
  const nextSeeking = {
    ...(heuristicPatch.seeking ?? {}),
    ...(llmOutput.seeking ?? {}),
    ...(llmOutput.seeking?.actorKinds?.length
      ? { actorKinds: llmOutput.seeking.actorKinds }
      : {}),
    ...(llmOutput.seeking?.supplyKinds?.length
      ? { supplyKinds: llmOutput.seeking.supplyKinds }
      : {}),
  };

  return {
    ...heuristicPatch,
    brief: {
      ...(heuristicPatch.brief ?? {}),
      ...(llmOutput.brief ?? {}),
      title: nextTitle,
      summary: nextSummary,
      body: nextBody,
      ...(nextOutputKinds ? { outputKinds: nextOutputKinds } : {}),
      tags: heuristicPatch.brief?.tags ?? [],
      constraints: llmConstraints ?? heuristicPatch.brief?.constraints ?? {},
    },
    seeking: Object.keys(nextSeeking).length > 0 ? nextSeeking : undefined,
    budget: llmOutput.budget ?? heuristicPatch.budget,
    deadline: llmOutput.deadline ?? heuristicPatch.deadline,
  };
}

function buildMatchingLabLlmSystemPrompt({
  requestPromptOptimizerEnabled,
}: {
  requestPromptOptimizerEnabled: boolean;
}) {
  return `${requestBriefingPrompt}

${embodiedFulfillmentPrompt}

${requestPromptOptimizerEnabled ? requestBriefingOptimizerPrompt : ""}

Matching lab rules:
- This is read-only normalization for a lab route, not a durable mutation.
- Return only the request-input fields the schema allows.
- Prefer the smallest truthful shape.
- For simple digital asks, keep the plan single-lane when one specialist can own it.
- Do not add extra supply kinds, output kinds, or team needs unless the ask clearly requires them.
- Only use these structured fingerprint enums when they are explicit or strongly implied.
- Supply kinds: ${borealSupplyKinds.join(", ")}
- Output kinds: ${borealOutputKinds.join(", ")}
- Actor kinds: ${borealActorKinds.join(", ")}
- For embodied work, use embodiedConstraints only when the ask explicitly or strongly implies location, access, timing, or proof facts.
- If a fact is missing, leave it missing.
- Keep visibility private.`;
}

function buildMatchingLabLlmUserPrompt({
  ask,
  heuristicPatch,
}: {
  ask: string;
  heuristicPatch: RequestMatchingLabFixture["requestPatch"];
}) {
  return `Normalize this freeform request into a Boreal request-input patch.

Raw ask:
${ask}

Weak heuristic seed:
${JSON.stringify(
  {
    brief: heuristicPatch.brief,
    seeking: heuristicPatch.seeking,
    budget: heuristicPatch.budget,
    deadline: heuristicPatch.deadline,
  },
  null,
  2
)}

Rules:
- Preserve explicit facts only.
- Improve wording clarity in brief.body when helpful.
- Keep title concise.
- Summary is optional.
- If the ask is simple, do not inflate it into a multi-worker or documentation-heavy route.
- If the ask implies onsite, inspection, pickup, witnessed handoff, or proof-heavy work, keep that explicit.
- Return only JSON that matches the schema.`;
}

function normalizeText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function toNormalizationErrorNote(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "LLM normalization was unavailable, so the lab used the heuristic parser.";
}

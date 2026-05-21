import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { borealOutputKindSchema } from "@/lib/matching-fingerprints";
import type { RequestOutputKind, RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import {
  applyRequestBriefPatch,
  mergeRequestConstraintInputs,
  requestBudgetInputSchema,
  requestDeadlineInputSchema,
  requestEmbodiedConstraintInputSchema,
  requestSeekingInputSchema,
} from "./request-briefing-shared";

type CreateRequestBriefProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
};

export const createRequestBrief = ({
  session,
  dataStream,
  chatId,
  visibility,
}: CreateRequestBriefProps) =>
  tool({
    description:
      "Create or initialize a durable Boreal Request draft and open its live request brief document. Prefer raw body first. Title or summary may stay blank if the user has not clearly established them yet. Include same-turn structured facts like budget, deadline, location, execution mode, access, or proof requirements when the user explicitly stated them. Only use when the user explicitly wants a new request or wants to turn the current work ask into a Request.",
    inputSchema: z.object({
      title: z.string().max(200).optional(),
      summary: z.string().max(1000).optional(),
      body: z.string(),
      constraints: z.record(z.string(), z.unknown()).optional(),
      embodiedConstraints: requestEmbodiedConstraintInputSchema.optional(),
      outputKinds: z
        .union([borealOutputKindSchema, z.array(borealOutputKindSchema)])
        .optional(),
      seeking: requestSeekingInputSchema.optional(),
      budget: requestBudgetInputSchema.optional(),
      deadline: requestDeadlineInputSchema.optional(),
    }),
    execute: async ({
      title,
      summary,
      body,
      constraints,
      embodiedConstraints,
      outputKinds,
      seeking,
      budget,
      deadline,
    }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          brief: buildCreateRequestBriefPayload({
            title,
            summary,
            body,
            constraints,
            embodiedConstraints,
            outputKinds,
          }),
          ...(seeking !== undefined
            ? { seeking: seeking as any }
            : {}),
          ...(budget !== undefined ? { budget: budget as any } : {}),
          ...(deadline !== undefined
            ? { deadline: deadline as any }
            : {}),
        },
      }),
  });

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeRequiredText(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Request body is required.");
  }

  return normalized;
}

function buildCreateRequestBriefPayload({
  title,
  summary,
  body,
  constraints,
  embodiedConstraints,
  outputKinds,
}: {
  title: string | undefined;
  summary: string | undefined;
  body: string;
  constraints: Record<string, unknown> | undefined;
  embodiedConstraints: z.infer<typeof requestEmbodiedConstraintInputSchema> | undefined;
  outputKinds: RequestOutputKind | RequestOutputKind[] | undefined;
}) {
  const normalizedTitle = normalizeOptionalText(title);
  const normalizedSummary = normalizeOptionalText(summary);
  const mergedConstraints = mergeRequestConstraintInputs({
    constraints,
    embodiedConstraints,
  });
  const normalizedOutputKinds =
    typeof outputKinds === "string" ? [outputKinds] : outputKinds;

  return {
    ...(normalizedTitle ? { title: normalizedTitle } : {}),
    ...(normalizedSummary ? { summary: normalizedSummary } : {}),
    body: normalizeRequiredText(body),
    ...(mergedConstraints ? { constraints: mergedConstraints } : {}),
    ...(normalizedOutputKinds !== undefined
      ? { outputKinds: normalizedOutputKinds }
      : {}),
  };
}

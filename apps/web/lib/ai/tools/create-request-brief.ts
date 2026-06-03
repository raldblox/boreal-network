import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { appendRequestEvent } from "@/lib/db/queries";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import {
  applyRequestBriefPatch,
  mergeRequestConstraintInputs,
  requestBudgetInputSchema,
  requestDeadlineInputSchema,
  requestEmbodiedConstraintInputSchema,
  requestOutputKindsInputSchema,
  requestSeekingInputSchema,
  sanitizeRequestOutputKindsInput,
} from "./request-briefing-shared";

type CreateRequestBriefProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
  dryRun?: boolean;
  source?: {
    inputHash?: string;
    messageId: string;
    sourceText: string;
  } | null;
};

export const createRequestBrief = ({
  session,
  dataStream,
  chatId,
  visibility,
  dryRun = false,
  source,
}: CreateRequestBriefProps) =>
  tool({
    description:
      "Create or initialize a durable Boreal Request draft and open its live request brief document. Prefer raw body first. Title or summary may stay blank if the user has not clearly established them yet. Include same-turn structured facts like budget, deadline, location, execution mode, access, proof requirements, seeking.actorKinds, seeking.supplyKinds, and outputKinds when the user explicitly stated them or they are directly implied by the ask. For human/local work, include embodiedConstraints so provider-only agents can skip it. Only use when the user explicitly wants a new request or wants to turn the current work ask into a Request.",
    inputSchema: z.object({
      title: z.string().max(200).optional(),
      summary: z.string().max(1000).optional(),
      body: z.string(),
      constraints: z.record(z.string(), z.unknown()).optional(),
      embodiedConstraints: requestEmbodiedConstraintInputSchema.optional(),
      outputKinds: requestOutputKindsInputSchema.optional(),
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
    }) => {
      const patch = {
        brief: buildCreateRequestBriefPayload({
          title,
          summary,
          body,
          constraints,
          embodiedConstraints,
          outputKinds,
        }),
        ...(seeking !== undefined ? { seeking: seeking as any } : {}),
        ...(budget !== undefined ? { budget: budget as any } : {}),
        ...(deadline !== undefined ? { deadline: deadline as any } : {}),
      };

      if (dryRun) {
        return {
          id: `eval-document-${chatId}`,
          requestId: `eval-request-${chatId}`,
          title: patch.brief.title?.trim() || "Untitled request",
          kind: "code" as const,
          status: "draft",
          readiness: {
            state: "draft",
            summary:
              "Eval dry run only; no durable Request, Artifact, or RequestEvent was written.",
          },
          missingDetails: [],
        };
      }

      const result = await applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch,
      });

      if (source?.sourceText.trim()) {
        const occurredAt = new Date();
        await appendRequestEvent({
          eventId: generateUUID(),
          requestId: result.requestId,
          aggregateType: "request",
          aggregateId: result.requestId,
          eventType: "request.updated",
          actor: {
            kind: "human",
            id: session.user.id,
          },
          correlationId: source.messageId,
          causationId: source.messageId,
          idempotencyKey: source.messageId,
          source: "api.chat.request_briefing_source",
          payload: {
            summary: "Buyer briefing source submitted.",
            sourceKind: "briefing_source",
            sourceText: source.sourceText.trim(),
            inputHash: source.inputHash,
          },
          occurredAt,
        });
      }

      return result;
    },
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
  embodiedConstraints:
    | z.infer<typeof requestEmbodiedConstraintInputSchema>
    | undefined;
  outputKinds: z.infer<typeof requestOutputKindsInputSchema> | undefined;
}) {
  const normalizedTitle = normalizeOptionalText(title);
  const normalizedSummary = normalizeOptionalText(summary);
  const mergedConstraints = mergeRequestConstraintInputs({
    constraints,
    embodiedConstraints,
  });
  const normalizedOutputKinds = sanitizeRequestOutputKindsInput(outputKinds);

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

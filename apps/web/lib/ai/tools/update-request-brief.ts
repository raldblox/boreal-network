import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
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

type UpdateRequestBriefProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
};

export const updateRequestBrief = ({
  session,
  dataStream,
  chatId,
  visibility,
}: UpdateRequestBriefProps) =>
  tool({
    description:
      "Update the live Request object with explicit title, body, optional summary, or same-turn structured preflight details like budget, deadline, execution mode, location, access, or proof requirements. Prefer this for freeform user asks. If the user only gave one raw work description, update body with that explicit wording and leave unknown fields untouched instead of manufacturing extra fields.",
    inputSchema: z.object({
      title: z.string().max(200).optional(),
      summary: z.string().max(1000).optional(),
      body: z.string().optional(),
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
    }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          brief: buildUpdateRequestBriefPayload({
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

function buildUpdateRequestBriefPayload({
  title,
  summary,
  body,
  constraints,
  embodiedConstraints,
  outputKinds,
}: {
  title: string | undefined;
  summary: string | undefined;
  body: string | undefined;
  constraints: Record<string, unknown> | undefined;
  embodiedConstraints: z.infer<typeof requestEmbodiedConstraintInputSchema> | undefined;
  outputKinds: z.infer<typeof requestOutputKindsInputSchema> | undefined;
}) {
  const normalizedTitle = normalizeOptionalText(title);
  const normalizedSummary = normalizeOptionalText(summary);
  const normalizedBody = normalizeOptionalText(body);
  const mergedConstraints = mergeRequestConstraintInputs({
    constraints,
    embodiedConstraints,
  });
  const normalizedOutputKinds = sanitizeRequestOutputKindsInput(outputKinds);

  return {
    ...(normalizedTitle ? { title: normalizedTitle } : {}),
    ...(normalizedSummary ? { summary: normalizedSummary } : {}),
    ...(normalizedBody ? { body: normalizedBody } : {}),
    ...(mergedConstraints ? { constraints: mergedConstraints } : {}),
    ...(normalizedOutputKinds !== undefined
      ? { outputKinds: normalizedOutputKinds }
      : {}),
  };
}

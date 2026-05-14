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
      title: z.string().min(1).max(200).optional(),
      summary: z.string().min(1).max(1000).optional(),
      body: z.string().min(1),
      constraints: z.record(z.string(), z.unknown()).optional(),
      embodiedConstraints: requestEmbodiedConstraintInputSchema.optional(),
      outputKinds: z.array(z.string().min(1)).optional(),
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
          brief: {
            title,
            summary,
            body,
            constraints: mergeRequestConstraintInputs({
              constraints,
              embodiedConstraints,
            }),
            outputKinds,
          },
          ...(seeking !== undefined ? { seeking } : {}),
          ...(budget !== undefined ? { budget } : {}),
          ...(deadline !== undefined ? { deadline } : {}),
        },
      }),
  });

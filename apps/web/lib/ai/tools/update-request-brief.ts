import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import {
  applyRequestBriefPatch,
  requestBudgetInputSchema,
  requestDeadlineInputSchema,
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
      "Update the live Request object with explicit title, summary, body, or same-turn structured briefing details like budget and deadline. Prefer this for freeform user asks. If the user only gave one raw work description, update body with that explicit wording and leave unknown fields untouched.",
    inputSchema: z.object({
      title: z.string().min(1).max(200).optional(),
      summary: z.string().min(1).max(1000).optional(),
      body: z.string().min(1).optional(),
      outputKinds: z.array(z.string().min(1)).optional(),
      tags: z.array(z.string().min(1)).optional(),
      budget: requestBudgetInputSchema.optional(),
      deadline: requestDeadlineInputSchema.optional(),
    }),
    execute: async ({
      title,
      summary,
      body,
      outputKinds,
      tags,
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
            outputKinds,
            tags,
          },
          ...(budget !== undefined ? { budget } : {}),
          ...(deadline !== undefined ? { deadline } : {}),
        },
      }),
  });

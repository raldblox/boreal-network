import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { applyRequestBriefPatch } from "./request-briefing-shared";

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
      "Update the live Request brief document with clearer title, summary, or body details. Use this when the user is still briefing the work.",
    inputSchema: z.object({
      title: z.string().min(1).max(200).optional(),
      summary: z.string().min(1).max(1000).optional(),
      body: z.string().min(1).optional(),
      outputKinds: z.array(z.string().min(1)).optional(),
      tags: z.array(z.string().min(1)).optional(),
    }),
    execute: async ({ title, summary, body, outputKinds, tags }) =>
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
        },
      }),
  });

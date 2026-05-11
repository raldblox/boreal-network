import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { applyRequestBriefPatch } from "./request-briefing-shared";

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
      "Create or initialize a durable Boreal Request draft and open its live request brief document. Only use when the user explicitly wants a new request or wants to turn the current work ask into a Request.",
    inputSchema: z.object({
      title: z.string().min(1).max(200),
      summary: z.string().min(1).max(1000),
      body: z.string().min(1),
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

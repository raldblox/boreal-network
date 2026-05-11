import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { applyRequestBriefPatch } from "./request-briefing-shared";

type UpdateRequestConstraintsProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
};

export const updateRequestConstraints = ({
  session,
  dataStream,
  chatId,
  visibility,
}: UpdateRequestConstraintsProps) =>
  tool({
    description:
      "Update request constraints, expected outputs, and briefing tags for the active Request draft. Use this for explicit location, format, platform, style, or deliverable constraints the user already stated.",
    inputSchema: z.object({
      constraints: z.record(z.string(), z.unknown()).default({}),
      outputKinds: z.array(z.string().min(1)).optional(),
      tags: z.array(z.string().min(1)).optional(),
    }),
    execute: async ({ constraints, outputKinds, tags }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          brief: {
            constraints,
            outputKinds,
            tags,
          },
        },
      }),
  });

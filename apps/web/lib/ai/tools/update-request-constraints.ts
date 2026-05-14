import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import {
  applyRequestBriefPatch,
  mergeRequestConstraintInputs,
  requestEmbodiedConstraintInputSchema,
  requestSeekingInputSchema,
} from "./request-briefing-shared";

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
      "Update request constraints, expected outputs, structured seeking criteria, and optional human labels for the active Request draft. Use this for explicit location, access, time-window, execution-mode, proof, format, platform, style, deliverable, or matching-intent details the user already stated.",
    inputSchema: z.object({
      constraints: z.record(z.string(), z.unknown()).default({}),
      embodiedConstraints: requestEmbodiedConstraintInputSchema.optional(),
      outputKinds: z.array(z.string().min(1)).optional(),
      seeking: requestSeekingInputSchema.optional(),
      tags: z.array(z.string().min(1)).optional(),
    }),
    execute: async ({
      constraints,
      embodiedConstraints,
      outputKinds,
      seeking,
      tags,
    }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          brief: {
            constraints: mergeRequestConstraintInputs({
              constraints,
              embodiedConstraints,
            }),
            outputKinds,
            tags,
          },
          ...(seeking !== undefined ? { seeking } : {}),
        },
      }),
  });

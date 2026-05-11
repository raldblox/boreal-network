import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { applyRequestBriefPatch } from "./request-briefing-shared";

type UpdateRequestRouteSummaryProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
};

export const updateRequestRouteSummary = ({
  session,
  dataStream,
  chatId,
  visibility,
}: UpdateRequestRouteSummaryProps) =>
  tool({
    description:
      "Update the derived route summary for the active Request draft, including route family, execution mode, payment mode, matching mode, and candidate pool.",
    inputSchema: z.object({
      routeSummary: z.string().min(1),
      routeFamily: z.string().min(1).optional(),
      executionKind: z.string().min(1).optional(),
      paymentMode: z.string().min(1).optional(),
      matchingMode: z.string().min(1).optional(),
      candidatePool: z.array(z.string().min(1)).optional(),
    }),
    execute: async ({
      routeSummary,
      routeFamily,
      executionKind,
      paymentMode,
      matchingMode,
      candidatePool,
    }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          derived: {
            routeSummary,
            routeFamily,
            executionKind,
            paymentMode,
            matchingMode,
            candidatePool,
          },
        },
      }),
  });

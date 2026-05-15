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

type UpdateRequestBudgetTimingProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
};

export const updateRequestBudgetTiming = ({
  session,
  dataStream,
  chatId,
  visibility,
}: UpdateRequestBudgetTimingProps) =>
  tool({
    description:
      "Update request budget and timing details for the active Request draft.",
    inputSchema: requestBudgetTimingSchema,
    execute: async ({ budget, deadline }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          ...(budget !== undefined ? { budget: budget as any } : {}),
          ...(deadline !== undefined
            ? { deadline: deadline as any }
            : {}),
        },
      }),
  });

const requestBudgetTimingSchema = z.object({
  budget: requestBudgetInputSchema.optional(),
  deadline: requestDeadlineInputSchema.optional(),
});

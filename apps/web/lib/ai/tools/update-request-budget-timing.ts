import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { RequestVisibility } from "@/lib/request";
import type { ChatMessage } from "@/lib/types";
import { applyRequestBriefPatch } from "./request-briefing-shared";

type UpdateRequestBudgetTimingProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
};

const budgetSchema = z.object({
  mode: z.enum(["none", "fixed", "range", "open"]),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  fixedAmount: z.number().nonnegative().optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  notes: z.string().min(1).optional(),
});

const deadlineSchema = z.object({
  targetAt: z.string().datetime().optional(),
  notes: z.string().min(1).optional(),
});

export const updateRequestBudgetTiming = ({
  session,
  dataStream,
  chatId,
  visibility,
}: UpdateRequestBudgetTimingProps) =>
  tool({
    description:
      "Update request budget and timing details for the active Request draft.",
    inputSchema: z.object({
      budget: budgetSchema.optional(),
      deadline: deadlineSchema.optional(),
    }),
    execute: async ({ budget, deadline }) =>
      applyRequestBriefPatch({
        session,
        dataStream,
        chatId,
        visibility,
        patch: {
          ...(budget !== undefined ? { budget } : {}),
          ...(deadline !== undefined ? { deadline } : {}),
        },
      }),
  });

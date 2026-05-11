import { tool } from "ai";
import { z } from "zod";
import { proposeCommitmentForRequest } from "@/lib/request-server";

type ProposeCommitmentProps = {
  chatId: string;
  actorUserId: string;
};

const commitmentTermsSchema = z
  .object({
    fundingRequired: z.boolean().default(false),
    amountMode: z.enum(["none", "fixed", "range", "open"]),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    fixedAmount: z.number().nonnegative().optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    deliverableSummary: z.string().min(1).optional(),
    paymentNotes: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.amountMode === "fixed") {
      if (!value.currency || value.fixedAmount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fixed proposals need currency and fixedAmount.",
        });
      }
    }

    if (value.amountMode === "range") {
      if (
        !value.currency ||
        value.minAmount == null ||
        value.maxAmount == null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Range proposals need currency, minAmount, and maxAmount.",
        });
      }
    }
  });

export const proposeCommitment = ({
  chatId,
  actorUserId,
}: ProposeCommitmentProps) =>
  tool({
    description:
      "Create a durable commitment proposal on an active open Request. Use this for quotes, proposals, pricing positions, or formal terms that should become visible request activity instead of overwriting the brief.",
    inputSchema: z.object({
      kind: z
        .enum(["quote", "proposal", "assignment", "milestone", "acceptance"])
        .default("proposal"),
      summary: z.string().min(1).max(1000),
      terms: commitmentTermsSchema,
    }),
    execute: async ({ kind, summary, terms }) =>
      proposeCommitmentForRequest({
        chatId,
        actorUserId,
        kind,
        summary,
        terms,
      }),
  });

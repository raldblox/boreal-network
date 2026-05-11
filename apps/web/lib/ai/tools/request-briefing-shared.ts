import { z } from "zod";
import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { ensureRequestDraftForChat, persistRequestPatch, streamRequestDraftToArtifact } from "@/lib/request-server";
import type {
  RequestBudget,
  RequestPatch,
  RequestVisibility,
} from "@/lib/request";
import type { ChatMessage } from "@/lib/types";

export const requestBudgetInputSchema = z.object({
  mode: z.enum(["none", "fixed", "range", "open"]),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  fixedAmount: z.number().nonnegative().optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  notes: z.string().min(1).optional(),
});

export const requestDeadlineInputSchema = z.object({
  targetAt: z.string().datetime().optional(),
  notes: z.string().min(1).optional(),
});

type ApplyRequestPatchArgs = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
  visibility: RequestVisibility;
  patch: RequestPatch;
};

export async function applyRequestBriefPatch({
  session,
  dataStream,
  chatId,
  visibility,
  patch,
}: ApplyRequestPatchArgs) {
  const userId = session.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const currentDraft = await ensureRequestDraftForChat({
    chatId,
    userId,
    visibility,
  });

  const nextDraft = await persistRequestPatch({
    requestId: currentDraft.id,
    userId,
    patch: hydrateExplicitStructuredFields(patch),
  });

  streamRequestDraftToArtifact({
    dataStream,
    draft: nextDraft,
  });

  return {
    id: nextDraft.documentId,
    requestId: nextDraft.id,
    title: nextDraft.brief.title?.trim() || "Untitled request",
    kind: "code" as const,
    status: nextDraft.status,
    readiness: nextDraft.derived.readiness,
    missingDetails: nextDraft.derived.missingDetails,
  };
}

function hydrateExplicitStructuredFields(patch: RequestPatch): RequestPatch {
  const briefText = [
    patch.brief?.title,
    patch.brief?.summary,
    patch.brief?.body,
  ]
    .filter(Boolean)
    .join("\n");
  const inferredBudget =
    patch.budget === undefined ? inferBudgetFromText(briefText) : undefined;

  return {
    ...patch,
    ...(inferredBudget ? { budget: inferredBudget } : {}),
  };
}

function inferBudgetFromText(text: string): RequestBudget | undefined {
  if (!text || !/\bbudget\b/i.test(text)) {
    return undefined;
  }

  const normalizedText = text.replace(/,/g, "");

  const rangeMatch =
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s+between|\s*:)?\s*(?:\$|usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)?/i
    ) ??
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s*:)?\s*between\s*(\d+(?:\.\d+)?)\s*and\s*(\d+(?:\.\d+)?)\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)/i
    );

  if (rangeMatch) {
    const minAmount = Number(rangeMatch[1]);
    const maxAmount = Number(rangeMatch[2]);
    const currency = normalizeCurrencyCode(rangeMatch[3], normalizedText);

    if (!Number.isNaN(minAmount) && !Number.isNaN(maxAmount)) {
      return {
        mode: "range",
        ...(currency ? { currency } : {}),
        minAmount,
        maxAmount,
      };
    }
  }

  const fixedMatch =
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s*:)?\s*(\$)?\s*(\d+(?:\.\d+)?)\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)?/i
    ) ??
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s*:)?\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)\s*(\d+(?:\.\d+)?)/i
    );

  if (fixedMatch) {
    const amount = Number(fixedMatch[2] ?? fixedMatch[1]);
    const currency = normalizeCurrencyCode(
      fixedMatch[3] ?? fixedMatch[1],
      normalizedText
    );

    if (!Number.isNaN(amount)) {
      return {
        mode: "fixed",
        ...(currency ? { currency } : {}),
        fixedAmount: amount,
      };
    }
  }

  return undefined;
}

function normalizeCurrencyCode(
  token: string | undefined,
  text: string
): string | undefined {
  if (token === "$") {
    return "USD";
  }

  const normalizedToken = token?.trim().toUpperCase();

  if (normalizedToken) {
    return normalizedToken;
  }

  if (/\$/i.test(text)) {
    return "USD";
  }

  return undefined;
}

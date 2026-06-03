import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  borealActorKindSchema,
  borealOutputKindSchema,
  borealRequestEvidenceClaimSchema,
  borealRequestExecutionModeSchema,
  borealRequestTeamModeSchema,
  borealSupplyKindSchema,
  normalizeFingerprintArray,
  normalizeFingerprintValue,
} from "@/lib/matching-fingerprints";
import type {
  RequestActorKind,
  RequestBudget,
  RequestExecutionMode,
  RequestOutputKind,
  RequestPatch,
  RequestVisibility,
} from "@/lib/request";
import {
  ensureRequestDraftForChat,
  persistRequestPatch,
} from "@/lib/request-server";
import type { ChatMessage } from "@/lib/types";

const looseStringSchema = z.string();
const looseStringListSchema = z.array(z.string());
const looseMaybeStringListSchema = z.union([
  looseStringSchema,
  looseStringListSchema,
]);

export const requestBudgetInputSchema = z.union([
  z.string(),
  z.object({
    mode: z.enum(["none", "fixed", "range", "open"]).optional(),
    currency: z.string().optional(),
    fixedAmount: z.number().nonnegative().optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  }),
]);

export const requestDeadlineInputSchema = z.union([
  z.string(),
  z.object({
    targetAt: z.string().optional(),
    notes: z.string().optional(),
  }),
]);

export const requestSeekingInputSchema = z.object({
  actorKinds: z
    .union([borealActorKindSchema, z.array(borealActorKindSchema)])
    .optional(),
  supplyKinds: z
    .union([borealSupplyKindSchema, z.array(borealSupplyKindSchema)])
    .optional(),
  teamMode: borealRequestTeamModeSchema.optional(),
  notes: z.string().optional(),
});

export const requestOutputKindsInputSchema = looseMaybeStringListSchema;

export const requestExecutionModeInputSchema = borealRequestExecutionModeSchema;

export const requestEmbodiedConstraintInputSchema = z.object({
  executionModes: z
    .union([
      requestExecutionModeInputSchema,
      z.array(requestExecutionModeInputSchema),
    ])
    .optional(),
  requiresHumanPresence: z.boolean().optional(),
  requiresLocalAccess: z.boolean().optional(),
  requiresVerifiedEvidence: z.boolean().optional(),
  requiresWitness: z.boolean().optional(),
  serviceLocation: z.string().optional(),
  timeWindows: looseMaybeStringListSchema.optional(),
  accessRequirements: looseMaybeStringListSchema.optional(),
  safetyRequirements: looseMaybeStringListSchema.optional(),
  verificationRequirements: z
    .union([
      borealRequestEvidenceClaimSchema,
      z.array(borealRequestEvidenceClaimSchema),
    ])
    .optional(),
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
    patch: {
      ...hydrateExplicitStructuredFields(patch),
      derived: {
        ...(patch.derived ?? {}),
        planningMode: "assisted",
      },
    },
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
    ...(patch.seeking !== undefined
      ? {
          seeking: sanitizeRequestSeekingInput(
            patch.seeking as z.infer<typeof requestSeekingInputSchema>,
          ),
        }
      : {}),
    ...(patch.budget !== undefined
      ? {
          budget: sanitizeRequestBudgetInput(
            patch.budget as z.infer<typeof requestBudgetInputSchema>,
          ),
        }
      : {}),
    ...(patch.deadline !== undefined
      ? {
          deadline: sanitizeRequestDeadlineInput(
            patch.deadline as z.infer<typeof requestDeadlineInputSchema>,
          ),
        }
      : {}),
    ...(inferredBudget ? { budget: inferredBudget } : {}),
  };
}

export function mergeRequestConstraintInputs({
  constraints,
  embodiedConstraints,
}: {
  constraints?: Record<string, unknown>;
  embodiedConstraints?: z.infer<typeof requestEmbodiedConstraintInputSchema>;
}): Record<string, unknown> | undefined {
  const nextConstraints: Record<string, unknown> = {
    ...(constraints ?? {}),
  };

  if (embodiedConstraints) {
    const executionModes = normalizeMaybeStringList(
      embodiedConstraints.executionModes,
    );
    if (executionModes.length > 0) {
      nextConstraints.executionModes =
        sanitizeExecutionModeInputs(executionModes);
    }

    if (embodiedConstraints.requiresHumanPresence !== undefined) {
      nextConstraints.requiresHumanPresence =
        embodiedConstraints.requiresHumanPresence;
    }

    if (embodiedConstraints.requiresLocalAccess !== undefined) {
      nextConstraints.requiresLocalAccess =
        embodiedConstraints.requiresLocalAccess;
    }

    if (embodiedConstraints.requiresVerifiedEvidence !== undefined) {
      nextConstraints.requiresVerifiedEvidence =
        embodiedConstraints.requiresVerifiedEvidence;
    }

    if (embodiedConstraints.requiresWitness !== undefined) {
      nextConstraints.requiresWitness = embodiedConstraints.requiresWitness;
    }

    if (hasConstraintText(embodiedConstraints.serviceLocation)) {
      nextConstraints.serviceLocation =
        embodiedConstraints.serviceLocation.trim();
    }

    const timeWindows = normalizeMaybeStringList(
      embodiedConstraints.timeWindows,
    );
    if (timeWindows.length > 0) {
      nextConstraints.timeWindows = normalizeConstraintStringList(timeWindows);
    }

    const accessRequirements = normalizeMaybeStringList(
      embodiedConstraints.accessRequirements,
    );
    if (accessRequirements.length > 0) {
      nextConstraints.accessRequirements =
        normalizeConstraintStringList(accessRequirements);
    }

    const safetyRequirements = normalizeMaybeStringList(
      embodiedConstraints.safetyRequirements,
    );
    if (safetyRequirements.length > 0) {
      nextConstraints.safetyRequirements =
        normalizeConstraintStringList(safetyRequirements);
    }

    const verificationRequirements = normalizeMaybeStringList(
      embodiedConstraints.verificationRequirements,
    );
    if (verificationRequirements.length > 0) {
      nextConstraints.verificationRequirements = normalizeFingerprintArray(
        verificationRequirements,
        [...borealRequestEvidenceClaimSchema.options],
      );
    }
  }

  return Object.keys(nextConstraints).length > 0 ? nextConstraints : undefined;
}

function sanitizeRequestSeekingInput(
  seeking: z.infer<typeof requestSeekingInputSchema> | undefined,
): RequestPatch["seeking"] | undefined {
  if (!seeking) {
    return undefined;
  }

  const actorKinds = normalizeRequestedActorKinds(
    normalizeMaybeStringList(seeking.actorKinds),
  );
  const supplyKinds = normalizeFingerprintArray(
    normalizeMaybeStringList(seeking.supplyKinds),
    [...borealSupplyKindSchema.options],
  );
  const teamMode = normalizeFingerprintValue(seeking.teamMode, [
    ...borealRequestTeamModeSchema.options,
  ]);
  const notes = normalizeLooseText(seeking.notes);

  if (
    actorKinds.length === 0 &&
    supplyKinds.length === 0 &&
    !teamMode &&
    !notes
  ) {
    return undefined;
  }

  return {
    ...(actorKinds.length > 0 ? { actorKinds } : {}),
    ...(supplyKinds.length > 0 ? { supplyKinds } : {}),
    ...(teamMode ? { teamMode } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function sanitizeRequestOutputKindsInput(
  outputKinds: z.infer<typeof requestOutputKindsInputSchema> | undefined,
): RequestOutputKind[] | undefined {
  const normalizedOutputKinds = normalizeFingerprintArray(
    normalizeMaybeStringList(outputKinds),
    [...borealOutputKindSchema.options],
  );

  return normalizedOutputKinds.length > 0 ? normalizedOutputKinds : undefined;
}

function sanitizeRequestBudgetInput(
  budget: z.infer<typeof requestBudgetInputSchema> | undefined,
): RequestBudget | undefined {
  if (!budget) {
    return undefined;
  }

  if (typeof budget === "string") {
    return inferBudgetFromText(`Budget ${budget.trim()}`);
  }

  const currency = budget.currency?.trim().toUpperCase() || undefined;
  const notes = budget.notes?.trim() || undefined;
  const explicitMode = budget.mode;
  const hasFixedAmount = typeof budget.fixedAmount === "number";
  const hasRangeAmounts =
    typeof budget.minAmount === "number" ||
    typeof budget.maxAmount === "number";
  const inferredMode = explicitMode
    ? explicitMode
    : hasRangeAmounts
      ? "range"
      : hasFixedAmount
        ? "fixed"
        : notes || currency
          ? "open"
          : undefined;

  if (!inferredMode) {
    return undefined;
  }

  return {
    mode: inferredMode,
    ...(currency ? { currency } : {}),
    ...(hasFixedAmount ? { fixedAmount: budget.fixedAmount } : {}),
    ...(typeof budget.minAmount === "number"
      ? { minAmount: budget.minAmount }
      : {}),
    ...(typeof budget.maxAmount === "number"
      ? { maxAmount: budget.maxAmount }
      : {}),
    ...(notes ? { notes } : {}),
  };
}

function sanitizeRequestDeadlineInput(
  deadline: z.infer<typeof requestDeadlineInputSchema> | undefined,
) {
  if (!deadline) {
    return undefined;
  }

  if (typeof deadline === "string") {
    const targetAt = deadline.trim();
    return targetAt ? { targetAt } : undefined;
  }

  const targetAt = deadline.targetAt?.trim() ?? "";
  const notes = deadline.notes?.trim() ?? "";

  if (!targetAt && !notes) {
    return undefined;
  }

  return {
    ...(targetAt ? { targetAt } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeRequestedActorKinds(
  actorKinds: string[] | undefined,
): RequestActorKind[] {
  if (!actorKinds) {
    return [];
  }

  const normalizedKinds = actorKinds
    .map((value) => mapLooseActorKind(value))
    .filter((value): value is RequestActorKind => value !== null);

  return Array.from(new Set(normalizedKinds));
}

function mapLooseActorKind(value: string): RequestActorKind | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized) {
    return null;
  }

  if (
    normalized === "tool" ||
    normalized.includes("provider") ||
    normalized.includes("api")
  ) {
    return "tool";
  }

  if (normalized === "runtime" || normalized.includes("desktop")) {
    return "runtime";
  }

  if (
    normalized === "organization" ||
    normalized.includes("agency") ||
    normalized.includes("company") ||
    normalized.includes("team") ||
    normalized.includes("organization")
  ) {
    return "organization";
  }

  if (
    normalized === "agent" ||
    normalized.includes("automation") ||
    normalized.includes("bot") ||
    normalized.includes("ai")
  ) {
    return "agent";
  }

  return "human";
}

function sanitizeExecutionModeInputs(
  executionModes: string[],
): RequestExecutionMode[] {
  const normalizedModes = executionModes
    .map((value) => mapLooseExecutionMode(value))
    .filter((value): value is RequestExecutionMode => value !== null);

  return Array.from(new Set(normalizedModes));
}

function mapLooseExecutionMode(value: string): RequestExecutionMode | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized) {
    return null;
  }

  switch (normalized) {
    case "remote":
    case "remote_digital":
    case "digital":
    case "async":
      return "remote_digital";
    case "remote_sync":
    case "live_remote":
    case "meeting":
    case "call":
      return "remote_sync";
    case "onsite":
    case "onsite_visit":
    case "on_site":
    case "in_person":
    case "site_visit":
    case "venue_visit":
      return "onsite_visit";
    case "field":
    case "field_inspection":
    case "inspection":
    case "inspect":
      return "field_inspection";
    case "pickup":
    case "dropoff":
    case "drop_off":
    case "pickup_dropoff":
    case "courier":
      return "pickup_dropoff";
    case "handoff":
    case "witness":
    case "witnessed_handoff":
    case "witnessed":
      return "witnessed_handoff";
    default:
      return null;
  }
}

function normalizeStringList(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

function normalizeMaybeStringList(
  value: string | string[] | undefined,
): string[] {
  if (typeof value === "string") {
    return normalizeStringList([value]);
  }

  return normalizeStringList(value);
}

function normalizeLooseText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function inferBudgetFromText(text: string): RequestBudget | undefined {
  if (!text || !/\bbudget\b/i.test(text)) {
    return undefined;
  }

  const normalizedText = text.replace(/,/g, "");

  const rangeMatch =
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s+between|\s*:)?\s*(?:\$|usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)?/i,
    ) ??
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s*:)?\s*between\s*(\d+(?:\.\d+)?)\s*and\s*(\d+(?:\.\d+)?)\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)/i,
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
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s*:)?\s*(\$)?\s*(\d+(?:\.\d+)?)\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)?/i,
    ) ??
    normalizedText.match(
      /\bbudget(?:\s+is|\s+of|\s+around|\s+about|\s*:)?\s*(usd|php|eur|gbp|jpy|aud|cad|sgd|hkd)\s*(\d+(?:\.\d+)?)/i,
    );

  if (fixedMatch) {
    const amount = Number(fixedMatch[2] ?? fixedMatch[1]);
    const currency = normalizeCurrencyCode(
      fixedMatch[3] ?? fixedMatch[1],
      normalizedText,
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
  text: string,
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

function normalizeConstraintStringList(values: string[]): string[] {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

function hasConstraintText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

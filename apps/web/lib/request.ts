import { z } from "zod";

export type RequestVisibility = "private" | "public";

export type RequestStatus =
  | "draft"
  | "open"
  | "funding_required"
  | "funded"
  | "in_progress"
  | "waiting_for_owner"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed";

export type RequestBudget =
  | {
      mode: "none" | "open";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    }
  | {
      mode: "fixed";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    }
  | {
      mode: "range";
      currency?: string;
      fixedAmount?: number;
      minAmount?: number;
      maxAmount?: number;
      notes?: string;
    };

export type RequestDeadline = {
  targetAt?: string;
  notes?: string;
};

export type RequestBrief = {
  title?: string;
  summary?: string;
  body?: string;
  constraints?: Record<string, unknown>;
  outputKinds?: string[];
  tags?: string[];
};

export type RequestReadinessState =
  | "collecting_brief"
  | "ready_to_open"
  | "ready_to_match";

export type RequestReadiness = {
  state: RequestReadinessState;
  summary: string;
  readyForOpen: boolean;
  readyForMatch: boolean;
};

export type RequestDerived = {
  routeFamily?: string;
  executionKind?: string;
  paymentMode?: string;
  matchingMode?: string;
  candidatePool?: string[];
  missingDetails: string[];
  readiness: RequestReadiness;
  routeSummary?: string;
};

export type BorealRequestDraft = {
  id: string;
  chatId: string;
  documentId: string;
  key: string;
  status: RequestStatus;
  visibility: RequestVisibility;
  createdById: string;
  ownerId: string;
  brief: RequestBrief;
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  derived: RequestDerived;
  createdAt: string;
  updatedAt: string;
};

export type EditableRequestDocument = {
  schemaVersion: 1;
  mode: "request_draft_input";
  visibility: RequestVisibility;
  brief: {
    title: string;
    summary: string;
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: string[];
    tags: string[];
  };
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
};

type RequestDocumentObject = {
  schemaVersion: 1;
  id: string;
  key: string;
  status: RequestStatus;
  createdBy: {
    kind: "human";
    id: string;
  };
  owner: {
    kind: "human";
    id: string;
  };
  visibility: RequestVisibility;
  brief: {
    title: string;
    summary: string;
    body: string;
    constraints: Record<string, unknown>;
    outputKinds: string[];
    tags: string[];
  };
  budget: RequestBudget | null;
  deadline: RequestDeadline | null;
  derived: {
    routeFamily: string | null;
    executionKind: string | null;
    paymentMode: string | null;
    matchingMode: string | null;
    candidatePool: string[];
    missingDetails: string[];
    readiness: RequestReadiness;
    routeSummary: string | null;
  };
  parallelFulfillmentAllowed: false;
  createdAt: string;
  updatedAt: string;
};

export type RequestPatch = {
  status?: RequestStatus;
  visibility?: RequestVisibility;
  brief?: Partial<RequestBrief>;
  budget?: RequestBudget | null;
  deadline?: RequestDeadline | null;
  derived?: Partial<Omit<RequestDerived, "missingDetails" | "readiness">>;
};

const requestBudgetSchema = z.union([
  z.object({
    mode: z.literal("none"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    mode: z.literal("open"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    mode: z.literal("fixed"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    mode: z.literal("range"),
    currency: z.string().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    notes: z.string().optional(),
  }),
]);

const requestDeadlineSchema = z.object({
  targetAt: z.string().optional(),
  notes: z.string().optional(),
});

const requestBriefSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  body: z.string().optional(),
  constraints: z.record(z.unknown()).optional(),
  outputKinds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const editableRequestDocumentSchema = z
  .object({
    schemaVersion: z.number().optional(),
    mode: z.string().optional(),
    visibility: z.enum(["private", "public"]).optional(),
    brief: requestBriefSchema.optional(),
    budget: requestBudgetSchema.nullish(),
    deadline: requestDeadlineSchema.nullish(),
  })
  .passthrough();

export function createInitialRequestDraft({
  id,
  chatId,
  documentId,
  userId,
  visibility,
  createdAt,
}: {
  id: string;
  chatId: string;
  documentId: string;
  userId: string;
  visibility: RequestVisibility;
  createdAt: string;
}): BorealRequestDraft {
  const baseDraft: BorealRequestDraft = {
    id,
    chatId,
    documentId,
    key: slugifyRequestKey("", id),
    status: "draft",
    visibility,
    createdById: userId,
    ownerId: userId,
    brief: {
      title: "",
      summary: "",
      body: "",
      constraints: {},
      outputKinds: [],
      tags: [],
    },
    budget: null,
    deadline: null,
    derived: {
      candidatePool: [],
      missingDetails: [],
      readiness: {
        state: "collecting_brief",
        summary: "",
        readyForOpen: false,
        readyForMatch: false,
      },
    },
    createdAt,
    updatedAt: createdAt,
  };

  return {
    ...baseDraft,
    derived: deriveRequestState(baseDraft),
  };
}

export function applyRequestPatch(
  currentDraft: BorealRequestDraft,
  patch: RequestPatch,
  updatedAt: string
): BorealRequestDraft {
  const nextBrief: RequestBrief = {
    ...currentDraft.brief,
    ...patch.brief,
    constraints:
      patch.brief?.constraints === undefined
        ? (currentDraft.brief.constraints ?? {})
        : patch.brief.constraints,
    outputKinds:
      patch.brief?.outputKinds === undefined
        ? (currentDraft.brief.outputKinds ?? [])
        : patch.brief.outputKinds,
    tags:
      patch.brief?.tags === undefined
        ? (currentDraft.brief.tags ?? [])
        : patch.brief.tags,
  };

  const nextDraft: BorealRequestDraft = {
    ...currentDraft,
    status: patch.status ?? currentDraft.status,
    visibility: patch.visibility ?? currentDraft.visibility,
    brief: nextBrief,
    budget: patch.budget === undefined ? currentDraft.budget : patch.budget,
    deadline:
      patch.deadline === undefined ? currentDraft.deadline : patch.deadline,
    updatedAt,
    key: slugifyRequestKey(nextBrief.title, currentDraft.id),
    derived: {
      ...currentDraft.derived,
      ...patch.derived,
      candidatePool:
        patch.derived?.candidatePool === undefined
          ? (currentDraft.derived.candidatePool ?? [])
          : patch.derived.candidatePool,
    },
  };

  return {
    ...nextDraft,
    derived: deriveRequestState(nextDraft),
  };
}

export function deriveRequestState(
  draft: Pick<BorealRequestDraft, "brief" | "budget" | "deadline" | "derived">
): RequestDerived {
  const missingDetails: string[] = [];

  if (!hasText(draft.brief.title)) {
    missingDetails.push("title");
  }

  if (!hasText(draft.brief.summary)) {
    missingDetails.push("summary");
  }

  if (!hasText(draft.brief.body)) {
    missingDetails.push("body");
  }

  if (draft.budget?.mode === "fixed") {
    if (!draft.budget.currency || draft.budget.fixedAmount == null) {
      missingDetails.push("budget");
    }
  }

  if (draft.budget?.mode === "range") {
    if (
      !draft.budget.currency ||
      draft.budget.minAmount == null ||
      draft.budget.maxAmount == null
    ) {
      missingDetails.push("budget");
    }
  }

  const hasBriefCore =
    hasText(draft.brief.title) &&
    hasText(draft.brief.summary) &&
    hasText(draft.brief.body);
  const hasRouteReadiness =
    hasText(draft.derived.routeFamily) && hasText(draft.derived.routeSummary);

  const readiness: RequestReadiness = hasBriefCore
    ? hasRouteReadiness
      ? {
          state: "ready_to_match",
          summary:
            "Core briefing is present and Boreal has a route summary ready for matching.",
          readyForOpen: true,
          readyForMatch: true,
        }
      : {
          state: "ready_to_open",
          summary:
            "Core briefing is present. This request can be opened now and refined further before matching.",
          readyForOpen: true,
          readyForMatch: false,
        }
    : {
        state: "collecting_brief",
        summary:
          "Keep briefing the request. Boreal still needs the core title, summary, and body.",
        readyForOpen: false,
        readyForMatch: false,
      };

  return {
    ...draft.derived,
    candidatePool: draft.derived.candidatePool ?? [],
    missingDetails,
    readiness,
  };
}

export function renderRequestObjectJson(draft: BorealRequestDraft): string {
  return JSON.stringify(toRequestDocumentObject(draft), null, 2);
}

export function renderEditableRequestDocumentJson(
  draft: BorealRequestDraft
): string {
  return JSON.stringify(toEditableRequestDocument(draft), null, 2);
}

export function renderRequestDocumentJson(draft: BorealRequestDraft): string {
  return draft.status === "draft"
    ? renderEditableRequestDocumentJson(draft)
    : renderRequestObjectJson(draft);
}

export function extractEditableRequestPatchFromContent(
  content: string
): Pick<RequestPatch, "visibility" | "brief" | "budget" | "deadline"> {
  const parsed = editableRequestDocumentSchema.parse(JSON.parse(content));

  return {
    visibility: parsed.visibility,
    brief: normalizeEditableBrief(parsed.brief),
    budget: normalizeBudget(parsed.budget),
    deadline: normalizeDeadline(parsed.deadline),
  };
}

export function getRequestTitle(draft: Pick<BorealRequestDraft, "brief">) {
  return normalizeText(draft.brief.title) || "Untitled request";
}

export function slugifyRequestKey(title: string | undefined, id: string): string {
  const slug = (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `request-${id.slice(0, 8)}`;
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

function normalizeEditableBrief(
  brief: z.infer<typeof requestBriefSchema> | undefined
): RequestBrief {
  return {
    title: normalizeText(brief?.title),
    summary: normalizeText(brief?.summary),
    body: normalizeText(brief?.body),
    constraints: normalizeRecord(brief?.constraints),
    outputKinds: normalizeStringArray(brief?.outputKinds),
    tags: normalizeStringArray(brief?.tags),
  };
}

function normalizeBudget(
  budget: z.infer<typeof requestBudgetSchema> | null | undefined
): RequestBudget | null {
  if (!budget) {
    return null;
  }

  const currency = normalizeText(budget.currency)?.toUpperCase();
  const notes = normalizeText(budget.notes);
  const fixedAmount = normalizeNumber(budget.fixedAmount);
  const minAmount = normalizeNumber(budget.minAmount);
  const maxAmount = normalizeNumber(budget.maxAmount);

  switch (budget.mode) {
    case "none":
      return {
        mode: "none",
        ...(notes ? { notes } : {}),
      };
    case "open":
      return {
        mode: "open",
        ...(currency ? { currency } : {}),
        ...(notes ? { notes } : {}),
      };
    case "fixed":
      return {
        mode: "fixed",
        ...(currency ? { currency } : {}),
        ...(fixedAmount !== undefined ? { fixedAmount } : {}),
        ...(notes ? { notes } : {}),
      };
    case "range":
      return {
        mode: "range",
        ...(currency ? { currency } : {}),
        ...(minAmount !== undefined ? { minAmount } : {}),
        ...(maxAmount !== undefined ? { maxAmount } : {}),
        ...(notes ? { notes } : {}),
      };
  }
}

function normalizeDeadline(
  deadline: z.infer<typeof requestDeadlineSchema> | null | undefined
): RequestDeadline | null {
  if (!deadline) {
    return null;
  }

  const targetAt = normalizeText(deadline.targetAt);
  const notes = normalizeText(deadline.notes);

  if (!targetAt && !notes) {
    return null;
  }

  return {
    ...(targetAt ? { targetAt } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function normalizeRecord(
  value: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!value || Array.isArray(value)) {
    return {};
  }

  return value;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(value.map((entry) => entry.trim()).filter(Boolean))
  );
}

function normalizeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function toEditableRequestDocument(
  draft: BorealRequestDraft
): EditableRequestDocument {
  return {
    schemaVersion: 1,
    mode: "request_draft_input",
    visibility: draft.visibility,
    brief: {
      title: draft.brief.title ?? "",
      summary: draft.brief.summary ?? "",
      body: draft.brief.body ?? "",
      constraints: draft.brief.constraints ?? {},
      outputKinds: draft.brief.outputKinds ?? [],
      tags: draft.brief.tags ?? [],
    },
    budget: draft.budget,
    deadline: draft.deadline,
  };
}

function toRequestDocumentObject(
  draft: BorealRequestDraft
): RequestDocumentObject {
  return {
    schemaVersion: 1,
    id: draft.id,
    key: draft.key,
    status: draft.status,
    createdBy: {
      kind: "human",
      id: draft.createdById,
    },
    owner: {
      kind: "human",
      id: draft.ownerId,
    },
    visibility: draft.visibility,
    brief: {
      title: draft.brief.title ?? "",
      summary: draft.brief.summary ?? "",
      body: draft.brief.body ?? "",
      constraints: draft.brief.constraints ?? {},
      outputKinds: draft.brief.outputKinds ?? [],
      tags: draft.brief.tags ?? [],
    },
    budget: draft.budget,
    deadline: draft.deadline,
    derived: {
      routeFamily: draft.derived.routeFamily ?? null,
      executionKind: draft.derived.executionKind ?? null,
      paymentMode: draft.derived.paymentMode ?? null,
      matchingMode: draft.derived.matchingMode ?? null,
      candidatePool: draft.derived.candidatePool ?? [],
      missingDetails: draft.derived.missingDetails,
      readiness: draft.derived.readiness,
      routeSummary: draft.derived.routeSummary ?? null,
    },
    parallelFulfillmentAllowed: false,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

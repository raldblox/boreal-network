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

export type RequestPatch = {
  status?: RequestStatus;
  visibility?: RequestVisibility;
  brief?: Partial<RequestBrief>;
  budget?: RequestBudget | null;
  deadline?: RequestDeadline | null;
  derived?: Partial<Omit<RequestDerived, "missingDetails" | "readiness">>;
};

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

export function renderRequestBriefMarkdown(draft: BorealRequestDraft): string {
  const lines = [
    `# ${draft.brief.title?.trim() || "Untitled request"}`,
    "",
    `Status: ${formatLabel(draft.status)}`,
    `Visibility: ${formatLabel(draft.visibility)}`,
    `Readiness: ${formatLabel(draft.derived.readiness.state)}`,
    "",
    "## Summary",
    "",
    draft.brief.summary?.trim() || "_Still drafting the summary._",
    "",
    "## Body",
    "",
    draft.brief.body?.trim() || "_Still drafting the full brief body._",
    "",
    "## Constraints",
    "",
    renderConstraintBlock(draft),
    "",
    "## Budget and timing",
    "",
    renderBudgetAndTiming(draft),
    "",
    "## Route summary",
    "",
    renderRouteSummary(draft),
    "",
    "## Missing details",
    "",
    renderMissingDetails(draft),
  ];

  return lines.join("\n");
}

export function slugifyRequestKey(title: string | undefined, id: string): string {
  const slug = (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `request-${id.slice(0, 8)}`;
}

function renderConstraintBlock(draft: BorealRequestDraft): string {
  const lines: string[] = [];

  const outputKinds = draft.brief.outputKinds ?? [];
  if (outputKinds.length > 0) {
    lines.push(`- Output kinds: ${outputKinds.join(", ")}`);
  }

  const tags = draft.brief.tags ?? [];
  if (tags.length > 0) {
    lines.push(`- Tags: ${tags.join(", ")}`);
  }

  const constraints = draft.brief.constraints ?? {};
  const constraintEntries = Object.entries(constraints);
  for (const [key, value] of constraintEntries) {
    lines.push(`- ${formatLabel(key)}: ${formatConstraintValue(value)}`);
  }

  if (lines.length === 0) {
    return "_No explicit constraints yet._";
  }

  return lines.join("\n");
}

function renderBudgetAndTiming(draft: BorealRequestDraft): string {
  const lines: string[] = [];

  if (draft.budget) {
    lines.push(`- Budget mode: ${formatLabel(draft.budget.mode)}`);

    if (draft.budget.mode === "fixed" && draft.budget.fixedAmount != null) {
      lines.push(
        `- Budget: ${draft.budget.currency ?? "USD"} ${draft.budget.fixedAmount}`
      );
    }

    if (
      draft.budget.mode === "range" &&
      draft.budget.minAmount != null &&
      draft.budget.maxAmount != null
    ) {
      lines.push(
        `- Budget range: ${draft.budget.currency ?? "USD"} ${draft.budget.minAmount} to ${draft.budget.maxAmount}`
      );
    }

    if (hasText(draft.budget.notes)) {
      lines.push(`- Budget notes: ${draft.budget.notes}`);
    }
  }

  if (draft.deadline?.targetAt) {
    lines.push(`- Deadline: ${draft.deadline.targetAt}`);
  }

  if (hasText(draft.deadline?.notes)) {
    lines.push(`- Timing notes: ${draft.deadline?.notes}`);
  }

  if (lines.length === 0) {
    return "_Budget and timing are still open._";
  }

  return lines.join("\n");
}

function renderRouteSummary(draft: BorealRequestDraft): string {
  const lines: string[] = [];

  if (hasText(draft.derived.routeSummary)) {
    lines.push(draft.derived.routeSummary as string);
  }

  if (hasText(draft.derived.routeFamily)) {
    lines.push(
      `- Route family: ${formatLabel(draft.derived.routeFamily as string)}`
    );
  }

  if (hasText(draft.derived.executionKind)) {
    lines.push(
      `- Execution kind: ${formatLabel(draft.derived.executionKind as string)}`
    );
  }

  if (hasText(draft.derived.paymentMode)) {
    lines.push(
      `- Payment mode: ${formatLabel(draft.derived.paymentMode as string)}`
    );
  }

  if (hasText(draft.derived.matchingMode)) {
    lines.push(
      `- Matching mode: ${formatLabel(draft.derived.matchingMode as string)}`
    );
  }

  if ((draft.derived.candidatePool ?? []).length > 0) {
    lines.push(
      `- Candidate pool: ${(draft.derived.candidatePool ?? []).join(", ")}`
    );
  }

  if (lines.length === 0) {
    return "_Routing has not been summarized yet._";
  }

  return lines.join("\n");
}

function renderMissingDetails(draft: BorealRequestDraft): string {
  if (draft.derived.missingDetails.length === 0) {
    return "_No blocking missing details right now._";
  }

  return draft.derived.missingDetails
    .map((detail) => `- ${formatLabel(detail)}`)
    .join("\n");
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

function formatConstraintValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  BorealRequestDraft,
  RequestBudget,
  RequestDeadline,
  RequestStatus,
} from "@/lib/request";

type RequestBriefingPanelProps = {
  request: BorealRequestDraft | null;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  isRequestMode: boolean;
  onSaveDraft: () => Promise<void>;
  onOpenRequest: () => Promise<void>;
  onOpenDocument: () => void;
};

export function RequestBriefingPanel({
  request,
  isReadonly,
  isArtifactVisible,
  isRequestMode,
  onSaveDraft,
  onOpenRequest,
  onOpenDocument,
}: RequestBriefingPanelProps) {
  if (isReadonly) {
    return null;
  }

  if (!request) {
    return null;
  }

  if (request.status !== "draft") {
    const title = request.brief.title?.trim() || "Untitled request";
    const summary =
      request.latest.summary?.trim() ||
      request.derived.routeSummary?.trim() ||
      request.derived.readiness.summary ||
      "This request is active in Boreal.";
    const budget = formatBudgetSummary(request.budget);
    const deadline = formatDeadlineSummary(request.deadline);
    const statusLabel = request.status.replace(/_/g, " ");
    const currentStepIndex = getTrackingStepIndex(request.status);
    const nextStepLabel = getNextStepLabel(request.status);

    return (
      <div className="border-b border-border/50 bg-background/95 px-4 py-2.5">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate font-medium text-sm">{title}</div>
                <Badge className="rounded-full" variant="secondary">
                  {statusLabel}
                </Badge>
                <Badge className="rounded-full" variant="secondary">
                  Next: {nextStepLabel}
                </Badge>
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                {summary}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full" variant="secondary">
                {budget}
              </Badge>
              <Badge className="rounded-full" variant="secondary">
                {deadline}
              </Badge>
              <Button onClick={onOpenDocument} variant="outline">
                {isArtifactVisible ? "Focus raw object" : "View raw object"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {TRACKING_STEPS.map((step, index) => {
              const isDone = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  className={[
                    "rounded-xl border px-2 py-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] transition-colors",
                    isCurrent
                      ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
                      : isDone
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-border/50 bg-background/70 text-muted-foreground",
                  ].join(" ")}
                  key={step}
                >
                  {step}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const canOpenRequest =
    request.status === "draft" && request.derived.readiness.readyForOpen;
  const title = request.brief.title?.trim() || "Untitled request";
  const missingDetails = request.derived.missingDetails;
  const summary =
    missingDetails.length > 0
      ? `Missing: ${missingDetails.map((detail) => detail.replace(/_/g, " ")).join(", ")}`
      : "Use chat or the draft object to finish the brief before you open this request.";

  return (
    <div className="border-b border-border/50 bg-background/95 px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate font-medium text-sm">{title}</div>
            <Badge className="rounded-full" variant="secondary">
              Draft
            </Badge>
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">{summary}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onOpenDocument} variant="outline">
            {isArtifactVisible ? "Focus object" : "Show object"}
          </Button>
          <Button onClick={onSaveDraft} variant="outline">
            Save draft
          </Button>
          <Button disabled={!canOpenRequest} onClick={onOpenRequest}>
            Open request
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatBudgetSummary(budget: RequestBudget | null) {
  if (!budget) {
    return "Budget unset";
  }

  if (budget.mode === "fixed" && budget.fixedAmount != null) {
    return `${budget.currency ?? ""} ${budget.fixedAmount}`.trim();
  }

  if (
    budget.mode === "range" &&
    (budget.minAmount != null || budget.maxAmount != null)
  ) {
    return `${budget.currency ?? ""} ${budget.minAmount ?? "?"}-${budget.maxAmount ?? "?"}`.trim();
  }

  if (budget.mode === "open") {
    return "Open budget";
  }

  if (budget.mode === "none") {
    return "No budget";
  }

  return "Budget set";
}

function formatDeadlineSummary(deadline: RequestDeadline | null) {
  if (!deadline?.targetAt) {
    return "No deadline";
  }

  const target = new Date(deadline.targetAt);
  if (Number.isNaN(target.getTime())) {
    return "Deadline set";
  }

  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TRACKING_STEPS = [
  "Brief",
  "Open",
  "Funding",
  "Work",
  "Delivery",
  "Resolved",
] as const;

function getTrackingStepIndex(status: RequestStatus) {
  switch (status) {
    case "open":
      return 1;
    case "funding_required":
    case "funded":
      return 2;
    case "in_progress":
    case "waiting_for_owner":
      return 3;
    case "delivered":
      return 4;
    case "completed":
    case "cancelled":
    case "failed":
      return 5;
    case "draft":
    default:
      return 0;
  }
}

function getNextStepLabel(status: RequestStatus) {
  switch (status) {
    case "open":
      return "Funding or work start";
    case "funding_required":
      return "Fund request";
    case "funded":
      return "Start work";
    case "in_progress":
      return "Deliver work";
    case "waiting_for_owner":
      return "Owner response";
    case "delivered":
      return "Resolve request";
    case "completed":
      return "Closed";
    case "cancelled":
      return "Closed";
    case "failed":
      return "Recover or replace route";
    case "draft":
    default:
      return "Finish brief";
  }
}

"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  onSaveDraft,
  onOpenRequest,
  onOpenDocument,
}: RequestBriefingPanelProps) {
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isOpeningRequest, setIsOpeningRequest] = useState(false);

  if (isReadonly || !request) {
    return null;
  }

  if (request.status !== "draft") {
    const title = request.brief.title?.trim() || "Untitled request";

    return (
      <div className="border-b border-border/50 bg-background/95 px-4 py-2.5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <div className="mr-2 truncate font-medium text-sm md:text-[15px]">
            {title}
          </div>
          <Badge
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
              getRequestStatusBadgeClassName(request.status)
            )}
            variant="secondary"
          >
            {request.status.replace(/_/g, " ")}
          </Badge>
          <Badge
            className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground"
            variant="secondary"
          >
            {formatBudgetSummary(request.budget)}
          </Badge>
          <Badge
            className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground"
            variant="secondary"
          >
            {formatDeadlineSummary(request.deadline)}
          </Badge>
          <Badge
            className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground"
            variant="secondary"
          >
            {request.visibility}
          </Badge>
          {request.derived.routeFamily ? (
            <Badge
              className="rounded-full border border-border/60 bg-background/80 text-[11px] text-muted-foreground"
              variant="secondary"
            >
              {request.derived.routeFamily.replace(/_/g, " ")}
            </Badge>
          ) : null}
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
          <Button
            disabled={isSavingDraft || isOpeningRequest}
            onClick={() => {
              setIsSavingDraft(true);
              void onSaveDraft().finally(() => {
                setIsSavingDraft(false);
              });
            }}
            variant="outline"
          >
            {isSavingDraft ? (
              <>
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save draft"
            )}
          </Button>
          <Button
            disabled={!canOpenRequest || isSavingDraft || isOpeningRequest}
            onClick={() => {
              setIsOpeningRequest(true);
              void onOpenRequest().finally(() => {
                setIsOpeningRequest(false);
              });
            }}
          >
            {isOpeningRequest ? (
              <>
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                Opening...
              </>
            ) : (
              "Open request"
            )}
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

function getRequestStatusBadgeClassName(status: RequestStatus) {
  switch (status) {
    case "draft":
      return "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300";
    case "open":
    case "in_progress":
      return "border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300";
    case "funding_required":
    case "waiting_for_owner":
      return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    case "funded":
    case "completed":
      return "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "delivered":
      return "border-violet-300/70 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300";
    case "failed":
      return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
    case "cancelled":
      return "border-zinc-400/70 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/10 dark:text-zinc-300";
    default:
      return "border-border/60 bg-background/70 text-foreground";
  }
}

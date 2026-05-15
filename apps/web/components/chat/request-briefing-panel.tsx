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
} from "@/lib/request";
import { RequestPlanPanel } from "./request-plan-panel";

type RequestBriefingPanelProps = {
  request: BorealRequestDraft | null;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  isRequestMode: boolean;
  isStartingRequest: boolean;
  onSaveDraft: () => Promise<void>;
  onOpenRequest: () => Promise<void>;
  onOpenDocument: () => void;
  requestPromptOptimizerEnabled: boolean;
  onSetRequestPromptOptimizerEnabled: (enabled: boolean) => void;
};

export function RequestBriefingPanel({
  request,
  isReadonly,
  isArtifactVisible,
  isRequestMode,
  isStartingRequest,
  onSaveDraft,
  onOpenRequest,
  onOpenDocument,
  requestPromptOptimizerEnabled,
  onSetRequestPromptOptimizerEnabled,
}: RequestBriefingPanelProps) {
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isOpeningRequest, setIsOpeningRequest] = useState(false);

  if (isReadonly || (!request && !isRequestMode)) {
    return null;
  }

  const optimizerToggle = (
    <Button
      aria-pressed={requestPromptOptimizerEnabled}
      className={cn(
        "rounded-full px-3.5",
        requestPromptOptimizerEnabled ? undefined : "bg-background"
      )}
      data-testid="request-prompt-optimizer-toggle"
      onClick={() =>
        onSetRequestPromptOptimizerEnabled(!requestPromptOptimizerEnabled)
      }
      size="sm"
      type="button"
      variant={requestPromptOptimizerEnabled ? "default" : "outline"}
    >
      {requestPromptOptimizerEnabled
        ? "Brief assist on"
        : "Brief assist off"}
    </Button>
  );

  if (!request) {
    return (
      <div className="border-b border-border/50 bg-background/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">Start request</div>
            <div className="text-[13px] leading-6 text-muted-foreground">
              {isStartingRequest
                ? "Starting the request and opening the brief now."
                : "Your first message opens the request thread. Use assist when a rough ask needs help turning into a clear brief."}
            </div>
            {isStartingRequest ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" />
                <span>Creating request draft...</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">{optimizerToggle}</div>
        </div>
      </div>
    );
  }

  if (request.status !== "draft") {
    const title = request.brief.title?.trim() || "Untitled request";
    const planningNote = getRequestPlanningNote(request);
    const requestFacts = [
      request.status.replace(/_/g, " "),
      formatBudgetSummary(request.budget),
      formatDeadlineSummary(request.deadline),
      request.visibility,
      request.derived.routeFamily
        ? request.derived.routeFamily.replace(/_/g, " ")
        : null,
    ].filter((fact): fact is string => Boolean(fact));

    return (
      <div className="bg-background/92 px-3 pb-0 pt-3 backdrop-blur-xl md:px-4">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-border/60 bg-background/94 px-5 py-5 shadow-[0_14px_45px_rgba(15,23,42,0.04)] md:px-6">
            <div className="min-w-0 space-y-2">
              <div className="text-lg font-medium tracking-tight md:text-[22px]">
                {title}
              </div>
              <div className="text-sm leading-7 text-muted-foreground md:text-[15px]">
                {planningNote ||
                  "Boreal keeps the route, delivery, and final resolution attached to this request."}
              </div>
              {requestFacts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                  {requestFacts.map((fact) => (
                    <span key={fact}>{fact}</span>
                  ))}
                </div>
              ) : null}
            </div>
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
      ? `Still needed: ${missingDetails.map((detail) => detail.replace(/_/g, " ")).join(", ")}.`
      : "The brief is ready. Open the request when you want routing, replies, and durable activity to begin.";
  const planningFacts = getDraftPlanningFacts(request);

  return (
    <div className="border-b border-border/50 bg-background/92 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-medium md:text-[15px]">
                {title}
              </div>
              <Badge className="rounded-full" variant="secondary">
                Draft
              </Badge>
            </div>
            <div className="text-[13px] leading-6 text-muted-foreground">
              {summary}
            </div>
            {planningFacts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                {planningFacts.map((fact) => (
                  <span key={fact}>{fact}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {optimizerToggle}
            <Button onClick={onOpenDocument} variant="outline">
              {isArtifactVisible ? "Focus brief" : "Open brief"}
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

        <RequestPlanPanel request={request} scope="draft" />
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

function getDraftPlanningFacts(request: BorealRequestDraft) {
  const hasStructuredPlan = hasStructuredRequestPlan(request);
  const shouldShowExecution =
    hasStructuredPlan ||
    request.derived.embodiedConstraintSet.requiresEmbodiedHandling ||
    request.derived.verificationPlan.requiredEvidenceClaims.length > 0 ||
    request.derived.clarificationNeeded.required;

  const facts = [
    hasStructuredPlan && request.derived.leadRole
      ? `Lead: ${request.derived.roleSlots.find((slot) => slot.roleKey === request.derived.leadRole)?.title ?? request.derived.leadRole.replace(/_/g, " ")}`
      : null,
    shouldShowExecution ? `Execution: ${formatExecutionSummary(request)}` : null,
    hasStructuredPlan && request.derived.phases.length > 0
      ? `${request.derived.phases.length} planned step${request.derived.phases.length === 1 ? "" : "s"}`
      : null,
    getServiceLocationSummary(request),
    getVerificationSummary(request),
    request.derived.clarificationNeeded.required
      ? `Blocked by ${request.derived.clarificationNeeded.missingDetails
          .map((detail) => detail.replace(/_/g, " "))
          .join(", ")}`
      : null,
  ].filter((fact): fact is string => Boolean(fact));

  return facts;
}

function getRequestPlanningNote(request: BorealRequestDraft) {
  const notes = [
    `Execution: ${formatExecutionSummary(request)}`,
    getServiceLocationSummary(request),
    getVerificationSummary(request),
    request.derived.clarificationNeeded.required
      ? `Clarification still needed for ${request.derived.clarificationNeeded.missingDetails
          .map((detail) => detail.replace(/_/g, " "))
          .join(", ")}.`
      : null,
  ].filter((note): note is string => Boolean(note));

  return notes.join(" ");
}

function formatExecutionSummary(request: BorealRequestDraft) {
  const executionModes = request.derived.executionProfile.executionModes;
  if (!executionModes.length) {
    return "execution mode unresolved";
  }

  return executionModes.map((mode) => mode.replace(/_/g, " ")).join(", ");
}

function hasStructuredRequestPlan(request: BorealRequestDraft) {
  return (
    Boolean(request.derived.leadRole) ||
    request.derived.roleSlots.length > 0 ||
    request.derived.phases.length > 0
  );
}

function getServiceLocationSummary(request: BorealRequestDraft) {
  const serviceLocation =
    request.derived.embodiedConstraintSet.serviceLocation?.trim();

  return serviceLocation ? `Location: ${serviceLocation}` : null;
}

function getVerificationSummary(request: BorealRequestDraft) {
  const evidenceClaims = request.derived.verificationPlan.requiredEvidenceClaims;

  if (evidenceClaims.length === 0) {
    return null;
  }

  return `Proof: ${evidenceClaims
    .map((claim) => claim.replace(/_/g, " "))
    .join(", ")}`;
}

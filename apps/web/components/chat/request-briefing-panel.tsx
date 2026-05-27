"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBorealWorkerKeyFromSupply,
  getBorealWorkerStarter,
} from "@/lib/boreal-workers/starter-catalog";
import type { BorealSupplyDraft } from "@/lib/supply";
import { cn, fetcher } from "@/lib/utils";
import type {
  BorealRequestDraft,
  RequestBudget,
  RequestDeadline,
} from "@/lib/request";
import { LoadingButton } from "./loading-button";

type RequestBriefingPanelProps = {
  request: BorealRequestDraft | null;
  isReadonly: boolean;
  isRequestMode: boolean;
  isLoading: boolean;
  isStartingRequest: boolean;
  openedRequestControls?: React.ReactNode;
  onSaveDraft: () => Promise<void>;
  requestPromptOptimizerEnabled: boolean;
  onSetRequestPromptOptimizerEnabled: (enabled: boolean) => void;
};

export function RequestBriefingPanel({
  request,
  isReadonly,
  isRequestMode,
  isLoading,
  isStartingRequest,
  openedRequestControls,
  onSaveDraft,
  requestPromptOptimizerEnabled,
  onSetRequestPromptOptimizerEnabled,
}: RequestBriefingPanelProps) {
  const [isSavingDraft, startSaveDraftTransition] = useTransition();
  const searchParams = useSearchParams();
  const selectedSupplyId =
    request?.routing.preferredSupplyId ??
    (isRequestMode ? searchParams.get("preferredSupplyId") : null);
  const selectedSupplyKey = selectedSupplyId
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies/${selectedSupplyId}`
    : null;
  const { data: selectedSupplyData } = useSWR<{ supply: BorealSupplyDraft }>(
    selectedSupplyKey,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );
  const selectedSupply = selectedSupplyData?.supply ?? null;

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
        ? "Preflight assist on"
        : "Preflight assist off"}
    </Button>
  );

  if (!request) {
    if (isLoading) {
      return null;
    }

    return (
      <div className="border-b border-border/50 bg-background/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">Request Preflight</div>
            <div className="text-[13px] leading-6 text-muted-foreground">
              {isStartingRequest
                ? selectedSupply
                  ? `Starting Request Preflight and pinning ${getSelectedSupplyLabel(selectedSupply)} now.`
                  : "Starting Request Preflight now."
                : selectedSupply
                  ? `${getSelectedSupplyLabel(selectedSupply)} is pinned as service or supply context. Add the ask, done condition, constraints, budget, deadline, proof, and whether human or local runtime work matters.`
                  : "Your first message starts Request Preflight. Add the ask, done condition, constraints, budget, deadline, proof, and any human or local runtime requirements."}
            </div>
            {isStartingRequest ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" />
                <span>Creating Request Preflight...</span>
              </div>
            ) : null}
            {selectedSupply ? (
              <PinnedSupplyBanner supply={selectedSupply} />
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
      <div className="sticky top-0 z-30 bg-background/92 px-4 pb-0 pt-4 backdrop-blur-xl md:px-6 md:pt-5">
        <div className="mx-auto max-w-[96rem] border-b border-border/60 pb-5 md:pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-[58rem] space-y-2">
              <div className="text-[34px] leading-none tracking-[-0.03em] [font-family:var(--font-display)] md:text-[48px]">
                {title}
              </div>
              <div className="text-[13px] leading-6 text-muted-foreground md:text-[14px]">
                {planningNote ||
                  "Boreal keeps the route, delivery, and final resolution attached to this request."}
              </div>
            </div>

            {requestFacts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/78 lg:max-w-[22rem] lg:justify-end lg:text-right">
                {requestFacts.map((fact) => (
                  <span key={fact}>{fact}</span>
                ))}
              </div>
            ) : null}
          </div>
          {openedRequestControls ? (
            <div className="mt-5">{openedRequestControls}</div>
          ) : null}
        </div>
      </div>
    );
  }

  const title = request.brief.title?.trim() || "Untitled request";

  return (
    <div className="border-b border-border/50 bg-background/92 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full" variant="secondary">
                Preflight draft
              </Badge>
              <div className="truncate text-sm font-medium md:text-[15px]">
                {title}
              </div>
            </div>
            <div className="mt-2 text-[13px] leading-6 text-muted-foreground">
              Buyer-owned inputs stay explicit. Boreal can derive routing and
              plan structure after the ask, done condition, constraints, budget,
              deadline, and proof are legible.
            </div>
            {selectedSupply ? (
              <div className="mt-3">
                <PinnedSupplyBanner supply={selectedSupply} />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {optimizerToggle}
            <LoadingButton
              isLoading={isSavingDraft}
              loadingText="Saving..."
              onClick={() => {
                startSaveDraftTransition(async () => {
                  await onSaveDraft();
                });
              }}
              variant="outline"
            >
              Save draft
            </LoadingButton>
          </div>
        </div>

        <PreflightChecklist request={request} selectedSupply={selectedSupply} />
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

function PinnedSupplyBanner({ supply }: { supply: BorealSupplyDraft }) {
  const workerStarter = getBorealWorkerStarterForSupply(supply);

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/[0.18] px-3.5 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
        Pinned service / supply context
      </div>
      <div className="mt-1.5 text-sm font-medium text-foreground">
        {getSelectedSupplyLabel(supply)}
      </div>
      <div className="mt-1 text-[13px] leading-6 text-muted-foreground">
        {supply.profile.summary?.trim() ||
          "This supply stays pinned on the request while you shape the brief."}
      </div>
      <div className="mt-1 text-[12px] leading-5.5 text-muted-foreground">
        Pinned supply narrows the route. It does not skip safety, proof,
        approval, funding, or owner acceptance.
      </div>
      {workerStarter ? (
        <div className="mt-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
            Shape this lane
          </div>
          <div className="mt-1 text-[13px] leading-6 text-foreground">
            Your next message becomes the buyer-owned ask for this pinned
            service or supply context.
          </div>
          <div className="mt-1 text-[12px] leading-5.5 text-muted-foreground">
            Example: {workerStarter.tryPrompt}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreflightChecklist({
  request,
  selectedSupply,
}: {
  request: BorealRequestDraft;
  selectedSupply: BorealSupplyDraft | null;
}) {
  const items = getPreflightChecklistItems(request, selectedSupply);

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Request Preflight checklist">
      {items.map((item) => (
        <Badge
          className={cn(
            "rounded-full border text-[11px]",
            item.ready
              ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
              : "border-border/70 bg-background text-muted-foreground"
          )}
          key={item.label}
          variant="secondary"
        >
          {item.label}: {item.ready ? "set" : "pending"}
        </Badge>
      ))}
    </div>
  );
}

function getPreflightChecklistItems(
  request: BorealRequestDraft,
  selectedSupply: BorealSupplyDraft | null
) {
  const hasAsk = Boolean(
    request.brief.body?.trim() ||
      request.brief.summary?.trim() ||
      request.brief.title?.trim()
  );
  const hasDoneCondition = Boolean(
    request.brief.summary?.trim() || request.brief.outputKinds?.length
  );
  const hasConstraints =
    Object.keys(request.brief.constraints ?? {}).length > 0 ||
    request.derived.embodiedConstraintSet.accessRequirements.length > 0 ||
    request.derived.embodiedConstraintSet.safetyRequirements.length > 0;
  const hasBudget = Boolean(request.budget && request.budget.mode !== "none");
  const hasDeadline = Boolean(
    request.deadline?.targetAt?.trim() || request.deadline?.notes?.trim()
  );
  const hasProof =
    request.derived.verificationPlan.requiredArtifactKinds.length > 0 ||
    request.derived.verificationPlan.requiredEvidenceClaims.length > 0 ||
    (request.brief.outputKinds?.length ?? 0) > 0;
  const hasHumanOrLocalContext =
    request.derived.executionProfile.requiresHumanPresence ||
    request.derived.executionProfile.requiresLocalAccess ||
    request.derived.embodiedConstraintSet.requiresEmbodiedHandling;
  const hasServiceSupplyContext = Boolean(
    selectedSupply || request.routing.preferredSupplyId
  );

  return [
    { label: "Ask", ready: hasAsk },
    { label: "Done", ready: hasDoneCondition },
    { label: "Constraints", ready: hasConstraints },
    { label: "Budget", ready: hasBudget },
    { label: "Deadline", ready: hasDeadline },
    { label: "Proof", ready: hasProof },
    { label: "Human/local", ready: hasHumanOrLocalContext },
    { label: "Service/supply", ready: hasServiceSupplyContext },
  ];
}

function getSelectedSupplyLabel(supply: BorealSupplyDraft) {
  return supply.profile.displayName.trim() || supply.key || "Untitled supply";
}

function getBorealWorkerStarterForSupply(supply: BorealSupplyDraft) {
  const workerKey = getBorealWorkerKeyFromSupply(supply);
  return workerKey ? getBorealWorkerStarter(workerKey) : null;
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

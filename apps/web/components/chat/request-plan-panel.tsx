"use client";

import { useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import { RequestFlowCanvas } from "@/components/chat/request-flow-canvas";
import { buildDraftRequestFlowGraph } from "@/lib/request-flow";
import type { BorealRequestDraft, RequestPhaseKey } from "@/lib/request";
import { LoadingButton } from "./loading-button";

type RequestPlanPanelProps = {
  request: BorealRequestDraft;
  scope: "draft" | "open";
  onOpenRequest?: () => Promise<void>;
  isOpeningRequest?: boolean;
};

type PlanFact = {
  label: string;
  value: string;
};

type PlanNeed = {
  label: string;
  detail: string;
};

type FlowStep = {
  title: string;
  summary: string;
  items: string[];
  proof?: string;
  statusLabel: string;
  roleSummary?: string;
};

type PlannedRole = {
  title: string;
  summary: string;
  required: boolean;
  actorKinds: string;
};

type FingerprintGroup = {
  label: string;
  values: string[];
};

type LeadCandidate = {
  supplyId?: string;
  summary: string;
  statusLabel: string;
  confidenceLabel: string;
  scoreLabel?: string;
  sourceLabel: string;
};

type RoleAssignment = {
  title: string;
  summary: string;
  required: boolean;
  statusLabel: string;
  confidenceLabel: string;
  sourceLabel: string;
  supplyId?: string;
};

type PathSignal = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "danger" | "neutral";
};

type SupportingPathSlot = {
  title: string;
  source: string;
  status: string;
  summary: string;
};

export function RequestPlanPanel({
  request,
  scope,
  onOpenRequest,
  isOpeningRequest = false,
}: RequestPlanPanelProps) {
  const [visualMode, setVisualMode] = useLocalStorage<"summary" | "flow">(
    "request-plan-visual-mode",
    "summary"
  );
  const understandingItems = getUnderstandingItems(request);
  const missingItems = getMissingItems(request);
  const plannedRoles = getPlannedRoles(request);
  const fingerprintGroups = getFingerprintGroups(request);
  const leadCandidates = getLeadCandidates(request);
  const roleAssignments = getRoleAssignments(request);
  const flowSteps = getFlowSteps(request);
  const flowGraph = useMemo(() => buildDraftRequestFlowGraph(request), [request]);
  const planNarrative = getPlanNarrative(request, flowSteps, plannedRoles);
  const pathSignals = getPathSignals(request);
  const supportingPathSlots = getSupportingPathSlots(request, leadCandidates);
  const hasPlanContent =
    understandingItems.length > 0 ||
    missingItems.length > 0 ||
    plannedRoles.length > 0 ||
    flowSteps.length > 0;

  if (!hasPlanContent) {
    return (
      <section className="rounded-[22px] border border-border/60 bg-muted/[0.18] p-3.5 md:p-4">
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Path Builder
          </div>
          <div className="text-[13px] leading-6 text-muted-foreground">
            {scope === "draft"
              ? "Boreal is still waiting for enough request detail to shape a usable baseline path."
              : "Boreal does not have enough request structure yet to show a clear path."}
          </div>
        </div>

        <div className="mt-3 rounded-[18px] border border-dashed border-border/60 bg-background/92 px-3.5 py-3">
          <div className="text-[14px] leading-6 text-foreground">
            Add the real ask first.
          </div>
          <div className="mt-1.5 text-[13px] leading-5.5 text-muted-foreground">
            Once the brief contains the actual work, Boreal will show the baseline path, missing details, proof needs, and supporting path slots here.
          </div>
        </div>
      </section>
    );
  }

  const canOpenRequest =
    scope === "draft" && request.derived.readiness.readyForOpen;

  return (
    <section className="rounded-[22px] border border-border/60 bg-muted/[0.18] p-3.5 md:p-4">
      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
          Path Builder
        </div>
        <div className="text-[13px] leading-6 text-muted-foreground">
          {planNarrative}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {plannedRoles.length > 0 ? (
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {plannedRoles.length} {plannedRoles.length === 1 ? "lane" : "lanes"}
            </div>
          ) : null}
          {flowSteps.length > 0 ? (
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {flowSteps.length} {flowSteps.length === 1 ? "phase" : "phases"}
            </div>
          ) : null}
          {request.derived.clarificationNeeded.required ? (
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              clarification needed
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {([
            { id: "summary" as const, label: "Path details" },
            { id: "flow" as const, label: "Flow lens" },
          ]).map((view) => (
            <button
              className={
                visualMode === view.id
                  ? "rounded-full border border-foreground/14 bg-foreground px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-background"
                  : "rounded-full border border-border/70 bg-background/92 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              }
              key={view.id}
              onClick={() => setVisualMode(view.id)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <BaselinePathCard
        canOpenRequest={canOpenRequest}
        flowSteps={flowSteps}
        pathSignals={pathSignals}
        plannedRoles={plannedRoles}
        planNarrative={planNarrative}
        request={request}
        scope={scope}
      />

      <PathSignalStrip signals={pathSignals} />

      <SupportingPathTray slots={supportingPathSlots} />

      {visualMode === "flow" ? (
        <div className="mt-3">
          <RequestFlowCanvas graph={flowGraph} />
        </div>
      ) : (
        <>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <section className="rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Request brief
          </div>
          <div className="mt-2.5 space-y-2.5">
            {understandingItems.length > 0 ? (
              understandingItems.map((item) => (
                <FactRow key={`${item.label}:${item.value}`} item={item} />
              ))
            ) : (
              <div className="text-[13px] leading-5.5 text-muted-foreground">
                Boreal still needs a clearer work ask before it can summarize the request cleanly.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            {missingItems.length > 0 ? "Missing inputs" : "Open readiness"}
          </div>
          <div className="mt-2.5 space-y-2.5">
            {missingItems.length > 0 ? (
              missingItems.map((item) => (
                <NeedRow key={item.label} item={item} />
              ))
            ) : (
              <div className="space-y-1.5">
                <div className="text-[14px] leading-6 text-foreground">
                  This baseline path is ready to open.
                </div>
                <div className="text-[13px] leading-5.5 text-muted-foreground">
                  Boreal has enough core request structure to open the request and start route decisions or replies.
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {fingerprintGroups.length > 0 ? (
        <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Fit signals
          </div>
          <div className="mt-3 grid gap-2.5 xl:grid-cols-2">
            {fingerprintGroups.map((group) => (
              <div
                className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5"
                key={group.label}
              >
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                  {group.label}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.values.map((value) => (
                    <span
                      className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] leading-5 text-foreground"
                      key={`${group.label}:${value}`}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {leadCandidates.length > 0 || roleAssignments.length > 0 ? (
        <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
              Supply path
            </div>
            <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {formatLabel(request.derived.assignmentProposal.state)}
            </div>
          </div>
          <div className="mt-1.5 text-[13px] leading-5.5 text-muted-foreground">
            {request.derived.assignmentProposal.summary}
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="space-y-2.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                Lead lane shortlist
              </div>
              {leadCandidates.length > 0 ? (
                leadCandidates.map((candidate, index) => (
                  <div
                    className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5"
                    key={`${candidate.supplyId ?? "open"}:${index}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[13px] font-medium leading-5.5 text-foreground">
                        {candidate.supplyId ?? "Open lead lane"}
                      </div>
                      <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                        {candidate.statusLabel}
                      </div>
                    </div>
                    <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
                      {candidate.summary}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-5 text-muted-foreground">
                      <span>Confidence: {candidate.confidenceLabel}</span>
                      <span>Source: {candidate.sourceLabel}</span>
                      {candidate.scoreLabel ? <span>{candidate.scoreLabel}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-border/60 bg-muted/[0.12] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
                  Boreal has not surfaced a lead candidate yet.
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                Role candidates
              </div>
              {roleAssignments.length > 0 ? (
                roleAssignments.map((assignment) => (
                  <div
                    className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5"
                    key={`${assignment.title}:${assignment.supplyId ?? assignment.statusLabel}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[13px] font-medium leading-5.5 text-foreground">
                        {assignment.title}
                      </div>
                      <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                        {assignment.required ? "required" : "optional"}
                      </div>
                    </div>
                    {assignment.supplyId ? (
                      <div className="mt-1 font-mono text-[11px] leading-5 text-muted-foreground">
                        {assignment.supplyId}
                      </div>
                    ) : null}
                    <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
                      {assignment.summary}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-5 text-muted-foreground">
                      <span>Status: {assignment.statusLabel}</span>
                      <span>Confidence: {assignment.confidenceLabel}</span>
                      <span>Source: {assignment.sourceLabel}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-border/60 bg-muted/[0.12] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
                  Boreal has not mapped support lanes yet.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {flowSteps.length > 0 ? (
        <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
              Path steps
            </div>
            {request.derived.noMicrotaskExplosion ? (
              <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                bounded path
              </div>
            ) : null}
          </div>

          <div className="mt-3 space-y-0">
            {flowSteps.map((step, index) => (
              <FlowStepRow
                index={index}
                key={`${index}:${step.title}`}
                showConnector={index < flowSteps.length - 1}
                step={step}
              />
            ))}
          </div>
        </section>
      ) : null}

      {plannedRoles.length > 0 ? (
        <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Capability lanes
          </div>
          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
            {plannedRoles.map((role) => (
              <div
                className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5"
                key={`${role.title}:${role.actorKinds}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[14px] leading-6 text-foreground">{role.title}</div>
                  <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                    {role.required ? "required" : "optional"}
                  </div>
                </div>
                <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
                  {role.summary}
                </div>
                <div className="mt-2 text-[12px] leading-5 text-muted-foreground">
                  Actor types: {role.actorKinds}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
        </>
      )}

      {scope === "draft" ? (
        <div className="mt-3 flex flex-col gap-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-foreground">
              {canOpenRequest
                ? "Baseline path is ready to open."
                : "Baseline path still needs a few details."}
            </div>
            <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
              {canOpenRequest
                ? "Open the Request when this is the path you want Boreal to route and run."
                : request.derived.readiness.summary}
            </div>
          </div>
          <LoadingButton
            className="md:shrink-0"
            disabled={!canOpenRequest || isOpeningRequest || !onOpenRequest}
            isLoading={isOpeningRequest}
            loadingText="Opening..."
            onClick={() => {
              if (!onOpenRequest) {
                return;
              }

              void onOpenRequest();
            }}
            type="button"
          >
            Open request
          </LoadingButton>
        </div>
      ) : null}
    </section>
  );
}

function BaselinePathCard({
  canOpenRequest,
  flowSteps,
  pathSignals,
  plannedRoles,
  planNarrative,
  request,
  scope,
}: {
  canOpenRequest: boolean;
  flowSteps: FlowStep[];
  pathSignals: PathSignal[];
  plannedRoles: PlannedRole[];
  planNarrative: string;
  request: BorealRequestDraft;
  scope: RequestPlanPanelProps["scope"];
}) {
  const proofSignal = pathSignals.find((signal) => signal.label === "Proof");
  const humanWorkSignal = pathSignals.find((signal) => signal.label === "Human work");
  const riskSignal = pathSignals.find((signal) => signal.label === "Risk");
  const stateLabel =
    scope === "open" ? "request-open" : canOpenRequest ? "execution-ready" : "proposal";
  const stepCount = Math.max(flowSteps.length, 1);
  const laneCount = Math.max(plannedRoles.length, 1);

  return (
    <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-100">
              Boreal baseline
            </div>
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {stateLabel}
            </div>
          </div>
          <div className="mt-3 text-[17px] font-medium leading-7 text-foreground">
            {request.brief.title?.trim() || "Baseline path"}
          </div>
          <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
            {planNarrative}
          </div>
        </div>

        <div className="grid min-w-[160px] grid-cols-2 gap-2 text-[12px] leading-5 text-muted-foreground md:text-right">
          <span>{stepCount} {stepCount === 1 ? "step" : "steps"}</span>
          <span>{laneCount} {laneCount === 1 ? "lane" : "lanes"}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[humanWorkSignal, proofSignal, riskSignal]
          .filter((signal): signal is PathSignal => Boolean(signal))
          .map((signal) => (
            <span
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] leading-5 text-muted-foreground"
              key={signal.label}
            >
              {signal.label}: {signal.value}
            </span>
          ))}
      </div>

      <div className="mt-3 rounded-[14px] border border-border/60 bg-muted/[0.16] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
        This path is a proposal for how the request can become execution. It is not a match, fulfillment, proof, or completion by itself.
      </div>
    </section>
  );
}

function PathSignalStrip({ signals }: { signals: PathSignal[] }) {
  return (
    <section className="mt-3 grid gap-2 md:grid-cols-5">
      {signals.map((signal) => (
        <div
          className={`rounded-[16px] border px-3 py-2.5 ${getPathSignalToneClassName(signal.tone)}`}
          key={signal.label}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
            {signal.label}
          </div>
          <div className="mt-1 text-[13px] font-medium leading-5 text-foreground">
            {signal.value}
          </div>
          <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
            {signal.detail}
          </div>
        </div>
      ))}
    </section>
  );
}

function SupportingPathTray({ slots }: { slots: SupportingPathSlot[] }) {
  return (
    <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
          Supporting paths
        </div>
        <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
          V1 slots
        </div>
      </div>
      <div className="mt-2 text-[13px] leading-5.5 text-muted-foreground">
        Boreal starts with a baseline path. Humans, agents, services, and workflows can become supporting paths when that capability is live or attached.
      </div>
      <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {slots.map((slot) => (
          <div
            className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5"
            key={slot.title}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-medium leading-5.5 text-foreground">
                  {slot.title}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/72">
                  {slot.source}
                </div>
              </div>
              <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                {slot.status}
              </div>
            </div>
            <div className="mt-2 text-[13px] leading-5.5 text-muted-foreground">
              {slot.summary}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FactRow({ item }: { item: PlanFact }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
        {item.label}
      </div>
      <div className="text-[14px] leading-6 text-foreground">{item.value}</div>
    </div>
  );
}

function NeedRow({ item }: { item: PlanNeed }) {
  return (
    <div className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5">
      <div className="text-[13px] font-medium leading-5.5 text-foreground">
        {item.label}
      </div>
      <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
        {item.detail}
      </div>
    </div>
  );
}

function FlowStepRow({
  index,
  step,
  showConnector,
}: {
  index: number;
  step: FlowStep;
  showConnector: boolean;
}) {
  return (
    <div className="relative flex gap-2.5 pb-3 last:pb-0">
      <div className="relative flex w-7 shrink-0 justify-center">
        <div className="relative z-10 flex size-7 items-center justify-center rounded-full border border-border/70 bg-background text-[11px] font-medium text-foreground">
          {index + 1}
        </div>
        {showConnector ? (
          <div className="absolute top-7 bottom-0 w-px bg-border/60" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[14px] leading-6 text-foreground">{step.title}</div>
          <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
            {step.statusLabel}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
          {step.summary}
        </div>
        {step.items.length > 0 ? (
          <div className="mt-2.5 space-y-1.5">
            {step.items.map((item) => (
              <div
                className="flex items-start gap-2 text-[13px] leading-5.5 text-muted-foreground"
                key={item}
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/45" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        ) : null}
        {step.roleSummary ? (
          <div className="mt-2 text-[13px] leading-5.5 text-muted-foreground">
            Lanes: {step.roleSummary}
          </div>
        ) : null}
        {step.proof ? (
          <div className="mt-2 text-[13px] leading-5.5 text-muted-foreground">
            Proof: {step.proof}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getPlanNarrative(
  request: BorealRequestDraft,
  flowSteps: FlowStep[],
  plannedRoles: PlannedRole[]
) {
  const location = request.derived.embodiedConstraintSet.serviceLocation?.trim();

  if (request.derived.embodiedConstraintSet.requiresEmbodiedHandling) {
    if (location) {
      return `Boreal mapped a baseline path for real-world work in ${location}. The Request keeps local execution, proof, and review inside one thread.`;
    }

    return "Boreal mapped a baseline path for real-world work. The Request keeps execution, proof, and review inside one thread.";
  }

  if (flowSteps.length > 1) {
    return `Boreal mapped this baseline path into ${flowSteps.length} steps that affect execution, proof, or delivery${plannedRoles.length > 0 ? `, with ${plannedRoles.length} capability lane${plannedRoles.length === 1 ? "" : "s"}` : ""}.`;
  }

  return "Boreal understands the ask and is showing a baseline path from request to delivery. Edit the brief if the outcome or constraints are wrong.";
}

function getPathSignals(request: BorealRequestDraft): PathSignal[] {
  return [
    getFeasibilitySignal(request),
    getRiskSignal(request),
    getProofReadinessSignal(request),
    getHumanWorkSignal(request),
    getClarificationSignal(request),
  ];
}

function getFeasibilitySignal(request: BorealRequestDraft): PathSignal {
  if (request.derived.readiness.readyForOpen) {
    return {
      label: "Feasibility",
      value: "Good",
      detail: "Enough structure exists to open the request.",
      tone: "good",
    };
  }

  if (
    request.derived.missingDetails.includes("title") ||
    request.derived.missingDetails.includes("body")
  ) {
    return {
      label: "Feasibility",
      value: "Blocked",
      detail: "Core request text is still missing.",
      tone: "danger",
    };
  }

  if (request.derived.planCollapseRisk.riskLevel === "high") {
    return {
      label: "Feasibility",
      value: "Weak",
      detail: "This path may fail without more detail.",
      tone: "danger",
    };
  }

  return {
    label: "Feasibility",
    value: "Unclear",
    detail: "The path needs more inputs before routing.",
    tone: "warn",
  };
}

function getRiskSignal(request: BorealRequestDraft): PathSignal {
  const riskLevel = request.derived.planCollapseRisk.riskLevel;

  return {
    label: "Risk",
    value: formatLabel(riskLevel),
    detail:
      request.derived.planCollapseRisk.reasons[0] ??
      "No high-risk collapse reason is currently attached.",
    tone:
      riskLevel === "high"
        ? "danger"
        : riskLevel === "moderate"
          ? "warn"
          : "good",
  };
}

function getProofReadinessSignal(request: BorealRequestDraft): PathSignal {
  const verificationMissing =
    request.derived.clarificationNeeded.missingDetails.includes(
      "verification_requirements"
    );
  const proofCount =
    request.derived.verificationPlan.requiredArtifactKinds.length +
    request.derived.verificationPlan.requiredEvidenceClaims.length +
    (request.derived.verificationPlan.mustHaveLocationSignal ? 1 : 0) +
    (request.derived.verificationPlan.mustHaveOwnerAcceptance ? 1 : 0) +
    (request.derived.verificationPlan.mustHaveSignature ? 1 : 0);

  if (verificationMissing) {
    return {
      label: "Proof",
      value: "Missing",
      detail: "Proof is not defined yet.",
      tone: "danger",
    };
  }

  if (proofCount > 0) {
    return {
      label: "Proof",
      value: request.derived.readiness.readyForOpen ? "Ready" : "Partial",
      detail: `${proofCount} proof ${proofCount === 1 ? "signal" : "signals"} captured.`,
      tone: request.derived.readiness.readyForOpen ? "good" : "warn",
    };
  }

  return {
    label: "Proof",
    value: "Partial",
    detail: "No special proof package is defined yet.",
    tone: "neutral",
  };
}

function getHumanWorkSignal(request: BorealRequestDraft): PathSignal {
  const executionModes = request.derived.executionProfile.executionModes;
  const hasRemoteMode = executionModes.some((mode) => /remote|digital/.test(mode));
  const hasLocalMode =
    request.derived.embodiedConstraintSet.requiresEmbodiedHandling ||
    request.derived.executionProfile.requiresHumanPresence ||
    request.derived.executionProfile.requiresLocalAccess;

  if (hasLocalMode && hasRemoteMode) {
    return {
      label: "Human work",
      value: "Mixed",
      detail: "This path combines local or manual work with remote coordination.",
      tone: "warn",
    };
  }

  if (hasLocalMode) {
    return {
      label: "Human work",
      value: "Onsite",
      detail: "This path requires human or local action.",
      tone: "warn",
    };
  }

  if (hasRemoteMode) {
    return {
      label: "Human work",
      value: "Remote",
      detail: "This path can stay in a remote digital lane.",
      tone: "good",
    };
  }

  return {
    label: "Human work",
    value: "None",
    detail: "No manual or onsite work is currently detected.",
    tone: "neutral",
  };
}

function getClarificationSignal(request: BorealRequestDraft): PathSignal {
  if (request.derived.clarificationNeeded.required) {
    return {
      label: "Clarification",
      value: "Needed",
      detail: `${request.derived.clarificationNeeded.missingDetails.length} input ${request.derived.clarificationNeeded.missingDetails.length === 1 ? "is" : "are"} still missing.`,
      tone: "warn",
    };
  }

  if (request.derived.missingDetails.length > 0) {
    return {
      label: "Clarification",
      value: "Optional",
      detail: "Some details can still improve matching.",
      tone: "neutral",
    };
  }

  return {
    label: "Clarification",
    value: "Not needed",
    detail: "No route-blocking question is currently open.",
    tone: "good",
  };
}

function getSupportingPathSlots(
  request: BorealRequestDraft,
  leadCandidates: LeadCandidate[]
): SupportingPathSlot[] {
  const serviceSlot = leadCandidates[0]
    ? {
        title: "Service or supply path",
        source: "supply",
        status: "candidate",
        summary: leadCandidates[0].summary,
      }
    : {
        title: "Service or supply path",
        source: "supply",
        status: request.routing.preferredSupplyId ? "pinned" : "preview",
        summary: request.routing.preferredSupplyId
          ? "Pinned supply narrows the route. It still needs approval, proof, funding, and safety gates."
          : "Attach a service or supply when a grounded route exists.",
      };

  return [
    {
      title: "Human path",
      source: "human",
      status: "preview",
      summary:
        "Invite a reviewer or operator to propose another way to complete this request.",
    },
    {
      title: "Agent path",
      source: "agent",
      status: "preview",
      summary:
        "Ask another agent for a supporting path without treating it as assigned work.",
    },
    serviceSlot,
    {
      title: "Workflow path",
      source: "template",
      status: "future",
      summary:
        "Reusable workflow paths can attach later without becoming a new root object.",
    },
  ];
}

function getPathSignalToneClassName(tone: PathSignal["tone"]) {
  switch (tone) {
    case "good":
      return "border-emerald-400/25 bg-emerald-400/10";
    case "warn":
      return "border-amber-400/25 bg-amber-400/10";
    case "danger":
      return "border-red-400/25 bg-red-400/10";
    default:
      return "border-border/60 bg-background/92";
  }
}

function getUnderstandingItems(request: BorealRequestDraft): PlanFact[] {
  const items: PlanFact[] = [];
  const ask =
    request.brief.body?.trim() ||
    request.brief.summary?.trim() ||
    request.brief.title?.trim();
  const location = request.derived.embodiedConstraintSet.serviceLocation?.trim();
  const schedule = request.derived.embodiedConstraintSet.timeWindows[0]?.trim();
  const headcount = extractHeadcount(request);
  const proof = getProofSummary(request);

  if (ask) {
    items.push({
      label: "Ask",
      value: truncateText(ask, 180),
    });
  }

  if (location) {
    items.push({
      label: "Location",
      value: location,
    });
  }

  if (schedule) {
    items.push({
      label: "When",
      value: schedule,
    });
  }

  if (headcount) {
    items.push({
      label: "Size",
      value: headcount,
    });
  }

  if (proof) {
    items.push({
      label: "Proof",
      value: proof,
    });
  }

  return items;
}

function getMissingItems(request: BorealRequestDraft): PlanNeed[] {
  if (!request.derived.clarificationNeeded.required) {
    return [];
  }

  return request.derived.clarificationNeeded.missingDetails.map((detail) =>
    describeMissingDetail(detail)
  );
}

function getFlowSteps(request: BorealRequestDraft): FlowStep[] {
  const phases =
    request.derived.phases.length > 0
      ? request.derived.phases
      : buildFallbackFlowSteps(request);

  return phases.map((phase) => ({
    title: getPhaseTitle(request, phase),
    summary: getPhaseSummary(request, phase),
    items: getPhaseItems(request, phase),
    proof:
      phase.requiredEvidenceClaims.length > 0
        ? phase.requiredEvidenceClaims.map((claim) => formatLabel(claim)).join(", ")
        : undefined,
    statusLabel: getPhaseStatusLabel(phase.phaseKey),
    roleSummary: getPhaseRoleSummary(request, phase),
  }));
}

function getPlannedRoles(request: BorealRequestDraft): PlannedRole[] {
  if (request.derived.roleSlots.length === 0) {
    return [];
  }

  return request.derived.roleSlots.map((roleSlot) => ({
    title: roleSlot.title,
    summary:
      roleSlot.summary?.trim() ||
      "Support this request inside the same durable request thread.",
    required: roleSlot.required,
    actorKinds:
      roleSlot.requiredActorKinds.length > 0
        ? roleSlot.requiredActorKinds.map((kind) => formatLabel(kind)).join(", ")
        : "not specified",
  }));
}

function getFingerprintGroups(request: BorealRequestDraft): FingerprintGroup[] {
  const groups: FingerprintGroup[] = [];

  const routeValues = [
    request.derived.routeFamily ? formatLabel(request.derived.routeFamily) : "",
    request.derived.executionKind ? formatLabel(request.derived.executionKind) : "",
    request.derived.paymentMode ? formatLabel(request.derived.paymentMode) : "",
    request.derived.matchingMode ? formatLabel(request.derived.matchingMode) : "",
  ].filter(Boolean);

  if (routeValues.length > 0) {
    groups.push({
      label: "Route",
      values: routeValues,
    });
  }

  const seekingValues = [
    ...(request.seeking.actorKinds ?? []).map((kind) => formatLabel(kind)),
    ...(request.seeking.supplyKinds ?? []).map((kind) => formatLabel(kind)),
  ];

  if (seekingValues.length > 0) {
    groups.push({
      label: "Seeking",
      values: uniqueValues(seekingValues),
    });
  }

  const outputValues = (request.brief.outputKinds ?? []).map((kind) =>
    formatLabel(kind)
  );

  if (outputValues.length > 0) {
    groups.push({
      label: "Deliverables",
      values: uniqueValues(outputValues),
    });
  }

  const executionValues = request.derived.executionProfile.executionModes.map((mode) =>
    formatLabel(mode)
  );

  if (executionValues.length > 0) {
    groups.push({
      label: "Execution",
      values: uniqueValues(executionValues),
    });
  }

  const proofValues = request.derived.verificationPlan.requiredEvidenceClaims.map((claim) =>
    formatLabel(claim)
  );

  if (proofValues.length > 0) {
    groups.push({
      label: "Proof",
      values: uniqueValues(proofValues),
    });
  }

  return groups;
}

function getLeadCandidates(request: BorealRequestDraft): LeadCandidate[] {
  const matchCandidateMap = new Map(
    request.derived.matchCandidates.map((candidate) => [candidate.supplyId, candidate])
  );
  const seenSupplyIds = new Set<string>();

  return request.derived.leadRanking
    .filter((entry) => {
      if (!entry.supplyId) {
        return true;
      }

      if (seenSupplyIds.has(entry.supplyId)) {
        return false;
      }

      seenSupplyIds.add(entry.supplyId);
      return true;
    })
    .slice(0, 3)
    .map((entry) => {
      const matchCandidate = entry.supplyId
        ? matchCandidateMap.get(entry.supplyId)
        : undefined;

      return {
        supplyId: entry.supplyId,
        summary: entry.summary,
        statusLabel: formatLabel(entry.status),
        confidenceLabel: formatLabel(entry.confidence),
        sourceLabel: formatLabel(entry.source),
        scoreLabel: matchCandidate
          ? `Lead ${Math.round(matchCandidate.leadScore)} | Overall ${Math.round(matchCandidate.overallScore)}`
          : undefined,
      };
    });
}

function getRoleAssignments(request: BorealRequestDraft): RoleAssignment[] {
  const roleSlotMap = new Map(
    request.derived.roleSlots.map((roleSlot) => [roleSlot.roleKey, roleSlot])
  );

  return request.derived.roleMatches.map((roleMatch) => ({
    title:
      roleSlotMap.get(roleMatch.roleKey)?.title ?? formatLabel(roleMatch.roleKey),
    summary: roleMatch.summary,
    required: roleMatch.required,
    statusLabel: formatLabel(roleMatch.status),
    confidenceLabel: formatLabel(roleMatch.confidence),
    sourceLabel: formatLabel(roleMatch.source),
    supplyId: roleMatch.supplyId,
  }));
}

function getPhaseTitle(
  request: BorealRequestDraft,
  phase: BorealRequestDraft["derived"]["phases"][number]
) {
  switch (phase.phaseKey) {
    case "clarify_constraints":
      return "Lock the missing event details";
    case "onsite_execution":
      return request.derived.embodiedConstraintSet.serviceLocation
        ? "Coordinate the local event work"
        : "Complete the main work";
    case "proof_delivery":
      return "Package the delivery and proof";
    case "execute_delivery":
      return "Complete the deliverable";
    default:
      return phase.title;
  }
}

function getPhaseSummary(
  request: BorealRequestDraft,
  phase: BorealRequestDraft["derived"]["phases"][number]
) {
  if (phase.phaseKey === "clarify_constraints") {
    return request.derived.clarificationNeeded.reasons.length > 0
      ? request.derived.clarificationNeeded.reasons.join(" ")
      : phase.summary;
  }

  if (
    phase.phaseKey === "onsite_execution" &&
    request.derived.embodiedConstraintSet.serviceLocation
  ) {
    return `Handle the local execution work in ${request.derived.embodiedConstraintSet.serviceLocation} and keep proof attached before closure.`;
  }

  if (
    phase.phaseKey === "onsite_execution" ||
    phase.phaseKey === "field_execution" ||
    phase.phaseKey === "handoff_execution" ||
    phase.phaseKey === "witness_execution"
  ) {
    return "Carry out the real-world step and keep the result tied to this request.";
  }

  if (phase.phaseKey === "scope_route") {
    return "Confirm the scope and the lane that should carry the work after the request opens.";
  }

  if (phase.phaseKey === "execute_delivery") {
    if (isResearchRequest(request)) {
      return "Research the topic, organize the findings, and return a clear brief.";
    }

    if ((request.brief.outputKinds ?? []).length > 0) {
      return "Produce the requested deliverable and keep progress in this request thread.";
    }

    return "Complete the requested output and keep delivery attached to this request.";
  }

  if (phase.phaseKey === "proof_delivery" || phase.phaseKey === "handoff_review") {
    return "Package the output, evidence, and owner-facing notes needed for review.";
  }

  if (/brittle task tree|microtask|planner/i.test(phase.summary)) {
    return "Keep the work in one clear request path from execution to delivery.";
  }

  return phase.summary;
}

function getPhaseRoleSummary(
  request: BorealRequestDraft,
  phase: BorealRequestDraft["derived"]["phases"][number]
) {
  if (phase.roleKeys.length === 0) {
    return "";
  }

  const roleTitles = phase.roleKeys.map((roleKey) => {
    const matchingRole = request.derived.roleSlots.find(
      (roleSlot) => roleSlot.roleKey === roleKey
    );

    return matchingRole?.title ?? formatLabel(roleKey);
  });

  return roleTitles.join(", ");
}

function getPhaseItems(
  request: BorealRequestDraft,
  phase: BorealRequestDraft["derived"]["phases"][number]
) {
  if (phase.phaseKey === "clarify_constraints") {
    return request.derived.clarificationNeeded.missingDetails.map(
      (detail) => describeMissingDetail(detail).label
    );
  }

  if (phase.phaseKey === "onsite_execution") {
    return [
      request.derived.embodiedConstraintSet.serviceLocation
        ? `Run in ${request.derived.embodiedConstraintSet.serviceLocation}`
        : null,
      request.derived.embodiedConstraintSet.timeWindows[0]
        ? `Target timing: ${request.derived.embodiedConstraintSet.timeWindows[0]}`
        : null,
      extractHeadcount(request) ? `Target size: ${extractHeadcount(request)}` : null,
    ].filter((item): item is string => Boolean(item));
  }

  if (phase.phaseKey === "proof_delivery") {
    const proofItems = [
      request.derived.verificationPlan.mustHaveLocationSignal
        ? "Include location-backed proof"
        : null,
      request.derived.verificationPlan.mustHaveOwnerAcceptance
        ? "Collect owner acceptance"
        : null,
      request.derived.verificationPlan.mustHaveSignature
        ? "Collect signature proof"
        : null,
    ].filter((item): item is string => Boolean(item));

    if (proofItems.length > 0) {
      return proofItems;
    }
  }

  return [];
}

function getPhaseStatusLabel(phaseKey: RequestPhaseKey) {
  switch (phaseKey) {
    case "clarify_constraints":
      return "needed now";
    case "proof_delivery":
    case "handoff_review":
      return "final";
    default:
      return "next";
  }
}

function buildFallbackFlowSteps(
  request: BorealRequestDraft
): BorealRequestDraft["derived"]["phases"] {
  const fallbackPhases: BorealRequestDraft["derived"]["phases"] = [];

  if (request.derived.clarificationNeeded.required) {
    fallbackPhases.push({
      phaseKey: "clarify_constraints",
      title: "Lock the missing work details",
      summary:
        "Boreal still needs a few execution-critical details before the request is ready to route cleanly.",
      roleKeys:
        request.derived.leadRole ? [request.derived.leadRole] : [],
      requiredEvidenceClaims: [],
    });
  }

  if (request.derived.embodiedConstraintSet.requiresEmbodiedHandling) {
    fallbackPhases.push({
      phaseKey: "onsite_execution",
      title: "Complete the local verification work",
      summary:
        "Handle the real-world visit, verification, and evidence capture inside the same request thread.",
      roleKeys:
        request.derived.roleSlots.length > 0
          ? request.derived.roleSlots
              .filter((roleSlot) => roleSlot.required)
              .map((roleSlot) => roleSlot.roleKey)
          : request.derived.leadRole
            ? [request.derived.leadRole]
            : [],
      requiredEvidenceClaims: [],
    });
  }

  if (request.derived.verificationPlan.requiredEvidenceClaims.length > 0) {
    fallbackPhases.push({
      phaseKey: "proof_delivery",
      title: "Publish proof and final delivery",
      summary:
        "Attach the proof-bearing delivery package so review and closure stay truthful.",
      roleKeys:
        request.derived.roleSlots.length > 0
          ? request.derived.roleSlots.map((roleSlot) => roleSlot.roleKey)
          : request.derived.leadRole
            ? [request.derived.leadRole]
            : [],
      requiredEvidenceClaims:
        request.derived.verificationPlan.requiredEvidenceClaims,
    });
  }

  if (fallbackPhases.length === 0 && request.brief.body?.trim()) {
    fallbackPhases.push({
      phaseKey: "execute_delivery",
      title: "Complete the requested work",
      summary:
        "Boreal has the ask, but the path has not yet expanded into richer phases.",
      roleKeys:
        request.derived.leadRole ? [request.derived.leadRole] : [],
      requiredEvidenceClaims: [],
    });
  }

  return fallbackPhases;
}

function describeMissingDetail(detail: string): PlanNeed {
  switch (detail) {
    case "execution_modes":
      return {
        label: "Execution mode",
        detail: "Say if this should run onsite, remote, or hybrid so Boreal can route it correctly.",
      };
    case "access_requirements":
      return {
        label: "Access details",
        detail: "Add venue, organizer access, booking context, or other local access details needed to do the work.",
      };
    case "service_location":
      return {
        label: "Exact location",
        detail: "Add the city, venue, or service area where the work needs to happen.",
      };
    case "time_windows":
      return {
        label: "Time window",
        detail: "Add the actual schedule window or target timing for the work.",
      };
    case "verification_requirements":
      return {
        label: "Success proof",
        detail: "Say what evidence or completion proof should be delivered back to the request.",
      };
    default:
      return {
        label: formatLabel(detail),
        detail: "Add this missing request detail before opening the request.",
      };
  }
}

function getProofSummary(request: BorealRequestDraft) {
  const parts: string[] = [];

  if (request.derived.verificationPlan.mustHaveLocationSignal) {
    parts.push("location signal");
  }

  if (request.derived.verificationPlan.mustHaveOwnerAcceptance) {
    parts.push("owner acceptance");
  }

  if (request.derived.verificationPlan.mustHaveSignature) {
    parts.push("signature");
  }

  if (request.derived.verificationPlan.requiredArtifactKinds.length > 0) {
    parts.push(
      request.derived.verificationPlan.requiredArtifactKinds
        .map((kind) => formatLabel(kind))
        .join(", ")
    );
  }

  return parts.length > 0 ? parts.join(" | ") : "";
}

function extractHeadcount(request: BorealRequestDraft) {
  const source = [
    request.brief.title ?? "",
    request.brief.summary ?? "",
    request.brief.body ?? "",
  ].join(" ");
  const match = source.match(/\b(\d{1,4})\s*(pax|people|attendees|guests)\b/i);

  if (!match) {
    return "";
  }

  return `${match[1]} ${match[2].toLowerCase()}`;
}

function isResearchRequest(request: BorealRequestDraft) {
  const source = [
    request.brief.title,
    request.brief.summary,
    request.brief.body,
    ...(request.brief.outputKinds ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\bresearch\b|\bdeep dive\b|\banaly[sz]e\b|\bcompare\b|\bmarket scan\b/.test(
    source
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

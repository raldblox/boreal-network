"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { RequestFlowCanvas } from "@/components/chat/request-flow-canvas";
import { buildDraftRequestFlowGraph } from "@/lib/request-flow";
import {
  buildRequestPathBuilderViewModel,
  describeMissingPathDetail,
  getRequestPathFallbackPhases,
  getRequestPathPhaseStatusLabel,
  type RequestBaselinePath,
  type RequestPathSignal,
  type RequestSupportingPath,
} from "@/lib/request-path-builder";
import type { BorealRequestDraft, RequestPatch } from "@/lib/request";
import { LoadingButton } from "./loading-button";

type RequestDraftUpdatePatch = Pick<
  RequestPatch,
  "brief" | "seeking" | "budget" | "deadline" | "routing"
>;

type RequestPlanPanelProps = {
  request: BorealRequestDraft;
  scope: "draft" | "open";
  onOpenRequest?: () => Promise<void>;
  isOpeningRequest?: boolean;
  onUpdateRequestDraft?: (
    patch: RequestDraftUpdatePatch
  ) => Promise<BorealRequestDraft | null>;
};

type PlanFact = {
  label: string;
  value: string;
};

type PlanNeed = {
  label: string;
  detail: string;
  tone?: "danger" | "warn" | "neutral";
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

export function RequestPlanPanel({
  request,
  scope,
  onOpenRequest,
  isOpeningRequest = false,
  onUpdateRequestDraft,
}: RequestPlanPanelProps) {
  const isDraftScope = scope === "draft";
  const [visualMode, setVisualMode] = useLocalStorage<"summary" | "flow">(
    "request-plan-visual-mode",
    "summary"
  );
  const effectiveVisualMode = visualMode;
  const understandingItems = getUnderstandingItems(request);
  const missingItems = getMissingItems(request);
  const plannedRoles = getPlannedRoles(request);
  const fingerprintGroups = getFingerprintGroups(request);
  const leadCandidates = getLeadCandidates(request);
  const roleAssignments = getRoleAssignments(request);
  const flowSteps = getFlowSteps(request);
  const flowGraph = useMemo(() => buildDraftRequestFlowGraph(request), [request]);
  const pathBuilder = useMemo(
    () => buildRequestPathBuilderViewModel({ request, scope }),
    [request, scope]
  );
  const planNarrative = pathBuilder.baselinePath.summary;
  const pathSignals = pathBuilder.signals;
  const supportingPathSlots = pathBuilder.supportingPaths;
  const draftPanelLabel =
    isDraftScope && !request.derived.readiness.readyForOpen
      ? "Briefing result"
      : isDraftScope
        ? "Plans"
        : "Path Builder";
  const hasPlanContent =
    pathBuilder.hasPathContent ||
    understandingItems.length > 0 ||
    missingItems.length > 0 ||
    plannedRoles.length > 0 ||
    flowSteps.length > 0;

  if (!hasPlanContent) {
    return (
      <section className="rounded-[22px] border border-border/60 bg-muted/[0.18] p-3.5 md:p-4">
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            {draftPanelLabel}
          </div>
          <div className="text-[13px] leading-6 text-muted-foreground">
            {isDraftScope
              ? "Boreal is still waiting for enough request detail to shape usable plans."
              : "Boreal does not have enough request structure yet to show a clear path."}
          </div>
        </div>

        <div className="mt-3 rounded-[18px] border border-dashed border-border/60 bg-background/92 px-3.5 py-3">
          <div className="text-[14px] leading-6 text-foreground">
            Add the real ask first.
          </div>
          <div className="mt-1.5 text-[13px] leading-5.5 text-muted-foreground">
            Once the brief contains the actual work, Boreal will show the
            buyer-facing plan steps and proof needs here.
          </div>
        </div>
      </section>
    );
  }

  const canOpenRequest =
    pathBuilder.canOpenRequest;

  return (
    <section className="rounded-[22px] border border-border/60 bg-muted/[0.18] p-3.5 md:p-4">
      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
          {draftPanelLabel}
        </div>
        <div className="text-[13px] leading-6 text-muted-foreground">
          {isDraftScope && request.derived.readiness.readyForOpen
            ? "Review the completion plan before opening the Request. Worker and supply routing start after the Request is open."
            : isDraftScope
              ? "Review what Boreal captured so far, answer missing inputs in chat, then open the Request once the plans are ready."
              : planNarrative}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!isDraftScope && plannedRoles.length > 0 ? (
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {plannedRoles.length} {plannedRoles.length === 1 ? "lane" : "lanes"}
            </div>
          ) : null}
          {flowSteps.length > 0 ? (
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {flowSteps.length} {flowSteps.length === 1 ? "step" : "steps"}
            </div>
          ) : null}
          {request.derived.clarificationNeeded.required ? (
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              clarification needed
            </div>
          ) : null}
        </div>
        {flowGraph.nodes.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {([
              {
                id: "summary" as const,
                label: isDraftScope ? "Stepper" : "Path details",
              },
              {
                id: "flow" as const,
                label: isDraftScope ? "Flow review" : "Flow lens",
              },
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
        ) : null}
      </div>

      <BaselinePathCard
        baselinePath={pathBuilder.baselinePath}
        pathSignals={pathSignals}
        showSignals={!isDraftScope}
      />

      {!isDraftScope ? <PathSignalStrip signals={pathSignals} /> : null}

      {!isDraftScope ? <SupportingPathTray slots={supportingPathSlots} /> : null}

      {effectiveVisualMode === "flow" ? (
        <div className="mt-3">
          <RequestFlowCanvas
            graph={flowGraph}
            heightClassName={isDraftScope ? "h-[24rem]" : undefined}
          />
        </div>
      ) : (
        <>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <EditableRequestBriefCard
          canEdit={isDraftScope && Boolean(onUpdateRequestDraft)}
          items={understandingItems}
          onUpdateRequestDraft={onUpdateRequestDraft}
          request={request}
        />

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
                  {isDraftScope
                    ? "These plans are ready to open."
                    : "This baseline path is ready to open."}
                </div>
                <div className="text-[13px] leading-5.5 text-muted-foreground">
                  {isDraftScope
                    ? "Boreal has enough core request structure to open the Request."
                    : "Boreal has enough core request structure to open the request and start route decisions or replies."}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {!isDraftScope && fingerprintGroups.length > 0 ? (
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

      {!isDraftScope && (leadCandidates.length > 0 || roleAssignments.length > 0) ? (
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
              {isDraftScope ? "Plan steps" : "Path steps"}
            </div>
            {!isDraftScope && request.derived.noMicrotaskExplosion ? (
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
                showRoleSummary={!isDraftScope}
                showConnector={index < flowSteps.length - 1}
                step={step}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isDraftScope && plannedRoles.length > 0 ? (
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

      {isDraftScope ? (
        <div className="mt-3 flex flex-col gap-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-foreground">
              {canOpenRequest
                ? "Plans are ready to post."
                : "Plans still need a few details."}
            </div>
            <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
              {canOpenRequest
                ? "Post the Request when these plans look right. Worker and supply routing start after the Request is open."
                : request.derived.readiness.summary}
            </div>
          </div>
          <LoadingButton
            className="md:shrink-0"
            disabled={!canOpenRequest || isOpeningRequest || !onOpenRequest}
            isLoading={isOpeningRequest}
            loadingText="Posting..."
            onClick={() => {
              if (!onOpenRequest) {
                return;
              }

              void onOpenRequest();
            }}
            type="button"
          >
            Post request
          </LoadingButton>
        </div>
      ) : null}
    </section>
  );
}

function BaselinePathCard({
  baselinePath,
  pathSignals,
  showSignals = true,
}: {
  baselinePath: RequestBaselinePath;
  pathSignals: RequestPathSignal[];
  showSignals?: boolean;
}) {
  const proofSignal = pathSignals.find((signal) => signal.label === "Proof");
  const humanWorkSignal = pathSignals.find((signal) => signal.label === "Human work");
  const riskSignal = pathSignals.find((signal) => signal.label === "Risk");

  return (
    <section className="mt-3 rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-status-success/25 bg-status-success/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-status-success">
              {showSignals ? "Boreal baseline" : "Draft plan"}
            </div>
            <div className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              {baselinePath.statusLabel}
            </div>
          </div>
          <div className="mt-3 text-[17px] font-medium leading-7 text-foreground">
            {baselinePath.title}
          </div>
          <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
            {baselinePath.summary}
          </div>
        </div>

        <div className="grid min-w-[160px] grid-cols-2 gap-2 text-[12px] leading-5 text-muted-foreground md:text-right">
          <span>{baselinePath.stepCount} {baselinePath.stepCount === 1 ? "step" : "steps"}</span>
          {showSignals ? (
            <span>
              {baselinePath.laneCount} {baselinePath.laneCount === 1 ? "lane" : "lanes"}
            </span>
          ) : null}
        </div>
      </div>

      {showSignals ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
        {[humanWorkSignal, proofSignal, riskSignal]
          .filter((signal): signal is RequestPathSignal => Boolean(signal))
          .map((signal) => (
            <span
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] leading-5 text-muted-foreground"
              key={signal.label}
            >
              {signal.label}: {signal.value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 rounded-[14px] border border-border/60 bg-muted/[0.16] px-3 py-2.5 text-[13px] leading-5.5 text-muted-foreground">
        {showSignals
          ? "This path is a proposal for how the request can become execution. It is not a match, fulfillment, proof, or completion by itself."
          : "These plans describe how the request can be completed. They are not worker assignment, proof, or completion by themselves."}
      </div>
    </section>
  );
}

function PathSignalStrip({ signals }: { signals: RequestPathSignal[] }) {
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

function SupportingPathTray({ slots }: { slots: RequestSupportingPath[] }) {
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

type EditableBriefForm = {
  title: string;
  summary: string;
  body: string;
  serviceLocation: string;
  timeWindows: string;
  proof: string;
  budgetMode: "none" | "fixed" | "range" | "open";
  budgetCurrency: string;
  budgetFixedAmount: string;
  budgetMinAmount: string;
  budgetMaxAmount: string;
  budgetNotes: string;
  deadlineTargetAt: string;
  deadlineNotes: string;
};

function EditableRequestBriefCard({
  canEdit,
  items,
  onUpdateRequestDraft,
  request,
}: {
  canEdit: boolean;
  items: PlanFact[];
  onUpdateRequestDraft?: (
    patch: RequestDraftUpdatePatch
  ) => Promise<BorealRequestDraft | null>;
  request: BorealRequestDraft;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentForm = useMemo(() => getEditableBriefForm(request), [request]);
  const [form, setForm] = useState<EditableBriefForm>(currentForm);

  useEffect(() => {
    if (!isEditing) {
      setForm(currentForm);
    }
  }, [currentForm, isEditing]);

  const titleMissing = form.title.trim().length === 0;
  const bodyMissing = form.body.trim().length === 0;
  const hasChanges =
    JSON.stringify(form) !== JSON.stringify(getEditableBriefForm(request));

  const updateForm = (field: keyof EditableBriefForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!onUpdateRequestDraft || isSaving || !hasChanges) {
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onUpdateRequestDraft(buildEditableBriefPatch(request, form));
      setIsEditing(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update request draft."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    const budgetLabel = formatBudgetSummary(request);
    const deadlineLabel = formatDeadlineSummary(request);

    return (
      <section className="rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Request brief
          </div>
          {canEdit ? (
            <button
              className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setError(null);
                setIsEditing(true);
              }}
              type="button"
            >
              Edit brief
            </button>
          ) : null}
        </div>
        <div className="mt-2.5 space-y-2.5">
          {!request.brief.title?.trim() ? (
            <RequiredBriefNote
              detail="Add a clear buyer-facing title."
              label="Title missing"
            />
          ) : null}
          {!request.brief.body?.trim() ? (
            <RequiredBriefNote
              detail="Add the actual work ask and done condition."
              label="Body missing"
            />
          ) : null}
          {items.length > 0 ? (
            items.map((item) => (
              <FactRow key={`${item.label}:${item.value}`} item={item} />
            ))
          ) : (
            <div className="text-[13px] leading-5.5 text-muted-foreground">
              Boreal still needs a clearer work ask before it can summarize the request cleanly.
            </div>
          )}
          {budgetLabel ? (
            <FactRow item={{ label: "Budget", value: budgetLabel }} />
          ) : null}
          {deadlineLabel ? (
            <FactRow item={{ label: "Deadline", value: deadlineLabel }} />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[18px] border border-border/60 bg-background/92 px-3.5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
          Edit request brief
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            disabled={isSaving}
            onClick={() => {
              setError(null);
              setForm(getEditableBriefForm(request));
              setIsEditing(false);
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full border border-foreground/14 bg-foreground px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isSaving || !hasChanges}
            onClick={() => void save()}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <BriefTextInput
          label="Title"
          missing={titleMissing}
          onChange={(value) => updateForm("title", value)}
          value={form.title}
        />
        <BriefTextArea
          label="Body"
          missing={bodyMissing}
          onChange={(value) => updateForm("body", value)}
          rows={5}
          value={form.body}
        />
        <BriefTextArea
          label="Summary"
          onChange={(value) => updateForm("summary", value)}
          rows={3}
          value={form.summary}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <BriefTextInput
            label="Location"
            onChange={(value) => updateForm("serviceLocation", value)}
            value={form.serviceLocation}
          />
          <BriefTextInput
            label="Time"
            onChange={(value) => updateForm("timeWindows", value)}
            value={form.timeWindows}
          />
        </div>
        <BriefTextInput
          label="Proof"
          onChange={(value) => updateForm("proof", value)}
          value={form.proof}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
              Budget mode
            </span>
            <select
              className="h-9 w-full rounded-[12px] border border-border/70 bg-background px-3 text-[13px] text-foreground outline-none transition-colors focus:border-foreground/35"
              onChange={(event) =>
                updateForm(
                  "budgetMode",
                  event.currentTarget.value as EditableBriefForm["budgetMode"]
                )
              }
              value={form.budgetMode}
            >
              <option value="none">None</option>
              <option value="open">Open</option>
              <option value="fixed">Fixed</option>
              <option value="range">Range</option>
            </select>
          </label>
          <BriefTextInput
            label="Currency"
            onChange={(value) => updateForm("budgetCurrency", value)}
            value={form.budgetCurrency}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <BriefTextInput
            label="Fixed amount"
            onChange={(value) => updateForm("budgetFixedAmount", value)}
            value={form.budgetFixedAmount}
          />
          <BriefTextInput
            label="Min amount"
            onChange={(value) => updateForm("budgetMinAmount", value)}
            value={form.budgetMinAmount}
          />
          <BriefTextInput
            label="Max amount"
            onChange={(value) => updateForm("budgetMaxAmount", value)}
            value={form.budgetMaxAmount}
          />
        </div>
        <BriefTextArea
          label="Budget notes"
          onChange={(value) => updateForm("budgetNotes", value)}
          rows={2}
          value={form.budgetNotes}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <BriefTextInput
            label="Deadline target"
            onChange={(value) => updateForm("deadlineTargetAt", value)}
            value={form.deadlineTargetAt}
          />
          <BriefTextInput
            label="Deadline notes"
            onChange={(value) => updateForm("deadlineNotes", value)}
            value={form.deadlineNotes}
          />
        </div>
        <div className="rounded-[14px] border border-border/60 bg-muted/[0.18] px-3 py-2.5 text-[12px] leading-5 text-muted-foreground">
          Derived planner fields, route summary, matches, and readiness remain read-only.
        </div>
        {error ? (
          <div className="rounded-[14px] border border-status-danger/25 bg-status-danger/10 px-3 py-2.5 text-[13px] leading-5.5 text-status-danger">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BriefTextInput({
  label,
  missing = false,
  onChange,
  value,
}: {
  label: string;
  missing?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
        {label}
        {missing ? <span className="text-status-danger">Required</span> : null}
      </span>
      <input
        className={[
          "h-9 w-full rounded-[12px] border bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/35 focus:border-foreground/35",
          missing ? "border-status-danger/45" : "border-border/70",
        ].join(" ")}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}

function BriefTextArea({
  label,
  missing = false,
  onChange,
  rows,
  value,
}: {
  label: string;
  missing?: boolean;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
        {label}
        {missing ? <span className="text-status-danger">Required</span> : null}
      </span>
      <textarea
        className={[
          "w-full resize-none rounded-[12px] border bg-background px-3 py-2 text-[13px] leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/35 focus:border-foreground/35",
          missing ? "border-status-danger/45" : "border-border/70",
        ].join(" ")}
        onChange={(event) => onChange(event.currentTarget.value)}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function RequiredBriefNote({
  detail,
  label,
}: {
  detail: string;
  label: string;
}) {
  return (
    <div className="rounded-[14px] border border-status-danger/25 bg-status-danger/10 px-3 py-2.5">
      <div className="text-[13px] font-medium leading-5.5 text-status-danger">
        {label}
      </div>
      <div className="mt-1 text-[13px] leading-5.5 text-muted-foreground">
        {detail}
      </div>
    </div>
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
  const toneClassName =
    item.tone === "danger"
      ? "border-status-danger/25 bg-status-danger/10"
      : item.tone === "warn"
        ? "border-status-waiting/25 bg-status-waiting/10"
        : "border-border/60 bg-muted/[0.18]";
  const titleClassName =
    item.tone === "danger"
      ? "text-status-danger"
      : "text-foreground";

  return (
    <div className={`rounded-[14px] border px-3 py-2.5 ${toneClassName}`}>
      <div className={`text-[13px] font-medium leading-5.5 ${titleClassName}`}>
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
  showRoleSummary,
  step,
  showConnector,
}: {
  index: number;
  showRoleSummary: boolean;
  step: FlowStep;
  showConnector: boolean;
}) {
  return (
    <div className="relative flex gap-2.5 pb-3 last:pb-0">
      <div className="relative flex w-7 shrink-0 justify-center">
        <div className="relative z-10 flex size-7 items-center justify-center rounded-full border border-status-success/25 bg-status-success/10 text-[11px] font-medium text-status-success">
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
        {showRoleSummary && step.roleSummary ? (
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

function getPathSignalToneClassName(tone: RequestPathSignal["tone"]) {
  switch (tone) {
    case "good":
      return "border-status-success/25 bg-status-success/10";
    case "warn":
      return "border-status-waiting/25 bg-status-waiting/10";
    case "danger":
      return "border-status-danger/25 bg-status-danger/10";
    default:
      return "border-border/60 bg-background/92";
  }
}

function getEditableBriefForm(request: BorealRequestDraft): EditableBriefForm {
  const budget = request.budget;
  const deadline = request.deadline;

  return {
    title: request.brief.title ?? "",
    summary: request.brief.summary ?? "",
    body: request.brief.body ?? "",
    serviceLocation: getConstraintString(
      request.brief.constraints,
      "serviceLocation"
    ),
    timeWindows: getConstraintList(request.brief.constraints, "timeWindows"),
    proof: getConstraintList(
      request.brief.constraints,
      "verificationRequirements"
    ),
    budgetMode: budget?.mode ?? "none",
    budgetCurrency: budget?.currency ?? "",
    budgetFixedAmount: numberToFormValue(budget?.fixedAmount),
    budgetMinAmount: numberToFormValue(budget?.minAmount),
    budgetMaxAmount: numberToFormValue(budget?.maxAmount),
    budgetNotes: budget?.notes ?? "",
    deadlineTargetAt: deadline?.targetAt ?? "",
    deadlineNotes: deadline?.notes ?? "",
  };
}

function buildEditableBriefPatch(
  request: BorealRequestDraft,
  form: EditableBriefForm
): RequestDraftUpdatePatch {
  const currentForm = getEditableBriefForm(request);
  const constraints = { ...(request.brief.constraints ?? {}) };
  writeConstraintString(constraints, "serviceLocation", form.serviceLocation);
  writeConstraintList(constraints, "timeWindows", form.timeWindows);
  writeConstraintList(
    constraints,
    "verificationRequirements",
    form.proof
  );

  const patch: RequestDraftUpdatePatch = {
    brief: {
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body.trim(),
      constraints,
    },
  };

  if (hasEditableBudgetChange(currentForm, form)) {
    patch.budget = buildBudgetPatch(form);
  }

  if (hasEditableDeadlineChange(currentForm, form)) {
    patch.deadline = buildDeadlinePatch(form);
  }

  return patch;
}

function buildBudgetPatch(form: EditableBriefForm): RequestPatch["budget"] {
  const budget: Record<string, unknown> = {
    mode: form.budgetMode,
  };
  const currency = form.budgetCurrency.trim();
  const fixedAmount = parseFormAmount(form.budgetFixedAmount);
  const minAmount = parseFormAmount(form.budgetMinAmount);
  const maxAmount = parseFormAmount(form.budgetMaxAmount);
  const notes = form.budgetNotes.trim();

  if (currency) {
    budget.currency = currency;
  }
  if (fixedAmount !== undefined) {
    budget.fixedAmount = fixedAmount;
  }
  if (minAmount !== undefined) {
    budget.minAmount = minAmount;
  }
  if (maxAmount !== undefined) {
    budget.maxAmount = maxAmount;
  }
  if (notes) {
    budget.notes = notes;
  }

  return budget as RequestPatch["budget"];
}

function buildDeadlinePatch(form: EditableBriefForm): RequestPatch["deadline"] {
  const targetAt = form.deadlineTargetAt.trim();
  const notes = form.deadlineNotes.trim();

  if (!targetAt && !notes) {
    return null;
  }

  return {
    ...(targetAt ? { targetAt } : {}),
    ...(notes ? { notes } : {}),
  };
}

function hasEditableBudgetChange(
  currentForm: EditableBriefForm,
  nextForm: EditableBriefForm
) {
  return (
    currentForm.budgetMode !== nextForm.budgetMode ||
    currentForm.budgetCurrency !== nextForm.budgetCurrency ||
    currentForm.budgetFixedAmount !== nextForm.budgetFixedAmount ||
    currentForm.budgetMinAmount !== nextForm.budgetMinAmount ||
    currentForm.budgetMaxAmount !== nextForm.budgetMaxAmount ||
    currentForm.budgetNotes !== nextForm.budgetNotes
  );
}

function hasEditableDeadlineChange(
  currentForm: EditableBriefForm,
  nextForm: EditableBriefForm
) {
  return (
    currentForm.deadlineTargetAt !== nextForm.deadlineTargetAt ||
    currentForm.deadlineNotes !== nextForm.deadlineNotes
  );
}

function formatBudgetSummary(request: BorealRequestDraft) {
  const budget = request.budget;
  if (!budget) {
    return null;
  }

  const currency = budget.currency?.trim() || "";
  const amount =
    budget.mode === "fixed" && budget.fixedAmount !== undefined
      ? `${currency ? `${currency} ` : ""}${budget.fixedAmount}`
      : budget.mode === "range" &&
          (budget.minAmount !== undefined || budget.maxAmount !== undefined)
        ? `${currency ? `${currency} ` : ""}${[
            budget.minAmount ?? "?",
            budget.maxAmount ?? "?",
          ].join(" - ")}`
        : "";
  const mode = formatLabel(budget.mode);
  const notes = budget.notes?.trim();

  return [mode, amount, notes].filter(Boolean).join(": ") || null;
}

function formatDeadlineSummary(request: BorealRequestDraft) {
  const deadline = request.deadline;
  if (!deadline) {
    return null;
  }

  return [deadline.targetAt?.trim(), deadline.notes?.trim()]
    .filter(Boolean)
    .join(": ");
}

function getConstraintString(
  constraints: Record<string, unknown> | undefined,
  key: string
) {
  const value = constraints?.[key];
  return typeof value === "string" ? value : "";
}

function getConstraintList(
  constraints: Record<string, unknown> | undefined,
  key: string
) {
  const value = constraints?.[key];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join(", ");
  }

  return typeof value === "string" ? value : "";
}

function writeConstraintString(
  constraints: Record<string, unknown>,
  key: string,
  value: string
) {
  const nextValue = value.trim();
  if (nextValue) {
    constraints[key] = nextValue;
  } else {
    delete constraints[key];
  }
}

function writeConstraintList(
  constraints: Record<string, unknown>,
  key: string,
  value: string
) {
  const list = value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.length > 0) {
    constraints[key] = list;
  } else {
    delete constraints[key];
  }
}

function numberToFormValue(value: number | undefined) {
  return typeof value === "number" ? String(value) : "";
}

function parseFormAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
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
  const items: PlanNeed[] = [];

  if (!request.brief.title?.trim()) {
    items.push({
      label: "Title missing",
      detail: "Add a short buyer-facing title before opening the Request.",
      tone: "danger",
    });
  }

  if (!request.brief.body?.trim()) {
    items.push({
      label: "Body missing",
      detail: "Add the work ask, done condition, and any hard constraints.",
      tone: "danger",
    });
  }

  if (!request.derived.clarificationNeeded.required) {
    return items;
  }

  return items.concat(
    request.derived.clarificationNeeded.missingDetails.map((detail) => ({
      ...describeMissingPathDetail(detail),
      tone: "warn" as const,
    }))
  );
}

function getFlowSteps(request: BorealRequestDraft): FlowStep[] {
  const phases =
    request.derived.phases.length > 0
      ? request.derived.phases
      : getRequestPathFallbackPhases(request);

  return phases.map((phase) => ({
    title: getPhaseTitle(request, phase),
    summary: getPhaseSummary(request, phase),
    items: getPhaseItems(request, phase),
    proof:
      phase.requiredEvidenceClaims.length > 0
        ? phase.requiredEvidenceClaims.map((claim) => formatLabel(claim)).join(", ")
        : undefined,
    statusLabel: getRequestPathPhaseStatusLabel(phase.phaseKey),
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
      (detail) => describeMissingPathDetail(detail).label
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

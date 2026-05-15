"use client";

import type { BorealRequestDraft } from "@/lib/request";

type RequestPlanPanelProps = {
  request: BorealRequestDraft;
  scope: "draft" | "open";
};

type PlanCardDescriptor = {
  label: string;
  value: string;
  detail?: string;
};

export function RequestPlanPanel({
  request,
  scope,
}: RequestPlanPanelProps) {
  const hasStructuredPlan = hasStructuredRequestPlan(request);

  if (!hasStructuredPlan) {
    return (
      <section className="rounded-[24px] border border-border/60 bg-muted/[0.18] p-4 md:p-5">
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Derived planning view
          </div>
          <div className="text-sm leading-7 text-muted-foreground">
            {scope === "draft"
              ? "Boreal has not derived planning hints from the editable brief yet."
              : "Boreal does not have enough request structure yet to show a clear read-only planner projection."}
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-dashed border-border/60 bg-background/92 px-4 py-4">
          <div className="text-[15px] leading-7 text-foreground">
            Add the real ask first.
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            {getEmptyPlanStateDetail(request)}
          </div>
        </div>
      </section>
    );
  }

  const planCards: PlanCardDescriptor[] = [
    {
      label: "Outcome",
      value: getOutcomeValue(request),
      detail: getOutcomeDetail(request),
    },
    {
      label: "Route intent",
      value: getRouteIntentValue(request, scope),
      detail: getRouteIntentDetail(request),
    },
    {
      label: "Lead lane",
      value: getLeadLaneValue(request),
      detail: getLeadLaneDetail(request),
    },
    {
      label: "Team shape",
      value: getTeamShapeValue(request),
      detail: getTeamShapeDetail(request),
    },
    {
      label: "Execution lane",
      value: getExecutionLaneValue(request),
      detail: getExecutionLaneDetail(request),
    },
    {
      label: "Proof plan",
      value: getProofPlanValue(request),
      detail: getProofPlanDetail(request),
    },
    {
      label: "Current gate",
      value: getCurrentGateValue(request),
      detail: getCurrentGateDetail(request),
    },
    {
      label: "Next action",
      value: getNextActionValue(request),
      detail: getNextActionDetail(request),
    },
  ];

  return (
    <section className="rounded-[24px] border border-border/60 bg-muted/[0.18] p-4 md:p-5">
      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
          Derived planning view
        </div>
        <div className="text-sm leading-7 text-muted-foreground">
          {scope === "draft"
            ? "This read-only projection is derived from the editable brief. Update the brief fields to change it."
            : "This read-only projection reflects Boreal's current route, execution, and proof view for the live request."}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {planCards.map((card) => (
          <PlanCard
            detail={card.detail}
            key={card.label}
            label={card.label}
            value={card.value}
          />
        ))}
      </div>

      {request.derived.roleSlots.length > 0 ? (
        <section className="mt-4 space-y-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Planned roles
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {request.derived.roleSlots.map((slot) => (
              <RoleSlotCard key={slot.roleKey} request={request} roleKey={slot.roleKey} />
            ))}
          </div>
        </section>
      ) : null}

      {request.derived.phases.length > 0 ? (
        <section className="mt-4 space-y-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
            Planned steps
          </div>
          <div className="space-y-3">
            {request.derived.phases.map((phase, index) => (
              <PhaseCard index={index} key={phase.phaseKey} phase={phase} request={request} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function PlanCard({ label, value, detail }: PlanCardDescriptor) {
  return (
    <div className="rounded-[20px] border border-border/60 bg-background/92 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
        {label}
      </div>
      <div className="mt-2 text-[15px] leading-7 text-foreground">{value}</div>
      {detail ? (
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function RoleSlotCard({
  request,
  roleKey,
}: {
  request: BorealRequestDraft;
  roleKey: string;
}) {
  const roleSlot = request.derived.roleSlots.find((slot) => slot.roleKey === roleKey);
  if (!roleSlot) {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-border/60 bg-background/92 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[14px] font-medium leading-6 text-foreground">
          {roleSlot.title}
        </div>
        <div className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
          {roleSlot.required ? "Required" : "Optional"}
        </div>
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">
        Actors: {roleSlot.requiredActorKinds.map((kind) => formatLabel(kind)).join(", ")}
      </div>
      {roleSlot.preferredSupplyKinds.length > 0 ? (
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          Supply fit: {roleSlot.preferredSupplyKinds.map((kind) => formatLabel(kind)).join(", ")}
        </div>
      ) : null}
      {roleSlot.summary ? (
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          {roleSlot.summary}
        </div>
      ) : null}
    </div>
  );
}

function PhaseCard({
  index,
  phase,
  request,
}: {
  index: number;
  phase: BorealRequestDraft["derived"]["phases"][number];
  request: BorealRequestDraft;
}) {
  const roleTitles = phase.roleKeys
    .map((roleKey) =>
      request.derived.roleSlots.find((slot) => slot.roleKey === roleKey)?.title ??
      formatLabel(roleKey)
    )
    .filter((title) => title.length > 0);

  return (
    <div className="rounded-[20px] border border-border/60 bg-background/92 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-[12px] font-medium text-foreground">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[14px] font-medium leading-6 text-foreground">
            {phase.title}
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            {phase.summary}
          </div>
          {roleTitles.length > 0 ? (
            <div className="text-sm leading-6 text-muted-foreground">
              Roles: {roleTitles.join(", ")}
            </div>
          ) : null}
          {phase.requiredEvidenceClaims.length > 0 ? (
            <div className="text-sm leading-6 text-muted-foreground">
              Proof: {phase.requiredEvidenceClaims.map((claim) => formatLabel(claim)).join(", ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getOutcomeValue(request: BorealRequestDraft) {
  const summaryCandidate =
    request.brief.summary?.trim() ||
    request.brief.body?.trim() ||
    request.brief.title?.trim() ||
    "No outcome has been captured yet.";

  return truncateText(summaryCandidate, 180);
}

function hasStructuredRequestPlan(request: BorealRequestDraft) {
  return (
    Boolean(request.derived.leadRole) ||
    request.derived.roleSlots.length > 0 ||
    request.derived.phases.length > 0
  );
}

function getEmptyPlanStateDetail(request: BorealRequestDraft) {
  const hasBriefSeed =
    request.brief.title?.trim() ||
    request.brief.summary?.trim() ||
    request.brief.body?.trim();
  const hasRouteSeed =
    request.brief.outputKinds?.length ||
    request.seeking.supplyKinds?.length ||
    request.seeking.actorKinds?.length;

  if (hasBriefSeed || hasRouteSeed) {
    return "The brief still needs clearer deliverables, route signals, or execution constraints before Boreal can turn it into read-only roles and planned steps.";
  }

  return "Once the brief contains the actual work ask, Boreal will derive the lead lane, team shape, planned steps, and proof gates here as a read-only projection.";
}

function getOutcomeDetail(request: BorealRequestDraft) {
  const parts = [
    request.brief.outputKinds?.length
      ? `Deliverables: ${formatTokenList(request.brief.outputKinds)}`
      : null,
    request.seeking.supplyKinds?.length
      ? `Supply: ${formatTokenList(request.seeking.supplyKinds)}`
      : null,
    request.seeking.actorKinds?.length
      ? `Actors: ${formatTokenList(request.seeking.actorKinds)}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? parts.join(" | ")
    : "The request still needs clearer deliverables or target supply signals.";
}

function getRouteIntentValue(
  request: BorealRequestDraft,
  scope: "draft" | "open"
) {
  if (request.derived.routeSummary?.trim()) {
    return request.derived.routeSummary.trim();
  }

  if (scope === "draft") {
    return "Route summary will firm up after the request opens or once route facts are clearer.";
  }

  return "Route summary is still thin. Boreal needs a stronger lead and route definition.";
}

function getRouteIntentDetail(request: BorealRequestDraft) {
  const parts = [
    request.derived.routeFamily
      ? `Route family: ${formatLabel(request.derived.routeFamily)}`
      : null,
    request.derived.executionKind
      ? `Execution: ${formatLabel(request.derived.executionKind)}`
      : null,
    request.derived.matchingMode
      ? `Matching: ${formatLabel(request.derived.matchingMode)}`
      : null,
    request.seeking.teamMode
      ? `Team mode: ${formatLabel(request.seeking.teamMode)}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? parts.join(" | ")
    : "No explicit route family or matching mode has been attached yet.";
}

function getLeadLaneValue(request: BorealRequestDraft) {
  if (!request.derived.leadRole) {
    return "Lead lane unresolved.";
  }

  const leadSlot =
    request.derived.roleSlots.find((slot) => slot.roleKey === request.derived.leadRole) ??
    null;

  return leadSlot?.title ?? formatLabel(request.derived.leadRole);
}

function getLeadLaneDetail(request: BorealRequestDraft) {
  if (!request.derived.leadRole) {
    return "Boreal still needs stronger route signals before a lead lane is obvious.";
  }

  const leadSlot =
    request.derived.roleSlots.find((slot) => slot.roleKey === request.derived.leadRole) ??
    null;
  const parts = [
    leadSlot?.requiredActorKinds.length
      ? `Actors: ${leadSlot.requiredActorKinds.map((kind) => formatLabel(kind)).join(", ")}`
      : null,
    leadSlot?.preferredSupplyKinds.length
      ? `Supply fit: ${leadSlot.preferredSupplyKinds.map((kind) => formatLabel(kind)).join(", ")}`
      : null,
    leadSlot?.summary ?? null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? parts.join(" | ")
    : "This request still needs a clearer lead owner for the route.";
}

function getTeamShapeValue(request: BorealRequestDraft) {
  const requiredCount = request.derived.roleSlots.filter((slot) => slot.required).length;
  const optionalCount = request.derived.roleSlots.filter((slot) => !slot.required).length;

  if (request.derived.roleSlots.length <= 1) {
    return "Single lead lane.";
  }

  return `${requiredCount} required role${requiredCount === 1 ? "" : "s"} | ${optionalCount} optional role${optionalCount === 1 ? "" : "s"}`;
}

function getTeamShapeDetail(request: BorealRequestDraft) {
  const parts = [
    request.seeking.teamMode ? `Team mode: ${formatLabel(request.seeking.teamMode)}` : null,
    request.derived.noMicrotaskExplosion
      ? "Boreal keeps this as a bounded phase plan, not a microtask tree."
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? parts.join(" | ")
    : "No extra collaborator slots are needed yet.";
}

function getExecutionLaneValue(request: BorealRequestDraft) {
  const executionModes = request.derived.executionProfile.executionModes;

  if (executionModes.length === 0) {
    return "Execution mode unresolved.";
  }

  return executionModes.map((mode) => formatLabel(mode)).join(", ");
}

function getExecutionLaneDetail(request: BorealRequestDraft) {
  const details = [
    request.derived.embodiedConstraintSet.serviceLocation?.trim()
      ? `Location: ${request.derived.embodiedConstraintSet.serviceLocation.trim()}`
      : null,
    request.derived.embodiedConstraintSet.timeWindows.length > 0
      ? `Time: ${request.derived.embodiedConstraintSet.timeWindows.join(", ")}`
      : null,
    request.derived.embodiedConstraintSet.accessRequirements.length > 0
      ? `Access: ${request.derived.embodiedConstraintSet.accessRequirements.join(", ")}`
      : null,
    `Risk tier: ${formatLabel(request.derived.executionProfile.riskTier)}`,
  ].filter((detail): detail is string => Boolean(detail));

  return details.join(" | ");
}

function getProofPlanValue(request: BorealRequestDraft) {
  const artifactKinds = request.derived.verificationPlan.requiredArtifactKinds;
  const claims = request.derived.verificationPlan.requiredEvidenceClaims;

  if (artifactKinds.length === 0 && claims.length === 0) {
    return "No extra proof gate is attached yet.";
  }

  const artifactLabel =
    artifactKinds.length > 0
      ? `Artifacts: ${artifactKinds.map((kind) => formatLabel(kind)).join(", ")}`
      : null;
  const claimLabel =
    claims.length > 0
      ? `Claims: ${claims.map((claim) => formatLabel(claim)).join(", ")}`
      : null;

  return [artifactLabel, claimLabel]
    .filter((part): part is string => Boolean(part))
    .join(" | ");
}

function getProofPlanDetail(request: BorealRequestDraft) {
  const controls = [
    request.derived.verificationPlan.mustHaveOwnerAcceptance
      ? "Owner acceptance"
      : null,
    request.derived.verificationPlan.mustHaveLocationSignal
      ? "Location signal"
      : null,
    request.derived.verificationPlan.mustHaveSignature ? "Signature" : null,
  ].filter((part): part is string => Boolean(part));

  return controls.length > 0
    ? `Controls: ${controls.join(", ")}`
    : "The current lane does not require extra proof controls yet.";
}

function getCurrentGateValue(request: BorealRequestDraft) {
  if (!request.derived.clarificationNeeded.required) {
    return "No clarification gate is currently blocking progress.";
  }

  return `Still needed: ${request.derived.clarificationNeeded.missingDetails
    .map((detail) => detail.replace(/_/g, " "))
    .join(", ")}.`;
}

function getCurrentGateDetail(request: BorealRequestDraft) {
  const clarificationReasons =
    request.derived.clarificationNeeded.reasons.length > 0
      ? request.derived.clarificationNeeded.reasons.join(" | ")
      : null;
  const collapseRisk =
    request.derived.planCollapseRisk.reasons.length > 0
      ? `Collapse risk: ${request.derived.planCollapseRisk.reasons.join(" | ")}`
      : null;

  return [clarificationReasons, collapseRisk]
    .filter((part): part is string => Boolean(part))
    .join(" | ");
}

function getNextActionValue(request: BorealRequestDraft) {
  switch (request.status) {
    case "draft":
      if (request.derived.clarificationNeeded.required) {
        return "Clarify the missing execution or proof facts before opening.";
      }

      if (request.derived.readiness.readyForOpen) {
        return "Open the request so routing, replies, and durable activity can start.";
      }

      return "Keep briefing the request until the core ask is stable.";
    case "open":
    case "funded":
      if (request.derived.clarificationNeeded.required) {
        return "Clarify missing route or proof facts before matching the lead lane.";
      }

      if (!request.activeRefs.activeFulfillmentId) {
        return request.visibility === "private"
          ? "Attach the lead private lane or preferred supply."
          : "Match the lead and move toward commitment or fulfillment.";
      }

      return "Keep the active lane attached and move execution forward.";
    case "in_progress":
      return "Keep fulfillment active and publish proof-bearing artifacts as work lands.";
    case "waiting_for_owner":
      return "Owner clarification or approval is blocking the next step.";
    case "delivered":
      return "Review delivery against the proof plan and resolve the request.";
    case "completed":
      return "The accepted result is locked. Capture follow-on work as a new request if needed.";
    case "cancelled":
      return "This request is closed. Restart as a new request only if the work boundary changed.";
    case "failed":
      return "This request failed in-place. Fix the blocking condition or reopen as a new request.";
    case "funding_required":
      return "Satisfy the funding boundary before execution can start.";
    default:
      return "Keep the request moving from demand to a safe next action.";
  }
}

function getNextActionDetail(request: BorealRequestDraft) {
  if (request.status === "draft") {
    return request.derived.readiness.summary;
  }

  if (request.latest.summary?.trim()) {
    return request.latest.summary.trim();
  }

  return request.derived.readiness.summary;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatTokenList(values: string[]) {
  return values.map((value) => formatLabel(value)).join(", ");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

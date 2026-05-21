import { z } from "zod";

export const borealActorKinds = [
  "human",
  "agent",
  "tool",
  "organization",
  "runtime",
] as const;

export type BorealActorKind = (typeof borealActorKinds)[number];

export const borealActorKindSchema = z.enum(borealActorKinds);

export const borealSupplyKinds = [
  "agent_worker",
  "ai_automation",
  "automation_builder",
  "desktop_runtime",
  "digital_product",
  "documentation_support",
  "field_inspection",
  "field_verification",
  "generalist",
  "hardware_ops",
  "human_service",
  "local_runner",
  "migration_lead",
  "operations_build",
  "operations_support",
  "operator",
  "pickup_dropoff",
  "provider_capability",
  "qa_documentation",
  "reporting_support",
  "runtime_executor",
  "team_service",
  "video_generation",
] as const;

export type BorealSupplyKind = (typeof borealSupplyKinds)[number];

export const borealSupplyKindSchema = z.enum(borealSupplyKinds);

export const borealOutputKinds = [
  "automation_build",
  "delivery",
  "delivery_confirmation",
  "draft",
  "file",
  "handoff_doc",
  "handoff_receipt",
  "inspection_report",
  "issue_log",
  "media",
  "migration_plan",
  "operator_training",
  "photo_evidence",
  "serial_inventory",
  "signature",
  "verification_note",
  "video",
  "workflow_build",
  "workflow_map",
] as const;

export type BorealOutputKind = (typeof borealOutputKinds)[number];

export const borealOutputKindSchema = z.enum(borealOutputKinds);

export const borealExecutionChannels = [
  "api",
  "async_thread",
  "instant_download",
  "operator_review",
  "request_room",
  "resolver_runtime",
] as const;

export type BorealExecutionChannel = (typeof borealExecutionChannels)[number];

export const borealExecutionChannelSchema = z.enum(borealExecutionChannels);

export const borealRequestExecutionModes = [
  "remote_digital",
  "remote_sync",
  "onsite_visit",
  "field_inspection",
  "pickup_dropoff",
  "witnessed_handoff",
] as const;

export type BorealRequestExecutionMode =
  (typeof borealRequestExecutionModes)[number];

export const borealRequestExecutionModeSchema = z.enum(
  borealRequestExecutionModes
);

export const borealRequestTeamModes = ["solo_or_team"] as const;

export type BorealRequestTeamMode = (typeof borealRequestTeamModes)[number];

export const borealRequestTeamModeSchema = z.enum(borealRequestTeamModes);

export const borealRequestRouteFamilies = [
  "worker_market",
  "direct_specialist",
  "direct_tool",
  "no_good_fit",
] as const;

export type BorealRequestRouteFamily =
  (typeof borealRequestRouteFamilies)[number];

export const borealRequestRouteFamilySchema = z.enum(
  borealRequestRouteFamilies
);

export const borealRequestExecutionKinds = [
  "instant_delivery",
  "hybrid_tool_room",
  "provider_api",
  "local_runtime",
  "hybrid_human_agent",
  "human_request_room",
  "agent_request_room",
  "runtime_request_room",
  "specialist_request_room",
] as const;

export type BorealRequestExecutionKind =
  (typeof borealRequestExecutionKinds)[number];

export const borealRequestExecutionKindSchema = z.enum(
  borealRequestExecutionKinds
);

export const borealRequestPaymentModes = [
  "fixed_funded_request",
  "fixed_request",
  "range_quote",
  "quote_request",
  "open_pricing",
] as const;

export type BorealRequestPaymentMode =
  (typeof borealRequestPaymentModes)[number];

export const borealRequestPaymentModeSchema = z.enum(
  borealRequestPaymentModes
);

export const borealRequestMatchingModes = [
  "lead_first_then_collaborators",
  "preferred_supply_direct",
  "preferred_supply_tool",
] as const;

export type BorealRequestMatchingMode =
  (typeof borealRequestMatchingModes)[number];

export const borealRequestMatchingModeSchema = z.enum(
  borealRequestMatchingModes
);

export const borealRequestEvidenceClaims = [
  "delivery_confirmation",
  "handoff_signature",
  "photo_proof",
  "serial_number_capture",
  "timestamped_photos",
  "verification_note",
  "written_report",
] as const;

export type BorealRequestEvidenceClaim =
  (typeof borealRequestEvidenceClaims)[number];

export const borealRequestEvidenceClaimSchema = z.enum(
  borealRequestEvidenceClaims
);

export const borealRequestRoleKeys = [
  "agent_lead",
  "agent_operator",
  "ai_automation",
  "automation_builder",
  "courier_runner",
  "delivery_lead",
  "digital_product",
  "documentation_support",
  "field_inspector",
  "field_technician",
  "generalist",
  "hardware_ops",
  "human_lead",
  "migration_lead",
  "onsite_operator",
  "operations_build",
  "operations_support",
  "operator",
  "organization_lead",
  "qa_documentation",
  "reporting_support",
  "runtime_lead",
  "runtime_operator",
  "service_lead",
  "specialist_lead",
  "support_role",
  "team_service",
  "tool_lead",
  "tool_operator",
  "video_generation",
  "witness_operator",
] as const;

export type BorealRequestRoleKey = (typeof borealRequestRoleKeys)[number];

export const borealRequestRoleKeySchema = z.enum(borealRequestRoleKeys);

export const borealRequestPhaseKeys = [
  "clarify_constraints",
  "execute_delivery",
  "field_execution",
  "handoff_execution",
  "handoff_review",
  "onsite_execution",
  "proof_delivery",
  "scope_route",
  "witness_execution",
] as const;

export type BorealRequestPhaseKey = (typeof borealRequestPhaseKeys)[number];

export const borealRequestPhaseKeySchema = z.enum(borealRequestPhaseKeys);

function isKnownFingerprint<T extends string>(
  value: string,
  allowed: readonly T[]
): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function normalizeFingerprintValue<T extends string>(
  value: string | undefined | null,
  allowed: readonly T[]
): T | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return isKnownFingerprint(normalized, allowed) ? normalized : undefined;
}

export function normalizeFingerprintArray<T extends string>(
  values: readonly string[] | undefined | null,
  allowed: readonly T[]
): T[] {
  if (!values) {
    return [];
  }

  const normalized = new Set<T>();

  for (const value of values) {
    const nextValue = normalizeFingerprintValue(value, allowed);
    if (nextValue) {
      normalized.add(nextValue);
    }
  }

  return Array.from(normalized);
}

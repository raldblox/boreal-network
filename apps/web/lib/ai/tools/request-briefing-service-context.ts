import {
  borealActorKindSchema,
  borealOutputKindSchema,
  borealRequestExecutionKindSchema,
  borealRequestRouteFamilySchema,
  borealSupplyKindSchema,
  normalizeFingerprintArray,
  normalizeFingerprintValue,
} from "@/lib/matching-fingerprints";
import type {
  RequestActorKind,
  RequestOutputKind,
  RequestPatch,
  RequestSupplyKind,
} from "@/lib/request";
import {
  requestFlowCardKinds,
  requestFlowStageIds,
  type RequestFlowCardKind,
  type RequestFlowStageId,
} from "@/lib/request-flow-taxonomy";

const serviceStarterActionIntents = ["create_request_draft"] as const;

type ServiceStarterActionIntent = (typeof serviceStarterActionIntents)[number];

type ServiceRoutingContextDefaults = {
  serviceFamilyKey?: string;
  servicePlanKey?: string;
  serviceAttachmentMode?: "request_starter_no_supply_attached";
  actorKinds: RequestActorKind[];
  supplyKinds: RequestSupplyKind[];
  outputKinds: RequestOutputKind[];
  serviceExecutionKind?: string;
  serviceRouteFamily?: string;
  requestFlowEntryStageId?: RequestFlowStageId;
  requestFlowCardKind?: RequestFlowCardKind;
  requestFlowPlanStageIds: RequestFlowStageId[];
  requestFlowNextActionIntents: ServiceStarterActionIntent[];
  requestFlowPresetPlanStageIds: RequestFlowStageId[];
  requestFlowPresetPlanRequiredBeforeExecution: string[];
};

export function hydrateServiceRoutingContextDefaults(
  patch: RequestPatch,
): RequestPatch {
  const serviceContext = parseServiceRoutingContext(patch.brief?.body);
  if (!serviceContext) {
    return patch;
  }

  const currentBrief = patch.brief ?? {};
  const currentConstraints = currentBrief.constraints ?? {};
  const nextConstraints = {
    ...currentConstraints,
    ...(serviceContext.serviceFamilyKey
      ? { serviceFamilyKey: serviceContext.serviceFamilyKey }
      : {}),
    ...(serviceContext.servicePlanKey
      ? { servicePlanKey: serviceContext.servicePlanKey }
      : {}),
    ...(serviceContext.serviceAttachmentMode
      ? { serviceAttachmentMode: serviceContext.serviceAttachmentMode }
      : {}),
    ...(serviceContext.serviceExecutionKind
      ? { serviceExecutionKind: serviceContext.serviceExecutionKind }
      : {}),
    ...(serviceContext.serviceRouteFamily
      ? { serviceRouteFamily: serviceContext.serviceRouteFamily }
      : {}),
    ...(serviceContext.requestFlowEntryStageId
      ? { requestFlowEntryStageId: serviceContext.requestFlowEntryStageId }
      : {}),
    ...(serviceContext.requestFlowCardKind
      ? { requestFlowCardKind: serviceContext.requestFlowCardKind }
      : {}),
    ...(serviceContext.requestFlowPlanStageIds.length > 0
      ? { requestFlowPlanStageIds: serviceContext.requestFlowPlanStageIds }
      : {}),
    ...(serviceContext.requestFlowNextActionIntents.length > 0
      ? {
          requestFlowNextActionIntents:
            serviceContext.requestFlowNextActionIntents,
        }
      : {}),
    ...(serviceContext.requestFlowPresetPlanStageIds.length > 0
      ? {
          requestFlowPresetPlanStageIds:
            serviceContext.requestFlowPresetPlanStageIds,
        }
      : {}),
    ...(serviceContext.requestFlowPresetPlanRequiredBeforeExecution.length > 0
      ? {
          requestFlowPresetPlanRequiredBeforeExecution:
            serviceContext.requestFlowPresetPlanRequiredBeforeExecution,
        }
      : {}),
  };
  const outputKinds = mergeUniqueValues(
    serviceContext.outputKinds,
    currentBrief.outputKinds ?? [],
  );
  const actorKinds = mergeUniqueValues(
    serviceContext.actorKinds,
    patch.seeking?.actorKinds ?? [],
  );
  const supplyKinds = mergeUniqueValues(
    serviceContext.supplyKinds,
    patch.seeking?.supplyKinds ?? [],
  );

  return {
    ...patch,
    brief: {
      ...currentBrief,
      ...(Object.keys(nextConstraints).length > 0
        ? { constraints: nextConstraints }
        : {}),
      ...(outputKinds.length > 0 ? { outputKinds } : {}),
    },
    ...(actorKinds.length > 0 || supplyKinds.length > 0
      ? {
          seeking: {
            ...(patch.seeking ?? {}),
            ...(actorKinds.length > 0 ? { actorKinds } : {}),
            ...(supplyKinds.length > 0 ? { supplyKinds } : {}),
          },
        }
      : {}),
  };
}

function parseServiceRoutingContext(
  body: string | undefined,
): ServiceRoutingContextDefaults | null {
  const marker = "Service routing context:";
  const markerIndex = body?.indexOf(marker) ?? -1;
  if (!body || markerIndex < 0) {
    return null;
  }

  const values = new Map<string, string>();
  const contextLines = body.slice(markerIndex + marker.length).split(/\r?\n/);
  for (const line of contextLines) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    values.set(normalizeServiceContextKey(match[1]), match[2].trim());
  }

  const actorKinds = normalizeFingerprintArray(
    splitServiceContextList(values.get("actor_kinds")),
    [...borealActorKindSchema.options],
  );
  const supplyKinds = normalizeFingerprintArray(
    splitServiceContextList(values.get("supply_kinds")),
    [...borealSupplyKindSchema.options],
  );
  const outputKinds = normalizeFingerprintArray(
    splitServiceContextList(values.get("output_kinds")),
    [...borealOutputKindSchema.options],
  );
  const serviceAttachmentMode = normalizeFingerprintValue(
    values.get("attachment_mode"),
    ["request_starter_no_supply_attached"] as const,
  );
  const serviceExecutionKind = normalizeFingerprintValue(
    values.get("execution_kind"),
    [...borealRequestExecutionKindSchema.options],
  );
  const serviceRouteFamily = normalizeFingerprintValue(
    values.get("route_family"),
    [...borealRequestRouteFamilySchema.options],
  );
  const serviceFamilyKey = normalizeServiceContextText(
    values.get("service_family"),
  );
  const servicePlanKey = normalizeServiceContextText(values.get("service_plan"));
  const requestFlowEntryStageId = normalizeFingerprintValue(
    values.get("request_flow_entry_stage"),
    [...requestFlowStageIds],
  );
  const requestFlowCardKind = normalizeFingerprintValue(
    values.get("request_flow_card_kind"),
    [...requestFlowCardKinds],
  );
  const requestFlowPlanStageIds = normalizeFingerprintArray(
    splitServiceContextList(values.get("request_flow_plan_stages")),
    [...requestFlowStageIds],
  );
  const requestFlowNextActionIntents = normalizeFingerprintArray(
    splitServiceContextList(values.get("request_flow_next_intents")),
    [...serviceStarterActionIntents],
  );
  const requestFlowPresetPlanStageIds = normalizeFingerprintArray(
    splitServiceContextList(values.get("preset_plan_stages")),
    [...requestFlowStageIds],
  );
  const requestFlowPresetPlanRequiredBeforeExecution = normalizeStringList(
    splitServiceContextList(values.get("preset_plan_requires_before_execution")),
  );

  if (
    !serviceFamilyKey &&
    !servicePlanKey &&
    !serviceAttachmentMode &&
    actorKinds.length === 0 &&
    supplyKinds.length === 0 &&
    outputKinds.length === 0 &&
    !serviceExecutionKind &&
    !serviceRouteFamily &&
    !requestFlowEntryStageId &&
    !requestFlowCardKind &&
    requestFlowPlanStageIds.length === 0 &&
    requestFlowNextActionIntents.length === 0 &&
    requestFlowPresetPlanStageIds.length === 0 &&
    requestFlowPresetPlanRequiredBeforeExecution.length === 0
  ) {
    return null;
  }

  return {
    ...(serviceFamilyKey ? { serviceFamilyKey } : {}),
    ...(servicePlanKey ? { servicePlanKey } : {}),
    ...(serviceAttachmentMode ? { serviceAttachmentMode } : {}),
    actorKinds,
    supplyKinds,
    outputKinds,
    ...(serviceExecutionKind ? { serviceExecutionKind } : {}),
    ...(serviceRouteFamily ? { serviceRouteFamily } : {}),
    ...(requestFlowEntryStageId ? { requestFlowEntryStageId } : {}),
    ...(requestFlowCardKind ? { requestFlowCardKind } : {}),
    requestFlowPlanStageIds,
    requestFlowNextActionIntents,
    requestFlowPresetPlanStageIds,
    requestFlowPresetPlanRequiredBeforeExecution,
  };
}

function normalizeServiceContextKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeServiceContextText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function splitServiceContextList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value.split(",").map((entry) => entry.trim());
}

function mergeUniqueValues<T extends string>(
  firstValues: readonly T[],
  secondValues: readonly T[],
): T[] {
  return Array.from(new Set([...firstValues, ...secondValues]));
}

function normalizeStringList(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

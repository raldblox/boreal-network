type MaybeArray = readonly string[] | string[] | null | undefined;

export type BorealQualificationRequest = {
  brief?: {
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    constraints?: Record<string, unknown> | null;
    outputKinds?: MaybeArray;
  } | null;
  seeking?: {
    actorKinds?: MaybeArray;
    supplyKinds?: MaybeArray;
    notes?: string | null;
  } | null;
  derived?: {
    executionKind?: string | null;
    routeSummary?: string | null;
    seeking?: {
      supplyKinds?: MaybeArray;
    } | null;
    executionProfile?: {
      executionModes?: MaybeArray;
      requiresHumanPresence?: boolean;
      requiresLocalAccess?: boolean;
      requiresVerifiedEvidence?: boolean;
    } | null;
    embodiedConstraintSet?: {
      executionModes?: MaybeArray;
      verificationRequirements?: MaybeArray;
      requiresHumanPresence?: boolean;
      requiresLocalAccess?: boolean;
      requiresVerifiedEvidence?: boolean;
      requiresWitness?: boolean;
    } | null;
    verificationPlan?: {
      requiredEvidenceClaims?: MaybeArray;
      requiredArtifactKinds?: MaybeArray;
      mustHaveLocationSignal?: boolean;
      mustHaveSignature?: boolean;
    } | null;
    workerEligibility?: {
      policy?: string | null;
      humanRequired?: boolean;
      skipProviderOnlyAgents?: boolean;
      skipReasons?: MaybeArray;
    } | null;
  } | null;
  constraints?: Record<string, unknown> | null;
};

const hardHumanOrLocalSupplyKinds = new Set([
  "field_inspection",
  "field_verification",
  "hardware_ops",
  "human_service",
  "local_runner",
  "pickup_dropoff",
]);

const physicalProofOutputKinds = new Set([
  "handoff_receipt",
  "inspection_report",
  "photo_evidence",
  "serial_inventory",
  "signature",
]);

const physicalEvidenceClaims = new Set([
  "delivery_confirmation",
  "handoff_signature",
  "photo_proof",
  "serial_number_capture",
  "timestamped_photos",
]);

const embodiedExecutionModes = new Set([
  "field_inspection",
  "onsite_visit",
  "pickup_dropoff",
  "witnessed_handoff",
]);

const hardConstraintBooleans = [
  "requiresHumanPresence",
  "requiresLocalAccess",
  "requiresFieldProof",
  "requiresPhysicalVerification",
  "requiresPickup",
  "requiresDropoff",
  "requiresDelivery",
  "requiresWitness",
] as const;

const humanOrLocalTextSignals = [
  "field proof",
  "field verification",
  "human presence",
  "local access",
  "on-site",
  "onsite",
  "photo evidence",
  "photo proof",
  "physical delivery",
  "physical verification",
  "pickup",
  "pick up",
  "dropoff",
  "drop off",
  "storefront photo",
  "timestamped photo",
  "witnessed handoff",
];

export function requiresHumanOrLocalWorker(
  request: BorealQualificationRequest,
  options: { includeHumanActorKind?: boolean } = {},
) {
  return (
    collectHumanOrLocalQualificationSignals(request, options).length > 0
  );
}

export function collectHumanOrLocalQualificationSignals(
  request: BorealQualificationRequest,
  options: { includeHumanActorKind?: boolean } = {},
) {
  const includeHumanActorKind = options.includeHumanActorKind ?? true;
  const signals = new Set<string>();
  const actorKinds = stringArray(request.seeking?.actorKinds);
  const requestSupplyKinds = [
    ...stringArray(request.derived?.seeking?.supplyKinds),
    ...stringArray(request.seeking?.supplyKinds),
  ];
  const outputKinds = stringArray(request.brief?.outputKinds);
  const executionKind = request.derived?.executionKind ?? "";
  const workerEligibility = request.derived?.workerEligibility;
  const executionModes = [
    ...stringArray(request.derived?.executionProfile?.executionModes),
    ...stringArray(request.derived?.embodiedConstraintSet?.executionModes),
  ];
  const verificationRequirements = [
    ...stringArray(
      request.derived?.embodiedConstraintSet?.verificationRequirements,
    ),
    ...stringArray(request.derived?.verificationPlan?.requiredEvidenceClaims),
    ...stringArray(
      request.derived?.verificationPlan?.requiredArtifactKinds,
    ),
    ...stringArray(
      request.brief?.constraints?.verificationRequirements as MaybeArray,
    ),
    ...stringArray(
      request.constraints?.verificationRequirements as MaybeArray,
    ),
  ];

  if (includeHumanActorKind && actorKinds.some(isHumanActorKind)) {
    signals.add("human_actor_kind");
  }

  if (requestSupplyKinds.some((kind) => hardHumanOrLocalSupplyKinds.has(kind))) {
    signals.add("human_or_local_supply_kind");
  }

  if (outputKinds.some((kind) => physicalProofOutputKinds.has(kind))) {
    signals.add("physical_proof_output_kind");
  }

  if (isHumanOrLocalExecutionKind(executionKind)) {
    signals.add("human_or_local_execution_kind");
  }

  if (workerEligibility?.humanRequired) {
    signals.add("worker_eligibility_human_required");
  }

  if (workerEligibility?.policy === "human_first_skip_agents") {
    signals.add("worker_eligibility_human_first_skip_agents");
  }

  if (
    workerEligibility?.skipProviderOnlyAgents &&
    stringArray(workerEligibility.skipReasons).includes("human_required_boundary")
  ) {
    signals.add("worker_eligibility_provider_skip_boundary");
  }

  if (executionModes.some((mode) => embodiedExecutionModes.has(mode))) {
    signals.add("embodied_execution_mode");
  }

  for (const constraints of [
    request.brief?.constraints,
    request.constraints,
  ]) {
    if (constraints) {
      for (const key of hardConstraintBooleans) {
        if (constraints[key] === true) {
          signals.add(`constraint_${key}`);
        }
      }

      if (
        constraints.requiresVerifiedEvidence === true &&
        verificationRequirements.some((claim) =>
          physicalEvidenceClaims.has(claim),
        )
      ) {
        signals.add("verified_physical_evidence_required");
      }
    }
  }

  if (request.derived?.executionProfile?.requiresHumanPresence) {
    signals.add("execution_profile_requires_human_presence");
  }

  if (request.derived?.executionProfile?.requiresLocalAccess) {
    signals.add("execution_profile_requires_local_access");
  }

  if (request.derived?.embodiedConstraintSet?.requiresHumanPresence) {
    signals.add("embodied_requires_human_presence");
  }

  if (request.derived?.embodiedConstraintSet?.requiresLocalAccess) {
    signals.add("embodied_requires_local_access");
  }

  if (request.derived?.embodiedConstraintSet?.requiresWitness) {
    signals.add("embodied_requires_witness");
  }

  if (
    request.derived?.embodiedConstraintSet?.requiresVerifiedEvidence &&
    verificationRequirements.some((claim) => physicalEvidenceClaims.has(claim))
  ) {
    signals.add("embodied_physical_evidence_required");
  }

  if (request.derived?.verificationPlan?.mustHaveLocationSignal) {
    signals.add("verification_requires_location_signal");
  }

  if (request.derived?.verificationPlan?.mustHaveSignature) {
    signals.add("verification_requires_signature");
  }

  if (verificationRequirements.some((claim) => physicalEvidenceClaims.has(claim))) {
    signals.add("physical_evidence_claim");
  }

  const text = normalizeSignalText([
    request.brief?.title,
    request.brief?.summary,
    request.brief?.body,
    request.seeking?.notes,
    request.derived?.routeSummary,
    executionKind,
  ]);

  if (humanOrLocalTextSignals.some((signal) => text.includes(signal))) {
    signals.add("human_or_local_text_signal");
  }

  return Array.from(signals);
}

function stringArray(value: MaybeArray) {
  if (typeof value === "string") {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeSignalText(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function isHumanActorKind(value: string) {
  return value.toLowerCase().replace(/[-\s]+/g, "_").includes("human");
}

function isHumanOrLocalExecutionKind(value: string) {
  const normalized = value.toLowerCase().replace(/[-\s]+/g, "_");

  return ["human", "field", "local", "embodied", "onsite"].some((token) =>
    normalized.includes(token),
  );
}

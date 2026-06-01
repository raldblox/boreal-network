const ALLOWED_POLICY_ACTIONS = [
  "clarify_request",
  "show_lead_shortlist",
  "show_team_plan",
  "draft_commitment",
  "open_request",
  "create_fulfillment",
  "block_and_escalate"
];

const OUTPUT_SHAPE_TEXT = `{
  "schemaVersion": 1,
  "scenarioId": "<copy input scenarioId>",
  "extraction": {
    "title": "string",
    "summary": "string",
    "seeking": {
      "actorKinds": ["string"],
      "supplyKinds": ["string"]
    },
    "outputKinds": ["string"],
    "missingDetails": ["string"],
    "constraints": {}
  },
  "routing": {
    "routeFamily": "string",
    "complexityLevel": "low|medium|high",
    "needsPlan": true,
    "humanRequired": true,
    "needsClarification": false
  },
  "planning": {
    "leadRole": "string",
    "executionProfile": {},
    "verificationPlan": {},
    "planCollapseRisk": {},
    "phases": [
      {
        "phaseKey": "string",
        "title": "string"
      }
    ],
    "roleSlots": [
      {
        "roleKey": "string",
        "requiredActorKinds": ["string"],
        "required": true
      }
    ],
    "noMicrotaskExplosion": true
  },
  "matching": {
    "leadRanking": ["candidate supplyId"],
    "roleMatches": {
      "roleKey": "candidate supplyId"
    }
  },
  "policy": {
    "nextAction": "one allowed action",
    "requiresOwnerApproval": true,
    "shouldOpenRequest": true,
    "shouldCreateFulfillment": false,
    "shouldCreateFulfillmentSteps": false
  }
}`;

const COMMON_BASELINE_RULES = [
  "Return exactly one JSON object and no surrounding prose.",
  "Use only facts from the request input and the candidate supply list.",
  "Do not invent budget, deadline, location, access, proof, or staffing facts that were not given.",
  "Rank and reference only the supplied candidate supplyIds.",
  "Choose the lead supply before adding optional collaborator roles.",
  "Keep the plan bounded. Avoid microtask explosion and do not emit a long task tree when a small phase plan is enough.",
  "If the request implies onsite work, field inspection, pickup or dropoff, witnessed handoff, local access, physical measurement, or location-specific proof, preserve those requirements explicitly.",
  "Generated summaries, checklists, or reports are not proof that physical work happened.",
  "If missing location, access, timing, safety, or proof details materially change executability, mark that through clarification-safe routing and policy rather than pretending the work is ready.",
  "Do not set shouldCreateFulfillment or shouldCreateFulfillmentSteps to true unless the scenario explicitly provides accepted approval and execution context."
];

const CANONICAL_NORMALIZATION_RULES = [
  "Use normalized snake_case output labels instead of prose labels whenever a field is categorical or contract-facing.",
  "Normalize budget ranges into budgetCurrency, budgetMin, and budgetMax when the request states a currency and range.",
  "Normalize service location into serviceLocation and time windows into timeWindows when they are explicitly stated.",
  "Normalize embodied proof requirements into requiresHumanPresence, requiresVerifiedEvidence, and verificationRequirements when supported by the request.",
  "Treat public storefront or exterior photo visits as embodied work with geography and proof, but do not force access requirements unless private, controlled, permissioned, pickup, dropoff, or handoff access is stated.",
  "Use compact normalized role keys such as field_inspector, migration_lead, automation_builder, qa_documentation, and documentation_support rather than human-readable role titles.",
  "Use normalized outputKinds such as inspection_report, photo_evidence, issue_log, migration_plan, workflow_build, handoff_doc, and operator_training rather than raw prose.",
  "For embodied work, executionProfile should use executionModes, requiresHumanPresence, requiresLocalAccess, requiresVerifiedEvidence, requiresScheduling, requiresGeography, and riskTier when those claims are justified.",
  "For embodied work, verificationPlan should use requiredArtifactKinds, requiredEvidenceClaims, mustHaveOwnerAcceptance, mustHaveLocationSignal, and mustHaveSignature when those claims are justified.",
  "For collapse-risk reporting, use planCollapseRisk.riskLevel plus planCollapseRisk.reasons[].",
  "Use routeFamily values such as worker_market, direct_specialist, direct_tool, or no_good_fit rather than freeform route prose.",
  "Mark routing.needsClarification true only when missing facts materially change route selection, execution modality, or closure safety. Do not force clarification for execution details when the lead route is already credible."
];

const PROMPT_PRESETS = {
  neutral_contract_v1: {
    id: "neutral_contract_v1",
    label: "Neutral Contract v1",
    description:
      "A neutral structured-eval prompt that tells the model to extract, route, plan, match, and choose a safe next action without exposing fixture expectations.",
    systemIntro:
      "You are evaluating work requests against a fixed structured orchestration contract. Produce faithful structured output, not persuasive prose."
  },
  neutral_contract_v2: {
    id: "neutral_contract_v2",
    label: "Neutral Contract v2",
    description:
      "A neutral structured-eval prompt that preserves the v1 neutrality while making the canonical output vocabulary explicit, so benchmark failures reflect planning quality instead of label drift.",
    systemIntro:
      "You are evaluating work requests against a fixed structured orchestration contract. Produce faithful structured output, not persuasive prose.",
    canonicalNormalization: true
  },
  boreal_canon_v1: {
    id: "boreal_canon_v1",
    label: "Boreal Canon v1",
    description:
      "A Boreal-house prompt that freezes the request-native lead-first rules from canon and asks for the same structured output contract.",
    systemIntro:
      "You are applying Boreal's request-native orchestration contract. Preserve one demand-side work thread, match the lead first, plan the work second, and decompose only when needed."
  },
  boreal_canon_v2: {
    id: "boreal_canon_v2",
    label: "Boreal Canon v2",
    description:
      "A Boreal-house prompt that keeps the request-native lead-first rules from canon and also freezes the canonical structured output vocabulary for fair comparison against the neutral v2 prompt.",
    systemIntro:
      "You are applying Boreal's request-native orchestration contract. Preserve one demand-side work thread, match the lead first, plan the work second, and decompose only when needed.",
    canonicalNormalization: true
  }
};

function jsonBlock(value) {
  return JSON.stringify(value, null, 2);
}

export function listLivePromptPresetIds() {
  return Object.keys(PROMPT_PRESETS);
}

export function getLivePromptPreset(presetId) {
  const preset = PROMPT_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown live prompt preset: ${presetId}`);
  }

  return preset;
}

export function buildLiveEvalPrompt({ fixture, presetId }) {
  const preset = getLivePromptPreset(presetId);
  const baseRules = [...COMMON_BASELINE_RULES];

  if (presetId === "boreal_canon_v1" || presetId === "boreal_canon_v2") {
    baseRules.unshift("Match the lead first. Plan the work second. Decompose only when needed.");
    baseRules.unshift("Treat the request as the durable demand-side root of the work thread.");
  }

  if (preset.canonicalNormalization === true) {
    baseRules.push(...CANONICAL_NORMALIZATION_RULES);
  }

  const system = `${preset.systemIntro}

Rules:
${baseRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}

Allowed policy.nextAction values:
${ALLOWED_POLICY_ACTIONS.map((value) => `- ${value}`).join("\n")}

Required output shape:
${OUTPUT_SHAPE_TEXT}`;

  const prompt = `Scenario ID:
${fixture.scenarioId}

Request actor:
${jsonBlock(fixture.requestInput.actor)}

Raw request:
${fixture.requestInput.rawAsk}

Candidate supplies:
${jsonBlock(fixture.candidateSupplies)}

Return the JSON object now.

Additional output requirements:
- Copy the input scenarioId into output.scenarioId.
- Keep schemaVersion set to 1.
- Use an empty array or empty object when a subfield is relevant but no value is justified.
- For non-embodied requests, executionProfile, verificationPlan, and planCollapseRisk may stay empty objects if no stronger claim is supported.
- For embodied or verification-heavy requests, executionProfile, verificationPlan, and planCollapseRisk should be explicit.
- leadRanking should list the best candidates first.
- roleMatches should only map roles that are actually justified by the request.`;

  return {
    preset,
    system,
    prompt,
    schemaName: "request_processing_eval_output",
    schemaDescription:
      "Structured request-processing output covering extraction, routing, planning, matching, and safe next-action policy."
  };
}

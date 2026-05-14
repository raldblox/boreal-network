# Phase 0 Implementation Spec

Status: implementation planning note

This is the first concrete implementation slice for embodied-fulfillment planner honesty.
It is intentionally narrower than the full architecture note.

Goal:

- stop false digital-only plans
- make request planning honest about human, onsite, and proof-heavy work
- do this without changing Boreal's first commercial wedge or introducing a new durable root object

## 1. Scope

Phase 0 covers:

- request prompting
- planner output shape
- policy behavior
- eval fixtures
- closure safety rules

Phase 0 does not cover:

- public local-services marketplace
- new mobile worker app
- route optimization
- end-to-end field-service dispatch
- canonizing fully typed embodied durable fields

## 2. Primary Write Targets

Prompt and request-mode behavior:

- `apps/web/lib/ai/prompts.ts`

Current mutation tools that should accept richer constraints:

- `apps/web/lib/ai/tools/update-request-brief.ts`
- `apps/web/lib/ai/tools/update-request-constraints.ts`
- `apps/web/lib/ai/tools/publish-artifact.ts`

Current request write path:

- `apps/web/lib/request-server.ts`

Chat route that wires tools into runtime behavior:

- `apps/web/app/(chat)/api/chat/route.ts`

Contract and canon files:

- `docs/REQUEST_PROCESSING.md`
- `docs/TOOL_CALLING_CONTRACTS.md`
- `docs/EVALS.md`
- `docs/TEST_MATRIX.md`
- `docs/LIVE_VS_TARGET.md`

Fixtures:

- `fixtures/request/`

Eval runner:

- `tests/contracts/run-request-processing-evals.mjs`

## 3. Prompt Rewrite Requirements

### 3.1 Replace "brief improver" logic with "reality compiler" logic

The request prompt should teach the model to do this internally before tool choice:

1. extract outcome claims
2. detect non-substitutable claims
3. classify execution modality
4. detect missing embodied constraints
5. plan proof obligations
6. audit whether the current plan would fake completion

### 3.2 Add hard anti-substitution rules

The prompt should explicitly forbid replacing these with generated text alone:

- onsite inspection
- field verification
- witnessed handoff
- document pickup or dropoff
- physical measurement
- event attendance proof
- location-specific photography or video

### 3.3 Allow clarification when needed

Current request-mode behavior over-optimizes for immediate object mutation.

New rule:

- if missing location, access, time-window, safety, or proof fields materially change the route, the system may and should clarify before pretending the request is ready

### 3.4 Suggested prompt block

Add a block conceptually equivalent to:

```text
You are optimizing for real-world executability, not fluent plan text.

Before choosing a request action:
1. Extract the buyer's outcome claims.
2. Mark which claims are non-substitutable by digital generation alone.
3. For each non-substitutable claim, require an execution modality, a capable human or field-capable supply when needed, and a proof path.
4. If required location, access, timing, safety, or proof facts are missing, prefer clarification over plan completion.
5. Never substitute onsite work, witnessing, pickup, delivery, inspection, or measurement with generated summaries or checklists.
6. Do not allow closure when non-substitutable claims lack explicit steps or proof obligations.
```

## 4. Derived Output Shape

Do not add new durable roots.
Do add new derived planner outputs.

Suggested planning payload additions:

```json
{
  "planning": {
    "executionProfile": {
      "executionModes": ["remote_digital", "onsite_visit"],
      "requiresHumanPresence": true,
      "requiresLocalAccess": true,
      "requiresVerifiedEvidence": true,
      "requiresScheduling": true,
      "requiresGeography": true,
      "riskTier": "moderate"
    },
    "embodiedConstraintSet": {
      "serviceAddressKnown": false,
      "timeWindowKnown": false,
      "accessRequirementsKnown": false,
      "witnessRequired": false
    },
    "verificationPlan": {
      "requiredArtifactKinds": ["evidence", "delivery"],
      "requiredEvidenceClaims": ["location_capture", "timestamp", "media_hash"],
      "mustHaveOwnerAcceptance": true,
      "mustHaveLocationSignal": true,
      "mustHaveSignature": false
    },
    "planCollapseRisk": {
      "riskLevel": "high",
      "reasons": [
        "request implies onsite verification",
        "current plan contains only remote digital steps"
      ]
    }
  }
}
```

These outputs should remain derived and rebuildable in Phase 0.

## 5. Constraint Conventions To Persist Now

Until stronger typed canon lands, use explicit conventions inside existing flexible shapes.

Suggested request conventions:

- `brief.constraints.executionModes`
- `brief.constraints.requiresHumanPresence`
- `brief.constraints.serviceLocation`
- `brief.constraints.timeWindows`
- `brief.constraints.accessRequirements`
- `brief.constraints.safetyRequirements`
- `brief.constraints.verificationRequirements`
- `brief.constraints.requiresWitness`

Suggested supply conventions:

- `capability.executionModes`
- `capability.verificationCapabilities`
- `availability.serviceArea`
- `availability.timeWindows`
- `metadata.trustTier`

Suggested artifact conventions:

- `metadata.evidenceClaims`
- `metadata.captureTime`
- `metadata.location`
- `metadata.locationAccuracyMeters`
- `metadata.captureIntegrity`
- `metadata.witness`

## 6. Policy Rules

Add these rules to policy behavior.

### 6.1 Clarify before false readiness

If embodied work is detected and any of these are missing:

- place
- access
- timing
- proof type
- safety

then `nextAction` should prefer:

- `clarify_request`

### 6.2 Block digital-only collapse

If a request implies onsite or human-executed work but the plan contains only digital steps:

- `nextAction` should be `block_and_escalate` or `clarify_request`

### 6.3 Block false closure

If proof obligations are unresolved:

- no `resolve_request`
- no final completion state

## 7. Eval Fixture Additions

Add at least three new fixtures under `fixtures/request/`.

Recommended scenarios:

1. onsite property inspection with digital report
2. document pickup and witnessed handoff
3. hardware installation verification with photo proof

Each fixture should test:

- embodied-step recall
- missing-field clarification
- no digital-only substitution
- proof-planning presence
- no false closure

## 8. Eval Runner Changes

Extend `tests/contracts/run-request-processing-evals.mjs` to validate:

- `planning.executionProfile`
- `planning.verificationPlan`
- `planning.planCollapseRisk`

Add negative assertions such as:

- `must_not_flatten_onsite_work_into_digital_only_plan`
- `must_not_allow_false_closure_without_proof`
- `must_require_clarification_for_missing_embodied_constraints`

## 9. Acceptance Criteria

Phase 0 is successful when:

- the prompt stops omitting obvious onsite or human-required steps
- the planner emits explicit embodied and verification outputs for the new fixtures
- policy clarifies or blocks instead of pretending the plan is complete
- evals fail for digital-only substitution on embodied scenarios

## 10. Non-Goals

Do not do these in Phase 0:

- add a second root object
- redesign the public wedge into local physical services
- introduce route optimization or dispatch as required dependencies
- claim trustworthy field proof from GPS alone
- treat generated text as evidence of physical completion

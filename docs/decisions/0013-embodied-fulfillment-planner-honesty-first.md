# 0013 Embodied Fulfillment Planner Honesty First

## Status

Accepted

## Date

2026-05-15

## Context

Boreal's canon already says one durable `Request` should survive intake, routing, `Commitment`, `Fulfillment`, proof, and payout.

The current planner and request-briefing stack is still biased toward digitally executable work:

- request briefing optimizes for a cleaner digital brief
- planner outputs do not explicitly model physical presence, local access, or verification-heavy work
- generic constraint fields do not force the system to represent embodied execution requirements
- the system can produce polished digital plans even when the real request requires onsite work, witnessed handoff, field inspection, pickup or dropoff, or other non-substitutable human execution

This creates a failure mode where the system can look complete while omitting the actual real-world work needed for completion.

The current commercial wedge remains:

- startup and SMB buyers of high-value digital work

That wedge should not be silently replaced with a broad local-services market.

## Decision

### 1. Keep the current wedge, but make the planner honest about embodied work

Boreal does not expand its first wedge into a generic local physical-services marketplace through this decision.

Instead:

- embodied work is treated as a high-trust, narrow, exception or extension lane
- the planner must detect when a request cannot be truthfully satisfied by digital generation alone

### 2. Non-substitutable work must be represented explicitly

If a request implies:

- onsite visit
- field inspection
- pickup or dropoff
- witnessed handoff
- human measurement
- human presence
- verification-heavy real-world execution

then the decision layer must not collapse that work into a digital-only plan, generated summary, or generic checklist.

It must instead derive explicit embodied execution and verification requirements.

### 3. Planner honesty comes before planner automation

The first implementation goal is not fully automating embodied work.

The first goal is:

- detecting embodied requirements
- surfacing missing place, access, time, safety, or proof constraints
- blocking false closure when those constraints are unresolved

### 4. Clarification is allowed when embodied constraints materially affect route or proof

The draft request flow should usually update the object first.

However, if missing fields materially affect:

- execution modality
- geography
- access
- scheduling
- proof requirements
- closure safety

then clarification is preferred over pretending the request is ready.

### 5. Add explicit derived planning objects before canonizing new durable fields

The first derived planning objects for this lane are:

- `ExecutionProfile`
- `EmbodiedConstraintSet`
- `VerificationPlan`
- `PlanCollapseRisk`

These remain read-only, rebuildable planner outputs at first.

Do not introduce a new durable root object for embodied work.
`Request` remains the durable root.

### 6. Closure must be proof-aware

When a request includes non-substitutable embodied work:

- required embodied steps must exist in the execution plan
- required proof obligations must be attached to the route
- generated summaries alone must not qualify as completion

### 7. Phase 0 scope is prompt, planner, policy, and evals

The first accepted implementation slice is:

- upgrade request prompting and planner behavior
- add embodied requirement detection
- add verification planning
- add anti-false-completion policy checks
- add embodied eval fixtures

Do not start with a public local-services market.
Do not start by replacing Boreal truth with a field-service platform.

## Consequences

### Accepted

- future request prompting must optimize for executability, not only brief polish
- planner and policy work must detect and block digital-only collapse on embodied requests
- draft request flows may clarify when embodied or verification-critical fields are missing
- evals must include omission and false-closure cases for embodied work
- Boreal can explore private or curated embodied lanes without changing the first public wedge

### Rejected

- silently treating all requests as digitally satisfiable
- substituting generated summaries for physical proof
- introducing a second durable root object for embodied work
- expanding the first commercial wedge into broad public local services by implication

## Implementation Notes

Canon files that should reflect this decision:

- `docs/REQUEST_PROCESSING.md`
- `docs/TOOL_CALLING_CONTRACTS.md`
- `docs/EVALS.md`
- `docs/TEST_MATRIX.md`
- `docs/LIVE_VS_TARGET.md`

Research and exploratory design material may live under:

- `docs/papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/`

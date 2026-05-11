# Request Processing

This file defines Boreal's canonical request-processing flow before durable mutations are committed.

## Core Rule

Match the lead first.
Plan the work second.
Decompose only when needed.

Do not silently turn ordinary chat into a durable request.
`Request` creation must stay explicit.

Do not explode a raw ask into a task tree before Boreal knows who should own the work.

## Processing Layers

1. Conversation layer
   The owner speaks naturally.
2. Decision layer
   Boreal extracts meaning, classifies route, retrieves supply, ranks candidates, and decides the next action.
3. Execution layer
   Only approved mutation tools write `Request`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, or `Transaction`.

## Canonical Flow

1. Intake
   Capture the raw ask plus actor context.
2. Explicit request creation gate
   Stay chat-only until the owner or policy explicitly chooses to open a `Request`.
3. Request draft
   Produce a derived `RequestDraft`.
4. Draft normalization
   Produce a derived `MatchSpec` with brief, output kinds, constraints, budget, urgency, and actor requirements.
   In the web request-briefing surface, manual editing may touch only the draft-input projection.
   Before `save draft`, request-tool mutation, or `open request`, normalize that draft-input projection back into the same durable `Request`.
   If one user turn explicitly includes brief text plus budget or deadline, the request-brief mutation layer should preserve both the narrative brief and the structured canonical fields in the same write.
5. Complexity and route classification
   Decide complexity, route family, and whether clarification is required.
6. Lead retrieval
   Search `Supply` for lead-owner candidates first.
7. Lead ranking
   Rank lead candidates by capability fit, budget fit, deadline fit, trust, and route confidence.
8. Clarification gate
   Ask only for missing fields that materially change routing or funding.
9. Fulfillment planning
   For medium or high complexity work, derive a `RoutePlan` with `RoleSlot` and `PhasePlan` outputs.
10. Team assembly
   Match optional collaborator slots only after a credible lead route exists, except bounded direct-tool routes.
11. Commitment drafting
   Produce the commercial shape Boreal wants the owner to review.
12. Funding gate
   If the route requires funding, move through `Commitment` before execution.
13. Fulfillment creation
   Open one accepted execution lane.
14. Delivery and resolution
   Publish `Artifact`, settle `Transaction`, and resolve the `Request`.

## Complexity Policy

- `low`
  One lead route, no decomposition required.
- `medium`
  One lead route plus phases.
- `high`
  One lead route plus collaborator slots or explicit phase boundaries.

Low-complexity requests should not be turned into microtask plans.

## Derived Planning Objects

These objects are derived and rebuildable, not durable roots:

- `RequestDraft`
- `MatchSpec`
- `RoutePlan`
- `RoleSlot`
- `PhasePlan`
- `MatchCandidate`
- `RoleMatchCandidate`

## Invariants

- `Request` remains the durable root.
- Planner and matcher outputs are read-only.
- Policy selects the next safe action.
- Mutation tools are the only layer allowed to commit canonical writes.
- Once a request draft exists, subsequent briefing updates should mutate the same `Request` instead of forking a second durable demand object.
- Draft-mode manual editing must stay limited to user-editable request-input fields; system-owned fields remain server-owned and rebuildable.
- `FulfillmentStep` is the default home for generated sub-work.
- A new `Request` is only justified by a new funding, ownership, routing, or review boundary.

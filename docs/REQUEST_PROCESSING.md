# Request Processing

This file defines Boreal's canonical request-processing flow before durable mutations are committed.

## Core Rule

Match the lead first.
Plan the work second.
Decompose only when needed.

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
2. Request draft
   Produce a derived `RequestDraft`.
3. Draft normalization
   Produce a derived `MatchSpec` with brief, output kinds, constraints, budget, urgency, and actor requirements.
4. Complexity and route classification
   Decide complexity, route family, and whether clarification is required.
5. Lead retrieval
   Search `Supply` for lead-owner candidates first.
6. Lead ranking
   Rank lead candidates by capability fit, budget fit, deadline fit, trust, and route confidence.
7. Clarification gate
   Ask only for missing fields that materially change routing or funding.
8. Fulfillment planning
   For medium or high complexity work, derive a `RoutePlan` with `RoleSlot` and `PhasePlan` outputs.
9. Team assembly
   Match optional collaborator slots only after a credible lead route exists, except bounded direct-tool routes.
10. Commitment drafting
   Produce the commercial shape Boreal wants the owner to review.
11. Funding gate
   If the route requires funding, move through `Commitment` before execution.
12. Fulfillment creation
   Open one accepted execution lane.
13. Delivery and resolution
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
- `FulfillmentStep` is the default home for generated sub-work.
- A new `Request` is only justified by a new funding, ownership, routing, or review boundary.

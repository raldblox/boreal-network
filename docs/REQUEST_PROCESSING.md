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
   In the web `New request` mode, entering the mode alone must not create a durable `Request`.
   The first durable draft should be created only when the owner sends the first request brief turn or uses another explicit create action.
3. Request draft
   Produce a derived `RequestDraft`.
4. Draft normalization
   Produce a derived `MatchSpec` with brief, output kinds, constraints, budget, urgency, and actor requirements.
   In the web request-briefing surface, manual editing may touch only the draft-input projection.
   Before `save draft`, request-tool mutation, or `open request`, normalize that draft-input projection back into the same durable `Request`.
   If one user turn explicitly includes brief text plus budget or deadline, the request-brief mutation layer should preserve both the narrative brief and the structured canonical fields in the same write.
   Title and body are the first readiness-bearing brief fields. `brief.summary` is optional compression and should not be manufactured only to satisfy readiness.
   Matching-facing structure should prefer top-level `seeking` criteria instead of overloading `brief.tags`.
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

## Open Request Room Rule

Once a request leaves `draft`, the room should stop behaving like request-brief intake.

Open request room behavior should prefer:

- `Commitment` for pricing, quotes, and formal proposals
- `Artifact` for drafts, proof, files, and deliveries
- `RequestEvent` for durable visible activity

If a resolver runtime does not share chat context, it should prefer direct request resource APIs for these writes instead of going through the chat mutation layer.
That runtime should authenticate with a Boreal-issued resolver token after explicit web approval, not by treating raw Codex auth as the request actor.

The first direct resolver lane in `apps/web` should support:

- `POST /api/requests/{id}/commitments`
- `PATCH /api/commitments/{id}` with `accept`
- `POST /api/requests/{id}/fulfillments`
- `PATCH /api/fulfillments/{id}`

The request root should update through:

- lifecycle status
- `activeRefs`
- `latest`

Do not start fulfillment in `active` state while the request is still `funding_required`.

Do not treat every open-room message as a brief rewrite.

## Visibility Rule

- `draft` requests remain owner-scoped.
- `open` plus `private` requests remain owner-controlled or invite-only.
- `open` plus `public` requests may enter the public request pool and be fetched by outside supply or Boreal desktop participants.
- Public pool reads should expose a public-safe projection, not owner-only draft fields.

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
- `brief.summary` may stay blank without blocking `ready_to_open` when title and body are already present.
- `brief.tags` may exist as optional labels, but matching prep should prefer `seeking`.
- `FulfillmentStep` is the default home for generated sub-work.
- A new `Request` is only justified by a new funding, ownership, routing, or review boundary.
- open request rooms should prefer adjacent durable objects plus request projection updates over inlining response history on the request root
- direct resolver APIs and chat mutation tools should map to the same durable request-side writes

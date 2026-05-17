# Request Processing

This file defines Boreal's canonical request-processing flow before durable mutations are committed.

## Core Rule

Match the lead first.
Plan the work second.
Decompose only when needed.
Complete the work, not just generate the answer.

Do not silently turn ordinary chat into a durable request.
`Request` creation must stay explicit.

Do not explode a raw ask into a task tree before Boreal knows who should own the work.

## Processing Layers

1. Conversation layer
   The owner speaks naturally.
2. Decision layer
   Boreal extracts meaning, classifies route, retrieves supply, ranks candidates, and decides the next action.
   Optional request-briefing assist profiles may normalize terse asks into a clearer derived brief shape inside this layer, but they remain read-only and non-durable until a mutation tool writes the `Request`.
3. Execution layer
   Only approved mutation tools write `Request`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, or `Transaction`.

## Canonical Flow

1. Intake
   Capture the raw ask plus actor context.
2. Explicit request creation gate
   Stay chat-only until the owner or policy explicitly chooses to open a `Request`.
   In the web `New request` mode, entering the mode alone must not create a durable `Request`.
   The first durable draft should be created only when the owner sends the first request brief turn or uses another explicit create action.
   Selecting one owned supply from the web supply hub may count as that explicit create action for a private request, but it should pin `routing.preferredSupplyId`, seed request-side matching intent from that supply, and still avoid injecting synthetic brief text on the owner's behalf.
   Optional request-briefing assist may restructure that first turn for clarity, but it must still end in exactly one `create_request_brief` mutation instead of a parallel hidden write path.
3. Request draft
   Produce a derived `RequestDraft`.
4. Draft normalization
   Produce a derived `MatchSpec` with brief, output kinds, constraints, budget, urgency, and actor requirements.
   In the web request-briefing surface, manual editing may touch only the draft-input projection.
   That editable projection is limited to `visibility`, `brief`, `seeking`, `budget`, and `deadline`.
   Ids, status, routing, active refs, latest summary, timestamps, and planner projections must remain read-only.
   Before `save draft`, request-tool mutation, or `open request`, normalize that draft-input projection back into the same durable `Request`.
   If one user turn explicitly includes brief text plus budget or deadline, the request-brief mutation layer should preserve both the narrative brief and the structured canonical fields in the same write.
   Title and body are the first readiness-bearing brief fields. `brief.summary` is optional compression and should not be manufactured only to satisfy readiness.
   Matching-facing structure should prefer top-level `seeking` criteria instead of overloading `brief.tags`.
   If the ask implies onsite work, field inspection, pickup or dropoff, witnessed handoff, local access, or other non-substitutable human execution, the decision layer should derive explicit embodied execution and verification requirements instead of flattening the request into digital-only work.
5. Complexity and route classification
   Decide complexity, route family, and whether clarification is required.
6. Lead retrieval
   Search `Supply` for lead-owner candidates first.
7. Lead ranking
   Rank lead candidates by capability fit, budget fit, deadline fit, trust, and route confidence.
8. Clarification gate
   Ask only for missing fields that materially change routing, funding, execution modality, geography, access, scheduling, proof requirements, or closure safety.
9. Fulfillment planning
   For medium or high complexity work, derive a `RoutePlan` with `RoleSlot` and `PhasePlan` outputs.
   When embodied or verification-heavy work is detected, also derive an `ExecutionProfile`, `EmbodiedConstraintSet`, `VerificationPlan`, and `PlanCollapseRisk` summary as read-only planning outputs before execution begins.
   The same read-only planner projection may also derive `outcomeClaims`, `leadRanking`, `roleMatches`, `assignmentProposal`, and `replanReasons` so the request can show how close it is to executable truth without pretending matching or assignment already happened.
   Those planning outputs may project onto `Request.derived`, but they remain system-owned, rebuildable, and non-editable by the buyer.
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

The open request room should behave like a monitored workroom, not a planner-first dashboard.
It should optimize for current status, next action, ownership, blockers, proof, and resolution instead of exposing every planner-derived field with equal visual weight.
It renders request truth and current work state from the `Request` and adjacent durable objects, not planner-debug state.

Realtime execution feedback may use an ephemeral transport lane for:

- typing
- token deltas
- progress ticks
- heartbeats
- presence
- transient runtime logs
- raw tool stdout or stderr

Those signals should not mutate the request root or create default durable `RequestEvent` history unless Boreal explicitly promotes a summarized business outcome.

Owner-private desktop auto-resolution may use a lower-friction lane:

- `Request` -> `Fulfillment` -> `Artifact`

That shortcut is only valid when:

- the request is owner-controlled
- the request is `private`
- the resolver runtime is acting for the same owner through Boreal-issued resolver auth

Owner-private Boreal-managed web workers may use a similar direct lane after the owner opens the request:

- `Request` -> `Fulfillment` -> `Artifact`

That shortcut is only valid when:

- the request is `private`
- the request has one pinned Boreal-managed preferred supply
- the worker execution is first-party and owned by the same Boreal account
- provider execution still consumes only the worker-specific prompt and provider-safe inputs, not the full durable request object

When that first-party worker run hits a retryable internal handoff failure, Boreal should:

- keep the same `Fulfillment` lane
- move that lane to `blocked` instead of terminal `failed`
- preserve worker input plus provider recovery metadata on the fulfillment
- resume through explicit retry on the same lane before opening any fresh request or fresh fulfillment

Public or cross-actor execution should still prefer:

- `Request` -> `Commitment` -> `Fulfillment` -> `Artifact`

If a resolver runtime does not share chat context, it should prefer direct request resource APIs for these writes instead of going through the chat mutation layer.
That runtime should authenticate with a Boreal-issued resolver token after explicit web approval, not by treating raw Codex auth as the request actor.

The first direct resolver lane in `apps/web` should support:

- `PATCH /api/requests/{id}` for owner-scoped private routing updates
- `POST /api/requests/{id}/commitments`
- `PATCH /api/commitments/{id}` with `accept`
- `POST /api/requests/{id}/fulfillments`
- `PATCH /api/fulfillments/{id}`

Desktop may use that lane after Boreal resolver approval to:

- browse `public` request pool entries
- browse owned requests
- browse owned supplies
- inspect durable request activity
- set or clear one private request preferred supply
- propose commitments
- accept commitments on owned requests
- create fulfillment from an accepted commitment
- publish artifacts
- update fulfillment through delivery and acceptance
- auto-resolve owned private requests directly into fulfillment when desktop owner policy enables it

When desktop turns from local chat into tracked request execution:

- one local thread may bind to one selected `Request`
- that thread may also bind to one selected or active `Fulfillment` lane
- Codex should receive request-relevant brief, lane, and recent durable activity context
- owner-private tracked request lanes may run on `Safe` or owner-approved `Full`
- public or external tracked request lanes must stay on `Safe`, must not use `danger-full-access`, and should run from a dedicated request workspace under `.boreal-work`
- the full desktop transcript still stays local unless explicitly promoted

The request root should update through:

- lifecycle status
- `activeRefs`
- `latest`
- system-owned `derived` planning projections when route or execution understanding changes

Do not start fulfillment in `active` state while the request is still `funding_required`.

Accepted responder lanes may create fulfillment after the owner accepts their commitment.
Owned private desktop lanes may create fulfillment without a commitment object.
Execution-grade artifacts such as delivery, evidence, receipt, and signature should require an accepted lane or active fulfillment role instead of being open to arbitrary public responders.

When owner-private desktop auto-resolution uses a configured supply:

- `routing.preferredSupplyId` on the request outranks the desktop default supply
- the desktop default supply may apply only when no request override exists
- a configured but unavailable supply should block auto-resolution instead of silently falling back
- the desktop default should still respect request `seeking.supplyKinds`

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

## Planner worldview and completion rules

- Planner outputs should stay capability-first before they imply assignment-first execution.
- `RequestDerived.leadRole` and `RequestDerived.roleSlots` remain the canonical planner-owned fields, even when the UI explains them as worker type or capability lane.
- Capability or worker-type wording is interpretive only. It should not replace the canonical planner field names.
- Planner outputs should preserve one serious `Request` thread instead of exploding the ask into brittle task trees.
- Planner outputs must not imply that a real match is attached before matching has actually happened for this request flow.
- Planner outputs must not imply that a worker is assigned before matching, selection, or fulfillment attachment actually happened.
- Planner outputs must preserve embodied, human-required, local-runtime-required, and verification-heavy work as first-class planning realities.
- Generated summaries, runtime access, or provider execution are not proof of completion by themselves.
- `digital_product` or near-instant delivery asks should not be inflated into the same fulfillment-heavy request UX when a lighter direct-delivery path is more truthful.

## Preselected supply behavior

- Preselected supply should stay in `routing.preferredSupplyId`, not be rewritten into fake buyer-authored brief text.
- Preselected supply may bias route selection and make the request feel faster, but it does not mean a real match is already attached.
- Preselected supply may narrow the likely lead lane, but it does not bypass clarification, proof, funding, approval, or safety rules.
- Planner and matcher outputs may take preselected supply into account, but they remain read-only until a mutation tool writes durable route or execution truth.

## Worker modality and trust context

- Planner and policy should distinguish owner-private, public, and cross-actor request lanes when deciding safe execution behavior.
- Local runtime availability is a worker modality and trust signal, not proof of completion by itself.
- Public or external execution lanes must not inherit owner-private desktop assumptions.
- Provider-only or runtime-only execution is never enough to mark completion when human proof or review still matters.

## Derived Planning Objects

These objects are derived and rebuildable, not durable roots:

- `RequestDraft`
- `MatchSpec`
- `RoutePlan`
- `RoleSlot`
- `PhasePlan`
- `MatchCandidate`
- `RoleMatchCandidate`
- `ExecutionProfile`
- `EmbodiedConstraintSet`
- `VerificationPlan`
- `PlanCollapseRisk`
- `RequestDerived.leadRole`
- `RequestDerived.roleSlots`
- `RequestDerived.phases`
- `RequestDerived.noMicrotaskExplosion`
- `RequestDerived.outcomeClaims`
- `RequestDerived.leadRanking`
- `RequestDerived.roleMatches`
- `RequestDerived.assignmentProposal`
- `RequestDerived.replanReasons`

## Invariants

- `Request` remains the durable root.
- Planner and matcher outputs are read-only.
- Policy selects the next safe action.
- Mutation tools are the only layer allowed to commit canonical writes.
- Once a request draft exists, subsequent briefing updates should mutate the same `Request` instead of forking a second durable demand object.
- Draft-mode manual editing must stay limited to user-editable request-input fields; system-owned fields remain server-owned and rebuildable.
- Planner-visible lead roles, role slots, phase plans, execution profiles, and proof plans must not be treated as buyer-authored brief fields.
- `RequestDerived.leadRole` and `RequestDerived.roleSlots` remain canonical even when the UI explains them as capability or worker-type language.
- `RequestDerived.outcomeClaims`, `RequestDerived.leadRanking`, `RequestDerived.roleMatches`, `RequestDerived.assignmentProposal`, and `RequestDerived.replanReasons` stay read-only planner state and must not be confused for durable buyer-authored or matcher-attached truth.
- `brief.summary` may stay blank without blocking `ready_to_open` when title and body are already present.
- `brief.tags` may exist as optional labels, but matching prep should prefer `seeking`.
- `FulfillmentStep` is the default home for generated sub-work.
- A new `Request` is only justified by a new funding, ownership, routing, or review boundary.
- open request rooms should prefer adjacent durable objects plus request projection updates over inlining response history on the request root
- ephemeral realtime signals should stay outside default durable history unless promoted
- direct resolver APIs and chat mutation tools should map to the same durable request-side writes
- owner-private desktop auto-resolution creates one fulfillment directly without creating a commitment object first when desktop owner policy enables it
- non-substitutable embodied work must not be downgraded into a digital-only plan or generated summary
- matching, assignment, and completion must not be implied before the real route, proof, and closure conditions are satisfied
- requests that require human presence, local access, or verification-heavy completion should not resolve until the required proof path is represented explicitly

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

For the deeper plan-model guide and implementation audit, read [REQUEST_PLAN_MODEL.md](REQUEST_PLAN_MODEL.md).

## Boreal Plan Essence

Most AI agents create plans to guide generation.
Boreal creates plans to make requests fulfillable, auditable, and provable.

In this repo, `Plan` is product and process language over request-owned derived state.
It is not a canonical root object.
It is not assignment truth.
It is not proof.
It is not completion.

The accepted product reading is:

- `Request`
- `Plan`
- `Worker`
- `Delivery`

That reading maps back to canonical truth:

- planning projections stay under `Request.derived`
- selected or candidate capability lanes come from `Supply`
- commercial and approval truth belongs in `Commitment`
- execution truth belongs in `Fulfillment`
- generated sub-work belongs in `FulfillmentStep`
- outputs and proof belong in `Artifact`
- money and credits belong in `Transaction`
- durable activity belongs in `RequestEvent`

If a future feature needs public plan comparison, ranked submissions, or solver proposals, the safer default is `Artifact(kind: "plan")`, `Commitment`, `RequestParticipant`, and `RequestEvent` attached to the same `Request`, not a new root object.

## Processing Layers

1. Conversation layer
   The owner speaks naturally.
2. Decision layer
   Boreal extracts meaning, classifies route, retrieves supply, ranks candidates, and decides the next action.
   Optional request-briefing assist profiles may normalize terse asks into a clearer derived brief shape inside this layer, but they remain read-only and non-durable until a mutation tool writes the `Request`.
   When routing context already exists, this layer may also consume owner-safe preferred-supply and candidate-supply summaries, but it must not treat those summaries as buyer-authored brief text or attached execution truth.
   Runtime model rotation is operational capacity management only. It may choose a higher-throughput model for larger contexts, but it must not change request lifecycle meaning, policy gates, tool boundaries, or canonical object names.
3. Execution layer
   Only approved mutation tools write `Request`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, or `Transaction`.

## Canonical Flow

1. Intake
   Capture the raw ask plus actor context.
2. Explicit request creation gate
   Stay chat-only until the owner or policy explicitly chooses to open a `Request`.
   In the web `New request` mode, entering the mode alone must not create a durable `Request`.
   The first owner turn in `New request` mode may stay conversational when the ask is still fuzzy in a chat-only clarification lane.
   In the web briefing workspace, composer submits are briefing-source turns: they create or update one draft `Request`, stay available to the model as request-owned source context, and must not render as visible user bubbles or completed tool-call rows.
   Boreal should still ask one focused briefing question at a time when missing facts materially affect the request brief, done condition, constraints, proof, human or local execution, budget, or deadline.
   Chat-only preflight messages may be saved as private chat history, but briefing-source turns should be hidden from the visible transcript and should not become planner, artifact, transaction, or fulfillment truth by themselves.
   A non-mutating preflight preview may summarize captured facts from those chat turns for the buyer.
   The first durable draft should be created only when the brief is ready enough to produce useful plans, the owner explicitly asks to create the request draft, or another explicit create action applies.
   If the owner selects raw request intake, the first send may create or update the same draft `Request` directly from the submitted text without running LLM briefing or planner generation.
   Raw intake must set the buyer text as request-owned `brief.body`, leave `brief.title` and `brief.summary` blank unless the buyer explicitly supplied them, avoid body-derived request slugs, suppress planner-derived roles, phases, matches, route summaries, execution classifications, assignment copy, and proof-planning projections, and keep the draft resumable by switching `Request.derived.planningMode` back to assisted planning later.
   Selecting one owned supply from the web supply hub may pin preflight context without creating a `Request`.
   If the buyer uses an explicit create-from-supply action, that may count as the create action for a private request, but it should pin `routing.preferredSupplyId`, seed request-side matching intent from that supply, and still avoid injecting synthetic brief text on the owner's behalf.
   Optional request-briefing assist may restructure a ready brief for clarity, but it must still end in exactly one `create_request_brief` mutation instead of a parallel hidden write path.
3. Request draft
   Produce a derived `RequestDraft`.
4. Draft normalization
   Produce a derived `MatchSpec` with brief, output kinds, constraints, budget, urgency, and actor requirements.
   In the web request-briefing surface, manual editing may touch only buyer-authored draft-input fields.
   The inline editable projection is limited to `brief.title`, `brief.body`, `brief.summary`, buyer-authored `brief.constraints` such as location, time, access, safety, and proof, plus `budget` and `deadline`.
   Ids, status, routing, active refs, latest summary, timestamps, and planner projections must remain read-only in that inline edit surface.
   Before `save draft`, request-tool mutation, or `open request`, normalize that draft-input projection back into the same durable `Request`.
   If one user turn explicitly includes brief text plus budget or deadline, the request-brief mutation layer should preserve both the narrative brief and the structured canonical fields in the same write.
   Title and body are the first readiness-bearing brief fields for assisted planning. Raw intake may be ready to open with body-only buyer text; `brief.title` and `brief.summary` should not be manufactured only to satisfy readiness.
   Matching-facing structure should prefer top-level `seeking` criteria instead of overloading `brief.tags`.
   Matching-facing fingerprint fields must use canon-locked enum values when they are structured: `brief.outputKinds`, `seeking.actorKinds`, `seeking.supplyKinds`, `seeking.teamMode`, `derived.routeFamily`, `derived.executionKind`, `derived.paymentMode`, `derived.matchingMode`, `derived.leadRole`, `derived.roleSlots[].roleKey`, `derived.phases[].phaseKey`, `derived.embodiedConstraintSet.verificationRequirements`, `derived.verificationPlan.requiredEvidenceClaims`, and `Supply.capability.{supplyKinds, fulfillmentActorKinds, outputKinds, executionChannels}`.
   Unknown fingerprint values should be rejected or normalized away instead of being stored as freeform canonical state.
   Request-briefing tool input may arrive as loose model-generated strings or string lists, but durable writes must normalize them into the canon enum catalog. Cross-catalog values such as `written_report` belong in evidence claims or verification requirements, not `brief.outputKinds`.
   If the ask implies onsite work, field inspection, pickup or dropoff, witnessed handoff, local access, or other non-substitutable human execution, the decision layer should derive explicit embodied execution and verification requirements instead of flattening the request into digital-only work.
   Public storefront, exterior, or street-facing photo requests may be ready to open when the city or area, timing, and proof output are already clear. Separate access requirements are blocking only when missing access materially controls execution, such as private property, controlled entry, appointment/permission needs, pickup, dropoff, or handoff work.
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
   The same read-only planner projection may also derive `outcomeClaims`, `matchCandidates`, `leadRanking`, `roleMatches`, `assignmentProposal`, and `replanReasons` so the request can show how close it is to executable truth without pretending matching or assignment already happened.
   Those planning outputs may project onto `Request.derived`, but they remain system-owned, rebuildable, and non-editable by the buyer.

In buyer-facing draft preflight, the chat should not stop at a completed tool-call artifact.
Once a draft `Request` exists, show an inline briefing or plan review surface in the chat timeline.
Before the draft is ready to open, that surface should show captured brief facts, missing essentials, and the next question or disabled open state.
When derived plan steps exist, show buyer-facing plan steps and proof or done criteria.
When raw intake is selected, show the captured `Request` and open readiness without fabricating fallback plan steps.
The pre-open flow review should render only the `Request` card and one or more parallel `Plan` cards.
The draft stepper and draft flow review must use the same buyer-facing plan-step projection. Do not generate or maintain a second flow-specific plan narrative with different titles, summaries, or proof wording.
Do not expose feasibility grids, supply paths, role candidates, worker lanes, delivery lanes, capability lanes, or assignment projections until the request has been opened into a workroom or route-selection surface.
10. Team assembly
   Match optional collaborator slots only after a credible lead route exists, except bounded direct-tool routes.
   The lead-first matching pipeline and the current fingerprint catalog are documented in [MATCHING_ENGINE.md](MATCHING_ENGINE.md).
   In-house Boreal worker scanning happens only as a read-only opportunity pass over opened or owner-approved requests.
   It may wake likely workers and prepare local application cards, but it must not assign workers, create approval, start fulfillment, publish proof, or complete the request.
11. Commitment drafting
   Produce the commercial shape Boreal wants the owner to review.
12. Funding gate
   If the route requires funding, or if optional request grants are being collected before solver award, move through `Commitment` and request-attached `Transaction` records before execution.
13. Fulfillment creation
   Open one accepted execution lane.
14. Delivery and resolution
   Publish `Artifact`, complete required review or owner acceptance, settle `Transaction`, and resolve the `Request`.
   If the accepted output is public, project a solution surface from the completed request and accepted artifact instead of creating a new root object.

## Open Request Room Rule

Once a request leaves `draft`, the room should stop behaving like request-brief intake.

Open request room behavior should prefer:

- `Commitment` for pricing, quotes, and formal proposals
- `Artifact` for drafts, proof, files, and deliveries
- `RequestEvent` for durable visible activity

The owner may still have a support chat attached to the same chat thread.
That support chat may preserve the private briefing transcript and continue
Q&A after the request opens, but it remains chat history unless a tool or
direct endpoint promotes a business-meaningful outcome into `Commitment`,
`Artifact`, `Fulfillment`, `Transaction`, or `RequestEvent` truth.
Public responders and outside viewers must not inherit the owner's private
preflight transcript as request-room context by default.

The open request room should behave like a monitored workroom, not a planner-first dashboard.
It should optimize for current status, next action, ownership, blockers, proof, and resolution instead of exposing every planner-derived field with equal visual weight.
It renders request truth and current work state from the `Request` and adjacent durable objects, not planner-debug state.

When a request flow view exists inside that room, it should stay a focused secondary process projection over the same durable truth.
Its accepted reading is:

- `Request`
- `Plan`
- `Worker`
- `Delivery`

That flow view should emphasize executable path and delivery truth over lifecycle-tracker noise or planner-debug metadata.
It should prefer a simplified flat card language rather than decorative or overly dense card treatments.

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

When one owner-private direct fulfillment lane is created without an explicit `supplyId`, a valid `routing.preferredSupplyId` may attach that fulfillment lane and seed execution ownership truthfully.

When that first-party worker run hits a retryable internal handoff failure, Boreal should:

- keep the same `Fulfillment` lane
- move that lane to `blocked` instead of terminal `failed`
- preserve worker input plus provider recovery metadata on the fulfillment
- resume through explicit retry on the same lane before opening any fresh request or fresh fulfillment

When that first-party worker has only queued provider execution, Boreal should save the provider task id on the active fulfillment immediately.
Checking that task again should keep the same lane `active` while the provider is still rendering, and only move to `blocked` when Boreal has a real retryable handoff failure such as mirror or artifact publication failure.

Public or cross-actor execution should still prefer:

- `Request` -> `Commitment` -> `Fulfillment` -> `Artifact`

In-house Boreal agents and humans follow the same worker-application rule:

- scan opened requests through public-safe, owned, or owner-approved request projections
- render open-request listing readiness as one read-only human lane plus named-agent wake, skip, and target-only hints, never as worker assignment or route authorization
- show public-board scan hints only from already-loaded public-safe projection fields, with wake, skip, and target-only labels treated as UX guidance rather than worker activation
- qualify provider-only agents against public projection tags such as `seeking.actorKinds`, `brief.constraints`, and execution-kind hints before any application packet is prepared
- require a compatible selected `Supply` summary before a named in-house agent is allowed to prepare an application packet
- apply through `Commitment` when the worker is public or cross-actor
- use owner-private direct `Fulfillment` only when the owner, request, explicit auto-approval policy, allowed worker key, and selected first-party `Supply` satisfy the direct-lane gates
- prepare application packets may include the governed `POST /api/requests/{id}/commitments` or `POST /api/requests/{id}/fulfillments` payload shape, but only the target route may submit and authorize that mutation
- every prepared application packet must carry a `submissionPreflight` handoff requiring `/agents/actions/preflight`, `apply_to_request` for public or cross-actor `Commitment` application or `create_owner_private_fulfillment` for owner-private direct `Fulfillment`, represented actor evidence, idempotency, request detail, `agentActionPolicy`, selected `Supply`, active refs, funding, proof, and lane-specific route-policy rechecks before any sketched mutation route is attempted
- no-commitment `POST /api/requests/{id}/fulfillments` must require route-scoped `ownerPrivateDirectApproval` evidence plus selected `Supply` proof; private visibility or owner session alone is not enough to open direct fulfillment
- selected worker `Supply` should attach at the `Commitment.supplyId` boundary for public or cross-actor applications and at `Fulfillment.supplyId` for owner-private direct lanes
- treat auto-approval as owner-scoped boundary creation, not assignment, artifact publication, payment authority, review acceptance, or completion
- keep prompt packs, provider prompts, workflow definitions, and skills below `Supply` unless a real executable supply profile exists

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

## Request Grant And Solution Rule

Optional request grants may help fund a request before or during solver selection.

They should be modeled as:

- `RequestParticipant` role activity for funders
- `Commitment` terms or metadata for award and release rules
- `Transaction` records for grant funding, settlement, refund, and solver payout
- `RequestEvent` history for durable activity

Request grants are not standalone donation objects, investment contracts, or passive revenue-share positions in the first model.
Default product language should say `fund`, `sponsor`, `grant`, or `contribute`, not `invest`, `yield`, `dividend`, or `tax-deductible donation`.

Solver payouts may be released after accepted work.
Reviewer compensation may exist as a fixed review fee, credit, or reputation reward when review work is explicitly requested.
Passive funders should receive access, attribution, prioritization, credits, or early reveal rights, not automatic cash upside.

An accepted artifact may become a public solution surface.
That surface is a projection over:

- the completed `Request`
- accepted `Artifact` records
- accepted `Fulfillment` or review truth
- related `Transaction` records
- replayable `RequestEvent` history

Public solution inspection should be free by default and should not create a credit debit.
Inspection means viewing the accepted plan, explanation, proof, public artifact, reusable workflow shape, or safe request history.

Running a solution is execution.
If a run consumes inference, provider APIs, workflow execution, media generation, human review, embodied capacity, or other service resources, it should consume first-party credits or another approved payment source.
The paid run should create a new `Request` or accepted execution lane that references the source accepted artifact, and its credit debit must land in request-attached `Transaction` truth.

The first committed HTTP path for this is `POST /api/requests/{id}/solution-runs`.
In that route, `{id}` is the completed public source request.
The endpoint creates or reuses one private run `Request` for the authenticated buyer, references the source accepted artifact in the run request, applies first-party buyer credit, and records request-attached `Transaction` truth on the run request.
It must not mutate the completed source request, charge for inspection, or create a separate `SolutionRun` root.
It should not claim active fulfillment until a worker, provider, or human review lane is actually attached.

If a later user wants a private adaptation, implementation, or follow-up, create a new `Request` that references the accepted artifact.

Reusable public scratch-chat prompts are a chat-interface reuse lane, not the same thing as public solution reruns.
Analyzing a public or owned scratch-chat user text message for variables is read-only, free, and non-durable.
Running that prompt must validate required variables first, then create or reuse one private scratch chat with the filled prompt and an explicit provenance part linking the fork back to the original source chat, source message, source user, template text, and inputs.
It must not create a durable `Request`, debit credits, or write request-attached `Transaction` truth in V1.
Reusable prompt chat forks are free for all signed-in users, but server policy must enforce daily abuse limits.
The default quota is `10` reusable chat forks per UTC day, increased to `20` per UTC day for users with any settled buyer-credit top-up history.
Token ceilings for filled prompts and daily run capacity must stay environment-controlled.
The public source chat and source message must remain unchanged.
V1 deterministic analysis may detect bracketed examples and explicit placeholders such as `[20/05/1996]`, `{date_of_birth}`, or `{{date_of_birth}}`, but it must not reuse assistant answers or publish a public solution artifact automatically.
The first run implementation may generate an assistant reply inside the private forked chat; if the configured model route is unavailable, the forked chat should preserve the filled user prompt and show the failure in chat instead of inventing request fulfillment truth.

## Visibility Rule

- `draft` requests remain owner-scoped.
- `open` plus `private` requests remain owner-controlled or invite-only.
- `open` plus `public` requests may enter the public request pool and be fetched by outside supply or Boreal desktop participants.
- Public pool reads should expose a public-safe projection, not owner-only draft fields.
- Public projections may include `agentActionAffordances`, but those affordances are derived hints over governed endpoints and do not become durable root state.
- Public projections may include `agentActionCardHints`, but those cards are derived UX hints over the same request-bound affordances. They may name card titles, CTAs, handoff prompts, policy checkpoints, and canonical write boundaries if authorized, but they do not grant permission, record approval, authorize payment, publish artifacts, mutate the request, write `RequestEvent` history, or prove completion.
- Request detail reads may include `agentActionPolicy`, but that policy is a derived compiler output over request status, visibility, ownership, resolver scopes, accepted artifact truth, and endpoint gates. It tells an agent what is allowed now without writing `RequestEvent` history or replacing mutation-tool authorization.
- Request detail reads may include actor-specific `agentActionCardHints` derived from `agentActionPolicy` so agents can show humans current apply, submit, monitor, run, optimize, or recovery state without guessing UI copy.

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
- Flow-card drag actions are explicit projection taxonomy: `Request` cards create or refine request-owned plan phases, `phase` or `stage` cards prepare human or agent worker applications, `worker` cards review delivery paths, and `delivery` or `step` cards inspect proof. The drag gesture itself is not a mutation, assignment, `Commitment`, `Fulfillment`, `Artifact`, or completion claim.
- Planner outputs must preserve embodied, human-required, local-runtime-required, and verification-heavy work as first-class planning realities.
- Generated summaries, runtime access, or provider execution are not proof of completion by themselves.
- `digital_product` or near-instant delivery asks should not be inflated into the same fulfillment-heavy request UX when a lighter direct-delivery path is more truthful.

## Preselected supply behavior

- Preselected supply should stay in `routing.preferredSupplyId`, not be rewritten into fake buyer-authored brief text.
- Preselected supply may bias route selection and make the request feel faster, but it does not mean a real match is already attached.
- Preselected supply may narrow the likely lead lane, but it does not bypass clarification, proof, funding, approval, or safety rules.
- If preselected supply does not yet truthfully fit the current route, planner outputs should keep it candidate-only instead of upgrading it to selected lead truth.
- In owner-private draft flows, preselected supply may also preseed route-facing derived state such as candidate pool, route family, execution kind, payment mode, matching mode, and route summary when that route narrowing is already truthful.
- Clearing preselected supply should also clear only that preferred-supply route bias instead of leaving stale direct-route hints behind.
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
- `RequestDerived.planningMode`
- `RequestDerived.leadRole`
- `RequestDerived.roleSlots`
- `RequestDerived.phases`
- `RequestDerived.noMicrotaskExplosion`
- `RequestDerived.outcomeClaims`
- `RequestDerived.matchCandidates`
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
- `RequestDerived.planningMode` controls whether planner projections are currently generated; raw mode suppresses those projections without changing the durable `Request` root.
- Raw mode must preserve the buyer-authored body without deriving a title, summary, body-based key, route classification, default execution mode, or planner assignment summary.
- Planner-visible lead roles, role slots, phase plans, execution profiles, and proof plans must not be treated as buyer-authored brief fields.
- `RequestDerived.leadRole` and `RequestDerived.roleSlots` remain canonical even when the UI explains them as capability or worker-type language.
- `RequestDerived.outcomeClaims`, `RequestDerived.matchCandidates`, `RequestDerived.leadRanking`, `RequestDerived.roleMatches`, `RequestDerived.assignmentProposal`, and `RequestDerived.replanReasons` stay read-only planner state and must not be confused for durable buyer-authored or matcher-attached truth.
- `RequestDerived.matchCandidates` is the request-owned snapshot of retrieved candidate fit, while `leadRanking` and `roleMatches` remain the planner's interpreted reading of that snapshot plus pinned or attached route truth.
- `brief.summary` may stay blank without blocking `ready_to_open` when title and body are already present.
- `brief.tags` may exist as optional labels, but matching prep should prefer `seeking`.
- `FulfillmentStep` is the default home for generated sub-work.
- A new `Request` is only justified by a new funding, ownership, routing, or review boundary.
- Optional request grants do not fork the durable request; they attach to the same request through participants, commitments, transactions, and events.
- A public `Solution` surface is a projection over accepted request artifacts, not a new canonical root object.
- Public solution inspection does not consume credits by default.
- Credit consumption begins when a user runs the solution through inference, provider APIs, workflow execution, human review, or other live execution capacity.
- A credit-metered public solution run creates or reuses one private run `Request` with source request and accepted artifact references before debiting buyer credit.
- Passive funder revenue-share, investment, yield, dividend, and tax-deductible donation language must not appear in default request-processing outputs.
- open request rooms should prefer adjacent durable objects plus request projection updates over inlining response history on the request root
- ephemeral realtime signals should stay outside default durable history unless promoted
- direct resolver APIs and chat mutation tools should map to the same durable request-side writes
- owner-private desktop auto-resolution creates one fulfillment directly without creating a commitment object first when desktop owner policy enables it
- in-house Boreal worker scanners are read-only opportunity projections and must not be treated as assignment or completion truth
- in-house Boreal worker applications write `Commitment` for public or cross-actor lanes, while owner-private direct worker lanes remain the narrow exception
- non-substitutable embodied work must not be downgraded into a digital-only plan or generated summary
- matching, assignment, and completion must not be implied before the real route, proof, and closure conditions are satisfied
- requests that require human presence, local access, or verification-heavy completion should not resolve until the required proof path is represented explicitly

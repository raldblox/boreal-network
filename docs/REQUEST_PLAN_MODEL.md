# Request Plan Model

This document explains the Boreal meaning of `Plan`.

It is both a canon guide and an implementation audit.
It does not introduce a new canonical root object.

## Core Essence

Most AI agents create a plan to guide their own generation.
Boreal creates a plan to make a `Request` fulfillable, auditable, and provable.

That difference matters.

In Boreal, a plan is not the work.
It is not proof.
It is not assignment.
It is not a separate root object.

A Boreal plan is a request-owned process projection that answers:

- what outcome is being requested
- which human, agent, tool, runtime, or organization should lead
- what supporting capability lanes may be needed
- what real-world, local-runtime, or proof-heavy steps cannot be deleted
- what is missing before safe routing or closure
- what commitment, fulfillment, artifact, transaction, or event must exist before the request can move forward

The durable root stays:

- `Request`

The execution truth stays:

- `Commitment`
- `Fulfillment`
- `FulfillmentStep`
- `Artifact`
- `Transaction`
- `RequestEvent`

## Difference From Generic Agent Plan Mode

| Generic agent plan mode | Boreal request plan |
| --- | --- |
| Usually ephemeral to one assistant run. | Attached to one durable `Request`. |
| Often a Markdown checklist. | Typed read-only state plus durable execution objects when work begins. |
| Helps the model decide what to generate next. | Helps the system decide what is safe to route, fund, execute, prove, and close. |
| Can silently omit human or physical work if no callable tool exists. | Must preserve embodied work, local access, and proof obligations. |
| Completion often means the assistant wrote an answer. | Completion requires accepted fulfillment and proof-bearing artifacts when required. |
| Usually invisible to matching, payment, review, and audit. | Feeds matching, commitment, fulfillment seeding, artifact proof, review, and events. |

The short rule:

```text
Agent plans guide generation.
Boreal plans guide fulfillment.
```

## Canonical Shape

The accepted product reading is:

```text
Request -> Plan -> Worker -> Delivery
```

This is a process lens over canonical objects:

- `Request` is the demand root.
- `Plan` is a read-only projection over `Request.derived`.
- `Worker` means selected or candidate `Supply`, plus an attached `Fulfillment` lane once execution starts.
- `Delivery` means `Artifact`, proof metadata, review, and final request state.

When work is still being formed, planning state belongs under `Request.derived`.
When work starts, generated sub-work belongs in `FulfillmentStep`.
When output exists, it belongs in `Artifact`.
When something important happened, it belongs in `RequestEvent`.
When money or credits move, it belongs in `Transaction`.

## Path Builder UI Language

`Path` is allowed as product and UI language for V1, but it is not a new canonical root object.

In the UI, a path means a request-owned execution proposal:

- the `Boreal baseline path` is generated from the current `Request.derived` planning projection
- a `supporting path` can come from a human, agent, service or supply, or workflow/template slot
- selecting a path means "this is the way we intend to run the request," not "the work is complete"
- running a selected path must hand off to `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, and `RequestEvent` as the durable execution truth

This keeps the user-facing mental model simple:

```text
Request -> Path -> Worker -> Proof -> Review
```

That is a product reading over the same canon:

- `Request` remains the durable root.
- `Path` remains UI language over request-owned planning data.
- `Worker` means selected or candidate `Supply`, plus fulfillment ownership once execution starts.
- `Proof` means required artifacts, evidence claims, receipts, files, media, signatures, or acceptance.
- `Review` means owner acceptance, closure, retry, or rejection.

The Path Builder should show multiple possible ways forward without implying a public plan marketplace, community ranking, assignment, or completion before those states actually exist.

## Conversational Preflight Boundary

Before a durable draft exists, `New request` mode may still use a chat-only clarification lane for fuzzy asks.
In the web briefing workspace, composer submits are briefing-source turns that create or update one draft `Request`, remain hidden from the visible transcript, and feed request-owned source context to the model.
The buyer may describe a fuzzy ask and Boreal may ask one focused question at a time when missing facts would materially change the plan.
Chat-only preflight turns may be persisted as private chat history, but briefing-source turns should not render as visible user bubbles or completed draft tool rows.

A preflight preview may summarize:

- captured ask
- done condition
- known constraints
- proof needs
- budget or deadline
- human or local execution needs
- missing essentials
- next question
- ready-to-draft state

That preview is a UI projection over chat history, not a canonical object.

Once a draft `Request` exists, buyer-facing draft mode should show an inline briefing or plan review surface in the chat timeline instead of exposing raw tool-call completion as the final state.
If the draft is not ready to open, that surface should show captured facts, missing essentials, and the next question or disabled open state.
If derived plan steps exist, draft-mode plans should stay limited to buyer-facing completion paths, steps, done criteria, and proof requirements.
If `Request.derived.planningMode` is `raw`, draft mode should show the captured request and readiness only. It must not render fallback plan steps, planner-pending phases, role lanes, match candidates, route summaries, title or summary polish, body-derived slugs, execution defaults, assignment copy, or proof-planning projections until assisted planning is resumed on the same `Request`.
Public storefront, exterior, or street-facing photo requests should not be held in draft only because no private access requirement was supplied. If geography, timing, and proof are clear, missing access stays optional unless the request implies controlled entry, permission, pickup, dropoff, or handoff.
The draft stepper and draft flow review should render the same buyer-facing plan steps, with the flow using `Request` plus numbered `Plan` cards rather than a separate planner-debug narrative.
Draft flow review should render only the `Request` plus one or more parallel `Plan` cards before opening.
Flow cards, stepper cards, and task-board cards should share one buyer-facing process-card treatment: compact badges, status accents, icons, short descriptions, checklist rows, proof or lane tags, fixed-height clipping where needed, and an explicit selected-card state.
Supply path, role candidates, worker lanes, delivery lanes, capability lanes, and assignment projections belong after the request opens or inside advanced owner/debug context.

## Current Implementation Audit

Audit date: 2026-05-28.

### Reflected In Code

The actual codebase already reflects the core Boreal plan model in these areas:

- `apps/web/lib/request.ts` defines `RequestDerived` with `planningMode`, `leadRole`, `roleSlots`, `phases`, `outcomeClaims`, `matchCandidates`, `leadRanking`, `roleMatches`, `workerEligibility` including per-agent `namedAgentCandidates`, `assignmentProposal`, `replanReasons`, `executionProfile`, `embodiedConstraintSet`, `verificationPlan`, `planCollapseRisk`, and `clarificationNeeded`.
- `schemas/json/request.schema.json` machine-models the same derived planning projection on the canonical `Request` schema.
- `apps/web/lib/db/schema.ts` persists `Request.derived` as request-owned JSON and has no separate `Plan` table.
- `apps/web/lib/request-planner.ts` derives embodied execution, proof requirements, lead roles, role slots, phase plans, match candidates, worker eligibility guidance, assignment state, and replan reasons from the request plus candidate supply.
- `apps/web/lib/request-planner.ts` keeps empty drafts from receiving fake role or phase plans until there is real request signal.
- `apps/web/lib/request-planner.ts` treats `brief.outputKinds` as supporting qualification evidence only; named-agent wake requires an agent actor, agent-capable supply, agent execution kind, or agent role-slot signal so generic draft, file, handoff, media, or video outputs do not wake agents alone.
- `apps/web/lib/request-server.ts` enriches request drafts with retrieved candidate supplies and persists the resulting request-owned planner projection.
- `apps/web/lib/request-server.ts` seeds `FulfillmentStep` records from request-derived phases when a fulfillment lane is created.
- `apps/web/lib/request-server.ts` gates delivered and accepted fulfillment states through `evaluateRequestVerificationCoverage`, so proof-heavy requests cannot close only because text was generated.
- `apps/web/lib/request-server.ts` appends `RequestEvent` records for request opening, commitment activity, artifact publication, and fulfillment lifecycle changes.
- `apps/web/lib/ai/prompts.ts` instructs request-mode prompts to preserve embodied work, keep planner fields read-only, avoid fake assignment, and separate preflight from open request rooms.
- `apps/web/app/(chat)/api/chat/route.ts` constrains active tools by mode: pre-draft request creation, draft updates, owner open-room tools, and responder open-room tools are different paths.
- `apps/web/lib/ai/tools/create-request-brief.ts` and `apps/web/lib/ai/tools/request-briefing-shared.ts` write only request-owned input fields and explicit structured facts, including embodied constraints when stated.
- `apps/web/lib/request-flow.ts` builds the visible flow graph from durable request state; draft review is limited to `Request` plus `Plan` nodes while opened workrooms can add worker and delivery nodes.
- `apps/web/components/chat/request-plan-panel.tsx` renders preflight planning as captured facts, missing details, buyer-facing plan steps, proof needs, and inline buyer-authored draft edits while keeping planner-derived fields read-only.
- `apps/web/components/chat/request-tracker.tsx` renders the open request as a monitored workroom with route, worker, proof, retry, delivery, and acceptance surfaces.
- `apps/web/components/request/request-board.tsx` and `apps/web/components/request/open-requests-hub.tsx` expose public requests with status, expected proof, next action, and free reading.
- `apps/web/components/request/public-solution-preview.tsx` only labels public solution projections when a public request is completed and linked to an accepted artifact.
- `tests/contracts/request-processing-live-presets.mjs` freezes benchmark prompts that compare neutral contract behavior against Boreal's request-native lead-first rules.
- `fixtures/request/*.json` and `tests/contracts/*request-processing*` evaluate extraction, routing, planning, matching, policy, embodied-step preservation, proof completeness, false completion, and forbidden mutation.

### Verification Run

The deterministic fixture validation was run from the repo root:

```text
pnpm.cmd evals:request-processing
```

Result:

- `4` request-processing eval fixtures validated.
- No actual output was compared by that command.

The sample actual was also compared:

```text
pnpm.cmd evals:request-processing:sample
```

Result:

- `eval-complex-human-planning-and-match` passed.

The live `apps/web` matcher benchmark was also run:

```text
pnpm.cmd evals:request-processing:matcher
```

Result:

- fixture coverage: `4 / 4`
- contract pass rate: `0.25`
- lead top-1 accuracy: `0.75`
- lead recall at 3: `1`
- over-decomposition rate: `0`
- forbidden mutation rate: `0`
- policy action acceptability: `1`
- required role slot coverage: `1`
- optional role slot coverage: `1`
- embodied step recall: `1`
- semantic embodied step recall: `1`
- generative plan collapse: `0`
- verification completeness: `1`
- semantic verification completeness: `1`
- false completion rate: `0`

Interpretation:

The current `apps/web` planner strongly reflects Boreal's anti-collapse principle.
It preserves embodied work, proof obligations, safe policy actions, and mutation boundaries.

It is not yet exact enough to claim a fully passed research-grade planner contract.
Current gaps are lead top-1 ordering in one complex digital scenario and exact verification or collapse-risk shape mismatches in embodied scenarios.

## Current Gaps

These are not reasons to change the root model.
They are implementation gaps to close while preserving the root model.

- There is no canonical `Plan` root object, and that is correct.
- There is no public plan-submission marketplace yet.
- There is no community ranking of competing plans yet.
- There is no full public solution `Run with credits` production path yet, only the accepted projection and reference-start behavior.
- `Request.derived.matchCandidates` is backed by bounded candidate queries and deterministic scoring, not a full search or market matcher.
- Public request board projections intentionally hide most owner-only planner internals.
- Prompt guidance is strong, but prompts are not enough by themselves; server-side mutation gates and evals must remain the authority.
- Artifact metadata can carry proof signals, but real proof attestation is still only as strong as the capture, verification, and reviewer lanes implemented around it.

## How To Add Public Plan Comparison Later

Do not add a new canonical `Plan` root by default.

If Boreal needs multiple public plans on one request, start with:

- `Artifact` with `kind: "plan"` for the submitted plan content
- `Commitment` when the plan is also a proposal, quote, or execution promise
- `RequestParticipant` role activity for solver, reviewer, or funder participation
- `RequestEvent` for submission, review, ranking, acceptance, or rejection history
- `Transaction` only when funding, grants, credits, settlement, payout, or refunds occur

Only introduce a new support table or projection after canon explains why existing objects are insufficient.
If such a support object is needed, it must still be request-attached and must not replace `Request`, `Commitment`, `Fulfillment`, or `Artifact`.

## Worker Instructions

Frontend, prompt, eval, and backend workers should follow these rules:

- Preserve `Request` as the visible and durable root.
- Treat `Plan` as a request-owned process lens, not a standalone root.
- Keep buyer-authored fields separate from planner-derived fields.
- Do not store planner output in `brief` unless the buyer actually authored it.
- Match the lead first, then add collaborators only when needed.
- Do not expand simple asks into brittle task trees.
- Do not delete human, local-runtime, onsite, pickup, handoff, inspection, measurement, or proof steps because they are inconvenient for AI.
- Do not imply assignment before selected or attached execution truth exists.
- Do not imply completion before accepted fulfillment and required proof exist.
- Prefer `FulfillmentStep` for generated sub-work under one execution lane.
- Prefer `Artifact` for plan, proof, file, media, draft, receipt, signature, and delivery outputs.
- Prefer `RequestEvent` for durable activity history.
- Prefer `Transaction` for funding, grant, credit, settlement, payout, refund, and dispute truth.
- For public solution reuse, inspection stays free by default; running consumes credits only when live execution capacity is used.

## Prompt Checklist

Any prompt that produces or evaluates a Boreal plan should force these questions:

- What is the durable `Request`?
- What outcome claims did the requester actually make?
- Which claims are non-substitutable by generated text?
- What lead role or capability lane should own execution?
- What supporting role slots are truly necessary?
- What phases are needed without creating microtask noise?
- What embodied, local access, scheduling, geography, or safety constraints exist?
- What proof artifacts or evidence claims are required?
- What is missing before safe routing, funding, execution, or closure?
- What must become `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, or `RequestEvent` before the request advances?

If the answer is only a fluent checklist, it is not a Boreal plan yet.

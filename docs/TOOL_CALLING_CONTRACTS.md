# Tool Calling Contracts

This file defines Boreal's internal planner, matcher, policy, and mutation tool boundaries.

## Core Rule

Planner proposes.
Matcher scores.
Policy decides.
Mutation tools commit.

Do not let one opaque tool both infer the route and mutate canonical objects.
Optional prompt-assist profiles may rewrite or expand the latest user ask ephemerally, but they stay read-only and must still hand off through the same planner, policy, and mutation boundaries.

Reusable prompt analysis is a read-only extraction surface.
It may detect fields in a public or owned scratch-chat user message, but it must not mutate chat, request, credit, transaction, artifact, or event truth.
Reusable prompt execution is a chat mutation surface in V1: it must validate required inputs first, create or reuse one private scratch chat, store source provenance on the forked user message, and run the filled prompt without debiting credits.
It must not mutate the public source chat, create a durable `Request`, write `Transaction` truth, or treat the reusable prompt as a new root object.
Daily fork quotas and token ceilings must be server-side and environment-controlled, with the default free-chat allowance increasing from `10` to `20` per UTC day when the signed-in user has settled any buyer-credit top-up.

Runtime model routing, provider retry, and model fallback must reuse the same active tool allowlist, tool-choice policy, and mutation-tool schemas as the originally selected chat route. Fallback is capacity management, not a separate planner or policy lane.

## Tool Layers

### Planner tools

Planner tools are read-only.
They transform a raw ask into typed planning outputs.

First set:

- `prepare_request_draft`
- `detect_missing_fields`
- `classify_request_complexity`
- `classify_request_route`
- `detect_embodied_requirements`
- `plan_verification`
- `audit_plan_for_false_completion`
- `plan_fulfillment`

Planner outputs may include:

- `RequestDraft`
- `MatchSpec`
- `RoutePlan`
- `leadRole`
- `roleSlots`
- `phases`
- `ExecutionProfile`
- `EmbodiedConstraintSet`
- `VerificationPlan`
- `PlanCollapseRisk`
- `ClarificationNeeded`
- `noMicrotaskExplosion`
- `outcomeClaims`
- `matchCandidates`
- `leadRanking`
- `roleMatches`
- `assignmentProposal`
- `replanReasons`

### Matcher tools

Matcher tools are read-only.
They search, rank, and explain supply fit.

First set:

- `search_supply`
- `rank_supply`
- `explain_match`
- `assemble_team_candidates`

Matcher outputs may include:

- `MatchCandidate[]`
- `RoleMatchCandidate[]`
- confidence scores
- ranking explanations

### Policy tools

Policy tools are read-only.
They choose the next safe action after planner and matcher outputs exist.

First set:

- `choose_next_action`

Allowed actions:

- `clarify_request`
- `show_lead_shortlist`
- `show_team_plan`
- `draft_commitment`
- `open_request`
- `create_fulfillment`
- `block_and_escalate`

### Mutation tools

Mutation tools are write-capable.
They are approval-gated where needed and emit canonical events.

First set:

- `open_request`
- `create_request_brief`
- `update_request_brief`
- `update_request_constraints`
- `update_request_budget_and_timing`
- `update_request_routing`
- `update_request_route_summary`
- `propose_commitment`
- `publish_artifact`
- `attach_match_shortlist`
- `draft_commitment`
- `accept_commitment`
- `create_fulfillment`
- `update_fulfillment`
- `create_fulfillment_steps`
- `publish_artifact`
- `resolve_request`

## Standard Read-Only Envelope

Every planner, matcher, or policy call should return:

- `toolName`
- `schemaVersion`
- `correlationId`
- `requestDraftId` or `requestId`
- `confidence`
- `warnings[]`
- `requiresApproval`
- `output`

## Standard Mutation Envelope

Every mutation call should return:

- `toolName`
- `schemaVersion`
- `correlationId`
- `idempotencyKey`
- `mutationType`
- `writtenRefs[]`
- `emittedEvents[]`
- `output`

## Planner worldview and completion rules

- Planner outputs should stay capability-first before they imply assignment-first execution.
- `leadRole` and `roleSlots` are the canonical planner-owned field names, even when the UI explains them as lead worker type or capability lanes.
- Capability, worker-type, or lane language is interpretive only. It must not replace the canonical planner field names.
- Planner outputs should preserve one serious `Request` thread instead of exploding the ask into fake task trees.
- Planner outputs must not imply that a real match is attached before matching has actually happened for this request flow.
- Planner outputs must not imply that a worker is assigned before matching, selection, or fulfillment attachment actually happened.
- Planner and policy outputs must model human-required, local-runtime-required, and verification-heavy work explicitly when those realities are present.
- Provider execution, runtime access, or polished generated output is never enough to mark completion when proof, review, or human execution still matters.
- `digital_product` or near-instant delivery routes should not be forced into the same fulfillment-heavy request UX when the truthful path is closer to direct delivery plus durable proof.
- `open_request`, `draft_commitment`, `create_fulfillment`, and `resolve_request` must all preserve the rule that completion outranks generation.

## Preselected supply behavior

- Selected or pinned supply context should stay in `routing.preferredSupplyId` or another read-only routing surface, not be synthesized into buyer-authored `brief` text.
- Preselected supply may bias route selection and make the UX faster, but it does not mean a real match is already attached.
- Preselected supply may narrow the likely lead lane, but it does not bypass clarification, proof, funding, approval, or safety gates.
- If pinned supply does not yet truthfully fit the current route, planner outputs should keep it candidate-only instead of upgrading it to selected lead truth.
- Owner-private draft routing may preseed route-facing derived fields from pinned supply only when that narrowed route is already truthful for the current request.
- Clearing pinned supply should remove only that preferred-supply route bias and must not leave stale direct-route hints behind.
- Preselected supply may influence planner and matcher outputs, but those outputs must still stay read-only until a mutation tool writes the durable route or execution object.
- Once owner-private direct fulfillment is actually being created, a valid `routing.preferredSupplyId` may attach that execution lane if no explicit `supplyId` was supplied.

## Worker modality and trust context

- Planner and policy should distinguish owner-private, public, and cross-actor request lanes when deciding safe execution behavior.
- Local runtime availability is a worker modality and trust signal, not proof of completion by itself.
- Public or external execution lanes must not inherit owner-private desktop assumptions.
- Human-required, embodied, verification-heavy, and local-runtime-dependent work should remain first-class planning realities instead of being flattened into digital-only execution.

## Planner and policy prompt context

- Planner and policy prompt owners should receive the raw ask plus the normalized request-input projection.
- Prompt context should include `visibility`, `budget`, `deadline`, `seeking.actorKinds`, and `seeking.supplyKinds` when present.
- Prompt context should include `routing.preferredSupplyId` when present, but treat it as routing context only.
- When supply retrieval already happened in an owner-safe lane, prompt context may include a preferred-supply summary and bounded candidate-supply summaries to support capability-first planning.
- Public or responder lanes must not receive owner-private preferred-supply or candidate-supply context that the request flow has not made safe to expose.
- Prompt context should include lane trust tier plus embodied, proof, and local-runtime constraints when those realities are known.

## Safety Rules

- Planner tools must not create canonical objects.
- Matcher tools must not mutate ranking history or canonical objects.
- Policy tools must not bypass approval boundaries.
- Prompt-assist profiles must not create canonical objects, bypass tool selection, or introduce a second hidden request-write path.
- Mutation tools must be idempotent where retries are possible.
- Request-briefing mutation tools must keep updating the same draft `Request` instead of creating a second durable demand object.
- Draft request mode and open request mode should not share one forced mutation policy.
- Pre-draft request mode should not force `create_request_brief` on every fuzzy buyer turn.
- Pre-draft request mode may answer conversationally and ask one focused briefing question before any request mutation when the brief is not ready.
- Pre-draft request mode may persist private chat turns, but that persistence is not `RequestEvent` history and must not create planner, artifact, transaction, or fulfillment truth.
- Web briefing-workspace submits are hidden briefing-source turns, not visible transcript rows; they must create or update the same draft `Request` and hide completed draft request tool chrome once the briefing form is visible.
- `create_request_brief` should be called only when the brief is ready enough for useful draft plans or when the buyer explicitly asks to create the request draft.
- Draft request mode may clarify before mutation when missing embodied, geographic, access, scheduling, or verification-critical fields materially change the safe route.
- Open request room tools should prefer `Commitment`, `Artifact`, and `RequestEvent` writes over `brief` rewrites.
- Owner support-chat turns inside an opened request may be persisted as chat transcript for continuity, but they must not become durable request activity unless a mutation tool or direct request endpoint writes canonical request truth.
- Public responders must not receive owner-private preflight transcript as hidden model context by default.
- `create_request_brief` and `update_request_brief` may carry explicit same-turn canonical facts such as budget or deadline so one intake turn does not drop structured demand fields.
- `create_request_brief` and `update_request_brief` should prefer title plus body first and must not fabricate `brief.summary` only to satisfy a shape.
- Request-briefing mutations should use top-level `seeking` for structured matching intent rather than relying on `brief.tags`.
- Request-briefing, route-summary, and supply-management mutations that touch structured matching fields must use the canon-locked fingerprint enums documented in `docs/MATCHING_ENGINE.md`.
- Unknown `outputKinds`, `supplyKinds`, `executionChannels`, route-family values, matching-mode values, role keys, or evidence-claim values must be rejected or normalized away before they reach the durable `Request` or `Supply`.
- Request-briefing tools may accept loose model-facing string or string-list inputs for `outputKinds`, but only canon `outputKind` values may persist. Evidence-only values such as `written_report` must remain under verification requirements or evidence claims.
- If the request briefing UI exposes a manual draft surface, tool mutations and `open_request` must normalize the latest draft-input projection before writing the durable `Request`.
- The inline editable request-input projection must stay limited to buyer-authored `brief` fields, buyer-authored `brief.constraints`, `budget`, and `deadline`.
- Selected or pinned supply context should stay in `routing.preferredSupplyId` or another read-only routing surface, not be synthesized into buyer-authored `brief` text.
- Planner-derived fields such as lead role, role slots, phase plans, execution profile, verification plan, and collapse-risk outputs must remain read-only and system-owned.
- Planner-derived fields such as `leadRole`, `roleSlots`, `phases`, `executionProfile`, `verificationPlan`, `planCollapseRisk`, `clarificationNeeded`, `noMicrotaskExplosion`, `outcomeClaims`, `matchCandidates`, `leadRanking`, `roleMatches`, `assignmentProposal`, and `replanReasons` must remain canonical, read-only, and system-owned.
- When retrieval already happened, `matchCandidates` may capture the request-owned candidate-fit snapshot that planner projections read from, but it must still remain read-only and must not be confused for attached execution truth.
- Planner tools should detect when a request requires non-substitutable human or embodied execution and must not flatten those requirements into a digital-only plan.
- Planner and policy outputs should explicitly model proof obligations for verification-heavy work before fulfillment or closure.
- Planner, matcher, and policy outputs must not imply assignment or completion before the required route, proof, and closure conditions are actually satisfied.
- `Fulfillment` and `FulfillmentStep` must not be created before the approved commercial boundary is satisfied.
- The one exception is the owner-private desktop auto-resolution lane, where the owner's private request may authorize direct fulfillment without a separate commitment object.
- `update_request_routing` may set or clear `routing.preferredSupplyId` only for the private request owner.
- Tool-produced output should be recorded as `RequestEvent` when the thread needs durable explanation or auditability.
- When a non-chat resolver runtime uses direct request APIs, those APIs must preserve the same durable behavior as the corresponding chat mutation tools.
- Direct resolver APIs should support the same commercial and lifecycle gates as tools: accepted commitment before fulfillment, valid fulfillment-state transitions, and idempotent retries.
- Direct resolver APIs may omit commitment creation only for owner-private direct auto-fulfillment.
- Owner-private direct auto-fulfillment should prefer explicit request routing over the desktop default supply and should block pickup when a configured supply is unavailable instead of silently falling back.
- Retryable first-party worker failures should park the same fulfillment lane as `blocked`, preserve worker recovery metadata, and resume on explicit retry instead of silently spawning a second request or second fulfillment lane.
- Queued provider execution should persist its provider task id on the same `active` fulfillment lane before waiting for output; polling a still-running provider task should not be mislabeled as completion or as a terminal failure.
- Direct resolver APIs should accept Boreal-issued scoped bearer tokens rather than assuming browser session cookies or raw runtime credentials.
- Desktop request-bound execution should pass the selected `Request` and optional `Fulfillment` lane into the local runtime as context, while keeping the local transcript out of default durable Boreal history.
- Desktop request-bound execution must treat public or external tracked request lanes as untrusted: block `danger-full-access`, keep network off, clear extra writable roots, and prefer a dedicated request workspace under `.boreal-work`.
- `publish_artifact` should accept either document-backed content or a stable external or object reference, plus optional `fulfillmentId` and `stepId`.
- `resolve_request` or equivalent closure actions should fail or escalate when required embodied steps or proof obligations are still missing.

## First Implementation Target

The first Boreal slice should prove:

1. explicit request mode plus first-send request draft creation
2. live request-brief updates through visible mutation tools
3. complexity and route classification
4. lead supply search and ranking
5. optional fulfillment planning for complex work
6. policy choosing `draft_commitment`

Do not start by automating payout, dispute, or deep multi-step execution before this core loop is stable.

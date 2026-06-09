# Evals

This file defines how Boreal evaluates request processing, planning, matching, policy, and mutation safety.

## Core Rule

Eval quality and safety together.
A high-scoring match system that mutates too early is still failing.

## Eval Layers

### 1. Extraction evals

Verify that a raw ask becomes the expected brief, optional structured `seeking`, constraints, output kinds, budget shape, and missing-field list.
Verify that a fuzzy first turn in a chat-only `New request` clarification lane may remain conversational, save private chat history, and ask one focused briefing question without creating a durable `Request`.
Verify that web briefing-workspace submits create or update one draft `Request`, remain hidden from the visible transcript, preserve the raw composer prompt, and expose missing brief fields in the briefing surface.
Verify that raw request-intake mode creates or updates one draft `Request` from the submitted buyer text without calling LLM briefing, deriving title or summary polish, deriving a body-based key, generating planner phases or roles, retrieving match candidates, classifying execution mode, writing assignment copy, or writing route/proof projections.
Verify that a raw draft can resume assisted planning on the same `Request` by switching planner mode, preserving the buyer-authored body, and then rebuilding planner projections.
Verify that preflight preview fields are derived from chat turns and do not become canonical planner or request truth.
Verify that assisted briefing emits typed qualification fingerprints for actor kinds, supply kinds, output kinds, execution kind, lead role, role slots, `workerEligibility`, `workerEligibility.namedAgentCandidates`, and match candidates only when justified by explicit request facts, so named agents can filter before waking.
Verify that human-required, local-access, witnessed-handoff, field-proof, pickup, delivery, or physical-verification plans do not wake provider-only named agents unless an explicit supporting provider role is present.
Verify that output-only planner hints, including `draft`, `file`, `handoff_doc`, `media`, or `video`, do not wake named agents unless the plan also carries an agent actor, agent-capable supply, agent execution kind, or agent role-slot signal.
Verify that planner-derived `workerEligibility` sets human-first skip, human-first agent-support, raw-not-planned, no-agent-signal, wake-named-agents, and per-agent candidate hints from canonical request fingerprints instead of prose-only labels.
Verify that first-party worker starter catalog entries for live Boreal workers expose the same typed supply capability, named-agent binding, scanner qualification tags, wake signals, and non-authority flags as their worker definitions and named-agent templates.
Verify that request-briefing prompts tell the model to persist scanner qualification tags into `seeking.actorKinds`, `seeking.supplyKinds`, `brief.outputKinds`, and embodied constraints instead of leaving them as prose-only hints.
Verify that service-card `Service routing context:` blocks are interpreted by the prompt and deterministic request-briefing normalizer as route-facing starter defaults that can seed structured actor, supply, output, service-family, service-plan, attachment-mode, request-flow stage/card, next-action, preset-plan-stage, and pre-execution fields, while `request_starter_no_supply_attached` keeps worker assignment, `Supply` attachment, fulfillment, proof, payment, and completion claims out of the created request.
If a request-briefing assist or optimizer profile is active, verify that it improves brief readability for terse asks without changing the explicit facts.
Verify that pinned-supply routing context stays outside the buyer-authored brief and does not appear as synthetic prompt text when the request started from a supply selection.
Verify that selected supply context remains in `routing.preferredSupplyId` or equivalent routing fields instead of being rewritten into buyer-authored brief text.
Verify that owner-safe planner prompt context may include preferred-supply and bounded candidate-supply summaries when retrieval already happened, while responder or public lanes do not inherit owner-private routing hints.
Verify that owner-private pinned supply may preseed route-facing derived fields only when that route narrowing is already truthful for the current request.
Verify that clearing pinned supply removes only that preferred-supply route bias and does not leave stale direct-route hints behind.
Verify that pinned supply stays candidate-only in planner outputs until the current request truth actually supports that narrowed lead lane.
Verify that requests implying onsite work, pickup or dropoff, field inspection, witnessed handoff, measurement, or other non-substitutable human execution surface those requirements instead of rewriting them as digital-only work.
Verify that planner-derived role, phase, execution, and proof outputs do not leak back into the buyer-authored editable brief surface.
Verify that a created draft renders an inline briefing or plan review instead of leaving the buyer at raw tool-call completion.
Verify that request-intake pending UI renders the destination plan/review container skeleton, not a separate briefing card followed by generic `Thinking...` and tool-call hops.
Verify that draft plans omit worker, delivery, supply path, role-candidate, capability-lane, and assignment projections from the buyer-facing preflight surface.
Verify that raw draft review shows captured request and open readiness only, with no fallback plan steps or planner-pending phase.
Verify that draft flow review renders only the `Request` plus one or more parallel `Plan` cards before the request opens.
Verify that flow-card drag actions stay typed by card kind and read-only: `Request` to plan projection, plan or stage to worker application preparation, worker to delivery review, and delivery or step to proof inspection without mutating `Request`, creating `Commitment`, starting `Fulfillment`, publishing `Artifact`, or claiming completion.
Verify that when a typed drag action points to a card kind that is not present yet, the UI may expose a virtual preparation handoff, but that handoff must keep the same non-authority flags and must not create the missing card, assign a worker, or call a mutation route.
Verify that inline draft edits can change only buyer-authored brief fields, buyer-authored constraints, budget, and deadline while derived planner fields stay read-only.
Verify that opened-request owner support chat can continue from private briefing history without exposing that transcript to public responders or converting every support turn into request activity.

### 2. Route and complexity evals

Verify that the request lands in the correct route family and complexity band.

### 3. Planning evals

Verify lead-role choice, role-slot choice, phase count, and whether Boreal avoided pointless microtask decomposition.
Verify that `leadRole` and `roleSlots` remain the canonical planner output names even when the UX explains them through capability or worker-type language.
Verify that planner outputs stay capability-first and do not imply assignment before matching, selection, or fulfillment attachment actually happened.
Verify that additive planner projections such as `outcomeClaims`, `matchCandidates`, `leadRanking`, `roleMatches`, `assignmentProposal`, and `replanReasons` stay read-only and do not overclaim beyond real route attachment.
Verify that retrieval-backed `matchCandidates` snapshots truthfully feed `leadRanking` and `roleMatches` without implying that matching or assignment already happened.
Verify that non-substitutable embodied outcomes produce explicit execution modality and verification planning instead of generic generated subtasks.
Verify that `digital_product` or near-instant delivery asks are not forced into a heavier fulfillment plan when the more truthful path is direct delivery plus durable proof.

### 4. Matching evals

Verify that the correct lead and collaborator supplies appear in the top-ranked results.

### 5. Policy evals

Verify the next action.
Examples: clarify, show shortlist, draft commitment, or block and escalate.
For embodied or verification-heavy asks, verify that policy prefers clarification or escalation when place, access, timing, or proof requirements are missing.
For public storefront, exterior, or street-facing photo asks, verify that policy preserves onsite execution and proof but does not force clarification for access requirements unless private, controlled, permissioned, pickup, dropoff, or handoff access is stated.
Verify that preselected supply may narrow the route, but does not bypass clarification, proof, funding, approval, or safety gates.
Verify that requests asking for pooled funding, donations, grants, or bounties are framed as optional request grants unless a narrower commercial policy exists.
Verify that funder participation does not imply passive investment upside, yield, dividend, or tax-deductible donation treatment.
Verify that policy distinguishes free public solution inspection from paid solution runs that consume inference, provider APIs, workflow execution, human review, or service capacity.
Verify that policy does not imply completion before proof and closure conditions are satisfied.

### 6. Mutation safety evals

Verify that Boreal does not create `Fulfillment`, `FulfillmentStep`, `Artifact`, or settlement-side writes before approval and required commercial gates.
Verify that the one owner-private desktop auto-fulfillment lane can create `Fulfillment` directly without `Commitment`, while public or cross-actor lanes still require the commitment gate.
Verify that owner-private direct fulfillment creation may inherit one valid `routing.preferredSupplyId` into attached execution truth when no explicit `supplyId` was passed.
Verify that manual request-input edits cannot mutate system-owned request fields directly and must normalize through the same durable `Request`.
Verify that public-safe request projections do not expose owner-only or planner-internal fields beyond the approved public subset.
Verify that open request room behavior does not fall back to draft-only brief mutation when the safer durable write is a `Commitment`, `Artifact`, or `RequestEvent`.
Verify that direct resolver APIs and chat mutation tools produce equivalent durable request-side outcomes for commitment and artifact writes.
Verify that direct resolver APIs and chat mutation tools produce equivalent durable request-side outcomes for commitment acceptance and fulfillment lifecycle writes.
Verify that tracked desktop execution uses selected `Request` and `Fulfillment` lane context without treating the full local transcript as canonical Boreal history.
Verify that richer artifact containers for file, media, PDF, audio, video, binary, and archive outputs keep stable metadata and lane bindings.
Verify that request closure is blocked when required embodied steps or proof obligations are missing.
Verify that retryable first-party worker failures move fulfillment to `blocked`, preserve worker recovery metadata, and resume the same lane instead of forcing a fresh request.
Verify that queued first-party provider tasks keep their task id on the active fulfillment lane, can be checked again through the same lane, and do not masquerade as completion before a durable artifact lands.
Verify that public or cross-actor lanes do not inherit owner-private desktop assumptions when planner, matcher, or policy outputs are evaluated.
Verify that in-house Boreal worker scanning is read-only and produces only opportunity guidance, not assignment, approval, fulfillment start, artifact publication, durable history, payment authority, or completion truth.
Verify that `scan_public_open_requests` uses the live public open-request projection as input, stays bounded by limit and cursor fields, and returns only wake or skip guidance plus preparation packets without mutating request truth.
Verify that named-agent board and scan paths respect `Request.derived.workerEligibility.shouldWakeAgents === false` when present before preparing application packets.
Verify that public open-request listings distinguish human-required, human-can-apply, agent-can-prepare, skip, and target-only worker readiness as read-only hints without per-card private fetches, assignment, commitment creation, fulfillment start, payment authority, or provider execution.
Verify that owner-approved private worker readiness can show owner-private direct `Fulfillment` preparation only when selected supply, trusted-worker auto-approval, eligible status, and matching worker key gates are present, and still requires `create_owner_private_fulfillment` preflight plus fulfillment-route recheck before any write.
Verify that actionable human lanes expose an `apply_to_request` preflight handoff for `Commitment` proposals while still forbidding worker-assigned, commitment-created, fulfillment-started, artifact-published, payment-authorized, and completion claims before the authorized mutation route succeeds.
Verify that public or cross-actor in-house worker application proposes a `Commitment` before fulfillment, while owner-private direct worker fulfillment remains limited to owner-controlled private requests with selected published first-party supply.
Verify that owner-private direct worker fulfillment is not recommended from private visibility alone; request-specific trusted-worker auto-approval, eligible status, allowed worker key, and selected supply proof must all be present.
Verify that public or cross-actor worker applications attach selected supply through `Commitment.supplyId`, while owner-private direct lanes attach selected supply through `Fulfillment.supplyId`.
Verify that accepted public or cross-actor `Commitment.supplyId` is preserved through acceptance responses, request activity, and `Fulfillment.supplyId` inheritance; mismatched explicit fulfillment supply must fail before fulfillment starts.
Verify that disqualified direct `prepare_application` responses expose `packetStatus=blocked_until_qualified`, blocked reasons, `canRunSubmissionPreflight=false`, null `submissionPreflight`, null `mutationCall`, empty proposed writes, and null proposed object before any action preflight or sketched mutation route is attempted.
Verify that direct `prepare_application` blocks when the current named agent's planner candidate is `skip` or `target_only`, even when the request carries broader compatible supply or output fingerprints.
Verify that selected `Supply` attachment fails before `Commitment` or `Fulfillment` creation when the supply is owned and published but mismatches the request structured supply or output fingerprints.
Verify that named Boreal agent templates expose the shared `boreal_named_agent_v1` framework contract, stable preparation-only route pattern, supported actions, boilerplate refs, task-pipeline rules, and non-authority flags before any agent is discoverable.
Verify that qualified named Boreal agent application packets include route-facing `requestFlowContext` from request constraints when available, keep that context non-authoritative, have `/agents/actions/preflight` reject unknown request-flow values or missing context non-authority flags, and include lane-specific `submissionPreflight` requiring `/agents/actions/preflight`, `apply_to_request` for commitment applications or `create_owner_private_fulfillment` for owner-private direct fulfillment, represented actor evidence, idempotency, visible `requestFit`, a concrete `preflightRequest` body, selected `Supply`, `agentActionPolicy`, and lane-specific route-policy rechecks before any sketched mutation route can be attempted.
Verify that named Boreal agent application packets include `authorizedExecutionHandoff` for model, provider, tool, proof, and retry sequencing while provider calls remain blocked before authorized fulfillment and secret values are never included.
Verify that `apply_to_request` and `create_owner_private_fulfillment` preflight fails before route attempts when visible `requestFit` omits selected published supply proof or selected supply capability fingerprints do not overlap the request structured supply or output fingerprints.
Verify that no-commitment direct fulfillment creation rejects private-visibility-only attempts and requires selected `Supply` plus `ownerPrivateDirectApproval` evidence, including the matching worker key when the selected supply maps to a Boreal-managed worker, before `Fulfillment`, `FulfillmentStep`, or `RequestEvent` truth can be created.
Verify that owner-scoped auto-approval can create or accept only the next worker boundary and cannot publish artifacts, authorize payment, accept review, complete the request, or silently fall back to another supply.
Verify that worker-backed service checkout can pin supported first-party Humanizer or Video Generation `Supply` and apply buyer credit, while still leaving provider calls, `Fulfillment`, `FulfillmentStep`, `Artifact`, review acceptance, and completion proof blocked until the next governed boundary.
Verify that prompt-only assets are rejected as starter supply until a backing execution profile, capability fingerprints, proof path, and readiness tests exist.
Verify that request-grant funding, solver payout, reviewer compensation, and solution-run writes stay attached to a `Request` through `Transaction` records.
Verify that public solution surfaces are projected only from completed requests with accepted artifacts, not from chat summaries or unreviewed drafts.
Verify that viewing a public solution does not emit credit-debit or transaction writes.
Verify that running a public solution creates or uses a referenced run request before debiting credits for inference or execution.
Verify that a public solution run writes buyer-credit debit and request `Transaction` truth to the run request rather than mutating the completed source request.
Verify that reusable prompt analysis over a public or owned scratch-chat user message is deterministic, read-only, and free.
Verify that `[20/05/1996]` near `date of birth` becomes a required `date_of_birth` field while explicit `{date_of_birth}` and `{{date_of_birth}}` placeholders preserve the same field key.
Verify that reusable prompt execution rejects missing required variables before creating any forked chat.
Verify that reusable prompt execution creates or reuses one private scratch chat, stores source chat id, source message id, source user id, template text, input values, run chat id, and quota policy on the forked user message, and does not create a request, debit credits, or write transaction truth.
Verify that reusable prompt free-chat quotas default to `10` forks per UTC day and increase to `20` for users with any settled buyer-credit top-up history.
Verify that reusable prompt token ceilings are environment-controlled and enforced before chat creation.
Verify that reusable prompt execution publishes a generated assistant message in the forked chat when the configured model route is available, and preserves the filled user prompt with a chat-level failure message when execution cannot complete.

## Fixture Shape

Each eval fixture should define:

- `fixtureType`
- `scenarioId`
- `description`
- `requestInput`
- `requestPatch`
- `candidateSupplies`
- `expectedExtraction`
- `expectedRouting`
- `expectedPlanning`
- `expectedMatching`
- `expectedPolicy`
- `negativeAssertions`

Fixture rule:

- `requestPatch` should be a runnable request-draft patch, not only prose expectations
- `candidateSupplies` should be full `Supply`-shaped snapshots with capability, availability, pricing, source, and timestamps, not summary-only placeholders
- intentionally incomplete scenarios may still omit route-critical fields inside `requestPatch.brief.constraints`, but complete scenarios should carry the typed execution and proof fields already known from the ask

## Actual Output Contract

The runner compares one actual output file against one fixture.

The actual file should provide:

- `schemaVersion`
- `scenarioId`
- `extraction`
- `routing`
- `planning`
- `matching`
- `policy`

Recommended subfields:

- `extraction.title`
- `extraction.summary`
- `extraction.body`
- `extraction.seeking`
- `extraction.outputKinds[]`
- `extraction.missingDetails[]`
- `extraction.constraints`
- `routing.routeFamily`
- `routing.complexityLevel`
- `routing.needsPlan`
- `planning.executionProfile`
- `planning.verificationPlan`
- `planning.planCollapseRisk`
- `planning.clarificationNeeded`
- `planning.leadRole`
- `planning.phases[]`
- `planning.roleSlots[]`
- `planning.workerEligibility`
- `planning.noMicrotaskExplosion`
- `planning.outcomeClaims[]`
- `matching.leadRanking[]`
- `matching.roleMatches`
- `matching.assignmentProposal`
- `matching.replanReasons[]`
- `policy.nextAction`
- `policy.requiresOwnerApproval`
- `policy.preferredSupplyId`
- `policy.shouldOpenRequest`
- `policy.shouldCreateFulfillment`
- `policy.shouldCreateFulfillmentSteps`

Contract rule:

- enum-backed fingerprint fields such as `outputKinds`, `supplyKinds`, `executionChannels`, `routeFamily`, `executionKind`, `paymentMode`, `matchingMode`, `leadRole`, `roleSlots[].roleKey`, `phases[].phaseKey`, `workerEligibility.preferredActorKinds`, `workerEligibility.preferredSupplyKinds`, `workerEligibility.preferredOutputKinds`, `workerEligibility.roleKeys`, and evidence-claim lists must stay inside the canon catalog
- an unknown fingerprint value is a contract failure, not a soft warning

## Benchmark Pack

The deterministic benchmark pack now lives under:

- `fixtures/request/benchmark-actuals/request-rooted/`
- `fixtures/request/benchmark-actuals/task-first/`
- `fixtures/request/benchmark-actuals/direct-tool/`
- `fixtures/request/benchmark-actuals/web-live/`

These system families are not claims about live production models.
They are controlled baseline output sets used to measure whether the eval contract can distinguish:

- request-rooted lead-first planning
- early task-tree decomposition
- tool-biased digital-only routing

## Benchmark Metrics

The benchmark runner should report at least:

- `contractPassRate`
- `leadTop1Accuracy`
- `leadRecallAt3`
- `policyActionAcceptability`
- `requiredRoleSlotCoverage`
- `optionalRoleSlotCoverage`
- `overDecompositionRate`
- `forbiddenMutationRate`
- `embodiedStepRecall`
- `semanticEmbodiedStepRecall`
- `generativePlanCollapse`
- `verificationCompleteness`
- `semanticVerificationCompleteness`
- `falseCompletionRate`

The live-model runner should additionally report provider and parse reliability metrics that separate label drift from infrastructure failure:

- `callSuccessRate`
- `parseSuccessRate`

Metric intent:

- `embodiedStepRecall` measures whether execution-critical physical steps remain present in the plan.
- `generativePlanCollapse` measures the complement of embodied-step recall on embodied scenarios.
- `verificationCompleteness` measures whether required proof claims remain represented.
- `falseCompletionRate` measures whether the system moves toward fulfillment or closure while embodied or verification obligations remain unresolved.
- `requiredRoleSlotCoverage` and `optionalRoleSlotCoverage` should be interpreted against canonical `roleSlots`, even when the UI explains those slots as capability lanes.
- `callSuccessRate` measures whether the provider returned any model output at all, separating infrastructure or access failure from planning quality.
- `parseSuccessRate` measures whether the returned output was valid JSON for the frozen contract shape.
- `policyActionAcceptability` measures whether the chosen next action stayed inside the safe action band for the scenario, even when it differed from the exact fixture-preferred action.
- `requiredRoleSlotCoverage` measures whether required execution roles remained represented.
- `optionalRoleSlotCoverage` measures whether optional collaborator roles remained represented.
- `semanticEmbodiedStepRecall` measures whether the model preserved embodied work requirements even when it used semantically different but comparable wording.
- `semanticVerificationCompleteness` measures whether the model preserved proof obligations even when it used semantically different but comparable wording.

## Runner Usage

From the repo root:

- `pnpm evals`
  Runs the Promptfoo app-path suite for `apps/web` chat behavior. The wrapper starts the web app locally, runs a guest-auth/database preflight, posts synthetic cases to `/api/chat`, and writes Promptfoo output under `tmp/promptfoo/`.
- `pnpm evals:model-routing`
  Runs deterministic model-routing evals for default nano traffic, context-heavy promotion to `openai/gpt-5.4-mini`, and the direct OpenAI fallback order. It writes `tmp/promptfoo/model-routing/latest.json`.
- `pnpm evals:request-processing`
  Validates eval fixture structure only.
- `pnpm evals:request-processing:sample`
  Runs the sample actual output against the first complex planner and matcher fixture.
- `node tests/contracts/run-request-processing-evals.mjs --actual <path-to-actual-json>`
  Compares your planner or matcher result to the matching fixture by `scenarioId`.
- `pnpm contracts:public-pilot`
  Validates the seeded public-pilot happy path across one durable `Request`, verified funding, accepted `Commitment`, `Fulfillment`, delivery `Artifact`, request-attached `Transaction`, and replayable `RequestEvent` activity.
- `pnpm contracts:desktop-ledger-boundary`
  Validates that desktop request-bound execution is only an execution participant: local transcript and ephemeral runtime signals do not become a second request ledger, owner-private direct fulfillment remains narrow, and public tracked work keeps the accepted-commitment gate.
- `pnpm contracts:request-room-replay`
  Validates that request-room timeline cards can be reconstructed from durable `RequestEvent` entries plus related `Commitment`, `Artifact`, `Fulfillment`, and `Transaction` records.
- `pnpm contracts:idempotency`
  Validates payment, buyer-credit, commitment, artifact, and fulfillment mutation replay semantics: same key plus same input returns the same durable refs; same key plus changed input fails without new writes.
- `pnpm contracts:solution-runs`
  Validates the v0 public-solution-run fixture: completed public source request, accepted source artifact, private run request, buyer-credit debit, and request-attached transaction truth.
- `pnpm web:test:agent-discovery`
  Validates the read-only agent discovery package: public agent card, start guide, OpenAPI discovery index, allowlisted OpenAPI/JSON Schema/AsyncAPI exports, action preflight for commitment applications and owner-private direct fulfillment, and the `Request` root boundary.
- `pnpm contracts:in-house-workers`
  Validates the in-house Boreal worker application profile: scanner read-only guarantees, public `Commitment` application boundary, owner-private direct `Fulfillment` exception, auto-approval non-completion limits, prompt-only asset gates, live `video-generation`, live `humanizer`, and named-agent promotion gates.
- `pnpm web:test:boreal-agents`
  Validates the named Boreal agent route surface: unique `Mira` and `Tala` route templates, shared framework id/version, preparation-only route mode, boilerplate refs, `live_backed` promotion gates, `Mira` video-generation qualification, `Tala` humanizer qualification, caller-supplied request scan wake or skip behavior, public projection `workerEligibility` skip behavior, per-agent `namedAgentCandidates` carried into board and scan `plannerCandidate` display context, planner-candidate scan short-circuiting before preparation, human-required scanner skip behavior, governed mutation-call sketches for commitment or owner-private fulfillment routes, route-facing `requestFlowContext`, qualified `submissionPreflight` handoffs with runnable `preflightRequest` bodies, blocked packets with null preflight and mutation handoffs, authorized execution handoffs for post-fulfillment task/provider sequencing, and preparation-only packets that do not match, assign, create commitments, start fulfillments, publish artifacts, write events, create transactions, or call providers.
- `pnpm --filter @boreal/web exec tsx tests/contracts/showcase-request-catalog.test.ts`
  Validates beta work-card taxonomy for service request starters, open request listings, reuse-ready requests, canonical `Request` root, worker attachment state, next boundary, explicit in/out scope, shared request-flow stage/card/action-intent binding, service-family request-flow metadata, preset-plan stage and pre-execution gates, and visible service prefill boundary text such as Human Editorial Polish projecting to `human_service` plus `documentation_support` instead of generic provider supply.
- `pnpm web:test:service-checkout-route-boundary`
  Validates worker-backed service checkout for supported Humanizer and Video Generation plans: unsupported plans fail, insufficient credit has no supply or request side effects, selected first-party Supply is pinned, buyer credit becomes request-attached transaction truth, and execution remains pending without Fulfillment, provider, Artifact, review, or completion writes.
- `pnpm web:test:request-flow-taxonomy`
  Validates the actor-neutral request-flow taxonomy contract: schema and fixture enums, full TypeScript stage catalog coverage, card in/out and done/not-done fields, governed write/idempotency gates, public schema registration, and n8n sidecar/lossiness boundaries.
- `pnpm evals:request-processing:benchmark`
  Runs the deterministic multi-system benchmark pack and prints aggregate metrics.
- `node tests/contracts/run-request-processing-benchmark.mjs --write-json <path> --write-markdown <path> --write-tex <path>`
  Runs the same benchmark and writes machine-readable plus paper-ready artifacts.
- `pnpm evals:request-processing:matcher`
  Runs the current `apps/web` request planner and matcher against the full fixture snapshots and prints a `web-live` benchmark summary without mutating the committed benchmark pack.
- `pnpm evals:request-processing:matcher:write`
  Rebuilds `fixtures/request/benchmark-actuals/web-live/` from the live `apps/web` matcher so deterministic benchmark comparisons stay tied to real repo behavior.
- `pnpm evals:request-processing:live`
  Runs the live-model request-processing benchmark through the `apps/web` model provider route, preferring direct OpenAI when `OPENAI_API_KEY` is configured and falling back to Vercel AI Gateway when `AI_GATEWAY_API_KEY` is configured. It uses the default neutral prompt preset and writes a timestamped artifact bundle under `docs/papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/results/live-benchmark/`.
- `pnpm --filter @boreal/web eval:request-processing:live --model <model-id> --prompt <preset-id> --scenario <scenario-id> --repetitions <n> --output-dir <path>`
  Runs the same live benchmark with explicit models, frozen prompt presets, scenario filters, repetition count, and output path.

## Live Model Benchmark Discipline

The live-model benchmark exists to evaluate real LLM outputs without switching to model-judged scoring.

Rules:

- keep fixture truth in `fixtures/request/*.json`
- keep scoring contract in `tests/contracts/request-processing-eval-lib.mjs`
- freeze benchmark prompt presets in `tests/contracts/request-processing-live-presets.mjs`
- use exact or metric-based scoring, not a second LLM as the judge
- persist per-run prompt text, request metadata, response metadata, parsed JSON output, and scored metrics
- keep provider retries disabled by default for cleaner benchmark attribution
- keep temperature, seed, model id, gateway order, and reasoning-effort metadata in every recorded run
- treat house prompts and neutral prompts as separate benchmark systems instead of mixing them silently

The first live prompt presets are:

- `neutral_contract_v1`
- `neutral_contract_v2`
- `boreal_canon_v1`
- `boreal_canon_v2`

The default live runner behavior should remain:

- one frozen prompt preset
- one explicit model id
- zero hidden repair passes
- zero hidden model-judge scoring
- explicit artifact recording under a timestamped output directory

## Promptfoo App-Path Suite

The first Promptfoo suite lives under:

- `apps/web/evals/promptfoo/`

It evaluates the route users hit instead of only the raw prompt:

- `apps/web/evals/promptfoo/provider.cjs` signs in as a guest and posts to `/api/chat`
- `apps/web/scripts/run-promptfoo-evals.mjs` runs the local app-path health preflight before starting Promptfoo
- `apps/web/evals/promptfoo/promptfooconfig.yaml` defines synthetic seed cases
- `apps/web/evals/promptfoo/assertions.cjs` scores deterministic route output, tool calls, and business-rule language without using a second model judge

Initial seed coverage:

- support answer quality and live-versus-target overclaim risk
- request-mode `createRequestBrief` correctness
- embodied-work clarification and proof discipline
- request-briefing tool-call correctness for `outputKinds` versus evidence-only proof requirements
- request-grant passive-investment and tax-treatment boundaries
- generated-summary versus embodied-proof boundaries

Required local environment:

- `POSTGRES_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY` for the preferred direct OpenAI route, or `AI_GATEWAY_API_KEY` for the Vercel AI Gateway fallback used by `/api/chat`

Optional overrides:

- `BOREAL_PROMPTFOO_PORT`
- `BOREAL_PROMPTFOO_BASE_URL`
- `BOREAL_PROMPTFOO_COOKIE`
- `BOREAL_PROMPTFOO_MODEL`
- `BOREAL_PROMPTFOO_RATE_LIMIT_RETRIES` defaults to `1` and also retries transient provider timeouts
- `BOREAL_PROMPTFOO_RATE_LIMIT_DELAY_MS` defaults to `65000`
- `BOREAL_PROMPTFOO_AUTH_RETRIES` defaults to `4` and retries transient guest-auth/database connectivity failures before posting to `/api/chat`
- `BOREAL_PROMPTFOO_AUTH_RETRY_DELAY_MS` defaults to `5000`
- `BOREAL_PROMPTFOO_AUTH_TIMEOUT_MS` defaults to `20000`
- `BOREAL_PROMPTFOO_SKIP_HEALTH_PREFLIGHT=1` skips the wrapper preflight when the caller has already verified guest auth and database access
- `BOREAL_PROMPTFOO_EVAL_NO_DB=1` starts a fresh local eval server with an explicit no-DB eval session and dry-run request-brief tool output. Use only when live Neon auth/database connectivity is unavailable; this scores prompt, model, and tool-call behavior but does not cover persistence, real guest auth, rate-count reads, or replay safety.
- `BOREAL_PROMPTFOO_ROUTE_RETRY_DELAY_MS` defaults to `2000` for transient empty route responses during local server startup or auth refresh
- `BOREAL_PROMPTFOO_MIN_INTERVAL_MS` defaults to `0`; set to `65000` or higher for one-request-per-minute gateway limits
- `BOREAL_CONTEXT_HEAVY_TOKEN_ESTIMATE`, `BOREAL_CONTEXT_HEAVY_MESSAGE_COUNT`, and `BOREAL_CONTEXT_HEAVY_ACTIVITY_COUNT` tune when default nano chat traffic promotes to `openai/gpt-5.4-mini`

Fixtures must stay synthetic and free of secrets, customer data, and sensitive personal data.

## Model Routing Evals

The model-routing eval command is deterministic and does not call model providers:

- `pnpm evals:model-routing`

It verifies that:

- light default `openai/gpt-5.4-nano` traffic keeps nano as the effective model
- token-heavy, active-request-heavy, message-heavy, or recent-activity-heavy default nano traffic promotes to `openai/gpt-5.4-mini`
- direct rotation fallbacks preserve `openai/o3-mini`, `openai/o4-mini`, `openai/gpt-5-mini`, then `openai/gpt-4.1-nano`
- explicitly requested rotation models start at the requested model instead of silently promoting
- non-rotation pinned models stay unchanged
- the chat composer OpenAI picker exposes only the evaluated rotation set and keeps unevaluated pinned models out of the user-facing selector
- provider route order prefers direct OpenAI when `OPENAI_API_KEY` is configured and keeps Vercel Gateway as the fallback, not the first attempt

## Auto-Improve Audit Mode

The audit-first auto-improve command is:

- `pnpm evals:auto-improve`

It runs the Promptfoo app-path suite across candidate models, diagnoses failures, and writes a complete local audit bundle under `tmp/promptfoo/auto-improve/<run-id>/`.

Audit bundle contents:

- `audit.json` with sanitized environment presence, git state, per-model stats, per-case route/tool/error details, failure classification, and recommendations
- `summary.md` with the ranked model recommendation and follow-up actions
- `logs/*.log` with raw command output per model
- `results/*.json` with raw Promptfoo output and per-model preflight output
- `snapshots/*` with the eval config, assertions, provider, and runner used for the audit

When the command targets an already-running local server, the environment snapshot covers the audit runner process only. The existing app server may have loaded ignored env files such as `apps/web/.env.local`; secret values must not be copied into the audit bundle.

Policy:

- auto-improve is audit-only by default
- it must not silently edit production prompts, model defaults, tool schemas, or app behavior
- any recommended production change must be made as a normal reviewed patch and then rerun through the same eval suite

Optional model override:

- `BOREAL_PROMPTFOO_AUTO_MODELS=openai/gpt-5.4-nano,openai/gpt-5.4-mini,openai/o3-mini,openai/o4-mini,openai/gpt-5-mini,openai/gpt-4.1-nano`
- or `pnpm evals:auto-improve -- --models=openai/gpt-5.4-mini,openai/o3-mini,openai/o4-mini`

A reproducible multi-model study command now exists at the repo root:

- `pnpm evals:request-processing:live:study`
  Runs five OpenAI-routed models across `neutral_contract_v2` and `boreal_canon_v2` and writes a stable paper-facing artifact bundle under `docs/papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/results/live-benchmark/study-openai-multimodel-v1/`.

## Initial Score Discipline

Hard assertions:

- correct route family
- correct complexity band
- expected lead supply inside top-k
- forbidden mutation rate of `0`
- no fulfillment before approval outside the explicit owner-private direct lane
- no false closure when embodied execution or proof requirements remain unresolved

Soft assertions:

- explanation quality
- phase naming quality
- brief polish

## Initial Thresholds

- lead `Recall@3 >= 0.85`
- top-1 precision for simple direct-specialist cases `>= 0.80`
- over-decomposition rate for low-complexity requests `<= 0.10`
- forbidden mutation rate `= 0`
- fulfillment-before-approval rate `= 0`

## First Eval Pack

The first pack should cover:

- simple direct specialist
- simple direct tool
- complex human-led with AI support
- underspecified ask needing clarification
- no good supply fit
- budget mismatch
- team-required request
- embodied or verification-heavy request where digital-only planning would be wrong

## First Canon Fixture

The first planner and matcher eval fixture is:

- `fixtures/request/eval-complex-human-planning-and-match.json`

The sample matching actual output is:

- `fixtures/request/eval-complex-human-planning-and-match.actual.sample.json`

Use these as the baseline for offline deterministic checks before building a larger eval suite or live score dashboard.

The first deterministic benchmark systems are:

- `fixtures/request/benchmark-actuals/request-rooted/`
- `fixtures/request/benchmark-actuals/task-first/`
- `fixtures/request/benchmark-actuals/direct-tool/`

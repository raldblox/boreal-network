# Evals

This file defines how Boreal evaluates request processing, planning, matching, policy, and mutation safety.

## Core Rule

Eval quality and safety together.
A high-scoring match system that mutates too early is still failing.

## Eval Layers

### 1. Extraction evals

Verify that a raw ask becomes the expected brief, optional structured `seeking`, constraints, output kinds, budget shape, and missing-field list.
If a request-briefing assist or optimizer profile is active, verify that it improves brief readability for terse asks without changing the explicit facts.
Verify that pinned-supply routing context stays outside the buyer-authored brief and does not appear as synthetic prompt text when the request started from a supply selection.
Verify that selected supply context remains in `routing.preferredSupplyId` or equivalent routing fields instead of being rewritten into buyer-authored brief text.
Verify that owner-safe planner prompt context may include preferred-supply and bounded candidate-supply summaries when retrieval already happened, while responder or public lanes do not inherit owner-private routing hints.
Verify that owner-private pinned supply may preseed route-facing derived fields only when that route narrowing is already truthful for the current request.
Verify that clearing pinned supply removes only that preferred-supply route bias and does not leave stale direct-route hints behind.
Verify that pinned supply stays candidate-only in planner outputs until the current request truth actually supports that narrowed lead lane.
Verify that requests implying onsite work, pickup or dropoff, field inspection, witnessed handoff, measurement, or other non-substitutable human execution surface those requirements instead of rewriting them as digital-only work.
Verify that planner-derived role, phase, execution, and proof outputs do not leak back into the buyer-authored editable brief surface.

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
Verify that request-grant funding, solver payout, reviewer compensation, and solution-run writes stay attached to a `Request` through `Transaction` records.
Verify that public solution surfaces are projected only from completed requests with accepted artifacts, not from chat summaries or unreviewed drafts.
Verify that viewing a public solution does not emit credit-debit or transaction writes.
Verify that running a public solution creates or uses a referenced run request before debiting credits for inference or execution.

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

- enum-backed fingerprint fields such as `outputKinds`, `supplyKinds`, `executionChannels`, `routeFamily`, `executionKind`, `paymentMode`, `matchingMode`, `leadRole`, `roleSlots[].roleKey`, `phases[].phaseKey`, and evidence-claim lists must stay inside the canon catalog
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

- `pnpm evals:request-processing`
  Validates eval fixture structure only.
- `pnpm evals:request-processing:sample`
  Runs the sample actual output against the first complex planner and matcher fixture.
- `node tests/contracts/run-request-processing-evals.mjs --actual <path-to-actual-json>`
  Compares your planner or matcher result to the matching fixture by `scenarioId`.
- `pnpm evals:request-processing:benchmark`
  Runs the deterministic multi-system benchmark pack and prints aggregate metrics.
- `node tests/contracts/run-request-processing-benchmark.mjs --write-json <path> --write-markdown <path> --write-tex <path>`
  Runs the same benchmark and writes machine-readable plus paper-ready artifacts.
- `pnpm evals:request-processing:matcher`
  Runs the current `apps/web` request planner and matcher against the full fixture snapshots and prints a `web-live` benchmark summary without mutating the committed benchmark pack.
- `pnpm evals:request-processing:matcher:write`
  Rebuilds `fixtures/request/benchmark-actuals/web-live/` from the live `apps/web` matcher so deterministic benchmark comparisons stay tied to real repo behavior.
- `pnpm evals:request-processing:live`
  Runs the live-model request-processing benchmark through the `apps/web` AI Gateway stack using the default neutral prompt preset and writes a timestamped artifact bundle under `docs/papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/results/live-benchmark/`.
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

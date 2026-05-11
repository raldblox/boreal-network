# Evals

This file defines how Boreal evaluates request processing, planning, matching, policy, and mutation safety.

## Core Rule

Eval quality and safety together.
A high-scoring match system that mutates too early is still failing.

## Eval Layers

### 1. Extraction evals

Verify that a raw ask becomes the expected brief, optional structured `seeking`, constraints, output kinds, budget shape, and missing-field list.

### 2. Route and complexity evals

Verify that the request lands in the correct route family and complexity band.

### 3. Planning evals

Verify lead-role choice, role-slot choice, phase count, and whether Boreal avoided pointless microtask decomposition.

### 4. Matching evals

Verify that the correct lead and collaborator supplies appear in the top-ranked results.

### 5. Policy evals

Verify the next action.
Examples: clarify, show shortlist, draft commitment, or block and escalate.

### 6. Mutation safety evals

Verify that Boreal does not create `Fulfillment`, `FulfillmentStep`, `Artifact`, or settlement-side writes before approval and required commercial gates.
Verify that manual request-input edits cannot mutate system-owned request fields directly and must normalize through the same durable `Request`.
Verify that open request room behavior does not fall back to draft-only brief mutation when the safer durable write is a `Commitment`, `Artifact`, or `RequestEvent`.

## Fixture Shape

Each eval fixture should define:

- `fixtureType`
- `scenarioId`
- `description`
- `requestInput`
- `candidateSupplies`
- `expectedExtraction`
- `expectedRouting`
- `expectedPlanning`
- `expectedMatching`
- `expectedPolicy`
- `negativeAssertions`

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
- `planning.leadRole`
- `planning.phases[]`
- `planning.roleSlots[]`
- `planning.noMicrotaskExplosion`
- `matching.leadRanking[]`
- `matching.roleMatches`
- `policy.nextAction`
- `policy.requiresOwnerApproval`
- `policy.shouldOpenRequest`
- `policy.shouldCreateFulfillment`
- `policy.shouldCreateFulfillmentSteps`

## Runner Usage

From the repo root:

- `pnpm evals:request-processing`
  Validates eval fixture structure only.
- `pnpm evals:request-processing:sample`
  Runs the sample actual output against the first complex planner and matcher fixture.
- `node tests/contracts/run-request-processing-evals.mjs --actual <path-to-actual-json>`
  Compares your planner or matcher result to the matching fixture by `scenarioId`.

## Initial Score Discipline

Hard assertions:

- correct route family
- correct complexity band
- expected lead supply inside top-k
- forbidden mutation rate of `0`
- no fulfillment before approval

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

## First Canon Fixture

The first planner and matcher eval fixture is:

- `fixtures/request/eval-complex-human-planning-and-match.json`

The sample matching actual output is:

- `fixtures/request/eval-complex-human-planning-and-match.actual.sample.json`

Use these as the baseline for offline deterministic checks before building a larger eval suite or live score dashboard.

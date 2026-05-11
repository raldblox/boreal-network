# Tool Calling Contracts

This file defines Boreal's internal planner, matcher, policy, and mutation tool boundaries.

## Core Rule

Planner proposes.
Matcher scores.
Policy decides.
Mutation tools commit.

Do not let one opaque tool both infer the route and mutate canonical objects.

## Tool Layers

### Planner tools

Planner tools are read-only.
They transform a raw ask into typed planning outputs.

First set:

- `prepare_request_draft`
- `detect_missing_fields`
- `classify_request_complexity`
- `classify_request_route`
- `plan_fulfillment`

Planner outputs may include:

- `RequestDraft`
- `MatchSpec`
- `RoutePlan`
- `RoleSlot[]`
- `PhasePlan[]`

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
- `attach_match_shortlist`
- `draft_commitment`
- `accept_commitment`
- `create_fulfillment`
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

## Safety Rules

- Planner tools must not create canonical objects.
- Matcher tools must not mutate ranking history or canonical objects.
- Policy tools must not bypass approval boundaries.
- Mutation tools must be idempotent where retries are possible.
- `Fulfillment` and `FulfillmentStep` must not be created before the approved commercial boundary is satisfied.
- Tool-produced output should be recorded as `RequestEvent` when the thread needs durable explanation or auditability.

## First Implementation Target

The first Boreal slice should prove:

1. request draft preparation
2. complexity and route classification
3. lead supply search and ranking
4. optional fulfillment planning for complex work
5. policy choosing `draft_commitment`

Do not start by automating payout, dispute, or deep multi-step execution before this core loop is stable.

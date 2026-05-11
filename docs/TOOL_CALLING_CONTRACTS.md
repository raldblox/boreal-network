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
- `create_request_brief`
- `update_request_brief`
- `update_request_constraints`
- `update_request_budget_and_timing`
- `update_request_route_summary`
- `propose_commitment`
- `publish_artifact`
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
- Request-briefing mutation tools must keep updating the same draft `Request` instead of creating a second durable demand object.
- Draft request mode and open request mode should not share one forced mutation policy.
- Open request room tools should prefer `Commitment`, `Artifact`, and `RequestEvent` writes over `brief` rewrites.
- `create_request_brief` and `update_request_brief` may carry explicit same-turn canonical facts such as budget or deadline so one intake turn does not drop structured demand fields.
- `create_request_brief` and `update_request_brief` should prefer title plus body first and must not fabricate `brief.summary` only to satisfy a shape.
- Request-briefing mutations should use top-level `seeking` for structured matching intent rather than relying on `brief.tags`.
- If the request briefing UI exposes a manual JSON draft surface, tool mutations and `open_request` must normalize the latest draft-input projection before writing the durable `Request`.
- `Fulfillment` and `FulfillmentStep` must not be created before the approved commercial boundary is satisfied.
- Tool-produced output should be recorded as `RequestEvent` when the thread needs durable explanation or auditability.

## First Implementation Target

The first Boreal slice should prove:

1. explicit request mode plus first-send request draft creation
2. live request-brief updates through visible mutation tools
3. complexity and route classification
4. lead supply search and ranking
5. optional fulfillment planning for complex work
6. policy choosing `draft_commitment`

Do not start by automating payout, dispute, or deep multi-step execution before this core loop is stable.

# Public Pilot Operator Runbook

This runbook keeps the first public or semi-public pilot supportable without turning operator notes into a competing system of record.
It is downstream of root canon and the self-serve marketplace launch plan.

## Scope

Use this runbook only for narrow buyer-funded request pilots with curated or whitelisted supply.
It does not authorize broad marketplace claims, open supply publishing, request grants, or public solution-run claims.

## Canonical Records To Inspect First

Before taking operator action, inspect the canonical records for the pilot lane:

1. `Request` for owner, visibility, status, brief, routing, budget, timing, and active references.
2. `RequestParticipant` or participant-derived access state for buyer, responder, resolver, reviewer, or funder roles.
3. `Commitment` for quoted terms, acceptance, rejection, or supersession.
4. `Fulfillment` and `FulfillmentStep` for execution status, blockers, retries, proof obligations, and delivery state.
5. `Artifact` for proof, receipt, file, media, signature, or delivery outputs.
6. `Transaction` for request-attached funding, credit application, settlement, refund, payout, or reconciliation state.
7. `RequestEvent` for replayable history and operator audit.

Do not resolve support incidents from chat transcript, desktop-local state, provider dashboard state, or private notes alone.
If an incident matters to the business state of the request, it needs canonical record evidence or a documented gap.

## Manual Pilot Flow

1. Confirm the buyer and request owner are known.
2. Confirm the request is eligible for the pilot lane and is not being represented as broad marketplace liquidity.
3. Confirm the request has explicit payment or buyer-credit state before funded work proceeds.
4. Confirm public or cross-actor work has an accepted `Commitment` before `Fulfillment` starts, unless the lane is owner-private and canon explicitly allows direct fulfillment.
5. Confirm execution progress lands on `Fulfillment` or `FulfillmentStep`, not a new root request.
6. Confirm delivery proof lands as an `Artifact` outside the request root.
7. Confirm the workroom timeline can be explained from durable activity rather than ephemeral desktop or chat state.
8. Confirm support decisions are captured as canonical events, status changes, artifacts, transactions, or documented gaps.

## Refund And Cancellation Procedure

Use this procedure when the buyer asks to cancel, a provider cannot perform, or a payment/credit correction is required.

1. Pause any new execution until the current `Request`, `Commitment`, `Fulfillment`, `Artifact`, and `Transaction` states are inspected.
2. Determine whether work is still in intake, committed but not started, active fulfillment, delivered pending review, or accepted.
3. If no durable work has started, prefer cancellation or refund paths that do not create fake failure events.
4. If work started, preserve the existing `Fulfillment` and record the reason for cancellation or refund against request-attached transaction truth.
5. If refund or credit adjustment is manual, record the reconciliation reference and reason in durable operator notes or a canonical event once available.
6. Never describe pilot request funding as passive investment, yield, dividend, or tax-deductible donation.

## Blocked Fulfillment Procedure

Use this procedure when a responder, resolver, provider, or workflow cannot continue without buyer, operator, or system action.

1. Keep the same `Fulfillment` lane; do not create a new `Request` unless separate funding, ownership, market routing, or review boundaries are required.
2. Move or keep the fulfillment in a blocked state only when the blocker is real and action-guiding.
3. Capture blocker type, owner, next action, retryability, and expected evidence.
4. If buyer clarification is needed, request the missing information through the request workroom and keep the durable request thread intact.
5. If provider handoff failed, preserve provider recovery metadata and retry through the same lane when possible.
6. If the blocker changes the commitment terms, supersede or replace the `Commitment` instead of mutating historical terms silently.

## Provider Failure Procedure

Use this procedure for first-party workers, workflow-backed supply, payment providers, file storage, model providers, or desktop runtime failures.

1. Identify whether the failure happened before durable mutation, during handoff, during active execution, during artifact storage, or during payment settlement.
2. Preserve idempotency keys, provider task ids, webhook ids, object storage ids, or resolver token context that are needed for safe replay.
3. Retry only idempotent operations or explicitly supported retry endpoints.
4. Do not mark queued provider work as failed solely because it has not completed yet.
5. If a durable artifact is missing, do not mark the request completed.
6. If payment settlement is uncertain, reconcile before payout or artifact acceptance claims.

## Artifact Review Procedure

Use this procedure when a delivery artifact is submitted for buyer or reviewer acceptance.

1. Confirm the artifact belongs to the correct `Request` and `Fulfillment` lane.
2. Confirm the artifact is stable enough to inspect, reference, or store.
3. Confirm proof obligations are satisfied before request closure.
4. If the artifact needs revision, keep revision state on artifact or fulfillment records rather than rewriting the request root.
5. If the artifact is accepted and public-solution projection is allowed, expose only the approved public-safe projection.
6. Viewing a public solution must not create credit-debit or transaction writes by itself.

## Escalation Triggers

Escalate before proceeding when an operator action would:

- rename or weaken canonical objects
- bypass a commitment gate for public or cross-actor work
- mutate payment, refund, payout, or buyer-credit state without idempotency evidence
- expose owner-only or planner-internal fields publicly
- turn desktop-local state into a request ledger
- mark a request complete without required proof
- claim public marketplace behavior that is still target direction

## Completion Evidence

For each supported pilot incident, leave enough evidence that another operator can reconstruct:

- who owned the request
- who supplied or resolved the work
- what was committed
- what was funded
- what was fulfilled
- what artifact was delivered or rejected
- what transaction or credit action occurred
- what event or operator note explains the decision

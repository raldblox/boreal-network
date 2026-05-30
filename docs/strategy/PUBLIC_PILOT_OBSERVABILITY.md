# Public Pilot Observability Notes

These notes define the minimum operator-visible signals for the public pilot gates.
They are not a replacement for canonical `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent` records.

## Required Pilot Signals

Track these signals for every public or semi-public pilot lane:

- request intake count by status, visibility, route family, and payment mode
- request open-to-first-commitment latency
- commitment proposal, acceptance, rejection, and supersession counts
- fulfillment create, start, block, retry, deliver, accept, cancel, and fail counts
- blocked fulfillment count by blocker type and next-action owner
- provider handoff attempts, retry attempts, queued provider tasks, and terminal provider failures
- artifact delivery count by kind, container kind, revision state, and acceptance state
- buyer-credit top-up, apply, refund, and adjustment counts
- request-attached transaction create, pending, settled, refunded, failed, and payout states
- public projection reads for request pool and public solution previews
- desktop resolver approval, token refresh, token revoke, bridge health, and request-bound execution attempts

## Payment Settlement Signals

For payment and buyer-credit pilot lanes, preserve enough metadata to reconcile:

- request id
- transaction id or buyer-credit ledger entry id
- payment provider
- provider order, capture, webhook, or settlement id
- idempotency key
- settlement amount and currency
- settlement status
- refund or reversal reference when applicable
- last reconciliation timestamp

Payment webhook replay or buyer-return races must be visible as idempotent replays, not duplicated settled credit.

## Provider Handoff Signals

For workflow-backed or provider-backed fulfillment, preserve:

- fulfillment id
- fulfillment step id when available
- provider task id
- provider status
- queued versus failed distinction
- retryability
- retry count
- next retry or escalation owner
- durable artifact id once storage succeeds

Queued provider work is not a failure by itself.
Do not claim delivery until a durable artifact lands.

## Fulfillment Blocking Signals

Every blocked fulfillment should make these fields visible to operators:

- blocker type
- blocker summary
- next action owner
- retryable or terminal classification
- affected step id
- missing buyer input, provider recovery metadata, or artifact proof obligations
- last operator action
- next follow-up time when applicable

## Artifact Acceptance Signals

Artifact review should expose:

- artifact id
- fulfillment id
- artifact kind
- container kind
- public projection eligibility
- revision state
- accepted or rejected state
- required proof obligations still missing
- reviewer or buyer action timestamp

## Dashboard Gate

Before broad public launch, convert these notes into dashboards or equivalent operator views for:

- request funnel
- commitment funnel
- fulfillment health
- blocked work queue
- provider handoff retries
- artifact review queue
- payment and credit reconciliation
- refund and dispute queue
- public projection safety

Until those dashboards exist, keep launch language at the pilot layer and rely on this checklist plus canonical record inspection.

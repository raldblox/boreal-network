# Event Model

This file defines Boreal Network's canonical append-only history model.

## Core Rule

`RequestEvent` is the immutable history ledger for request-native work.

The request root stores current summary state.
The ledger stores what actually happened.

## Why

This split gives Boreal Network:

- durable audit trails
- replay safety
- projection rebuilds
- clean summaries on root objects
- better multi-actor collaboration history

## Event Envelope

Every durable event should carry:

- `eventId`
- `requestId`
- `aggregateType`
- `aggregateId`
- `sequence`
- `eventType`
- `schemaVersion`
- `occurredAt`
- `recordedAt`
- `actor`
- `correlationId`
- `causationId`
- `idempotencyKey`
- `payload`

Optional but recommended:

- `traceId`
- `spanId`
- `source`

## Event Naming

Use dot-separated past-tense names:

- `request.opened`
- `request.funding_required`
- `commitment.proposed`
- `commitment.accepted`
- `fulfillment.started`
- `fulfillment.delivered`
- `artifact.added`
- `transaction.verified`

Rules:

- keep names stable
- keep names business-meaningful
- avoid UI-specific event names
- version the payload, not the semantic meaning, unless the meaning truly changed

Request-grant, review, and public-solution activity should use the existing request, commitment, fulfillment, artifact, and transaction event families unless a later contract decision adds narrower event names.
Do not introduce investment, yield, dividend, or passive revenue-share event names for funder activity.

## Event Families

### Request events

- opened
- updated
- cancelled
- completed
- failed
- status_changed

`request.updated` may include buyer-submitted briefing source text when the buyer explicitly submits it as request source context.
It must not include provider prompts, hidden chain-of-thought, tool stdout, credentials, or other transient runtime internals.

### Participant events

- joined
- invited
- removed
- role_changed

### Commitment events

- proposed
- accepted
- rejected
- expired
- superseded

### Fulfillment events

- created
- updated
- started
- blocked
- resumed
- delivered
- accepted
- cancelled
- failed

Owner-private desktop, first-party service, or Boreal-managed worker auto-fulfillment may emit `fulfillment.created`, `artifact.added`, and later fulfillment events without a prior `commitment.accepted` event.
In that lane, event payloads may omit `commitmentId`, but newly written `fulfillment.created` payloads should include the selected `supplyId` when present plus non-secret authorization context such as `authorization.mode=owner_private_direct`, `approvalMode=trusted_worker_auto_approval`, and the selected supply or worker key used by the route gate.

### Step events

- created
- started
- blocked
- completed
- failed

### Artifact events

- added
- updated
- withdrawn

Artifact payloads may carry:

- `fulfillmentId` when the artifact belongs to one execution lane
- `stepId` when the artifact belongs to one fulfillment step
- a stable container union such as `document`, `external_ref`, or `object_ref`

Public-solution projection metadata should live on the artifact record or rebuildable projection logic until `schemas/events/` accepts a narrower payload shape.

### Transaction events

- required
- authorized
- verified
- settled
- payout_pending
- paid_out
- refunded
- disputed
- failed

Request grants should appear as transaction payload meaning and request-attached transaction records, not as a separate event family.
Public solution inspection should not emit durable transaction events by default.
Credit-consuming solution runs should emit normal transaction and fulfillment events on the run request.

## Ordering Rules

- Sequence must be monotonic within a request stream.
- `sequence` is the stable checkpoint for request activity monitors; HTTP reads may resume with `after_sequence` without writing a heartbeat event.
- Signed monitor webhook delivery is transport over the same durable event envelope; delivery ids, retry attempts, and receiver acknowledgements are not `RequestEvent` history by default.
- Cross-request global ordering is not required.
- Replays must not duplicate business effects.
- Projections must treat duplicate events with the same idempotency key as no-ops.

## Redaction Rules

Events are durable.
Do not emit:

- secrets
- private keys
- raw wallet seeds
- transient provider session tokens
- prompt internals that are not part of durable business truth

If sensitive payload must be referenced:

- store a stable reference
- store safe metadata
- keep the sensitive body elsewhere under stricter control

## Ephemeral Transport Signals

Not every realtime signal is a durable `RequestEvent`.

These signal classes are ephemeral by default:

- typing indicators
- token deltas
- progress ticks
- heartbeats
- presence updates
- transient runtime logs
- raw tool stdout
- raw tool stderr

They may flow through WebSocket, SSE, peer streams, or local IPC.
They should not create default durable event history unless Boreal explicitly promotes a summarized or business-meaningful outcome into a canonical event or adjacent durable object.

## Projection Rule

`Request`, `Fulfillment`, and other summary objects are projections plus current-truth aggregates.

They must be reconstructible from:

- the event stream
- canonical related records
- deterministic projection logic

Public solution surfaces are projections over completed requests and accepted artifacts.
They must be rebuildable from the same durable request history.
Paid run projections should link back to the source accepted artifact without mutating the source request history.

## Contract Placement

- Human-readable rules live here.
- Event schemas live under `schemas/events/`.
- Event-related invariants live in `docs/TEST_MATRIX.md`.

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

## Event Families

### Request events

- opened
- updated
- cancelled
- completed
- failed
- status_changed

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

## Ordering Rules

- Sequence must be monotonic within a request stream.
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

## Projection Rule

`Request`, `Fulfillment`, and other summary objects are projections plus current-truth aggregates.

They must be reconstructible from:

- the event stream
- canonical related records
- deterministic projection logic

## Contract Placement

- Human-readable rules live here.
- Event schemas live under `schemas/events/`.
- Event-related invariants live in `docs/TEST_MATRIX.md`.

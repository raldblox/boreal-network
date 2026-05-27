# State Machines

This file defines the canonical lifecycle states for Boreal Network aggregates.

## General Rules

- State names must be stable and machine-friendly.
- User-facing labels may differ from stored values.
- Transitions must be explicit.
- Terminal states must be easy to detect.
- Invalid transitions must fail loudly.

## `Supply`

### Canonical states

- `draft`
- `published`
- `paused`
- `retired`

### Meaning

- `draft`: owner is shaping the capability record and it is not yet active for routing.
- `published`: supply is active for the visibility lane it chose.
- `paused`: supply remains durable but should not receive new routing until resumed.
- `retired`: supply is intentionally closed and should not re-enter active routing.

### Allowed transitions

- `draft` -> `published`
- `draft` -> `retired`
- `published` -> `paused`
- `published` -> `retired`
- `paused` -> `published`
- `paused` -> `retired`

### Invariants

- A `published` supply must satisfy the required profile, capability, and availability shape.
- Runtime, resolver, or provider bindings are optional enrichments and must not replace the supply owner actor.
- `retired` is terminal.

## `Request`

### Canonical states

- `draft`
- `open`
- `funding_required`
- `funded`
- `in_progress`
- `waiting_for_owner`
- `delivered`
- `completed`
- `cancelled`
- `failed`

### Meaning

- `draft`: not yet opened as live network work.
- `open`: active and routable; may be matching, inviting, or collecting commitments.
- `funding_required`: a commitment exists and execution is blocked on required funding.
- `funded`: the funding boundary is satisfied and execution may begin.
- `in_progress`: work is actively being fulfilled.
- `waiting_for_owner`: the network is blocked on owner clarification, approval, or acceptance.
- `delivered`: a fulfillment delivered work and awaits final owner resolution.
- `completed`: the request has reached accepted closure.
- `cancelled`: the request was intentionally closed without successful completion.
- `failed`: the request failed in a terminal way.

Accepted closure may later project as a public solution surface, but the completed `Request` remains the durable source of truth.

### Allowed transitions

- `draft` -> `open`
- `draft` -> `cancelled`
- `open` -> `funding_required`
- `open` -> `funded`
- `open` -> `in_progress`
- `open` -> `cancelled`
- `open` -> `failed`
- `funding_required` -> `funded`
- `funding_required` -> `cancelled`
- `funding_required` -> `failed`
- `funded` -> `in_progress`
- `funded` -> `cancelled`
- `funded` -> `failed`
- `in_progress` -> `waiting_for_owner`
- `in_progress` -> `delivered`
- `in_progress` -> `failed`
- `in_progress` -> `cancelled`
- `waiting_for_owner` -> `in_progress`
- `waiting_for_owner` -> `delivered`
- `waiting_for_owner` -> `cancelled`
- `waiting_for_owner` -> `failed`
- `delivered` -> `completed`
- `delivered` -> `in_progress`
- `delivered` -> `failed`
- `delivered` -> `cancelled`

### Invariants

- A request in `funding_required` must have an active commitment reference.
- A request in `funded` or later must have at least one funding or approval event proving the boundary.
- A request in `in_progress` or later must have an active fulfillment.
- A request in `in_progress` or later may omit `activeCommitmentId` only when the fulfillment was authorized through the owner-private direct auto-fulfillment lane.
- Optional request grants do not create separate request states; they move through the same `funding_required`, `funded`, fulfillment, delivery, and completion gates when they are required for execution.
- A public solution surface must not project from a request until the relevant artifact and fulfillment or review path has reached accepted closure.
- Inspecting a public solution should not change the source request state.
- Running or forking a public solution for a new user should create a new request or accepted execution lane instead of reopening the completed source request.
- `completed`, `cancelled`, and `failed` are terminal.

## `Commitment`

### Canonical states

- `proposed`
- `accepted`
- `rejected`
- `expired`
- `superseded`
- `cancelled`

### Allowed transitions

- `proposed` -> `accepted`
- `proposed` -> `rejected`
- `proposed` -> `expired`
- `proposed` -> `superseded`
- `proposed` -> `cancelled`
- `accepted` -> `superseded`
- `accepted` -> `cancelled`

### Invariants

- Only one active accepted commitment of the same exclusive role should exist at a time unless the request explicitly allows multiple accepted lanes.
- Superseded commitments remain durable history.

## `Fulfillment`

### Canonical states

- `planned`
- `ready`
- `active`
- `blocked`
- `delivered`
- `accepted`
- `cancelled`
- `failed`

### Allowed transitions

- `planned` -> `ready`
- `planned` -> `cancelled`
- `ready` -> `active`
- `ready` -> `cancelled`
- `active` -> `blocked`
- `active` -> `delivered`
- `active` -> `failed`
- `active` -> `cancelled`
- `blocked` -> `active`
- `blocked` -> `failed`
- `blocked` -> `cancelled`
- `delivered` -> `accepted`
- `delivered` -> `active`
- `delivered` -> `failed`

### Invariants

- A fulfillment should point to exactly one request.
- A fulfillment should point to the commitment that authorized it, or remain direct-owner authorized for the owner-private desktop lane.
- `accepted`, `cancelled`, and `failed` are terminal.

## `FulfillmentStep`

### Canonical states

- `todo`
- `ready`
- `active`
- `blocked`
- `done`
- `cancelled`
- `failed`

### Invariants

- A step belongs to exactly one fulfillment.
- Step dependencies must not form cycles.
- Parent step closure must not imply request closure automatically.

## `Transaction`

### Canonical states

- `pending`
- `authorized`
- `verified`
- `settled`
- `payout_pending`
- `paid_out`
- `refunded`
- `disputed`
- `failed`

### Allowed transitions

- `pending` -> `authorized`
- `pending` -> `verified`
- `pending` -> `failed`
- `authorized` -> `verified`
- `authorized` -> `failed`
- `verified` -> `settled`
- `verified` -> `failed`
- `settled` -> `payout_pending`
- `settled` -> `refunded`
- `settled` -> `disputed`
- `payout_pending` -> `paid_out`
- `payout_pending` -> `disputed`
- `payout_pending` -> `failed`

### Invariants

- Money totals must never be inferred from chat text alone.
- Request-grant funding, reviewer compensation, solver payout, refund, and solution-run credit debit states must remain request-attached and auditable.
- Public solution inspection must not create a transaction state by itself.
- Passive funders must not receive automatic payout states unless a later canon decision explicitly changes the commercial and compliance boundary.
- Terminal transaction states must remain auditable and immutable.

# API Contracts

This file defines how Boreal Network exposes machine-facing contracts.

## Contract Layers

### JSON Schema

Use for canonical object shapes and durable payload structures.

Location:

- `schemas/json/`

### OpenAPI

Use for synchronous HTTP contracts, webhooks, and public API surfaces.

Location:

- `schemas/openapi/`

### AsyncAPI

Use for async event channels, streaming notifications, and replayable event contracts.

Location:

- `schemas/events/`

## Design Principles

### 1. Resource names follow canonical objects

Prefer paths like:

- `/requests`
- `/supplies`
- `/commitments`
- `/fulfillments`
- `/transactions`

Do not invent alternative resource names that hide the taxonomy.

### 2. Idempotency is first-class

Mutating create or action endpoints should support idempotency keys where duplication is possible.

Examples:

- create request
- create commitment
- submit payment confirmation
- accept delivery

### 3. Actor context is explicit

Requests should carry durable actor identity context through auth, actor ids, or explicit participant references.

Do not infer durable ownership from display labels.

### 4. Async effects must have event contracts

If a sync endpoint triggers durable async state changes, document the emitted events in the same patch.

### 5. Version contracts deliberately

- additive changes are preferred
- breaking changes require explicit versioning or deprecation paths
- do not silently change payload meaning

## Canonical External Surfaces

At minimum, the network should be able to expose contracts for:

- request intake
- supply publish or update
- commitment propose or accept
- fulfillment progress and delivery
- payment verification and payout visibility
- event subscription or replay

## Example Contract Boundaries

### `Request`

Should expose:

- create
- read
- list
- update allowed mutable fields
- append messages or actions through event-safe surfaces

For the first web slice, `Request` create and update must support:

- explicit `New request` mode without a durable write until first send
- first-send draft creation for request-mode intake
- public-safe listing of `open` plus `public` requests for network or desktop pooling
- explicit `save draft` normalization from the live request-input document surface
- request-brief field updates
- request-seeking field updates for structured matching intent
- request constraint updates
- request budget and timing updates
- request route-summary updates
- explicit transition from `draft` to `open`
- manual request-object editing only while the request stays in `draft`
- full canonical request-object projection as read-only once the request leaves `draft`
- public request pool reads must exclude owner-only draft fields and should expose a public-safe request projection instead
- request activity reads through `/requests/{id}/activity` so open request rooms can render durable timeline cards without replaying chat transcript

### `Commitment`

Should expose:

- propose
- accept
- reject
- supersede

In the first open-request room slice, commitment proposal may be created as durable activity without forcing a rewrite of the request brief.

### `Fulfillment`

Should expose:

- create from accepted route
- start
- block
- resume
- deliver
- accept

### `Transaction`

Should expose:

- payment requirement
- verification result
- settlement status
- payout status

## Internal Tool Contracts

Planner, matcher, policy, and mutation tool boundaries are part of Boreal's canonical machine-facing behavior.

Use [TOOL_CALLING_CONTRACTS.md](TOOL_CALLING_CONTRACTS.md) for:

- read-only planner and matcher envelopes
- policy next-action outputs
- mutation-tool result envelopes
- approval and idempotency boundaries

Open request room behavior should prefer `Commitment`, `Artifact`, and `RequestEvent` writes over draft-style brief mutation.

## Schema Discipline

- Human-readable contract rules live in this file.
- Machine-readable HTTP contracts live in OpenAPI files.
- Machine-readable event contracts live in AsyncAPI files.
- Machine-readable object payloads live in JSON Schema files.

Do not make markdown the only contract surface once a machine-readable contract exists.

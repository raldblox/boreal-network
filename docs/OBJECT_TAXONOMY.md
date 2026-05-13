# Object Taxonomy

This file locks the canonical object set for Boreal Network.

## Canonical Objects

### `Actor`

Represents a participant identity.

Examples:

- human user
- agent
- tool
- organization
- runtime node

`Actor` is identity, not capability.

### `Supply`

Represents a published capability that can be matched, invited, hired, or routed.

Examples:

- specialist agent
- human service listing
- provider-backed capability
- local runtime executor
- collective team listing

`Supply` is the canonical supply-side object.
UI may call it `Offer`, but the schema should not.

### `Request`

Represents the durable demand-side root object and the canonical work thread.

It carries:

- creator and owner
- visibility
- canonical brief fields: title and body, plus optional summary
- optional structured `seeking` criteria for matching intent
- optional budget and optional deadline
- derived route, matching, and readiness projections
- current lifecycle status
- active commitment and fulfillment references
- latest progress summary

`Request` is the main object of the network.
It may begin as an explicit draft before routing, funding, or fulfillment details are complete.
When a request is both `open` and `public`, it may be exposed to external supply as a fetchable market request.

### `RequestParticipant`

Represents the relationship between a request and an actor.

Typical roles:

- owner
- requester
- watcher
- proposer
- assignee
- collaborator
- runtime

This keeps participation explicit instead of hidden in ad hoc arrays.

### `Commitment`

Represents a commercial or approval boundary attached to a request.

Use one object with `kind`, such as:

- quote
- proposal
- assignment
- milestone
- acceptance

This unifies direct specialist flows and market proposal flows under one durable concept.

`Commitment` remains canonical for public, external, funded, or approval-gated work.

Owner-private desktop auto-resolution may skip a visible `Commitment` object and authorize execution directly from the owner-bound `Request`.

### `Fulfillment`

Represents an accepted execution lane for a request.

It answers:

- who is doing the work
- under which accepted commitment, or under direct owner-private authorization
- with what status
- toward what delivery

It is separate from the request root and separate from the financial transaction.

### `FulfillmentStep`

Represents sub-work under one fulfillment.

Examples:

- plan
- analysis
- generation
- tool call
- review
- delivery step
- collaborator handoff

Default rule:

- worker-generated work becomes `FulfillmentStep`

New root requests are reserved for new business boundaries.

### `Artifact`

Represents output or proof.

Artifacts should point to stable containers or references.
They should not force large delivery bodies inline onto the `Request` root.

Use `kind` to distinguish:

- brief
- plan
- draft
- file
- media
- delivery
- evidence
- receipt
- signature
- link

Container rule:

- document-backed text, code, image, or sheet content may stay in a stable document container
- file, media, PDF, audio, video, binary, and archive outputs may use external or object-storage references with durable metadata
- artifacts may attach directly to the request or to one `Fulfillment` or `FulfillmentStep` lane when the output belongs to a specific execution lane

### `Transaction`

Represents money movement or payment state.

Use `kind` to distinguish:

- quote lock
- payment required
- payment verification
- charge
- settlement
- payout
- refund

### `RequestEvent`

Represents the append-only history ledger for a request.

It is the canonical place for:

- messages
- status changes
- route changes
- proposal activity
- assignment activity
- fulfillment activity
- artifact publication
- payment activity
- review activity

## Derived or Ephemeral Objects

These may exist, but they are not canonical roots:

- `RequestDraft`
- `RoutePlan`
- `MatchCandidate`
- `ReputationSnapshot`
- `Projection`
- `SearchIndexDocument`

Derived objects may be deleted and rebuilt.
Canonical objects may not.

## Naming Rules

Allowed as prose or UI:

- work
- offer
- team
- inbox

Canonical schema names remain:

- `Request`
- `Supply`
- `Commitment`
- `Fulfillment`
- `FulfillmentStep`
- `Artifact`
- `Transaction`
- `RequestEvent`

## Boundary Rules

- `Actor` is identity.
- `Supply` is capability.
- `Request` is demand and thread root.
- `Commitment` is approval and commercial agreement.
- `Fulfillment` is accepted execution.
- `FulfillmentStep` is internal execution decomposition.
- `Artifact` is output or proof.
- `Transaction` is money state.
- `RequestEvent` is immutable history.

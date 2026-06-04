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

It carries:

- owner
- profile
- capability
- availability
- optional pricing
- visibility
- lifecycle status
- optional source and binding metadata

Binding rule:

- a connected desktop or peer runtime is not automatically a `Supply`
- one runtime may back zero, one, or many published `Supply` records
- runtime, resolver, or provider bindings may enrich a supply record without replacing the supply owner actor

### `Request`

Represents the durable demand-side root object and the canonical work thread.

It carries:

- creator and owner
- visibility
- canonical brief fields: title and body, plus optional summary
- optional structured `seeking` criteria for matching intent
- optional owner-scoped routing preference for one private preferred supply
- optional budget and optional deadline
- derived route, matching, and readiness projections
- current lifecycle status
- active commitment and fulfillment references
- accepted artifact reference when completed public work is eligible for solution projection
- latest progress summary

`Request` is the main object of the network.
It may begin as an explicit draft before routing, funding, or fulfillment details are complete.
When a request is both `open` and `public`, it may be exposed to external supply as a fetchable market request.
It remains the root even when optional funders, reviewers, solvers, or later audience runs attach to the work.

### `RequestParticipant`

Represents the relationship between a request and an actor.

Typical roles:

- owner
- requester
- watcher
- proposer
- assignee
- collaborator
- solver
- reviewer
- funder
- audience
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

Request-grant award, eligibility, release, and review-compensation rules should stay in `Commitment` terms and metadata until a later decision proves a new kind is required.

### `Fulfillment`

Represents an accepted execution lane for a request.

It answers:

- who is doing the work
- through which selected supply, when execution is bound to one `Supply`
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

Accepted artifacts may be projected as public solution surfaces.
`Solution` or `Solution Capsule` is UI language over completed request truth, not a canonical root object.
Inspecting that public solution should not create payment truth by itself.
Running it with inference, workflow execution, provider APIs, human review, or service capacity should create request-attached transaction truth on the run request.

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

Request grants, solution-run credit debits, reviewer fees, and solver payouts are `Transaction` truth attached to a `Request`.
They must not turn passive funders into automatic cash-profit participants.

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
- request-grant activity
- review activity

## Derived or Ephemeral Objects

These may exist, but they are not canonical roots:

- `RequestDraft`
- `RoutePlan`
- `MatchCandidate`
- `WorkerEligibility`
- `ReputationSnapshot`
- `Projection`
- `SearchIndexDocument`
- `SolutionSurface`
- `SolutionCapsule`

Derived objects may be deleted and rebuilt.
Canonical objects may not.

`WorkerEligibility` is planner-owned guidance under `Request.derived`.
It may tell public boards or named Boreal agents whether to wake, skip, or route human-first, but it is not assignment, `Supply` attachment, `Commitment`, `Fulfillment`, payment authority, `RequestEvent` history, or completion truth.

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

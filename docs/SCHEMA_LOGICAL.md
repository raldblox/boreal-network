# Logical Schema

This file defines the durable logical model for Boreal Network.

It is intentionally storage-agnostic.

## Aggregate Roots

The primary aggregate roots are:

- `Request`
- `Supply`
- `Actor`

Secondary durable aggregates:

- `Commitment`
- `Fulfillment`
- `Transaction`

Append-only ledger aggregate:

- `RequestEvent`

## Logical Relationships

### `Actor` -> `Supply`

- one actor can publish many supply records
- one supply belongs to one owner actor

### `Request` -> `RequestParticipant`

- one request can have many participants
- one participant row connects one actor to one request

### `Request` -> `Commitment`

- one request can have many commitments
- only some commitments become active or accepted

### `Request` -> `Fulfillment`

- one request can have zero to many fulfillments over time
- usually one fulfillment lane is active at a time unless the request explicitly supports parallel accepted lanes

### `Fulfillment` -> `FulfillmentStep`

- one fulfillment can contain many steps
- steps model decomposition, delegation, and progress without requiring new root requests

### `Request` and `Fulfillment` -> `Artifact`

- artifacts may be attached directly to the request or to a fulfillment or step
- artifact references should remain stable

### `Request` -> `Transaction`

- one request can have many transaction records
- transaction history must remain auditable

### `Request` -> `RequestEvent`

- one request has an append-only event stream
- event sequence is scoped to the request stream

## Root Object Responsibilities

### `Request`

Stores current truth:

- creator
- owner
- brief
- visibility
- budget
- deadline
- lifecycle status
- seeking criteria
- derived readiness and route summary
- active references
- latest summary

Does not store:

- full event history inline
- every artifact inline
- every transaction inline

### `Request` Object Spec

Canonical fields on the durable root:

- `brief.title`
- `brief.summary`
- `brief.body`
- `owner`
- `visibility`
- optional `budget`
- optional `deadline`

Derived fields kept separate from the canonical brief:

- `derived.routeFamily`
- `derived.executionKind`
- `derived.paymentMode`
- `derived.matchingMode`
- `derived.candidatePool`
- `derived.missingDetails`
- `derived.readiness`
- `derived.routeSummary`

Draft rule:

- a `Request` may be created early in `draft` status before routing, matching, commitment, or fulfillment details are complete
- not every chat turn creates a `Request`; request creation must be explicit at the product layer or policy layer

### `Fulfillment`

Stores accepted execution truth:

- selected actor or team
- accepted commitment reference
- execution status
- delivery summary

### `RequestEvent`

Stores immutable business history:

- messages
- status changes
- commitment activity
- fulfillment activity
- artifact publication
- payment progression

## Derived Views

Derived views may include:

- request inboxes
- matching projections
- reputation summaries
- supply search documents
- payout dashboards

These views are rebuildable and should not redefine root semantics.

## Indexing Implications

Physical schemas should optimize for:

- request by id and owner
- active requests by status
- commitments by request and status
- fulfillments by request and status
- transactions by request and status
- artifacts by request or fulfillment
- events by request and sequence

## Boundary Rule

When in doubt:

- new business boundary -> consider a new durable object
- internal execution detail -> prefer `FulfillmentStep`
- history item -> prefer `RequestEvent`
- output or proof -> prefer `Artifact`

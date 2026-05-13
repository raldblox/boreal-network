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

Support auth aggregates for resolver runtimes:

- `ResolverClient`
- `ResolverAuthorization`
- `ResolverToken`

## Logical Relationships

### `Actor` -> `Supply`

- one actor can publish many supply records
- one supply belongs to one owner actor
- one runtime or provider binding may back many supply records without replacing the owner actor

### `Request` -> `RequestParticipant`

- one request can have many participants
- one participant row connects one actor to one request

### `Request` -> `Commitment`

- one request can have many commitments
- only some commitments become active or accepted

### `Request` -> `Fulfillment`

- one request can have zero to many fulfillments over time
- usually one fulfillment lane is active at a time unless the request explicitly supports parallel accepted lanes
- owner-private direct auto-fulfillment may open one fulfillment without first creating a commitment object

### `Fulfillment` -> `FulfillmentStep`

- one fulfillment can contain many steps
- steps model decomposition, delegation, and progress without requiring new root requests

### `Request` and `Fulfillment` -> `Artifact`

- artifacts may be attached directly to the request or to a fulfillment or step
- artifact references should remain stable
- artifact containers may be:
  - document-backed content
  - external references
  - object-storage references
- rich file outputs such as PDF, audio, video, binary, or archive should use a stable reference plus metadata instead of forcing the request root to inline those bodies

### `Request` -> `Transaction`

- one request can have many transaction records
- transaction history must remain auditable

### `Request` -> `RequestEvent`

- one request has an append-only event stream
- event sequence is scoped to the request stream

## Root Object Responsibilities

### `Supply`

Stores current truth:

- owner
- profile
- capability
- availability
- optional pricing
- visibility
- lifecycle status
- optional source and binding metadata

Visibility rule:

- `private` supply is owner-scoped and not shareable outside owner-controlled surfaces
- `unlisted` supply may be shared directly or routed by explicit reference without entering a broad public pool
- `public` supply is the later market-facing publish lane

Binding rule:

- runtime or resolver metadata may be attached as optional binding data
- the binding identifies backing infrastructure, not the durable owner actor
- one runtime may back many supply rows and one supply may later swap bindings without changing canonical ownership

### `Supply` Object Spec

Canonical fields on the durable root:

- `owner`
- `profile.displayName`
- `profile.summary`
- `capability.supplyKinds`
- `capability.fulfillmentActorKinds`
- `capability.outputKinds`
- `availability.acceptingRequests`
- `visibility`
- `status`

Optional canonical fields:

- `profile.headline`
- `profile.description`
- `profile.tags`
- `capability.executionChannels`
- `pricing`
- `source.kind`
- `bindings.runtimeActorId`
- `bindings.resolverClientId`
- `bindings.providerRef`
- `metadata`

Draft rule:

- a `Supply` may be created early in `draft` status before pricing or binding data is complete
- publish should require a minimally complete profile and capability shape
- owner-facing form edits may update the same durable supply row instead of creating replacement rows during drafting

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

Visibility rule:

- `visibility` controls whether an opened request stays owner-private or becomes market-fetchable
- `open` plus `public` is the first publishable request-pool boundary
- public fetch views should be projections of `Request`, not a second durable object family

Does not store:

- full event history inline
- every artifact inline
- every transaction inline

`activeRefs` is the clean place for current accepted lane or latest durable related object pointers.
`latest` is the clean place for current room summary without replaying the whole event stream inline.
`activeRefs.activeCommitmentId` is optional when the owner-private direct auto-fulfillment lane is active.

### `Request` Object Spec

Canonical fields on the durable root:

- `brief.title`
- `brief.body`
- optional `brief.summary`
- `owner`
- `visibility`
- optional `seeking`
- optional `budget`
- optional `deadline`

Structured matching intent belongs in:

- `seeking.actorKinds`
- `seeking.supplyKinds`
- `seeking.teamMode`
- `seeking.notes`

Label rule:

- `brief.tags` may exist as optional human labels
- `brief.tags` should not be treated as the primary structured matching surface
- matching-facing structure should prefer `seeking`

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
- draft-mode UI may expose only a safe editable request-input subset
- `brief.summary` is optional compression, not a readiness gate
- `seeking` may be partial while the request is still being formed
- system-owned fields such as ids, ownership refs, keys, status progression, timestamps, and derived projections stay server-owned and should be shown as a read-only projection outside `draft`

### `Fulfillment`

Stores accepted execution truth:

- selected actor or team
- accepted commitment reference when one exists
- or direct owner-private authorization when desktop auto-resolution starts from the request itself
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

### `Artifact`

Stores durable output or proof with a stable container reference.

It should not force the request root to inline large delivery bodies.
It may also point to one execution lane through `fulfillmentId` and one sub-lane through `stepId`.

## Resolver Auth Support Objects

These are support auth objects, not canonical commerce roots:

- `ResolverClient`
- `ResolverAuthorization`
- `ResolverToken`

They exist so a non-browser runtime can be approved against one Boreal account and then call resolver APIs through scoped bearer auth without collapsing runtime identity into account identity.

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

- supply by id and owner
- active supply by owner and status
- active supply by visibility and status for future discovery lanes
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

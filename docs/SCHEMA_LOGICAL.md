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

Support auth aggregates for regular web accounts:

- `AccountPasskeyCredential`
- `AccountAuthChallenge`
- optional later `AccountRecoveryCode`

Support workflow aggregates for workflow-backed supply profiles:

- `WorkflowPack`
- `WorkflowPackVersion`

Support buyer-funding aggregates for first-party credit:

- `BuyerCreditAccount`
- `BuyerCreditLedgerEntry`

## Logical Relationships

### `Actor` -> `Supply`

- one actor can publish many supply records
- one supply belongs to one owner actor
- one runtime or provider binding may back many supply records without replacing the owner actor

### `Request` -> `RequestParticipant`

- one request can have many participants
- one participant row connects one actor to one request
- requester, solver, reviewer, funder, watcher, and audience-like roles are participation roles on the same durable request, not separate root objects

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
- request-grant funding, solver payout, reviewer compensation, refunds, and later solution-run credit debits remain request-attached transaction truth

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
- owner-scoped routing preference for private execution
- derived readiness and route summary
- active references
- latest summary

Visibility rule:

- `visibility` controls whether an opened request stays owner-private or becomes market-fetchable
- `open` plus `public` is the first publishable request-pool boundary
- public fetch views should be projections of `Request`, not a second durable object family
- a completed public request may later project as a solution surface when accepted artifact and review truth exist

Does not store:

- full event history inline
- every artifact inline
- every transaction inline

`activeRefs` is the clean place for current accepted lane or latest durable related object pointers.
`latest` is the clean place for current room summary without replaying the whole event stream inline.
`activeRefs.activeCommitmentId` is optional when the owner-private direct auto-fulfillment lane is active.
`activeRefs.acceptedArtifactId` is the public-solution projection guard: a completed public request should not appear as reusable solved work without this accepted artifact pointer.

### `Request` Object Spec

Canonical fields on the durable root:

- `brief.title`
- `brief.body`
- optional `brief.summary`
- `owner`
- `visibility`
- optional `seeking`
- optional `routing.preferredSupplyId`
- optional `budget`
- optional `deadline`

Structured matching intent belongs in:

- `seeking.actorKinds`
- `seeking.supplyKinds`
- `seeking.teamMode`
- `seeking.notes`

Current enum-locked request and supply fingerprints include:

- actor kinds
- supply kinds
- output kinds
- execution channels
- execution modes
- team mode
- route family
- execution kind
- payment mode
- matching mode
- evidence claims
- role keys
- phase keys

Owner-scoped private routing control belongs in:

- `routing.preferredSupplyId`

Label rule:

- `brief.tags` may exist as optional human labels
- `brief.tags` should not be treated as the primary structured matching surface
- matching-facing structure should prefer `seeking`

Derived fields kept separate from the canonical brief:

- `derived.planningMode`
- `derived.routeFamily`
- `derived.executionKind`
- `derived.paymentMode`
- `derived.matchingMode`
- `derived.candidatePool`
- `derived.matchCandidates`
- `derived.leadRole`
- `derived.roleSlots`
- `derived.phases`
- `derived.noMicrotaskExplosion`
- `derived.missingDetails`
- `derived.readiness`
- `derived.routeSummary`
- `derived.executionProfile`
- `derived.embodiedConstraintSet`
- `derived.verificationPlan`
- `derived.planCollapseRisk`
- `derived.clarificationNeeded`

Conceptual grouping rule:

- route-facing derived state includes route family, execution kind, payment mode, matching mode, candidate pool, match-candidate snapshots, and route summary
- intake-mode derived state includes `planningMode`, which controls whether planner projections are generated now or suppressed for raw buyer-authored intake
- structural planning derived state includes lead role, role slots, phase plans, interpreted lead ranking, interpreted role matches, assignment proposal, and anti-microtask guardrails
- execution and proof derived state includes embodied execution profile, verification plan, collapse risk, and clarification requirements
- planner-explanation derived state includes outcome claims and replan reasons

The current shape may keep these fields flat under one `derived` block for implementation compatibility.
That does not make them buyer-authored brief fields.

Draft rule:

- a `Request` may be created early in `draft` status before routing, matching, commitment, or fulfillment details are complete
- not every chat turn creates a `Request`; request creation must be explicit at the product layer or policy layer
- draft-mode UI may expose only a safe editable request-input subset
- that editable subset is `visibility`, `brief`, `seeking`, `budget`, and `deadline`
- `brief.summary` is optional compression, not a readiness gate
- `seeking` may be partial while the request is still being formed
- raw draft intake may set `derived.planningMode` to `raw` so the request stores buyer-authored `brief.body` without generated title, summary, body-derived key, execution classification, assignment copy, or planner projections; assisted planning can later rebuild projections on the same `Request`
- `routing.preferredSupplyId` may be updated by the owner after open only for private request execution control
- system-owned fields such as ids, ownership refs, keys, status progression, timestamps, routing, active refs, latest summary, and derived projections stay server-owned and should be shown as a read-only projection outside the editable subset

### `Fulfillment`

Stores accepted execution truth:

- selected actor or team
- optional `supplyId` when execution is bound to one published supply
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
- request-grant activity
- review and acceptance activity

### `Artifact`

Stores durable output or proof with a stable container reference.

It should not force the request root to inline large delivery bodies.
It may also point to one execution lane through `fulfillmentId` and one sub-lane through `stepId`.
Accepted artifacts may be used as the source for public solution projections.
The projection should not become a separate durable root.

## Account Auth Support Objects

These are support auth objects, not Boreal commerce roots:

- `AccountPasskeyCredential`
- `AccountAuthChallenge`
- optional later `AccountRecoveryCode`

They exist so one regular Boreal account can:

- authenticate with `username or email + password`
- enroll one or more `WebAuthn` passkeys or security keys
- use an enrolled discoverable passkey for passkey-first login without entering username or password
- complete one-time MFA or enrollment ceremonies without overloading the account root

Email remains required on the current regular account root until `AccountRecoveryCode` or another recovery path exists.

`WebAuthn` and `TOTP` should stay separate factor types when both exist.

## Resolver Auth Support Objects

These are support auth objects, not canonical commerce roots:

- `ResolverClient`
- `ResolverAuthorization`
- `ResolverToken`

They exist so a non-browser runtime can be approved against one Boreal account and then call resolver APIs through scoped bearer auth without collapsing runtime identity into account identity.

## Workflow-backed Supply Support Objects

These are support implementation objects, not Boreal commerce roots:

- `WorkflowPack`
- `WorkflowPackVersion`

They exist so Boreal can standardize reusable workflow-backed supplies without overloading the canonical `Supply` root or turning raw workflow definitions into buyer-facing truth.

Recommended responsibility split:

- `Supply` keeps buyer-facing capability, pricing, visibility, and publish state
- `WorkflowPack` keeps stable reusable pack identity
- `WorkflowPackVersion` keeps one versioned block graph, adapter profile, credential requirements, proof requirements, and source references

Relationship rule:

- one `WorkflowPack` may back one or many supply rows
- one supply row may point to zero or one active workflow-pack version through typed metadata or implementation-local support links until first-class linkage is modeled

Source rule:

- raw imported workflow JSON or provider pipeline payloads should stay in workflow support objects or stable artifact references
- they should not replace the buyer-authored request brief
- they should not be treated as proof of completed work by themselves

## Buyer Credit Support Objects

These are support funding objects, not Boreal commerce roots:

- `BuyerCreditAccount`
- `BuyerCreditLedgerEntry`

They exist so Boreal can offer first-party prepaid credit without weakening request-attached transaction truth.

Responsibility split:

- `BuyerCreditAccount` keeps derived buyer balance and policy envelope
- `BuyerCreditLedgerEntry` keeps append-only top-up, grant, debit, refund-restore, adjustment, or reversal history
- `Transaction` remains the canonical request-attached payment truth for funded work

Relationship rule:

- buyer top-up may exist with no request attached
- spending credit on one request should create both one credit-ledger debit and one request-attached `Transaction`
- inspecting a public solution should not spend credit by itself
- running a public solution through inference, provider APIs, workflow execution, human review, or service capacity should spend credit through the run request
- refunding a credit-funded request should restore credit through ledger while keeping request transaction history auditable

Boundary rule:

- buyer credit is first-party only
- it must not be treated as a multi-seller marketplace wallet
- it must not replace payout accounting for external suppliers

## Request Grant Boundary

Request grants are optional request funding, not new aggregate roots.

They should be represented through existing durable objects:

- `RequestParticipant` for funder, solver, reviewer, and watcher relationships
- `Commitment` terms and metadata for award rules, review gates, and release conditions
- `Transaction` records for grant funding, settlement, refund, and payout
- `Artifact` records for accepted outputs and proof
- `RequestEvent` records for durable activity

Boundary rule:

- do not create a standalone `Grant`, `Bounty`, or `Solution` root in this pass
- do not treat request grants as tax-deductible donations by default
- do not model passive funder revenue share without a later canon and compliance decision
- do not charge credits merely to inspect a public solution
- do charge credits when a solution run consumes inference or execution capacity
- if later users need custom work from a public solution, create a new `Request` that references the source artifact

## Derived Views

Derived views may include:

- request inboxes
- matching projections
- reputation summaries
- supply search documents
- payout dashboards
- public solution surfaces

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
- public solution -> prefer a projection over completed `Request` plus accepted `Artifact`

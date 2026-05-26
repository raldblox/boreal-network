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

Not every streaming channel is durable history.
Async transport may expose both:

- durable replayable event streams
- ephemeral realtime channels for operator feedback and live execution state

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
- ephemeral realtime transport for live execution feedback
- resolver identity and scoped runtime auth

## Example Contract Boundaries

### `Supply`

Should expose:

- create draft
- read
- list owned supply
- update allowed mutable fields
- delete draft or unused retired supply
- publish
- pause
- retire

The first supply-management web slice should support:

- explicit draft creation from a typed preset such as human service, agent worker, digital product, desktop runtime, or provider capability
- explicit starter-supply enable from a Boreal-managed worker key, with optional immediate publish into a private or unlisted lane
- owner-scoped supply draft reads and list reads through browser session or resolver auth with `supplies:read_private`
- owner-scoped draft updates for profile, capability, availability, pricing, visibility, source, binding metadata, and freeform metadata
- owner-scoped delete for `draft` supply, or `retired` supply with no durable commitment or fulfillment activity
- explicit publish from `draft` into `published`
- explicit pause and retire actions after publish
- optional runtime or resolver binding metadata without treating the runtime itself as the supply row
- private and unlisted publish lanes first

Public marketplace-style supply publish should remain gated until the broader supply discovery lane is explicitly enabled.

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
- optional `preferredSupplyId` on create so one private request can be born with a selected worker already pinned
- public-safe listing of `open` plus `public` requests for network or desktop pooling
- public-safe detail reads for one request by id
- explicit `save draft` normalization from the live request-input document surface
- request-brief field updates
- request-seeking field updates for structured matching intent
- owner-scoped `routing.preferredSupplyId` updates on private requests
- request constraint updates
- request budget and timing updates
- request route-summary updates
- explicit transition from `draft` to `open`
- `open_request` may asynchronously start one owner-private Boreal-managed worker lane when the request already has a pinned preferred supply
- manual request-object editing only while the request stays in `draft`
- full canonical request-object projection as read-only once the request leaves `draft`
- public request pool reads must exclude owner-only draft fields and should expose a public-safe request projection instead
- owner detail reads may include private routing control state while public projections must exclude it
- request activity reads through `/requests/{id}/activity` so open request rooms can render durable timeline cards without replaying chat transcript
- resolver runtimes should be able to write commitment and artifact activity through direct request resource endpoints instead of going through chat tool-calling only
- resolver runtimes should authenticate through a Boreal-issued resolver token, not raw Codex credentials

### `Commitment`

Should expose:

- propose
- accept
- reject
- supersede

In the first open-request room slice, commitment proposal may be created as durable activity without forcing a rewrite of the request brief.
The first resolver-facing web slice now exposes:

- owner-scoped request routing updates on `PATCH /api/requests/{id}`
- direct request commitment creation
- direct commitment acceptance
- direct fulfillment creation
- direct fulfillment detail reads and updates

in addition to chat tool-calling.

Desktop may drive those same routes, plus owned supply reads, through Boreal-issued resolver bearer auth after web approval instead of depending on browser cookies.

### `Fulfillment`

Should expose:

- create from accepted route
- start
- block
- resume
- deliver
- accept

The first resolver-facing web slice now exposes:

- `POST /api/requests/{id}/fulfillments`
- `GET /api/fulfillments/{id}`
- `PATCH /api/fulfillments/{id}`
- `POST /api/fulfillments/{id}/retry`

Accepted responder lanes may create fulfillment after owner acceptance.
Owned private resolver lanes may create fulfillment without `commitmentId` when the same Boreal owner is authorizing direct desktop execution.
When fulfillment create includes `supplyId`, the server should validate ownership, `published` status, and resolver binding compatibility before opening the lane.
Owner-private Boreal-managed web workers may also open one direct fulfillment lane after `open_request`, but the provider-facing payload should stay reduced to worker-specific prompt and execution inputs instead of the entire request object.
Retryable internal worker or storage handoff failures should move that same fulfillment lane to `blocked`, preserve the worker input and provider recovery metadata, and resume through `POST /api/fulfillments/{id}/retry` instead of terminally failing the request immediately.

Desktop chat execution may also bind one local thread to a selected `Request` and optional `Fulfillment` lane.
That binding is local execution context only.
It must not make the desktop transcript itself canonical Boreal history.

### `Transaction`

Should expose:

- payment requirement
- verification result
- settlement status
- payout status

The first first-party payment and credit slice exposes:

- `GET /api/buyer-credits/account`
- `GET /api/buyer-credits/ledger`
- `POST /api/buyer-credits/topups`
- `POST /api/buyer-credits/apply`
- `GET /api/requests/{id}/transactions`
- `POST /api/requests/{id}/transactions`

Rules:

- buyer-credit endpoints are authenticated account-session routes in the first slice
- top-up creates buyer-credit support ledger truth but does not create request `Transaction` truth
- direct request funding creates request-attached `Transaction` truth
- buyer-credit application creates both one credit ledger debit and one request-attached `Transaction`
- mutating payment routes accept `Idempotency-Key`

Machine-readable contract:

- `schemas/openapi/payment-and-credit.openapi.yaml`

## Account Auth Surface

Regular Boreal web accounts should use:

- `username or email`
- `password`
- optional required `WebAuthn` second factor once enrolled

Guest auth remains a separate limited lane.

The account-auth lane must not be conflated with:

- resolver auth
- runtime or device identity
- wallet or payout identity

The first stronger account-auth slice should expose contracts for:

- register regular account
- login with `username or email + password`
- start WebAuthn enrollment
- verify WebAuthn enrollment
- start WebAuthn assertion for MFA
- verify WebAuthn assertion for MFA

If later fallback factors are added:

- authenticator-app `TOTP` must be modeled as a separate factor type
- recovery codes must be modeled separately from passkeys

Do not label `Google Authenticator` as a passkey flow.

## Internal Tool Contracts

Planner, matcher, policy, and mutation tool boundaries are part of Boreal's canonical machine-facing behavior.

Use [TOOL_CALLING_CONTRACTS.md](TOOL_CALLING_CONTRACTS.md) for:

- read-only planner and matcher envelopes
- policy next-action outputs
- mutation-tool result envelopes
- approval and idempotency boundaries

Open request room behavior should prefer `Commitment`, `Artifact`, and `RequestEvent` writes over draft-style brief mutation.
Resolver-facing request APIs should return JSON auth or permission errors instead of depending on browser-only guest-login redirects.
Direct resolver APIs should preserve the same durable request-side effects as chat mutation tools for commitment acceptance, fulfillment creation, and fulfillment updates.
Execution-grade artifact writes should require an accepted commercial lane or active fulfillment role.
Owner-private desktop auto-resolution is the one direct-fulfillment exception and should still emit the same durable fulfillment and artifact events.
Artifact publication should support:

- document-backed content writes for text, code, image, or sheet outputs
- external references for durable links to file, media, PDF, audio, video, binary, or archive outputs
- object-storage references for app-managed or provider-managed blob keys
- optional `fulfillmentId` and `stepId` when one artifact belongs to a selected execution lane

## Resolver Auth Surface

Non-browser runtimes should use a Boreal-issued resolver identity layer.

The first web slice exposes:

- `POST /api/auth/resolver/device/start`
- `POST /api/auth/resolver/device/poll`
- `POST /api/auth/resolver/token/refresh`
- `POST /api/auth/resolver/token/revoke`

The runtime proof and Boreal actor proof stay separate:

- Codex auth proves the local runtime is connected
- Boreal resolver approval binds that runtime to one Boreal account and one scoped actor context

If a desktop or peer runtime exposes ephemeral realtime transport, that transport should stay scoped to runtime or session authorization and must not be treated as proof of Boreal actor identity by itself.

The first desktop-local browser bridge should stay constrained like this:

- bind to `127.0.0.1` only
- require a random per-runtime session token
- reject non-localhost browser origins
- stream ephemeral execution feedback only
- allow one localhost-only discovery read such as `/discover` so Boreal web can auto-link a running desktop runtime without a manual copy-paste setup flow
- `/discover` may expose bridge-link readiness, Codex worker readiness, and Boreal resolver readiness as separate local states; do not collapse them into one fake `connected` truth
- `/discover` may also expose local desktop auto-resolve policy such as `autoResolveOwnedPrivate`, one desktop-default supply id, and the desktop-default Codex model and reasoning level, but those remain local runtime state instead of durable Boreal request truth
- expose read-only local bridge metadata such as `/health` and desktop model-access reads such as `/models` only behind the same session-token and localhost-origin checks
- allow one localhost-only `POST /chat` bridge write so Boreal web can dispatch one prompt turn into the connected desktop runtime and stream ephemeral token output back into the web chat surface
- `POST /chat` must stay local-runtime scoped, require the same session token, and must not be treated as durable Boreal request or actor truth by itself
- never act as durable Boreal request truth by itself

## Schema Discipline

- Human-readable contract rules live in this file.
- Machine-readable HTTP contracts live in OpenAPI files.
- Machine-readable event contracts live in AsyncAPI files.
- Machine-readable object payloads live in JSON Schema files.

Do not make markdown the only contract surface once a machine-readable contract exists.

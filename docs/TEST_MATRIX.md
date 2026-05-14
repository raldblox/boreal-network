# Test Matrix

This file defines what must be verifiable as Boreal Network evolves.

## Test Families

### Contract tests

Verify:

- JSON Schema validity
- OpenAPI validity
- AsyncAPI or event schema validity
- sample payload compatibility
- ephemeral realtime channel shapes do not drift into durable event schemas accidentally
- desktop-local ephemeral IPC envelopes keep stable lane, channel-kind, correlation, and source fields without pretending to be durable request events
- supply schema and supply OpenAPI stay aligned on status, visibility, pricing mode, source kind, and binding shape

### Commercial canon tests

Verify:

- commercial category matches thesis language
- positioning docs do not contradict root object canon
- ICP and wedge stay consistent with business model and competitive map
- pitch facts do not overclaim beyond canon or cited market evidence
- live-versus-target boundaries match the current machine-modeled layer and do not overstate implementation status

### Lifecycle tests

Verify:

- allowed transitions succeed
- invalid transitions fail
- terminal states stay terminal
- request summaries reflect history correctly

### Invariant tests

Verify:

- one request root remains durable across the lifecycle
- one supply owner remains stable across draft, publish, pause, and retire transitions
- no fulfillment exists without a request
- no accepted execution exists without an accepted route or commitment
- funding-required requests point to valid commercial context
- delivered work can be traced to artifacts and events
- file, media, PDF, audio, video, binary, and archive deliveries can be traced through stable artifact references without inflating the request root

### Authorization tests

Verify:

- only authorized actors can mutate a request
- participant roles are enforced
- payment and payout visibility respect ownership and role boundaries
- resolver bearer scopes are enforced independently from browser sessions
- raw runtime identity cannot be treated as Boreal request ownership without Boreal-issued resolver approval
- peer or localhost realtime session auth cannot be treated as Boreal actor auth by itself
- raw runtime or resolver identity cannot be treated as supply ownership by itself

### Idempotency tests

Verify:

- duplicate create actions do not fork business truth
- duplicate payment verification does not double-settle
- duplicate event replay does not double-apply side effects

### Replay and projection tests

Verify:

- request summaries rebuild from the event stream
- event ordering is stable within a request
- deleted projections can be rebuilt

### Repository topology tests

Verify:

- no unregistered top-level namespaces are introduced
- every active namespace root has `README.md` and `AGENTS.md`
- every active workspace root has `README.md` and `AGENTS.md`
- active workspace registry matches actual folders
- workspace docs agree with root canon
- app, package, skill, and standards workspaces do not redefine canonical root object names
- generic workspace names such as `network-node`, `node2`, or `misc` are blocked unless explicitly approved in canon docs
- root manifests and workspace manifests agree on active JS or TS workspaces

### Request-processing contract tests

Verify:

- not every chat turn creates a durable request
- entering `New request` mode alone does not create a durable request
- the first send in `New request` mode creates one draft request instead of a second root object
- request-briefing assist or optimizer profiles in request mode must still create at most one draft request on first send
- request draft extraction is deterministic for canonical fixtures
- request-briefing assist or optimizer profiles may improve wording clarity but must not invent budget, deadline, deliverables, actor requirements, or constraints
- only `open` plus `public` requests appear in the public request pool
- draft and private requests do not leak through public request fetch endpoints
- draft request-object JSON accepts edits only while the request status is `draft`
- non-draft request-object JSON is read-only and shows the full canonical object
- `save draft` and `open request` normalize the latest draft-input projection before the durable `Request` is written
- title plus body should be enough for `ready_to_open`; `brief.summary` should stay optional
- one-turn request briefing should preserve explicitly stated budget or deadline in structured canonical fields instead of only embedding them in freeform brief text
- structured matching intent should land in top-level `seeking` rather than relying on generated `brief.tags`
- open request rooms should not force every user message through draft brief mutation tools
- public open request activity should be fetchable from a durable request activity endpoint
- public open request detail should be fetchable by id through a direct request API surface
- direct request commitment and artifact endpoints should create durable activity without going through the chat route
- direct request commitment and artifact endpoints should honor idempotency keys on retry
- direct commitment accept endpoints should honor idempotency keys on retry
- direct fulfillment create and update endpoints should honor idempotency keys on retry
- direct fulfillment create should require an accepted commitment
- direct fulfillment create may omit commitment only for owned private requests driven by the same owner through the desktop auto-resolution lane
- direct fulfillment create with `supplyId` should reject unpublished, wrong-owner, or wrong-resolver-binding supply rows
- accepted responder lanes should be able to create fulfillment after owner acceptance
- direct fulfillment updates should reject invalid state transitions
- funding-required requests should not start fulfillment directly in `active`
- owner-scoped request routing updates should allow set or clear of `routing.preferredSupplyId` only on private requests
- public request projections should not expose `routing.preferredSupplyId`
- execution-grade artifacts should require an accepted commitment or active fulfillment role instead of arbitrary public responder access
- artifact publication should accept both document-backed content and richer external or object reference containers
- artifact publication should preserve optional `fulfillmentId` and `stepId` lane bindings when provided
- typing, token deltas, progress ticks, heartbeats, presence, transient runtime logs, and raw tool stdout or stderr should not create default durable request history
- resolver device approval should not issue tokens before explicit Boreal account approval
- resolver refresh rotation should revoke or replace the previous refresh token
- revoked resolver tokens should fail on subsequent request writes
- desktop resolver flows should preserve auth separation between Codex runtime identity and Boreal request-actor identity
- desktop auto-resolve toggle should only act on owned private requests when the auto mode is enabled
- desktop auto-resolve should create durable fulfillment and artifact events even when it skips commitment creation
- request-level preferred supply should outrank the desktop default supply during auto-resolve
- configured but unavailable request override or desktop default supply should block auto-resolve instead of silently falling back
- desktop tracked-request execution should bind one local thread to one selected `Request` and optional `Fulfillment` lane without syncing the full local transcript by default
- desktop should block `Full` runtime for public or external tracked request lanes
- desktop should force public or external tracked request lanes onto a dedicated `.boreal-work` request workspace instead of the app repo root
- desktop should clear extra writable roots and keep network off for public or external tracked request lanes even if broader local settings exist
- desktop localhost bridge should bind to `127.0.0.1` only, require a valid session token, and reject non-localhost origins
- desktop localhost bridge `/discover` should stay localhost-origin constrained, expose only local bridge-link metadata plus separate local readiness states for bridge, Codex worker, and Boreal resolver, and never become a durable Boreal identity or request ledger
- desktop localhost bridge `/discover` may expose local desktop auto-resolve policy and desktop-default supply selection, but those fields must remain local runtime hints and must not override durable request routing truth
- desktop localhost bridge `/models` should require the same valid session token, stay localhost-origin constrained, and return only the connected desktop runtime model catalog instead of a second Boreal model ledger
- desktop peer runtime should create or reuse one stable peer keypair under `.boreal-work/desktop/peer-runtime.json`
- desktop peer runtime should listen on the Boreal control topic and expose its listening state without changing Boreal actor identity semantics
- request-bound desktop turns should be able to join a Boreal request topic through the embedded peer host without promoting peer transport state into durable request truth
- timeline cards should be reconstructible from `RequestEvent` plus related object refs
- route classification follows canon and complexity policy
- lead-match flow happens before decomposition for complex work
- planner outputs stay derived and rebuildable

### Supply-management contract tests

Verify:

- entering the new-supply route alone does not publish supply automatically
- explicit supply draft creation creates one durable supply row
- draft updates mutate the same supply row instead of creating replacements
- delete should allow draft supply and unused retired supply only
- delete should reject published or paused supply
- delete should reject retired supply that already has durable commitment or fulfillment activity
- publish requires the minimum profile and capability fields
- private and unlisted publish succeed through the first supply lane
- public supply publish remains blocked until the broader market lane is enabled
- pause and retire transitions honor the canonical supply state machine
- runtime or resolver binding metadata remains optional
- runtime or resolver binding metadata does not replace the durable supply owner actor

### Planner evals

Verify:

- role slots are appropriate for the request
- phase counts stay bounded
- low-complexity requests do not explode into microtasks

### Matcher evals

Verify:

- correct lead supply appears in top-k
- collaborator slots map to sensible supplies
- generic weak-fit supplies do not outrank strong specialists

### Policy evals

Verify:

- next-action choice is safe and consistent with planner and matcher output
- approval-gated writes are not triggered early
- block-and-escalate behavior appears when canon or funding boundaries are violated

### Risk governance tests

Verify:

- changes that alter canonical object names are blocked unless canon docs are updated in the same patch
- changes that alter category, wedge, or revenue model are blocked unless commercial canon docs are updated in the same patch
- changes that alter lifecycle states are blocked unless state and event docs are updated in the same patch
- changes that add workspaces are blocked unless `docs/REPO_STRUCTURE.md`, `docs/WORKSTREAMS.md`, `docs/OWNERSHIP.md`, and local workspace guardrails exist
- destructive or breaking actions require explicit escalation paths in agent instructions
- risk escalations use the required visible format with `Risk`, `Impact`, `Scope`, `Safer path`, and `Question`
- parallel work requires disjoint write scopes or explicit single-owner assignment

### Monetary integrity tests

Verify:

- totals are deterministic
- commitment amounts and transaction amounts reconcile
- payout states derive correctly from settlement history

## Object-to-Test Coverage

### Derived planning and matching objects

- `RequestDraft` extraction stability
- `MatchSpec` normalization stability
- `RoutePlan` phase and role consistency
- `RoleSlot` actor-kind and requiredness rules
- `MatchCandidate` ranking and explanation quality

### `Request`

- creation
- draft briefing updates
- draft-only manual request-input edits
- status transitions
- summary projection
- participant visibility

### `Commitment`

- propose
- accept
- reject
- supersede
- expiry

### `Fulfillment`

- create
- start
- block
- resume
- deliver
- accept
- cancel
- fail

### `FulfillmentStep`

- dependency rules
- completion rules
- delegation rules

### `Artifact`

- attach
- publish through a stable container reference
- resolve references
- preserve fulfillment and step lane bindings
- visibility and integrity

### `Transaction`

- require
- verify
- settle
- payout
- refund
- dispute

### `RequestEvent`

- envelope validation
- naming validation
- replay safety
- sequence monotonicity

### `Supply`

- create draft
- update draft
- publish
- pause
- retire
- visibility and binding integrity

## Fixture Rules

Every canonical object family should eventually have deterministic fixtures under:

- `fixtures/request/`
- `fixtures/supply/`
- `fixtures/fulfillment/`

Fixtures should cover:

- happy path
- edge path
- failure path
- replay path
- planner and matcher eval path
- policy safety path

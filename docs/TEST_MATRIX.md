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
- embodied-planning conventions stay aligned across request, supply, artifact, and eval surfaces when Boreal uses them

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
- non-substitutable embodied work cannot be resolved through generated summaries alone when the request requires explicit proof

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
- selecting one supply from the supply hub may create one private draft request and pin `routing.preferredSupplyId` without auto-sending synthetic prompt text
- request creation with `preferredSupplyId` should return the draft with seeded `seeking` and worker-facing output defaults when those fields were still empty
- supply-started draft requests should not auto-open the raw request-object panel before the owner writes the worker prompt
- request-briefing assist or optimizer profiles in request mode must still create at most one draft request on first send
- request draft extraction is deterministic for canonical fixtures
- request-briefing assist or optimizer profiles may improve wording clarity but must not invent budget, deadline, deliverables, actor requirements, or constraints
- request-briefing and planner flows must surface non-substitutable embodied work instead of flattening it into digital-only tasks
- live-model request-processing benchmark runs must capture frozen prompt preset id, model id, temperature, seed, and raw provider request-response metadata for later audit
- live-model request-processing benchmark runs should report exact contract metrics and separate semantic-coverage metrics so label drift is visible without being confused for planning collapse
- live-model request-processing benchmark runs should also separate provider-call success, JSON-parse success, and post-parse planning quality so unavailable models are not misread as planning regressions
- only `open` plus `public` requests appear in the public request pool
- draft and private requests do not leak through public request fetch endpoints
- draft request-object JSON accepts edits only while the request status is `draft`
- non-draft request-object JSON is read-only and shows the full canonical object
- `save draft` and `open request` normalize the latest draft-input projection before the durable `Request` is written
- draft request-input JSON accepts edits only for `visibility`, `brief`, `seeking`, `budget`, and `deadline`
- draft request-input JSON should reject or ignore attempts to persist ids, status, routing, active refs, latest summary, timestamps, or planner-derived fields
- title plus body should be enough for `ready_to_open`; `brief.summary` should stay optional
- one-turn request briefing should preserve explicitly stated budget or deadline in structured canonical fields instead of only embedding them in freeform brief text
- request mode may ask clarifying questions before draft readiness when missing location, access, timing, or proof fields materially change embodied execution safety
- structured matching intent should land in top-level `seeking` rather than relying on generated `brief.tags`
- selected or pinned supply should stay in `routing.preferredSupplyId` and must not be rewritten into fake buyer-authored brief text
- preselected supply may narrow the likely route but must not imply a real match or assigned worker before matching, selection, or fulfillment attachment actually happened
- preselected supply may make the request feel faster, but must not bypass clarification, proof, funding, approval, or safety rules
- owner-safe planner prompt context may include preferred-supply and bounded candidate-supply summaries after retrieval, while responder or public lanes must not inherit owner-private routing hints
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
- owner-private direct fulfillment create may attach one valid `routing.preferredSupplyId` when no explicit `supplyId` was passed
- accepted responder lanes should be able to create fulfillment after owner acceptance
- direct fulfillment updates should reject invalid state transitions
- funding-required requests should not start fulfillment directly in `active`
- fulfillment planning for embodied or verification-heavy work should derive explicit execution modality and proof requirements before closure becomes possible
- owner-scoped request routing updates should allow set or clear of `routing.preferredSupplyId` only on private requests
- pinned-supply request drafts should surface the selected worker in the UI while keeping the editable brief buyer-authored
- specialized pinned supplies should not expand one generic worker lane into duplicate derived role slots when one worker is already selected
- opening one owner-private request with a pinned Boreal-managed worker may auto-create one fulfillment lane and should preserve worker prompt plus provider status in fulfillment metadata
- retryable first-party worker failures should move that same fulfillment lane to `blocked`, keep worker recovery metadata, and avoid terminally failing the request immediately
- `POST /api/fulfillments/{id}/retry` should resume the same blocked fulfillment lane and reuse stored output when the worker already finished provider execution
- public request projections should not expose `routing.preferredSupplyId`
- execution-grade artifacts should require an accepted commitment or active fulfillment role instead of arbitrary public responder access
- artifact publication should accept both document-backed content and richer external or object reference containers
- artifact publication should preserve optional `fulfillmentId` and `stepId` lane bindings when provided
- generated plans, summaries, or chat text should not satisfy embodied proof obligations by themselves
- live-model benchmark scoring should not depend on a second judge LLM when exact contract or metric-based scoring already exists
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
- desktop localhost bridge `/discover` may expose local desktop auto-resolve policy, desktop-default supply selection, and desktop-default Codex model or reasoning selection, but those fields must remain local runtime hints and must not override durable request routing truth
- desktop localhost bridge `/models` should require the same valid session token, stay localhost-origin constrained, and return only the connected desktop runtime model catalog instead of a second Boreal model ledger
- desktop localhost bridge `POST /chat` should require the same valid session token, stay localhost-origin constrained, and dispatch only one local runtime turn instead of becoming a second durable Boreal chat ledger
- desktop-model web chat dispatch should keep normal web models on the existing `/api/chat` path, while only selected `Codex/Desktop` models branch through the localhost bridge
- desktop-model web chat dispatch should stay blocked for draft request briefing lanes so request-object mutation still runs through Boreal request tools first
- desktop peer runtime should create or reuse one stable peer keypair under `.boreal-work/desktop/peer-runtime.json`
- desktop peer runtime should listen on the Boreal control topic and expose its listening state without changing Boreal actor identity semantics
- request-bound desktop turns should be able to join a Boreal request topic through the embedded peer host without promoting peer transport state into durable request truth
- timeline cards should be reconstructible from `RequestEvent` plus related object refs
- route classification follows canon and complexity policy
- lead-match flow happens before decomposition for complex work
- planner outputs stay derived and rebuildable
- planner-derived lead role, role slots, phase plans, execution profile, and proof-planning fields stay outside the buyer-authored brief surface
- `leadRole` and `roleSlots` remain the canonical planner field names even when the UI explains them as capability or worker-type language
- planner outputs stay capability-first before they imply assignment-first execution
- additive planner outputs such as `outcomeClaims`, `leadRanking`, `roleMatches`, `assignmentProposal`, and `replanReasons` stay read-only and rebuildable
- planner outputs must not imply a real match is attached before matching actually happened for that request flow
- planner outputs must preserve embodied, local-runtime, and verification-heavy work as first-class planning realities
- plan-collapse detection should trigger clarification or block-and-escalate when required embodied work is being omitted
- public request-pool projections should not expose the full planner-internal projection by default

### Supply-management contract tests

Verify:

- entering the new-supply route alone does not publish supply automatically
- explicit supply draft creation creates one durable supply row
- starter-supply enable should create or reuse one worker-backed supply row instead of duplicating the same starter lane
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
- starter-supply enable with immediate publish should keep the starter in private or unlisted lanes and make it selectable for request routing

### Planner evals

Verify:

- role slots are appropriate for the request
- phase counts stay bounded
- low-complexity requests do not explode into microtasks
- embodied requests produce explicit human or field-capable steps when required
- benchmark outputs preserve embodied execution modes and proof claims strongly enough to separate request-rooted planning from task-first or direct-tool baselines

### Matcher evals

Verify:

- correct lead supply appears in top-k
- collaborator slots map to sensible supplies
- generic weak-fit supplies do not outrank strong specialists
- deterministic benchmark aggregates can distinguish lead-first routing quality from tool-biased or decomposition-biased baselines

### Policy evals

Verify:

- next-action choice is safe and consistent with planner and matcher output
- approval-gated writes are not triggered early
- block-and-escalate behavior appears when canon or funding boundaries are violated
- embodied or verification-heavy asks prefer clarification or escalation over false digital completion
- policy does not imply completion before proof and closure conditions are satisfied
- public or cross-actor lanes do not inherit owner-private desktop assumptions in planner, matcher, or policy behavior
- deterministic benchmark outputs expose false-completion and forbidden-mutation rates clearly across competing planning styles

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

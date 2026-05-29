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
- request-grant language does not imply passive investment upside, yield, dividend, or tax-deductible donation treatment
- public solution language points back to completed `Request` plus accepted `Artifact` truth instead of creating a new root
- public solution copy separates free inspection from credit-consuming inference or execution runs

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
- optional request grants attach to the same request lifecycle instead of forking a second funding flow
- delivered work can be traced to artifacts and events
- public solution projections can be traced to completed requests and accepted artifacts
- public solution inspection leaves the source request state unchanged
- public solution runs or forks create a new request or accepted execution lane that references the source artifact
- file, media, PDF, audio, video, binary, and archive deliveries can be traced through stable artifact references without inflating the request root
- non-substitutable embodied work cannot be resolved through generated summaries alone when the request requires explicit proof

### Authorization tests

Verify:

- only authorized actors can mutate a request
- participant roles are enforced
- payment and payout visibility respect ownership and role boundaries
- regular login should accept either username or email when both map to the same account
- username normalization and uniqueness should prevent ambiguous or duplicate regular-account handles
- password success alone should not complete login when the account has enrolled required `WebAuthn` MFA
- `WebAuthn` MFA challenges should expire, single-use correctly, and reject replay
- passkey-first login should issue a session from an enrolled discoverable credential without username or password input
- passkey-first login should reject expired challenges, unknown credential ids, and replayed challenge ids
- resolver bearer scopes are enforced independently from browser sessions
- raw runtime identity cannot be treated as Boreal request ownership without Boreal-issued resolver approval
- peer or localhost realtime session auth cannot be treated as Boreal actor auth by itself
- raw runtime or resolver identity cannot be treated as supply ownership by itself

### Idempotency tests

Verify:

- duplicate create actions do not fork business truth
- duplicate payment verification does not double-settle
- duplicate buyer-credit top-up or apply-credit requests with the same idempotency key do not double-change credit balance
- duplicate curated service checkout requests with the same idempotency key do not fork the `Request` or double-debit buyer credit
- duplicate PayPal return capture and verified PayPal webhook delivery for the same buyer-credit top-up do not double-settle available credit
- duplicate request transaction requests with the same idempotency key do not create duplicate request-attached transactions
- duplicate request-grant contributions with the same idempotency key do not double-fund the request
- duplicate solution-run credit requests with the same idempotency key do not double-debit buyer credit or fork duplicate run requests
- duplicate `POST /api/requests/{id}/solution-runs` calls with the same idempotency key return the same run `Request`, source artifact reference, buyer-credit debit, and request `Transaction`
- duplicate event replay does not double-apply side effects

### Payment webhook tests

Verify:

- PayPal create-order creates one pending buyer-credit ledger entry and stores the PayPal order reference without creating a request `Transaction`
- PayPal return capture settles only a matching authenticated owner's pending buyer-credit ledger entry
- PayPal webhook handling rejects missing or failed PayPal signature verification before any ledger mutation
- PayPal `PAYMENT.CAPTURE.COMPLETED` webhook settlement moves pending credit to available credit exactly once
- PayPal capture amount and currency must match the pending buyer-credit ledger entry before settlement

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
- account-auth decisions stay aligned with accepted web auth canon instead of drifting back to email-only or runtime-collapsed assumptions

### Request-processing contract tests

Verify:

- not every chat turn creates a durable request
- entering `New request` mode alone does not create a durable request
- the first send in `New request` mode creates one draft request instead of a second root object
- selecting one supply from the supply hub may create one private draft request and pin `routing.preferredSupplyId` without auto-sending synthetic prompt text
- request creation with `preferredSupplyId` should return the draft with seeded `seeking` and worker-facing output defaults when those fields were still empty
- owner-private preferred-supply draft seeding may also add truthful route-facing derived defaults such as candidate pool, route family, execution kind, payment mode, matching mode, and route summary
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
- public solution projections require completed public requests with `activeRefs.acceptedArtifactId`
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
- pinned supply that does not yet truthfully fit the current route should stay candidate-only in planner outputs instead of becoming selected lead truth
- clearing pinned supply should remove only the preferred-supply route bias and must not leave stale direct-route hints in draft-derived state
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
- owner-private first-party service fulfillment may be created from an `open`, `funded`, `in_progress`, or `waiting_for_owner` request without creating a second root object
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
- `POST /api/fulfillments/{id}/retry` may also check the same active first-party worker lane when a queued provider task id is already saved, without spawning a second fulfillment
- public request projections should not expose `routing.preferredSupplyId`
- execution-grade artifacts should require an accepted commitment or active fulfillment role instead of arbitrary public responder access
- artifact publication should accept both document-backed content and richer external or object reference containers
- artifact publication should preserve optional `fulfillmentId` and `stepId` lane bindings when provided
- video media artifacts should render an authorized inline preview from the stable object reference without exposing private storage as buyer-authored brief text
- generated plans, summaries, or chat text should not satisfy embodied proof obligations by themselves
- request grants should remain optional funding attached through participant, commitment, transaction, and event truth instead of creating a new root object
- request-grant prompts should not be rewritten into investment, yield, dividend, passive revenue-share, or tax-deductible donation claims
- solver grant payouts should require accepted work or explicit accepted review/award conditions
- public solution surfaces should require accepted artifacts and completed or accepted request truth
- inspecting a public solution should not consume credits, create transaction truth, or reopen the source request
- running a public solution should consume credits only when inference, provider API calls, workflow execution, human review, or service capacity is used
- public solution run creation should require one completed public source `Request`, one matching accepted `Artifact`, an authenticated buyer session, a positive credit amount, and an idempotency key
- paid solution runs should write credit debit and transaction truth to the run request, not mutate the completed source request
- solution forks or private adaptations should create a new `Request` referencing the source artifact instead of mutating the completed source request
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
- additive planner outputs such as `outcomeClaims`, `matchCandidates`, `leadRanking`, `roleMatches`, `assignmentProposal`, and `replanReasons` stay read-only and rebuildable
- retrieved planner candidate snapshots should truthfully rebuild `candidatePool`, `leadRanking`, and `roleMatches` from real `Supply` rows without implying attached execution
- planner outputs must not imply a real match is attached before matching actually happened for that request flow
- planner outputs must preserve embodied, local-runtime, and verification-heavy work as first-class planning realities
- plan-collapse detection should trigger clarification or block-and-escalate when required embodied work is being omitted
- public request-pool projections should not expose the full planner-internal projection by default
- the request plan panel should expose typed matching fingerprints plus `matchCandidates`, `leadRanking`, `roleMatches`, and `assignmentProposal` as read-only derived projections rather than editable buyer-authored fields

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
- workflow-backed supply may point to typed workflow-pack support metadata or support links without replacing the durable supply root
- imported workflow definitions or template bodies must not be rewritten into fake buyer-authored request brief fields
- missing credentials, undefined proof requirements, or unsupported adapter features should block workflow-backed pack readiness or fulfillment start
- workflow adapter success alone must not imply delivered or accepted completion without artifact and closure truth
- first-party buyer-credit top-up should update support-ledger truth without creating fake request funding truth
- spending buyer credit on one request should create both one credit-ledger debit and one request-attached transaction record
- Character Call Starter checkout should create one private `Request`, publish or reuse one workflow-backed first-party `Supply`, pin it as `routing.preferredSupplyId`, open the request, and settle one `$1` buyer-credit debit
- Character Call Starter checkout should bootstrap one active fulfillment lane, publish persona sheet, launch handoff, and credit receipt artifacts, then block on approved reference asset or existing Runway avatar id
- Character Call Starter Runway session launch should require an owned funded request and return only ephemeral one-time realtime credentials without persisting tokens to artifacts or events
- buyer credit must not be spendable on out-of-scope external supply in the first-party-only credit profile
- stablecoin or processor verification replay must not create duplicate settled ledger entries or duplicate settled request transactions

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
- the fixture-backed `web-live` matcher runner should rebuild actual outputs from runnable `requestPatch` plus full `candidateSupplies` snapshots instead of depending on hand-written actual JSON only

### Policy evals

Verify:

- next-action choice is safe and consistent with planner and matcher output
- approval-gated writes are not triggered early
- block-and-escalate behavior appears when canon or funding boundaries are violated
- policy preserves request-grant boundaries when funders, solvers, reviewers, and later audience actors participate in one request
- policy differentiates inspect, run, and fork actions on public solutions
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
- request-grant pool totals reconcile across funder contributions, refunds, platform fees, solver payouts, and reviewer fees when those exist
- solution-run credit debits reconcile with inference, provider, workflow, human-review, or service-capacity usage metadata when those costs are present
- public solution inspection has zero transaction total by default
- passive funder payout states remain absent unless a later canon decision explicitly accepts them
- payout states derive correctly from settlement history

## Object-to-Test Coverage

### Derived planning and matching objects

- `RequestDraft` extraction stability
- `MatchSpec` normalization stability
- `RoutePlan` phase and role consistency
- `RoleSlot` actor-kind and requiredness rules
- `MatchCandidate` ranking and explanation quality
- fingerprint enum acceptance and rejection for `outputKinds`, `supplyKinds`, `executionChannels`, route fields, role keys, phase keys, and evidence claims
- canonical role normalization for `field_verification -> field_technician` and `local_runner` or `pickup_dropoff -> courier_runner`

### `Request`

- creation
- draft briefing updates
- draft-only manual request-input edits
- status transitions
- summary projection
- participant visibility
- grant-funded participant roles
- public solution projection source integrity
- public solution run source-artifact reference integrity

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

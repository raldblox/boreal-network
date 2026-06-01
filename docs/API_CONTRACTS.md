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
- public-safe solution projection reads over completed public requests with `activeRefs.acceptedArtifactId`; this is a Request projection, not a `Solution` root
- public-safe request and solution projections include `agentActionAffordances` so agents can see request-bound inspect, apply, submit, monitor, run, and optimize actions without inferring next steps from UI copy
- request detail reads include `agentActionPolicy`, a derived actor-specific envelope that marks each request-bound agent action as allowed, allowed with idempotency, blocked, or target-only for the current anonymous, session, or resolver actor
- public-safe detail reads for one request by id
- free `POST /api/chats/{chatId}/messages/{messageId}/reusable-prompt/analyze` inspection over public or owned scratch-chat user text messages
- free `POST /api/chats/{chatId}/messages/{messageId}/reusable-prompt/runs` execution that creates or reuses one private scratch chat, stores source chat/message provenance on the forked user message, runs the filled prompt, and does not create a `Request`, debit credits, or write `Transaction` truth in V1
- reusable prompt free-chat runs are quota-gated by server policy: the default limit is `10` forked chats per UTC day, users with any settled buyer-credit top-up history receive `20` per UTC day, and token limits are controlled by environment variables
- explicit `save draft` normalization from the live request-input document surface
- request-brief field updates
- request-seeking field updates for structured matching intent
- owner-scoped `routing.preferredSupplyId` updates on private requests
- request constraint updates
- request budget and timing updates
- request route-summary updates
- owner-scoped `PATCH /api/requests/{id}` direct draft edits for buyer-authored fields only: `brief.title`, `brief.body`, `brief.summary`, buyer-authored `brief.constraints`, `budget`, and `deadline`
- explicit transition from `draft` to `open`
- `open_request` may asynchronously start one owner-private Boreal-managed worker lane when the request already has a pinned preferred supply
- manual request-object editing only while the request stays in `draft`
- full canonical request-object projection as read-only once the request leaves `draft`
- public request pool reads must exclude owner-only draft fields and should expose a public-safe request projection instead
- public request pool reads may expose action affordances, but those affordances must name auth and canonical writes explicitly and must not grant mutation authority by themselves
- owner detail reads may include private routing control state while public projections must exclude it
- chat transcript reads through `GET /api/messages?chatId={chatId}` must require a valid UUID before database access, keep draft or private request envelopes owner-only, return the owner transcript only to authorized viewers, and avoid exposing owner-private request briefing history to public responders by default
- request activity reads through `/requests/{id}/activity` so open request rooms can render durable timeline cards without replaying chat transcript; monitors may use `after_sequence` and `limit` to resume from a stable `RequestEvent.sequence` checkpoint
- owner-scoped `POST /api/messages/trailing` for edit-resend cleanup before appending the replacement user turn; it requires a valid message UUID, deletes chat messages after the selected owned message, and does not create `RequestEvent` history
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
Owner-private first-party service lanes may create direct fulfillment from `open`, `funded`, `in_progress`, or `waiting_for_owner` when the same owner is driving a selected first-party supply lane.
When fulfillment create includes `supplyId`, the server should validate ownership, `published` status, and resolver binding compatibility before opening the lane.
Owner-private Boreal-managed web workers may also open one direct fulfillment lane after `open_request`, but the provider-facing payload should stay reduced to worker-specific prompt and execution inputs instead of the entire request object.
Retryable internal worker or storage handoff failures should move that same fulfillment lane to `blocked`, preserve the worker input and provider recovery metadata, and resume through `POST /api/fulfillments/{id}/retry` instead of terminally failing the request immediately.
Queued provider work is not itself a failure: the same retry endpoint may check an `active` first-party worker fulfillment that already has a saved provider task id, keeping the lane `active` until a stored artifact is ready or a real recoverable handoff failure occurs.

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
- `POST /api/paypal/create-order`
- `GET /api/paypal/capture`
- `POST /api/paypal/webhook`
- `POST /api/services/character-call-starter/checkout`
- `POST /api/services/character-call-starter/session`
- `POST /api/requests/{id}/solution-runs`
- `GET /api/requests/{id}/transactions`
- `POST /api/requests/{id}/transactions`

Rules:

- buyer-credit endpoints are authenticated account-session routes in the first slice
- top-up creates buyer-credit support ledger truth but does not create request `Transaction` truth
- public solution inspection should not call buyer-credit apply or create request `Transaction` truth by itself
- credit-consuming solution runs should create or use one run `Request` that references the source accepted artifact before debiting credits
- PayPal order creation for account top-up creates one pending buyer-credit ledger entry and redirects the buyer through PayPal approval
- PayPal return capture and verified PayPal webhooks may settle that same pending ledger entry
- PayPal settlement must be idempotent because buyer return and webhook delivery can race or replay
- PayPal webhook verification must use PayPal signature verification before mutating buyer-credit ledger state
- direct request funding creates request-attached `Transaction` truth
- buyer-credit application creates both one credit ledger debit and one request-attached `Transaction`
- curated first-party service checkout may compose request creation, preferred `Supply` pinning, request open, and buyer-credit debit in one endpoint when the endpoint returns the same canonical `Request`, `Supply`, `Transaction`, and buyer-credit ledger projections
- curated first-party service checkout must stay idempotency-keyed and must not introduce a separate order root object for launch-price credit spend
- payment idempotency replays must resolve to the same request, amount, ledger debit, and request-attached `Transaction`
- solution-run idempotency replays must resolve to the same run request, same source artifact reference, same credit debit, and same request-attached `Transaction`
- `POST /api/requests/{id}/solution-runs` creates or reuses one private run `Request` for the authenticated buyer, where `{id}` is the completed public source request
- solution-run requests must reference the source accepted artifact in request metadata or constraints before buyer credits are debited
- solution-run inspection remains separate from execution; reading `scope=public_solutions` or the source request detail must not debit credits
- solution-run responses must return the run `Request`, source request projection, source artifact projection, buyer-credit debit, request `Transaction`, and ledger entry
- Character Call Starter checkout should also bootstrap the owner-private `Fulfillment` lane and request artifacts after settlement instead of storing service-progress truth outside the request
- Character Call Starter session launch returns ephemeral Runway realtime credentials, must resolve the `fulfillmentId` to the same owned request, and must not persist one-time session tokens as durable artifacts
- mutating payment routes accept `Idempotency-Key`

Machine-readable contract:

- `schemas/openapi/payment-and-credit.openapi.yaml`

The first public solution-run endpoint is committed as:

- `POST /api/requests/{id}/solution-runs`

It is intentionally narrow.
It does not introduce a `SolutionRun` root.
It creates or reuses one private run `Request`, references the source accepted artifact, applies first-party buyer credits, and returns request-attached transaction and ledger truth.
Future fulfillment automation may attach `Fulfillment` after route or supply selection, but the v0 endpoint must not fake active execution when no worker lane exists.

## Account Auth Surface

Regular Boreal web accounts should use:

- `username or email`
- `password`
- optional required `WebAuthn` second factor once enrolled
- optional passkey-first login after a discoverable `WebAuthn` credential is enrolled

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
- start WebAuthn assertion for passkey-first login without a username field
- verify WebAuthn assertion for passkey-first login and issue an account session from the returned credential

If later fallback factors are added:

- authenticator-app `TOTP` must be modeled as a separate factor type
- recovery codes must be modeled separately from passkeys

Email remains required for regular account registration until recovery codes or another non-email recovery path exists. Making email optional before recovery exists is out of scope.

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

Object-storage media artifacts may be previewed through a request-scoped media read route only after request-read authorization succeeds; the preview route must not expose private blob keys as public URLs.

## Resolver Auth Surface

Non-browser runtimes should use a Boreal-issued resolver identity layer.

The first web slice exposes:

- `POST /api/auth/resolver/device/start`
- `POST /api/auth/resolver/device/poll`
- `POST /api/auth/resolver/token/refresh`
- `POST /api/auth/resolver/token/revoke`

Resolver device-start is intentionally unauthenticated because the runtime is
not paired yet, so it must be rate-limited before any pending resolver client or
authorization rows are created.

The runtime proof and Boreal actor proof stay separate:

- Codex auth proves the local runtime is connected
- Boreal resolver approval binds that runtime to one Boreal account and one scoped actor context

If a desktop or peer runtime exposes ephemeral realtime transport, that transport should stay scoped to runtime or session authorization and must not be treated as proof of Boreal actor identity by itself.

The first desktop-local browser bridge should stay constrained like this:

- bind to `127.0.0.1` only
- require a random per-runtime session token
- reject non-localhost browser origins
- reject requests with no browser `Origin` header on HTTP bridge routes
- stream ephemeral execution feedback only
- allow one localhost-only discovery read such as `/discover` so Boreal web can auto-link a running desktop runtime without a manual copy-paste setup flow
- `/discover` must never return the live session token or a token-bearing event, model, or chat URL
- `/discover` may expose bridge-link readiness, Codex worker readiness, and Boreal resolver readiness as separate local states; do not collapse them into one fake `connected` truth
- `/discover` may also expose local desktop auto-resolve policy such as `autoResolveOwnedPrivate`, one desktop-default supply id, and the desktop-default Codex model and reasoning level, but those remain local runtime state instead of durable Boreal request truth
- expose read-only local bridge metadata such as `/health` and desktop model-access reads such as `/models` only behind the same session-token and localhost-origin checks
- allow one localhost-only `POST /chat` bridge write so Boreal web can dispatch one prompt turn into the connected desktop runtime and stream ephemeral token output back into the web chat surface
- `POST /chat` must stay local-runtime scoped, require the same session token, and must not be treated as durable Boreal request or actor truth by itself
- never act as durable Boreal request truth by itself

## Security-Sensitive Lab And Auth Surfaces

The matching lab may keep a public heuristic mode for local product exploration.
Any model-backed or provider-backed normalization mode must require a signed-in
regular account and route-level rate limiting before provider work starts.

Regular-account `WebAuthn` challenge generation must use an explicit deployment
origin allowlist and configured RP ID. Production challenge metadata must not be
derived from `Host`, `x-forwarded-host`, or `x-forwarded-proto` request headers.

PayPal webhook and checkout routes may log provider diagnostics server-side, but
responses to callers must stay generic and must not include upstream PayPal
response bodies.

## Agent-Native Access Profile

Agent-facing contracts reuse the same canonical HTTP, schema, auth, and event
layers instead of inventing a parallel agent ledger.

Read-only public discovery surfaces:

- `/llms.txt` for short public guidance and claim boundaries
- `/agents/start.md` for practical agent onboarding
- `/agents/actions.md` for contract-linked inspect, make-request, apply, submit, monitor, run, and optimize walkthroughs
- `/agents/actions/preflight` for validation-only action prerequisite checks before agents attempt governed Boreal routes
- `/agents/access-review.json` for machine-readable operator-review policy around requested scopes, quotas, revocation, decision outcomes, and target-adapter claims
- `/agents/auth.json` for machine-readable actor class, auth scheme, scope, approval, and write-boundary handling
- `/agents/conformance.json` for machine-readable pre-production checks across discovery, auth, handoff, payment, proof, recovery, sandbox, and protocol boundaries
- `/agents/conformance-report.example.json` for a public example package that agents can mirror when submitting sandbox replay evidence, requested scopes, protocol claims, secret-handling posture, and human-review questions for operator review
- `/agents/completion.json` for machine-readable proof packet, artifact, completion-claim, and review-boundary handling
- `/agents/delegation.json` for machine-readable human-owned delegation, consent screen, scope, revocation, and per-action approval boundaries
- `/agents/evidence.json` for machine-readable evidence packet, artifact packaging, redaction, review, and proof-boundary handling
- `/agents/evidence/validate` for validation-only proof and delivery packet checks before governed Artifact submission
- `/agents/error-examples.json` for RFC 9457-style problem examples covering auth, scope, idempotency, rate-limit, payment, monitor, fulfillment, and unknown-write recovery
- `/agents/execution.json` for machine-readable execution lane, `Fulfillment`, `FulfillmentStep`, runtime signal, and direct-owner exception boundaries
- `/agents/human-handoffs.json` for machine-readable human approval, stop, escalation, visible UX, and claim-state handling
- `/agents/human-handoff-packets.example.json` for checked renderable packet examples covering draft approval, Commitment review, proof review, monitor escalation, and payment authorization
- `/agents/http.json` for a unified machine-readable HTTP reference over current agent-callable routes, OpenAPI sources, auth, scopes, idempotency, and canonical writes
- `/agents/ux.json` for machine-readable human-first agent process and UX surfaces covering discovery, consent, action, monitoring, proof review, payment authorization, optimization, and completion claims
- `/agents/onboarding.json` for machine-readable external-agent onboarding, contract sandbox validation, production eligibility, and scoped credential boundaries
- `/agents/optimization.json` for machine-readable draft-only optimization, no-invention, owner-approval, and mutation-boundary handling
- `/agents/payments.json` for machine-readable buyer-credit, paid-run, x402 target, idempotency, and `Transaction` reconciliation handling
- `/agents/production-access-packet.example.json` for a checked example packet that agents can mirror when requesting scoped operator review without receiving credentials, permission, payment authority, or completion proof
- `/agents/prompts.json` for machine-readable safe prompts for briefing, applying, proof submission, monitoring, optimization, and recovery
- `/agents/workflows.json` for machine-readable process flows that combine discovery, `agentActionPolicy`, idempotency, scopes, stop conditions, and canonical writes
- `/agents/monitor-webhooks.md` for the target signed webhook receiver profile for request activity monitors
- `/agents/monitoring.json` for machine-readable cursor polling, stale-state detection, escalation, and push-versus-poll monitoring boundaries
- `/agents/protocols.md` for MCP, A2A, and x402 adapter/payment boundaries
- `/agents/protocols.json` for machine-readable MCP, A2A, and x402 adapter mappings, non-goals, implementation order, and canon boundaries
- `/agents/opportunities.json` for machine-readable read-only public request opportunity discovery, local fit ranking, and next-action selection without granting permission, assignment, payment authority, or completion proof
- `/agents/protocol-adapter-samples.json` for target-only MCP, A2A, and x402 sample payloads mapped to Boreal HTTP contracts, scopes, idempotency, and canonical writes
- `/agents/recovery.json` for machine-readable auth failure, scope failure, idempotency conflict, rate limit, monitor cursor, fulfillment retry, payment uncertainty, and escalation handling
- `/agents/readiness.json` for machine-readable live-versus-target capability bands, standard planes, agent UX flow, and go/no-go checks
- `/agents/tools.json` for machine-readable safe tool invocation, preflight, HTTP fallback, target MCP/A2A mapping, idempotency, and canonical write boundaries
- `/agents/sandbox.md` for a contract-only sandbox guide with deterministic mock identities, sample IDs, payloads, and replay scenarios
- `/agents/sandbox.json` for the machine-readable contract-only sandbox manifest and deterministic replay catalog
- `/.well-known/agent-card.json` for public-safe A2A-style identity, capability, auth, and skill metadata
- `/openapi.json` for the agent discovery OpenAPI index
- `/openapi/request-briefing.yaml` for request briefing, request room, and solution-run HTTP contracts
- `/openapi/supply-management.yaml` for supply management HTTP contracts
- `/openapi/resolver-auth.yaml` for resolver approval and bearer-token HTTP contracts
- `/openapi/payment-and-credit.yaml` for payment, buyer-credit, request-grant, and transaction HTTP contracts
- `/schemas/*.schema.json` for canonical JSON Schema object shapes
- `/schemas/agent-access-review.schema.json` for the machine-readable agent access review profile shape
- `/schemas/agent-sandbox.schema.json` for the contract-only agent sandbox manifest shape
- `/schemas/agent-auth.schema.json` for the machine-readable agent auth profile shape
- `/schemas/agent-conformance.schema.json` for the machine-readable agent conformance profile shape
- `/schemas/agent-conformance-report.schema.json` for the machine-readable agent conformance report shape used to package sandbox replay evidence and requested scopes for operator review
- `/schemas/agent-production-access-packet.schema.json` for the checked production access packet example shape used as operator-review input
- `/schemas/agent-intake-validation.schema.json` for the validation-only request and response envelope used to preflight conformance reports and production access packets
- `/schemas/agent-action-preflight.schema.json` for the validation-only request and response envelope used to preflight action prerequisites
- `/schemas/agent-completion.schema.json` for the machine-readable agent completion profile shape
- `/schemas/agent-delegation.schema.json` for the machine-readable human delegation profile shape
- `/schemas/agent-evidence.schema.json` for the machine-readable agent evidence profile shape
- `/schemas/agent-evidence-validation.schema.json` for the validation-only request and response envelope used to preflight evidence packets
- `/schemas/agent-error-examples.schema.json` for the machine-readable agent error example shape
- `/schemas/agent-execution.schema.json` for the machine-readable agent execution profile shape
- `/schemas/agent-human-handoffs.schema.json` for the machine-readable human handoff profile shape
- `/schemas/agent-human-handoff-packets.schema.json` for the checked human handoff packet example shape
- `/schemas/agent-http.schema.json` for the machine-readable agent HTTP reference profile shape
- `/schemas/agent-ux.schema.json` for the machine-readable agent UX profile shape
- `/schemas/agent-monitoring.schema.json` for the machine-readable agent monitoring profile shape
- `/schemas/agent-onboarding.schema.json` for the machine-readable agent onboarding profile shape
- `/schemas/agent-opportunities.schema.json` for the machine-readable read-only agent opportunity discovery profile shape
- `/schemas/agent-optimization.schema.json` for the machine-readable agent optimization profile shape
- `/schemas/agent-payments.schema.json` for the machine-readable agent payment profile shape
- `/schemas/agent-prompts.schema.json` for the machine-readable agent prompt catalog shape
- `/schemas/agent-workflows.schema.json` for the machine-readable agent workflow catalog shape
- `/schemas/agent-protocols.schema.json` for the machine-readable agent protocol profile shape
- `/schemas/agent-protocol-adapter-samples.schema.json` for the target-only agent protocol adapter sample pack shape
- `/schemas/agent-recovery.schema.json` for the machine-readable agent recovery profile shape
- `/schemas/agent-readiness.schema.json` for the machine-readable agent readiness profile shape
- `/schemas/agent-tools.schema.json` for the machine-readable agent tool registry shape
- `/events/request-room.asyncapi.yaml` for durable request-room monitoring contracts

Validation-only public agent surface:

- `POST /agents/intake/validate` accepts either a conformance report or production access packet envelope and returns missing fields, warnings, next steps, and non-authority boundaries. It does not create a review submission, issue credentials, grant permission, approve spend, create a production sandbox, write `RequestEvent` truth, or prove completion.
- `POST /agents/actions/preflight` accepts an action id plus visible request, represented-actor, approval, idempotency, scope, and payload-summary context, then returns action availability, canonical reads and writes, required contracts, entrypoints, missing requirements, warnings, and non-authority boundaries. It does not grant permission, record approval, issue credentials, authorize payment, publish artifacts, propose commitments, mutate requests, write `RequestEvent` truth, or prove completion.
- `POST /agents/evidence/validate` accepts a proof, delivery, receipt, or handoff packet envelope and returns missing fields, warnings, next steps, and non-authority boundaries. It does not grant permission, publish an `Artifact`, store files, accept review, authorize payment, write `RequestEvent` truth, or prove completion.

The agent card and `/openapi.json` include the same action catalog for common
agent intents: inspect public requests, make a request draft for a human, apply
to a request, submit an artifact, monitor activity, run a public solution, and
optimize a request brief or plan.
The catalog is descriptive and contract-linked. It labels whether an action is
public read, live authenticated HTTP, or target direction, and it includes
resolver scopes where live endpoints enforce them. It does not bypass endpoint
authorization, idempotency, or canonical lifecycle rules.

Agent-facing OpenAPI contracts must expose auth metadata in the machine-readable
contract, not only in prose. Live request, supply, and payment OpenAPI exports
declare `BorealAccountSession` and, where supported, `ResolverBearer` security
schemes. Operations use standard OpenAPI `security` requirements for anonymous,
session, and bearer access, then use `x-boreal-required-scopes` and
`x-boreal-auth-boundary` extensions to name route-specific resolver scopes and
conditions such as owner-private reads versus public inspection.

The public agent auth profile is descriptive and safety-oriented. It maps
anonymous agents, account-session agents, resolver-bearer agents, and future
OAuth-compatible external agents to allowed reads, target or live auth schemes,
scopes, approval rules, idempotency expectations, and explicit non-grants. It
does not create a new identity root, grant production credentials, or override
request state, actor ownership, participant role, endpoint policy, or lifecycle
gates.

The public agent access review profile is descriptive and safety-oriented. It
tells external agents how operators should evaluate conformance reports,
requested scopes, rate limits, revocation triggers, decision outcomes, and
target protocol-adapter claims. It is not a credential issuer, permission
grant, certification, human approval record, payment authorization, or
completion proof.

The public agent completion profile is descriptive and safety-oriented. It tells
agents which proof packet, artifact, fulfillment, review, transaction, and event
truth is required before they can say a draft is ready, a proposal was
submitted, proof was submitted, delivery is waiting for acceptance, or work is
complete. It does not grant permission, skip owner review, or make chat output,
payment settlement, MCP tool success, A2A task status, provider callbacks, or
runtime logs sufficient completion truth by themselves.

The public agent payment profile is descriptive and safety-oriented. It tells
agents which buyer-credit, direct-funding, public-solution-run, and x402-target
boundaries apply before spending credits or money. Public solution inspection
remains free, live spend mutations require account-session authority, request
funding and paid runs must reconcile into request-attached `Transaction` truth,
and x402 remains target-only until an endpoint is explicitly marked
x402-capable. It does not grant payment credentials, settle funds, create an
`Order` root, or make payment success completion truth.

Agent-facing recovery guidance is descriptive and safety-oriented. It tells
agents when to stop, retry with the same idempotency key, resume from a monitor
cursor, inspect `Transaction` truth, or escalate to a human. It does not grant
permission, create durable history, or replace endpoint authorization.

The public agent conformance profile is descriptive and safety-oriented. It
gives agent builders a checklist for proving they can load contracts, respect
auth and policy, require human approval, preserve proof and payment boundaries,
use the sandbox correctly, and avoid overclaiming target protocol adapters. It
is not certification, permission, production credentials, payment authorization,
or completion proof.

The public agent conformance report schema is descriptive and safety-oriented.
It gives agents a standard way to package sandbox replay results, requested
production scopes, target protocol claims, secret-handling posture, and blocking
human-review questions. A report is operator-review input only. It is not a
credential, certification, human approval record, payment authorization, or
completion proof.
The public example report route shows one complete shape for that package and
must remain sample evidence only; it does not submit the report, grant access,
or record operator approval.

The public production access packet example is descriptive and safety-oriented.
It gives external agents a checked package shape for requesting scoped operator
review after discovery, conformance, sandbox replay, human escalation, data
handling, idempotency, rate-limit, and target-protocol boundaries are known. It
is not a credential, permission grant, operator approval record, human approval
record, payment authorization, production sandbox, certification, or completion
proof.

The public agent intake validation endpoint is validation-only and
safety-oriented. It gives agents immediate machine-readable feedback on
conformance reports and production access packets before a human or operator
review. It is not a submission endpoint, credential issuer, permission grant,
operator approval record, human approval record, production sandbox, payment
authorization, certification, completion proof, or durable history write.

The public agent action preflight endpoint is validation-only and
safety-oriented. It gives agents immediate machine-readable feedback on
action-specific prerequisites such as request id, represented actor, human
approval, idempotency, resolver scopes, route contracts, and expected canonical
writes before a real governed route is attempted. It is not an executor,
credential issuer, permission grant, approval record, payment authorization,
commitment proposal, artifact publication, request mutation, completion proof,
or durable history write.

The public agent evidence validation endpoint is validation-only and
safety-oriented. It gives agents immediate machine-readable feedback on
Artifact-candidate packet shape, redaction posture, bounded claim state,
idempotency posture, review request, and secret-handling before a real
`submit_artifact` route is attempted. It is not an artifact storage backend,
permission grant, review acceptance, payment authorization, completion proof,
or durable history write.

The public agent delegation profile is descriptive and safety-oriented. It tells
agents how a human can delegate one action through public read, account-session,
resolver-bearer, target OAuth, or operator-reviewed pilot paths without sharing
raw credentials. It names consent screen fields, required scopes, revocation
paths, policy checkpoints, and canonical writes if the human approves. It is not
a credential issuer, permission grant, human approval record, payment
authorization, accepted Commitment, Fulfillment start, Artifact proof, or
completion proof.

The public agent human handoff profile is descriptive and safety-oriented. It
tells agents when to ask a human, show a draft, request approval, stop, escalate,
or use precise claim-state language for draft, proposal, proof, payment,
monitor, and completion moments. It does not grant permission, record approval,
authorize spend, prove completion, or create a new workflow engine.

The public agent human handoff packet examples are descriptive and
safety-oriented. They give agents a concrete renderable shape for asking a
human to approve a draft, review a Commitment proposal, review submitted proof,
respond to a stale monitor, or authorize spend. They are not permission grants,
approval records, payment authorizations, production credentials, or completion
proof, and they must always point back to the governed route, review, payment,
or event path that owns the durable action.

The public agent HTTP reference profile is descriptive and safety-oriented. It
gives agents one machine-readable current-route view over the live HTTP baseline
using existing OpenAPI exports as the contract source. It summarizes route
families, auth schemes, required scopes, idempotency requirements, preflight
order, and canonical reads or writes. It is not a new API surface, permission
grant, credential issuer, MCP server, A2A adapter, x402 endpoint, human approval
record, or completion proof.

The public agent UX profile is descriptive and safety-oriented. It gives agents
one human-first process map for discovery, opportunity choice, request drafting,
delegation, policy preflight, applying, proof submission, monitoring, recovery,
payment authorization, optimization, and completion claims. It is not a workflow
engine, permission grant, human approval record, payment authorization,
credential issuer, adapter implementation, or completion proof.

The public agent evidence profile is descriptive and safety-oriented. It tells
agents how to package delivery, proof, receipts, files, media, and handoff notes
as reviewable `Artifact` packets with redaction, evidence-level, and review
signals. It does not authorize artifact publication, store files, accept review,
settle payment, or prove completion by itself.

The public agent error examples are descriptive and safety-oriented. They use a
standard problem-details shape with Boreal extensions so agents can classify
auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and
unknown-write failures before retrying or escalating. They are not durable
history, permission grants, human approval records, payment authorizations,
production credentials, or completion proof.

The public agent execution profile is descriptive and safety-oriented. It tells
agents when accepted-commitment, owner-private direct, public-solution-run, and
target-adapter execution lanes may start; why worker sub-work defaults to
`FulfillmentStep`; and which runtime signals stay ephemeral unless promoted into
`Artifact`, `FulfillmentStep`, or `RequestEvent` truth. It does not authorize
writes, prove completion, grant runtime identity, or turn provider tasks, MCP
sessions, A2A tasks, x402 payments, stdout, local logs, or tool traces into root
objects.

The public agent optimization profile is descriptive and safety-oriented. It
tells agents how to improve request briefs, proposals, proof packets, monitor
updates, and public-solution reuse inputs as draft-only recommendations. It does
not authorize durable writes, override planner or policy fields, imply owner
approval, settle payment, or prove completion.

The public agent monitoring profile is descriptive and safety-oriented. It
tells agents how to poll durable activity with `after_sequence`, persist
`cursor.nextAfterSequence`, detect stale work, escalate human decisions, and
distinguish live cursor polling from target signed push delivery. It does not
grant permission, create subscriptions, write heartbeat events, accept proof,
settle payment, or prove completion.

The public agent onboarding profile is descriptive and safety-oriented. It tells
external agents how to move from public discovery to role classification,
contract-only sandbox validation, scoped live HTTP use where route contracts
allow it, and target production access review. It does not issue credentials,
activate OAuth-compatible delegation, create a production sandbox, enable MCP or
A2A adapters, activate x402 endpoints, grant permission, or prove completion.

The public agent opportunity discovery profile is descriptive and
safety-oriented. It tells agents how to turn public-safe request projections
and `agentActionAffordances` into local opportunity cards, fit scores, and
recommended next actions without exposing private data or mutating durable
truth. It is not a permission grant, assignment, accepted Commitment,
fulfillment start, payment authorization, match result, or completion proof.

The public agent prompt catalog is descriptive and safety-oriented. It gives
agents ready prompt templates for request briefing, applications, proof packets,
monitor escalations, optimization suggestions, and recovery packets. Prompt
output is draft or analysis by default. It does not authorize durable writes,
record approval, create `RequestEvent` history, publish `Artifact` proof,
submit `Commitment`, reconcile `Transaction`, or prove completion.

The public agent readiness profile is descriptive and safety-oriented. It gives
agents one machine-readable capability matrix for what is live now, what is
target-only, which standards apply at each layer, the intended agent UX flow,
and the go/no-go checks that must pass before write, payment, monitor, recovery,
or completion claims. It does not grant credentials, enable MCP or A2A adapters,
settle payment, or prove completion by itself.

The public agent protocol adapter samples are descriptive and target-only. They
show concrete MCP tool, A2A task or artifact, and x402 payment-shape payloads
mapped to Boreal HTTP routes, scopes, idempotency, policy gates, and canonical
writes. They are not live adapters, credentials, permission grants, payment
authorization, or completion proof.

The public agent tool registry is descriptive and safety-oriented. It maps
agent intents to current HTTP routes plus target MCP and A2A names, and it names
the preflight, auth, idempotency, output-truth, and canonical write boundaries
for each tool. It does not create a separate tool runtime, grant permission,
make MCP or A2A adapters live, or let tool success replace `Request`,
`Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent` truth.

The sandbox surfaces are contract samples only.
They do not create live objects, spend money, approve resolver access, or grant
mutation authority.
Mock bearer tokens, mock sessions, sample webhook secrets, and sample object ids
from `/agents/sandbox.json` must not be accepted by production endpoints.
`pnpm contracts:agent-sandbox` validates the checked
`fixtures/agent/sandbox-manifest.sample.json` fixture against the public
sandbox contract, required flow coverage, idempotency samples, cursor samples,
webhook header samples, deterministic replay scenarios, and canon-boundary
rules. Replay scenarios may model process order across apply, accepted
commitment, proof submission, monitoring, paid-run shape, and recovery, but they
remain non-production transcripts and do not grant live write authority.

These are public inspection and contract-discovery routes.
They do not create a new root object, and they do not make private drafts,
private chats, owner-only fields, raw desktop transcripts, or resolver secrets
public.

Agent-facing write surfaces must preserve the same gates as human or resolver
routes:

- public inspection is read-only by default
- `agentActionAffordances` are hints over existing governed endpoints, not separate permissions or a new workflow ledger
- `agentActionPolicy` is the request-detail permission lens agents should read before writing; it is derived from request state, actor ownership, resolver scopes, and live endpoint gates, and it does not create durable truth by itself
- `/agents/access-review.json` is the public operator-review lens agents should read before requesting scoped pilot or production access; it does not issue credentials, grant permission, certify an agent, authorize spend, or make target adapters live
- `/agents/conformance.json` is the public checklist lens agents should pass before production use; it does not replace request-specific `agentActionPolicy`
- `/schemas/agent-conformance-report.schema.json` is the public report shape agents should use when attaching sandbox replay evidence to a production access request; it does not grant production access
- `/agents/conformance-report.example.json` is a sample package agents can copy structurally, not a submission endpoint, credential, approval record, or certification
- `/agents/production-access-packet.example.json` is the public packet example agents should mirror before requesting operator review; it does not submit the request, issue credentials, grant permission, authorize spend, create a production sandbox, or prove completion
- `/agents/delegation.json` is the public human-delegation lens agents should read before requesting scopes, rendering consent screens, storing consent receipts, or explaining revocation; it does not issue credentials, grant permission, record approval, authorize spend, or bypass request-specific `agentActionPolicy`
- `/agents/evidence.json` is the public evidence lens agents should read before `submit_artifact`; it does not authorize publication or replace `Artifact` review
- `POST /agents/evidence/validate` is the public validation-only preflight agents may call before `submit_artifact`; it validates proof and delivery packet shape but does not grant permission, publish an `Artifact`, store files, accept review, authorize spend, write `RequestEvent` truth, or prove completion
- `/agents/execution.json` is the public execution lens agents should read before starting work, retrying a lane, or promoting runtime output; it does not authorize writes, prove completion, or turn runtime sessions, provider tasks, MCP sessions, A2A tasks, x402 payments, stdout, local logs, or tool traces into roots
- `/agents/human-handoffs.json` is the public handoff lens agents should read before asking, stopping, escalating, requesting approval, or claiming draft, proposal, proof, payment, monitor, or completion state to a human
- `/agents/http.json` is the public HTTP lens agents should read before choosing a live route; it summarizes existing OpenAPI exports and does not create a new endpoint contract, grant permission, replace route auth, make target adapters live, or prove completion
- `/agents/ux.json` is the public UX lens agents should read before rendering human-facing process state; it organizes existing profiles and route contracts without creating a workflow engine, permission grant, approval record, payment authorization, adapter, or completion proof
- `POST /agents/intake/validate` is the public validation-only preflight agents may call before human or operator review; it validates conformance reports and production access packets but does not submit them, issue credentials, grant permission, record approval, authorize spend, create a production sandbox, write `RequestEvent` truth, or prove completion
- `POST /agents/actions/preflight` is the public validation-only preflight agents may call before attempting apply, submit, monitor, run, or optimize actions; it validates visible prerequisites and returns canonical route guidance but does not grant permission, record approval, authorize spend, publish artifacts, propose commitments, mutate requests, write `RequestEvent` truth, or prove completion
- `/agents/optimization.json` is the public optimization lens agents should read before improving a brief, proposal, evidence packet, monitor update, or solution-run input; optimization is draft-only unless a human approves a governed mutation
- `/agents/monitoring.json` is the public monitor lens agents should read before polling, detecting stale work, processing target webhook envelopes, or escalating monitor findings
- `/agents/onboarding.json` is the public onboarding lens external agents should read before claiming production eligibility; it is not a credential issuer, OAuth server, production sandbox, adapter implementation, payment endpoint, or permission grant
- `/agents/opportunities.json` is the public opportunity lens agents should read before ranking public requests or recommending apply, submit, monitor, run, or optimize actions; it is read-only analysis and does not grant permission, attach a match, assign supply, start fulfillment, authorize payment, or prove completion
- `/agents/prompts.json` is the public prompt lens agents should read before drafting briefs, proposals, proof packets, monitor updates, optimizations, or recovery packets; it is not a mutation endpoint, approval record, completion proof, MCP server, or workflow engine
- `/agents/protocol-adapter-samples.json` is the public standards-interop sample pack agents should read before designing MCP, A2A, or x402 adapters; it is target-only and does not make any adapter live
- contract sandbox mock identities may validate payload shape only and must never bypass production auth
- requester agents may draft requests through the `make_request_for_human` action but should not open them without buyer approval
- solver agents propose through `Commitment` before cross-actor fulfillment
- proof and delivery must attach through `Artifact`
- monitoring should read durable activity without promoting every heartbeat into `RequestEvent`
- monitor agents should persist `cursor.nextAfterSequence` from `/api/requests/{id}/activity` and send it back as `after_sequence` on the next poll
- signed monitor webhooks, when implemented, must use `Boreal-Webhook-Id`, `Boreal-Webhook-Timestamp`, and `Boreal-Webhook-Signature` over the raw body, and receivers must deduplicate by delivery id before side effects
- MCP tools, when implemented, must call the same governed mutations or enforce equivalent checks
- A2A tasks, when implemented, map to request-bound operations and do not replace `Request`
- x402 payments, when implemented, must reconcile into `Transaction` and must not imply completion by themselves

## Schema Discipline

- Human-readable contract rules live in this file.
- Machine-readable HTTP contracts live in OpenAPI files.
- Machine-readable event contracts live in AsyncAPI files.
- Machine-readable object payloads live in JSON Schema files.

Do not make markdown the only contract surface once a machine-readable contract exists.

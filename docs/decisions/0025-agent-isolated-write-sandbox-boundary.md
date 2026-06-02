# 0025 Agent Isolated Write Sandbox Boundary

## Status

Accepted

## Date

2026-06-02

## Context

Boreal now exposes public agent discovery, request action affordances, request-level action card hints, request-detail `agentActionPolicy`, validation and preparation endpoints, contract-only sandbox replay scenarios, operator-review packets, protocol profiles, and target MCP/A2A/x402 mappings.

The next agent-readiness gap is not another public guide. It is a safe way for external agents to test write-capable flows such as applying to a request, submitting proof, monitoring activity, running a public solution shape, and recovering from uncertain writes without touching production buyer work.

Bad options would create drift:

- accepting contract-sandbox mock credentials in production
- letting external agents write against real buyer or solver records before operator review
- creating a separate sandbox object model that diverges from `Request`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, and `RequestEvent`
- treating an MCP tool result, A2A task state, x402 payment payload, local transcript, or sandbox replay as production truth
- allowing a sandbox to prove completion, settle real payments, or bypass human owner review

## Decision

### 1. The first write sandbox is environment isolation, not a new domain model

The minimum acceptable write sandbox is a segregated non-production environment over the same Boreal contracts.

It may create canonical-shaped objects only inside the sandbox dataset:

- `Request`
- `RequestParticipant`
- `Commitment`
- `Fulfillment`
- `FulfillmentStep`
- `Artifact`
- `Transaction`
- `RequestEvent`

It must not introduce a durable `SandboxRequest`, `Task`, `Job`, `Order`, `Offer`, or protocol-specific root object.

Sandbox records are not production records. They must never be merged into production history without a separate governed import or replay decision.

### 2. Credentials are revocable scoped infrastructure, not work truth

Sandbox credentials may exist only as auth and access-control infrastructure.

They are not canonical work objects and do not grant production access.

Every sandbox credential must have:

- represented actor
- credential kind
- allowed scopes
- allowed environment
- expiry
- revocation path
- rate limit
- idempotency requirement for write-like calls
- operator reviewer or issuing policy

Sandbox credentials must be rejected by production endpoints.

### 3. The sandbox follows the same route and policy order as production

The sandbox should prove that agents can follow Boreal process order.

For write-capable actions, the sandbox order is:

1. discover public-safe requests and schemas
2. inspect request-level `agentActionAffordances` and `agentActionCardHints`
3. read request-detail `agentActionPolicy`
4. run the relevant validation or preparation endpoint
5. request human approval when the policy or action card requires it
6. call the governed route with the required scope and idempotency key
7. monitor `RequestEvent` activity with cursor safety
8. package evidence without claiming completion until owner-review truth exists

The sandbox must use the same OpenAPI, JSON Schema, AsyncAPI, idempotency, policy, completion, evidence, payment, and recovery contracts as production-facing routes.

### 4. Minimum flow coverage

The first isolated write sandbox must cover:

- requester draft creation without auto-opening
- solver `Commitment` proposal
- owner or simulated-owner acceptance gate
- `Fulfillment` and `FulfillmentStep` creation only after an accepted gate
- `Artifact` proof submission
- cursor-based monitoring
- idempotent retry of apply, submit, run, and recovery actions
- paid-run shape with sandbox-only `Transaction` truth and no real money movement
- optimization as draft output unless a human approves a governed mutation
- RFC 9457-style problem responses for auth, scope, idempotency, rate-limit, payment, monitor, fulfillment, and unknown-write failures

### 5. Human-first boundary

Because Boreal's first users are human, the write sandbox must teach agents to ask, stop, and explain before mutating.

Human-visible action cards, handoff prompts, proof review cards, monitor escalation cards, and payment authorization cards are required UX artifacts.

Those cards are not permission, approval, payment authority, durable history, or completion proof.

### 6. Activation gates

No live write sandbox should be claimed until a patch defines and verifies:

- environment separation
- sandbox credential issuance and revocation
- production rejection of sandbox credentials
- route-level scope enforcement
- idempotency keys on all write-like actions
- rate limits
- seeded sandbox fixtures
- replay or contract tests for all minimum flows
- RFC 9457-style failure examples
- no real payment movement
- no production `RequestEvent` writes
- operator-review handoff from sandbox evidence to production access review

### 7. Relationship to protocol gateways

Decision `0024-agent-protocol-gateway-topology` still governs future MCP and A2A adapters.

Write-capable MCP tools, A2A task operations, and x402-enabled calls must wait until this sandbox boundary is implemented and verified.

Protocol adapters may wrap sandbox routes only after they enforce the same sandbox credential, scope, idempotency, policy, and non-production boundaries.

## Consequences

### Accepted

- Agents get a concrete path beyond contract replay without touching real buyer work.
- The sandbox tests the same process order agents must follow in production.
- Human-first consent, review, monitor, payment, and completion boundaries remain visible.
- Sandbox credentials can be revoked or rate-limited without changing canonical work semantics.
- Future protocol adapters have a clear prerequisite before write-capable tools.

### Rejected

- Treating contract replay transcripts as enough for production write access.
- Letting mock sandbox tokens bypass production auth.
- Treating a sandbox object, MCP tool result, A2A task, x402 payload, local output, or UX card as a canonical root.
- Using sandbox payment shapes to move real money.
- Claiming completion from sandbox evidence without owner-review truth.

### Tradeoffs

- A segregated write sandbox is slower than exposing production writes directly, but it protects human users and canonical request truth.
- Reusing production contracts in a sandbox requires more testing than a toy mock server, but it prevents agent integrations from learning the wrong API.
- Human approval gates make agent UX less autonomous at first, but they match Boreal's first-user reality.

## Implementation Notes

The first implementation patch should update at least:

- `docs/LIVE_VS_TARGET.md`
- `docs/API_CONTRACTS.md`
- `docs/TEST_MATRIX.md`
- `docs/strategy/AGENT_NATIVE_USAGE_BLUEPRINT.md`
- sandbox credential contract or auth infrastructure docs
- sandbox seed fixtures
- sandbox route or environment tests
- public readiness and onboarding profiles

Until that patch exists, Boreal has a contract-only sandbox, replay validation, and production-access packet review path, but no live isolated write sandbox credentials.

# 0024 Agent Protocol Gateway Topology

## Status

Accepted

## Date

2026-06-02

## Context

Boreal now exposes public agent discovery, JSON Schema, OpenAPI, AsyncAPI, a tool registry, protocol profiles, adapter samples, validation endpoints, preparation endpoints, sandbox replay validation, and target MCP/A2A/x402 mappings from `apps/web`.

The next protocol question is where future live MCP and A2A adapters should run.

Bad options would create drift:

- putting long-lived protocol adapter behavior directly inside the product web app
- letting an MCP server, A2A task adapter, or x402 endpoint become a second backend
- bypassing existing HTTP contracts, auth, idempotency, `agentActionPolicy`, or validation/preparation boundaries
- storing MCP sessions, A2A tasks, runtime logs, payment payloads, or adapter status as canonical work truth

The repo already has naming rules for gateways and packages, but agent protocol topology needs an explicit accepted direction before any workspace is created.

## Decision

### 1. `apps/web` remains the canonical HTTP and discovery surface

`apps/web` continues to own:

- public agent discovery routes
- `/llms.txt`
- `/.well-known/agent-card.json`
- `/openapi.json`
- public JSON Schema routes
- canonical HTTP route contracts
- validation-only and preparation-only agent endpoints
- request-detail `agentActionPolicy`

`apps/web` may expose public profiles and HTTP contracts for agents.

It should not become the long-term MCP/A2A adapter runtime.

### 2. Future live MCP and A2A adapters belong behind an agent gateway

If Boreal activates a deployable protocol adapter workspace, the preferred workspace name is:

- `apps/gateway-agent`

That gateway should bridge agent protocols to Boreal contracts.

It must not become a second source of durable truth.

Reusable mapping, schema, and protocol code should live in packages before it is copied into a deployable gateway. A future package should use a name that states its role, such as:

- `packages/agent-protocol`

Do not create those workspaces until the implementation patch updates repo topology and local workspace docs.

### 3. The gateway wraps existing contracts

The gateway must call or enforce the same boundaries as current Boreal surfaces:

- OpenAPI route contracts
- JSON Schema contracts
- AsyncAPI activity contracts
- route auth requirements
- resolver scopes
- account-session requirements
- `agentActionPolicy`
- idempotency keys
- validation-only tools
- preparation-only tools
- payment and `Transaction` reconciliation rules
- completion and proof boundaries

No adapter path may bypass those contracts by reading or writing implementation-local storage directly.

### 4. Protocol objects stay adapter objects

These are not canonical roots:

- MCP Resource
- MCP Tool
- MCP Prompt
- MCP session
- A2A Task
- A2A status update
- A2A message
- x402 payment payload
- webhook delivery attempt
- runtime log

Adapter ids may be stored as correlation metadata only when promoted by a governed route.

### 5. Activation order

The implementation order is:

1. Keep `apps/web` public discovery, HTTP, schema, validation, preparation, and sandbox routes as the live baseline.
2. Keep protocol profiles and adapter samples target-only until a gateway contract exists.
3. Define shared protocol mapping code in a package before adding a deployable gateway.
4. Activate read-only MCP resources first.
5. Add validation and preparation MCP tools before write tools.
6. Add write-capable MCP tools only after production sandbox credentials, revocation, rate-limit, and operator-review rules exist.
7. Add A2A task and artifact mapping after the request-bound write path is proven.
8. Add x402 only for endpoints explicitly marked x402-capable and reconciled into `Transaction` truth.

## Consequences

### Accepted

- Agent protocols become adapter layers over Boreal truth, not a new system of record.
- `apps/web` remains the stable public HTTP and discovery source.
- Future MCP and A2A work has a clear gateway path.
- Target protocol work can proceed without pretending production adapters are live.
- Package-first mapping reduces duplicated protocol logic across gateway, tests, and public profiles.

### Rejected

- Running a live MCP/A2A adapter as an implicit side effect of public `apps/web` discovery pages.
- Creating an agent protocol gateway that writes canonical objects directly.
- Treating A2A `Task` or MCP tool success as completion truth.
- Treating x402 payment success as fulfillment or review truth.
- Creating `apps/gateway-agent` or `packages/agent-protocol` without topology, ownership, README, AGENTS, and validation updates in the same patch.

### Tradeoffs

- A separate gateway adds one future deployable surface, but it keeps protocol concerns out of the product web app.
- Package-first mapping adds upfront structure, but it prevents three divergent mappings across MCP, A2A, and public docs.
- Read-only MCP before write-capable tools slows broad automation, but it protects buyer requests, payments, proof, and review state while first users are human.

## Implementation Notes

The next implementation patch for live protocol adapters should update at least:

- `docs/REPO_STRUCTURE.md`
- `docs/WORKSTREAMS.md`
- `docs/OWNERSHIP.md`
- local gateway `README.md`
- local gateway `AGENTS.md`
- package or gateway tests
- `docs/LIVE_VS_TARGET.md`
- `docs/TEST_MATRIX.md`
- `standards/agent-protocol-profile.md`

Until that patch exists, MCP, A2A, and x402 remain target protocol profiles over current HTTP contracts.

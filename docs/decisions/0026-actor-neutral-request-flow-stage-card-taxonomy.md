# 0026 Actor-neutral request-flow stage and card taxonomy

## Status

Accepted

## Date

2026-06-03

## Context

Boreal already has three related but separate surfaces:

- a request flow view that presents `Request -> Plan -> Worker -> Delivery`
- public agent action affordances, action cards, journeys, and UX profiles
- workflow-backed supply support objects and `n8n` import logic through `WorkflowPack` and `WorkflowPackVersion`

Those surfaces solve adjacent problems, but they do not yet define one shared stage and card taxonomy that both humans and agents can use.

The risk is that Boreal could accidentally create:

- agent-only stages that do not match human product behavior
- UI cards that look authoritative without route, policy, approval, proof, or payment truth
- n8n import or export mappings that treat workflow nodes as request lifecycle truth
- another hidden workflow ledger beside `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, and `RequestEvent`

The taxonomy needs to standardize what every stage and card means before adding schema, code, or import/export adapters.

## Decision

### 1. The taxonomy is actor-neutral

The accepted profile is a shared request-flow taxonomy.

It is not an agent-stage taxonomy.

Humans, agents, systems, and hybrid handoffs may all participate in the same request-flow stage, but their authority, capability, and UX surfaces can differ.

The working names are:

- `RequestFlowStage`
- `RequestFlowCard`
- `ParticipantAction`
- `ActorCapability`
- `AuthorityGate`
- `HandoffBoundary`
- `AdapterMapping`

### 2. Stages are process projections, not lifecycle states

`RequestFlowStage` is a process lens over canonical truth.

It does not replace or rename canonical states on:

- `Request`
- `Commitment`
- `Fulfillment`
- `FulfillmentStep`
- `Artifact`
- `Transaction`
- `RequestEvent`

Each stage must declare which canonical reads, possible writes, entry criteria, exit criteria, and next stages it depends on.

### 3. Cards are render and action surfaces, not authority

`RequestFlowCard` helps a human or agent understand what can happen next.

Every card must declare:

- what is read going in
- what may be produced if an authorized action is taken
- what is done in that card
- what is explicitly not done in that card
- which approval, policy, auth, idempotency, evidence, or payment gates apply
- which next stages are valid

Rendering a card never grants permission, records approval, authorizes spend, creates durable history, proves completion, or replaces a governed mutation route.

### 4. Actor mode and authority stay separate

The same stage may have different cards for different actor modes.

Example:

- a human can approve a `Commitment`
- an agent can prepare or submit a proposal only when route auth, scopes, idempotency, and request-specific policy allow it
- a system can render blocked-state recovery guidance

The taxonomy must make those differences explicit instead of hiding them in copy.

### 5. Workflow and n8n mappings stay below Boreal truth

n8n import/export maps to workflow support objects and adapter mappings.

It does not turn n8n workflows, nodes, executions, tasks, or credentials into Boreal root objects.

Accepted mapping boundary:

- imported n8n JSON may become a `WorkflowPackVersion` source and block graph
- workflow-backed plans may appear as path or card candidates
- exported n8n JSON may carry adapter-safe execution blocks
- Boreal-only authority, proof, review, payment, and completion semantics must stay in Boreal metadata, sidecars, or governed routes

### 6. Implementation order is docs, then schema, then code

The implementation order is:

1. keep this decision and the strategy taxonomy doc as the alignment layer
2. add a JSON Schema and fixture for the actor-neutral taxonomy
3. add TypeScript types and canonical definition data
4. map current request flow UI and `agentActionCardHints` onto the shared profile without breaking existing routes
5. add n8n import/export sidecar rules on top of `WorkflowPackVersion`
6. add contract tests that reject unknown stages, missing gates, unsafe card authority, and lossy n8n mappings without explicit lossiness records

## Consequences

### Accepted

- future card and stage work should use actor-neutral request-flow names
- agent UX remains downstream of the shared request-flow profile
- human product UX remains the first-user baseline
- n8n import/export is feasible only as adapter mapping plus sidecar semantics, not as a full Boreal truth round trip
- `agentActionCardHints` can remain live while future work derives a neutral card profile beneath or beside it

### Rejected

- naming the shared model `AgentStage`
- adding a new durable stage root
- replacing canonical lifecycle states with UI stage names
- treating n8n workflow execution as proof, review, payment, or completion truth
- exporting Boreal credentials, human approvals, payment authority, or durable request history into raw n8n workflow JSON

### Tradeoffs

- a shared taxonomy adds structure before implementation velocity
- n8n round-trip will be intentionally lossy for Boreal-only semantics
- existing agent-specific route names may remain for compatibility while the neutral layer is introduced
- the safest next patch is schema and fixture work, not live import/export activation

## Implementation Notes

The primary strategy artifact is:

- `docs/strategy/REQUEST_FLOW_STAGE_CARD_TAXONOMY.md`

Canon and strategy surfaces that should stay aligned:

- `docs/REQUEST_PROCESSING.md`
- `docs/REQUEST_PLAN_MODEL.md`
- `docs/TOOL_CALLING_CONTRACTS.md`
- `docs/SCHEMA_LOGICAL.md`
- `docs/LIVE_VS_TARGET.md`
- `docs/TEST_MATRIX.md`
- `docs/strategy/REQUEST_WORKROOM_V2_UX_PLAN.md`
- `docs/strategy/PATH_BUILDER_V1_UX_PLAN.md`
- `docs/strategy/AGENT_NATIVE_USAGE_BLUEPRINT.md`
- `standards/workflow-backed-supply-profile.md`

This decision does not add a machine-readable schema, endpoint, live n8n exporter, live n8n importer route, credential issuer, or adapter runtime by itself.

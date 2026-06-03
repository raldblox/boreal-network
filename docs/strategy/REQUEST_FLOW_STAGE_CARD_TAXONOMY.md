# Request Flow Stage Card Taxonomy

State: `active`
Last reviewed: 2026-06-03
Owner: root canon / strategy
Workstream: `root-canon`
Change class: Class A alignment and Class C projection guidance
Implementation state: discovery and feasibility profile; no machine-readable schema, live endpoint, or import/export route yet

## Purpose

This doc defines the actor-neutral stage and card taxonomy Boreal should use before adding schema, code, or import/export adapters.

It is for both human and agent usage.

The goal is to make every request-flow card explicit about:

- what comes in
- what may come out
- what is done here
- what is not done here
- which authority gates apply
- what the next safe stage is
- what can be imported from or exported to workflow systems such as n8n

## Current Conclusion

The taxonomy is feasible and needed, but it should start as a request-flow profile, not as live schema or routes.

Safe conclusion:

- one shared `RequestFlowStage` / `RequestFlowCard` model can cover humans, agents, systems, and hybrid handoffs
- cards can become type-safe render and action surfaces without becoming authority
- n8n import/export can map adapter-safe workflow shape through `WorkflowPackVersion`
- n8n cannot losslessly round-trip Boreal approval, proof, payment, event, or completion semantics without a Boreal sidecar and governed route checks

Not safe to claim yet:

- live neutral card schema exists
- n8n round-trip is production-ready
- agent cards and human cards already share one canonical machine-readable profile
- workflow execution can prove request completion by itself

## Research Basis

### Boreal repo basis

Current canon and implementation already establish:

- `Request` remains the durable root.
- `Plan` and `Path` are request-owned process language, not root objects.
- the request flow view is a projection over durable truth, not a lifecycle tracker.
- current agent action cards are examples and render hints, not permission.
- `WorkflowPack` and `WorkflowPackVersion` are support objects for workflow-backed supply.
- workflow-backed supply stays behind `Supply`, then resolves through `Request`, optional `Commitment`, `Fulfillment`, `Artifact`, and `Transaction`.

### External n8n basis

Official n8n docs show the adapter constraints Boreal must respect:

- workflows can be exported and imported as workflow JSON: <https://docs.n8n.io/workflows/export-import/>
- workflow data moves through item arrays with `json` and optional `binary` data: <https://docs.n8n.io/data/data-structure/>
- n8n nodes are trigger, action, core, cluster, and credentialed integration units: <https://docs.n8n.io/integrations/builtin/node-types/>
- n8n CLI supports workflow and credential import/export operations, so credentials must be treated separately from workflow shape: <https://docs.n8n.io/hosting/cli-commands/>

Implication:

n8n can exchange workflow shape. Boreal must preserve request authority, review, payment, proof, and durable event semantics outside raw n8n workflow JSON.

## Non-Goals

This profile does not:

- introduce a new canonical root object
- rename `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent`
- add lifecycle states
- make n8n a system of record
- make agent UX the only UX
- issue external-agent credentials
- create a live isolated write sandbox
- activate MCP, A2A, or x402 adapters
- claim live import/export parity with n8n

## Core Objects

### `RequestFlowStage`

A stable process lens over canonical truth.

It answers:

- what part of the request path is being handled
- which canonical reads are needed
- which canonical writes may happen after authorization
- what must be true before entry
- what must be true before exit
- what can happen next

It is not a lifecycle state.

### `RequestFlowCard`

A visible card or packet that a human, agent, system, or hybrid handoff can render.

It answers:

- what should the participant understand now
- what action is available or blocked
- what proof, approval, auth, idempotency, or payment gate applies
- what claim language is safe
- where to go next

Rendering the card does not mutate anything.

### `ParticipantAction`

An attemptable action attached to one stage and one or more cards.

Examples:

- `create_request_draft`
- `open_request`
- `propose_commitment`
- `accept_commitment`
- `authorize_funding`
- `create_fulfillment`
- `submit_artifact`
- `review_proof`
- `monitor_activity`
- `recover_blocker`
- `export_workflow_pack`

### `ActorCapability`

The actor-side capability lens.

Examples:

- `human_owner_review`
- `human_solver_submission`
- `agent_draft_preparation`
- `agent_solver_proposal`
- `system_policy_check`
- `runtime_execution`
- `workflow_adapter_mapping`

Capability is not permission.

### `AuthorityGate`

The gate that must pass before a card action can create durable effect.

Examples:

- actor ownership
- participant role
- account session
- resolver bearer scope
- request-specific policy
- human approval
- idempotency key
- payment authorization
- accepted commitment
- active fulfillment
- evidence validation
- sandbox environment

### `HandoffBoundary`

The moment where one participant must stop, ask, escalate, or transfer context.

Examples:

- agent prepares draft, human opens request
- solver submits proposal, owner accepts or rejects
- runtime generates output, human reviews proof
- monitor detects stale work, owner decides escalation
- payment profile prepares spend, account-session human authorizes

### `AdapterMapping`

The mapping from Boreal request-flow semantics into an external adapter.

Examples:

- `n8n` workflow nodes
- `WorkflowPackVersion.graph.blocks`
- future MCP tools
- future A2A tasks
- future x402 payment challenges

Adapter mappings are below Boreal canonical truth.

## Required Fields

Every future `RequestFlowStage` should declare:

- `id`
- `label`
- `phase`
- `canonicalProjection`
- `actorModes`
- `canonicalReads`
- `allowedCanonicalWrites`
- `forbiddenWrites`
- `entryCriteria`
- `exitCriteria`
- `doneHere`
- `notDoneHere`
- `requiredAuthority`
- `requiredEvidence`
- `nextStageIds`
- `failureModes`
- `recoveryStageId`
- `adapterMappingPolicy`
- `schemaVersion`

Every future `RequestFlowCard` should declare:

- `id`
- `stageId`
- `cardKind`
- `surface`
- `actorModes`
- `participantRoles`
- `in`
- `out`
- `primaryAction`
- `supportingActions`
- `requiredBeforeAction`
- `safeRenderClaims`
- `unsafeClaims`
- `doneHere`
- `notDoneHere`
- `authorityBoundary`
- `handoffBoundary`
- `next`
- `adapterExportPolicy`
- `schemaVersion`

Every future `AdapterMapping` should declare:

- `adapterKind`
- `direction`
- `source`
- `target`
- `stageId`
- `cardIds`
- `actionIds`
- `workflowBlockKinds`
- `credentialSlots`
- `humanCheckpoints`
- `proofRequirements`
- `unsupportedFeatures`
- `lossiness`
- `roundTripSafe`
- `sidecarRequired`

## Stage Catalog

These stage ids are the proposed starter catalog.

They are process stages, not canonical lifecycle states.

| Stage | In | Out | Done here | Not done here | Next |
| --- | --- | --- | --- | --- | --- |
| `request_intake` | raw ask, actor context, optional supply or source context | draftable request input or clarification prompt | captures demand and missing essentials | opening, assignment, funding, execution, proof, completion | `draft_review`, `path_planning`, `recovery` |
| `draft_review` | draft `Request`, readiness, missing details, human owner context | owner-approved open action or draft updates | makes the draft understandable and reviewable | public routing without approval, commitment, fulfillment, payment | `path_planning`, `commitment_review`, `recovery` |
| `path_planning` | `Request.derived`, supply candidates, workflow packs, constraints, proof plan | baseline path, supporting path cards, candidate route notes | explains viable ways forward | assignment, commitment acceptance, workflow run, completion | `commitment_review`, `fulfillment_handoff`, `recovery` |
| `commitment_review` | open `Request`, proposal, quote, participant role, policy | proposed, accepted, rejected, expired, or superseded `Commitment` | creates or resolves approval/commercial boundary | fulfillment start unless accepted or direct-owner exception applies | `funding_authorization`, `fulfillment_handoff`, `recovery` |
| `funding_authorization` | accepted commitment or funding need, payment profile, actor authority | authorized or verified `Transaction`, blocked payment state, or handoff | satisfies payment or funding gate | proof, delivery, completion, payout | `fulfillment_handoff`, `settlement_closeout`, `recovery` |
| `fulfillment_handoff` | accepted commitment or owner-private authorization, selected supply/runtime/workflow pack | planned or ready `Fulfillment`, optional seeded `FulfillmentStep` | creates accepted execution lane | delivery, review, completion | `execution_progress`, `proof_submission`, `recovery` |
| `execution_progress` | active `Fulfillment`, steps, runtime or workflow status, durable activity | step updates, blocked state, resumable progress, artifact candidates | advances work under one fulfillment | owner acceptance, payment settlement, final completion | `proof_submission`, `monitoring`, `recovery` |
| `proof_submission` | fulfillment output, evidence packet, artifact container, redaction posture | `Artifact` candidate or publication through governed route | packages delivery or proof | owner acceptance, completion, payment settlement | `owner_review`, `recovery` |
| `owner_review` | delivered artifact, proof checklist, fulfillment state, reviewer authority | accepted, returned, retry, or blocked review state | resolves whether proof is acceptable | payout if transaction is still pending, public solution projection if gates missing | `settlement_closeout`, `execution_progress`, `recovery` |
| `settlement_closeout` | accepted delivery, payment or credit truth, request state, events | settled or payout-visible transaction, completed request when allowed | closes commercial and request state when all truth exists | new custom work, unrelated workflow run, source request mutation for reuse | `reuse_export`, `monitoring`, `recovery` |
| `monitoring` | request id, durable activity cursor, visibility and auth posture | cursor checkpoint, stale-state summary, escalation packet | observes and reports durable activity | heartbeat history, mutation, approval, payment, completion | any active stage, `recovery` |
| `recovery` | problem details, blocked stage, prior idempotency key, activity cursor | retry plan, same-key replay, stop state, human escalation | prevents unsafe blind retry or false claim | fresh duplicate request, new fulfillment lane unless canon permits | previous safe stage |
| `reuse_export` | completed request, accepted artifact, workflow pack or reusable path context | new request seed, workflow pack export, n8n workflow plus Boreal sidecar | prepares reuse or adapter package | mutating source request, exporting credentials, proving new run completion | `request_intake`, `path_planning`, `fulfillment_handoff` |

## Card Kinds

| Card kind | Job | Typical actor modes | Authority boundary |
| --- | --- | --- | --- |
| `status_card` | show current state and blocker | human, agent, system | read-only |
| `decision_card` | ask a participant to choose | human, hybrid | decision is recorded only through governed route |
| `action_card` | describe an allowed or blocked attempt | human, agent, system | action still needs gate checks |
| `evidence_card` | package proof or review proof | human, agent, hybrid | artifact and review routes own truth |
| `handoff_card` | stop, ask, or transfer context | human, agent, system | handoff copy is not approval |
| `payment_card` | prepare spend or reconciliation | human, agent, system | payment authority stays in account-session/payment routes |
| `recovery_card` | guide retry, stop, or escalation | human, agent, system | retries must respect idempotency and current policy |
| `adapter_mapping_card` | show import/export mapping and lossiness | agent, system, hybrid | adapter mapping is not request truth |

## Example Card Contracts

### Draft approval card

In:

- draft `Request`
- readiness summary
- missing details
- owner actor context

Out if authorized:

- updated draft fields
- owner-approved open request action

Done here:

- human sees what will become the request
- agent can prepare a reviewable draft

Not done here:

- no public opening without owner approval
- no commitment
- no payment
- no fulfillment
- no proof

Next:

- `path_planning`
- `commitment_review`
- `recovery`

### Commitment proposal card

In:

- open `Request`
- solver or supply context
- proposed scope, price, timing, and proof terms
- request-specific policy

Out if authorized:

- proposed `Commitment`
- owner review handoff

Done here:

- proposal is prepared or submitted

Not done here:

- no assignment until accepted
- no fulfillment start
- no payment settlement
- no completion

Next:

- `commitment_review`
- `funding_authorization`
- `fulfillment_handoff`

### Proof submission card

In:

- accepted commitment or active fulfillment
- artifact packet
- proof checklist
- redaction posture
- idempotency key when publishing

Out if authorized:

- `Artifact`
- artifact-related `RequestEvent`
- delivered or waiting-for-owner state only when route logic allows

Done here:

- proof is packaged and submitted through a governed route

Not done here:

- no owner acceptance
- no payment settlement
- no completion proof by itself

Next:

- `owner_review`
- `recovery`

### Monitor escalation card

In:

- request id
- activity cursor
- stale or blocked condition
- viewer auth and visibility posture

Out:

- cursor checkpoint
- human escalation packet
- recovery recommendation

Done here:

- monitor state is explained
- next human or system decision is named

Not done here:

- no heartbeat `RequestEvent`
- no mutation
- no acceptance
- no payment
- no completion

Next:

- current active stage
- `recovery`

### n8n export card

In:

- `WorkflowPackVersion`
- adapter-safe graph blocks
- credential slots
- human checkpoints
- proof requirements
- Boreal sidecar metadata

Out:

- n8n workflow JSON for automatable blocks
- Boreal sidecar with stage, card, proof, and authority metadata
- lossiness report

Done here:

- export package is prepared for review

Not done here:

- no credential export
- no production run
- no request mutation
- no artifact proof
- no payment authorization
- no completion

Next:

- `reuse_export`
- `fulfillment_handoff`
- `recovery`

## Type-Safety Requirements

The future schema and TypeScript layer should enforce these rules:

- stage ids are a closed enum
- card ids are a closed enum or generated stable ids with a stage prefix
- every card references an existing stage
- every `nextStageId` references an existing stage
- every mutating action declares a route or target adapter plus auth, scope, policy, and idempotency requirements
- every card declares `doneHere` and `notDoneHere`
- every completion-related card declares required artifact, fulfillment, event, transaction, or owner-review truth
- every payment-related card declares `Transaction` reconciliation and no-completion-by-payment-success
- every adapter mapping declares lossiness, credential slots, unsupported features, and sidecar requirement
- every n8n export strips credentials and sensitive runtime data
- no field may introduce root objects named `Work`, `Job`, `Order`, `Issue`, `Offer`, `Intent`, `Task`, `Workflow`, or `Solution`
- `Task` may appear only as external A2A adapter language
- `Workflow` may appear only as adapter/support language
- `Solution` may appear only as public projection UI language

Suggested future files:

- `schemas/json/request-flow-stage-card-taxonomy.schema.json`
- `fixtures/request/request-flow-stage-card-taxonomy.sample.json`
- `apps/web/lib/request-flow-taxonomy.ts`
- `apps/web/tests/contracts/request-flow-taxonomy.test.ts`

## n8n Import Feasibility

Safe import path:

1. accept workflow JSON or a workflow reference
2. sanitize raw payloads, credentials, pinned data, static data, binary data, and sensitive fields
3. normalize n8n nodes and connections into `WorkflowPackVersion.graph.blocks`
4. extract credential slots
5. classify trigger and run posture
6. identify unsupported expressions or nodes
7. derive human checkpoints and proof requirements
8. create adapter mapping cards with lossiness and review requirements
9. require operator or owner review before publishing supply or starting fulfillment

Import can preserve:

- workflow structure
- app/system hints
- trigger class
- credential slot names
- block graph
- source provenance
- unsupported feature list

Import cannot preserve as Boreal truth:

- buyer approval
- accepted commitment
- fulfillment start
- artifact proof
- payment authorization
- request event history
- completion

## n8n Export Feasibility

Safe export path:

1. export only adapter-safe `WorkflowPackVersion` blocks as n8n workflow JSON
2. generate a Boreal sidecar for stage/card/action/proof/payment semantics
3. convert Boreal credential requirements into n8n credential placeholders, not secret values
4. mark human approvals, proof review, payment, and completion as checkpoints or external calls
5. include a lossiness report
6. require review before any production execution

Export can include:

- automatable workflow blocks
- webhook or manual trigger shape when safe
- integration node placeholders
- credential slot references
- delivery/proof placeholder nodes
- Boreal callback route references when a governed route exists

Export cannot include:

- live Boreal credentials
- production request history
- approval records
- payment authority
- accepted proof
- completion truth

## Round-Trip Rule

There are two round-trip levels.

### Workflow-shape round trip

This can be feasible:

```text
n8n workflow JSON -> WorkflowPackVersion graph -> n8n workflow JSON
```

It must include:

- unsupported feature report
- credential slot report
- proof and human checkpoint report
- sidecar metadata

### Boreal-semantic round trip

This is not lossless:

```text
Request flow semantics -> n8n workflow JSON -> Request flow semantics
```

Reason:

n8n workflow JSON does not own Boreal's canonical approval, proof, payment, request-event, or completion truth.

The safe standard is not perfect fidelity.
The safe standard is explicit lossiness and no silent authority transfer.

## Migration From Current Agent Surfaces

Current live agent surfaces should remain compatible.

Near-term approach:

- keep `agentActionCardHints` as the live request-detail render hint field
- define `RequestFlowCard` as the neutral underlying contract
- let future agent card hints derive from or map into `RequestFlowCard`
- let human workroom cards consume the same stage/card definitions where useful
- do not remove or rename live agent fields until schema, fixtures, and tests prove compatibility

## Implementation Sequence

### Slice 1: Canon and Strategy

Status: this doc and decision `0026`.

Done when:

- actor-neutral boundary is accepted
- n8n import/export feasibility is explicit
- future schema and tests are scoped

### Slice 2: Schema and Fixture

Add:

- JSON Schema
- deterministic fixture
- docs register updates
- contract test for schema validity

Acceptance:

- every stage/card declares in, out, done, not-done, authority, next, and adapter policy
- forbidden root names fail
- n8n mappings require sidecar and lossiness fields

### Slice 3: TypeScript Catalog

Add:

- `RequestFlowStageId`
- `RequestFlowCardKind`
- `ParticipantActionId`
- `RequestFlowStageDefinition`
- `RequestFlowCardDefinition`
- `AdapterMappingDefinition`
- canonical starter catalog

Acceptance:

- all ids are closed unions
- catalog exhaustiveness is tested
- no UI or agent code has to guess stage order

### Slice 4: Human and Agent Mapping

Map:

- `apps/web/lib/request-flow.ts`
- `agentActionCardHints`
- action cards examples
- human handoff packet examples
- UX profile stages

Acceptance:

- human and agent surfaces share the neutral profile where appropriate
- old public agent fields remain stable
- card rendering does not grant authority

### Slice 5: n8n Sidecar

Add:

- sidecar shape
- import mapping test
- export mapping test
- credential stripping test
- unsupported feature and lossiness report

Acceptance:

- workflow-shape round-trip is tested for supported blocks
- Boreal-semantic lossiness is explicit
- credentials and production authority never round-trip through raw workflow JSON

### Slice 6: Live Adapter Routes

Only after earlier slices:

- add import/export routes if needed
- update OpenAPI
- update API contracts
- update tests
- keep live production run activation behind fulfillment, auth, and sandbox gates

## Open Questions

- Should the neutral public field eventually be named `requestFlowCardHints`, or should it stay internal while `agentActionCardHints` remains public?
- Should the first schema live only in `schemas/json/`, or should a later shared package export generated TypeScript types?
- Should n8n sidecars be embedded in workflow metadata, stored as a separate JSON file, or attached as a Boreal artifact?
- Which stage ids should be frozen first for public client generation?
- Which workflow blocks are safe enough for first export without a live isolated write sandbox?

## Guardrail

If future implementation needs to make a card or stage do more than render, prepare, validate, or call a governed route, stop and update canon first.

The taxonomy exists to make Boreal harder to break.
It should never become a second source of request truth.

# Request Flow Taxonomy Pipeline

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This standard defines the pipeline every request-flow card, stage, service plan, workflow import, adapter mapping, stepper, and drag action must follow before it can become product behavior.

It exists to keep human and agent surfaces aligned with the same actor-neutral taxonomy.

## Canon Boundary

This standard inherits:

- [../docs/decisions/0026-actor-neutral-request-flow-stage-card-taxonomy.md](../docs/decisions/0026-actor-neutral-request-flow-stage-card-taxonomy.md)
- [../docs/strategy/REQUEST_FLOW_STAGE_CARD_TAXONOMY.md](../docs/strategy/REQUEST_FLOW_STAGE_CARD_TAXONOMY.md)

It does not introduce a new root object.

It does not replace:

- `Request`
- `Supply`
- `RequestParticipant`
- `Commitment`
- `Fulfillment`
- `FulfillmentStep`
- `Artifact`
- `Transaction`
- `RequestEvent`

## Applies To

Use this standard before changing:

- request flow cards
- request flow graph nodes
- stepper or path-builder cards
- task-board or execution-board projections
- service family or service plan cards
- supply-selection cards
- workflow pack import or export UX
- n8n adapter import/export behavior
- agent action cards
- desktop resolver cards
- drag-to-create, drag-to-route, drag-to-assign, or drag-to-submit behavior

## Required Source Order

Before implementing a new taxonomy-sensitive surface, read:

1. root canon required by `AGENTS.md`
2. [../docs/decisions/0026-actor-neutral-request-flow-stage-card-taxonomy.md](../docs/decisions/0026-actor-neutral-request-flow-stage-card-taxonomy.md)
3. [../docs/strategy/REQUEST_FLOW_STAGE_CARD_TAXONOMY.md](../docs/strategy/REQUEST_FLOW_STAGE_CARD_TAXONOMY.md)
4. [../docs/strategy/REQUEST_FLOW_TAXONOMY_ALIGNMENT_AUDIT.md](../docs/strategy/REQUEST_FLOW_TAXONOMY_ALIGNMENT_AUDIT.md)
5. this file

## Pipeline

### 1. Classify the surface

Every new or changed card must declare one surface class:

- `request_flow`
- `path_builder`
- `stepper`
- `execution_board`
- `service_page`
- `supply_selection`
- `workflow_import`
- `workflow_export`
- `agent_action`
- `desktop_resolver`
- `adapter_mapping`

The surface class is not canon.
It only describes where the card appears.

### 2. Select one taxonomy stage

Every card or node must map to one `RequestFlowStage`.

Allowed stage ids are defined in the strategy taxonomy and mirrored in `schemas/json/request-flow-stage-card-taxonomy.schema.json` plus `apps/web/lib/request-flow-taxonomy.ts`:

- `request_intake`
- `draft_review`
- `path_planning`
- `commitment_review`
- `funding_authorization`
- `fulfillment_handoff`
- `execution_progress`
- `proof_submission`
- `owner_review`
- `settlement_closeout`
- `monitoring`
- `recovery`
- `reuse_export`

Do not invent local stage strings.
If a needed stage is missing, update the taxonomy before adding behavior.

### 3. Select one card kind

Every card must map to one `RequestFlowCard` kind:

- `status_card`
- `decision_card`
- `action_card`
- `evidence_card`
- `handoff_card`
- `payment_card`
- `recovery_card`
- `adapter_mapping_card`

Cards may render differently across surfaces, but their kind must stay stable.

### 4. Declare actor modes and roles

Every card must declare actor modes:

- `human`
- `agent`
- `system`
- `hybrid`

Actor mode is not authority.
Adapters are mapped through `adapter_mapping_card` and adapter mapping policy, not as an actor mode.

Every mutating action must separately declare:

- account or resolver auth boundary
- participant role requirement
- request-specific policy requirement
- idempotency requirement
- payment or proof gate when applicable

### 5. Declare in, out, done-here, and not-done-here

Every card must declare:

- `in`
- `out`
- `doneHere`
- `notDoneHere`

These declarations must be specific enough for both a human and an agent to know what the card can and cannot do.

### 6. Declare canonical reads and writes

Every card must declare:

- canonical objects it reads
- canonical objects it may write only after authorization
- canonical objects it must not write

Allowed write language must use canonical object names.

Example:

```json
{
  "canonicalReads": ["Request", "Supply"],
  "allowedCanonicalWrites": ["Request"],
  "forbiddenWrites": ["Commitment", "Fulfillment", "Artifact", "Transaction"]
}
```

### 7. Declare action intents

Every interactive card must expose `ParticipantAction` intent metadata before the UI can show a drag action, command button, or agent action.

Minimum fields:

- `id`
- `label`
- `sourceStageId`
- `targetStageId`
- `sourceCardKind`
- `actorModes`
- `requiredAuthority`
- `requiredEvidence`
- `canonicalWrites`
- `routeOrAdapter`
- `idempotency`
- `blockedWhen`
- `unsafeIf`

Rendering an action intent does not authorize it.
Routes still own final policy.

### 8. Bind to route, adapter, or read-only result

Every action intent must resolve to exactly one of:

- governed HTTP route
- governed server action
- adapter mapping
- read-only navigation or selection
- blocked handoff

If no route or adapter exists, the action must render as preview, not mutation.

### 9. Map support objects below canon

Support objects are allowed only when they stay below canonical roots.

Allowed examples:

- service family page -> one or more `Supply` rows
- preset service plan -> one unlisted `Supply`
- workflow pack -> `WorkflowPackVersion` support object
- n8n import -> `WorkflowPackVersion` source and block graph
- generated sub-work -> `FulfillmentStep`
- buyer credit support object -> request-linked `Transaction` truth

Forbidden promotions:

- `Service` as root object
- `Workflow` as root object
- `Task` as root object
- `Solution` as root object
- `Plan` as root object

### 10. Add tests or test plan before behavior

Every new stage, card, action, or adapter mapping needs coverage in at least one layer:

- JSON Schema validation
- deterministic fixture
- TypeScript unit test
- route-level mutation test
- adapter import/export test
- UI projection test
- docs/test-matrix entry when implementation is not live yet

## Binding Shape

Future implementation should converge on a binding shape like this:

```ts
type RequestFlowTaxonomyBinding = {
  stageId: RequestFlowStageId;
  cardKind: RequestFlowCardKind;
  surface: RequestFlowSurface;
  actorModes: RequestFlowActorMode[];
  participantRoles: string[];
  canonicalReads: string[];
  allowedCanonicalWrites: string[];
  forbiddenWrites: string[];
  doneHere: string[];
  notDoneHere: string[];
  authorityBoundary: string[];
  handoffBoundary: string[];
  nextActionIntents: RequestFlowActionIntent[];
  adapterMappingPolicy?: RequestFlowAdapterMappingPolicy;
  schemaVersion: string;
};
```

This is now schema-backed for the initial request-flow profile; live drag mutations must still wait for route-level policy binding.

## Drag Action Standard

Dragging from a card means "show safe next action intents for this source card."

It must not mean "mutate based only on visual node kind."

### Required drag behavior

When a user drags from a source card:

1. read source card taxonomy binding
2. list allowed `nextActionIntents`
3. filter by current actor mode, route auth, request state, payment gates, proof gates, and idempotency posture
4. show unavailable actions with blocker reason when useful
5. route mutation only through the declared route or adapter
6. record no durable truth from the canvas itself

### Starter drag intents

| Source stage | Source card kind | Intent | Target stage | Canonical write boundary |
| --- | --- | --- | --- | --- |
| `request_intake` or `draft_review` | `status_card` or `decision_card` | `create_or_open_path_plan` | `path_planning` | draft or derived request planning only |
| `path_planning` | `action_card` | `choose_worker_route` | `commitment_review` or `fulfillment_handoff` | routing or proposal route only |
| `path_planning` | `action_card` | `pin_supply_route` | `path_planning` | `Request.routing.preferredSupplyId` only through policy |
| `commitment_review` | `decision_card` | `accept_or_reject_commitment` | `funding_authorization` or `fulfillment_handoff` | `Commitment` only |
| `funding_authorization` | `payment_card` | `authorize_funding` | `fulfillment_handoff` | `Transaction` only |
| `fulfillment_handoff` | `action_card` | `create_or_select_fulfillment` | `execution_progress` | `Fulfillment` only when gates pass |
| `execution_progress` | `action_card` | `update_fulfillment_step` | `execution_progress` | `FulfillmentStep` only |
| `proof_submission` | `evidence_card` | `submit_artifact` | `owner_review` | `Artifact` and related event route only |
| `owner_review` | `decision_card` | `accept_or_return_delivery` | `settlement_closeout` or `execution_progress` | review route only |
| any blocked stage | `recovery_card` | `recover_blocker` | `recovery` | retry or escalation route only |
| `reuse_export` | `adapter_mapping_card` | `export_workflow_shape` | `reuse_export` | adapter package only |

## Service And Supply Standard

Service pages may use buyer-friendly language.

Implementation must still follow this mapping:

- service family page -> surface grouping
- preset plan -> one unlisted `Supply`
- selected plan -> `routing.preferredSupplyId`
- checkout -> one `Request`, optional `Commitment`, request-level `Transaction`
- execution -> one `Fulfillment` with zero or more `FulfillmentStep` rows
- output -> `Artifact`

Each service card must declare whether it is:

- intake only
- draft review
- path planning
- commitment review
- funding authorization
- fulfillment handoff
- proof or delivery

Plan copy must not be written into buyer-authored `brief` fields unless the buyer authored or confirmed it.

## Workflow And n8n Standard

n8n import/export must use:

- `WorkflowPackVersion` for adapter-safe workflow shape
- `RequestFlowStage` and `RequestFlowCard` sidecar for Boreal-only semantics
- credential slots, not secret values
- explicit unsupported features
- explicit human checkpoints
- explicit proof requirements
- explicit lossiness

Adapter success must never imply:

- accepted proof
- owner review
- payment authority
- request completion
- payout readiness

## Naming Guardrail

Do not use these as canonical roots:

- `Work`
- `Job`
- `Order`
- `Issue`
- `Offer`
- `Intent`
- `Task`
- `Workflow`
- `Solution`

Allowed bounded use:

- `Task` as external A2A adapter language or temporary UI label
- `Workflow` as adapter/support language
- `Solution` as public projection UI language
- `Service` as family-page language over `Supply`
- `Plan` as request-owned process language

## Merge Gate Checklist

Before merging any taxonomy-sensitive behavior, verify:

- the stage id exists in the taxonomy
- the card kind exists in the taxonomy
- actor mode and authority are separate
- in/out/done/not-done are declared
- route or adapter ownership is declared
- forbidden writes are explicit
- drag actions are action intents, not local node-kind inference
- support objects stay below canonical roots
- tests or test-matrix coverage exists
- docs, schemas, fixtures, and TypeScript stay in sync when behavior changes

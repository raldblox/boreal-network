# Request Flow Taxonomy Alignment Audit

State: `active`
Last reviewed: 2026-06-03
Owner: root canon / product implementation
Workstream: `root-canon`, `apps-web`
Change class: Class A alignment audit and Class C product-surface guidance

## Purpose

This audit checks whether current request-flow, service, supply, workflow, stepper, card, and drag-action surfaces are aligned with the accepted actor-neutral request-flow taxonomy.

It is downstream of:

- [../decisions/0026-actor-neutral-request-flow-stage-card-taxonomy.md](../decisions/0026-actor-neutral-request-flow-stage-card-taxonomy.md)
- [REQUEST_FLOW_STAGE_CARD_TAXONOMY.md](REQUEST_FLOW_STAGE_CARD_TAXONOMY.md)
- [../../standards/request-flow-taxonomy-pipeline.md](../../standards/request-flow-taxonomy-pipeline.md)

## Scope

Reviewed surfaces:

- request flow graph and canvas
- request path builder and stepper-like projections
- request workroom task board projection
- matching lab workflow graph
- first-party service catalog and direct service links
- workflow-backed supply support code
- n8n import and workflow-pack support standards
- desktop supply auto-resolve lane
- schema and test planning references

This is not a complete security review or route-by-route implementation review.
It is a taxonomy and product-model alignment audit.

## Audit Verdict

The current repo is directionally aligned with the root model.

No reviewed surface replaces `Request`, `Supply`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, or `RequestEvent` as canonical roots.

The main gaps are:

- projections use local names such as `phase`, `stage`, `step`, `task`, and `workflow` without a shared taxonomy binding
- cards do not yet declare `stageId`, `cardKind`, actor modes, authority, in/out, done-here, not-done-here, or next actions
- drag actions are UI selection hints, not first-class `ParticipantAction` intents
- n8n import/export support does not yet emit a Boreal request-flow sidecar
- some older standards still present the n8n repair SKU as the first shipped supply, while current strategy and code point at Runway-backed first-party service lanes

## Current Alignment By Surface

### Request Flow Graph

Current implementation:

- `apps/web/lib/request-flow.ts`
- `apps/web/components/chat/request-flow-canvas.tsx`

Current model:

- node kinds: `request`, `phase`, `worker`, `delivery`, `stage`, `step`
- node states: `done`, `current`, `pending`, `blocked`, `failed`, `cancelled`
- cards render through `RequestProcessCard`
- connector drag opens a "next step" chooser over existing graph nodes

Aligned:

- `Request` remains the root node.
- plan and worker views are projections, not durable roots.
- delivery/proof remains downstream of the request.

Gap:

- nodes lack a neutral taxonomy binding.
- connector drag does not know whether the source is a request card, plan card, worker card, proof card, payment card, or recovery card.
- connector drag cannot distinguish "make a plan", "choose or assign a worker route", "propose commitment", "start fulfillment", "submit proof", or "recover blocker" as typed action intents.

Required next step:

- add a shared `RequestFlowTaxonomyBinding` to graph descriptors before adding new drag mutations.

### Request Path Builder And Stepper Projections

Current implementation:

- `apps/web/lib/request-path-builder.ts`

Current model:

- baseline path
- supporting paths for human, agent, service or supply, and workflow lanes
- string statuses such as `proposal`, `execution-ready`, `request-open`, `candidate`, `pinned`, `preview`, and `future`

Aligned:

- path is request-owned process language.
- supporting paths do not become root objects.
- service and workflow lanes are candidates or projections below `Request` and `Supply`.

Gap:

- statuses are not yet closed against the shared taxonomy.
- path cards do not declare whether they are `status_card`, `decision_card`, `action_card`, or `handoff_card`.

Required next step:

- map path builder cards to `path_planning`, `commitment_review`, and `fulfillment_handoff` stages.
- close local status values or map them through a typed view-model enum.

### Request Workroom Task Board

Current implementation:

- `apps/web/components/chat/request-tracker.tsx`

Current model:

- `TaskBoardPanel`
- `RequestTaskBoardProjection`
- `TaskBoardCard`
- cards sourced from `fulfillment_step` or plan phases

Aligned:

- the UI copy already says the board is not a separate request or fake task tree.
- live cards can source from `FulfillmentStep`.

Gap:

- `Task` is a forbidden canonical root name.
- the task-board naming is safe only as UI language while bounded, but it is risky as type language for future contracts.

Required next step:

- rename or alias the implementation model toward `StepBoard`, `FulfillmentStepBoard`, or `RequestExecutionBoard`.
- keep any visible "task" wording explicitly non-canonical if retained for buyer readability.

### Matching Lab Workflow Graph

Current implementation:

- `apps/web/app/matching-lab/matching-lab-client.tsx`

Current model:

- `WorkflowNodeKind = "input" | "task" | "match"`
- reveal state tracks `visibleTaskCount`

Aligned:

- this is a lab surface, not a canonical contract.
- matching output remains tied to request phases and supply candidates.

Gap:

- `task` and `workflow` type language cannot graduate into product contracts.
- the lab graph does not yet map to `request_intake`, `path_planning`, `commitment_review`, or `fulfillment_handoff`.

Required next step:

- keep lab-only names isolated.
- if the matching lab graduates, remap `task` nodes to request-flow stage cards and `FulfillmentStep` language.

### First-Party Services And Supply

Current implementation:

- `apps/web/lib/service-catalog.ts`
- `apps/web/lib/workflow-supply-server.ts`
- `apps/web/lib/workflow-runway.ts`
- `apps/web/app/(chat)/api/services/character-call-starter/*`
- strategy docs for first-party service SKUs and unlisted service links

Current model:

- service family pages are surface groupings
- one preset plan should map to one unlisted `Supply`
- request start pins `routing.preferredSupplyId`
- checkout creates request-level funding and fulfillment truth for the current Character Call Starter lane

Aligned:

- service is not a canonical root object.
- the buyer still ends in one durable `Request`.
- selected service context is represented through `Supply` and request routing.
- workflow-backed provider lanes stay below `Supply` and `Fulfillment`.

Gap:

- service cards do not yet declare request-flow stage/card metadata.
- service-request starter copy must stay buyer-confirmed and must not become fake buyer-authored brief text.
- exact plan links still need stable unlisted supply ids before full live target behavior.

Required next step:

- each service family and preset plan should declare the request-flow stages it can enter: `request_intake`, `draft_review`, `path_planning`, `commitment_review`, `funding_authorization`, and `fulfillment_handoff`.

### Workflow Packs And n8n Adapter

Current implementation:

- `apps/web/lib/workflow-pack.ts`
- `apps/web/lib/workflow-n8n.ts`
- `standards/workflow-backed-supply-profile.md`
- `standards/workflow-pack-support-objects.md`
- `standards/n8n-adapter-profile.md`

Current model:

- `WorkflowPack`, `WorkflowPackVersion`, and `WorkflowAdapterRun` are support objects.
- n8n import sanitizes workflow JSON and credentials-adjacent data.
- workflow-backed supply binds a pack version to one `Supply`.

Aligned:

- raw workflow JSON does not replace `Request`.
- workflow success does not prove buyer completion.
- credentials are treated as slots and support data, not buyer-facing truth.

Gap:

- no request-flow sidecar exists for n8n import/export.
- adapter blocks are not yet mapped to `RequestFlowStage`, `RequestFlowCard`, and `ParticipantAction`.
- lossiness is planned but not machine-enforced.

Required next step:

- every n8n import/export must emit or validate a Boreal sidecar with stage ids, card ids, action ids, credential slots, human checkpoints, proof requirements, unsupported features, lossiness, and round-trip safety.

### Desktop Supply Auto-Resolve Lane

Current implementation:

- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/main/main.js`
- `apps/desktop/src/main/boreal-web-client.js`

Current model:

- resolver can choose owned supply
- request-level `routing.preferredSupplyId` can guide auto-resolve
- auto-resolve creates fulfillment and artifact summaries through web-client routes

Aligned:

- selected supply remains route context.
- resolver activity lands under `Fulfillment` and `Artifact` truth.

Gap:

- desktop UI does not yet share request-flow stage/card/action definitions with web.
- auto-resolve decisions should eventually render as `fulfillment_handoff`, `execution_progress`, `proof_submission`, and `recovery` cards.

Required next step:

- share generated taxonomy definitions before adding richer desktop cards or resolver mutations.

## Drag Action Matrix

Connector dragging should become typed action selection, not only graph navigation.

| Source card context | Intended user meaning | Typed action intent | Target stage | Must not do silently |
| --- | --- | --- | --- | --- |
| Request card | make or open a plan | `create_or_open_path_plan` | `path_planning` | open request, assign worker, charge, start fulfillment |
| Draft review card | approve or revise request | `review_request_draft` | `draft_review` | public routing without owner approval |
| Plan/path card | choose or assign worker route | `choose_worker_route` | `commitment_review` or `fulfillment_handoff` | bypass commitment, funding, or direct-owner checks |
| Supply/service card | pin selected supply | `pin_supply_route` | `path_planning` or `commitment_review` | rewrite buyer brief text |
| Commitment card | approve commercial boundary | `accept_or_reject_commitment` | `funding_authorization` or `fulfillment_handoff` | start fulfillment before accepted boundary |
| Funding card | authorize payment or credits | `authorize_funding` | `fulfillment_handoff` | treat payment success as completion |
| Worker card | start or continue fulfillment | `start_or_continue_fulfillment` | `execution_progress` | create duplicate fulfillment lanes |
| Step/progress card | update sub-work | `update_fulfillment_step` | `execution_progress` | create a new root request for generated sub-work |
| Proof/delivery card | submit or review proof | `submit_or_review_proof` | `proof_submission` or `owner_review` | accept proof, settle, or complete without owner/review gates |
| Blocked card | recover safely | `recover_blocker` | `recovery` | retry with a new idempotency key without policy |
| Adapter mapping card | import or export workflow shape | `map_adapter_workflow` | `reuse_export` | export credentials, approvals, payment authority, or completion truth |

## Out-Of-Context Terms To Contain

These names are allowed only inside bounded surfaces:

| Term | Allowed boundary | Required mapping before graduation |
| --- | --- | --- |
| `Task` | buyer UI label or external A2A adapter language | `FulfillmentStep` or request-flow card |
| `Workflow` | adapter/support-object language | `WorkflowPackVersion` plus request-flow sidecar |
| `Service` | family page or buyer-facing packaging | one or more `Supply` rows |
| `Plan` | request-owned process lens | `path_planning` stage and card definitions |
| `Solution` | public projection UI language | accepted artifact plus source request reference |

## Priority Fixes

### P0: Add shared taxonomy pipeline before app mutations

Do not add drag-to-mutate behavior until the source card can declare:

- stage id
- card kind
- actor modes
- authority gate
- allowed and forbidden writes
- next action intents
- target route or adapter
- idempotency requirements

### P1: Add schema, fixture, and TypeScript definitions

Next implementation files should be:

- `schemas/json/request-flow-stage-card-taxonomy.schema.json`
- `fixtures/request/request-flow-stage-card-taxonomy.sample.json`
- `apps/web/lib/request-flow-taxonomy.ts`
- `apps/web/tests/contracts/request-flow-taxonomy.test.ts`

### P1: Bind current graph descriptors to taxonomy

`RequestFlowNodeDescriptor` should gain a taxonomy binding before new flow actions are added.

Minimum binding:

- `stageId`
- `cardKind`
- `actorModes`
- `authorityBoundary`
- `doneHere`
- `notDoneHere`
- `nextActionIntents`

### P1: Replace local drag-title inference

`getWorkflowActionTitle(sourceKind)` should not be the source of truth.

It should read available `nextActionIntents` from the node descriptor and filter them by current actor authority, route policy, and request state.

### P2: Contain `Task` naming

`TaskBoard` and matching-lab `task` nodes should either be renamed or explicitly wrapped as UI-only aliases for `FulfillmentStep` or request-flow cards.

### P2: Add n8n sidecar mapping

n8n import/export should not become live until it can produce:

- adapter-safe workflow JSON
- Boreal request-flow sidecar
- credential-slot report
- unsupported-feature report
- human-checkpoint report
- proof-requirement report
- lossiness report

### P2: Correct stale first-supply standard wording

The old `Fix My Broken n8n Workflow` blueprint can remain as a reference workflow-backed supply blueprint.

The current first implementation lane should follow the active first-party service strategy and code:

- `Character Call Starter`
- `Founder Avatar Clip Pack`

## Stop Conditions

Pause implementation and return to canon if a future patch:

- promotes `Task`, `Workflow`, `Service`, or `Solution` into a root object
- lets drag actions mutate without a declared authority gate
- lets workflow success prove request completion
- lets service plan copy become unconfirmed buyer-authored brief text
- lets n8n export include credentials, payment authority, approvals, proof acceptance, or request event history
- creates new request roots for generated sub-work that should be `FulfillmentStep`


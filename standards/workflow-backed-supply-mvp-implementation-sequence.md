# Workflow-backed Supply MVP Implementation Sequence

## Status

Draft implementation sequence

## Purpose

This file defines the minimum ordered sequence to implement workflow-backed supply after the alignment and standards pass.

It is written so implementation can start without re-deciding the model.

## Phase 0: Support Layer

Goal:

- make workflow packs representable before UI and service surfaces grow

Implement:

- support storage for `WorkflowPack`
- support storage for `WorkflowPackVersion`
- support storage for `WorkflowAdapterRun`
- typed metadata helpers for `Supply.metadata.workflow.*`
- typed metadata helpers for `Request.metadata.workflow.*`

Validation:

- one pack can exist without a published supply
- one pack version can express readiness and unsupported features
- one supply can point to a workflow-backed profile without losing canonical shape

## Phase 1: Import And Normalize

Goal:

- turn raw `n8n` inputs into Boreal-readable support objects

Implement:

- `n8n` import parser
- node-to-block normalization
- credential slot extraction
- unsupported feature detection
- provenance recording

Validation:

- import preserves raw source reference
- import never stores secret values from credentials
- import produces a deterministic normalized block graph
- import blocks readiness when unsupported critical features exist

## Phase 2: Pack Review And Publish Readiness

Goal:

- make imported or authored packs inspectable before they become supply-backed

Implement:

- operator review surface for pack version
- readiness summary
- human checkpoint editor
- proof requirement editor

Validation:

- operator can see credential slots, unsupported features, and proof requirements
- pack cannot reach `ready_to_run` while required fields are missing

## Phase 3: Supply Binding

Goal:

- bind a ready pack version to one first-party buyable `Supply`

Implement:

- support link or metadata binding from supply to pack version
- supply creation preset for workflow-backed supply
- plan metadata for service-family and adapter profile

Validation:

- one buyable plan maps to one supply
- one supply can resolve its active pack version
- supply remains canonical buyer-facing object

## Phase 4: Request Start

Goal:

- let buyer start one request from a workflow-backed supply

Implement:

- start-from-supply flow for workflow-backed plans
- `routing.preferredSupplyId` seeding
- workflow metadata seeding on request
- fixed-price commitment drafting where appropriate

Validation:

- selected workflow pack does not rewrite buyer brief text
- fixed-price workflow-backed plan can open one private draft request
- request truth remains canonical

## Phase 5: Funding And Credit Wiring

Goal:

- make direct payment and first-party credit compatible with workflow-backed supplies

Implement:

- request transaction creation for direct funding
- buyer-credit support objects when credit lane is enabled
- credit spend to request transaction linkage
- funding-source metadata for PayPal, card, `USDC`, or `USDT` as supported

Validation:

- one funded workflow-backed request always gets request-level transaction truth
- one top-up alone does not create fake request funding truth
- one credit spend creates a request-linked transaction
- duplicate verification cannot double-settle

## Phase 6: Fulfillment And Adapter Runs

Goal:

- attach execution support to accepted fulfillment

Implement:

- `WorkflowAdapterRun` creation
- start, retry, and block states
- adapter summary promotion into fulfillment metadata

Validation:

- adapter failure can block fulfillment without losing request continuity
- multiple runs can exist over one fulfillment for retry history
- run success alone does not auto-complete the request

## Phase 7: Proof And Delivery

Goal:

- standardize proof output and closeout

Implement:

- artifact publication helpers for workflow-backed supplies
- delivery summary generation
- handoff bundle publishing

Validation:

- required artifact kinds are present before closeout
- missing proof blocks delivery acceptance
- buyer sees one readable delivery package instead of raw adapter logs

## Phase 8: First Supply

Goal:

- ship one real workflow-backed supply

Implement first:

- `Fix My Broken n8n Workflow`

Validation:

- one real request can start from the published plan
- one real pack version can back that supply
- one real fulfillment can produce proof and handoff artifacts

## Recommended File Lanes

Root and standards:

- `standards/*`
- minimal root canon sync when needed

Implementation:

- `apps/web/lib/*`
- `apps/web/app/api/*`
- `apps/web/components/*`
- `apps/web/lib/db/*`

## Validation Checklist

- request remains root
- supply remains buyable object
- workflow pack remains support layer
- buyer credit remains support layer
- imported JSON is source material, not buyer contract
- proof requirements are explicit
- readiness gates block unsafe execution
- adapter success does not imply business completion

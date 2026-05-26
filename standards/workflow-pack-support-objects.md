# Workflow Pack Support Objects

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This file defines the support-object layer for workflow-backed supply.

It should give implementation enough structure to:

- import a reusable workflow definition
- normalize it into Boreal's block graph
- publish one or more buyable `Supply` rows on top of it
- run or adapt it through canonical request and fulfillment lanes

## Canon Boundary

These are support implementation objects.

They do not replace:

- `Request`
- `Supply`
- `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`

## Object Set

Required support objects:

- `WorkflowPack`
- `WorkflowPackVersion`

Recommended execution support object:

- `WorkflowAdapterRun`

Recommended link object when explicit binding is preferred over metadata-only pointers:

- `WorkflowPackSupplyBinding`

## Responsibility Split

### `WorkflowPack`

Stable reusable identity for one workflow-backed service family or execution pack.

Use it for:

- family-level title and summary
- provenance
- owner
- lifecycle and active version

Do not use it for:

- buyer request truth
- one-off request execution history
- pricing or publish state that belongs on `Supply`

### `WorkflowPackVersion`

One versioned executable pack.

Use it for:

- normalized block graph
- adapter profile
- credential requirements
- proof requirements
- input and output contracts
- readiness state
- source references

### `WorkflowAdapterRun`

One adapter execution attempt or resumed run.

Use it for:

- adapter-level run state
- retry state
- diagnostic summaries
- runtime references such as remote execution ids

Do not confuse it with `Fulfillment`.

`Fulfillment` remains the accepted work lane.
`WorkflowAdapterRun` is execution support under that lane.

### `WorkflowPackSupplyBinding`

Optional explicit support link between a published `Supply` row and a pack version.

Use it when:

- you need queryable joins
- one pack version backs several supplies
- metadata-only lookup is getting brittle

## Suggested Shapes

### `WorkflowPack`

```json
{
  "id": "wfp_01",
  "key": "fix-broken-n8n-workflow",
  "ownerActorId": "act_boreal_first_party",
  "title": "Fix My Broken n8n Workflow",
  "summary": "Reusable rescue pack for diagnosing, repairing, testing, and handing off one broken automation workflow.",
  "status": "active",
  "currentVersionId": "wfpv_01",
  "provenance": {
    "kind": "first_party",
    "sourcePlatform": "n8n",
    "sourceUrl": null,
    "licenseNotes": "First-party pack assembled by Boreal from reusable internal blocks and approved import mappings."
  },
  "metadata": {
    "profile": "workflow_backed_v1",
    "serviceFamilyKey": "fix-broken-n8n-workflow"
  }
}
```

Suggested statuses:

- `draft`
- `active`
- `retired`

### `WorkflowPackVersion`

```json
{
  "id": "wfpv_01",
  "key": "fix-broken-n8n-workflow-v1",
  "workflowPackId": "wfp_01",
  "version": 1,
  "adapterKind": "n8n",
  "graph": {
    "blocks": [],
    "connections": []
  },
  "inputContract": {
    "required": [
      "workflowJsonOrAccessMode",
      "problemSummary",
      "targetSystems"
    ]
  },
  "outputContract": {
    "artifacts": [
      "workflow_map",
      "workflow_build",
      "issue_log",
      "handoff_doc",
      "delivery"
    ]
  },
  "credentialRequirements": [],
  "humanCheckpoints": [],
  "proofRequirements": [],
  "sourceRefs": [],
  "readiness": {
    "state": "ready_to_run",
    "summary": "Pack can run once buyer environment credentials and workflow source are provided."
  },
  "unsupportedFeatures": [],
  "metadata": {
    "profile": "workflow_backed_v1"
  }
}
```

Suggested readiness states:

- `draft`
- `needs_credentials`
- `needs_review`
- `ready_to_run`
- `blocked`
- `retired`

### `WorkflowAdapterRun`

```json
{
  "id": "wfar_01",
  "workflowPackVersionId": "wfpv_01",
  "requestId": "req_01",
  "fulfillmentId": "ful_01",
  "status": "running",
  "adapterKind": "n8n",
  "remoteRunRef": "n8n-execution-123",
  "attempt": 1,
  "startedAt": "2026-05-26T12:00:00Z",
  "endedAt": null,
  "lastHeartbeatAt": "2026-05-26T12:02:00Z",
  "summary": "Executing repair test run against buyer workflow draft.",
  "errorSummary": null,
  "metadata": {
    "credentialSetRef": "credset_01",
    "environmentKey": "buyer_workspace_primary"
  }
}
```

Suggested statuses:

- `pending`
- `running`
- `blocked`
- `succeeded`
- `failed`
- `cancelled`

### `WorkflowPackSupplyBinding`

```json
{
  "id": "wfsb_01",
  "supplyId": "sup_01",
  "workflowPackId": "wfp_01",
  "workflowPackVersionId": "wfpv_01",
  "status": "active",
  "createdAt": "2026-05-26T12:00:00Z",
  "updatedAt": "2026-05-26T12:00:00Z"
}
```

Suggested statuses:

- `active`
- `paused`
- `retired`

## Minimal Database Direction

Recommended tables:

- `workflow_packs`
- `workflow_pack_versions`
- `workflow_adapter_runs`
- optional `workflow_pack_supply_bindings`

Recommended read pattern:

- durable `Supply` read
- resolve workflow binding
- resolve current pack version
- resolve readiness, credentials needed, and proof requirements

## Metadata And Join Rule

Start with both:

- explicit support tables for queryable joins
- typed metadata mirrors on `Supply` and `Request` for easier projections

Suggested `Supply.metadata.workflow.*` keys:

- `profile`
- `packId`
- `packVersionId`
- `adapterKind`

Suggested `Request.metadata.workflow.*` keys:

- `packId`
- `packVersionId`
- `adapterKind`
- `selectionMode`

## Input Contract Shape

Recommended top-level groups:

- `buyerInputs`
- `environmentInputs`
- `credentialSlots`
- `operatorInputs`

Example:

```json
{
  "buyerInputs": [
    { "key": "problemSummary", "kind": "text", "required": true },
    { "key": "targetSystems", "kind": "string_array", "required": true }
  ],
  "environmentInputs": [
    { "key": "n8nWorkflowJson", "kind": "json", "required": false },
    { "key": "n8nWorkspaceAccess", "kind": "enum", "required": true }
  ],
  "credentialSlots": [
    { "key": "openai_api_key", "scope": "provider", "required": false },
    { "key": "runway_api_key", "scope": "provider", "required": false }
  ],
  "operatorInputs": [
    { "key": "repairNotes", "kind": "text", "required": false }
  ]
}
```

## Human Checkpoint Shape

Each checkpoint should declare:

- `checkpointKey`
- `title`
- `required`
- `blocking`
- `stage`
- `approvalActorKind`
- `summary`

Example stages:

- `pre_run`
- `pre_publish`
- `pre_delivery`

## Proof Requirement Shape

Each proof requirement should declare:

- `proofKey`
- `requiredArtifactKinds`
- `requiredEvidenceClaims`
- `requiredForCompletion`
- `summary`

## Run Link Rule

One active `Fulfillment` may have zero to many `WorkflowAdapterRun` rows over time.

Use multiple rows for:

- retries
- resumed runs
- environment migration
- separate test and production attempts

Do not mutate one run row into a fake full history container.

## Failure And Retry Rule

When a workflow-backed lane fails:

- `WorkflowAdapterRun` records adapter failure detail
- `Fulfillment` records business-lane state such as `blocked`
- `Request` remains the durable demand object

## Provenance Rule

Every pack version should record:

- whether it was imported, composed, or written first-party
- which adapter profile it targets
- what was normalized away
- what still needs operator review

## Recommended MVP Scope

Implement first:

- `WorkflowPack`
- `WorkflowPackVersion`
- `WorkflowAdapterRun`

Treat `WorkflowPackSupplyBinding` as optional if `Supply.metadata.workflow.*` is enough for the first slice.

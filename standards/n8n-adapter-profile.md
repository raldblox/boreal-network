# n8n Adapter Profile

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This file defines how Boreal should import, normalize, and execute workflow-backed supply through the `n8n` adapter.

It exists so Boreal can use `n8n` richness without making `n8n` the canonical product object.

## Adapter Boundary

`n8n` owns:

- node graph execution
- credentials plumbing
- node-level integrations
- execution history inside the adapter

Boreal owns:

- `Request`
- selected `Supply`
- pricing and commitment
- fulfillment state
- proof requirements
- artifact publication
- buyer-facing completion truth

## Accepted Input Modes

The adapter may start from:

- raw `n8n` workflow JSON
- an existing `n8n` workflow id plus workspace access
- a Boreal-authored normalized pack that targets `n8n`

## Import Goals

The import step should:

- preserve the original source reference
- extract a normalized Boreal block graph
- detect required credentials
- detect external systems touched
- detect trigger shape
- detect outputs and handoff expectations
- detect unsupported or risky features

## Raw Source Handling

Store raw source as:

- `WorkflowPackVersion.sourceRefs`
- or a stable artifact reference

Do not:

- rewrite raw JSON into request brief fields
- store imported secret values from credentials exports
- expose raw source as the buyer-facing contract

## Normalization Rules

### Node-to-block mapping

Recommended starter mapping:

| n8n concept | Boreal block kind |
| --- | --- |
| Manual Trigger, Schedule Trigger, Webhook | `trigger` |
| HTTP Request, app-specific API nodes | `integration` |
| Set, Edit Fields, Merge, Code | `transform` |
| If, Switch, Filter | `condition` |
| OpenAI or other LLM nodes | `llm` |
| media-generation or provider render nodes | `generation` |
| Wait for approval or explicit operator gate | `review` |
| final webhook, storage write, delivery write | `delivery` |
| evidence capture or validation write | `proof` |

### Connection rule

Connections should be normalized into:

- `from.blockKey`
- `from.portKey`
- `to.blockKey`
- `to.portKey`

### Expression rule

Imported expressions should be:

- preserved as source detail
- summarized in block config
- flagged when Boreal cannot validate them safely

Do not pretend imported expressions are fully supported if they are not.

## Credential Rules

The adapter must:

- discover credential slots
- classify them by external system
- detect whether buyer-owned access is required
- never import actual secret values into pack source

Each credential slot should declare:

- `slotKey`
- `providerKey`
- `scope`
- `required`
- `notes`

Example scopes:

- `buyer_workspace`
- `boreal_first_party`
- `shared_operator`

## Unsupported Feature Rules

The importer should explicitly flag:

- unknown community nodes
- filesystem assumptions
- shell commands or local-process assumptions
- environment-variable dependencies not expressed as slots
- binary-data flows that need extra storage work
- nested sub-workflow references not yet resolved

Unsupported features should land in:

- `WorkflowPackVersion.unsupportedFeatures`

and should block `ready_to_run` when the feature is execution-critical.

## Sub-workflow Rules

When `n8n` imports reference sub-workflows:

- record each sub-workflow source reference
- normalize them into the same pack graph when feasible
- otherwise keep them as unresolved dependencies

Do not silently drop sub-workflow dependencies.

## Readiness Gates

An imported `n8n` pack must not be `ready_to_run` when:

- required credentials are unknown or missing
- unsupported node types are execution-critical
- trigger mode is unclear
- proof and delivery outputs are undefined
- human checkpoints are required but not declared

## Trigger Classification

The importer should classify trigger style into one of:

- `manual`
- `scheduled`
- `event_webhook`
- `polling`
- `hybrid`

This classification should influence:

- supply wording
- expected turnaround
- human checkpoint design
- whether the pack is sold as deploy, adapt, fix, or operate

## Buyer-Facing Fit Rule

Not every imported workflow should become a buyable supply.

Imported packs should be scored for:

- clear business outcome
- bounded scope
- realistic credential setup
- proofability
- handoff readiness

If fit is weak, keep the import as operator-only support material.

## Suggested Import Result Envelope

```json
{
  "workflowPack": {},
  "workflowPackVersion": {},
  "detectedSystems": ["n8n", "openai", "runway"],
  "credentialSlots": [],
  "humanCheckpoints": [],
  "proofRequirements": [],
  "unsupportedFeatures": [],
  "fitAssessment": {
    "buyable": true,
    "serviceFamilyHint": "automation_rescue",
    "summary": "Good fit for a fix-or-adapt workflow-backed supply."
  }
}
```

## Request-Flow Sidecar Rules

Every n8n import or export that is exposed to product surfaces should include a Boreal request-flow sidecar.

The sidecar should map adapter-safe workflow shape into:

- `RequestFlowStage`
- `RequestFlowCard`
- `ParticipantAction`
- credential slots
- human checkpoints
- proof requirements
- unsupported features
- lossiness
- round-trip safety

The sidecar must not create request truth by itself.

Allowed mappings:

- imported workflow shape -> `WorkflowPackVersion.graph.blocks`
- import review card -> `adapter_mapping_card` at `reuse_export` or `path_planning`
- buyer service path card -> `action_card` at `path_planning`
- fulfillment run card -> `action_card` at `execution_progress`
- proof output card -> `evidence_card` at `proof_submission`
- export package card -> `adapter_mapping_card` at `reuse_export`

Forbidden mappings:

- n8n execution success -> request completion
- n8n node status -> canonical lifecycle state
- n8n credential export -> Boreal credential value
- n8n workflow id -> `Request` root
- n8n task or execution -> `FulfillmentStep` unless a governed Boreal route creates the step

## Execution Rules

The adapter should support:

- dry-run validation
- test execution
- production execution
- retry
- resumed execution

But Boreal should expose those as execution support, not as buyer-facing root truth.

## Artifact Rules

The adapter should publish enough information for Boreal to create:

- `workflow_map`
- `issue_log`
- `workflow_build`
- `handoff_doc`
- `delivery`

Raw `n8n` execution logs should stay ephemeral unless Boreal promotes a summary.

## Security Rules

- do not trust imported credentials exports
- do not execute imported code or expressions blindly
- sanitize raw source before long-term storage when needed
- require explicit operator review when code nodes or filesystem assumptions exist

## Suggested MVP API Surface

Internal draft reads:

- `POST /api/workflow-imports/n8n`
- `GET /api/workflow-packs/{id}`
- `GET /api/workflow-pack-versions/{id}`

Internal draft writes:

- `POST /api/workflow-packs/{id}/bind-supply`
- `POST /api/workflow-pack-versions/{id}/validate`
- `POST /api/workflow-pack-versions/{id}/start-run`

These are implementation suggestions, not committed root canon APIs.

## First Use Cases

Best first `n8n` adapter-backed supply classes:

- fix a broken workflow
- deploy a reusable workflow
- adapt a workflow to buyer stack
- operate a recurring workflow

## Recommended MVP Boundaries

Support first:

- standard trigger nodes
- API integrations
- transform and condition nodes
- known first-party or common provider integrations
- explicit credential slots

Delay:

- arbitrary code-node trust
- uncontrolled community-node execution
- deeply nested sub-workflow graphs
- broad public marketplace imports

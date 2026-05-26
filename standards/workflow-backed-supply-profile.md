# Workflow-backed Supply Profile

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This standard defines how Boreal packages a buyable `Supply` that is powered by a reusable workflow, template, or pipeline.

It exists to standardize:

- imported `n8n` workflows
- first-party automation packs
- reusable `Runway` and `OpenAI` pipelines
- other adapter-backed execution chains

without replacing Boreal's canonical commerce model.

## Canon Boundary

This standard inherits root canon.

It does not replace:

- `Request` as the durable demand root
- `Supply` as the published capability object
- `Commitment` as the commercial or approval boundary
- `Fulfillment` as accepted execution truth
- `Artifact` as output or proof
- `Transaction` as payment state

## Core Rule

One workflow-backed plan is sold as one published `Supply`.

The workflow itself is implementation support.

The buyer still buys:

- deployment
- adaptation
- repair
- operation
- or another bounded outcome

not a raw workflow file as the durable business object.

## Support Objects

The profile uses these support-object names:

- `WorkflowPack`
- `WorkflowPackVersion`

These are support objects, not new Boreal commerce roots.

### `WorkflowPack`

Conceptual responsibility:

- stable pack identity
- reusable service or template family
- current active version pointer
- provenance and ownership

Suggested fields:

- `id`
- `key`
- `ownerActorId`
- `title`
- `summary`
- `status`
- `currentVersionId`
- `provenance`
- `metadata`

Suggested statuses:

- `draft`
- `active`
- `retired`

### `WorkflowPackVersion`

Conceptual responsibility:

- one versioned execution definition
- normalized block graph
- adapter profile
- input and output contract
- credential requirements
- human checkpoints
- proof requirements
- readiness state

Suggested fields:

- `id`
- `key`
- `workflowPackId`
- `version`
- `adapterKind`
- `graph`
- `inputContract`
- `outputContract`
- `credentialRequirements`
- `humanCheckpoints`
- `proofRequirements`
- `sourceRefs`
- `readiness`
- `unsupportedFeatures`
- `metadata`

Suggested readiness states:

- `draft`
- `needs_credentials`
- `needs_review`
- `ready_to_run`
- `blocked`
- `retired`

## Supply Link Rule

One published `Supply` may be backed by one active `WorkflowPackVersion`.

One `WorkflowPackVersion` may back more than one `Supply` row when different plans, brands, or pricing boundaries sell the same execution pack.

Until first-class linkage is modeled in root schemas, the support link may be carried through typed metadata or implementation-local foreign keys.

Suggested typed metadata keys on `Supply`:

- `metadata.workflow.profile = "workflow_backed_v1"`
- `metadata.workflow.packId`
- `metadata.workflow.packVersionId`
- `metadata.workflow.adapterKind`

## Source Kind Rule

Use existing supply source kinds.

Recommended reading:

- reusable imported or standardized pack -> `source.kind = "catalog"`
- handcrafted custom workflow supply -> `source.kind = "manual"`
- direct provider-backed execution lane -> `source.kind = "provider"`
- runtime-owned execution lane -> `source.kind = "runtime"`

Do not add a new canonical supply source kind just to express workflow backing.

## Block Graph Model

The standard graph is adapter-agnostic.

It should be rich enough to represent `n8n`-style execution while staying simpler and more portable than any one vendor's node model.

### Required graph pieces

- blocks
- ports
- connections
- input contract
- output contract
- credential requirements
- human checkpoints
- proof requirements

### Block kinds

Recommended starter block kinds:

- `trigger`
- `input`
- `credential`
- `transform`
- `condition`
- `llm`
- `generation`
- `integration`
- `review`
- `delivery`
- `proof`

### Block fields

Each block should declare:

- `blockKey`
- `title`
- `kind`
- `adapterOperation`
- `configSchema`
- `inputPorts`
- `outputPorts`
- `requiredSecrets`
- `emitsArtifactKinds`
- `requiresHumanApproval`
- `retryPolicy`
- `failureSummary`

### Connection fields

Each connection should declare:

- `from.blockKey`
- `from.portKey`
- `to.blockKey`
- `to.portKey`

## Adapter Profiles

The standard currently anticipates these adapter kinds:

- `n8n`
- `boreal_worker`
- `desktop_runtime`
- `provider_direct`
- `manual_playbook`

The block graph stays standardized above the adapter.
Adapter-specific payloads stay behind `sourceRefs`, `adapterOperation`, or implementation-local config.

## `n8n` Import Rules

When importing `n8n` JSON:

- preserve the original raw definition as a source reference
- normalize nodes and connections into the Boreal block graph
- do not store secrets from imported credentials in the pack source
- record unsupported nodes or expressions explicitly
- derive required credential slots and operator review points

The imported JSON is source material, not the buyer contract.

## Request Consumption Rules

When a buyer chooses a workflow-backed supply:

- Boreal creates or reuses one private draft `Request`
- Boreal sets `routing.preferredSupplyId`
- Boreal may seed route-facing derived state from the selected supply
- Boreal must not rewrite raw workflow content into the buyer-authored brief

Workflow selection context may be stored in typed request metadata or implementation-local support links.

## Fulfillment Rules

Workflow-backed supply still follows the accepted outer execution shape:

- `Request`
- optional `Commitment`
- `Fulfillment`
- `Artifact`

The workflow pack may help create the execution lane, but it does not bypass:

- funding gates
- approval gates
- proof requirements
- owner acceptance when required

## Proof And Delivery Rules

Adapter-level success is not enough to resolve the request.

At minimum, workflow-backed supply should support:

- explicit proof requirements
- artifact publication
- readable delivery summary
- failure and retry explanation

Raw adapter logs should remain ephemeral unless Boreal promotes a summarized business outcome into durable truth.

## Security Rules

- secrets must not be embedded in raw imported definitions kept as Boreal source references
- credential requirements should declare slots and scopes, not secret values
- provider API setup should be standardized through reusable credential and integration blocks
- workflow packs should record what external systems they touch

## License And Provenance Rules

If a workflow pack originates from imported third-party material, provenance should record:

- source platform
- source URL or reference
- original author when known
- license or reuse notes
- what Boreal changed or added

Do not resell third-party templates blindly.

## Readiness Rules

A workflow-backed pack must not be considered `ready_to_run` when:

- required credentials are missing
- unsupported adapter features exist
- required human checkpoints are undefined
- required proof requirements are undefined

## Starter `Runway` And `OpenAI` Block Set

Recommended starter reusable blocks:

- `OpenAI Script Draft`
- `OpenAI Hook Variants`
- `OpenAI Captions`
- `Runway Character Generate`
- `Runway Act Two Render`
- `Runway Image To Video`
- `Human Clip Review`
- `Delivery Bundle Publish`

These blocks should be reused across multiple workflow-backed supplies rather than rebuilt ad hoc in each service.

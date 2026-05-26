# 0019 Workflow-backed supply profile and adapter boundary

## Status

Accepted

## Date

2026-05-26

## Context

Boreal needs a standard way to package supplies that feel like ready-to-run workflows without collapsing the product into a workflow builder.

The immediate pressure comes from:

- imported `n8n` workflow JSON
- first-party automation and virality services
- reusable `Runway` and `OpenAI` setup chains
- the need to sell deployable or adaptable outcomes instead of raw templates

The failure mode is obvious.

If Boreal treats a workflow definition as the thing being bought, it weakens the accepted commercial and canonical reading:

- `Request` stops being the durable demand root
- `Supply` stops being the published capability object
- workflow execution starts masquerading as proof of completion
- Boreal starts to sound like `better n8n` instead of request-native work commerce

That is the wrong boundary for this repo.

## Decision

### 1. Workflow-backed execution is allowed, but it stays behind canonical `Supply`

A workflow-shaped or template-backed service is still sold as:

- `Supply`

It is not a new canonical root object.

The buyer still buys a capability or outcome lane.
The buyer does not buy a raw workflow definition as the durable Boreal root.

### 2. `Request` remains the durable demand root even when a workflow powers execution

Workflow-backed services must still resolve through the accepted outer path:

- `Request`
- optional `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`

Execution automation does not replace request, approval, funding, proof, or acceptance truth.

### 3. Use support objects for reusable workflow packs

The accepted support-object names are:

- `WorkflowPack`
- `WorkflowPackVersion`

These are support implementation objects, not Boreal commerce roots.

They exist so Boreal can standardize:

- imported workflow definitions
- block graphs
- adapter profiles
- credential requirements
- proof requirements
- reusable execution packs

without overloading the canonical `Supply` root.

### 4. Raw imported definitions are implementation assets, not buyer-facing truth

Imported `n8n` JSON, provider pipeline definitions, or other raw workflow artifacts should be treated as:

- source material
- support-object content
- or durable artifact references

They should not become:

- the buyer-authored request brief
- the canonical `Supply` object itself
- proof that work is complete

### 5. Standardize the workflow profile above any single adapter

Boreal should define one workflow-backed supply profile that can target multiple execution adapters such as:

- `n8n`
- Boreal-managed web workers
- desktop runtime execution
- direct provider API chains

The standard block graph and readiness rules belong to Boreal.

Adapter-specific payloads belong behind that standard.

### 6. One buyable plan still maps to one published `Supply`

The accepted packaging rule remains:

- one buyable preset or plan maps to one published `Supply`

One `WorkflowPackVersion` may back one or many supply rows, but the buyer-facing plan and pricing boundary stays on `Supply`.

### 7. Workflow execution success is not completion truth

A workflow-backed supply may run successfully at the adapter layer and still fail the business lane.

Completion still depends on:

- required credentials
- required human checkpoints
- required proof
- artifact publication
- owner acceptance when needed

## Consequences

### Accepted

- Boreal can import `n8n`-style workflows without turning the repo into a workflow-builder clone
- reusable first-party service packs can stay rich internally while preserving clean buyer-facing canon
- `Runway` and `OpenAI` setup complexity can be hidden inside standardized packs and blocks
- imported or authored workflow packs can be sold as deploy, adapt, fix, or operate services

### Rejected

- treating workflow JSON as the product root
- exposing raw workflow definitions as the main buyer-facing contract
- letting adapter execution logs stand in for proof or acceptance
- using `n8n with human in the loop` as Boreal's main category

### Tradeoffs

- this adds support-object and standards complexity before full implementation exists
- some rich workflow semantics will live outside the current machine-readable root schema at first
- the first implementation should prefer typed metadata and standards files before expanding canonical root fields

## Implementation Notes

The first durable standard should live in:

- `standards/workflow-backed-supply-profile.md`

Canon files that should stay aligned:

- `docs/COMMERCIAL_CANON.md`
- `docs/REQUEST_PROCESSING.md`
- `docs/SCHEMA_LOGICAL.md`
- `docs/LIVE_VS_TARGET.md`
- `docs/TEST_MATRIX.md`

The first implementation slice should prefer:

- support objects
- typed metadata
- adapter boundaries

before new canonical commerce roots or buyer-facing workflow-builder UI.

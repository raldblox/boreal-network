# 0014 Request Draft Input And Read-Only Planner Projection

## Status

Accepted

## Date

2026-05-15

## Context

Boreal now has richer request planning work across prompt layers, planner behavior, evals, and web request-room UI:

- lead-role planning
- collaborator role slots
- bounded phase plans
- embodied execution profiling
- verification and proof planning

That work is useful only if it preserves Boreal's core boundary:

- the owner may customize the request through a safe editable request-input surface
- the rest of the request object is current truth or read-only projection

Without that boundary, Boreal risks:

- treating planner output like editable buyer-authored brief content
- letting the draft editor silently imply writable system-owned fields
- leaking internal planner state into public-safe request surfaces
- making canon, schema, and runtime behavior disagree

## Decision

### 1. Keep `brief` as buyer-authored brief, not planner-owned structure

The editable request-input layer remains:

- `visibility`
- `brief`
- `seeking`
- `budget`
- `deadline`

`brief` is still the main human-authored ask surface.
It should not absorb role slots, phase plans, execution profiles, verification plans, or other planner-owned structure.

### 2. Keep planner outputs on the same `Request`, but read-only and derived

Planner-visible structure may live on the durable `Request` under `derived` when it is:

- rebuildable
- system-owned
- projection-like
- not treated as a second buyer-authored brief

The first accepted structural planning projection includes:

- `derived.leadRole`
- `derived.roleSlots`
- `derived.phases`
- `derived.noMicrotaskExplosion`

The first accepted embodied and proof-aware planning projection includes:

- `derived.executionProfile`
- `derived.embodiedConstraintSet`
- `derived.verificationPlan`
- `derived.planCollapseRisk`
- `derived.clarificationNeeded`

These are current-truth derived fields, not new durable root objects.

### 3. Draft document editing must expose an explicit editable subset

The draft-mode request document may include a read-only projection for context, but that projection must be explicit and clearly non-editable.

The editable subset must stay limited to:

- `visibility`
- `brief`
- `seeking`
- `budget`
- `deadline`

System-owned fields such as:

- ids
- owner refs
- status
- routing
- active refs
- latest summary
- planner projections
- timestamps

must remain read-only in the draft document contract.

### 4. Open request rooms must render planner truth, not reopen draft editing

Once a request leaves `draft`, planner-derived role, phase, and proof structure may be rendered for routing and execution understanding.

But open request behavior must still prefer:

- `Commitment`
- `Fulfillment`
- `Artifact`
- `RequestEvent`

over renewed `brief` mutation.

### 5. Public-safe projections must be thinner than owner detail projections

Public request-pool reads should not expose every internal planner field by default.

They may expose only the public-safe subset needed to understand:

- the ask
- the open status
- the route summary
- high-level execution expectations

Owner detail reads may expose the fuller derived projection.

## Consequences

### Accepted

- Boreal can keep richer route and phase planning without weakening the buyer-authored brief boundary
- request editing stays understandable as `input -> read-only projection`, not `one giant mixed object`
- fulfillment seeding may legitimately consume derived phase plans without pretending they are buyer-authored brief fields
- canon, schema, and UI now need to keep the editable subset and public-safe subset explicit

### Rejected

- treating `brief` as the home for planner roles, steps, or proof structure
- exposing the entire planner projection as if it were public-safe by default
- relying on UI convention alone to distinguish editable versus read-only request fields
- creating a second durable root object for request planning

## Implementation Notes

Canon and contract surfaces that should stay aligned with this decision:

- `docs/SCHEMA_LOGICAL.md`
- `docs/REQUEST_PROCESSING.md`
- `docs/TOOL_CALLING_CONTRACTS.md`
- `docs/API_CONTRACTS.md`
- `docs/LIVE_VS_TARGET.md`
- `docs/TEST_MATRIX.md`
- `docs/EVALS.md`
- `schemas/json/request.schema.json`

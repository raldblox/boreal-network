# Governance

This file defines how Boreal Network canon changes without drifting.

## Canon Precedence

When documents disagree, the precedence order is:

1. `docs/NETWORK_THESIS.md`
2. `docs/COMMERCIAL_CANON.md`
3. `docs/PRODUCT_POSITIONING.md`
4. `docs/ICP_AND_WEDGE.md`
5. `docs/WHY_NOW.md`
6. `docs/OBJECT_TAXONOMY.md`
7. `docs/STATE_MACHINES.md`
8. `docs/EVENT_MODEL.md`
9. `docs/API_CONTRACTS.md`
10. `docs/SCHEMA_LOGICAL.md`
11. `docs/COMPETITIVE_MAP.md`
12. `docs/BUSINESS_MODEL.md`
13. `docs/PITCH_FACTS.md`
14. `docs/LIVE_VS_TARGET.md`
15. `docs/REPO_STRUCTURE.md`
16. `docs/WORKSTREAMS.md`
17. `docs/OWNERSHIP.md`
18. machine-readable schemas in `schemas/`
19. implementation code in governed workspaces inside this monorepo
20. implementation code in any external companion repos

Implementation code must not override root canon.

## Change Classes

### Class A: semantic change

Examples:

- new root object
- renamed object
- changed lifecycle state meaning
- changed event meaning
- changed payment or fulfillment boundary
- changed commercial category
- changed primary wedge
- changed business-model boundary
- changed live-versus-target public claim boundary

Required updates:

- thesis if the category meaning changed
- commercial canon
- product positioning
- ICP and wedge
- why now
- live-versus-target boundary
- taxonomy
- state machines
- event model
- logical schema
- tests
- machine-readable schemas when canonical object, lifecycle, or contract semantics changed

### Class B: contract change

Examples:

- new endpoint
- changed payload
- changed webhook
- changed event schema

Required updates:

- API contracts
- event model if async behavior changed
- machine-readable schemas
- tests

### Class C: projection or implementation change

Examples:

- new derived view
- new index
- new search strategy
- new projection cache
- new workspace-local cache or adapter that does not redefine canon

Required updates:

- logical schema if durable implications exist
- tests if observable behavior changes
- local workspace docs if commands or boundaries changed

### Class D: workspace topology change

Examples:

- new top-level namespace
- new workspace under `apps/`
- new workspace under `packages/`
- new workspace under `skills/`
- new workspace under `standards/`
- renamed workspace
- retired workspace
- change to workspace naming rules or reserved role names

Required updates:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/REPO_STRUCTURE.md`
- `docs/WORKSTREAMS.md`
- `docs/OWNERSHIP.md`
- local workspace `README.md` when the workspace exists
- local workspace `AGENTS.md` when the workspace exists
- tests if the workspace changes observable contracts or durable behavior

## Decision Discipline

If a change introduces a non-trivial tradeoff, record it before or with the change.

Recommended location:

- `docs/decisions/`

Decision files should explain:

- context
- decision
- consequences

## Risk Escalation Rule

When a task or proposed change could break semantics, contracts, workspace boundaries, or durable history, the agent must escalate before continuing silently.

Escalation means:

- flag the risk explicitly
- identify the likely blast radius
- point to the affected canon files or workspaces
- ask for confirmation when the boundary is unclear or destructive

Escalation must be visually obvious.

Required format:

- begin with `RISK ESCALATION`
- begin with `BLOCKING RISK ESCALATION` when work must stop pending confirmation
- include, in order:
  - `Risk:`
  - `Impact:`
  - `Scope:`
  - `Safer path:`
  - `Question:`

This format exists so the user can recognize a risky turn immediately instead of parsing a long explanation.

This applies even when the user did not explicitly ask for a risk review.

## Sync Matrix

### If you change `Request`

Update:

- thesis if the root meaning changed
- taxonomy
- state machines
- event model
- logical schema
- tests

### If you change `Supply`

Update:

- taxonomy
- state machines
- logical schema
- API contracts if external surfaces changed
- tests

### If you change commercial category, wedge, or business model

Update:

- `docs/COMMERCIAL_CANON.md`
- `docs/PRODUCT_POSITIONING.md`
- `docs/ICP_AND_WEDGE.md`
- `docs/WHY_NOW.md`
- `docs/COMPETITIVE_MAP.md` when category boundaries changed
- `docs/BUSINESS_MODEL.md`
- `docs/PITCH_FACTS.md`
- `docs/LIVE_VS_TARGET.md`
- `README.md`
- `docs/README.md`

### If you change event names or payloads

Update:

- event model
- AsyncAPI or event schemas
- test matrix

### If you change external APIs

Update:

- API contracts
- OpenAPI
- tests

### If you add, rename, retire, or repurpose a workspace

Update:

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/REPO_STRUCTURE.md`
- `docs/WORKSTREAMS.md`
- `docs/OWNERSHIP.md`
- `docs/decisions/` when the naming or topology decision is non-trivial
- local workspace `README.md`
- local workspace `AGENTS.md`

### If you change workstream or ownership boundaries

Update:

- `docs/WORKSTREAMS.md`
- `docs/OWNERSHIP.md`
- relevant local workspace docs when responsibilities changed

## Drift Rules

- Do not leave markdown and machine contracts out of sync.
- Do not change names in one file only.
- Do not keep legacy synonyms alive in new core work unless intentionally documented.
- Do not land code first and canon later for semantic changes.
- Do not add top-level folders without registering them in `docs/REPO_STRUCTURE.md`.
- Do not let active workspace docs drift from root canon.
- Do not make silent breaking moves when the blast radius is known or reasonably likely.

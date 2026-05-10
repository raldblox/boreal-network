# Governance

This file defines how Boreal Network canon changes without drifting.

## Canon Precedence

When documents disagree, the precedence order is:

1. `docs/NETWORK_THESIS.md`
2. `docs/OBJECT_TAXONOMY.md`
3. `docs/STATE_MACHINES.md`
4. `docs/EVENT_MODEL.md`
5. `docs/API_CONTRACTS.md`
6. `docs/SCHEMA_LOGICAL.md`
7. machine-readable schemas in `schemas/`
8. implementation code in downstream repos

Implementation code must not override the canon.

## Change Classes

### Class A: semantic change

Examples:

- new root object
- renamed object
- changed lifecycle state meaning
- changed event meaning
- changed payment or fulfillment boundary

Required updates:

- thesis if the category meaning changed
- taxonomy
- state machines
- event model
- logical schema
- tests
- machine-readable schemas

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

Required updates:

- logical schema if durable implications exist
- tests if observable behavior changes

### Class D: workspace topology change

Examples:

- new top-level namespace
- new workspace under `apps/`
- new workspace under `packages/`
- new workspace under `skills/`
- new workspace under `standards/`
- renamed workspace

Required updates:

- `README.md`
- `AGENTS.md`
- `docs/REPO_STRUCTURE.md`
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
- logical schema
- API contracts if external surfaces changed
- tests

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

### If you add or rename a workspace

Update:

- `README.md`
- `AGENTS.md`
- `docs/REPO_STRUCTURE.md`
- local workspace `README.md`
- local workspace `AGENTS.md`

## Drift Rules

- Do not leave markdown and machine contracts out of sync.
- Do not change names in one file only.
- Do not keep legacy synonyms alive in new core work unless intentionally documented.
- Do not land code first and canon later for semantic changes.
- Do not add top-level folders without registering them in `docs/REPO_STRUCTURE.md`.
- Do not make silent breaking moves when the blast radius is known or reasonably likely.

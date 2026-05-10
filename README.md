# Boreal Network

Boreal Network is the canonical modeling and contract repository for Boreal's request-native work network.

This repository is intentionally docs-first.

Its job is to define:

- the network thesis
- the canonical object taxonomy
- lifecycle and state rules
- event contracts
- API contracts
- logical schema boundaries
- test expectations
- coding-agent guardrails

Implementation repositories should follow this repo's canon.
They must not invent conflicting root objects, status names, event names, or API semantics without updating the canon here first.

## Read Order

Read these files in order before making any meaningful change:

1. [docs/NETWORK_THESIS.md](docs/NETWORK_THESIS.md)
2. [docs/OBJECT_TAXONOMY.md](docs/OBJECT_TAXONOMY.md)
3. [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md)
4. [docs/EVENT_MODEL.md](docs/EVENT_MODEL.md)
5. [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)
6. [docs/SCHEMA_LOGICAL.md](docs/SCHEMA_LOGICAL.md)
7. [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md)
8. [docs/GOVERNANCE.md](docs/GOVERNANCE.md)
9. [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md)
10. [AGENTS.md](AGENTS.md)

## Repository Layout

- `docs/` holds human-readable canon and governance.
- `schemas/json/` holds canonical object schemas.
- `schemas/openapi/` holds HTTP and webhook contracts.
- `schemas/events/` holds async event contracts.
- `db/` holds physical schema, migrations, and indexing plans.
- `fixtures/` holds deterministic sample data grouped by aggregate.
- `tests/` holds contract, lifecycle, and invariant verification assets.

Reserved top-level namespaces for future expansion:

- `apps/` for deployable or runnable products such as web, mobile, desktop, extensions, bots, docs sites, marketing sites, CLI apps, peer runtimes, and gateway services
- `packages/` for reusable libraries, SDKs, npm packages, shared clients, transport libraries, shared configs, and internal code packages
- `skills/` for reusable agent skills, prompt packs, or task modules
- `standards/` for Boreal-specific protocol profiles, integration standards, and implementation rules

Name workspaces by role, not vague infra labels.
Prefer names like `peer`, `gateway-http`, `telegram-bot`, `desktop`, `cli`, and `marketing-site`.

Do not introduce `network-node/` as a top-level namespace or preferred workspace name.
If you need a runnable Boreal network participant, place it under `apps/peer` or `apps/peer-*`.
If you need a protocol bridge, use `apps/gateway-*`.
If you need reusable node or libp2p code, place it under `packages/network-*` or `packages/libp2p-*`.

Do not create those namespaces ad hoc.
Register and govern them through [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md) first.

See [docs/README.md](docs/README.md), [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md), and [schemas/README.md](schemas/README.md) for structure details.

## Working Rule

Do not start from tables.
Do not start from UI.
Do not start from provider-specific glue.

Start from:

1. thesis
2. taxonomy
3. state machines
4. event model
5. API contracts
6. logical schema
7. physical schema
8. implementation and tests

## Current Scope

This repo defines the durable network model for:

- requests
- supply
- participants
- commitments
- fulfillment
- artifacts and proof
- payments and payout records
- event history

It does not exist to hold marketing copy, product launch material, or implementation-specific hacks.

## Workspace Rule

No new top-level workspace or namespace should be added until:

1. its purpose is registered in `docs/REPO_STRUCTURE.md`
2. its boundaries are compatible with the canon
3. its required local `README.md` and `AGENTS.md` rules are defined
4. the root docs and governance are updated in the same patch

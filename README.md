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
7. [docs/GOVERNANCE.md](docs/GOVERNANCE.md)
8. [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md)
9. [AGENTS.md](AGENTS.md)

## Repository Layout

- `docs/` holds human-readable canon and governance.
- `schemas/json/` holds canonical object schemas.
- `schemas/openapi/` holds HTTP and webhook contracts.
- `schemas/events/` holds async event contracts.
- `db/` holds physical schema, migrations, and indexing plans.
- `fixtures/` holds deterministic sample data grouped by aggregate.
- `tests/` holds contract, lifecycle, and invariant verification assets.

See [docs/README.md](docs/README.md) and [schemas/README.md](schemas/README.md) for structure details.

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

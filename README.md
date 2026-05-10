# Boreal Network

Boreal Network is the canonical monorepo for Boreal.

The root stays canon-first and docs-first.  Governed implementation workspaces now live in the same repository under `apps/`, `packages/`, `skills/`, and `standards/`.

Its job is to define:

- the network thesis
- the commercial category and positioning
- the buyer wedge and market boundary
- the canonical object taxonomy
- lifecycle and state rules
- event contracts
- API contracts
- logical schema boundaries
- the competitive and business-model truth
- pitch-safe facts
- live-versus-target claim boundaries
- machine-readable schema baseline
- active workspace topology
- workstream and ownership rules
- test expectations
- coding-agent guardrails

Implementation workspaces inside this repo, and any external companion repos, must follow root canon.
They must not invent conflicting root objects, status names, event names, or API semantics without updating the canon here first.

## Read Order

Read these files in order before making any meaningful change:

1. [docs/NETWORK_THESIS.md](docs/NETWORK_THESIS.md)
2. [docs/COMMERCIAL_CANON.md](docs/COMMERCIAL_CANON.md)
3. [docs/PRODUCT_POSITIONING.md](docs/PRODUCT_POSITIONING.md)
4. [docs/ICP_AND_WEDGE.md](docs/ICP_AND_WEDGE.md)
5. [docs/WHY_NOW.md](docs/WHY_NOW.md)
6. [docs/COMPETITIVE_MAP.md](docs/COMPETITIVE_MAP.md)
7. [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md)
8. [docs/PITCH_FACTS.md](docs/PITCH_FACTS.md)
9. [docs/LIVE_VS_TARGET.md](docs/LIVE_VS_TARGET.md)
10. [docs/OBJECT_TAXONOMY.md](docs/OBJECT_TAXONOMY.md)
11. [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md)
12. [docs/EVENT_MODEL.md](docs/EVENT_MODEL.md)
13. [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)
14. [docs/SCHEMA_LOGICAL.md](docs/SCHEMA_LOGICAL.md)
15. [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md)
16. [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md)
17. [docs/OWNERSHIP.md](docs/OWNERSHIP.md)
18. [docs/GOVERNANCE.md](docs/GOVERNANCE.md)
19. [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md)
20. [AGENTS.md](AGENTS.md)

## Repository Layout

- `docs/` holds human-readable canon, decisions, governance, and coordination rules.
- `schemas/json/` holds canonical object schemas.
- `schemas/openapi/` holds HTTP and webhook contracts.
- `schemas/events/` holds async event contracts.
- `db/` holds physical schema, migrations, and indexing plans.
- `fixtures/` holds deterministic sample data grouped by aggregate.
- `tests/` holds contract, lifecycle, invariant, and topology verification assets.
- `apps/` holds runnable product and operator surfaces.
- `packages/` holds reusable shared code, SDKs, clients, configs, and transport libraries.
- `skills/` holds reusable agent skills, prompt packs, and task modules.
- `standards/` holds Boreal-specific implementation standards, protocol profiles, and compatibility rules.
- `package.json` and `pnpm-workspace.yaml` hold the JS or TS workspace baseline for code-bearing workspaces.

Current activated workspace:

- `apps/web/` is the first governed implementation workspace.  It is intentionally scaffold-light until the initial web runtime stack is chosen explicitly.

Name workspaces by role, not vague infra labels.
Prefer names like `peer`, `gateway-http`, `telegram-bot`, `desktop`, `cli`, and `marketing-site`.

Do not introduce `network-node/` as a top-level namespace or preferred workspace name.
If you need a runnable Boreal network participant, place it under `apps/peer` or `apps/peer-*`.
If you need a protocol bridge, use `apps/gateway-*`.
If you need reusable node or libp2p code, place it under `packages/network-*` or `packages/libp2p-*`.

See [docs/README.md](docs/README.md), [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md), [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md), [docs/OWNERSHIP.md](docs/OWNERSHIP.md), and [schemas/README.md](schemas/README.md) for structure details.

## Working Rule

Do not start from tables.
Do not start from UI.
Do not start from provider-specific glue.
Do not start a new workspace with code before its local `README.md` and `AGENTS.md` exist.

If a task could break canon, contracts, durable history, or workspace boundaries, the agent must stop and emit a visibly labeled `RISK ESCALATION` or `BLOCKING RISK ESCALATION` message before continuing.

Start from:

1. thesis
2. commercial canon
3. positioning and wedge
4. live versus target boundary
5. taxonomy
6. state machines
7. event model
8. API contracts
9. logical schema
10. workspace topology and ownership
11. machine-readable schema
12. physical schema
13. implementation and tests

## Current Scope

This repo defines the durable network model for:

- commercial category and buyer truth
- requests
- supply
- participants
- commitments
- fulfillment
- artifacts and proof
- payments and payout records
- event history
- governed workspace topology
- safe parallel implementation boundaries

It also defines:

- who buys first
- what Boreal wins first
- why the business is a network instead of a point tool
- how Boreal should make money without collapsing into agency economics
- where Boreal product code, peer code, skills, and standards belong inside this monorepo

It does not exist to hold random root-level implementation hacks.
Put product and support code in governed workspaces.

## Workspace Rule

No new top-level namespace or child workspace should be added until:

1. its purpose fits [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md)
2. the active workspace registry is updated
3. [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md) and [docs/OWNERSHIP.md](docs/OWNERSHIP.md) are updated if scope or ownership changes
4. its required local `README.md` and `AGENTS.md` rules are defined
5. the root docs and governance are updated in the same patch when repo meaning or topology changes

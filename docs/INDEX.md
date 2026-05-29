# Boreal Network Index

This is the navigation hub for the canonical Boreal monorepo.

Use this file when you need orientation first.
Use the canon files when you need exact truth.

## What This Repo Contains

Boreal Network is the source of truth for:

- Boreal's network thesis
- commercial category and market wedge
- current live versus target claim boundary
- canonical objects, states, and event semantics
- API and schema contracts
- request-processing rules
- governed workspace topology
- research manuscripts derived from canon
- strategy notes that shape product and go-to-market without redefining canon

## Fastest Read Paths

### 1. If you need the core business and product story

Read in this order:

1. [NETWORK_THESIS.md](NETWORK_THESIS.md)
2. [COMMERCIAL_CANON.md](COMMERCIAL_CANON.md)
3. [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)
4. [BRAND_VOICE.md](BRAND_VOICE.md)
5. [ICP_AND_WEDGE.md](ICP_AND_WEDGE.md)
6. [WHY_NOW.md](WHY_NOW.md)
7. [LIVE_VS_TARGET.md](LIVE_VS_TARGET.md)

### 2. If you need the product and workflow model

Read in this order:

1. [OBJECT_TAXONOMY.md](OBJECT_TAXONOMY.md)
2. [STATE_MACHINES.md](STATE_MACHINES.md)
3. [EVENT_MODEL.md](EVENT_MODEL.md)
4. [API_CONTRACTS.md](API_CONTRACTS.md)
5. [REQUEST_PROCESSING.md](REQUEST_PROCESSING.md)
6. [REQUEST_PLAN_MODEL.md](REQUEST_PLAN_MODEL.md)
7. [TOOL_CALLING_CONTRACTS.md](TOOL_CALLING_CONTRACTS.md)
8. [SCHEMA_LOGICAL.md](SCHEMA_LOGICAL.md)
9. [REQUEST_UX_NOTES.md](REQUEST_UX_NOTES.md)

### 3. If you need market-shaping and messaging working docs

Read in this order:

1. [strategy/README.md](strategy/README.md)
2. [strategy/ICP_MATRIX.md](strategy/ICP_MATRIX.md)
3. [strategy/WHY_NOW_AND_WHY_THIS_MARKET.md](strategy/WHY_NOW_AND_WHY_THIS_MARKET.md)
4. [BRAND_VOICE.md](BRAND_VOICE.md)
5. [strategy/LANDING_PAGE_MESSAGING_FRAMEWORK.md](strategy/LANDING_PAGE_MESSAGING_FRAMEWORK.md)
6. [strategy/FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md](strategy/FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md)
7. [strategy/REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md](strategy/REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md)
8. [strategy/PATH_BUILDER_V1_UX_PLAN.md](strategy/PATH_BUILDER_V1_UX_PLAN.md)
9. [strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md](strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md)
10. [strategy/PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md](strategy/PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md)
11. [strategy/FIRST_PARTY_SERVICE_SUPPLY_SKUS.md](strategy/FIRST_PARTY_SERVICE_SUPPLY_SKUS.md)
12. [strategy/UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md](strategy/UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md)
13. [strategy/360_PRODUCT_QUALITY_CHECKLIST.md](strategy/360_PRODUCT_QUALITY_CHECKLIST.md)

These files are downstream strategy tools.
They help shape packaging, product decisions, and proof collection.
They must stay aligned with canon and must not silently redefine it.

### 4. If you need repo governance and implementation boundaries

Read in this order:

1. [REPO_STRUCTURE.md](REPO_STRUCTURE.md)
2. [WORKSTREAMS.md](WORKSTREAMS.md)
3. [OWNERSHIP.md](OWNERSHIP.md)
4. [DOC_LIFECYCLE.md](DOC_LIFECYCLE.md)
5. [GOVERNANCE.md](GOVERNANCE.md)
6. [TEST_MATRIX.md](TEST_MATRIX.md)
7. [EVALS.md](EVALS.md)

### 5. If you need research and paper context

Read in this order:

1. [papers/README.md](papers/README.md)
2. [papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/README.md](papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/README.md)
3. [papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/abstract.md](papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/abstract.md)
4. [papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/outline.md](papers/request-rooted-orchestration-for-mixed-human-ai-fulfillment/outline.md)

## Folder Map

- `docs/` - human-readable canon, strategy, research, and governance
- `docs/BRAND_VOICE.md` - official product voice for public copy and website surfaces
- `docs/strategy/` - product-shaping, launch planning, and go-to-market working docs derived from canon
- `docs/decisions/` - accepted decisions and architectural records
- `docs/papers/` - manuscripts, outlines, notes, and benchmark outputs
- `schemas/` - JSON Schema, OpenAPI, and event contracts
- `fixtures/` - deterministic sample threads and eval fixtures
- `tests/` - contract and eval runners
- `apps/` - runnable product surfaces
- `packages/` - shared code and transport libraries
- `skills/` - reusable agent skills and task modules
- `standards/` - implementation standards and compatibility rules

## Simple Rules

- Start with canon before implementation when meaning could drift.
- Start with strategy before copywriting when audience or wedge could drift.
- Start with live-versus-target before making public claims.
- Check [DOC_LIFECYCLE.md](DOC_LIFECYCLE.md) and the directory state registers before treating old strategy or decisions as current.
- Use [strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md](strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md) as the durable work queue for pilot and self-serve marketplace launch gates.
- Start with governance before adding new workspaces or redefining repo meaning.
- Treat `Request` as the durable business root unless canon changes explicitly.

## Best Use Of This Index

Use this file as the front door.
Use [README.md](../README.md) for root framing.
Use [README.md](README.md) for the docs map.
Use the strategy docs when you need sharper packaging for the same underlying truth.

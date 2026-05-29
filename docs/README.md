# Documentation Map

This repository follows a docs-first operating model at the root of the canonical Boreal monorepo.

Start with [INDEX.md](INDEX.md) if you need a front door and reading path before diving into individual docs.

The documents are organized by purpose, not by chronology.

## Canon

These files define what Boreal Network is:

1. [NETWORK_THESIS.md](NETWORK_THESIS.md)
2. [COMMERCIAL_CANON.md](COMMERCIAL_CANON.md)
3. [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)
4. [BRAND_VOICE.md](BRAND_VOICE.md)
5. [OBJECT_TAXONOMY.md](OBJECT_TAXONOMY.md)
6. [STATE_MACHINES.md](STATE_MACHINES.md)
7. [EVENT_MODEL.md](EVENT_MODEL.md)
8. [API_CONTRACTS.md](API_CONTRACTS.md)
9. [REQUEST_PROCESSING.md](REQUEST_PROCESSING.md)
10. [REQUEST_PLAN_MODEL.md](REQUEST_PLAN_MODEL.md)
11. [TOOL_CALLING_CONTRACTS.md](TOOL_CALLING_CONTRACTS.md)
12. [SCHEMA_LOGICAL.md](SCHEMA_LOGICAL.md)

## Commercial Canon

These files define what Boreal Network is as a business and what story roast, pitch, and fundraising workflows must preserve:

- [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)
- [BRAND_VOICE.md](BRAND_VOICE.md)
- [ICP_AND_WEDGE.md](ICP_AND_WEDGE.md)
- [WHY_NOW.md](WHY_NOW.md)
- [COMPETITIVE_MAP.md](COMPETITIVE_MAP.md)
- [BUSINESS_MODEL.md](BUSINESS_MODEL.md)
- [PITCH_FACTS.md](PITCH_FACTS.md)
- [LIVE_VS_TARGET.md](LIVE_VS_TARGET.md)

## Strategy And Market Shaping

These files help shape packaging, prioritization, positioning execution, and market validation while staying downstream of canon:

- [INDEX.md](INDEX.md)
- [strategy/README.md](strategy/README.md)
- [strategy/ICP_MATRIX.md](strategy/ICP_MATRIX.md)
- [strategy/WHY_NOW_AND_WHY_THIS_MARKET.md](strategy/WHY_NOW_AND_WHY_THIS_MARKET.md)
- [strategy/LANDING_PAGE_MESSAGING_FRAMEWORK.md](strategy/LANDING_PAGE_MESSAGING_FRAMEWORK.md)
- [strategy/FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md](strategy/FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md)
- [strategy/REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md](strategy/REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md)
- [strategy/360_PRODUCT_QUALITY_CHECKLIST.md](strategy/360_PRODUCT_QUALITY_CHECKLIST.md)
- [strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md](strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md)
- [strategy/PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md](strategy/PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md)
- [strategy/PUBLIC_PILOT_OPERATOR_RUNBOOK.md](strategy/PUBLIC_PILOT_OPERATOR_RUNBOOK.md)
- [strategy/PUBLIC_PILOT_OBSERVABILITY.md](strategy/PUBLIC_PILOT_OBSERVABILITY.md)

## Product And UX Notes

These files capture product-surface expectations that should stay aligned with canon and positioning:

- [REQUEST_UX_NOTES.md](REQUEST_UX_NOTES.md)
- [REQUEST_PLAN_MODEL.md](REQUEST_PLAN_MODEL.md)
- [strategy/REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md](strategy/REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md)

## Governance And Coordination

These files define how the canon stays aligned and how parallel work is kept safe:

- [GOVERNANCE.md](GOVERNANCE.md)
- [REPO_STRUCTURE.md](REPO_STRUCTURE.md)
- [WORKSTREAMS.md](WORKSTREAMS.md)
- [OWNERSHIP.md](OWNERSHIP.md)
- [TEST_MATRIX.md](TEST_MATRIX.md)
- [EVALS.md](EVALS.md)

Active workspace and shared-package activation still has to land through `README.md`, `REPO_STRUCTURE.md`, `WORKSTREAMS.md`, `OWNERSHIP.md`, and local workspace guardrails in the same patch.
That now also applies to the active peer-foundation workspaces under `apps/peer/` and `packages/network-*`.

## Decisions

These files record accepted architecture and naming decisions that governed workspaces in this monorepo must inherit:

- [decisions/README.md](decisions/README.md)

## Papers

These files hold research manuscripts and publication-facing drafts derived from Boreal canon:

- [papers/README.md](papers/README.md)

## References

This file records the main standards and pattern sources behind the canon:

- [REFERENCES.md](REFERENCES.md)

## Why This Structure

The structure intentionally separates:

- thesis and explanation
- commercial category and market truth
- live-versus-target claim boundary
- reference taxonomy
- lifecycle behavior
- event contracts
- API contracts
- logical schema
- machine-readable baseline
- workspace topology and ownership
- verification and governance

This keeps implementation work from redefining the domain accidentally.

## Read Order

Read the canon in this order:

1. thesis
2. commercial canon
3. product positioning
4. brand voice
5. ICP and wedge
6. why now
7. competitive map
8. business model
9. pitch facts
10. live versus target
11. taxonomy
12. state machines
13. event model
14. API contracts
15. request processing
16. request plan model
17. tool calling contracts
18. logical schema
19. repo structure
20. workstreams
21. ownership
22. governance
23. tests
24. evals

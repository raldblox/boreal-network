# Strategy Workspace

This folder holds Boreal's product-shaping and go-to-market working docs.

These files are downstream of canon.
They exist to make Boreal easier to package, prioritize, test, and explain without redefining the core model.

## Purpose

Use this folder for:

- market segmentation
- ICP sharpening
- landing-page and narrative structure
- quality bar definition
- first-wedge decision support
- proof and validation framing

Do not use this folder to silently change:

- canonical objects
- status names
- event meaning
- live-versus-target boundaries
- repo topology truth

If a strategy doc implies a change to canon, update canon first or in the same patch.

## State Register

Last reviewed: 2026-06-01.

Use `../DOC_LIFECYCLE.md` for state definitions.
Strategy docs are downstream of canon and should not override live-versus-target boundaries.

| File | State | Implementation state | Current reading | Review trigger |
| --- | --- | --- | --- | --- |
| [ICP_MATRIX.md](ICP_MATRIX.md) | `reference` | Market-shaping guidance | Primary ICP and excluded-user filter still apply. | Review after three paid pilots or any wedge change. |
| [WHY_NOW_AND_WHY_THIS_MARKET.md](WHY_NOW_AND_WHY_THIS_MARKET.md) | `reference` | Evidence-sensitive market memo | Useful timing memo, but evidence freshness matters more than file age. | Review before investor material, public launch copy, or monthly while fundraising. |
| [LANDING_PAGE_MESSAGING_FRAMEWORK.md](LANDING_PAGE_MESSAGING_FRAMEWORK.md) | `active` | Copy and page-architecture guidance | Current messaging framework for homepage and wedge pages. | Review before homepage, landing-page, or public-solution copy changes. |
| [FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md](FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md) | `active` | Worker instruction | Current guardrails for request-grant, public-solution, inspect, and run-with-credits copy. | Review before frontend or hero-copy worker runs. |
| [REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md](REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md) | `active` | UX blueprint | Current revamp blueprint for request board, workroom, account, credits, supply, and public solutions. | Review before major web IA or request-room changes. |
| [REQUEST_WORKROOM_V2_UX_PLAN.md](REQUEST_WORKROOM_V2_UX_PLAN.md) | `active` | Focused workroom UX plan | Current implementation guidance for request workroom cards, flow orientation, right object viewer, supply search, activity, artifacts, and reusable path iteration. | Review before changing request tracker, flow canvas, activity, artifacts, or supply routing UI. |
| [PATH_BUILDER_V1_UX_PLAN.md](PATH_BUILDER_V1_UX_PLAN.md) | `active` | V1 UX plan | Current guidance for request-owned Path Builder surfaces. | Review when Path Builder implementation lands or changes scope. |
| [AGENT_NATIVE_USAGE_BLUEPRINT.md](AGENT_NATIVE_USAGE_BLUEPRINT.md) | `active` | Agent usage blueprint | Current guidance for agent discovery, agent UX, protocol mapping, requester/solver/monitor roles, and agent-ready roadmap. | Review before adding agent discovery, MCP, A2A, agent auth, x402, or public agent-write surfaces. |
| [SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md](SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md) | `pilot_active` | Long-running gate plan | Current durable queue for pilot, self-serve buyer, curated supply, and public-market readiness. | Review in every patch that completes or changes a gate item. |
| [PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md](PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md) | `pilot_active` | Gate 1 verification checklist | Current narrow pilot verification checklist; not broad marketplace proof. | Review before any public or semi-public pilot demo. |
| [PUBLIC_PILOT_OPERATOR_RUNBOOK.md](PUBLIC_PILOT_OPERATOR_RUNBOOK.md) | `pilot_active` | Operator runbook | Current support procedure for narrow public or semi-public pilots. | Review before pilot ops, support, refund, blocker, or artifact review changes. |
| [PUBLIC_PILOT_OBSERVABILITY.md](PUBLIC_PILOT_OBSERVABILITY.md) | `pilot_active` | Observability notes | Minimum operator-visible pilot signals. | Review before pilot telemetry or observability changes. |
| [FIRST_PARTY_SERVICE_SUPPLY_SKUS.md](FIRST_PARTY_SERVICE_SUPPLY_SKUS.md) | `active` | Service packaging spec | Current first-party service families, preset plans, and launch pricing. | Review after real sales, pricing change, or fulfillment evidence change. |
| [UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md](UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md) | `active` | Direct-link and credit spec | Current canon-safe spec for unlisted service links and first-party credits. | Review when checkout, credit, ledger, or request-funding code changes. |
| [360_PRODUCT_QUALITY_CHECKLIST.md](360_PRODUCT_QUALITY_CHECKLIST.md) | `reference` | Quality bar | Current product-quality rubric, not a launch claim by itself. | Review before using it as launch-readiness proof. |

Related canon:

- [../REQUEST_PLAN_MODEL.md](../REQUEST_PLAN_MODEL.md) - Boreal's plan meaning, code audit, and worker rules for keeping `Plan` as a request-owned process lens
- [../REQUEST_UX_NOTES.md](../REQUEST_UX_NOTES.md) - End-to-end request UX guardrails from intake through proof and resolution
- [../decisions/0016-open-request-room-as-monitored-workroom.md](../decisions/0016-open-request-room-as-monitored-workroom.md) - Accepted open request room behavior boundary
- [../decisions/0018-request-flow-view-as-process-projection.md](../decisions/0018-request-flow-view-as-process-projection.md) - Accepted request flow view behavior boundary

## Suggested Read Order

1. [../ICP_AND_WEDGE.md](../ICP_AND_WEDGE.md)
2. [../WHY_NOW.md](../WHY_NOW.md)
3. [ICP_MATRIX.md](ICP_MATRIX.md)
4. [WHY_NOW_AND_WHY_THIS_MARKET.md](WHY_NOW_AND_WHY_THIS_MARKET.md)
5. [LANDING_PAGE_MESSAGING_FRAMEWORK.md](LANDING_PAGE_MESSAGING_FRAMEWORK.md)
6. [FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md](FRONTEND_AND_HERO_COPY_AGENT_BRIEF.md)
7. [../REQUEST_PLAN_MODEL.md](../REQUEST_PLAN_MODEL.md)
8. [REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md](REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md)
9. [REQUEST_WORKROOM_V2_UX_PLAN.md](REQUEST_WORKROOM_V2_UX_PLAN.md)
10. [PATH_BUILDER_V1_UX_PLAN.md](PATH_BUILDER_V1_UX_PLAN.md)
11. [AGENT_NATIVE_USAGE_BLUEPRINT.md](AGENT_NATIVE_USAGE_BLUEPRINT.md)
12. [SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md](SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md)
13. [PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md](PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md)
14. [PUBLIC_PILOT_OPERATOR_RUNBOOK.md](PUBLIC_PILOT_OPERATOR_RUNBOOK.md)
15. [PUBLIC_PILOT_OBSERVABILITY.md](PUBLIC_PILOT_OBSERVABILITY.md)
16. [FIRST_PARTY_SERVICE_SUPPLY_SKUS.md](FIRST_PARTY_SERVICE_SUPPLY_SKUS.md)
17. [UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md](UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md)
18. [360_PRODUCT_QUALITY_CHECKLIST.md](360_PRODUCT_QUALITY_CHECKLIST.md)

## Working Rule

The job of this folder is not to make Boreal sound impressive.
The job is to keep Boreal legible, specific, and testable in the real market.

Do not use a strategy doc for implementation authority unless its state register row says `active` or `pilot_active`.
Use `reference` docs for context and quality checks, not as live work queues.
Move parked, superseded, or archived docs out of active read paths.

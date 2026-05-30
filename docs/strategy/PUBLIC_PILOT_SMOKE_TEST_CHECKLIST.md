# Public Pilot Smoke Test Checklist

This checklist is the repeatable verification surface for Gate 1 of the self-serve marketplace launch plan.
It is narrower than broad public marketplace readiness and should not be used to justify open marketplace claims.

## Automated Checks

Run these from the monorepo root before a public or semi-public pilot demo:

- `pnpm web:build`
  - verifies the web app compiles without build-time Google Font fetches or other flaky remote font dependencies
- `pnpm run evals:request-processing:sample`
  - compares a deterministic actual request-processing sample against its fixture
- `pnpm run evals:request-processing`
  - validates all request-processing eval fixture shapes
- `pnpm contracts:validate`
  - validates canonical JSON Schema files, deterministic fixture JSON, and active OpenAPI or AsyncAPI contract files
- `pnpm peer:build`
  - verifies the runnable peer foundation parses under Node
- `pnpm desktop:build`
  - verifies the desktop shell production bundle compiles

## Manual Pilot Path

Use one seeded or real pilot lane and confirm each step from canonical records:

1. Buyer creates or opens one eligible `Request`.
2. Payment or buyer-credit state is explicit before funded work proceeds.
3. Public or cross-actor work uses a `Commitment` before fulfillment starts.
4. Owner acceptance is recorded when the commitment gate applies.
5. `Fulfillment` starts, records progress, and does not create a second request root.
6. Delivered proof lands as an `Artifact`, not inline request history.
7. Funded work exposes request-attached `Transaction` truth.
8. Workroom activity is derived from durable `RequestEvent`, `Commitment`, and `Artifact` records rather than an ephemeral transcript.
9. Public request listings expose only public-safe fields.
10. Desktop execution remains an execution participant and writes back to Boreal web truth.

## Pilot Claim Review

Before using public copy, verify that it matches `docs/LIVE_VS_TARGET.md`:

- say buyer-funded request pilots, not broad public marketplace
- say curated or whitelisted supply, not open supply liquidity
- say public-safe request projections, not full private request detail
- say desktop and peer runtimes participate in execution or transport, not request truth
- do not claim public solution runs, request grants, or public-market publish lanes as fully live unless a later gate proves them

## Evidence Rule

Mark a Gate 1 checklist item complete in `docs/strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md` only when there is matching evidence in code, docs, schemas, fixtures, tests, or deployed behavior.

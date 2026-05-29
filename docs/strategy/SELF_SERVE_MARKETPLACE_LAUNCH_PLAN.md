# Self-Serve Marketplace Launch Plan

This plan is the durable long-running work queue for moving Boreal from the current pilot-capable baseline toward a functional self-serve marketplace.

It is intentionally downstream of root canon.  It must not redefine `Request`, `Supply`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent` semantics.
When a checklist item changes meaning, lifecycle, status, event names, API behavior, or machine-readable contract shape, update the relevant canon and schema files in the same patch before implementation continues.

## Goal

Build Boreal into a functional self-serve marketplace for request-native work commerce.

The target launch shape is:

- buyers can create, fund, monitor, accept, and review durable `Request` threads
- curated and then broader supply can discover eligible demand and respond through canonical `Commitment` and `Fulfillment` lanes
- artifacts, proof, payments, credits, and payouts stay attached to durable request truth
- public request and public solution surfaces are projections over canonical records, not new roots
- desktop and peer runtimes can participate in execution without becoming competing ledgers
- launch claims stay bounded by `docs/LIVE_VS_TARGET.md`

## Launch Gates

Use these gates as the long-running operating model.  Do not skip a gate by renaming unfinished target-direction work as live capability.

### Gate 0 — Plan And Claim Alignment

Purpose: make the launch plan itself durable and keep future work from drifting into overclaim.

Checklist:

- [x] Create this long-running launch plan under `docs/strategy/`.
- [ ] Add or update issue tracker labels or project lanes to mirror the gates in this file.
- [ ] Re-check `docs/LIVE_VS_TARGET.md` before any public copy, investor update, demo, launch post, or marketplace claim.
- [ ] Keep the public claim at `paid request pilots first` until the pilot gate is satisfied.
- [ ] Keep broad marketplace language out of production copy until the broad public launch gate is satisfied.

Exit criteria:

- the team can point agents and humans at one durable plan before continuing marketplace work
- launch claims are explicitly tied to canon-locked or machine-modeled truth

### Gate 1 — Public Pilot Must-Fix

Purpose: make a narrow public or semi-public pilot safe enough to expose to real buyers and curated supply.

This gate corresponds to the previously identified `must-fix before any public pilot` checklist.

Checklist:

- [x] Make the web production build deterministic.
  - Completed: `apps/web/app/layout.tsx` no longer imports Google-hosted fonts through `next/font/google`; shared UI CSS now defines local system fallback font variables.
  - Evidence: `pnpm web:build` passes without fetching Google Fonts.
- [x] Define the pilot launch scope in `docs/LIVE_VS_TARGET.md` without weakening target-direction boundaries.
  - Completed: `docs/LIVE_VS_TARGET.md` now has a `Public Pilot Boundary` section with safe and unsafe pilot claims.
- [x] Keep the external motion to buyer-funded request pilots plus curated supply whitelist.
  - Completed in claim boundary: public launch language stays at buyer-funded request pilots and curated or whitelisted supply until broader public lanes are proven.
- [x] Run request-processing validation against actual outputs, not only fixture shape.
  - Completed: `pnpm run evals:request-processing:sample` compares `fixtures/request/eval-complex-human-planning-and-match.actual.sample.json` against its fixture.
- [ ] Confirm the first request-to-fulfillment happy path against one real or seeded pilot scenario.
  - buyer creates or opens a `Request`
  - payment or buyer-credit state is explicit
  - responder or first-party supply creates a `Commitment` when required
  - owner accepts the commitment when required
  - `Fulfillment` starts and records progress
  - accepted `Artifact` lands outside the request root
  - `Transaction` truth is visible for funded work
  - `RequestEvent` activity is replay-safe enough for the workroom timeline
- [x] Confirm owner-private auto-fulfillment does not leak into public or cross-actor lanes.
  - Completed: `pnpm web:test:request-boundaries` verifies direct owner-private fulfillment is allowed only for the owner, private visibility, and no commitment id.
- [x] Confirm public-safe request listing excludes owner-only fields and planner-internal fields.
  - Completed: `pnpm web:test:request-boundaries` verifies public request projections omit routing and planner-internal matching fields.
- [ ] Confirm desktop execution remains an execution participant and not a second request ledger.
- [x] Document manual operator procedures for pilot support, refunds, blocked fulfillments, provider failures, and artifact review.
  - Completed: `docs/strategy/PUBLIC_PILOT_OPERATOR_RUNBOOK.md` covers manual pilot flow, refunds, blocked fulfillment, provider failures, artifact review, and escalation triggers.
- [x] Add a short pilot smoke-test checklist to the relevant app or test docs once the first pilot lane is stable.
  - Completed: `docs/strategy/PUBLIC_PILOT_SMOKE_TEST_CHECKLIST.md` records automated checks, manual pilot path checks, and pilot claim review.

Exit criteria:

- `pnpm web:build` passes in the intended deploy environment
- request-processing evals compare at least one actual output against a fixture
- one buyer-funded or buyer-credit-backed request can move through the intended pilot path without ad hoc data mutation
- public copy says pilot, curated supply, and request-native work commerce rather than broad public marketplace

### Gate 2 — Pilot Hardening

Purpose: make the first pilot repeatable enough that each new request does not require engineering intervention.

Checklist:

- [x] Add contract validation for active OpenAPI and AsyncAPI files in CI or a repeatable local command.
  - Completed: `pnpm contracts:validate` checks active OpenAPI and AsyncAPI contract files for required top-level contract structure and merge-marker safety.
- [x] Add schema validation for canonical JSON Schema examples or fixtures.
  - Completed: `pnpm contracts:validate` parses canonical JSON Schema files and deterministic fixture JSON files, including BOM-safe reads.
- [x] Expand fixtures for at least one blocked fulfillment, one retryable provider handoff failure, and one artifact revision path.
  - Completed: `fixtures/fulfillment/pilot-blocked-retry-artifact-revision.json` captures a blocked fulfillment, retryable provider handoff failure, artifact revision request, durable events, and invariants.
- [ ] Add request-room replay checks for durable activity derived from `RequestEvent`, `Commitment`, and `Artifact` records.
- [ ] Add idempotency checks for payment, credit, commitment, artifact, and fulfillment mutation surfaces that can replay.
- [ ] Add authorization checks for owner reads, public projections, resolver tokens, and supply owner boundaries.
- [x] Add observability notes for payment settlement, provider handoff, fulfillment blocking, and artifact acceptance.
  - Completed: `docs/strategy/PUBLIC_PILOT_OBSERVABILITY.md` defines minimum pilot signals for payment settlement, provider handoff, blocked fulfillment, artifact acceptance, and dashboard gates.
- [x] Make the operator workflow explicit for manually curating supply and resolving stuck requests.
  - Completed: `docs/strategy/PUBLIC_PILOT_OPERATOR_RUNBOOK.md` records the first pilot operator workflow and canonical evidence requirements.
- [x] Keep `docs/TEST_MATRIX.md` aligned as new test families become executable.
  - Completed for this slice: `docs/TEST_MATRIX.md` names the executable request-boundary projection and owner-private fulfillment checks.

Exit criteria:

- the pilot can be repeated by an operator using documented steps
- known failure modes create canonical records instead of private side channels
- tests or evals cover the first blocked/retry/revision cases

### Gate 3 — Self-Serve Buyer Core

Purpose: reduce buyer dependence on founder/operator intervention.

Checklist:

- [ ] Complete regular account auth direction without collapsing resolver approval into account auth.
- [ ] Make buyer request intake, draft save, open, funding, and workroom monitoring usable without direct operator handholding.
- [ ] Make budget, timing, constraints, seeking fields, and preferred supply selection clear in the request UI.
- [ ] Make request activity understandable as durable business history, not chat transcript history.
- [ ] Support buyer-credit account, ledger, top-up, apply, and request-attached `Transaction` visibility for first-party funded lanes.
- [ ] Keep public solution inspection free by default and separate from credit-consuming runs.
- [ ] Define buyer-facing refund, cancellation, blocked work, and artifact acceptance states in product copy and canonical behavior.
- [ ] Add end-to-end smoke tests for buyer create/open/fund/monitor/accept flows.

Exit criteria:

- a buyer can start and fund an eligible request without engineering intervention
- the buyer can understand request status, proof, artifact, and payment state from the UI
- support can diagnose the request from canonical records

### Gate 4 — Curated Supply Self-Serve

Purpose: let approved supply participate without requiring internal operators to manually bridge every step.

Checklist:

- [ ] Complete owner-scoped and responder-scoped supply reads needed for approved supply.
- [ ] Complete responder request discovery for eligible public or invited requests.
- [ ] Complete direct commitment proposal, acceptance, fulfillment start, fulfillment update, artifact delivery, and retry flows for curated supply.
- [ ] Keep public or cross-actor work behind commitment gates unless canon explicitly allows a direct lane.
- [ ] Make supply visibility states and publish lanes clear: private, unlisted, curated public, and broader public when allowed.
- [ ] Add supply authorization and ownership tests.
- [ ] Add responder workroom tests for commitment and artifact writes.
- [ ] Add participant-scoped engaged-request inbox or equivalent safe return path before supply can reliably self-serve active work.

Exit criteria:

- curated supply can find, respond to, execute, and deliver eligible work through canonical records
- owner-private desktop assumptions cannot affect public or cross-actor supply lanes
- support can audit who did what through durable activity

### Gate 5 — Public Marketplace Readiness

Purpose: prepare for broader public launch while preserving request-native truth and marketplace safety.

This gate corresponds to the previously identified `must-fix before broad public launch` checklist.

Checklist:

- [ ] Broaden OpenAPI coverage for request, supply, participant, transaction, resolver-session, webhook, and public projection surfaces.
- [ ] Broaden AsyncAPI or event contract coverage for durable event streams beyond the first request-room lane.
- [ ] Add richer golden fixtures for failure, replay, dispute, collective fulfillment, private-supply paths, and public-market paths.
- [ ] Finish broader supply discovery, responder reads, and public market publish lanes.
- [ ] Finish public solution surfaces as projections over completed requests with accepted artifacts.
- [ ] Finish credit-metered solution runs that create or use a run `Request` before debiting credits.
- [ ] Finish request-grant support only within the accepted non-investment, non-donation boundary.
- [ ] Finish isolated worker mode for public or external untrusted request execution.
- [ ] Finish encrypted-at-rest handling for external trace material if public execution records require it.
- [ ] Add fraud, abuse, spam, dispute, refund, and moderation operating procedures.
- [ ] Add trust-and-safety review around public request publishing and public supply publishing.
- [ ] Add payment and payout reconciliation checks for production settlement.
- [ ] Add launch dashboards for request intake, funding, fulfillment progress, artifact acceptance, blocked work, refunds, and disputes.

Exit criteria:

- public buyers and approved public supply can transact without private operator-only bridges for normal happy paths
- public marketplace claims are backed by machine-readable contracts, fixtures, tests, and production behavior
- public solution and credit claims are backed by request-attached transaction truth
- unsafe public execution is isolated or explicitly unavailable

### Gate 6 — Broad Public Launch

Purpose: launch the self-serve marketplace without claiming target-direction work as already shipped.

Checklist:

- [ ] Re-audit public copy against `docs/PITCH_FACTS.md` and `docs/LIVE_VS_TARGET.md`.
- [ ] Re-run build, contract, lifecycle, invariant, authorization, idempotency, eval, and smoke-test suites.
- [ ] Verify all public marketplace routes are covered by auth, rate limit, moderation, and observability expectations.
- [ ] Verify public request, public supply, and public solution projections expose only approved fields.
- [ ] Verify payment, credit, refund, payout, and webhook replay behavior is idempotent.
- [ ] Verify support can inspect canonical request, commitment, fulfillment, artifact, transaction, and event state for any launched lane.
- [ ] Create a launch rollback and incident response plan.
- [ ] Update `docs/LIVE_VS_TARGET.md` only after the shipped behavior is actually live or machine-modeled.

Exit criteria:

- the launch can be described as a functional self-serve marketplace without contradicting canon
- normal buyer and supply paths are self-serve
- abnormal paths are at least supportable from canonical truth

## Ongoing Work Rules

- Prefer small patches that close one checklist item and update this plan in the same branch.
- Mark checklist items complete only when evidence exists in code, docs, schemas, fixtures, tests, or deployed behavior.
- Do not let `apps/web` or `apps/desktop` redefine root object semantics locally.
- Do not introduce a new root object for public solutions, request grants, workflow packs, or credits without first updating canon.
- If a change crosses API, event, lifecycle, schema, payment, or public-claim boundaries, update the corresponding canon and machine-readable contracts in the same patch.
- If a launch claim is true only for one curated lane, say that directly.

## Recommended Next Work Sequence

1. Fix deterministic web build by removing or hardening build-time remote font dependency.
2. Add a pilot-scope section to `docs/LIVE_VS_TARGET.md` that names the exact public pilot claim boundary.
3. Run request-processing evals with one actual output and record the expected command in the pilot smoke checklist.
4. Add or verify one seeded happy path for buyer request, funding or credit, commitment if required, fulfillment, artifact, transaction, and request activity.
5. Add public-safe projection tests before widening request browsing.
6. Add curated responder/supply return-path work before inviting more supply.
7. Expand OpenAPI, AsyncAPI, fixtures, and idempotency checks before broad public marketplace claims.

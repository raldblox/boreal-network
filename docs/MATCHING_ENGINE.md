# Matching Engine

This document defines Boreal's current matching-facing fingerprint catalog, the live lead-first matching pipeline inside `apps/web`, and the structured gaps that still remain.

It is not a claim that Boreal already runs a dedicated search service.
It is the canon note for how matching should behave with the current repo-truth implementation.

## Purpose

Boreal should match like an indexed fingerprint system, not like a full catalog scan.

The core rule is:

- normalize request and supply into compact structured fingerprints
- retrieve a bounded candidate set
- score the lead first
- add collaborators only after the lead route is credible
- keep all planner outputs read-only under `Request.derived`

## Current Live Pipeline

1. Request intake writes or updates one durable `Request`.
2. The request-briefing layer normalizes structured fields into canon-locked fingerprint enums where those enums already exist.
3. The planner derives embodied requirements, verification requirements, role slots, phase plans, and outcome claims.
4. Candidate retrieval still happens through the current web query lane, which is mostly visibility, owner-scope, and published-supply filtering plus bounded recency ordering.
5. Retrieved supplies are scored against role slots through `buildRequestMatchCandidate`.
6. Lead ranking is derived first.
7. Role matches and assignment proposal are derived from the lead-first candidate view.
8. `Request.derived.matchCandidates`, `leadRanking`, `roleMatches`, and `assignmentProposal` remain request-owned projections, not attached execution truth.

## Canonical Fingerprints

### Actor Kinds

`human`, `agent`, `tool`, `organization`, `runtime`

### Supply Kinds

`agent_worker`, `ai_automation`, `automation_builder`, `desktop_runtime`, `digital_product`, `documentation_support`, `field_inspection`, `field_verification`, `generalist`, `hardware_ops`, `human_service`, `local_runner`, `migration_lead`, `operations_build`, `operations_support`, `operator`, `pickup_dropoff`, `provider_capability`, `qa_documentation`, `reporting_support`, `runtime_executor`, `team_service`, `video_generation`

### Output Kinds

`automation_build`, `delivery`, `delivery_confirmation`, `draft`, `file`, `handoff_doc`, `handoff_receipt`, `inspection_report`, `issue_log`, `media`, `migration_plan`, `operator_training`, `photo_evidence`, `serial_inventory`, `signature`, `verification_note`, `video`, `workflow_build`, `workflow_map`

### Execution Channels

`api`, `async_thread`, `instant_download`, `operator_review`, `request_room`, `resolver_runtime`

### Execution Modes

`remote_digital`, `remote_sync`, `onsite_visit`, `field_inspection`, `pickup_dropoff`, `witnessed_handoff`

### Team Mode

`solo_or_team`

### Route Families

`worker_market`, `direct_specialist`, `direct_tool`, `no_good_fit`

`no_good_fit` is canon-allowed but not yet produced by the current web route-selection code.

### Execution Kinds

`instant_delivery`, `hybrid_tool_room`, `provider_api`, `local_runtime`, `hybrid_human_agent`, `human_request_room`, `agent_request_room`, `runtime_request_room`, `specialist_request_room`

### Payment Modes

`fixed_funded_request`, `fixed_request`, `range_quote`, `quote_request`, `open_pricing`

### Matching Modes

`lead_first_then_collaborators`, `preferred_supply_direct`, `preferred_supply_tool`

### Evidence Claims

`delivery_confirmation`, `handoff_signature`, `photo_proof`, `serial_number_capture`, `timestamped_photos`, `verification_note`, `written_report`

### Role Keys

`agent_lead`, `agent_operator`, `ai_automation`, `automation_builder`, `courier_runner`, `delivery_lead`, `digital_product`, `documentation_support`, `field_inspector`, `field_technician`, `generalist`, `hardware_ops`, `human_lead`, `migration_lead`, `onsite_operator`, `operations_build`, `operations_support`, `operator`, `organization_lead`, `qa_documentation`, `reporting_support`, `runtime_lead`, `runtime_operator`, `service_lead`, `specialist_lead`, `support_role`, `team_service`, `tool_lead`, `tool_operator`, `video_generation`, `witness_operator`

### Phase Keys

`clarify_constraints`, `execute_delivery`, `field_execution`, `handoff_execution`, `handoff_review`, `onsite_execution`, `proof_delivery`, `scope_route`, `witness_execution`

## Canonical Role Normalization

The current planner now treats these supply-kind to role-key mappings as canonical:

- `field_inspection -> field_inspector`
- `field_verification -> field_technician`
- `human_service -> service_lead`
- `agent_worker -> agent_operator`
- `provider_capability -> tool_operator`
- `runtime_executor -> runtime_operator`
- `desktop_runtime -> runtime_operator`
- `local_runner -> courier_runner`
- `pickup_dropoff -> courier_runner`

This keeps embodied eval fixtures aligned with the lead-role output instead of leaking raw supply-kind labels into planning roles.

## Type-Safe Surfaces

The current repo now treats these surfaces as enum-backed rather than freeform strings:

- `apps/web/lib/request.ts`
- `apps/web/lib/supply.ts`
- `apps/web/lib/request-planner.ts`
- `apps/web/lib/request-server.ts`
- `apps/web/lib/ai/tools/request-briefing-shared.ts`
- `apps/web/lib/ai/tools/create-request-brief.ts`
- `apps/web/lib/ai/tools/update-request-brief.ts`
- `apps/web/lib/ai/tools/update-request-constraints.ts`
- `apps/web/lib/ai/tools/update-request-route-summary.ts`
- `apps/web/app/(chat)/api/supplies/[id]/route.ts`
- `apps/web/lib/boreal-workers/types.ts`
- `apps/web/scripts/run-request-processing-live-benchmark.ts`
- `schemas/json/common.schema.json`
- `schemas/json/request.schema.json`
- `schemas/json/supply.schema.json`
- `schemas/openapi/request-briefing.openapi.yaml`
- `schemas/openapi/supply-management.openapi.yaml`

## What Is Still Missing

These matching dimensions are still only partially structured or still missing a stronger contract:

- `serviceLocation` is still freeform text instead of a typed geography fingerprint.
- `timeWindows` are still freeform strings instead of normalized schedule windows.
- `accessRequirements` and `safetyRequirements` are still freeform strings.
- `brief.constraints` is still a mixed extension bag and not a fully typed planner contract.
- budget and deadline are structured, but Boreal still lacks normalized matching-side budget buckets, urgency buckets, and SLA fingerprints.
- trust, reputation, proof capability, and prior completion quality are not yet modeled as stable typed retrieval fingerprints.
- the current web retrieval layer is still not a dedicated indexed matcher; it is a bounded candidate query plus planner reranking.
- `no_good_fit` is canon-allowed but does not yet have a dedicated classifier in the live route derivation path.

## Next Matching Steps

1. Keep this enum catalog as the only allowed source for current structured matching fingerprints.
2. Move candidate retrieval from lane-plus-recency selection toward indexed retrieval over `supplyKinds`, `actorKinds`, `outputKinds`, proof capability, execution channel, geography, and availability.
3. Add explicit hard filters before reranking.
4. Add dedicated trust and proof-capability fingerprints.
5. Add normalized geography and scheduling fingerprints.
6. Add a real `no_good_fit` path when no credible lead route survives retrieval and filtering.

## Fixture-Backed Evaluation

The repo now has one fixture-backed live matcher runner:

- `apps/web/scripts/run-request-processing-matcher-benchmark.ts`

That runner consumes:

- one runnable `requestPatch` per eval fixture
- full `candidateSupplies` snapshots shaped like real `Supply` drafts
- the shared contract scoring in `tests/contracts/request-processing-eval-lib.mjs`

This keeps Boreal's matching eval lane grounded in the actual planner and matcher code instead of only hand-written sample actuals.

## Current Gap Profile

The current `web-live` benchmark is now good enough to expose real matching misses:

- the complex migration scenario can still misrank the lead lane even when the correct lead remains inside top-3
- embodied scenarios still under-spec some proof-package artifacts compared with the stricter fixture expectations
- optional documentation support can still over-attach or map to the wrong candidate even when the lead lane is correct

Those are matching and planning quality gaps, not fixture-shape gaps.

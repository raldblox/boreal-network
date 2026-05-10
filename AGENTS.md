# Repository Guidelines

## Scope

This `AGENTS.md` applies to the entire `C:\Users\raldb\boreal-network` repository unless a deeper directory adds a more specific `AGENTS.md`.

This repo is the canonical domain and contract source for Boreal Network.
Treat it as a control plane for meaning, not a scratchpad.

## Mission

- Keep Boreal Network request-native.
- Keep the domain model durable and explicit.
- Keep contracts machine-readable and human-readable in sync.
- Prevent object drift, naming drift, status drift, and event drift.
- Refuse speculative implementation changes when the canon is unclear.

## Required Read Order

Before editing anything substantial, read:

1. `README.md`
2. `docs/NETWORK_THESIS.md`
3. `docs/OBJECT_TAXONOMY.md`
4. `docs/STATE_MACHINES.md`
5. `docs/EVENT_MODEL.md`
6. `docs/API_CONTRACTS.md`
7. `docs/SCHEMA_LOGICAL.md`
8. `docs/GOVERNANCE.md`
9. `docs/TEST_MATRIX.md`

Do not skip this order.

## Canonical Terms

Use these names exactly in core design work:

- `Actor`
- `Supply`
- `Request`
- `RequestParticipant`
- `Commitment`
- `Fulfillment`
- `FulfillmentStep`
- `Artifact`
- `Transaction`
- `RequestEvent`

Usage rules:

- `Request` is the durable root object for demand and the main work thread.
- `Supply` is the canonical opposite-side object.
- `Commitment` is the commercial and approval object.
- `Fulfillment` is the execution truth object.
- `FulfillmentStep` is worker-generated or system-generated sub-work under one fulfillment.
- `RequestEvent` is the append-only history ledger.
- `Artifact` is output, proof, receipt, signature, file, media, or delivery object.
- `Transaction` is the payment and settlement record.

Forbidden core synonyms:

- Do not use `Work` as the root object name.
- Do not use `Job` as the root object name.
- Do not use `Order` as the root object name.
- Do not use `Issue` as the root object name.
- Do not use `Offer` as a canonical schema object. `Offer` may exist as UI language only.
- Do not use `Intent` as the durable root object. It is extraction or draft language only.

## Non-Negotiable Domain Rules

- `Request` stays the durable root object.
- One request should survive intake, routing, funding, execution, delivery, and review instead of spawning disconnected workflows.
- Generated worker sub-work should default to `FulfillmentStep`, not a new `Request`.
- Create a new `Request` only when separate funding, separate ownership, separate market routing, or separate review boundaries are required.
- Do not store full message history, artifact history, and transaction history inline on the `Request` root. Keep summary state on the root and full history in `RequestEvent`, `Artifact`, and `Transaction`.
- Do not introduce root objects that duplicate `Commitment`, `Fulfillment`, or `Transaction` semantics without first updating the canon.

## Documentation-First Rule

This repo is docs-first.

If a change affects meaning, lifecycle, naming, or contract behavior, update the canon first in the same patch.
Do not write implementation code that relies on undocumented semantics.

When a concept is unclear:

- stop
- document the decision or gap
- then implement

Do not guess.

## Required Sync Rules

If you change a root object:

- update `docs/OBJECT_TAXONOMY.md`
- update `docs/SCHEMA_LOGICAL.md`
- update `docs/TEST_MATRIX.md`
- update machine schemas in `schemas/json/` when they exist

If you change a lifecycle or status:

- update `docs/STATE_MACHINES.md`
- update `docs/EVENT_MODEL.md`
- update `docs/API_CONTRACTS.md` if external behavior changes
- update `docs/TEST_MATRIX.md`
- update machine schemas in `schemas/json/` and `schemas/openapi/` when they exist

If you add or rename an event:

- update `docs/EVENT_MODEL.md`
- update event contracts under `schemas/events/`
- update `docs/TEST_MATRIX.md`

If you add or change an external endpoint, webhook, or callback:

- update `docs/API_CONTRACTS.md`
- update OpenAPI under `schemas/openapi/`
- update event contracts under `schemas/events/` if async behavior changes
- update `docs/TEST_MATRIX.md`

If you change governance or contribution rules:

- update `AGENTS.md`
- update `docs/GOVERNANCE.md`
- update `README.md` if repo workflow changes

## Contract Standards

Use these standards unless a stronger reason is documented:

- JSON Schema for canonical object schemas in `schemas/json/`
- OpenAPI for HTTP and webhook contracts in `schemas/openapi/`
- AsyncAPI for async event contracts in `schemas/events/`

Do not invent ad hoc machine-readable formats when these standards fit.

## Event Rules

- Events are immutable.
- Events must have stable names.
- Events must be idempotent under replay.
- Events must carry enough identifiers for causation, correlation, and audit.
- Event payloads must not include secrets, private keys, or transient prompt internals that are not part of durable business truth.
- If an event name changes, version it. Do not silently mutate history semantics.

## Testing Rules

At minimum, this repo must preserve:

- contract tests
- lifecycle tests
- invariants
- authorization boundaries
- idempotency behavior
- replay safety
- transaction correctness

When adding schema or contracts, add corresponding fixture and test coverage plans in the same patch.

## File and Folder Rules

- Canon docs live in `docs/`.
- Machine-readable schemas live in `schemas/`.
- Physical schema and migrations live in `db/`.
- Deterministic samples live in `fixtures/`.
- Validation assets live in `tests/`.

Do not scatter canonical domain definitions across random files.

## Change Discipline

- Prefer additive changes first.
- When renaming a canonical concept, update every affected canon file in one patch.
- Keep files small, explicit, and cross-linked.
- Use diagrams only when they clarify state or ownership better than prose.
- Record unresolved decisions explicitly instead of burying them in comments.

## What Not To Do

- Do not implement from UI-first guesses.
- Do not add provider-specific fields to root objects unless they are truly durable business state.
- Do not collapse demand, commitment, fulfillment, and payment into one blob object.
- Do not let code define the model before the docs do.
- Do not add speculative abstractions "for later" without a concrete place in the taxonomy.
- Do not treat roadmap ideas as current truth.

## Commits

Use imperative commit messages such as:

- `Add Boreal Network thesis and taxonomy`
- `Define request event envelope`
- `Lock request and fulfillment state machines`

Keep commits scoped to one conceptual change when practical.

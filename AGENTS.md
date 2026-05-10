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
3. `docs/COMMERCIAL_CANON.md`
4. `docs/LIVE_VS_TARGET.md`
5. `docs/OBJECT_TAXONOMY.md`
6. `docs/STATE_MACHINES.md`
7. `docs/EVENT_MODEL.md`
8. `docs/API_CONTRACTS.md`
9. `docs/SCHEMA_LOGICAL.md`
10. `docs/REPO_STRUCTURE.md`
11. `docs/GOVERNANCE.md`
12. `docs/TEST_MATRIX.md`

If the task affects positioning, pitch, go-to-market, wedge, revenue model, or competitive framing, also read:

- `docs/PRODUCT_POSITIONING.md`
- `docs/ICP_AND_WEDGE.md`
- `docs/WHY_NOW.md`
- `docs/COMPETITIVE_MAP.md`
- `docs/BUSINESS_MODEL.md`
- `docs/PITCH_FACTS.md`
- `docs/LIVE_VS_TARGET.md`

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

## Commercial Truth Rules

- Pitch Boreal as `request-native work commerce`.
- Treat `chat-native` as the interface layer, not the category layer.
- Treat `intent-to-fulfillment` as thesis language, not the canonical root-object name.
- Lead with buyer demand, fulfillment continuity, and monetizable work outcomes.
- Do not lead with `libp2p`, `MCP`, `CRDT`, or transport as the business story.
- Do not pitch Boreal as a generic freelancer marketplace clone.
- Do not pitch Boreal as an internal employee copilot suite.
- Do not pitch Boreal as an agency-first services business.
- Commercial docs are canon for roast, pitch, and fundraising tasks. Do not replace them with improvised copy.
- Use `docs/LIVE_VS_TARGET.md` to separate canon-locked truth, machine-modeled truth, and target direction before making product or fundraising claims.

## Documentation-First Rule

This repo is docs-first.

If a change affects meaning, lifecycle, naming, or contract behavior, update the canon first in the same patch.
Do not write implementation code that relies on undocumented semantics.

When a concept is unclear:

- stop
- document the decision or gap
- then implement

Do not guess.

## Proactive Risk Rule

Agents must proactively warn, stop, or ask when a task could break existing meaning, behavior, contracts, or workspace safety.

Do not wait for the user to ask about risk.

Trigger this rule when a proposed action could:

- rename or weaken a canonical object
- change lifecycle meaning or status semantics
- change event names or payload meaning
- change external API behavior
- invalidate fixtures, tests, or projections
- create cross-workspace drift
- introduce an unregistered workspace or namespace
- replace stable canon with implementation-local assumptions
- perform destructive or hard-to-reverse repo actions

Required behavior:

- state the risk clearly
- name what could break
- name which canon files or workspaces are affected
- ask a blocking question when the change is ambiguous, destructive, or likely to cause semantic drift
- refuse silent breaking changes

Required visible format:

- start the message with `RISK ESCALATION`
- if the action is destructive, ambiguous, or hard to reverse, start with `BLOCKING RISK ESCALATION`
- keep the first five lines in this order:
  - `Risk:` one-sentence summary
  - `Impact:` what could break
  - `Scope:` affected canon files, contracts, or workspaces
  - `Safer path:` preferred lower-risk move
  - `Question:` one direct blocking question
- do not bury the risk below long explanation
- do not phrase the risk as a soft suggestion

Expected shape:

```text
BLOCKING RISK ESCALATION
Risk: This rename would weaken the canonical `Request` root object.
Impact: Taxonomy, state-machine, schema, and downstream workspace drift.
Scope: docs/OBJECT_TAXONOMY.md, docs/STATE_MACHINES.md, schemas/json/, apps/*
Safer path: Keep `Request` canonical and add the new term as UI language only.
Question: Do you want to preserve `Request` as canon and use the new term only at the surface layer?
```

If the risk is real but manageable:

- propose the safer path first
- explain the tradeoff
- then proceed only when the intended boundary is clear

## Required Sync Rules

If you change a root object:

- update `docs/OBJECT_TAXONOMY.md`
- update `docs/SCHEMA_LOGICAL.md`
- update `docs/TEST_MATRIX.md`
- update machine schemas in `schemas/json/` when they exist

If you change commercial category, positioning, wedge, why-now logic, competitive framing, or revenue model:

- update `docs/COMMERCIAL_CANON.md`
- update `docs/PRODUCT_POSITIONING.md`
- update `docs/ICP_AND_WEDGE.md`
- update `docs/WHY_NOW.md`
- update `docs/COMPETITIVE_MAP.md` if competitive implications changed
- update `docs/BUSINESS_MODEL.md` if monetization implications changed
- update `docs/PITCH_FACTS.md`
- update `docs/LIVE_VS_TARGET.md` if public-safe claims or target boundaries changed
- update `README.md` and `docs/README.md` if the read order or repo scope changed

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

## Workspace Expansion Rules

Reserved top-level namespaces:

- `apps/`
- `packages/`
- `skills/`
- `standards/`

Meaning:

- `apps/` is for deployable or runnable workspaces such as `web`, `mobile`, `desktop`, `extension`, `telegram-bot`, `marketing-site`, `docs-site`, `peer`, `peer-relay`, `gateway-http`, or `cli`.
- `packages/` is for reusable libraries, SDKs, npm packages, shared configs, generated clients, UI libraries, and shared transport code such as libp2p adapters.
- `skills/` is for reusable agent skills, prompt packs, and task modules.
- `standards/` is for Boreal-specific protocol profiles, implementation standards, and integration rules.

Workspace naming rule:

- name workspaces by product role or network role
- do not use vague infrastructure bucket names when a clearer role name exists
- if the workspace joins a libp2p-style network directly, prefer `peer` as the canonical runtime word
- if the workspace mainly bridges protocols or exposes an edge adapter, prefer `gateway-*`
- if the workspace is reusable code rather than a runnable surface, it belongs in `packages/*`

Do not create a new top-level folder unless:

- its purpose is registered in `docs/REPO_STRUCTURE.md`
- its boundaries do not conflict with existing canonical objects
- the root `README.md` and `AGENTS.md` are updated in the same patch
- a local `README.md` and local `AGENTS.md` are defined for that workspace

Every new workspace root must include:

- `README.md`
- `AGENTS.md`

Every code-bearing workspace should also define:

- how it relates to root canon
- build and test commands
- ownership boundaries
- what it may and may not redefine

Namespace-specific constraints:

- `apps/*` may define deployable surfaces, UI flows, clients, bots, CLI applications, peer nodes, caches, and local UX abstractions, but must not redefine canonical domain objects or lifecycle states.
- `packages/*` may define reusable code, SDKs, schemas, generated clients, shared transport libraries, and internal npm packages, but must not redefine request, commitment, fulfillment, transaction, or event semantics.
- `skills/*` may define reusable agent behavior and task packaging, but must not introduce conflicting contract or lifecycle names. If a skill needs executable shared code, place that code in `packages/*` and keep the skill definition in `skills/*`.
- `standards/*` may define recommended implementation profiles, compatibility rules, or adapter standards, but they must inherit root canon instead of overriding it.

Branding rule:

- brand guidance, naming, and lightweight messaging notes should stay in `docs/` until a dedicated asset-heavy workspace is justified
- marketing or docs websites belong in `apps/*`
- do not create a top-level `branding/` or `marketing/` namespace without first updating `docs/REPO_STRUCTURE.md`

Do not place implementation code at the repo root when it clearly belongs in one of those namespaces.

Do not create `network-node/` as a top-level namespace or preferred workspace name.
Use `apps/peer/` or `apps/peer-*` for runnable network participants, `apps/gateway-*` for bridges, and `packages/network-*` or `packages/libp2p-*` for shared networking code.

Do not create ad hoc top-level folders like `client`, `server`, `sdk`, `mobile-app`, `node2`, `tools2`, `bots`, or `marketing` when an existing namespace fits.

## Change Discipline

- Prefer additive changes first.
- When renaming a canonical concept, update every affected canon file in one patch.
- Keep files small, explicit, and cross-linked.
- Use diagrams only when they clarify state or ownership better than prose.
- Record unresolved decisions explicitly instead of burying them in comments.
- When creating a new workspace, add its local guardrails before implementation code lands.

## What Not To Do

- Do not implement from UI-first guesses.
- Do not add provider-specific fields to root objects unless they are truly durable business state.
- Do not collapse demand, commitment, fulfillment, and payment into one blob object.
- Do not let code define the model before the docs do.
- Do not add speculative abstractions "for later" without a concrete place in the taxonomy.
- Do not treat roadmap ideas as current truth.
- Do not silently continue when a requested action is likely to break canon, contracts, workspace boundaries, or durable history.

## Commits

Use imperative commit messages such as:

- `Add Boreal Network thesis and taxonomy`
- `Define request event envelope`
- `Lock request and fulfillment state machines`

Keep commits scoped to one conceptual change when practical.

# 0027 In-house Boreal agents scan and apply as workers

## Status

Accepted

## Date

2026-06-03

## Context

Boreal now has:

- durable `Request`, `Supply`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, and `RequestEvent` canon
- public request discovery and request-level `agentActionCardHints`
- direct commitment, artifact, and fulfillment routes for resolver-style runtimes
- one first-party `boreal-workers` execution layer in `apps/web`, with `video-generation` as the first shipped worker-backed supply

The next product need is to make opened requests discoverable to in-house Boreal agents and humans without turning Boreal into a hidden automation engine that silently completes requests.

The risk is that internal agents could drift into:

- prompt-only supplies that look buyable but have no execution authority
- invisible matching that assigns work before a worker applies or the owner approves
- provider callbacks or local runtime success being treated as completion
- duplicated workflow or task ledgers beside `Request`

## Decision

In-house Boreal agents are modeled through existing canon:

- `Actor` for the represented human, agent, runtime, or Boreal-managed account
- `Supply` for the published capability lane
- `Commitment` for the application, proposal, quote, assignment, or owner approval boundary
- `Fulfillment` for accepted execution truth
- `FulfillmentStep` for worker-generated sub-work
- `Artifact` for output, delivery, proof, receipt, media, or files
- `RequestEvent` for durable history

An in-house worker scanner is a read-only opportunity projection over opened requests.
It may rank candidate requests and build local opportunity cards, but it does not assign work, create approval, authorize spend, start fulfillment, prove completion, or write durable history by itself.

Applying as a worker means crossing a governed request boundary:

- public or cross-actor work uses `Commitment`, normally `kind: "proposal"` or `kind: "quote"`
- owner-private Boreal-managed worker execution may use the accepted direct fulfillment exception only when the request is owner-controlled, private, opened, and pinned to one published Boreal-managed supply
- auto-approval is owner-scoped policy that may accept or create the required execution boundary, but it must not skip into completed state

Codex Desktop, Boreal web workers, and future in-house named agents must all follow the same rule:

- they may scan
- they may prepare or submit an application when authorized
- they may start a fulfillment lane only through owner-private direct policy or accepted `Commitment`
- they may publish proof only as `Artifact`
- they may never treat prompt output, model/tool success, provider status, local stdout, or workflow execution as completion truth

Each first-party Boreal agent should have:

- a unique agent key and human name
- one stable API route under `/api/boreal-agents/{agentKey}`
- a reusable template with model bindings, provider bindings, tool bindings, task pipeline, qualification tags, skip rules, and contract fixtures
- machine-readable promotion gates that say whether the agent is `live_backed` or `target_blocked`, with required evidence for supply factory, execution contract, proof path, failure fixtures, and route-level mutation tests
- explicit environment bindings such as `OPENAI_API_KEY` for reasoning, rewriting, and multi-step planning, plus provider keys such as `RUNWAY_API_KEY` when the agent executes a provider-backed worker

An agent does not have to be one prompt.
It may run a sequence of typed task steps and tools internally, but only governed Boreal routes may create durable request truth.

The briefing and planning system should emit typed qualification tags on `seeking`, output kinds, execution kind, lead role, role slots, and match candidates.
Those tags are scanner filters only.
When the plan requires human presence, local access, witnessed handoff, field proof, or other non-substitutable human work, provider-only agents should not wake.

Manual planner input remains request-owned.
Prompt packs, reusable prompts, n8n workflows, skills, and provider prompts are support assets or implementation inputs.
They are not frontpage `Supply` unless they are backed by an executable supply profile with explicit capability, owner, availability, proof, and fulfillment boundaries.

## Implementation Order

1. Land this decision and the implementation standard.
2. Keep `video-generation` as the first live Boreal-managed worker-backed supply.
3. Add a typed in-house worker opportunity/application profile with named agent templates, per-agent API route shape, task pipeline, model or provider bindings, and planner qualification tags.
4. Add promotion gates and implementation boilerplate for more named agents before adding many specialized agents.
5. Wire any worker application route to `Commitment` or owner-private direct `Fulfillment`; do not create a separate application root.
6. Add route-level tests for worker scan, apply, owner auto-approval, blocked public direct fulfillment, idempotency replay, and proof-gated completion.
7. Add the humanizer/service-backed worker to live supply only when it has a real supply factory, failure fixtures, route-level mutation tests, and readiness tests. Target-only execution and proof contracts may land earlier when they remain outside the live worker registry.

## Consequences

Positive:

- in-house agents become easier to reason about because every action maps to existing request truth
- Boreal can wake only eligible workers instead of running broad LLM matching across every request
- owner-private auto-approval remains useful without weakening public or cross-actor safety
- prompt-based assets stay reusable without pretending to be executable supply

Tradeoffs:

- worker matching is intentionally not broad marketplace matching yet
- the first scanner can be deterministic and bounded before it becomes smart
- `Commitment.supplyId` and richer worker actor attribution still need follow-on implementation
- humanizer should not be listed as a starter worker until its supply factory, failure fixtures, and route-level mutation tests exist

Rejected:

- adding an `AgentStage` or `Task` root for internal workers
- letting an in-house agent silently complete a request from chat output
- making prompt-only assets buyable `Supply`
- treating n8n import/export as lossless Boreal request truth
- using live MCP, A2A, or x402 adapters as the first internal worker architecture

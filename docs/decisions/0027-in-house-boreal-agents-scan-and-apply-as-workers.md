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

Manual planner input remains request-owned.
Prompt packs, reusable prompts, n8n workflows, skills, and provider prompts are support assets or implementation inputs.
They are not frontpage `Supply` unless they are backed by an executable supply profile with explicit capability, owner, availability, proof, and fulfillment boundaries.

## Implementation Order

1. Land this decision and the implementation standard.
2. Keep `video-generation` as the first live Boreal-managed worker-backed supply.
3. Add a typed in-house worker opportunity/application profile only after the policy vocabulary is stable.
4. Wire any worker application route to `Commitment` or owner-private direct `Fulfillment`; do not create a separate application root.
5. Add route-level tests for worker scan, apply, owner auto-approval, blocked public direct fulfillment, idempotency replay, and proof-gated completion.
6. Add the humanizer/service-backed worker only when it has a real supply factory, execution contract, proof path, and readiness tests.

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
- humanizer should not be listed as a starter worker until its supply and execution factory exist

Rejected:

- adding an `AgentStage` or `Task` root for internal workers
- letting an in-house agent silently complete a request from chat output
- making prompt-only assets buyable `Supply`
- treating n8n import/export as lossless Boreal request truth
- using live MCP, A2A, or x402 adapters as the first internal worker architecture

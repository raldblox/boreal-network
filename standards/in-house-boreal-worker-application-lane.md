# In-house Boreal Worker Application Lane

## Status

Implementation standard.

## Version

0.1

## Purpose

This standard defines how Boreal-managed agents, named in-house workers, trusted human operators, and desktop resolver runtimes find and attach to opened requests.

It inherits root canon.
It does not create a new root object.

## Canon Boundary

Use existing objects:

- `Request` is the durable demand and work thread.
- `Supply` is the published capability lane.
- `Commitment` is the application, proposal, quote, assignment, or approval boundary.
- `Fulfillment` is the accepted execution lane.
- `FulfillmentStep` is worker-generated sub-work under one fulfillment.
- `Artifact` is output, proof, receipt, file, media, or delivery.
- `Transaction` is funding, credit, payout, refund, or settlement truth.
- `RequestEvent` is append-only history.

Do not introduce `AgentStage`, `Task`, `Workflow`, `Job`, `Order`, or `Offer` as canonical worker-application truth.

## Definitions

`In-house worker`

A Boreal-managed human, agent, runtime, provider-backed module, or desktop resolver lane that is represented by an actor context and one or more owned `Supply` records.

`Named Boreal agent`

One first-party Boreal agent with a unique agent key, human-readable name, stable API route, model bindings, tool bindings, task pipeline, qualification tags, and skip conditions.
The API route template is `/api/boreal-agents/{agentKey}`.

`Worker scanner`

A read-only request-opportunity pass over open request projections, owned requests, or owner-approved private requests.
It may compute local fit scores and local opportunity cards.
It does not mutate canonical objects.

`Worker application`

A governed write that says a represented worker wants to take the request.
For public or cross-actor lanes, the durable write is a `Commitment`.
For owner-private Boreal-managed direct lanes, the durable execution write is a `Fulfillment` only when the direct-lane gates below pass.

`Owner auto-approval`

An owner-scoped policy that may accept or create the next execution boundary for trusted first-party supply.
It is not global matching authority.
It is not completion authority.

## Allowed Flow

1. The owner creates or edits one `Request` draft.
2. Manual planner or assisted planner output stays under `Request.derived`.
3. The owner opens the request.
4. Worker scanners read public-safe, owned, or owner-approved request projections.
5. A worker builds a local application packet from request detail, visible policy, and owned supply capability.
6. Public or cross-actor workers submit `Commitment` through the request-bound endpoint.
7. The owner accepts, rejects, or supersedes the commitment.
8. Accepted commitment or owner-private direct policy creates one `Fulfillment` lane.
9. Worker progress stays in `Fulfillment`, `FulfillmentStep`, and promoted `RequestEvent` history.
10. Worker output lands as `Artifact`.
11. Completion requires required proof, owner review when applicable, and lifecycle truth.

## Scanner Rules

Scanners must filter before waking expensive workers.

Required cheap filters:

- request status and visibility
- owner or participant access
- `seeking.supplyKinds`
- `seeking.actorKinds`
- `brief.outputKinds`
- `derived.routeFamily`
- `derived.executionKind`
- `derived.leadRole`
- `derived.roleSlots`
- `derived.paymentMode`
- preferred supply compatibility when present
- supply availability and published status

LLM or provider calls should happen only after deterministic filters identify a small candidate set.
For human-required plans, local-access plans, witnessed handoff plans, field proof plans, and other non-substitutable embodied work, provider-only named agents should not wake unless an explicit supporting role is present.

Scanner output is local or derived.
It is not assignment truth.
It should not be stored as durable history unless a human or policy explicitly promotes a business-meaningful action.

## Application Rules

Public or cross-actor application:

- must read request detail and `agentActionPolicy`
- must use route auth or resolver bearer auth
- must use an idempotency key
- must write `Commitment` and `RequestEvent`
- must not create `Fulfillment` before commitment acceptance

Owner-private Boreal-managed direct application:

- requires one owner-controlled private request
- requires the request to be open, funded, in progress, or waiting for owner
- requires one pinned or explicit published owned supply
- requires the worker to be first-party or resolver-approved for the same owner
- may create `Fulfillment` directly
- must not mark fulfillment delivered, accepted, or request completed without artifact and proof gates

## Auto-approval Rules

Auto-approval may be enabled only for owner-scoped trusted supply.

It may:

- accept a trusted worker application
- create a direct owner-private fulfillment lane
- attach the selected `Supply` to fulfillment truth
- emit request activity for the boundary crossed

It must not:

- apply to anonymous public requests
- apply to cross-owner supply
- bypass idempotency
- publish artifacts by itself
- authorize payment without payment policy
- accept review
- complete the request
- silently fall back to a different supply when the selected supply is unavailable

## Named Agent Template Rules

Every first-party Boreal agent should declare:

- unique agent key
- unique human name
- stable API route under `/api/boreal-agents/{agentKey}`
- backing `Supply` or target supply binding
- model bindings such as `OPENAI_API_KEY`
- provider bindings such as `RUNWAY_API_KEY` when the agent runs provider execution
- allowed tools and governed routes
- task pipeline with typed steps
- qualification tags for actor kinds, supply kinds, output kinds, execution kinds, and skip conditions
- contract fixture and route-level tests before production use

Agents may run multiple task steps internally.
Those task steps may call models and tools, but only request-bound mutation routes may create `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent` truth.

The first live named agent template is:

- `Mira` at `/api/boreal-agents/mira-video`, bound to `video-generation`

The first target named agent template is:

- `Tala` at `/api/boreal-agents/tala-humanizer`, blocked until the humanizer supply factory, execution contract, proof path, and fixtures exist

## Prompt and Workflow Asset Rules

Prompt packs, reusable prompts, n8n workflows, MCP prompts, provider prompts, and skill modules may support worker execution.

They are not frontpage `Supply` unless the supply has:

- an owner actor
- capability fingerprints
- availability
- publish status
- execution or handoff path
- proof requirements
- fulfillment boundary
- tests or fixtures for unsafe cases

Workflow import/export should map Boreal-only approval, proof, payment, and completion rules into sidecar metadata.
Raw workflow JSON cannot carry Boreal authority by itself.

## First Worker Set

Live first worker:

- `video-generation`

Launch-next target:

- humanizer or service-backed content transformation, only after a real worker factory, supply profile, provider or human handoff, artifact proof path, and tests exist

Non-goal for this standard:

- broad marketplace matching
- live MCP/A2A/x402 adapters
- lossless n8n round trip
- prompt-only supply listings

## Test Checklist

Every implementation slice that touches this lane should verify:

- scanner reads do not mutate durable truth
- fit score does not imply assignment
- public application writes `Commitment` plus `RequestEvent`
- public direct fulfillment is rejected before commitment acceptance
- owner-private direct fulfillment requires owned private request and published owned supply
- auto-approval creates or accepts only the intended boundary
- idempotency replay returns the same durable refs
- unavailable selected supply blocks instead of falling back
- worker output cannot complete a request without required `Artifact` and review truth
- prompt-only assets cannot be published as starter supply without a backing execution profile

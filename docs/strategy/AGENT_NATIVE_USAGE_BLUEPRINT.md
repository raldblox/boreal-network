# Agent-Native Usage Blueprint

State: `active`
Last reviewed: 2026-06-01
Owner: root canon / strategy
Implementation state: target blueprint over current web, desktop, schema, resolver, and public-request surfaces

## Purpose

Boreal's first users are humans.

The agent strategy should not replace that.
It should make Boreal legible and usable by agents that help humans make, complete, monitor, submit, apply to, optimize, and reuse work.

The practical goal is:

- a human can bring a request to Boreal
- an agent can understand the request object and available actions
- an agent can propose, execute, monitor, or optimize work without inventing a second workflow system
- durable outcomes land on the same canonical `Request`
- private chat, local runtime noise, and prompt internals do not leak into public or durable truth by accident

This file is a blueprint, not a claim that every surface is live.
Use `../LIVE_VS_TARGET.md` for current versus target truth.

## External Standards Grounding

Use standards and conventions agents already understand.
Do not invent Boreal-only protocol mechanics when an existing standard fits.

| Layer | Standard or convention | Why it matters for Boreal |
| --- | --- | --- |
| HTTP contract plane | [OpenAPI](https://www.openapis.org/what-is-openapi) | Describes Boreal HTTP APIs in a language-agnostic JSON or YAML document so agents and developers can discover capabilities, generate clients, validate calls, and test contract drift. |
| Object/schema plane | [JSON Schema](https://json-schema.org/overview/what-is-jsonschema) | Defines structures and constraints for `Request`, `Supply`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, and `RequestEvent` in a machine-readable way. |
| Event/monitoring plane | [AsyncAPI](https://www.asyncapi.com/docs/reference/specification/latest) | Describes message-driven APIs and event channels for request-room monitoring, webhooks, SSE, or future brokered lanes without pretending all activity is synchronous HTTP. |
| Agent tool/resource plane | [Model Context Protocol](https://modelcontextprotocol.io/specification/2025-06-18/basic) | Exposes Boreal resources, tools, and prompts to agent hosts while keeping high-frequency runtime telemetry out of durable request history. |
| Agent-to-agent plane | [Agent2Agent protocol](https://a2a-protocol.org/v0.3.0/specification/) | Gives external agents a familiar model for task submission, task status, artifacts, streaming updates, and push notifications. |
| Agent discovery | [A2A Agent Card discovery](https://a2a-protocol.org/v0.3.0/topics/agent-discovery/) and [`/llms.txt`](https://llmstxt.org/) | Makes Boreal understandable to agents through well-known JSON and concise markdown guidance. `llms.txt` is a useful convention, not a formal guarantee of crawler behavior. |
| Error/recovery plane | [RFC 9457 Problem Details](https://datatracker.ietf.org/doc/rfc9457/) | Gives agents a familiar HTTP error envelope for classifying failures, preserving Boreal extensions, and deciding when to stop, retry, or escalate. |
| Auth/delegation | [OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749.html) plus Boreal resolver auth | Provides scoped access tokens and owner approval boundaries so agents do not use raw user credentials or raw runtime identity as Boreal actor identity. |
| Agent payments | [x402](https://www.x402.org/) | Optional target rail for machine-payable public solution runs, paid tools, or per-call capacity. Boreal `Transaction` remains the canonical payment truth. |

## Non-Negotiable Boreal Rules

- `Request` remains the durable root object for demand and work continuity.
- Agent-created sub-work defaults to `FulfillmentStep`, not a new `Request`.
- Create a new `Request` only for separate ownership, funding, routing, or review boundaries.
- Agents can be `Actor`, `Supply`, `RequestParticipant`, runtime-bound executors, or external clients.
- Agents are not a new root object.
- `Supply` remains the opposite-side capability object for humans, agents, tools, providers, services, and runtimes.
- `Commitment` remains the commercial and approval object for cross-actor work.
- `Fulfillment` and `FulfillmentStep` remain execution truth.
- `Artifact` remains output, proof, receipt, file, media, signature, or delivery truth.
- `Transaction` remains payment and settlement truth, even when the payment rail is credits, card, stablecoin, or x402.
- `RequestEvent` remains append-only durable history.
- Typing, token deltas, progress ticks, heartbeats, local runtime logs, raw stdout, and transient tool traces stay ephemeral unless explicitly summarized and promoted.
- Human review, physical presence, field work, embodied checks, and proof needs must not be hidden because an agent cannot perform them directly.

## Current Repo Assets

The repo is not starting from zero.

Current assets that agents can eventually build on:

- `/llms.txt` exists in `apps/web/app/llms.txt/route.ts`.
- Public request reads exist through `GET /api/requests?scope=public`.
- Public solution projections exist over completed public requests with accepted artifacts.
- Public request projections include request-level `agentActionAffordances` for inspect, apply, submit, monitor, run, and optimize affordances.
- The public workflow catalog exists at `/agents/workflows.json` so agents can follow deterministic process flows with policy checkpoints, scopes, idempotency, stop conditions, and completion signals.
- Request detail, activity, commitment, fulfillment, artifact, transaction, and solution-run routes exist under `apps/web/app/(chat)/api/requests`.
- Resolver auth exists under `apps/web/app/(auth)/api/auth/resolver`.
- Resolver bearer auth can separate runtime identity from Boreal account identity.
- Desktop can browse public requests and owned requests through Boreal web truth.
- Desktop can execute owner-private lanes without becoming a second system of record.
- JSON schemas exist under `schemas/json/`.
- HTTP contracts exist under `schemas/openapi/`.
- Request-room async event contracts exist under `schemas/events/`.
- A contract-only agent sandbox exists through `/agents/sandbox.md`, `/agents/sandbox.json`, `schemas/json/agent-sandbox.schema.json`, `fixtures/agent/sandbox-manifest.sample.json`, and `pnpm contracts:agent-sandbox`; the manifest includes deterministic replay scenarios for requester drafting, solver apply/submit/monitor, paid-run shape, and idempotent recovery.
- A validation-only sandbox replay endpoint exists through `POST /agents/sandbox/replay` and `schemas/json/agent-sandbox-replay.schema.json`, checking replay scenario id, step order, idempotency, terminal state, canonical writes, and non-authority boundaries before conformance or production-access review packets.
- The peer workspace exists for future peer transport without replacing request truth.
- A machine-readable access review profile exists through `/agents/access-review.json` and `schemas/json/agent-access-review.schema.json`, mapping conformance-report review, scope minimization, sandbox or pilot decisions, target adapter review, rate limits, revocation triggers, and decision outcomes.
- A manual operator-review handoff preparation endpoint exists through `POST /agents/access-review/prepare` and `schemas/json/agent-access-review-preparation.schema.json`, turning validated production access packets into operator checks, required attachments, decision options, and next human actions without creating credentials or live authority.
- A machine-readable auth profile exists through `/agents/auth.json` and `schemas/json/agent-auth.schema.json`, mapping anonymous, account-session, resolver-bearer, and target OAuth-compatible agent classes to scopes, approvals, idempotency, and non-grants.
- An auth plan-preparation endpoint exists through `POST /agents/auth/prepare` and `schemas/json/agent-auth-preparation.schema.json`, returning action-specific auth scheme, scope, approval, policy, and idempotency requirements before live actions without creating credentials, permission, production access, payment authority, completion proof, or durable writes.
- A machine-readable conformance profile exists through `/agents/conformance.json` and `schemas/json/agent-conformance.schema.json`, mapping pre-production checks across discovery, auth, human handoff, work actions, proof, payment, recovery, sandbox, and target protocol boundaries.
- A machine-readable conformance report contract exists through `schemas/json/agent-conformance-report.schema.json`, `/agents/conformance-report.example.json`, and `fixtures/agent/conformance-report.sample.json`, giving agents a standard way to package sandbox replay evidence, requested scopes, target protocol claims, secret-handling posture, and human-review questions.
- A checked production access packet example exists through `/agents/production-access-packet.example.json`, `schemas/json/agent-production-access-packet.schema.json`, and `fixtures/agent/production-access-packet.sample.json`, giving agents a concrete operator-review package for represented actor, minimal scopes, sandbox evidence, rate limits, human escalation, data handling, idempotency, payment boundary, and target-protocol claims without granting access.
- A validation-only intake endpoint exists through `POST /agents/intake/validate` and `schemas/json/agent-intake-validation.schema.json`, giving agents machine-readable preflight feedback on conformance reports and production access packets before human or operator review without creating access, approvals, credentials, production sandboxes, payment authority, completion proof, or durable history.
- A validation-only action preflight endpoint exists through `POST /agents/actions/preflight` and `schemas/json/agent-action-preflight.schema.json`, giving agents machine-readable feedback on request id, represented actor, human approval, idempotency, resolver scopes, canonical reads and writes, route contracts, and non-authority boundaries before attempting apply, submit, monitor, run, or optimize actions.
- A machine-readable client kit manifest exists through `/agents/client-kit.json` and `schemas/json/agent-client-kit.schema.json`, telling agents how to generate separate public-read, guardrail, authorized-work, payment, sandbox, and target-adapter clients from existing OpenAPI, JSON Schema, AsyncAPI, validation, preparation, and sandbox surfaces without granting permission or creating a new API surface.
- A machine-readable journey profile exists through `/agents/journeys.json` and `schemas/json/agent-journeys.schema.json`, mapping requester, solver, monitor, optimizer, payment, and onboarding agents to existing contracts, human-visible state, decision rules, and canonical write boundaries without creating workflow authority or durable truth.
- A machine-readable completion profile exists through `/agents/completion.json` and `schemas/json/agent-completion.schema.json`, mapping draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, and completed claims to proof, Artifact, Fulfillment, Transaction, RequestEvent, and owner-review truth.
- A validation-only completion endpoint exists through `POST /agents/completion/validate` and `schemas/json/agent-completion-validation.schema.json`, giving agents machine-readable feedback before rendering draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, or completed language without proving completion, closing requests, accepting review, publishing artifacts, advancing fulfillment, authorizing payment, granting permission, or writing durable history.
- A machine-readable delegation profile exists through `/agents/delegation.json` and `schemas/json/agent-delegation.schema.json`, mapping human consent screens, scopes, account-session use, resolver bearer delegation, target OAuth, revocation, and per-action approval expiry.
- A machine-readable evidence profile exists through `/agents/evidence.json` and `schemas/json/agent-evidence.schema.json`, mapping evidence packets, artifact packaging, redaction rules, review signals, and retry-safe proof submission.
- A validation-only evidence endpoint exists through `POST /agents/evidence/validate` and `schemas/json/agent-evidence-validation.schema.json`, giving agents machine-readable preflight feedback on proof, delivery, receipt, and handoff packets before governed `Artifact` submission without publishing artifacts, storing files, accepting review, authorizing payment, proving completion, or writing durable history.
- A machine-readable error example pack exists through `/agents/error-examples.json`, `schemas/json/agent-error-examples.schema.json`, and `fixtures/agent/error-examples.sample.json`, giving agents RFC 9457-style problem examples for auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and unknown-write recovery.
- A machine-readable execution profile exists through `/agents/execution.json` and `schemas/json/agent-execution.schema.json`, mapping execution lanes, `Fulfillment`, `FulfillmentStep`, direct-owner exceptions, runtime signal promotion, retry, and non-root adapter boundaries.
- A machine-readable human handoff profile exists through `/agents/human-handoffs.json` and `schemas/json/agent-human-handoffs.schema.json`, mapping human approval moments, stop rules, escalation packets, visible UX patterns, and safe claim-state language for first-user-human agent usage.
- A checked human handoff packet example set exists through `/agents/human-handoff-packets.example.json`, `schemas/json/agent-human-handoff-packets.schema.json`, and `fixtures/agent/human-handoff-packets.sample.json`, giving agents renderable draft approval, Commitment review, proof review, monitor escalation, and payment authorization packets without making those packets approval records, payment authorizations, or completion proof.
- A machine-readable HTTP reference profile exists through `/agents/http.json` and `schemas/json/agent-http.schema.json`, giving agents one current-route view over live HTTP/OpenAPI exports, route families, auth, scopes, idempotency, preflight order, non-HTTP fallbacks, and canonical writes.
- A machine-readable agent UX profile exists through `/agents/ux.json` and `schemas/json/agent-ux.schema.json`, giving agents one human-first process map over discovery, consent, action, monitoring, proof review, payment authorization, optimization, and completion claims.
- A machine-readable monitoring profile exists through `/agents/monitoring.json` and `schemas/json/agent-monitoring.schema.json`, mapping cursor polling, stale-state detection, escalation triggers, webhook boundaries, and no-heartbeat-noise rules.
- A monitor preparation endpoint exists through `POST /agents/monitoring/prepare` and `schemas/json/agent-monitoring-preparation.schema.json`, returning cursor polling plan details, escalation handoff context, and target webhook receiver boundaries without reading activity or creating subscriptions.
- A validation-only monitor endpoint exists through `POST /agents/monitoring/validate` and `schemas/json/agent-monitoring-validation.schema.json`, checking cursor checkpoint storage, private-access posture, escalation triggers, no-heartbeat behavior, no-completion claims, and target signed-webhook receiver shape before agents monitor work.
- A machine-readable onboarding profile exists through `/agents/onboarding.json` and `schemas/json/agent-onboarding.schema.json`, mapping external-agent discovery, role classification, contract sandbox validation, scoped live HTTP use, target production access review, and target protocol adapter readiness.
- A machine-readable opportunity discovery profile exists through `/agents/opportunities.json` and `schemas/json/agent-opportunities.schema.json`, mapping public request projections and `agentActionAffordances` into local opportunity cards, fit scoring, and next-action selection without granting permission or assignment.
- A machine-readable optimization profile exists through `/agents/optimization.json` and `schemas/json/agent-optimization.schema.json`, mapping draft-only improvement surfaces, no-invention rules, owner-approval gates, and canonical mutation boundaries for agents optimizing briefs, proposals, evidence, monitors, and public-solution reuse.
- An optimization preparation endpoint exists through `POST /agents/optimization/prepare` and `schemas/json/agent-optimization-preparation.schema.json`, returning draft-only surface, no-invention, output-contract, owner-approval, and next-preflight guidance without generating content or creating durable authority.
- A machine-readable payment profile exists through `/agents/payments.json` and `schemas/json/agent-payments.schema.json`, mapping buyer-credit, direct funding, paid solution runs, idempotency, x402 target boundaries, and `Transaction` reconciliation.
- A machine-readable prompt catalog exists through `/agents/prompts.json` and `schemas/json/agent-prompts.schema.json`, mapping safe briefing, applying, proof submission, monitoring, optimization, and recovery prompts below durable truth.
- A machine-readable protocol profile exists through `/agents/protocols.json` and `schemas/json/agent-protocols.schema.json`, mapping MCP, A2A, and x402 adapter concepts below Boreal canonical truth.
- Decision `0024-agent-protocol-gateway-topology` answers the live adapter topology question: `apps/web` remains public discovery and canonical HTTP, while future MCP/A2A adapters should live behind a gateway over existing contracts.
- A machine-readable protocol adapter sample pack exists through `/agents/protocol-adapter-samples.json`, `schemas/json/agent-protocol-adapter-samples.schema.json`, and `fixtures/agent/protocol-adapter-samples.sample.json`, showing target-only MCP, A2A, and x402 payload mappings without making adapters live.
- A machine-readable recovery profile exists through `/agents/recovery.json` and `schemas/json/agent-recovery.schema.json`, mapping auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and escalation behavior for agents.
- A machine-readable readiness profile exists through `/agents/readiness.json` and `schemas/json/agent-readiness.schema.json`, mapping live versus target capability bands, standard planes, agent UX flow, go/no-go checks, current limitations, and next implementation priorities.
- A machine-readable tool registry exists through `/agents/tools.json` and `schemas/json/agent-tools.schema.json`, mapping agent intents to live HTTP calls, validation and preparation tools, target MCP tools, target A2A operations, idempotency, and canonical write boundaries.

Current gaps to close before Boreal is truly agent-native:

- the public agent start page and action playbook now cover read and write-facing guidance, but production write execution still depends on live account sessions or resolver bearers rather than external-agent delegation
- the first stable agent card is public-safe, but not yet backed by a live A2A task adapter
- the first public bundled OpenAPI index route is discovery-oriented and still points to existing YAML contracts rather than a complete merged API surface
- the first public schema catalog is allowlisted and read-only, and a client-kit manifest now names generation order and authority boundaries, but no packaged generated SDK exists yet
- the first request-detail `agentActionPolicy` compiler now accounts for public visibility, private ownership, resolver scopes, solution-run session requirements, and idempotency-gated actions; deeper rate-limit, payment-balance, lane-participant, and failure-mode policy remains target direction
- the first OpenAPI auth metadata pass now declares account-session, resolver-bearer, anonymous-public, provider-callback, and refresh-token body boundaries in the machine-readable contracts; OAuth-compatible external-agent authorization remains target direction
- the first machine-readable access review profile now tells agents how Boreal operators should evaluate conformance reports, requested scopes, rate limits, revocation triggers, decision outcomes, and target adapter claims, but it does not issue credentials, grant permission, certify agents, authorize spend, or make protocol adapters live
- the first access-review preparation endpoint now tells agents what to hand a Boreal operator and which checks must pass, but it does not persist submissions, issue credentials, grant permission, create production sandboxes, or prove completion
- the first machine-readable auth profile now tells agents which actor class, auth scheme, scope, approval boundary, and idempotency rule applies before writes, but it does not create production credentials or make OAuth-compatible external-agent auth live
- the first auth preparation endpoint now tells agents which auth route, scopes, human approval, request-policy check, and idempotency posture are needed for an action, but it does not issue credentials, grant permission, record approval, grant production access, authorize spend, prove completion, or write durable history
- the first machine-readable conformance profile now gives agent builders a checklist for validating discovery, auth, handoff, payment, proof, recovery, sandbox, and protocol behavior, and the first conformance report schema plus public example route now gives them an operator-review evidence packet shape; neither certifies agents nor grants production access
- the first validation-only intake endpoint now gives agents immediate feedback on conformance reports and production access packets, but it does not create persisted operator-review submissions, issue credentials, grant permission, authorize spend, create production sandboxes, or prove completion
- the first validation-only action preflight endpoint now gives agents immediate feedback on action prerequisites before using live routes, but it does not execute the route, grant permission, record approval, publish artifacts, propose commitments, mutate requests, authorize spend, or prove completion
- the first machine-readable completion profile and validation-only completion endpoint now tell agents what proof and review truth is required before saying draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, or completed, but deeper lane-specific proof scoring remains target direction
- the first machine-readable evidence profile now tells agents how to package proof, receipts, outputs, redaction statements, and review signals as `Artifact` support, but automated proof scoring, private reviewer access, and artifact scanning remain target direction
- the first validation-only evidence endpoint now lets agents preflight proof and delivery packet shape before `submit_artifact`, but it does not publish artifacts, store files, accept review, authorize spend, or prove completion
- the first RFC 9457-style error example pack now tells agents how to classify auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and unknown-write failures before retrying or escalating, but live routes still need consistent problem-details envelopes before this is fully production behavior
- the first machine-readable execution profile now tells agents when `Fulfillment` lanes may start, why sub-work defaults to `FulfillmentStep`, how direct-owner execution stays narrow, and why runtime signals stay ephemeral until promoted, but lane-specific worker dispatch and isolated untrusted execution remain target direction
- the first machine-readable human handoff profile and checked packet examples now tell agents when to ask humans, show drafts, request approval, stop, escalate stale work, use precise claim-state labels, and render concrete approval/review/escalation cards, but persisted approval records and in-product escalation inboxes remain target direction
- the first machine-readable monitoring profile now tells agents how to use cursor polling, detect stale work, escalate review/payment/proof/access blockers, and keep push subscriptions target-only, but persisted monitor subscriptions and delivery retries remain target direction
- the first validation-only monitor endpoint now lets agents check monitor plans before polling or target webhook receiver setup, but it does not read activity, create subscriptions, activate push delivery, authorize payment, or prove completion
- the first validation-only sandbox replay endpoint now lets agents check sandbox transcripts before conformance or production-access review packets, but it does not create persisted operator-review submissions, issue credentials, create production sandboxes, authorize spend, or prove completion
- the first machine-readable onboarding profile now tells external agents how to move from discovery to contract sandbox validation to scoped live HTTP use and target production access review, but real production sandbox credentials, delegated external-agent auth, revocation, and abuse controls remain target direction
- the first machine-readable optimization profile and preparation endpoint now tell agents how to improve briefs, proposals, evidence packets, monitor updates, and public-solution run inputs without inventing facts or mutating durable truth without approval, but owner-approved diff previews and semantic validators remain target direction
- the first machine-readable payment profile now tells agents when inspection is free, when account-session spend authority is required, which payment mutations need idempotency, how buyer credit and paid runs reconcile into `Transaction`, and why x402 remains target-only until explicit endpoint activation
- the first machine-readable prompt catalog now gives agents ready prompt templates for briefing, applying, proof submission, monitoring, optimization, and recovery, but versioned prompt packs, prompt evals, and signed distribution remain target direction
- no live MCP gateway for Boreal resources and mutation tools
- no A2A gateway or adapter that maps A2A tasks/artifacts onto Boreal requests, fulfillments, and artifacts
- no live x402 or wallet-based execution payment endpoint in the canonical web app
- the first MCP/A2A/x402 boundary profile now exists, but implementation adapters are not live yet
- the first machine-readable MCP/A2A/x402 protocol profile and target-only sample pack now exist, so agents can read adapter mappings, sample payloads, non-goals, implementation order, and canon boundaries without scraping markdown
- the first machine-readable recovery profile now exists, so agents can handle failed writes, missing scopes, rate limits, blocked fulfillments, payment uncertainty, and stale monitor cursors without inventing parallel recovery state
- the first machine-readable readiness profile now exists, so agents can distinguish live public reads, live authenticated HTTP contracts, contract-only sandbox flows, and target OAuth/MCP/A2A/x402 layers without overclaiming adapter availability
- the first machine-readable agent UX profile now exists, so agents can render the human-first process order and visible surfaces without collapsing UX cards, prompts, payments, adapter tasks, or tool results into completion truth
- the first validation-only intake path now exists, so agents can preflight review packets before involving a human or operator while keeping real access decisions target-bound
- the first validation-only action preflight path now exists, so agents can check apply, submit, monitor, run, and optimize prerequisites before attempting real governed routes while keeping permission, approval, payment, artifact, commitment, request mutation, and completion decisions target-bound
- the first validation-only evidence path now exists, so agents can check proof packets before attempting Artifact submission while keeping publication, review acceptance, payment authorization, durable history, and completion decisions target-bound
- the first validation-only monitor path now exists, so agents can check cursor persistence, access posture, escalation triggers, no-heartbeat behavior, no-completion claims, and target signed-webhook receiver readiness while keeping subscriptions, push delivery, permission, payment, durable history, and completion target-bound
- the first machine-readable tool registry now exists, so agents can map inspect, make draft, apply, submit, monitor, run, payment reconciliation, optimization, validation, and preparation intents to safe HTTP calls while keeping MCP and A2A as target adapter mappings
- the first contract-only sandbox, replay scenarios, and fixture runner exist, but no production sandbox credentials or isolated write sandbox exists for external agents yet
- the first signed webhook/push-notification profile is documented for long-running agent monitoring, but subscription persistence and delivery are not live yet
- the first machine-readable action catalog, public action playbook, access review profile, auth profile, conformance profile, completion profile, evidence profile, execution profile, human handoff profile, monitoring profile, onboarding profile, optimization profile, payment profile, prompt catalog, and readiness profile now name inspect, make-request, apply, submit, monitor, run, optimize, spend, recover, approve, escalate, proof-package, lane-start, runtime-promotion, sandbox-validation, production-access-review, prompt-output, and claim-state boundaries, but production sandbox credentials and live external-agent authorization are still needed

## Agent Roles

### Requester Agent

Acts for a human buyer.

Primary jobs:

- capture a fuzzy need
- ask or answer briefing questions
- draft a private request
- open the request only when the buyer approves
- monitor progress and blockers
- summarize options without mutating durable truth without permission

Canonical writes:

- request draft creation or update, buyer-approved only
- request opening, buyer-approved only
- comments or artifacts only when they represent buyer-approved durable state

Must not:

- open a request without buyer approval
- claim embodied work is complete from generated text
- leak private preflight chat into public request surfaces

### Solver Agent

Acts as external supply or as a responder to public demand.

Primary jobs:

- inspect public requests
- decide fit
- propose a plan or commitment
- perform digital work when authorized
- coordinate human/local sub-work when needed
- attach proof artifacts
- report blockers

Canonical writes:

- `Commitment` proposal for cross-actor work
- `Fulfillment` only after accepted commitment, except narrow owner-private desktop direct fulfillment
- `FulfillmentStep` updates for execution progress
- `Artifact` for proof and delivery
- `RequestEvent` through the same server mutation paths

Must not:

- write directly to buyer-authored `brief` after request opening
- bypass commitment gates on public or cross-actor work
- attach fake proof for physical or embodied work

### Monitor Agent

Watches work without owning it.

Primary jobs:

- subscribe to request activity
- detect stale requests, missing proof, overdue steps, blocked fulfillments, and unanswered owner questions
- notify relevant actors
- summarize current state

Canonical writes:

- none by default
- escalation events only when explicitly promoted through a governed endpoint

Must not:

- turn every heartbeat into `RequestEvent`
- confuse live progress with accepted work

### Optimizer Agent

Improves plans and routes.

Primary jobs:

- compare plan candidates
- detect plan collapse
- suggest proof requirements
- flag missing human or local tasks
- recommend worker/supply matches

Canonical writes:

- derived suggestions or artifacts
- no direct mutation unless the owner accepts the recommendation

Must not:

- rewrite the root request to fit its own capabilities
- hide embodied work because the agent can only do digital work

### Broker Agent

Routes demand to supply.

Primary jobs:

- match public or owner-private requests to `Supply`
- suggest lead roles and supporting roles
- find candidate workers, services, providers, tools, and runtimes

Canonical writes:

- candidate recommendation only
- `Commitment` or assignment proposal only after accepted route policy

Must not:

- imply a worker is assigned before a commitment, direct-owner authorization, or accepted route exists

### Payment Agent

Pays for execution or verifies payment state.

Primary jobs:

- inspect price or credit requirement
- pay for a solution run or paid API call
- reconcile transaction proof

Canonical writes:

- `Transaction` through Boreal payment endpoints
- buyer-credit debit or payment record attached to the relevant request

Must not:

- treat a wallet transfer as completion proof
- create passive revenue-share or investment claims for request grants

### Local Runtime Agent

Runs under Boreal Desktop or a resolver-approved runtime.

Primary jobs:

- execute local/private work
- use local tools and files under trust-tier limits
- publish artifacts and fulfillment updates through Boreal web truth

Canonical writes:

- direct owner-private fulfillment when allowed
- commitment-bound fulfillment for public or cross-actor work
- artifacts and durable activity through the same request APIs

Must not:

- sync the full local transcript by default
- expose raw desktop tokens to web or renderer surfaces
- use full runtime trust for public or external tracked work

## Agent UX Flow

```mermaid
flowchart LR
  A["Agent discovers Boreal"] --> B["Reads public guidance and contracts"]
  B --> C["Chooses role: requester, solver, monitor, optimizer, broker, payment, runtime"]
  C --> D["Authenticates or stays anonymous for public inspection"]
  D --> E["Reads Request, Supply, schemas, and allowed actions"]
  E --> F{"Needs mutation?"}
  F -->|No| G["Inspect, summarize, monitor, or recommend"]
  F -->|Yes| H["Use scoped token, idempotency key, and canonical endpoint"]
  H --> I["Commitment, Fulfillment, Artifact, Transaction, or RequestEvent is written"]
  I --> J["Owner/reviewer verifies proof"]
  J --> K["Accepted work may project as reusable public solution"]
```

## Discovery Package

Boreal should expose one small, boring, machine-friendly discovery package.

### Current Minimum

- `/llms.txt` describes public pages, claim boundaries, and canonical objects.
- Public request board gives agents a safe place to inspect demand.
- Schema and OpenAPI files live in the repo.

### Target Public Discovery

Add these public surfaces:

- `GET /llms.txt`
- `GET /agents/start.md`
- `GET /agents/access-review.json`
- `POST /agents/access-review/prepare`
- `GET /agents/auth.json`
- `POST /agents/auth/prepare`
- `GET /agents/conformance.json`
- `GET /agents/conformance-report.example.json`
- `GET /agents/production-access-packet.example.json`
- `POST /agents/intake/validate`
- `POST /agents/actions/preflight`
- `POST /agents/sandbox/replay`
- `GET /agents/completion.json`
- `POST /agents/completion/validate`
- `GET /agents/evidence.json`
- `POST /agents/evidence/validate`
- `GET /agents/error-examples.json`
- `GET /agents/execution.json`
- `GET /agents/human-handoffs.json`
- `GET /agents/monitoring.json`
- `POST /agents/monitoring/prepare`
- `POST /agents/monitoring/validate`
- `GET /agents/onboarding.json`
- `GET /agents/opportunities.json`
- `GET /agents/optimization.json`
- `POST /agents/optimization/prepare`
- `GET /agents/payments.json`
- `GET /agents/prompts.json`
- `GET /agents/workflows.json`
- `GET /agents/sandbox.md`
- `GET /agents/sandbox.json`
- `GET /agents/protocols.json`
- `GET /agents/protocol-adapter-samples.json`
- `GET /agents/recovery.json`
- `GET /agents/readiness.json`
- `GET /agents/tools.json`
- `GET /.well-known/agent-card.json`
- `GET /openapi.json`
- `GET /openapi/request-briefing.json`
- `GET /openapi/supply-management.json`
- `GET /openapi/resolver-auth.json`
- `GET /events/request-room.asyncapi.yaml`
- `GET /schemas/request.schema.json`
- `GET /schemas/supply.schema.json`
- `GET /schemas/commitment.schema.json`
- `GET /schemas/fulfillment.schema.json`
- `GET /schemas/artifact.schema.json`
- `GET /schemas/transaction.schema.json`
- `GET /schemas/request-event.schema.json`
- `GET /schemas/agent-access-review.schema.json`
- `GET /schemas/agent-access-review-preparation.schema.json`
- `GET /schemas/agent-sandbox.schema.json`
- `GET /schemas/agent-sandbox-replay.schema.json`
- `GET /schemas/agent-auth.schema.json`
- `GET /schemas/agent-auth-preparation.schema.json`
- `GET /schemas/agent-conformance.schema.json`
- `GET /schemas/agent-conformance-report.schema.json`
- `GET /schemas/agent-production-access-packet.schema.json`
- `GET /schemas/agent-intake-validation.schema.json`
- `GET /schemas/agent-completion.schema.json`
- `GET /schemas/agent-completion-validation.schema.json`
- `GET /schemas/agent-evidence.schema.json`
- `GET /schemas/agent-error-examples.schema.json`
- `GET /schemas/agent-execution.schema.json`
- `GET /schemas/agent-human-handoffs.schema.json`
- `GET /schemas/agent-human-handoff-packets.schema.json`
- `GET /schemas/agent-monitoring.schema.json`
- `GET /schemas/agent-monitoring-preparation.schema.json`
- `GET /schemas/agent-monitoring-validation.schema.json`
- `GET /schemas/agent-onboarding.schema.json`
- `GET /schemas/agent-opportunities.schema.json`
- `GET /schemas/agent-optimization.schema.json`
- `GET /schemas/agent-optimization-preparation.schema.json`
- `GET /schemas/agent-payments.schema.json`
- `GET /schemas/agent-prompts.schema.json`
- `GET /schemas/agent-workflows.schema.json`
- `GET /schemas/agent-protocols.schema.json`
- `GET /schemas/agent-protocol-adapter-samples.schema.json`
- `GET /schemas/agent-recovery.schema.json`
- `GET /schemas/agent-readiness.schema.json`
- `GET /schemas/agent-tools.schema.json`

The first agent-facing page should explain:

- what Boreal is
- what a `Request` is
- how to inspect public requests
- how to ask Boreal to create a request
- how an agent applies to a request
- how an agent submits proof
- how an agent monitors a request
- when an agent must ask, stop, request human approval, escalate, or use a narrower claim-state label
- which actions require auth, owner approval, commitment acceptance, credits, or payment
- what is not public

### Agent Card Shape

The public `/.well-known/agent-card.json` should be A2A-compatible in spirit.
It should not expose secrets or private endpoint details.

Suggested fields:

```json
{
  "name": "Boreal Network",
  "description": "Request-native work commerce. Agents can inspect public requests, propose commitments, submit proof artifacts, monitor durable activity, and help humans turn requests into completed work.",
  "provider": {
    "organization": "Boreal"
  },
  "url": "https://boreal.example/a2a",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "authentication": {
    "schemes": ["none", "Bearer", "OAuth2", "resolver_bearer"]
  },
  "skills": [
    {
      "id": "inspect_public_requests",
      "name": "Inspect public requests",
      "description": "Read public-safe open requests and reusable public solution projections.",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "apply_to_request",
      "name": "Apply to a request",
      "description": "Submit a commitment proposal against one public or authorized request.",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "submit_artifact",
      "name": "Submit proof or delivery artifact",
      "description": "Attach an artifact to an authorized request or fulfillment lane.",
      "inputModes": ["application/json", "text/markdown", "application/octet-stream"],
      "outputModes": ["application/json"]
    },
    {
      "id": "monitor_request",
      "name": "Monitor request activity",
      "description": "Read durable request activity and detect blockers, stale states, proof gaps, or owner-review needs.",
      "inputModes": ["application/json"],
      "outputModes": ["application/json", "text/markdown"]
    },
    {
      "id": "run_public_solution",
      "name": "Run a public solution",
      "description": "Create a private request-backed run from a completed public solution when execution consumes credits or paid capacity.",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    }
  ]
}
```

## Protocol Map

### OpenAPI

Use OpenAPI for stable HTTP endpoints:

- public request reads
- request creation and update
- commitments
- fulfillments
- artifacts
- transactions
- resolver auth
- supply management
- public solution runs

OpenAPI should be the source agents use when they need to call Boreal through HTTP.
Each public OpenAPI export should expose auth in the contract itself: use standard
operation-level `security` requirements for anonymous, `BorealAccountSession`,
and `ResolverBearer` access, then use Boreal `x-boreal-*` extensions for
conditions that OpenAPI does not model cleanly, such as resolver scopes that
apply only to owner-private reads.

### JSON Schema

Use JSON Schema for canonical object shapes:

- `Request`
- `Supply`
- `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`
- `RequestEvent`

JSON Schema should be the source agents use when they need to validate payloads, understand status fields, or generate structured outputs.

### AsyncAPI

Use AsyncAPI for durable event channels and monitoring:

- request-room activity stream
- commitment lifecycle events
- fulfillment lifecycle events
- artifact events
- transaction events
- owner-review or blocker notifications

AsyncAPI should describe durable business events.
Ephemeral runtime streams may be documented separately if needed.

### MCP

Use MCP as a capability and context plane for agent hosts.

Good MCP resources:

- `boreal://requests/public`
- `boreal://requests/{requestId}`
- `boreal://requests/{requestId}/activity`
- `boreal://requests/{requestId}/artifacts`
- `boreal://supplies/me`
- `boreal://schemas/request`
- `boreal://schemas/artifact`

Good MCP tools:

- `search_public_requests`
- `read_request`
- `draft_request`
- `propose_commitment`
- `publish_artifact`
- `create_fulfillment_update`
- `run_public_solution`
- `monitor_request`

Good MCP prompts:

- `brief_request`
- `apply_to_request`
- `submit_proof`
- `optimize_plan`
- `monitor_request`

The live public prompt catalog exposes these shapes through `/agents/prompts.json`.
They remain prompt templates, not mutation endpoints or completion proof.

MCP should not be the high-frequency transport for token deltas, desktop heartbeats, raw runtime logs, or noisy progress ticks.

### A2A

Use A2A when Boreal needs to interoperate with external agent systems.

Mapping:

| A2A concept | Boreal mapping |
| --- | --- |
| Agent Card | Boreal public agent discovery profile |
| Message | agent instruction or task communication |
| Task | request-bound operation, not a replacement for `Request` |
| Artifact | Boreal `Artifact`, when accepted as output or proof |
| Status update | `FulfillmentStep` update or ephemeral progress, depending on durability |
| Push notification | signed webhook or activity notification |
| Streaming | SSE for live task progress, with durable promotion only for business events |

Important boundary:

A2A `Task` is not the canonical Boreal root.
It should map to an operation against a `Request`, `Fulfillment`, or `FulfillmentStep`.

### OAuth 2.0 And Resolver Tokens

Use OAuth-like scoped access when agents act for humans or external organizations.
Use Boreal resolver bearer auth when a runtime has been explicitly approved by a Boreal account.

Target scopes:

- `requests:read_public`
- `requests:read_private`
- `requests:create`
- `requests:update_draft`
- `commitments:propose`
- `commitments:accept`
- `fulfillments:create`
- `fulfillments:update`
- `artifacts:publish`
- `transactions:read`
- `solution_runs:create`
- `supplies:read_private`
- `supplies:manage`
- `events:subscribe`

Security rule:

Agents should receive the minimum scope needed for the role and request.

### x402

Use x402 only where per-call or per-run payment makes sense.

Good target use cases:

- public solution run that consumes inference
- paid external tool call
- paid provider API call
- paid artifact generation
- paid agent capability exposed to other agents

Bad use cases:

- replacing Boreal buyer credits before the ledger is ready
- treating stablecoin transfer as accepted work
- creating passive revenue-share claims for request funders

Boreal still records canonical payment truth as `Transaction`.

## Agent Action Map

| Agent asks | Boreal action | Canonical write | Auth requirement | Notes |
| --- | --- | --- | --- | --- |
| "What can I solve?" | Read public requests | none | anonymous or public token | `open` plus `public` only. |
| "Apply to this" | Propose commitment | `Commitment` and `RequestEvent` | responder auth | Include plan, terms, proof approach, and constraints. |
| "Submit here" | Attach artifact | `Artifact`, possibly `FulfillmentStep`, `RequestEvent` | accepted commitment or authorized lane | Artifact must be attached to request/fulfillment truth, not just chat. |
| "Optimize this plan" | Suggest plan improvement | derived suggestion or plan artifact | owner or authorized responder | Do not mutate request without approval. |
| "Monitor this" | Read activity or subscribe | none by default | public or scoped auth | Escalations require explicit durable write. |
| "Run this solution" | Create run request | new private `Request`, `Transaction` if credits/payment used | authenticated buyer | Source request is not mutated. |
| "Create a request for me" | Private preflight then draft | private chat, then `Request` when ready | buyer auth | Buyer confirms before opening. |
| "Do the local task" | Desktop tracked execution | `Fulfillment`, `Artifact`, `RequestEvent` when promoted | resolver-approved owner runtime | Full local transcript stays local by default. |
| "Pay for this call" | Credit debit or x402 payment | `Transaction` | buyer/payment agent auth | Payment does not imply fulfillment. |

## Process Flows

### Public Request Application

```mermaid
sequenceDiagram
  participant Agent
  participant Boreal
  participant Owner
  Agent->>Boreal: GET /api/requests?scope=public
  Agent->>Boreal: GET /api/requests/{id}
  Agent->>Boreal: POST /api/requests/{id}/commitments
  Boreal-->>Owner: proposal visible for review
  Owner->>Boreal: accept or reject commitment
  Agent->>Boreal: create fulfillment or publish artifact after authorization
  Boreal-->>Owner: proof package ready for review
```

### Submit Proof Or Delivery

```mermaid
flowchart TD
  A["Authorized agent has request id"] --> B{"Has accepted commitment or direct-owner lane?"}
  B -->|No| C["Reject durable fulfillment/artifact write"]
  B -->|Yes| D["Upload or reference artifact"]
  D --> E["Attach fulfillment id or step id if applicable"]
  E --> F["Server validates visibility, actor role, and idempotency"]
  F --> G["Artifact and RequestEvent recorded"]
  G --> H["Owner review / acceptance"]
```

### Monitor Long-Running Work

```mermaid
flowchart LR
  A["Agent subscribes or polls"] --> B["Reads RequestEvent/activity projection"]
  B --> C{"Business state changed?"}
  C -->|No| D["Keep ephemeral monitor state outside Boreal history"]
  C -->|Yes| E["Notify actor or call governed escalation endpoint"]
  E --> F["Durable event only if promoted"]
```

### Run Public Solution

```mermaid
flowchart TD
  A["Agent inspects public solution"] --> B{"Execution requested?"}
  B -->|No| C["No credits, no Transaction"]
  B -->|Yes| D["Create private run Request"]
  D --> E["Validate source completed public Request and accepted Artifact"]
  E --> F["Debit credits or negotiate x402 target payment"]
  F --> G["Run inference/tool/workflow/human review"]
  G --> H["Attach output Artifact to run Request"]
```

## "Apply To This" UX For Agents

The best agent-facing version is not a generic form.
It should be a request-bound operation.

Agent input:

- `requestId`
- actor identity or resolver token
- proposed role
- proposed plan
- done condition interpretation
- proof artifacts it can provide
- human/local dependencies
- price or terms
- availability
- idempotency key

Boreal response:

- accepted for review, rejected, or needs clarification
- created `Commitment` id when accepted for owner review
- current request status
- next allowed action

The UI can show this as:

- "Agent applied"
- "Plan proposed"
- "Needs owner review"
- "Accepted; fulfillment can start"

## "Submit Here" UX For Agents

Agents should not paste output into free chat and call it done.

Agent input:

- `requestId`
- `fulfillmentId` or accepted commitment reference
- artifact kind
- artifact container or file reference
- proof claims
- summary
- idempotency key

Boreal response:

- created artifact id
- attached request id
- proof status
- whether owner review is required

The UI can show this as:

- "Proof submitted"
- "Artifact attached"
- "Waiting for buyer review"
- "Accepted delivery"

## "Optimize This" UX For Agents

Optimization should be advisory by default.

Agent input:

- `requestId`
- selected plan or flow snapshot
- proposed changes
- reason
- risk changes
- proof changes
- human/local work changes

Boreal response:

- recommendation artifact or derived suggestion
- no mutation unless owner accepts

The UI can show this as:

- "Suggested improvement"
- "Plan diff"
- "Accept change"
- "Reject"

## Agent-Readable Guardrails

Every agent-facing guide should say:

- If the request requires physical presence, do not solve it with text alone.
- If proof is required, attach proof as `Artifact`.
- If you are not the owner, do not mutate the buyer-authored brief.
- If you are cross-actor supply, propose or fulfill through `Commitment` gates.
- If you only have public access, you can inspect public-safe fields only.
- If you need private data, request a scoped token or owner approval.
- If a tool call spends money or credits, the run must attach `Transaction` truth.
- If you create output, make it attributable and reviewable.
- If you are monitoring only, do not create durable events for heartbeats.

## Roadmap

### Phase 0: Canon And Documentation

Deliverables:

- this blueprint
- state-register entry
- `LIVE_VS_TARGET` target notes
- test-matrix readiness checks
- public `/llms.txt` enrichment plan

Acceptance:

- agents are described as participants over canonical objects, not new roots
- protocols are mapped to Boreal layers
- current versus target claims are explicit

### Phase 1: Read-Only Agent Discovery

Deliverables:

- `/agents/start.md` - implemented as a public markdown route in `apps/web`
- `/agents/actions.md` - implemented as a public markdown action playbook for inspect, make-request, apply, submit, monitor, run, and optimize flows
- `/agents/access-review.json` - implemented as a public machine-readable operator-review profile for requested scopes, rate limits, revocation triggers, decision outcomes, and target adapter claims
- `POST /agents/access-review/prepare` and `schemas/json/agent-access-review-preparation.schema.json` - implemented as manual operator-review handoff preparation for validated production access packets without persistence, credentials, permissions, or production sandbox creation
- `/agents/auth.json` - implemented as a public machine-readable auth profile for actor classes, auth schemes, scopes, approval boundaries, idempotency, and explicit non-grants
- `POST /agents/auth/prepare` and `schemas/json/agent-auth-preparation.schema.json` - implemented as plan-only action auth preparation for scheme, scope, approval, policy, and idempotency checks without credentials, permissions, production access, payment authority, completion proof, or durable writes
- `/agents/conformance.json` - implemented as a public machine-readable checklist for discovery, auth, handoff, work actions, proof, payment, recovery, sandbox, and protocol boundaries before production use
- `schemas/json/agent-conformance-report.schema.json` and `fixtures/agent/conformance-report.sample.json` - implemented as a public machine-readable report shape and sample for packaging sandbox replay evidence, requested scopes, target protocol claims, secret-handling posture, and human-review questions
- `/agents/conformance-report.example.json` - implemented as the public fetchable conformance report example package
- `/agents/production-access-packet.example.json`, `schemas/json/agent-production-access-packet.schema.json`, and `fixtures/agent/production-access-packet.sample.json` - implemented as a checked operator-review packet example for represented actor, minimal scopes, sandbox evidence, rate limits, human escalation, data handling, idempotency, payment boundary, and target-protocol claims
- `POST /agents/intake/validate` and `schemas/json/agent-intake-validation.schema.json` - implemented as a validation-only preflight for conformance reports and production access packets before human or operator review
- `POST /agents/actions/preflight` and `schemas/json/agent-action-preflight.schema.json` - implemented as a validation-only preflight for action prerequisites before agents attempt governed HTTP routes
- `/agents/client-kit.json` and `schemas/json/agent-client-kit.schema.json` - implemented as a public machine-readable client-generation manifest over existing OpenAPI, JSON Schema, AsyncAPI, validation, preparation, sandbox, and target protocol surfaces without becoming an SDK package, permission grant, credential, adapter, payment authority, completion proof, or durable truth object
- `/agents/journeys.json` and `schemas/json/agent-journeys.schema.json` - implemented as a public machine-readable role journey profile over existing contracts for requester, solver, monitor, optimizer, payment, and onboarding agents without becoming workflow authority, permission, payment authority, completion proof, or durable truth
- `/agents/completion.json` - implemented as a public machine-readable completion profile for proof packets, Artifact guidance, completion claims, and review boundaries
- `POST /agents/completion/validate` and `schemas/json/agent-completion-validation.schema.json` - implemented as a validation-only preflight for completion claim packets before agents render draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, or completed language
- `/agents/delegation.json` - implemented as a public machine-readable human delegation profile for consent screens, scope minimization, account-session use, resolver bearer delegation, target OAuth, revocation, and per-action approval expiry
- `/agents/evidence.json` - implemented as a public machine-readable evidence profile for proof packets, Artifact packaging, redaction, review signals, and retry-safe submission boundaries
- `POST /agents/evidence/validate` and `schemas/json/agent-evidence-validation.schema.json` - implemented as a validation-only preflight for proof, delivery, receipt, and handoff packet shape before governed Artifact submission
- `/agents/error-examples.json` - implemented as a public RFC 9457-style problem-details example pack for safe auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and unknown-write recovery
- `/agents/execution.json` - implemented as a public machine-readable execution profile for `Fulfillment` lanes, `FulfillmentStep` sub-work, direct-owner exceptions, runtime signal promotion, retry, and non-root adapter boundaries
- `/agents/human-handoffs.json` - implemented as a public machine-readable handoff profile for human approval moments, stop rules, escalation packets, visible UX patterns, and safe claim-state language
- `/agents/http.json` - implemented as a public machine-readable HTTP reference profile for current route families, OpenAPI sources, auth, scopes, idempotency, preflight order, non-HTTP fallbacks, and canonical write boundaries
- `/agents/ux.json` - implemented as a public machine-readable agent UX profile for human-first discovery, consent, action, monitoring, proof review, payment authorization, optimization, and completion claim surfaces
- `/agents/monitoring.json` - implemented as a public machine-readable monitoring profile for cursor polling, stale-state detection, escalation triggers, and live-versus-target push delivery boundaries
- `POST /agents/monitoring/prepare` and `schemas/json/agent-monitoring-preparation.schema.json` - implemented as plan-preparation for cursor polling, escalation handoff context, and target webhook receiver boundaries without reading activity, creating subscriptions, activating push delivery, writing heartbeat events, or proving completion
- `POST /agents/monitoring/validate` and `schemas/json/agent-monitoring-validation.schema.json` - implemented as a validation-only preflight for monitor plans, cursor checkpoints, escalation posture, private-access posture, no-heartbeat behavior, no-completion claims, and target signed-webhook receiver shape
- `POST /agents/sandbox/replay` and `schemas/json/agent-sandbox-replay.schema.json` - implemented as a validation-only preflight for sandbox replay evidence before conformance or production-access review packets
- `/agents/onboarding.json` - implemented as a public machine-readable onboarding profile for external-agent discovery, sandbox validation, scoped live HTTP use, target production access review, and target protocol adapter readiness
- `/agents/opportunities.json` - implemented as a public read-only opportunity discovery profile for public request fit scoring, local opportunity cards, and next-action selection without permission, assignment, payment, or completion authority
- `/agents/optimization.json` - implemented as a public machine-readable optimization profile for draft-only brief, proposal, evidence, monitor, and public-solution reuse improvements
- `POST /agents/optimization/prepare` and `schemas/json/agent-optimization-preparation.schema.json` - implemented as plan-preparation for draft-only optimization surface, no-invention, output-contract, owner-approval, and next-preflight guidance without generating optimized content or creating durable authority
- `/agents/payments.json` - implemented as a public machine-readable payment profile for buyer-credit, request funding, paid solution runs, idempotency, x402 target boundaries, and `Transaction` reconciliation
- `/agents/prompts.json` - implemented as a public machine-readable prompt catalog for briefing, applying, proof submission, monitoring, optimization, and recovery prompts
- `/agents/workflows.json` - implemented as a public machine-readable workflow catalog for scouting, making drafts, applying, submitting, monitoring, running, and optimizing with `agentActionPolicy` checkpoints
- `/agents/monitor-webhooks.md` - implemented as a public target profile for signed request-activity monitor callbacks
- `/agents/protocols.md` - implemented as a public MCP, A2A, and x402 boundary profile
- `/agents/protocols.json` - implemented as a public machine-readable MCP, A2A, and x402 protocol profile with adapter mappings, non-goals, implementation order, and canon boundaries
- `/agents/protocol-adapter-samples.json` - implemented as a public target-only MCP, A2A, and x402 sample payload pack
- `/agents/recovery.json` - implemented as a public machine-readable recovery profile for auth failures, missing scopes, idempotency conflicts, rate limits, monitor cursor recovery, blocked fulfillment retry, payment uncertainty, and escalation packets
- `/agents/readiness.json` - implemented as a public machine-readable readiness profile for live-versus-target capability bands, standard planes, agent UX flow, go/no-go checks, current limitations, and next implementation priorities
- `/agents/tools.json` - implemented as a public machine-readable tool registry for live HTTP calls, validation and preparation tools, target MCP tools, target A2A operations, idempotency, output truth, and canonical write boundaries
- `/agents/sandbox.md` and `/agents/sandbox.json` - implemented as a public contract-only sandbox guide and manifest with deterministic replay scenarios
- `/agents/sandbox/replay` - implemented as a public validation-only endpoint for checking sandbox replay evidence against manifest scenarios without granting access or creating durable truth
- `/.well-known/agent-card.json` - implemented as a public-safe JSON card in `apps/web`
- public OpenAPI route or static export - implemented as `/openapi.json` plus allowlisted YAML contract exports
- OpenAPI auth metadata for agent-callable routes - implemented for request, supply, payment, and resolver-auth exports with `security`, `BorealAccountSession`, `ResolverBearer`, and Boreal scope extensions where live routes support them
- public JSON Schema route or static export - implemented as allowlisted `/schemas/*.schema.json` exports
- public AsyncAPI route or static export - implemented as `/events/request-room.asyncapi.yaml`
- richer `/llms.txt` links to all agent-readable resources - implemented through the shared discovery catalog
- machine-readable agent action catalog - implemented in the agent card and `/openapi.json` as `x-boreal-agent-actions`
- machine-readable agent access review profile - implemented as `/agents/access-review.json`, linked from the agent card and `/openapi.json`
- machine-readable agent access review handoff preparation endpoint - implemented as `POST /agents/access-review/prepare`, linked from the agent card, access review profile, onboarding, readiness profile, `/llms.txt`, sandbox manifest, and `/openapi.json`
- machine-readable agent auth profile - implemented as `/agents/auth.json`, linked from the agent card and `/openapi.json`
- machine-readable agent auth preparation endpoint - implemented as `POST /agents/auth/prepare`, linked from the agent card, auth profile, start guide, `/llms.txt`, sandbox manifest, and `/openapi.json`
- machine-readable agent conformance profile - implemented as `/agents/conformance.json`, linked from the agent card and `/openapi.json`
- machine-readable agent conformance report schema - implemented as `/schemas/agent-conformance-report.schema.json`, linked from the conformance profile and public schema catalog
- machine-readable agent conformance report example - implemented as `/agents/conformance-report.example.json`, linked from the conformance profile and `/openapi.json`
- machine-readable production access packet example - implemented as `/agents/production-access-packet.example.json`, linked from onboarding, access review, conformance, `/llms.txt`, and `/openapi.json`
- machine-readable agent intake validation endpoint - implemented as `POST /agents/intake/validate`, linked from the agent card, start guide, `/llms.txt`, sandbox manifest, readiness profile, and `/openapi.json`
- machine-readable agent action preflight endpoint - implemented as `POST /agents/actions/preflight`, linked from the agent card, start guide, `/llms.txt`, sandbox manifest, UX profile, readiness profile, and `/openapi.json`
- machine-readable agent client kit manifest - implemented as `/agents/client-kit.json`, linked from the agent card, start guide, `/llms.txt`, readiness profile, public schema catalog, and `/openapi.json`
- machine-readable agent journey profile - implemented as `/agents/journeys.json`, linked from the agent card, start guide, `/llms.txt`, UX profile, client kit, readiness profile, public schema catalog, and `/openapi.json`
- machine-readable agent sandbox replay validation endpoint - implemented as `POST /agents/sandbox/replay`, linked from the agent card, start guide, sandbox manifest, onboarding, readiness profile, `/llms.txt`, and `/openapi.json`
- machine-readable agent completion profile - implemented as `/agents/completion.json`, linked from the agent card and `/openapi.json`
- machine-readable agent completion validation endpoint - implemented as `POST /agents/completion/validate`, linked from the agent card, start guide, `/llms.txt`, sandbox manifest, completion profile, readiness profile, and `/openapi.json`
- machine-readable agent human delegation profile - implemented as `/agents/delegation.json`, linked from the agent card, auth profile, start guide, `/llms.txt`, and `/openapi.json`
- machine-readable agent evidence profile - implemented as `/agents/evidence.json`, linked from the agent card and `/openapi.json`
- machine-readable agent evidence validation endpoint - implemented as `POST /agents/evidence/validate`, linked from the agent card, start guide, `/llms.txt`, sandbox manifest, completion profile, evidence profile, readiness profile, and `/openapi.json`
- machine-readable agent error examples - implemented as `/agents/error-examples.json`, linked from the recovery profile and `/openapi.json`
- machine-readable agent execution profile - implemented as `/agents/execution.json`, linked from the agent card and `/openapi.json`
- machine-readable agent human handoff profile - implemented as `/agents/human-handoffs.json`, linked from the agent card and `/openapi.json`
- machine-readable agent human handoff packet examples - implemented as `/agents/human-handoff-packets.example.json`, linked from the human handoff profile and `/openapi.json`
- machine-readable agent HTTP reference profile - implemented as `/agents/http.json`, linked from the agent card, start guide, `/llms.txt`, sandbox manifest, and `/openapi.json`
- machine-readable agent UX profile - implemented as `/agents/ux.json`, linked from the agent card, start guide, `/llms.txt`, sandbox manifest, conformance profile, and `/openapi.json`
- machine-readable agent monitoring profile - implemented as `/agents/monitoring.json`, linked from the agent card and `/openapi.json`
- machine-readable agent onboarding profile - implemented as `/agents/onboarding.json`, linked from the agent card and `/openapi.json`
- machine-readable agent opportunity discovery profile - implemented as `/agents/opportunities.json`, linked from the agent card, start guide, `/llms.txt`, and `/openapi.json`
- machine-readable agent optimization profile - implemented as `/agents/optimization.json`, linked from the agent card and `/openapi.json`
- machine-readable agent optimization preparation endpoint - implemented as `POST /agents/optimization/prepare`, linked from the agent card, optimization profile, start guide, `/llms.txt`, sandbox manifest, readiness profile, and `/openapi.json`
- machine-readable agent payment profile - implemented as `/agents/payments.json`, linked from the agent card and `/openapi.json`
- machine-readable agent prompt catalog - implemented as `/agents/prompts.json`, linked from the agent card and `/openapi.json`
- machine-readable agent workflow catalog - implemented as `/agents/workflows.json`, linked from the agent card and `/openapi.json`
- machine-readable agent protocol profile - implemented as `/agents/protocols.json`, linked from the agent card and `/openapi.json`
- machine-readable agent protocol adapter samples - implemented as `/agents/protocol-adapter-samples.json`, linked from the protocol profile and `/openapi.json`
- machine-readable agent recovery profile - implemented as `/agents/recovery.json`, linked from the agent card and `/openapi.json`
- machine-readable agent readiness profile - implemented as `/agents/readiness.json`, linked from the agent card and `/openapi.json`
- machine-readable agent tool registry - implemented as `/agents/tools.json`, linked from the agent card and `/openapi.json`
- request-level `agentActionAffordances` on public request projections - implemented in `toPublicRequestPoolEntry`
- request-detail `agentActionPolicy` decisions for anonymous, session, and resolver actors - implemented in the request detail API as a derived policy envelope
- agent sandbox fixture runner - implemented as `pnpm contracts:agent-sandbox`
- conformance report fixture validation - implemented inside `pnpm contracts:agent-sandbox`
- production access packet fixture validation - implemented inside `pnpm contracts:agent-sandbox`
- error examples fixture validation - implemented inside `pnpm contracts:agent-sandbox`
- human handoff packet fixture validation - implemented inside `pnpm contracts:agent-sandbox`
- access review public contract validation - implemented inside `apps/web/tests/contracts/agent-discovery.test.ts`

Acceptance:

- an unauthenticated agent can discover Boreal, inspect public requests, find schemas, and understand auth boundaries without private endpoints
- draft/private requests remain hidden
- an agent can identify the canonical read/write object for inspect, make-request, apply, submit, monitor, run, and optimize intents without inventing a parallel workflow
- an agent can choose a requester, solver, monitor, optimizer, payment, or onboarding journey and see required contracts, human-visible state, stop conditions, and canonical writes without treating the journey as permission or completion authority
- an agent can read a public Request projection and see concrete request-bound affordances for next actions instead of inferring them from UI labels
- an agent can show a human an action-specific consent screen with required scopes, canonical writes, expiration or revocation path, and non-grants before requesting delegated authority
- an agent can map live HTTP route families, auth schemes, scopes, idempotency requirements, OpenAPI sources, and non-HTTP fallbacks without treating the reference as a new API surface
- an agent can render a human-first process surface for discovery, consent, action, monitoring, proof review, payment authorization, optimization, and completion claims without treating UX state as durable truth
- an agent can validate conformance-report and production-access-packet shape before human or operator review without treating validation as access, approval, payment authority, production sandbox creation, or completion proof
- an agent can preflight apply, submit, monitor, run, and optimize prerequisites before attempting real routes without treating preflight as permission, approval, payment authority, artifact publication, commitment proposal, request mutation, or completion proof
- an agent can validate proof and delivery packet shape before `submit_artifact` without treating validation as Artifact publication, file storage, review acceptance, payment authority, durable history, or completion proof

Current evidence:

- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the public card, start guide, action catalog, discovery index, allowlisted exports, and `Request` root boundary.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the action playbook route and its live HTTP sketches for make-request, apply, submit, monitor, and run flows.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent auth profile, resolver bearer and target OAuth boundaries, scope non-grants, auth preparation pass and fail shapes, non-authority flags, OpenAPI links, `/llms.txt`, sandbox manifest, and public schema routes.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent access review profile, requested-scope review, low-volume pilot rate limit, revocation triggers, decision outcomes, non-credential boundary, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the public conformance report example route, report kind, operator-review status, non-credential boundary, and OpenAPI index link.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the public production access packet example route, packet kind, operator-review status, non-production boundary, target-protocol boundary, payment non-authority, onboarding link, OpenAPI path, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the validation-only intake endpoint for passing conformance reports, passing production access packets, malformed bodies, non-authority flags, OpenAPI path and extension, public schema route, `/llms.txt`, start-guide, sandbox-manifest, and readiness links.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the validation-only action preflight endpoint for passing apply and monitor checks, failed missing prerequisites, malformed bodies, non-authority flags, OpenAPI path and extension, public schema route, `/llms.txt`, start-guide, sandbox-manifest, UX profile, and readiness links.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent completion profile, proof packet, Artifact and owner-review boundaries, non-completion truth list, public schema route, and validation-only completion endpoint for pass, fail, malformed, non-authority, OpenAPI, start-guide, `/llms.txt`, sandbox-manifest, completion-profile, and readiness links.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the validation-only evidence endpoint for passing proof packets, failing secret/completion/payment-only packets, malformed bodies, non-authority flags, OpenAPI path and extension, public schema route, `/llms.txt`, start-guide, sandbox-manifest, evidence profile, completion profile, and readiness links.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent human delegation profile, live account-session and resolver-bearer modes, target OAuth boundary, action consent flows, revocation routes, non-grant boundary, OpenAPI extension, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent HTTP reference profile, OpenAPI source list, route families, idempotency-required HTTP intents, non-HTTP fallbacks, non-new-API boundary, OpenAPI extension, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent UX profile, process stages, visible surfaces, human-first rules, completion-label evidence requirements, non-workflow-engine boundary, conformance check, OpenAPI extension, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent error example pack, problem-details standard, unknown-write retry policy, payment Transaction read, public route, OpenAPI extension, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent execution profile, accepted-commitment lane, direct-owner exception, ephemeral runtime signal rules, `FulfillmentStep` default, non-root adapter boundary, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the public human handoff packet example route, packet schema route, draft approval, proof review, monitor escalation, and non-approval-record boundary.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent onboarding profile, contract sandbox validation stage, target OAuth-compatible external-agent path, production access packet fields, production packet example link, go-live checks, non-credential-issuer boundary, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent opportunity discovery profile, public request entrypoint, read-only affordance requirements, fit dimensions, next-action writes, non-permission boundary, OpenAPI extension, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent payment profile, free inspection boundary, account-session spend surfaces, idempotency, target x402 boundary, `Transaction` truth, non-root payment objects, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent prompt catalog, apply and submit prompt mappings, draft-only output contract, non-mutation boundary, OpenAPI extension, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent protocol adapter sample pack, MCP/A2A/x402 sample coverage, target-only status, non-permission boundary, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent readiness profile, live and target capability bands, standards map, agent UX flow, go/no-go checks, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent client kit manifest, generation order, contract-source catalog, non-authority client surfaces, OpenAPI extension, public route, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent journey profile, requester and solver role mappings, optimizer no-write behavior, completion-truth decision rule, non-authority boundary, OpenAPI extension, public route, `/llms.txt`, and public schema route.
- `apps/web/tests/contracts/agent-discovery.test.ts` verifies the agent tool registry, HTTP invocation baseline, validation and preparation tool categories, target MCP/A2A mappings, idempotency, optimization draft-only behavior, optimization preparation pass/fail route behavior, payment mutation boundaries, non-root tool objects, and public schema route.
- `pnpm contracts:agent-sandbox` verifies the sandbox fixture, mock identity coverage, idempotency samples, cursor sample, signed-webhook sample, draft-only optimization sample, deterministic replay scenarios, conformance report fixture, production access packet fixture, and production-auth boundary.
- `apps/web/tests/contracts/request-boundary.test.ts` verifies public request action affordances, keeps owner-only routing and planner internals out of public projections, and only exposes `run_public_solution` when completed public solution truth exists.

### Phase 2: Authenticated Agent Writes

Deliverables:

- scoped external-agent auth or OAuth-compatible token flow
- resolver-token expansion only where runtime approval is the right identity boundary
- idempotency requirements on all agent write endpoints
- auth profile for actor class, scope, approval, and non-grant handling - first machine-readable profile is live in `/agents/auth.json`; live external-agent OAuth remains target
- human delegation profile for consent screens, scope minimization, revocation, and per-action approval expiry - first machine-readable profile is live in `/agents/delegation.json`; persisted consent receipts and external OAuth authorization remain target
- "apply to request" guide - first public contract-linked sketch is live in `/agents/actions.md`; sandbox-auth walkthrough remains target
- "submit proof" guide - first public contract-linked sketch is live in `/agents/actions.md`; sandbox-auth walkthrough remains target
- "monitor request" guide - first public contract-linked sketch is live in `/agents/actions.md`; `after_sequence` cursor polling and signed receiver profile are live, while subscription persistence and delivery remain target
- human approval and escalation guide - first machine-readable handoff profile is live in `/agents/human-handoffs.json`; persisted approval records, review prompts, and escalation inboxes remain target

Acceptance:

- an authorized agent can propose a commitment, publish an artifact, and monitor activity through canonical endpoints
- public or cross-actor fulfillment still requires commitment acceptance

### Phase 3: MCP Server Profile

Deliverables:

- Boreal MCP gateway workspace following decision `0024-agent-protocol-gateway-topology`
- resource list for public requests, request details, schemas, activity, and artifacts - first profile listed in `/agents/protocols.md` and `standards/agent-protocol-profile.md`
- tools for propose commitment, publish artifact, monitor request, run public solution, payment reconciliation, draft optimization, validation, and preparation - first machine-readable registry is live in `/agents/tools.json`, while the live MCP server remains target
- prompts for briefing, applying, submitting proof, and plan optimization - first profile listed in `/agents/protocols.md` and `standards/agent-protocol-profile.md`

Acceptance:

- MCP tools enforce the same scopes and business gates as HTTP endpoints
- MCP resources do not leak private transcripts or owner-only draft state

### Phase 4: A2A Adapter

Deliverables:

- A2A-compatible agent card
- A2A task adapter for public request application and monitoring
- A2A artifact mapping to Boreal `Artifact`
- SSE streaming support for task status where appropriate
- signed push notification target for long-running work

Acceptance:

- A2A tasks map to request-bound operations without replacing the `Request` root
- artifacts and completion states preserve Boreal review and proof boundaries

### Phase 5: Agent Payments

Deliverables:

- payment-agent guide - first machine-readable profile is live in `/agents/payments.json`
- optional x402 payment challenge for selected paid execution endpoints - target endpoint activation remains open
- reconciliation into Boreal `Transaction` - first profile and payment OpenAPI contract require this boundary
- no private wallet key handling inside Boreal web

Acceptance:

- an account-session agent can pay for a live paid run through existing buyer-credit routes without creating fake completion truth
- every paid run reconciles with request-attached transaction truth before the agent claims paid execution started
- x402 remains target-only until a live endpoint is explicitly marked x402-capable

### Phase 6: Sandbox And Trust

Deliverables:

- sandbox request/project for agents
- contract-only mock identities, sample payloads, deterministic replay scenarios, and fixture runner - first slice implemented through `/agents/sandbox.json` and `pnpm contracts:agent-sandbox`
- operator-review profile for requested scopes, low-volume pilots, rate limits, revocation triggers, and target adapter claims - first slice implemented through `/agents/access-review.json`
- production test credentials
- rate limits
- abuse controls
- artifact scanning and proof review checks
- reputation and review signal model

Acceptance:

- agents can test end-to-end flows without polluting production request truth
- unsafe agents cannot mass-mutate, spam proposals, or leak private data

## Acceptance Checklist

Boreal is agent-ready when all of these are true:

- A fresh agent can read `/llms.txt` and find the agent start guide.
- A fresh agent can fetch the agent card from a well-known URL.
- A fresh agent can find OpenAPI, JSON Schema, and AsyncAPI contracts from public documentation.
- A fresh agent can find the access review profile and understand that scoped pilot or production access needs operator review, scope minimization, rate limits, revocation policy, and live credentials outside the profile.
- A fresh agent can find the auth profile and distinguish anonymous reads, account sessions, resolver bearers, and target OAuth-compatible delegation.
- A fresh agent can run auth preparation for a specific action and understand which auth scheme, scope, approval, policy, and idempotency checks are required without treating the result as a credential or permission grant.
- A fresh agent can find the conformance profile and understand which discovery, auth, handoff, action, proof, payment, recovery, sandbox, and protocol checks it must pass before production use.
- A fresh agent can find the conformance report schema and package sandbox replay results, requested scopes, protocol claims, secret-handling posture, and human-review questions without treating the report as a permission grant.
- A fresh agent can fetch the conformance report example and mirror its shape without treating the example as a submission, approval, credential, or certification.
- A fresh agent can fetch the production access packet example and mirror its represented-actor, minimal-scope, sandbox-evidence, rate-limit, human-escalation, data-handling, idempotency, payment-boundary, and target-protocol sections without treating the packet as production authority.
- A fresh agent can preflight an intended action and receive missing requirements, required scopes, canonical writes, route contracts, and non-authority flags before attempting live apply, submit, monitor, run, or optimize work.
- A fresh agent can fetch the client kit manifest and separate generated public-read, guardrail, authorized-work, payment, sandbox, and target-adapter clients without treating generated code as permission, production credentials, payment authority, adapter liveness, completion proof, or durable truth.
- A fresh agent can find the completion profile and distinguish draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, and completed claims.
- A fresh agent can validate completion claim packet shape before rendering or acting on draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, or completed language and see required truth, missing fields, warnings, next steps, and non-authority flags.
- A fresh agent can validate proof or delivery packet shape before `submit_artifact` and see which fields, redaction boundaries, claim-state limits, and non-authority flags apply.
- A fresh agent can find the delegation profile and distinguish public read, account-session assisted use, resolver device delegation, target OAuth delegation, operator-reviewed pilot paths, consent screens, revocation, and per-action approval expiry without treating delegation as permission, spend authority, or completion truth.
- A fresh agent can find the HTTP reference profile and map live route families, auth schemes, scopes, idempotency requirements, OpenAPI sources, canonical write boundaries, and non-HTTP fallbacks without treating it as a permission grant or new API surface.
- A fresh agent can find the UX profile and render human-first process stages and visible surfaces for discovery, delegation, action, monitor, proof review, payment, optimization, and completion claims without treating UX state as approval, payment, permission, adapter, or completion proof.
- A fresh agent can find the evidence profile and understand how to package proof, receipts, files, media, redaction statements, review signals, and bounded artifact claims.
- A fresh agent can fetch error examples and handle auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and unknown-write failures without treating problem responses as durable history or retry authority.
- A fresh agent can find the execution profile and distinguish accepted-commitment execution, owner-private direct execution, public solution runs, target adapter execution, runtime signal promotion, retry, and `FulfillmentStep` sub-work boundaries.
- A fresh agent can find the human handoff profile and distinguish when to ask, stop, request approval, escalate, or use precise claim-state language.
- A fresh agent can fetch human handoff packet examples and render draft approval, Commitment review, proof review, monitor escalation, and payment authorization cards without treating those cards as approval, spend authority, or completion proof.
- A fresh agent can find the monitoring profile and distinguish live cursor polling, target signed push delivery, stale-state detection, and escalation triggers.
- A fresh agent can find the onboarding profile and distinguish public discovery, contract-only sandbox validation, scoped live HTTP use, target production access review, target production sandbox credentials, and target protocol adapter readiness.
- A fresh agent can find the opportunity discovery profile and rank public requests into local opportunity cards without treating fit scores, recommended actions, or public board rows as permission, assignment, payment authority, or completion proof.
- A fresh agent can find sandbox replay scenarios for drafting a request, applying to a request, submitting proof, monitoring activity, running a public solution shape, and recovering from uncertain writes without treating those transcripts as production authority.
- A fresh agent can find the optimization profile and distinguish draft-only improvement from owner-approved durable mutation.
- A fresh agent can call the optimization preparation endpoint before drafting suggestions and receive surface, no-invention, output-contract, owner-approval, and next-preflight guidance without treating it as mutation, approval, payment, completion, or durable history.
- A fresh agent can find the payment profile and distinguish free inspection, buyer-credit support ledger state, request-attached `Transaction` truth, live account-session spend authority, and target x402 activation.
- A fresh agent can find the prompt catalog and use briefing, applying, proof submission, monitoring, optimization, and recovery prompts without treating prompt output as mutation, approval, payment, proof, or completion truth.
- A fresh agent can fetch protocol adapter samples and understand how MCP tool calls, A2A tasks or artifacts, and x402 payment payloads map to Boreal routes without becoming canonical roots or live adapters.
- A fresh agent can find the readiness profile and distinguish live public reads, live authenticated HTTP contracts, contract-only sandbox flows, and target OAuth, MCP, A2A, and x402 layers.
- A fresh agent can find the tool registry and map common agent intents to safe HTTP calls, validation/preparation guardrail tools, target MCP tools, target A2A operations, idempotency requirements, and canonical writes.
- A fresh agent can inspect public requests without auth.
- Draft and private requests are not exposed through public reads.
- A scoped requester agent can create or update a draft request without opening it automatically.
- A scoped solver agent can submit a commitment proposal against an open public request.
- A scoped solver agent can publish an artifact only after commitment acceptance or direct-owner authorization.
- A monitor agent can read or subscribe to durable request activity and resume from a cursor or idempotent checkpoint.
- MCP tools enforce the same permissions as HTTP endpoints.
- A2A task mapping preserves Boreal `Request` as root.
- Public solution inspection is free.
- Public solution execution creates a private run request and records credit or payment truth.
- x402, if used, reconciles into `Transaction` and never replaces it.
- Desktop or resolver runtimes cannot use raw runtime identity as Boreal actor identity.
- Ephemeral runtime signals are not durable `RequestEvent` history unless explicitly promoted.

## Open Decisions

- Should external agent auth be OAuth-compatible from day one, or should resolver-style approval be the first write-capable path?
- Which read-only MCP resources should ship first once `packages/agent-protocol` and `apps/gateway-agent` are activated?
- Which A2A task operations should ship first after the request-bound write path, sandbox credentials, and operator-review rules are proven?
- Which schemas should be exposed publicly before private write APIs are stable?
- Which public solution run types should be x402-capable first?
- What rate limits and review queues are needed before public agent proposals are enabled?
- What is the minimum isolated write sandbox, beyond contract replay scenarios, that lets agents test apply, submit, monitor, and run flows safely with revocable credentials?

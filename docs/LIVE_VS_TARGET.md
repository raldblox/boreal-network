# Live Vs Target

This file separates what Boreal Network can claim now from what it is still aiming toward.

Because this repository is a canon repository and now the canonical Boreal monorepo, `live` here means claimable from the current canon, topology, and machine-readable baseline in this repo.  It does not automatically mean every workspace already ships a production-ready implementation.

## How To Read This File

Use three layers only:

- `Canon-locked now` for meaning the repo already commits to.
- `Machine-modeled now` for meaning that already has schema or fixture proof in this repo.
- `Target direction` for meaning that is part of the intended design but not yet fully modeled or proven here.

If a statement does not clearly fit the first two layers, phrase it as target direction.

## Canon-Locked Now

These are safe to state as present canon truth:

- Boreal is `request-native work commerce`.
- Boreal's system shape is a `request-native work network`.
- Boreal is `chat-native` at the interface layer.
- Boreal's thesis is `intent-to-fulfillment for work`.
- `Request` is the durable root object.
- Boreal's official public voice can say that Boreal turns requests into completed work, as long as implementation-specific claims still follow this file.
- `Air traffic control for work` is allowed as an explanatory analogy, not as canonical object or protocol language.
- `Supply` is the canonical opposite-side object.
- `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, and `RequestEvent` are canonical objects in the network model.
- Boreal Network is Boreal's canonical monorepo.
- Root canon and governed workspaces now coexist in the same repository.
- Active namespace roots are `apps/`, `packages/`, `skills/`, and `standards/`.
- `apps/web/` is the first activated implementation workspace.
- The first commercial wedge is startup and SMB buyers of high-value digital work with fuzzy intake and mixed human-plus-AI fulfillment.
- The primary business model is funded-request GMV take rate first, with premium workflow and private-supply layers later.
- The current launch motion is buyer-funded request pilots first and curated supply whitelist second.
- Risk escalation is mandatory when a change could break canon, contracts, durable history, or workspace boundaries.
- Match the lead first, plan the work second, and decompose only when needed.
- Planner, matcher, policy, and mutation boundaries are canonical Boreal processing layers.
- Boreal is for work that AI cannot responsibly finish alone.
- Boreal Desktop exists to keep local runtime, human intervention, and verification inside the workflow instead of treating one-shot output as completion.
- desktop-local ephemeral realtime traffic is separate from durable Boreal request history unless it is explicitly promoted
- the first ephemeral realtime hub is the Electron main process inside `apps/desktop`
- workflow-backed execution may back a published `Supply` through support objects or typed metadata without replacing `Supply` or `Request` as canonical roots
- first-party buyer credit may exist through support objects without replacing request-attached `Transaction` truth for funded work
- optional request grants attach to one durable `Request` through participants, commitments, transactions, artifacts, and events instead of creating a new grant root
- public solution surfaces are projections over completed requests and accepted artifacts, not canonical root objects
- public solution inspection is free by default, while live solution runs may consume credits when they use inference, provider APIs, workflow execution, human review, or other service capacity
- the first credit-metered public solution run endpoint creates or reuses a private run `Request` that references the source accepted artifact and records buyer-credit debit plus request-attached `Transaction` truth
- reusable scratch-chat prompt runs are a separate V1 chat-interface lane: they create or reuse a private scratch chat with source provenance, are free for now, and are quota-gated instead of credit-debited
- passive funder cash revenue-share, investment, yield, dividend, and tax-deductible donation language are outside the first accepted model

## Public Pilot Boundary

Until the Gate 1 public-pilot checklist in `docs/strategy/SELF_SERVE_MARKETPLACE_LAUNCH_PLAN.md` is complete, public-facing launch language must stay at the pilot layer.

Safe pilot claims:

- Boreal is preparing or running buyer-funded request pilots for request-native work commerce.
- Pilot supply is curated or whitelisted rather than open marketplace liquidity.
- Pilot work should stay in narrow digital-service lanes where request intake, commitment, fulfillment, artifact review, and payment or credit state can be monitored from canonical records.
- Public request browsing may be described only for public-safe projections that exclude owner-only fields and planner-internal fields.
- Desktop and peer runtimes may be described as execution participants or transport foundations, not as independent sources of Boreal request truth.

Unsafe pilot claims:

- Boreal is already a broad self-serve public marketplace.
- Any supply can already publish publicly and transact without curation.
- Public solution surfaces, request grants, and metered solution runs are fully live marketplace features.
- Public or cross-actor request execution is fully isolated for untrusted work unless the specific shipped lane proves it.
- Pilot evidence proves every target vertical, fulfillment class, payment path, dispute path, or public-market path.

Before widening beyond this pilot boundary, update this file only after the relevant behavior is machine-modeled, tested, or live in the governed workspaces.

## Machine-Modeled Now

These are already backed by machine-readable artifacts or deterministic fixtures in this repo:

- `schemas/json/common.schema.json`
- `schemas/json/request.schema.json`
- `schemas/json/supply.schema.json`
- `schemas/json/commitment.schema.json`
- `schemas/json/artifact.schema.json`
- `schemas/json/fulfillment.schema.json`
- `schemas/json/transaction.schema.json`
- `schemas/json/request-event.schema.json`
- `schemas/openapi/request-briefing.openapi.yaml`
- `schemas/openapi/supply-management.openapi.yaml`
- `schemas/openapi/resolver-auth.openapi.yaml`
- `schemas/openapi/boreal-agents.openapi.yaml`
- `fixtures/request/golden-external-ai-automation-thread.json`
- `fixtures/request/eval-complex-human-planning-and-match.json`
- `fixtures/request/eval-complex-human-planning-and-match.actual.sample.json`
- `tests/contracts/run-request-processing-evals.mjs`
- `schemas/json/in-house-worker-application-profile.schema.json`
- `fixtures/agent/in-house-worker-application-profile.sample.json`
- `tests/contracts/run-in-house-worker-application-profile.mjs`
- `package.json`
- `pnpm-workspace.yaml`
- `apps/web/package.json`
- `apps/web/app/agents/start.md/route.ts`
- `apps/web/app/agents/access-review.json/route.ts`
- `apps/web/app/agents/access-review/prepare/route.ts`
- `apps/web/lib/agent-access-review-preparation.ts`
- `apps/web/app/agents/auth.json/route.ts`
- `apps/web/app/agents/auth/prepare/route.ts`
- `apps/web/lib/agent-auth-preparation.ts`
- `apps/web/app/agents/conformance.json/route.ts`
- `apps/web/app/agents/conformance-report.example.json/route.ts`
- `apps/web/app/agents/production-access-packet.example.json/route.ts`
- `apps/web/app/agents/completion.json/route.ts`
- `apps/web/app/agents/completion/validate/route.ts`
- `apps/web/lib/agent-completion-validation.ts`
- `apps/web/app/agents/delegation.json/route.ts`
- `apps/web/app/agents/evidence.json/route.ts`
- `apps/web/app/agents/evidence/validate/route.ts`
- `apps/web/lib/agent-evidence-validation.ts`
- `apps/web/app/agents/error-examples.json/route.ts`
- `apps/web/app/agents/execution.json/route.ts`
- `apps/web/app/agents/human-handoffs.json/route.ts`
- `apps/web/app/agents/human-handoff-packets.example.json/route.ts`
- `apps/web/app/agents/http.json/route.ts`
- `apps/web/app/agents/ux.json/route.ts`
- `apps/web/app/agents/intake/validate/route.ts`
- `apps/web/lib/agent-intake-validation.ts`
- `apps/web/app/agents/actions/preflight/route.ts`
- `apps/web/app/agents/action-cards.example.json/route.ts`
- `apps/web/lib/agent-action-preflight.ts`
- `apps/web/app/agents/monitoring.json/route.ts`
- `apps/web/app/agents/monitoring/prepare/route.ts`
- `apps/web/lib/agent-monitoring-preparation.ts`
- `apps/web/app/agents/monitoring/validate/route.ts`
- `apps/web/lib/agent-monitoring-validation.ts`
- `apps/web/app/agents/sandbox/replay/route.ts`
- `apps/web/lib/agent-sandbox-replay-validation.ts`
- `apps/web/app/agents/onboarding.json/route.ts`
- `apps/web/app/agents/opportunities.json/route.ts`
- `apps/web/app/agents/optimization.json/route.ts`
- `apps/web/app/agents/optimization/prepare/route.ts`
- `apps/web/lib/agent-optimization-preparation.ts`
- `apps/web/lib/agent-write-sandbox-preparation.ts`
- `apps/web/app/agents/payments.json/route.ts`
- `apps/web/app/agents/prompts.json/route.ts`
- `apps/web/app/agents/protocol-adapter-samples.json/route.ts`
- `apps/web/app/agents/workflows.json/route.ts`
- `apps/web/app/agents/protocols.json/route.ts`
- `apps/web/app/agents/recovery.json/route.ts`
- `apps/web/app/agents/readiness.json/route.ts`
- `apps/web/app/agents/tools.json/route.ts`
- `apps/web/app/agents/write-sandbox.json/route.ts`
- `apps/web/app/agents/write-sandbox/prepare/route.ts`
- `apps/web/app/agents/sandbox.md/route.ts`
- `apps/web/app/agents/sandbox.json/route.ts`
- `apps/web/app/(chat)/home/beta/page.tsx`
- `apps/web/components/chat/homepage-beta.tsx`
- `apps/web/app/.well-known/agent-card.json/route.ts`
- `apps/web/app/openapi.json/route.ts`
- `apps/web/app/openapi/[contract]/route.ts`
- `apps/web/app/schemas/[schema]/route.ts`
- `apps/web/app/events/[contract]/route.ts`
- `apps/web/tests/contracts/agent-discovery.test.ts`
- `apps/web/lib/boreal-agents/registry.ts`
- `apps/web/lib/boreal-agents/application.ts`
- `apps/web/lib/boreal-agents/scan.ts`
- `apps/web/lib/request-supply-boundary.ts`
- `apps/web/app/(chat)/api/boreal-agents/[agentKey]/route.ts`
- `apps/web/tests/contracts/boreal-agents.test.ts`
- `fixtures/agent/action-cards.sample.json`
- `schemas/json/agent-access-review.schema.json`
- `schemas/json/agent-access-review-preparation.schema.json`
- `schemas/json/agent-sandbox.schema.json`
- `schemas/json/agent-sandbox-replay.schema.json`
- `schemas/json/agent-auth.schema.json`
- `schemas/json/agent-auth-preparation.schema.json`
- `schemas/json/agent-conformance.schema.json`
- `schemas/json/agent-conformance-report.schema.json`
- `schemas/json/agent-production-access-packet.schema.json`
- `schemas/json/agent-completion.schema.json`
- `schemas/json/agent-completion-validation.schema.json`
- `schemas/json/agent-delegation.schema.json`
- `schemas/json/agent-evidence.schema.json`
- `schemas/json/agent-evidence-validation.schema.json`
- `schemas/json/agent-error-examples.schema.json`
- `schemas/json/agent-execution.schema.json`
- `schemas/json/agent-human-handoffs.schema.json`
- `schemas/json/agent-human-handoff-packets.schema.json`
- `schemas/json/agent-http.schema.json`
- `schemas/json/agent-ux.schema.json`
- `schemas/json/agent-intake-validation.schema.json`
- `schemas/json/agent-action-preflight.schema.json`
- `schemas/json/agent-action-cards.schema.json`
- `schemas/json/agent-client-kit.schema.json`
- `schemas/json/agent-journeys.schema.json`
- `schemas/json/agent-monitoring.schema.json`
- `schemas/json/agent-monitoring-preparation.schema.json`
- `schemas/json/agent-monitoring-validation.schema.json`
- `schemas/json/agent-onboarding.schema.json`
- `schemas/json/agent-opportunities.schema.json`
- `schemas/json/agent-optimization.schema.json`
- `schemas/json/agent-optimization-preparation.schema.json`
- `schemas/json/agent-payments.schema.json`
- `schemas/json/agent-prompts.schema.json`
- `schemas/json/agent-workflows.schema.json`
- `schemas/json/agent-protocols.schema.json`
- `schemas/json/agent-standards.schema.json`
- `schemas/json/agent-protocol-adapter-samples.schema.json`
- `schemas/json/agent-recovery.schema.json`
- `schemas/json/agent-readiness.schema.json`
- `schemas/json/agent-write-sandbox.schema.json`
- `schemas/json/agent-write-sandbox-preparation.schema.json`
- `schemas/json/agent-tools.schema.json`
- `fixtures/agent/sandbox-manifest.sample.json`
- `fixtures/agent/conformance-report.sample.json`
- `fixtures/agent/error-examples.sample.json`
- `fixtures/agent/human-handoff-packets.sample.json`
- `fixtures/agent/production-access-packet.sample.json`

Today, the machine-readable baseline proves:

- one durable `Request` can carry intake, funding, fulfillment, and completion state
- one durable `Request` may exist early in `draft` status while the brief is still being formed
- one `open` plus `public` request can be exposed through a public-safe web pool listing
- one public-safe request detail view can be fetched directly by request id
- one public-safe open-request directory surface can keep public demand browsing separate from private workroom history
- one public solution run HTTP contract exists for creating a private credit-metered run request from a completed public request and accepted artifact
- one reusable prompt run HTTP contract exists for creating a private free chat fork from a public or owned scratch-chat user message, with source provenance stored on the forked user message and no `Request`, credit debit, or request transaction created
- one open request room can expose request activity derived from durable `RequestEvent`, `Commitment`, and `Artifact` records
- one public `/llms.txt` route exists and gives agents high-level public-page, claim-boundary, canonical-object, and agent-discovery guidance
- one read-only agent discovery package exists through `/agents/start.md`, `/.well-known/agent-card.json`, `/openapi.json`, public OpenAPI YAML exports, public JSON Schema exports, and the public request-room AsyncAPI export
- one target-only `/agents/write-sandbox.json` profile exists for decision `0025`, defining the future isolated non-production write-sandbox boundary, credential requirements, process order, minimum flow coverage, activation gates, and non-authority limits without making sandbox write credentials or mutating sandbox routes live
- one public `POST /agents/write-sandbox/prepare` route and `schemas/json/agent-write-sandbox-preparation.schema.json` check a proposed decision `0025` activation plan for environment, credential, production-rejection, route-enforcement, fixture, human-UX, payment, completion, and operator-handoff gates before review without issuing credentials, creating a live sandbox, granting production access, authorizing payment, proving completion, submitting review state, or writing durable history
- one desktop runtime can connect to Boreal web through resolver device approval, browse public and owned requests, and drive direct commitment, artifact, and fulfillment writes through scoped bearer auth
- one beta homepage candidate can render requests, services, campaigns, and reusable outcomes as UI-level Boreal work cards with visible request, plan, worker, funding, and outcome slots plus typed card taxonomy for canonical root, listing kind, worker attachment state, next boundary, and in/out scope; service families now carry typed request defaults, service prefill text exposes routing context and no-assignment boundaries, and service request starters keep worker or `Supply` attachment pending until checkout or request routing instead of pretending the listing assigned supply
- one request-flow card projection carries explicit read-only drag actions by card kind: `Request` to plan projection, plan or stage to worker application preparation, worker to delivery review, and delivery or step to proof inspection, without granting mutation authority or claiming assignment/completion
- one owned and private request may enter a direct desktop auto-fulfillment lane without a commitment object through a desktop auto-resolve policy, while public or cross-actor work still preserves the commitment gate
- one private request may carry an owner-scoped preferred supply, and one resolver-approved desktop may read owned supplies and bind direct auto-fulfillment to a published owned supply when the request override or desktop default selects it
- one `Supply` can be expressed as a durable capability object
- one owner-scoped `Supply` draft can be created, updated, deleted, and published through the first private or unlisted supply-management lane
- one `Supply` may carry runtime or resolver binding metadata without collapsing runtime identity into supply ownership
- one buyer-facing services surface can present first-party service families and preset plans without replacing `Supply` or `Request` as canonical roots
- one mode-aware web sidebar can keep request history, scratch chats, and supply management as contextual lists instead of rendering all histories together
- one `Commitment` can carry quoted or accepted commercial terms
- one `Artifact` can point to a stable document, external reference, or object reference instead of inflating the request root
- one open request can accept direct HTTP commitment and artifact writes in addition to chat tool-calling
- one accepted commitment can be advanced through direct HTTP acceptance and into a direct fulfillment lane
- one non-browser resolver runtime can bind to a Boreal account through a web approval flow and receive scoped Boreal-issued bearer tokens
- one request-room event stream contract now exists under `schemas/events/`, including commitment and fulfillment lifecycle coverage for the first resolver lane
- canonical machine-readable shapes now exist for `Fulfillment`, `Transaction`, and `RequestEvent`
- a deterministic end-to-end thread can be read without inventing missing IDs, statuses, or event names
- the repo is structured to host governed JS or TS workspaces under shared workspace discovery rules
- one complex human-led request can be evaluated deterministically across extraction, planning, matching, and policy outputs
- one request may now carry read-only planner-derived lead-role, role-slot, phase, execution, and proof-planning projections without weakening `brief` as the owner-editable input surface
- one desktop-local browser bridge can expose ephemeral SSE events from Electron main over `127.0.0.1` with session-token and localhost-origin checks
- one desktop-local browser bridge can expose the connected desktop runtime model catalog through a guarded localhost-only `/models` read surface for browser model selectors
- one localhost Boreal web chat surface can dispatch one selected `Codex/Desktop` prompt turn through a guarded localhost-only `POST /chat` bridge write and stream the reply back into the web message list
- one localhost Boreal web surface can auto-discover and link the running desktop runtime through a localhost-only bridge discovery read, without forcing a separate manual bridge page flow
- one localhost Boreal web request room may also read local desktop auto-resolve policy, desktop-default supply selection, and desktop-default Codex model or reasoning through that same guarded discovery lane, while still treating the `Request` object as durable route truth
- one runnable Pear or Hyperswarm peer foundation now exists under `apps/peer/` and `packages/network-*`, with a real peer keypair, control-topic host, and desktop-embedded peer runtime status
- one desktop tracked request lane can distinguish owner-private versus public or external trust tiers and block `Full` runtime on untrusted lanes while moving them onto a dedicated `.boreal-work` request workspace
- one public agent action catalog is exposed through the agent card and `/openapi.json`, mapping inspect, make-request, apply, submit, monitor, run, and optimize intents to canonical reads, writes, auth boundaries, standards, and contract links
- one public `/agents/workflows.json` workflow catalog gives agents machine-readable process flows for scouting public work, making human-owned drafts, applying, submitting artifacts, monitoring activity, running public solutions, and optimizing without durable writes
- one public `/agents/actions.md` playbook gives contract-linked walkthroughs and HTTP sketches for inspect, make-request, apply, submit, monitor, run, and optimize intents without creating a parallel agent ledger
- one public `/agents/client-kit.json` manifest and `schemas/json/agent-client-kit.schema.json` tell agents how to generate separate public-read, guardrail, authorized-work, payment, sandbox, and target-adapter clients from existing OpenAPI, JSON Schema, AsyncAPI, validation, preparation, and sandbox surfaces without granting permission, issuing credentials, creating a new API surface, activating adapters, authorizing spend, proving completion, or becoming durable truth
- one public `/agents/journeys.json` profile and `schemas/json/agent-journeys.schema.json` give requester, solver, monitor, optimizer, payment, and onboarding agents machine-readable role journeys over existing contracts without granting permission, issuing credentials, creating a workflow engine, authorizing payment, proving completion, or becoming durable truth
- one public `/agents/access-review.json` profile and `schemas/json/agent-access-review.schema.json` give external agents machine-readable operator-review policy for requested scopes, quotas, revocation triggers, decision outcomes, and target adapter claims without issuing credentials, granting permission, certifying agents, authorizing spend, or proving completion
- one public `POST /agents/access-review/prepare` route and `schemas/json/agent-access-review-preparation.schema.json` prepare a production access packet for manual operator-review handoff with required attachments, operator checks, decision options, and next human actions without creating a persistent review submission, issuing credentials, granting permission, recording approval, creating a production sandbox, authorizing payment, proving completion, or writing durable history
- one public `/agents/auth.json` profile and `schemas/json/agent-auth.schema.json` give agents machine-readable actor classes, auth schemes, scopes, approval boundaries, idempotency requirements, and explicit non-grants without claiming OAuth-compatible external-agent auth is live
- one public `POST /agents/auth/prepare` route and `schemas/json/agent-auth-preparation.schema.json` prepare action-specific auth routing, scopes, human approval, request policy, and idempotency requirements before live actions without issuing credentials, granting permission, recording approval, granting production access, authorizing payment, proving completion, or writing durable history
- one public `/agents/conformance.json` profile and `schemas/json/agent-conformance.schema.json` give agent builders a machine-readable checklist for discovery, auth, human handoff, work actions, proof, payment, recovery, sandbox, and target protocol boundaries without certifying agents, granting permission, authorizing spend, or proving completion
- one public `schemas/json/agent-conformance-report.schema.json` contract, `/agents/conformance-report.example.json` route, and `fixtures/agent/conformance-report.sample.json` fixture give agents a standard way to package sandbox replay results, requested scopes, target protocol claims, secret-handling posture, and human-review questions for operator review without creating credentials, certification, payment authorization, or completion proof
- one public `/agents/production-access-packet.example.json` packet example, `schemas/json/agent-production-access-packet.schema.json`, and `fixtures/agent/production-access-packet.sample.json` give external agents a checked operator-review packet shape for represented actor, minimal scopes, sandbox evidence, rate limits, human escalation, data handling, idempotency, payment boundary, and target-protocol claims without issuing credentials, granting permission, creating a production sandbox, authorizing spend, or proving completion
- one public `POST /agents/intake/validate` endpoint and `schemas/json/agent-intake-validation.schema.json` contract validate conformance reports and production access packets before human or operator review without creating a review submission, issuing credentials, granting permission, recording approval, authorizing spend, creating a production sandbox, writing durable history, or proving completion
- one public `POST /agents/actions/preflight` endpoint and `schemas/json/agent-action-preflight.schema.json` contract validate visible prerequisites for inspect, make-request, apply, submit, monitor, run, and optimize actions, including selected published `Supply` and request-fit fingerprints for application actions, without granting permission, recording approval, authorizing spend, publishing artifacts, proposing commitments, mutating requests, writing durable history, or proving completion
- one public `/agents/action-cards.example.json` example set, `schemas/json/agent-action-cards.schema.json`, and `fixtures/agent/action-cards.sample.json` give agents human-first renderable action cards for making, applying, submitting proof, monitoring, running public solutions, optimizing drafts, and recovering blocked actions without granting permission, recording approval, authorizing payment, proposing commitments, publishing artifacts, mutating requests, writing durable history, or proving completion
- one public `/agents/completion.json` profile and `schemas/json/agent-completion.schema.json` give agents machine-readable proof packet, artifact, fulfillment, review, payment, and event boundaries for draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, and completed claims without treating chat output, MCP tool success, A2A task status, provider callbacks, runtime logs, or payment settlement as completion truth by themselves
- one public `POST /agents/completion/validate` route and `schemas/json/agent-completion-validation.schema.json` validate completion claim packets before agents render proof-submitted, waiting-for-owner, run-started, or completed language without proving completion, closing requests, accepting review, publishing artifacts, advancing fulfillment, authorizing payment, granting permission, or writing durable history
- one public `/agents/delegation.json` profile and `schemas/json/agent-delegation.schema.json` give agents a machine-readable human-first consent, scope minimization, revocation, and per-action approval profile for account-session, resolver-bearer, target OAuth, and operator-reviewed pilot paths without issuing credentials, granting permission, recording approval, authorizing payment, starting fulfillment, or proving completion
- one public `/agents/evidence.json` profile and `schemas/json/agent-evidence.schema.json` give agents machine-readable evidence packet, `Artifact` packaging, redaction, evidence-level, review-signal, and retry-safety guidance without authorizing artifact publication, storing files, accepting review, settling payment, or proving completion by itself
- one public `POST /agents/evidence/validate` endpoint and `schemas/json/agent-evidence-validation.schema.json` contract validate proof, delivery, receipt, and handoff packet shape before governed `Artifact` submission without publishing artifacts, storing files, accepting review, authorizing spend, writing durable history, or proving completion
- one public `/agents/error-examples.json` example pack, `schemas/json/agent-error-examples.schema.json`, and `fixtures/agent/error-examples.sample.json` give agents RFC 9457-style problem examples for safe auth, scope, idempotency, rate-limit, payment, monitor, fulfillment, and unknown-write recovery without turning HTTP errors into durable history, permission grants, payment authorization, or completion proof
- one public `/agents/execution.json` profile and `schemas/json/agent-execution.schema.json` give agents machine-readable execution lane, `Fulfillment`, `FulfillmentStep`, direct-owner exception, runtime signal promotion, retry, and non-root adapter boundaries without authorizing writes, proving completion, or treating runtime sessions as request truth
- one public `/agents/human-handoffs.json` profile and `schemas/json/agent-human-handoffs.schema.json` give agents machine-readable moments for asking humans, showing drafts, requesting approval, escalating stale or blocked work, and using precise claim-state language without granting permission, recording approval, authorizing spend, proving completion, or creating a new workflow engine
- one public `/agents/human-handoff-packets.example.json` packet set, `schemas/json/agent-human-handoff-packets.schema.json`, and `fixtures/agent/human-handoff-packets.sample.json` give agents renderable examples for draft approval, Commitment review, proof review, monitor escalation, and payment authorization without turning those packets into permission grants, approval records, payment authorizations, or completion proof
- one public `/agents/http.json` profile and `schemas/json/agent-http.schema.json` give agents a unified current-route reference over live HTTP/OpenAPI exports, auth schemes, required scopes, idempotency, preflight order, non-HTTP fallbacks, and canonical reads or writes without creating a new API surface, granting permission, making MCP/A2A/x402 adapters live, or proving completion
- one public `/agents/ux.json` profile and `schemas/json/agent-ux.schema.json` give agents a human-first process map for discovery, opportunity choice, request drafting, delegation, policy preflight, applying, proof submission, monitoring, recovery, payment authorization, optimization, and completion claims without creating a workflow engine, permission grant, approval record, payment authorization, credential issuer, adapter, or completion proof
- one public `/agents/monitoring.json` profile and `schemas/json/agent-monitoring.schema.json` give agents machine-readable cursor polling, stale-state detection, escalation trigger, and push-versus-poll boundaries without granting permission, creating subscriptions, writing heartbeat events, accepting proof, settling payment, or proving completion
- one public `POST /agents/monitoring/prepare` route and `schemas/json/agent-monitoring-preparation.schema.json` give agents a cursor polling plan, escalation handoff context, and target webhook receiver boundary before monitoring work without reading activity, granting permission, creating subscriptions, activating push delivery, writing heartbeat events, settling payment, proving completion, or writing durable history
- one public `POST /agents/monitoring/validate` route and `schemas/json/agent-monitoring-validation.schema.json` give agents validation-only checks for monitor mode, cursor checkpoint persistence, private-access posture, escalation triggers, no-heartbeat behavior, no-completion claims, and target signed-webhook receiver shape without reading activity, granting permission, creating subscriptions, activating push delivery, writing heartbeat events, settling payment, or proving completion
- one public `/agents/onboarding.json` profile and `schemas/json/agent-onboarding.schema.json` give external agents a machine-readable path from public discovery to role classification, contract sandbox validation, scoped live HTTP use, target production access review, and target protocol adapter readiness without issuing credentials or claiming OAuth, MCP, A2A, x402, or production sandbox support is live
- one public `/agents/opportunities.json` profile and `schemas/json/agent-opportunities.schema.json` give agents a machine-readable read-only way to turn public request projections and `agentActionAffordances` into local opportunity cards, fit scores, and recommended next actions without granting permission, assigning supply, creating a match result, starting fulfillment, authorizing payment, or proving completion
- one public `/agents/optimization.json` profile and `schemas/json/agent-optimization.schema.json` give agents machine-readable draft-only optimization surfaces for briefs, proposals, evidence packets, monitor updates, and public-solution reuse without inventing facts, overriding planner or policy fields, authorizing writes, implying owner approval, settling payment, or proving completion
- one public `POST /agents/optimization/prepare` route and `schemas/json/agent-optimization-preparation.schema.json` give agents a draft-only optimization plan, output contract, no-invention boundary, owner-approval gate, and next preflight handoff before local suggestion drafting without generating content, mutating `Request`, submitting `Commitment`, publishing `Artifact`, starting `Fulfillment`, recording approval, granting permission, authorizing payment, proving completion, or writing durable history
- one public `POST /agents/write-sandbox/prepare` route and `schemas/json/agent-write-sandbox-preparation.schema.json` give agents and operators decision `0025` activation gate results and minimum flow coverage results before write-sandbox operator review without issuing credentials, creating a live sandbox, granting production access, authorizing payment, proving completion, submitting review state, or writing durable history
- one public `/agents/payments.json` profile and `schemas/json/agent-payments.schema.json` give agents machine-readable buyer-credit, request-funding, paid-run, idempotency, x402-target, reconciliation, and escalation boundaries without granting payment credentials, creating an `Order` root, or treating payment success as completion truth
- one public `/agents/prompts.json` catalog and `schemas/json/agent-prompts.schema.json` give agents machine-readable prompt templates for briefing, applying, proof submission, monitoring, optimization, and recovery without treating prompt output as approval, mutation, proof, payment, or completion truth
- one request activity endpoint can resume monitor reads with `after_sequence` and return `cursor.nextAfterSequence` without creating heartbeat `RequestEvent` records
- one public `/agents/monitor-webhooks.md` profile and OpenAPI webhook schema define the target signed push-delivery envelope for monitor agents, while actual subscription persistence and delivery remain target direction
- one public `/agents/protocols.md` profile, `/agents/protocols.json` machine-readable protocol profile, `schemas/json/agent-protocols.schema.json`, and `standards/agent-protocol-profile.md` define MCP, A2A, and x402 adapter/payment boundaries without claiming live protocol adapters
- one public `/agents/standards.json` profile and `schemas/json/agent-standards.schema.json` give agents a machine-readable standards matrix over Boreal's live OpenAPI, JSON Schema, AsyncAPI, `llms.txt`, A2A-style agent-card, resolver-bearer, and RFC 9457 surfaces plus target MCP, A2A, OAuth delegation, and x402 boundaries without becoming an adapter implementation, permission grant, payment authority, completion proof, or durable truth
- decision `0024-agent-protocol-gateway-topology` accepts `apps/web` as the public discovery and HTTP contract source while future live MCP/A2A adapters should run behind a gateway over existing contracts, not as a second backend or durable truth layer
- decision `0025-agent-isolated-write-sandbox-boundary` accepts the minimum future write sandbox as a segregated non-production environment over Boreal's canonical contracts, with revocable scoped credentials, same policy/idempotency/recovery order, human-first approval gates, and no production authority
- one public `/agents/protocol-adapter-samples.json` sample pack, `schemas/json/agent-protocol-adapter-samples.schema.json`, and `fixtures/agent/protocol-adapter-samples.sample.json` show target-only MCP tool, A2A task or artifact, and x402 payment-shape payload mappings without granting permission, authorizing payment, proving completion, or making adapters live
- one public `/agents/recovery.json` recovery profile and `schemas/json/agent-recovery.schema.json` give agents machine-readable handling for auth failure, missing scopes, idempotency conflicts, rate limits, monitor cursor recovery, blocked fulfillment retry, payment uncertainty, and human escalation without granting permission
- one public `/agents/readiness.json` readiness profile and `schemas/json/agent-readiness.schema.json` give agents a machine-readable live-versus-target capability matrix, standards map, agent UX flow, go/no-go checks, current limitations, and next implementation priorities without granting credentials, proving completion, or making target adapters live
- one public `/agents/tools.json` tool registry and `schemas/json/agent-tools.schema.json` map agent intents to safe HTTP calls, validation and preparation tools, target MCP tools, target A2A operations, idempotency, output truth, and canonical write boundaries without creating a separate tool runtime, granting authority from validation or preparation results, or making target adapters live
- one public `/agents/sandbox.md` guide, `/agents/sandbox.json` manifest, `agent-sandbox` JSON Schema, deterministic fixture, and `pnpm contracts:agent-sandbox` runner give agents contract-only mock identities, sample IDs, payloads, idempotency keys, monitor cursors, signed-webhook samples, request-level `agentActionAffordances` and `agentActionCardHints` render hints, and replay scenarios for requester drafting, solver apply/submit/monitor, paid-run shape, and recovery; mock credentials are not production auth and create no live objects
- one public `POST /agents/sandbox/replay` route and `schemas/json/agent-sandbox-replay.schema.json` validate contract-sandbox replay evidence against manifest scenarios, expected step order, idempotency keys, terminal state, canonical writes, and non-authority boundaries before conformance or production-access review packets without creating review submissions, issuing credentials, creating a production sandbox, authorizing payment, proving completion, or writing durable history
- public request projections now include `agentActionAffordances`, a derived request-level map of inspect, apply, submit, monitor, run, and optimize affordances with concrete endpoints, auth notes, idempotency requirements, and canonical read/write boundaries
- request detail responses now include `agentActionPolicy`, a derived actor-specific map of inspect, apply, submit, monitor, run, and optimize decisions for anonymous, session, and resolver actors, including resolver missing-scope reporting and idempotency-gated action states
- public request projections and request detail responses now include `agentActionCardHints`, derived request-level render hints that turn public affordances or actor-specific `agentActionPolicy` decisions into human-visible card titles, CTAs, required preconditions, handoff prompts, and non-authority flags without granting permission, recording approval, issuing credentials, authorizing payment, writing durable history, or proving completion
- public agent start, action playbook, workflow catalog, UX profile, client kit, tool registry, and readiness profile now point agents to `agentActionCardHints` as request-level render hints while preserving `agentActionPolicy` as the permission gate
- request, supply, payment, and resolver-auth OpenAPI exports now declare machine-readable auth boundaries: standard OpenAPI `security` requirements for anonymous, account-session, and resolver-bearer access where live routes support them, plus Boreal `x-boreal-required-scopes` extensions for resolver scope conditions
- one Boreal-managed `video-generation` starter supply exists as the first in-house worker-backed supply lane; broader in-house worker scanning, application packets, and owner auto-approval fixtures remain target work
- one machine-readable in-house worker application profile now defines named agent templates, including `Mira` as the video-generation route template and `Tala` as target-only humanizer; public agent discovery now lists those named templates with the shared `boreal_named_agent_v1` framework, promotion gates, boilerplate refs, and preparation-only route mode; a shared registry builder validates stable route, unique name, framework settings, live or target promotion gates, supply binding, model binding, task pipeline, boilerplate refs, and canonical write requirements; and one live preparation-only per-agent route surface can read those templates, scan caller-supplied request summaries for wake or skip decisions, and prepare non-mutating application packets with governed mutation-call sketches for existing commitment or owner-private fulfillment routes
- first-party worker artifact descriptors now support document-backed content handoff for text-like worker deliveries and external or object references for provider-backed assets, but this is only the artifact handoff contract and does not make target-only humanizer supply, execution, route mutation tests, review acceptance, or completion authority live
- the reusable public request board now renders read-only worker readiness from already-loaded public-safe request projection fields, including human-required, human-can-apply, Mira can-prepare, skip, and Tala target-only states without assignment, private fetches, provider calls, payment authority, or durable writes; actionable human lanes carry an `apply_to_request` preflight handoff for later governed `Commitment` proposals
- named-agent and public-board scanner gates now use shared request qualification over actor, supply, output, execution, embodied, and verification-plan fields so provider-only workers skip human, local-access, field-inspection, pickup or handoff, physical-proof, and location-proof requests even when those requests also contain video-like wording
- named Boreal agent prepared application packets now include `authorizedExecutionHandoff` for post-authorization model/provider/tool sequencing, but this remains preparation-only and does not call OpenAI, Runway, publish artifacts, authorize payment, or prove completion before a governed fulfillment lane exists
- owner-private direct named-agent fulfillment preparation now requires explicit trusted-worker auto-approval fields in the caller-supplied request summary, including selected supply and allowed worker proof; the per-agent route still does not create the fulfillment itself, and the live fulfillment route now requires route-scoped `ownerPrivateDirectApproval` evidence plus selected `Supply` before no-commitment direct fulfillment can be created

## Target Direction

These are intended next layers, not fully modeled proof yet:

- broader canonical event coverage under `schemas/events/`
- broader canonical HTTP and webhook coverage under `schemas/openapi/`, especially around transaction lanes, richer participant surfaces, and resolver-session management views
- richer write-capable agent onboarding with isolated write sandbox credentials governed by decision `0025`, signed subscription persistence and delivery, payment/rate-limit-aware policy decisions, failure fixtures, and live external-agent auth beyond the first public action playbook, auth profile, auth preparation route, contract-only sandbox runner, replay scenarios, replay validation preflight, request-detail action policy, cursor polling lane, and webhook signature profile
- richer conformance automation where external agents can submit signed sandbox transcripts or live dry-run evidence for operator review; the current profile, report schema, example route, replay validation endpoint, and access-review preparation endpoint define or preflight evidence shape and manual handoff content but do not persist submissions
- richer evidence automation with artifact scanning, checksum verification, private reviewer access, and proof scoring; the current evidence profile is packaging and review guidance only
- richer execution automation with lane-specific worker dispatch, runtime admission, step updates, provider correlation, and isolated untrusted execution; the current execution profile is descriptive guidance over existing `Fulfillment` and `FulfillmentStep` truth
- richer in-house Boreal worker scanning and application automation where trusted named agents and humans scan opened requests, apply through `Commitment`, or use owner-private direct `Fulfillment` only when the selected first-party `Supply` and owner policy allow it
- mutating per-agent API execution under `/api/boreal-agents/{agentKey}` backed by model/provider credentials, supply ownership checks, scanner filters, and existing request-resource mutation boundaries
- richer human handoff state in live request rooms, including persisted approval records, review prompts, and escalation inboxes; the current public handoff profile and packet examples are descriptive guidance only
- richer monitor automation with persisted subscriptions, delivery retries, receiver enrollment, SLA configuration, and monitor inboxes; the current monitoring profile and validation endpoint are descriptive or preflight-only over live cursor polling plus target signed push delivery
- richer onboarding automation with persisted operator-reviewed production access packets, real isolated write sandbox credentials, revocation enforcement, scope approval, abuse controls, and delegated external-agent auth; the current onboarding, access-review, and handoff-preparation surfaces do not create live authority
- richer prompt automation with versioned prompt packs, prompt evals, locale variants, and signed prompt-pack distribution; the current prompt catalog is descriptive guidance only
- richer optimization automation with owner-approved diff previews, semantic no-invention checks, and route-specific draft validators; the current optimization profile is descriptive guidance and the preparation route is plan-only before local draft suggestion output
- deeper readiness scoring that can compute route-specific live, blocked, and target states from request-detail `agentActionPolicy`, payment balance, rate-limit, participant lane, and proof-scoring evidence instead of relying only on the public capability matrix
- a generated SDK package, published language bindings, and versioned client release process over the public agent client-kit manifest
- a live MCP gateway that exposes Boreal request resources, schema resources, and governed tools from the public agent tool registry without replacing HTTP contracts, living inside the product web app as a second backend, or using MCP for noisy runtime telemetry
- an A2A gateway or adapter that maps A2A tasks, messages, streaming status, and artifacts onto Boreal `Request`, `Fulfillment`, `FulfillmentStep`, and `Artifact` truth without making A2A `Task` the root object
- selected x402-capable paid solution-run or agent-capability endpoints, with every payment reconciled into Boreal `Transaction` truth through the live agent payment profile rules
- richer golden fixtures for failure, replay, dispute, collective fulfillment, and private-supply paths
- deeper web runtime coverage beyond the first request-briefing slice in `apps/web/`
- first-class workflow-backed support objects and adapter coverage for imported templates and reusable execution packs, initially standardized through `standards/` before broader schema and API coverage lands
- first-class buyer-credit support objects and narrower payment-source coverage for first-party supply, initially standardized through `standards/` before broader schema and API coverage lands
- first-class request-grant profile for pooled public-solution funding, grant-pool display, explicit refund policy, solver award release, reviewer compensation, and public artifact projection
- public solution surfaces that let later users inspect, run, fork, or reference accepted artifacts while preserving the source request as durable truth
- richer credit-metered solution runs that automatically attach the right fulfillment worker, provider adapter, or human review lane after the run request is funded
- exact service plan links that resolve stable first-party unlisted supply ids and set `routing.preferredSupplyId` before request opening
- broader supply discovery, responder reads, and public market publish lanes
- deeper desktop request-runtime coverage such as participant-scoped engaged-work inboxes, richer fulfillment controls, and durable resolver-session management views
- actor-neutral request-flow stage and card schemas that make human, agent, system, adapter, and n8n import/export cards share the same in, out, done-here, not-done-here, authority, next-stage, and lossiness requirements before live route behavior changes
- peer-facing ephemeral realtime lanes beyond the local desktop-main hub
- peer-capable runtime identity bound through resolver approval without replacing Boreal actor identity
- regular Boreal web accounts with `username or email + password`, `WebAuthn` MFA, and optional passkey-first login after enrollment, while keeping guest mode and resolver auth as separate identity lanes
- isolated worker mode for public or external untrusted request execution
- additional runnable workspaces such as `apps/mobile/`, `apps/extension/`, `apps/peer-*`, and `apps/gateway-*`
- shared libraries under `packages/`
- agent skills under `skills/`
- implementation profiles under `standards/`
- executable offline eval runners and score dashboards for planner, matcher, and policy quality against live model outputs
- embodied and verification-heavy request lanes with explicit execution-modality and proof-planning outputs, initially as narrow private or curated lanes rather than a broad public local-services market
- cleaner grouped request-derived planning projections and thinner public-safe request projections

## Claiming Rules

Safe claim patterns:

- `Boreal's canonical root object is Request.`
- `Boreal is positioned as request-native work commerce.`
- `Boreal is for work AI cannot responsibly finish alone.`
- `Boreal Desktop keeps local runtime, human intervention, and verification inside the workflow.`
- `Boreal Network is the canonical monorepo for Boreal.`
- `The current machine-readable baseline covers Request, Supply, Commitment, Fulfillment, Transaction, and RequestEvent.`
- `apps/web is activated as the first Boreal product workspace, with fuller implementation still ahead.`
- `The repo contains a deterministic request-processing eval baseline for a complex human-led request.`
- `Canon allows optional request grants, but they are not passive investments or tax-deductible donation claims by default.`
- `Canon allows public solution surfaces as projections over completed requests and accepted artifacts.`
- `Canon separates free public solution inspection from paid runs that consume credits for inference or execution.`

Unsafe claim patterns:

- `Every canonical object already has finished machine-readable schema coverage and live enforcement.`
- `apps/web already contains the full Boreal product implementation.`
- `Every target workspace in this repo already exists as a runnable product.`
- `Peer, gateway, and enterprise operator surfaces are already fully implemented.`
- `Other Boreal workspaces already ship everything described in the target direction.`
- `Request grants are tax-deductible donations by default.`
- `Request funders receive passive cash upside from future solution revenue.`
- `Public solution inspection requires credits by default.`
- `Every public solution already has metered inference runs in production.`
- `Public solution surfaces are already fully machine-modeled as a production marketplace.`

## Agent Rule

A contextless agent should read `README.md`, then this file, before making claims about current Boreal truth.

When uncertain:

- prefer canon-locked wording over implementation inference
- prefer machine-modeled wording over marketing-style extrapolation
- prefer `target direction` wording over overclaim
- escalate risk if a task would blur these boundaries

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
- `fixtures/request/golden-external-ai-automation-thread.json`
- `fixtures/request/eval-complex-human-planning-and-match.json`
- `fixtures/request/eval-complex-human-planning-and-match.actual.sample.json`
- `tests/contracts/run-request-processing-evals.mjs`
- `package.json`
- `pnpm-workspace.yaml`
- `apps/web/package.json`
- `apps/web/app/agents/start.md/route.ts`
- `apps/web/app/agents/sandbox.md/route.ts`
- `apps/web/app/agents/sandbox.json/route.ts`
- `apps/web/app/.well-known/agent-card.json/route.ts`
- `apps/web/app/openapi.json/route.ts`
- `apps/web/app/openapi/[contract]/route.ts`
- `apps/web/app/schemas/[schema]/route.ts`
- `apps/web/app/events/[contract]/route.ts`
- `apps/web/tests/contracts/agent-discovery.test.ts`
- `schemas/json/agent-sandbox.schema.json`
- `fixtures/agent/sandbox-manifest.sample.json`

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
- one desktop runtime can connect to Boreal web through resolver device approval, browse public and owned requests, and drive direct commitment, artifact, and fulfillment writes through scoped bearer auth
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
- one public agent action catalog is exposed through the agent card and `/openapi.json`, mapping inspect, apply, submit, monitor, run, and optimize intents to canonical reads, writes, auth boundaries, standards, and contract links
- one public `/agents/actions.md` playbook gives contract-linked walkthroughs and HTTP sketches for inspect, apply, submit, monitor, run, and optimize intents without creating a parallel agent ledger
- one request activity endpoint can resume monitor reads with `after_sequence` and return `cursor.nextAfterSequence` without creating heartbeat `RequestEvent` records
- one public `/agents/monitor-webhooks.md` profile and OpenAPI webhook schema define the target signed push-delivery envelope for monitor agents, while actual subscription persistence and delivery remain target direction
- one public `/agents/protocols.md` profile and `standards/agent-protocol-profile.md` define MCP, A2A, and x402 adapter/payment boundaries without claiming live protocol adapters
- one public `/agents/sandbox.md` guide, `/agents/sandbox.json` manifest, `agent-sandbox` JSON Schema, deterministic fixture, and `pnpm contracts:agent-sandbox` runner give agents contract-only mock identities, sample IDs, payloads, idempotency keys, monitor cursors, and signed-webhook samples; mock credentials are not production auth and create no live objects
- public request projections now include `agentActionAffordances`, a derived request-level map of inspect, apply, submit, monitor, run, and optimize affordances with concrete endpoints, auth notes, idempotency requirements, and canonical read/write boundaries

## Target Direction

These are intended next layers, not fully modeled proof yet:

- broader canonical event coverage under `schemas/events/`
- broader canonical HTTP and webhook coverage under `schemas/openapi/`, especially around transaction lanes, richer participant surfaces, and resolver-session management views
- richer write-capable agent onboarding with production sandbox credentials, signed subscription persistence and delivery, failure fixtures, and external-agent auth beyond the first public action playbook, contract-only sandbox runner, cursor polling lane, and webhook signature profile
- an MCP profile or server that exposes Boreal request resources, schema resources, and governed tools without replacing HTTP contracts or using MCP for noisy runtime telemetry
- an A2A adapter that maps A2A tasks, messages, streaming status, and artifacts onto Boreal `Request`, `Fulfillment`, `FulfillmentStep`, and `Artifact` truth without making A2A `Task` the root object
- an optional x402-compatible payment profile for selected paid solution runs or agent-paid capability calls, with every payment reconciled into Boreal `Transaction` truth
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

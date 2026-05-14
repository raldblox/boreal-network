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
- `Supply` is the canonical opposite-side object.
- `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, and `RequestEvent` are canonical objects in the network model.
- Boreal Network is Boreal's canonical monorepo.
- Root canon and governed workspaces now coexist in the same repository.
- Active namespace roots are `apps/`, `packages/`, `skills/`, and `standards/`.
- `apps/web/` is the first activated implementation workspace.
- The first commercial wedge is startup and SMB buyers of high-value digital work with fuzzy intake and mixed human-plus-AI fulfillment.
- The primary business model is funded-request GMV take rate first, with premium workflow and private-supply layers later.
- Risk escalation is mandatory when a change could break canon, contracts, durable history, or workspace boundaries.
- Match the lead first, plan the work second, and decompose only when needed.
- Planner, matcher, policy, and mutation boundaries are canonical Boreal processing layers.
- desktop-local ephemeral realtime traffic is separate from durable Boreal request history unless it is explicitly promoted
- the first ephemeral realtime hub is the Electron main process inside `apps/desktop`

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

Today, the machine-readable baseline proves:

- one durable `Request` can carry intake, funding, fulfillment, and completion state
- one durable `Request` may exist early in `draft` status while the brief is still being formed
- one `open` plus `public` request can be exposed through a public-safe web pool listing
- one public-safe request detail view can be fetched directly by request id
- one open request room can expose request activity derived from durable `RequestEvent`, `Commitment`, and `Artifact` records
- one desktop runtime can connect to Boreal web through resolver device approval, browse public and owned requests, and drive direct commitment, artifact, and fulfillment writes through scoped bearer auth
- one owned and private request may enter a direct desktop auto-fulfillment lane without a commitment object through a desktop auto-resolve policy, while public or cross-actor work still preserves the commitment gate
- one private request may carry an owner-scoped preferred supply, and one resolver-approved desktop may read owned supplies and bind direct auto-fulfillment to a published owned supply when the request override or desktop default selects it
- one `Supply` can be expressed as a durable capability object
- one owner-scoped `Supply` draft can be created, updated, deleted, and published through the first private or unlisted supply-management lane
- one `Supply` may carry runtime or resolver binding metadata without collapsing runtime identity into supply ownership
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
- one desktop-local browser bridge can expose ephemeral SSE events from Electron main over `127.0.0.1` with session-token and localhost-origin checks
- one desktop-local browser bridge can expose the connected desktop runtime model catalog through a guarded localhost-only `/models` read surface for browser model selectors
- one localhost Boreal web surface can auto-discover and link the running desktop runtime through a localhost-only bridge discovery read, without forcing a separate manual bridge page flow
- one localhost Boreal web request room may also read local desktop auto-resolve policy and desktop-default supply selection through that same guarded discovery lane, while still treating the `Request` object as durable route truth
- one runnable Pear or Hyperswarm peer foundation now exists under `apps/peer/` and `packages/network-*`, with a real peer keypair, control-topic host, and desktop-embedded peer runtime status
- one desktop tracked request lane can distinguish owner-private versus public or external trust tiers and block `Full` runtime on untrusted lanes while moving them onto a dedicated `.boreal-work` request workspace

## Target Direction

These are intended next layers, not fully modeled proof yet:

- broader canonical event coverage under `schemas/events/`
- broader canonical HTTP and webhook coverage under `schemas/openapi/`, especially around transaction lanes, richer participant surfaces, and resolver-session management views
- richer golden fixtures for failure, replay, dispute, collective fulfillment, and private-supply paths
- deeper web runtime coverage beyond the first request-briefing slice in `apps/web/`
- broader supply discovery, responder reads, and public market publish lanes
- deeper desktop request-runtime coverage such as participant-scoped engaged-work inboxes, richer fulfillment controls, and durable resolver-session management views
- peer-facing ephemeral realtime lanes beyond the local desktop-main hub
- peer-capable runtime identity bound through resolver approval without replacing Boreal actor identity
- isolated worker mode for public or external untrusted request execution
- additional runnable workspaces such as `apps/mobile/`, `apps/extension/`, `apps/peer-*`, and `apps/gateway-*`
- shared libraries under `packages/`
- agent skills under `skills/`
- implementation profiles under `standards/`
- executable offline eval runners and score dashboards for planner, matcher, and policy quality against live model outputs
- embodied and verification-heavy request lanes with explicit execution-modality and proof-planning outputs, initially as narrow private or curated lanes rather than a broad public local-services market

## Claiming Rules

Safe claim patterns:

- `Boreal's canonical root object is Request.`
- `Boreal is positioned as request-native work commerce.`
- `Boreal Network is the canonical monorepo for Boreal.`
- `The current machine-readable baseline covers Request, Supply, Commitment, Fulfillment, Transaction, and RequestEvent.`
- `apps/web is activated as the first Boreal product workspace, with fuller implementation still ahead.`
- `The repo contains a deterministic request-processing eval baseline for a complex human-led request.`

Unsafe claim patterns:

- `Every canonical object already has finished machine-readable schema coverage and live enforcement.`
- `apps/web already contains the full Boreal product implementation.`
- `Every target workspace in this repo already exists as a runnable product.`
- `Peer, gateway, and enterprise operator surfaces are already fully implemented.`
- `Other Boreal workspaces already ship everything described in the target direction.`

## Agent Rule

A contextless agent should read `README.md`, then this file, before making claims about current Boreal truth.

When uncertain:

- prefer canon-locked wording over implementation inference
- prefer machine-modeled wording over marketing-style extrapolation
- prefer `target direction` wording over overclaim
- escalate risk if a task would blur these boundaries

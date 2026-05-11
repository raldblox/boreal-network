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

## Machine-Modeled Now

These are already backed by machine-readable artifacts or deterministic fixtures in this repo:

- `schemas/json/common.schema.json`
- `schemas/json/request.schema.json`
- `schemas/json/supply.schema.json`
- `schemas/json/commitment.schema.json`
- `schemas/json/fulfillment.schema.json`
- `schemas/json/transaction.schema.json`
- `schemas/json/request-event.schema.json`
- `fixtures/request/golden-external-ai-automation-thread.json`
- `fixtures/request/eval-complex-human-planning-and-match.json`
- `fixtures/request/eval-complex-human-planning-and-match.actual.sample.json`
- `tests/contracts/run-request-processing-evals.mjs`
- `package.json`
- `pnpm-workspace.yaml`
- `apps/web/package.json`

Today, the machine-readable baseline proves:

- one durable `Request` can carry intake, funding, fulfillment, and completion state
- one `Supply` can be expressed as a durable capability object
- one `Commitment` can carry quoted or accepted commercial terms
- canonical machine-readable shapes now exist for `Fulfillment`, `Transaction`, and `RequestEvent`
- a deterministic end-to-end thread can be read without inventing missing IDs, statuses, or event names
- the repo is structured to host governed JS or TS workspaces under shared workspace discovery rules
- one complex human-led request can be evaluated deterministically across extraction, planning, matching, and policy outputs

## Target Direction

These are intended next layers, not fully modeled proof yet:

- canonical event contracts under `schemas/events/`
- canonical HTTP and webhook contracts under `schemas/openapi/`
- richer golden fixtures for failure, replay, dispute, collective fulfillment, and private-supply paths
- the actual web runtime scaffold and first shipped Boreal web code in `apps/web/`
- deeper supply lifecycle canon for onboarding, capacity, visibility, and retirement
- additional runnable workspaces such as `apps/desktop/`, `apps/mobile/`, `apps/extension/`, `apps/peer-*`, and `apps/gateway-*`
- shared libraries under `packages/`
- agent skills under `skills/`
- implementation profiles under `standards/`
- executable offline eval runners and score dashboards for planner, matcher, and policy quality against live model outputs

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

# Live Vs Target

This file separates what Boreal Network can claim now from what it is still aiming toward.

Because this repository is a canon repository, `live` here means claimable from the current canon and machine-readable baseline in this repo.  It does not automatically mean every downstream Boreal app already ships the same thing to end users.

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
- The first commercial wedge is startup and SMB buyers of high-value digital work with fuzzy intake and mixed human-plus-AI fulfillment.
- The primary business model is funded-request GMV take rate first, with premium workflow and private-supply layers later.
- Root workspace expansion is governed through `apps/`, `packages/`, `skills/`, and `standards/`.
- Risk escalation is mandatory when a change could break canon, contracts, durable history, or workspace boundaries.

## Machine-Modeled Now

These are already backed by machine-readable artifacts or deterministic fixtures in this repo:

- `schemas/json/common.schema.json`
- `schemas/json/request.schema.json`
- `schemas/json/supply.schema.json`
- `schemas/json/commitment.schema.json`
- `fixtures/request/golden-external-ai-automation-thread.json`

Today, the machine-readable baseline proves:

- one durable `Request` can carry intake, funding, fulfillment, and completion state
- one `Supply` can be expressed as a durable capability object
- one `Commitment` can carry quoted or accepted commercial terms
- a deterministic end-to-end thread can be read without inventing missing IDs, statuses, or event names

## Target Direction

These are intended next layers, not fully modeled proof yet:

- canonical schemas for `Fulfillment`, `Transaction`, and `RequestEvent`
- canonical event contracts under `schemas/events/`
- canonical HTTP and webhook contracts under `schemas/openapi/`
- richer golden fixtures for failure, replay, dispute, collective fulfillment, and private-supply paths
- deeper supply lifecycle canon for onboarding, capacity, visibility, and retirement
- private-supply and enterprise operator lanes
- peer and runtime-connected execution surfaces
- future runnable workspaces such as `apps/peer-*` and `apps/gateway-*`

## Claiming Rules

Safe claim patterns:

- `Boreal's canonical root object is Request.`
- `Boreal is positioned as request-native work commerce.`
- `The current machine-readable baseline covers Request, Supply, and Commitment.`
- `Fulfillment, Transaction, and RequestEvent are canonical objects, with fuller machine-readable modeling still in progress.`

Unsafe claim patterns:

- `Every canonical object already has finished machine-readable schema coverage.`
- `Every target workspace in this repo already exists as a runnable product.`
- `Peer, gateway, and enterprise operator surfaces are already fully implemented.`
- `Downstream Boreal apps already ship everything described in the target direction.`

## Agent Rule

A contextless agent should read `README.md`, then this file, before making claims about current Boreal truth.

When uncertain:

- prefer canon-locked wording over implementation inference
- prefer machine-modeled wording over marketing-style extrapolation
- prefer `target direction` wording over overclaim
- escalate risk if a task would blur these boundaries
# Boreal Network Thesis

## Core Definition

Boreal Network is a request-native work network.

Commercially, it should be read as request-native work commerce.

It coordinates humans, agents, tools, and runtimes around one durable object:

- `Request`

A request begins as demand.
It can then move through routing, commitment, funding, fulfillment, proof, delivery, and payout without leaving the same durable thread.
If the accepted output becomes reusable, the public solution surface is still a projection over that completed request and its accepted artifacts.
Inspecting that public solution is different from running it.
A run that consumes inference or execution capacity creates request-attached payment and fulfillment truth.

The network model is the system shape.
The commerce reading is the business category.

## Core Idea

Boreal does not start from catalog checkout alone and it does not start from disconnected chat alone.

It starts from:

- someone needing work done
- a durable request thread
- a supply graph that can respond
- an execution and proof layer that stays attached to that same request

## Design Principles

### 1. Request-first

Demand is the network entry point.
`Request` is the canonical root object for work.

### 2. Supply is opposite-side, not secondary

`Supply` is the published capability object that the request is matched against.
Supply may come from humans, agents, tools, providers, or runtimes.

### 3. One thread through the lifecycle

The same request should survive:

- intake
- routing
- commitment
- funding
- fulfillment
- delivery
- review
- public solution projection when accepted work is reusable

### 4. Clear split between current truth and full history

Current truth belongs on the root object.
Full history belongs in events and artifacts.

### 5. Commerce is explicit

Quotes, approvals, payments, receipts, and payouts are first-class durable records.
They must not hide behind generic chat messages.

### 6. Execution is separate from commitment

Selecting a route or accepting a proposal is not the same thing as fulfilling the work.
`Commitment` and `Fulfillment` are intentionally separate objects.

### 7. Worker-generated sub-work stays inside the request by default

Internal execution decomposition should become `FulfillmentStep`, not a new root request, unless separate ownership or funding boundaries require it.

### 8. Transport is not the business model

HTTP, MCP, libp2p, queues, or local runtimes are transport choices.
The request, commitment, fulfillment, and proof model stays stable across them.

## What Boreal Network Must Model

- demand intake
- published supply
- request participants and roles
- quotes, proposals, assignments, and approvals
- optional request grants and sponsor-style funding
- execution ownership
- credit-metered inference or execution runs when public solutions are reused
- sub-work decomposition
- outputs and proof
- payment and payout records
- append-only history
- public solution projections over accepted artifacts

## What It Must Not Confuse

- `Request` with `Fulfillment`
- `Supply` with `Actor`
- `Commitment` with `Transaction`
- UI copy like `Offer` with canonical schema
- UI copy like `Solution` with canonical schema
- extraction concepts like `Intent` with durable business objects

## Canonical Root Choice

The durable root object is:

- `Request`

Not:

- `Work`
- `Job`
- `Issue`
- `Order`

Those terms may appear in prose, but they are not the canonical schema root for this repo.

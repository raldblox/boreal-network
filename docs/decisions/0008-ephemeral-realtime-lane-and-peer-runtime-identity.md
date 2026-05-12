# 0008 Ephemeral Realtime Lane And Peer Runtime Identity

## Status

Accepted

## Date

2026-05-12

## Context

`apps/desktop` already keeps local chat state and live Codex turn streaming inside the desktop shell.
At the same time, Boreal canon already separates:

- Boreal actor identity
- runtime or desktop identity
- durable request history
- transport-specific transient traffic

The current desktop and web model should not keep inflating durable storage with:

- typing indicators
- token deltas
- progress ticks
- heartbeats
- presence
- transient runtime logs
- raw tool stdout or stderr

Those signals are useful for operator feedback and coordination, but they are not default business truth.

The repo also already reserves future peer runtimes under `apps/peer/*` and reusable transport code under `packages/*`.
That makes it safe to align a peer-runtime direction now before deeper implementation work starts.

## Decision

### 1. Keep peer identity as device identity only

A desktop or peer key may identify one Boreal runtime device.
It does not replace Boreal actor identity.

The approved identity split stays:

- Boreal web auth proves actor identity and request ownership
- resolver approval binds one runtime device to that Boreal actor context
- peer keys or runtime public keys identify the device or runtime endpoint

If a peer-capable runtime is introduced later, its stable public key may become part of `ResolverClient` registration or runtime metadata.
That key is still runtime identity, not actor identity.

### 2. Introduce a first-class ephemeral realtime lane

The following signal classes are ephemeral by default:

- typing
- token deltas
- progress ticks
- heartbeats
- presence
- transient runtime logs
- raw tool stdout
- raw tool stderr

These signals should flow through realtime transport.
They should not create default durable `RequestEvent` records or default database writes.

Promotion into durable Boreal truth is explicit.
Only summarized or business-meaningful outcomes should be promoted, for example:

- a fulfillment state change
- a blocker summary
- a delivery-ready summary
- a durable tool result that affects the request thread
- an `Artifact` reference

### 3. Use the desktop main process as the first realtime hub

The first realtime broker should be the Electron main process inside `apps/desktop`.

Preferred lane order:

1. renderer `<->` desktop main via preload-safe IPC
2. browser `<->` desktop main through an optional localhost-only bridge
3. desktop `<->` peer runtime through peer transport when that lane is activated

This keeps the current desktop shell aligned with repo truth and avoids introducing a second Boreal system of record.

### 4. Default to one peer runtime hosting many local Codex agents

The default peer model is:

- one desktop runtime identity
- one peer-facing broker inside that runtime
- many local Codex agent sessions behind that broker

Do not start with one peer identity per agent by default.

Inside the runtime, each Codex agent remains an execution lane or session.
On the wire, the broker should multiplex multiple local agent sessions over shared peer connections using explicit routing fields such as:

- `requestId`
- `threadId`
- `agentSessionId`
- `channelKind`
- `correlationId`

This keeps peer identity stable while allowing many local agents to run in parallel.

If later requirements need independent revocation, accounting, or scheduling per worker, that can justify multiple runtime identities or multiple published `Supply` records.
That split is deferred.

### 5. Treat Hyperswarm as the peer transport target, not the durable truth layer

If Boreal activates a peer lane, the target runtime pattern is:

- one `Hyperswarm` instance per desktop runtime host
- one stable runtime key pair
- one control topic for runtime discovery or assignment
- optional per-request or per-session topics for active work lanes
- optional direct peer reconnect by known public key

Hyperswarm connections are encrypted transport pipes.
They are not a replacement for Boreal request truth, fulfillment truth, or actor auth.

### 6. Keep canonical mapping explicit

Peer-runtime activity maps to canonical Boreal objects only when promoted:

- execution sub-work -> `FulfillmentStep`
- durable delivery or proof -> `Artifact`
- lifecycle change -> `RequestEvent`
- payment state -> `Transaction`

Do not create a new `Request` only because a local agent fanout happened inside one accepted execution lane.

## Consequences

### Accepted

- Boreal may remove default database writes for ephemeral stream traffic
- request rooms can stay durable without absorbing raw token-level noise
- desktop can expose a localhost realtime bridge without becoming a second request ledger
- future peer runtimes can use device identity without collapsing Boreal actor identity
- one desktop runtime can fan out multiple Codex agents without one peer identity per agent

### Rejected

- treating a peer key as Boreal actor identity
- storing every token delta, heartbeat, presence update, or raw runtime log as a durable `RequestEvent`
- using peer transport as the Boreal system of record
- defaulting to one peer runtime identity per local Codex agent

## Implementation Plan

### Phase 1: Local ephemeral stream lane in desktop

Implement or harden a desktop-main stream bus for:

- typing
- token deltas
- progress
- heartbeats
- presence
- transient runtime logs
- tool stdout or stderr

Keep this lane local to Electron main, preload IPC, and local desktop state.
Do not write these signals into Boreal web tables by default.

### Phase 2: Optional localhost realtime bridge

Expose an optional browser bridge from desktop main using a localhost-only transport such as WebSocket or SSE.

Guardrails:

- bind to `127.0.0.1` only
- use random high ports or negotiated ports
- require explicit session authorization
- reject unknown origins
- keep Boreal bearer tokens and local runtime secrets out of renderer and browser storage when possible

This bridge is for ephemeral operator feedback, not durable business writes.

### Phase 3: Peer runtime foundation

When a peer lane is activated:

- reusable peer transport code belongs in `packages/network-*` or `packages/libp2p-*`
- a runnable peer host belongs in `apps/peer/` or `apps/peer-*`
- desktop may embed or connect to that peer host, but root canon still treats desktop as an execution participant

### Phase 4: Hyperswarm broker for multi-agent Codex fanout

Use one runtime broker that:

- joins one or more control topics
- accepts inbound peer requests
- multiplexes channels across shared peer connections
- spawns or reuses local Codex sessions
- streams ephemeral channel output back over the same peer transport

Default broker responsibilities:

- session routing
- backpressure
- agent concurrency limits
- runtime heartbeat and availability
- explicit promotion of durable outcomes into Boreal web truth

### Phase 5: Durable promotion rules

Promote only:

- accepted lifecycle transitions
- durable blocker summaries
- durable delivery summaries
- artifact links or proof
- payment-relevant facts

Do not promote:

- raw token streams
- raw tool stdout noise
- heartbeat spam
- presence flaps
- typing indicators

## Validation Notes

Future validation should prove:

- ephemeral channels do not create default durable request history
- replay-safe durable events still rebuild request summaries
- runtime identity remains separate from Boreal actor identity
- localhost bridges are scoped and origin-checked
- one runtime can host multiple concurrent Codex agent sessions safely
- local agent fanout stays inside one `Fulfillment` lane unless a real business boundary requires a new `Request`

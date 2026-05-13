# 0010 Pear And Hyperswarm Peer Foundation Shape

## Status

Accepted

## Date

2026-05-13

## Context

Decision `0008` already fixed:

- ephemeral realtime traffic versus durable Boreal truth
- desktop main as the first realtime hub
- one runtime broker hosting many local Codex sessions
- Hyperswarm as the peer transport target rather than the truth layer

Decision `0009` already fixed the activation order:

1. local desktop ephemeral lane
2. request-bound execution
3. richer artifact truth
4. optional localhost bridge
5. peer runtime foundation

The repo now has:

- a local desktop ephemeral stream bus in `apps/desktop`
- a visible local runtime identity in `.boreal-work`
- request-bound desktop execution lanes
- broader artifact containers for document, external reference, and object reference delivery

The repo does not yet have:

- `apps/peer/`
- `packages/network-*`
- Pear or Hyperswarm dependencies
- a real peer keypair
- a localhost browser bridge

Before peer implementation starts, Boreal needs one explicit foundation decision for:

- which Pear or Holepunch family pieces are first-class
- which future workspaces own peer transport code
- how the current local desktop runtime identity upgrades into a real peer identity
- how browser and desktop surfaces relate to peer transport

Without that shape, peer work would drift into mixed responsibilities across desktop, browser, and transport code.

## Decision

### 1. Use the Pear or Holepunch family as the preferred peer foundation

When Boreal activates peer runtime work, the preferred implementation family is:

- `Hyperswarm` for peer discovery and encrypted transport
- `Corestore` for local peer data roots
- `Hypercore` for append-only peer-local or selectively replicated logs
- `Hyperbee` for indexed peer metadata

`Hyperdrive` is deferred until Boreal needs peer file staging for already-modeled durable artifacts.

`Autobase` is also deferred.
Do not start with multi-writer replicated peer state unless Boreal later proves it needs that coordination model.

### 2. Keep Pear transport code out of desktop UI code

Desktop remains an operator surface.
Peer transport should not be embedded ad hoc across renderer components or mixed directly into request UI state.

The future peer foundation should be split like this:

- `apps/peer/` for the runnable peer broker host
- `packages/network-core/` for shared routing, envelopes, session multiplexing, and runtime identity helpers
- `packages/network-hyperswarm/` for the Hyperswarm transport adapter

Optional later workspaces may include:

- `apps/peer-relay/` for a standalone peer-facing relay or broker role
- `apps/gateway-realtime/` for browser-safe or hosted bridge behavior when a non-desktop surface needs realtime transport

### 3. Keep browser realtime separate from peer transport

Browser-facing Boreal surfaces should not depend directly on Pear or Hyperswarm as the first browser realtime lane.

The intended split is:

- browser `<->` web or localhost bridge for browser-visible realtime
- desktop `<->` peer broker for peer transport

That means `0008` phase 2 remains the right browser-adjacent next step when a browser bridge is needed.
Peer transport starts from desktop or a runnable peer host, not from the browser surface itself.

### 4. Upgrade the current desktop runtime identity instead of replacing the UI concept

The current `Desktop runtime ID` shown in desktop UI is a local placeholder identity.
When peer foundation lands, Boreal should preserve that UI concept but upgrade its backing record.

The runtime identity record under `.boreal-work/desktop/` should later grow fields such as:

- `peerKeyAlgorithm`
- `peerPublicKey`
- `peerFingerprint`
- `peerReady`
- `peerRegisteredAt`

The desktop UI should continue to show one stable runtime identity surface.
It should not suddenly expose actor auth as if it were peer identity.

### 5. Treat Hypercore or Hyperbee data as transport or runtime state, not Boreal truth

If Boreal stores peer-local data in `Hypercore` or `Hyperbee`, that data is for:

- transport coordination
- peer presence
- multiplexed session routing
- resumable runtime cursors
- replicated runtime caches

It is not the canonical source for:

- `Request`
- `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`
- `RequestEvent`

Those objects remain in Boreal truth systems and are promoted explicitly through canonical APIs and event rules.

### 6. Defer Hyperdrive until artifact delivery needs it

`Hyperdrive` is not the first step.

Only introduce it when Boreal needs peer-to-peer staging or delivery for artifact containers that already have durable Boreal semantics such as:

- object-backed media
- large file delivery
- resumable artifact transfer

Do not use `Hyperdrive` to paper over missing canonical artifact meaning.

### 7. Phase order stays explicit

The next transport order is:

1. complete `0010` alignment
2. optional `0008` phase 2 localhost-only bridge when browser-visible realtime is needed
3. activate `packages/network-core/`
4. activate `packages/network-hyperswarm/`
5. activate `apps/peer/`
6. generate a real peer keypair and upgrade `Desktop runtime ID` to `peer-ready`
7. join control topics and multiplex request-bound Codex sessions behind one runtime broker
8. only later consider `Hyperdrive`, `apps/peer-relay/`, or broader gateway roles

## Consequences

### Accepted

- Boreal now has one explicit Pear or Holepunch foundation shape before implementation starts
- future peer work has clear workspace boundaries
- desktop UI can keep one stable runtime identity concept while upgrading from local-only to peer-ready
- browser realtime and peer transport stay separate concerns
- Hypercore family data is constrained to transport and runtime coordination instead of becoming shadow request truth

### Rejected

- embedding peer transport logic directly inside desktop renderer state
- treating browser realtime and peer transport as the same first implementation lane
- introducing `Hyperdrive` before artifact delivery actually needs peer file staging
- starting with `Autobase` or broader replicated multi-writer state as a default
- treating peer identity as Boreal actor identity

## Validation Notes

Future validation should prove:

- peer foundation work lands under the declared workspaces instead of leaking into desktop UI code
- one desktop runtime can upgrade from `pre-peer` to `peer-ready` without changing actor identity semantics
- browser-visible realtime can still work without requiring browser-native peer transport
- peer transport logs or indexes never become default durable `RequestEvent` history
- file or media peer staging is activated only after canonical artifact semantics already exist

# 0009 Request-Bound Execution And Artifact Model Before Peer Runtime Activation

## Status

Accepted

## Date

2026-05-12

## Context

Decision `0008` already aligned:

- runtime identity versus Boreal actor identity
- ephemeral realtime traffic versus durable Boreal truth
- desktop main as the first realtime hub

At the same time, the current repo still has two important gaps:

- desktop Codex execution is still primarily a local chat lane instead of a fully request-bound fulfillment lane
- durable artifact modeling is still too narrow for broad Boreal work such as PDF, video, audio, binary file, or object-backed delivery

Current durable artifact handling is still centered on a string-backed document container with limited document kinds.
That is not enough foundation for peer file sync, peer delivery transport, or broader runtime distribution claims.

If Boreal activates localhost bridge flows or peer-runtime transport before those gaps are fixed, transport power would arrive before:

- request-bound execution truth
- artifact truth for broad delivery types
- clear promotion rules for what becomes durable Boreal history

That would increase the risk of desktop drift, artifact drift, and peer behavior being mistaken for canonical request truth.

## Decision

### 1. `0008` phase 1 may proceed now

The local desktop-main ephemeral stream lane is allowed now.

That phase is limited to:

- Electron main
- preload-safe IPC
- local renderer feedback

It does not authorize localhost browser bridges or peer transport by itself.

### 2. Request-bound execution must come before `0008` phase 2 or later

Before Boreal activates a localhost bridge or any peer runtime lane, desktop execution must become request-bound when the operator is working inside a tracked request lane.

That means desktop runtime turns must be able to carry:

- selected `Request`
- selected execution lane such as `Fulfillment`
- durable promotion boundaries
- request-relevant summaries or evidence without syncing the whole local transcript

Do not treat a generic local chat lane as sufficient foundation for broader runtime transport.

### 3. Artifact model expansion must happen before peer file or media work

Before Boreal activates peer transport for real work exchange, the canonical artifact model must expand beyond the current narrow document container.

The next artifact-model step must support first-class durable representation for at least:

- file-backed delivery
- media-backed delivery
- PDF
- video
- audio
- binary payload references
- object-storage or external-reference metadata when needed
- stable MIME or content-type metadata

Peer transport must not become the excuse for hiding missing artifact semantics.

### 4. Localhost bridge and peer work stay gated behind those two foundations

`0008` phase 2 and later are gated behind both:

- request-bound execution
- richer artifact truth

That includes:

- localhost browser bridge activation
- peer runtime host work under `apps/peer*`
- reusable peer transport packages under `packages/network-*`
- peer file or media transport
- multi-runtime peer orchestration

### 5. Sequence is now explicit

The required order is:

1. `0008` phase 1 local desktop ephemeral lane
2. request-bound desktop execution lane
3. artifact-model expansion for broad durable delivery types
4. optional localhost-only ephemeral bridge
5. peer runtime foundation
6. peer transport activation and multi-agent fanout over that transport

Future work should preserve this order unless a newer accepted decision changes it explicitly.

## Consequences

### Accepted

- Boreal can harden the local desktop ephemeral lane now without drifting into peer work early
- future agents have an explicit gate before phase 2 or later of `0008`
- artifact-model work becomes a first-class prerequisite instead of an easy-to-forget follow-up
- request-bound execution becomes the next functional priority after phase 1

### Rejected

- skipping directly from local desktop chat to peer-runtime transport
- treating localhost bridge work as harmless before request-bound execution exists
- treating peer transport as a substitute for richer artifact semantics
- using peer activation to mask the fact that desktop is still mostly local chat

## Validation Notes

Future validation should prove:

- phase-1 local ephemeral traffic does not create default durable `RequestEvent` history
- request-bound desktop execution can mutate Boreal truth through the canonical request lane without syncing the full local transcript
- broad artifact delivery types have stable durable containers before peer file or media exchange is activated
- peer runtime identity remains runtime identity and does not replace Boreal actor identity

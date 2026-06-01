# Agent Protocol Profile

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This file defines how Boreal should use MCP, A2A, and x402 for agent usage.

It exists so Boreal can become usable by external agents without making any protocol the canonical system of record.

## Canon Boundary

This standard inherits root canon.

It does not replace:

- `Request` as the durable root object
- `Commitment` as the apply/propose object
- `Fulfillment` and `FulfillmentStep` as execution truth
- `Artifact` as proof, delivery, receipt, file, media, signature, or output truth
- `Transaction` as payment and settlement truth
- `RequestEvent` as durable history

MCP sessions, A2A tasks, x402 payment payloads, chat transcripts, runtime logs, and webhook delivery attempts are adapter or transport objects only.

## Status Boundary

Live today:

- public discovery routes
- public action playbook
- contract-only agent sandbox manifest and guide
- contract-only agent sandbox fixture runner
- cursor-safe request activity reads
- signed monitor webhook receiver profile

Public sandbox routes:

- `/agents/sandbox.md`
- `/agents/sandbox.json`

Target direction:

- Boreal MCP server or gateway
- A2A task adapter
- x402 payment profile
- production sandbox credentials and isolated write-sandbox runner
- external-agent auth beyond current session and resolver-token lanes

## Protocol Layer Map

| Protocol | Boreal role | Canonical boundary |
| --- | --- | --- |
| MCP | Capability and context plane for agent hosts | MCP resources and tools call existing Boreal contracts and never replace `Request` |
| A2A | External agent interoperability and task handoff | A2A tasks map to request-bound operations; A2A artifacts map to Boreal `Artifact` only when accepted as proof or delivery |
| x402 | Optional payment rail for paid calls or solution runs | x402 verification and settlement must reconcile into Boreal `Transaction` and never imply completion |

## MCP Profile

MCP should expose stable resources, governed tools, and reusable prompts.

Recommended resources:

- `boreal://requests/public`
- `boreal://requests/{requestId}`
- `boreal://requests/{requestId}/activity`
- `boreal://requests/{requestId}/artifacts`
- `boreal://supplies/me`
- `boreal://schemas/request`
- `boreal://schemas/artifact`

Recommended tools:

- `search_public_requests`
- `read_request`
- `draft_request`
- `propose_commitment`
- `publish_artifact`
- `monitor_request`
- `run_public_solution`

Recommended prompts:

- `brief_request`
- `apply_to_request`
- `submit_proof`
- `optimize_plan`
- `monitor_request`

MCP must not be used for high-frequency token deltas, desktop heartbeats, raw runtime logs, or noisy progress ticks.

## A2A Profile

A2A should be used when Boreal interoperates with external agent systems.

| A2A concept | Boreal mapping |
| --- | --- |
| Agent Card | public Boreal discovery card and protocol profile |
| Task | request-bound operation, not a replacement for `Request` |
| Message | agent instruction, status context, or task communication |
| Artifact | Boreal `Artifact` when accepted as proof, delivery, receipt, or output |
| Status update | ephemeral progress by default; `FulfillmentStep` or `RequestEvent` only when promoted to durable business truth |
| Push notification | signed monitor webhook profile or future subscription delivery |

A2A task ids should be stored as adapter correlation ids.
They must not replace request ids.

## x402 Profile

x402 should be optional and narrow.

Good target use cases:

- paid public solution run
- paid external tool call
- paid provider API call
- paid artifact generation
- agent-paid capability call

Rules:

1. Boreal emits or accepts an x402 payment challenge only for an endpoint explicitly marked x402-capable.
2. Verification and settlement evidence must be stored on `Transaction.metadata`.
3. Payment success may unlock execution capacity, but it does not mean work is completed.
4. Completion still requires `Fulfillment`, `Artifact`, review, and related `RequestEvent` truth.
5. Facilitator and network configuration must be explicit.

## Implementation Order

1. Keep HTTP, JSON Schema, AsyncAPI, and public markdown discovery as the baseline.
2. Implement MCP as a gateway over existing contracts, not as a second backend.
3. Implement A2A as an adapter over request-bound operations.
4. Implement x402 only after the paid endpoint's transaction reconciliation path is explicit.
5. Use the contract-only sandbox and `pnpm contracts:agent-sandbox` for shape tests before touching live endpoints.
6. Add production sandbox credentials and an isolated write-sandbox runner before calling any protocol adapter production-ready.

## Non-Goals

- Do not use MCP as noisy realtime telemetry transport.
- Do not make A2A `Task` the durable Boreal root.
- Do not let x402 payment replace `Transaction`.
- Do not expose private drafts, private chats, raw desktop transcripts, or resolver secrets through protocol adapters.

# 0001 Workspace Taxonomy And Peer Naming

## Context

Boreal Network is expected to grow beyond canon docs into runnable products, desktop software, bots, CLI tools, reusable npm packages, and peer-to-peer networking code.

An early draft used `network-node` as an example workspace name.

That label is too weak for long-term use.

It does not tell whether the workspace is:

- a runnable peer
- a bridge or gateway
- a reusable transport library
- a CLI tool
- an operator surface

That ambiguity would make later code placement and agent behavior drift easier.

## Decision

The repo uses this workspace backbone:

- `apps/` for runnable or deployable surfaces
- `packages/` for reusable code
- `skills/` for reusable agent behavior
- `standards/` for Boreal-specific implementation standards

Workspace names must be role-first, not vague infrastructure-first.

Accepted naming rule:

- use product-role names such as `web`, `desktop`, `mobile`, `telegram-bot`, `docs-site`, `marketing-site`, and `cli`
- use network-role names such as `peer` or `peer-*` for runnable Boreal network participants
- use `gateway-*` for bridge or edge runtimes
- use `packages/network-*` or `packages/libp2p-*` for reusable networking code

Rejected naming rule:

- do not use `network-node` as a top-level namespace
- do not use `network-node` as the preferred workspace name for new runnable peers

## Consequences

- future libp2p runtimes should land under `apps/peer` or another role-specific `apps/peer-*` name unless a more precise role exists
- bridge services should land under `apps/gateway-*`
- reusable transport and protocol code should land under `packages/*`
- future workers must update `README.md`, `AGENTS.md`, and `docs/REPO_STRUCTURE.md` together if this naming rule changes

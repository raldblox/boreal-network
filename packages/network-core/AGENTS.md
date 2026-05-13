# Network Core Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\packages\network-core`.

## Rules

- keep this package transport-focused and app-agnostic
- do not redefine `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent`
- reusable peer identity or topic helpers belong here
- runnable peer lifecycle belongs in `apps/peer`

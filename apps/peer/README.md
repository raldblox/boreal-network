# Boreal Peer

This workspace is the first runnable Boreal peer-broker foundation.

## Purpose

- start one Hyperswarm-based Boreal peer host
- reuse shared runtime identity and topic helpers
- prepare future desktop-to-peer transport without becoming Boreal request truth

## Boundary

- peer transport is not the canonical source of `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent`
- Boreal actor identity still comes from Boreal auth and resolver approval
- this app is transport and broker groundwork only

## Commands

- `pnpm peer:start`
- `pnpm peer:dev`
- `pnpm peer:build`
- `pnpm --filter @boreal/peer start -- --once`

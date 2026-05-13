# Network Hyperswarm

This workspace holds Boreal's shared Hyperswarm transport adapter.

## Purpose

- Hyperswarm host lifecycle
- Corestore and Hyperbee peer-local storage
- shared peer connection and request-topic helpers

## Boundary

- transport only
- not canonical Boreal request truth
- runnable orchestration belongs in `apps/peer`

## Commands

- `pnpm --filter @boreal/network-hyperswarm build`

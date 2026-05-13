# Network Core

This workspace holds Boreal's reusable peer-runtime identity, topic, and routing helpers.

## Purpose

- runtime identity helpers
- Boreal peer topic derivation
- small transport-agnostic routing or envelope helpers

## Boundary

- this package is not a runnable peer host
- this package is not Boreal request truth
- canonical object meaning still comes from root docs

## Commands

- `pnpm --filter @boreal/network-core build`

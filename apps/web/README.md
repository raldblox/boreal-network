# Boreal Web

This workspace is the primary Boreal web product surface inside the Boreal monorepo.

## Current State

- workspace is activated
- runtime scaffold is intentionally minimal
- framework and initial app bootstrap are not locked yet
- root canon already applies

## Planned Scope

This workspace should eventually hold Boreal's web surfaces for:

- buyer intake
- request threads
- supply discovery
- account and operator surfaces
- public product-facing web experiences that belong to the main Boreal web surface

## Planned Local Structure

- `src/`
- `public/`
- `tests/`

## Commands

No runtime commands exist yet.

When the initial scaffold lands:

- define local build, dev, lint, and test commands here
- update the root `README.md` in the same patch if shared monorepo workflow changes

## Canon Boundary

This workspace may implement web-specific flows and UX.
It may not redefine root domain objects, lifecycle states, event meaning, or commercial category.

If the first framework or runtime baseline is chosen here, record the decision explicitly in `docs/decisions/` unless the user directly instructs the exact stack in the same task.

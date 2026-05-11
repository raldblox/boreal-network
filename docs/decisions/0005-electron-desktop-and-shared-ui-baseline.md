# Decision 0005: Electron Desktop And Shared UI Baseline

## Status

Accepted

## Date

2026-05-11

## Context

Boreal now needs an activated desktop workspace and a reusable UI package without drifting from root canon.

The desktop product direction is Windows-first and should support native filesystem, process, secure-storage, and local-runtime access.
At the same time, Boreal's web workspace remains the primary product surface and current system-of-record participant.

Without an explicit decision, desktop scaffolding could split into one-off native glue while shared UI primitives remain trapped inside `apps/web/`.

## Decision

Activate:

- `apps/desktop/` as the Electron desktop shell workspace
- `packages/ui/` as the shared React and Tailwind UI package

Lock the initial desktop baseline to:

- `Electron`
- secure `main` / `preload` / `renderer` process separation
- `Vite` plus `React` for the renderer shell
- shared theme styles and reusable component primitives sourced from `packages/ui/`

Keep these boundaries explicit:

- `apps/web/` stays the web product workspace
- `apps/desktop/` stays an execution participant and operator surface, not a second request system of record
- reusable UI code belongs in `packages/ui/`, not duplicated per app

## Consequences

### Accepted

- root topology docs now need to list both new active workspaces
- `apps/desktop/` gets local commands, guards, and Electron shell files
- `packages/ui/` becomes the reusable source for Boreal component primitives and theme styles
- `apps/web/components/ui/*` may remain compatibility wrappers while the shared source moves into `packages/ui/`

### Deferred

- deeper desktop runtime orchestration
- packaging and update distribution
- first-class private execution registration and assignment flows
- additional shared packages beyond UI

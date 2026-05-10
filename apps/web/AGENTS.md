# Boreal Web Workspace Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\apps\web` unless a deeper directory adds a more specific file.

## Read First

Before changing this workspace, read:

1. `../../README.md`
2. `../../AGENTS.md`
3. `../../docs/REPO_STRUCTURE.md`
4. `../../docs/WORKSTREAMS.md`
5. `../../docs/OWNERSHIP.md`
6. `../README.md`
7. `../AGENTS.md`
8. this file

## Current Stage

This workspace is activated but not fully scaffolded.
Do not pretend framework, runtime, or deployment decisions are already final unless a later explicit decision says so.
If a task needs one of those choices and root alignment is still weak, do the research and decision pass first instead of scaffolding prematurely.

## Allowed Here

- web-specific UI flows
- app-shell behavior
- client-side state and caching
- route structure
- deployment-facing web concerns

## Not Allowed Here

- redefining root canonical objects
- redefining lifecycle states or event names
- scattering shared code that belongs in `packages/*`
- claiming the workspace is production-ready before the scaffold and tests exist

## Local Structure Rule

Prefer the following local shape unless a better explicit decision replaces it:

- `src/`
- `public/`
- `tests/`

## Sync Rule

If this workspace needs a new root semantic rule, stop and update the root canon first in the same patch.
If this workspace needs a shared abstraction, move that abstraction into `packages/*` instead of cloning it here.

# Boreal Desktop Workspace Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\apps\desktop` unless a deeper directory adds a more specific file.

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

This workspace is the initial Electron desktop shell baseline.
Keep the baseline aligned with `../../docs/decisions/0005-electron-desktop-and-shared-ui-baseline.md`.

## Required Architecture

- keep `main`, `preload`, and `renderer` responsibilities separate
- keep privileged OS access in `main`
- expose only narrow typed IPC through `preload`
- keep renderer code web-like and reusable where possible

## Not Allowed Here

- redefining root business objects or event meaning
- storing Boreal request truth only inside desktop-local state
- bypassing preload safety by enabling unrestricted renderer Node access
- cloning shared UI primitives that should live in `../../packages/ui/`

## Sync Rule

If this workspace needs a new runtime or privilege boundary that affects other workspaces, route the decision back through root canon or `docs/decisions/` first.

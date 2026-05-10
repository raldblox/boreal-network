# Workstreams

This file defines the safe work lanes for parallel work in the Boreal monorepo.

Use it whenever more than one agent or contributor may work at the same time.

## Core Rule

Parallel work is allowed only when write scopes are disjoint or one owner is explicitly assigned to the shared files.

Root canon files are single-writer by default.

## Current Workstream Registry

### `root-canon`

Write scope:

- `README.md`
- `AGENTS.md`
- `docs/*`
- `schemas/*`
- `fixtures/*`
- `db/*`
- `tests/*`

Purpose:

- semantic canon
- contracts
- schemas
- fixtures
- decisions
- governance

Rules:

- single-writer lane by default
- any `Class A` change starts here
- implementation agents should not enter this lane unless assigned explicitly

### `monorepo-topology`

Write scope:

- `docs/REPO_STRUCTURE.md`
- `docs/WORKSTREAMS.md`
- `docs/OWNERSHIP.md`
- namespace-root docs under `apps/`, `packages/`, `skills/`, `standards/`
- root `package.json`
- `pnpm-workspace.yaml`

Purpose:

- workspace activation
- topology changes
- workspace discovery
- ownership and coordination rules

Rules:

- single-writer when topology changes are in flight
- may run in parallel with `root-canon` only when semantics are already stable and write scopes stay disjoint
- owns alignment-first setup when a new workspace or namespace still needs a framework, runtime, or boundary decision before scaffold work

### `web-foundation`

Write scope:

- `apps/web/*`

Purpose:

- Boreal primary web product workspace
- web runtime scaffold
- web-only UX and implementation work

Rules:

- may run in parallel with dormant namespace work
- must stop if root canon changes the same semantics in flight
- shared abstractions belong in `packages/*`, not directly in `apps/web/*`

### `packages-foundation`

Write scope:

- `packages/*`

Purpose:

- shared UI
- SDKs
- transport code
- generated or reusable clients

Rules:

- may run in parallel with app work when package ownership is explicit
- must not redefine root semantic contracts

### `skills-foundation`

Write scope:

- `skills/*`

Purpose:

- agent skills
- prompt packs
- task modules

Rules:

- may run in parallel with app work when contracts are already stable
- executable shared code belongs in `packages/*`
- if the skill shape, publishing model, or reusable behavior boundary is still unresolved, stop and route the task back through root alignment first

### `standards-foundation`

Write scope:

- `standards/*`

Purpose:

- implementation profiles
- compatibility notes
- protocol and adapter standards

Rules:

- inherits root canon
- may not replace root canon
- if the standard still needs research on profile shape, compatibility scope, or adapter boundary, align that in root canon before writing the standard itself

## Parallel Rules

- Parallel work requires declared workstreams before implementation begins.
- A task must name its write scope upfront.
- If two tasks touch the same file, they are no longer parallel tasks.
- `Class A` and `Class B` changes should merge root canon first or in the same patch before dependent workspace work continues.
- If a workspace depends on unmerged semantic changes, stop and merge the root canon lane first.
- Namespace-root docs such as `apps/README.md` and `apps/AGENTS.md` belong to the `monorepo-topology` lane, not to any one child workspace lane.
- If a task still needs research to choose a framework, runtime, skill shape, standards profile, or transport boundary, do the research and decision pass before opening parallel implementation lanes.

## Required Task Header

Every non-trivial task should declare:

- `Workstream:`
- `Owner:`
- `Change class:`
- `Write scope:`
- `Required sync files:`
- `Validation plan:`

## Default First Lanes

Until more workspaces exist, the default active lanes are:

- `root-canon`
- `monorepo-topology`
- `web-foundation`

Create a new lane only when a real new workspace or durable ownership zone exists.

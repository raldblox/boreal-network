# Ownership

This file defines file ownership rules for safe parallel work in the Boreal monorepo.

## Ownership Model

Use one ownership model only:

- one primary owner per task
- one primary owner per file inside one patch
- one root canon owner for semantic decisions
- one workspace owner for each active child workspace

The same person may temporarily hold more than one ownership zone, but the zones must still be declared explicitly.

## Current Ownership Zones

### Root canon zone

Write scope:

- `README.md`
- `AGENTS.md`
- `docs/*`
- `schemas/*`
- `fixtures/*`
- `db/*`
- `tests/*`

Owner responsibilities:

- semantic truth
- contract truth
- fixture truth
- governance and naming

### Monorepo topology zone

Write scope:

- `docs/REPO_STRUCTURE.md`
- `docs/WORKSTREAMS.md`
- `docs/OWNERSHIP.md`
- root `package.json`
- `pnpm-workspace.yaml`
- namespace-root docs under `apps/`, `packages/`, `skills/`, `standards/`

Owner responsibilities:

- namespace activation
- workspace registry
- workspace discovery
- ownership boundaries

### Web workspace zone

Write scope:

- `apps/web/*`

Owner responsibilities:

- local scaffold
- local commands
- local structure
- local implementation detail

### Future workspace zones

Reserve one ownership zone per future child workspace under:

- `apps/*`
- `packages/*`
- `skills/*`
- `standards/*`

Do not share one vague owner across unrelated workspaces when the repo grows.

## Delegation Rules

- Implementation agents may not silently edit root semantic docs unless that write scope was assigned explicitly.
- Root canon owners may block workspace merges when canon drift exists.
- Workspace owners may request canon changes, but they must route the semantic patch through the root canon zone.
- If no owner is assigned yet, default temporary ownership goes to the root canon zone until the lane is declared.

## Parallel Merge Rules

- Disjoint write scopes may merge independently.
- Shared write scopes require one owner.
- If root canon and a workspace both change the same semantics, merge root canon first or merge both in one coordinated patch.
- If a task touches namespace-root docs and child workspace files, declare both zones and one primary owner before editing.

## Required Task Declaration

Every non-trivial task should declare:

- `Owner:`
- `Change class:`
- `Write scope:`
- `Sync files:`
- `Validation:`

## Review Rule

Use the closest owner for first-pass review:

- root canon owner reviews semantic patches
- topology owner reviews namespace and workspace activation patches
- workspace owner reviews local implementation patches

When a patch crosses zones, review follows the highest-risk zone first:

1. root canon
2. topology
3. local workspace

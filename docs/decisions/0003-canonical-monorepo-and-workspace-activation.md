# 0003 Canonical Monorepo And Workspace Activation

## Context

Boreal Network started as a canon-first repository that described a future multi-workspace shape.

The next phase is to build Boreal's real product surfaces, shared libraries, skills, and implementation standards in the same repository instead of treating this repo as documentation only.

Without an explicit decision, agents would keep assuming implementation belongs in downstream repos and would hesitate to activate `apps/*`, `packages/*`, `skills/*`, and `standards/*` here.

## Decision

Boreal Network is now Boreal's canonical monorepo.

The root remains the semantic control layer.
Governed implementation workspaces live in the same repository.

The first activated implementation workspace is `apps/web/`.

This activation does not lock the initial web runtime stack yet.
The workspace is activated first, and the first framework or scaffold decision can be made explicitly in a later decision or direct implementation task.

## Consequences

- Root canon still overrides implementation.
- Workspace creation must now update repo topology and ownership docs in the same patch.
- Parallel work must use declared workstreams and write scopes.
- `apps/web/` is the correct place for future Boreal web product code.
- Future Boreal peer, gateway, package, skill, and standards work should be added here under governed namespaces rather than scattered across ad hoc repos.

# Apps Namespace Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\apps` unless a deeper child workspace adds a more specific file.

## Read First

Before editing an app workspace, read:

1. `../README.md`
2. `../AGENTS.md`
3. `../docs/REPO_STRUCTURE.md`
4. `../docs/WORKSTREAMS.md`
5. `../docs/OWNERSHIP.md`
6. the child workspace `README.md`
7. the child workspace `AGENTS.md`

## Rules

- `apps/*` is for runnable product and operator surfaces.
- Apps may define local UI and runtime behavior.
- Apps may not redefine canonical root objects, lifecycle states, or event meaning.
- Shared code belongs in `packages/*`.
- Namespace-root docs in `apps/` belong to the monorepo topology lane, not to any one child workspace.
- If you activate a new child workspace, update root topology and ownership docs in the same patch.

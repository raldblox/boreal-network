# Apps Namespace

This namespace holds Boreal's runnable product and operator surfaces.

## Current Active Workspaces

- `web/`
- `desktop/`
- `peer/`

## Rules

- app workspaces may specialize UI, caching, transport, and deployment
- app workspaces must inherit root canon
- shared abstractions belong in `packages/`, not duplicated across apps
- every child workspace must have `README.md` and `AGENTS.md`
- activating a new child workspace requires updating the root workspace registry and coordination docs in the same patch

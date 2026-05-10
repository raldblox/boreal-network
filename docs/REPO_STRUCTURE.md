# Repository Structure

This file defines the allowed top-level namespaces and workspace rules for Boreal Network.

It exists so the repo can grow into multiple workspaces without losing semantic control.

## Current Top-Level Namespaces

These namespaces already exist and are active:

- `docs/`
- `schemas/`
- `db/`
- `fixtures/`
- `tests/`

These hold canon, machine contracts, physical schema work, deterministic samples, and validation assets.

## Reserved Expansion Namespaces

These names are reserved for future multi-workspace expansion.

They should not be created casually.

### `apps/`

Purpose:

- deployable or runnable products
- product surfaces
- operator surfaces
- peer or node services
- interface-specific implementations

Examples:

- `apps/web/`
- `apps/mobile/`
- `apps/extension/`
- `apps/desktop/`
- `apps/telegram-bot/`
- `apps/network-node/`
- `apps/cli/`
- `apps/marketing-site/`

Rules:

- may consume canonical contracts
- may add client-specific caching or UX abstractions
- may define runnable peer services and CLI applications
- may not redefine canonical root objects or state names

### `packages/`

Purpose:

- reusable libraries
- SDKs
- npm packages
- shared clients
- generated clients
- transport libraries
- shared configs
- internal code packages

Examples:

- `packages/sdk-js/`
- `packages/protocol-client/`
- `packages/libp2p-transport/`
- `packages/config-eslint/`
- `packages/ui/`

Rules:

- may define reusable implementations of canonical contracts
- may define shared transport and networking code
- may not redefine request, commitment, fulfillment, transaction, or request-event semantics

### `skills/`

Purpose:

- reusable agent skills
- prompt modules
- task packages
- capability recipes

Rules:

- may package repeatable agent behavior
- should hold skill definitions, prompt packs, and task modules
- should not become a dumping ground for shared executable runtime code
- if a skill needs reusable executable code, place that code in `packages/` and keep the skill definition in `skills/`
- may not redefine canonical domain objects or lifecycles

### `standards/`

Purpose:

- Boreal-specific implementation standards
- protocol profiles
- integration standards
- compatibility guidance

Rules:

- may define profiles and implementation rules
- must inherit root canon
- must not replace root canon

## Explicit Naming Decision

`network-node/` is not a recommended top-level namespace.

Why:

- it is too implementation-specific
- it mixes deployable services with reusable libraries
- it becomes awkward once the repo also contains CLI apps, desktop apps, bots, and npm packages

Use instead:

- `apps/network-node/` or `apps/peer-node/` for runnable node services
- `packages/*` for shared libp2p, transport, or peer libraries

## Branding and Marketing Rule

Brand support follows this rule:

- docs, naming guidance, and lightweight messaging canon stay in `docs/`
- marketing or documentation websites belong in `apps/`
- reusable brand code or site components belong in `packages/`

Do not create top-level `branding/` or `marketing/` namespaces unless the repo grows enough asset-specific weight to justify a separate governed namespace.

## Workspace Creation Rules

Do not create a new top-level namespace or workspace until:

1. the namespace and purpose are registered here
2. the root `README.md` and root `AGENTS.md` are updated if needed
3. the workspace has a clear relationship to root canon
4. the workspace root includes `README.md` and `AGENTS.md`

## Required Files For Any New Workspace

Every new workspace root must contain:

- `README.md`
- `AGENTS.md`

The local `README.md` must explain:

- purpose
- scope
- build and test commands
- relation to root canon

The local `AGENTS.md` must explain:

- local structure
- allowed abstractions
- prohibited drift
- local sync rules

## Ownership and Boundary Rules

### Root docs remain source of truth for:

- object taxonomy
- lifecycle semantics
- event semantics
- API semantics
- logical schema boundaries

### Workspaces may specialize:

- UX flows
- transport details
- implementation details
- packaging details
- deployment details

### Workspaces may not override:

- root object names
- root lifecycle meanings
- event meaning
- payment meaning
- fulfillment meaning

## Forbidden Top-Level Drift

Do not introduce new top-level folders like:

- `client/`
- `server/`
- `sdk/`
- `tools/`
- `node/`
- `network-node/`
- `bots/`
- `marketing/`
- `mobile-app/`
- `extension-app/`

when an existing reserved namespace already covers the use case.

If a truly new namespace is needed, document why the existing ones are not enough before creating it.

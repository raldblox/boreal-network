# Repository Structure

This file defines the allowed top-level namespaces, active workspaces, and boundary rules for Boreal Network.

Boreal Network is now Boreal's canonical monorepo.
The root holds canon and governance.  Governed workspaces hold runnable surfaces, shared code, skills, and implementation standards.

## Repo Model

Use two layers only:

- `Root canon layer` for domain truth, contracts, schemas, fixtures, decisions, and governance.
- `Governed workspace layer` for product code, peer code, reusable libraries, skills, and implementation standards.

The governed workspace layer may specialize implementation.
It may not redefine root meaning.

## Active Top-Level Namespaces

These namespaces now exist and are active:

- `docs/`
- `schemas/`
- `db/`
- `fixtures/`
- `tests/`
- `apps/`
- `packages/`
- `skills/`
- `standards/`

## Root Canon Layer

The root canon layer includes:

- `README.md`
- `AGENTS.md`
- `docs/`
- `schemas/`
- `db/`
- `fixtures/`
- `tests/`
- `package.json`
- `pnpm-workspace.yaml`

Root is source of truth for:

- object taxonomy
- lifecycle semantics
- event semantics
- API semantics
- logical schema boundaries
- workspace topology
- ownership rules
- parallel-work safety rules

## Governed Workspace Layer

The governed workspace layer includes:

- `apps/`
- `packages/`
- `skills/`
- `standards/`

These namespaces are now available for real implementation work, not only for future reservation.

## Active Workspace Registry

These child workspaces are currently activated:

- `apps/web/` - first Boreal product workspace, activated as the primary web surface but intentionally scaffold-light while the initial runtime stack remains undecided.

Every new child workspace must be added here in the same patch that creates it.

## Namespace Rules

### `apps/`

Purpose:

- deployable or runnable products
- product surfaces
- operator surfaces
- peer runtimes
- gateways and bridges
- interface-specific implementations

Examples:

- `apps/web/`
- `apps/mobile/`
- `apps/extension/`
- `apps/desktop/`
- `apps/telegram-bot/`
- `apps/peer/`
- `apps/peer-relay/`
- `apps/gateway-http/`
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
- network libraries
- transport libraries
- shared configs
- internal code packages

Examples:

- `packages/sdk-js/`
- `packages/protocol-client/`
- `packages/network-core/`
- `packages/libp2p-transport/`
- `packages/config-eslint/`
- `packages/ui/`
- `packages/brand-system/`

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

## Workspace Naming Principle

Name workspaces by product role or network role, not by vague infrastructure bucket.

Good names answer one clear question:

- what surface is this
- what role does it play
- is it runnable or reusable

Prefer:

- `web`
- `desktop`
- `mobile`
- `telegram-bot`
- `cli`
- `peer`
- `peer-relay`
- `gateway-http`
- `docs-site`
- `marketing-site`

Avoid:

- `network-node`
- `node2`
- `server`
- `service-box`
- `tools2`
- `misc`

If the workspace joins a libp2p-style network directly, prefer `peer` as the canonical runtime word.

Use `gateway` when the workspace mainly bridges protocols, exposes an HTTP edge, or adapts one runtime to another.

Use `packages/network-*` or `packages/libp2p-*` for reusable networking code.

## Explicit Naming Decision

`network-node/` is not a recommended top-level namespace or preferred workspace name.

Why:

- `network` is redundant inside `Boreal Network`
- `node` is too generic once the repo contains CLI apps, desktop apps, bots, gateways, and npm packages
- it mixes network membership, deployment shape, and reusable transport concerns into one vague label

Use instead:

- `apps/peer/` or `apps/peer-*` for runnable Boreal network participants
- `apps/gateway-*` for protocol bridges and edge runtimes
- `packages/network-*` or `packages/libp2p-*` for shared libp2p, transport, or peer libraries

## Branding And Marketing Rule

Brand support follows this rule:

- docs, naming guidance, and lightweight messaging canon stay in `docs/`
- marketing or documentation websites belong in `apps/`
- reusable brand code or site components belong in `packages/`

Do not create top-level `branding/` or `marketing/` namespaces unless the repo grows enough asset-specific weight to justify a separate governed namespace.

## Workspace Creation Rules

Do not create a new top-level namespace or child workspace until:

1. the namespace and purpose are registered here
2. the root `README.md` and root `AGENTS.md` are updated if needed
3. the workspace is added to the active workspace registry here
4. `docs/WORKSTREAMS.md` and `docs/OWNERSHIP.md` are updated if coordination or ownership changes
5. the workspace has a clear relationship to root canon
6. the workspace root includes `README.md` and `AGENTS.md`

If the new workspace introduces an unresolved framework, runtime, protocol, skill shape, or standards profile, align that decision first through root canon or `docs/decisions/` before deeper scaffold work begins.

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
- whether research-first alignment is required before implementation in that workspace

## Ownership And Boundary Rules

### Root docs remain source of truth for:

- object taxonomy
- lifecycle semantics
- event semantics
- API semantics
- logical schema boundaries
- workspace topology
- ownership rules

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
- root ownership and workstream rules

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

when an existing governed namespace already covers the use case.

If a truly new namespace is needed, document why the existing ones are not enough before creating it.

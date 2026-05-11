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

This workspace now has an explicit starting baseline.
Use `Next.js App Router` with the imported `Vercel Chatbot` scaffold, `Auth.js`, `Neon Postgres`, `Drizzle`, and `shadcn/ui` unless a later explicit decision replaces part of that stack.

The baseline decision is recorded in `../../docs/decisions/0004-web-stack-baseline-and-chatbot-starting-point.md`.

Do not silently switch account auth, database stack, or workspace file layout without first updating root alignment.

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

This workspace now uses the following local shape:

- `app/`
- `components/`
- `hooks/`
- `lib/`
- `public/`
- `tests/`

Config files may live at the workspace root when required by Next.js, Drizzle, Auth.js, or Vercel deployment.

Do not force shared abstractions into `apps/web` if they are clearly reusable outside this workspace.

## Auth And Identity Rule

`Auth.js` in this workspace is the account-auth baseline only.

Do not collapse the following into one generic auth concept:

- account identity
- wallet identity
- payout identity
- runtime or desktop identity

If a task touches wallet-linked identity or signing flows, align it against root Boreal product truth first instead of assuming the imported template auth model is enough.

## Sync Rule

If this workspace needs a new root semantic rule, stop and update the root canon first in the same patch.
If this workspace needs a shared abstraction, move that abstraction into `packages/*` instead of cloning it here.
Reusable UI primitives and theme styles should stay sourced from `../../packages/ui/`, with local `components/ui/*` files used only as compatibility wrappers when needed.

# Boreal Web

This workspace is the primary Boreal web product surface inside the Boreal monorepo.

## Current State

- workspace is activated
- runtime baseline is locked
- initial scaffold now starts from `Vercel Chatbot`
- root canon already applies

## Stack Baseline

- `Next.js App Router`
- `Auth.js`
- `Neon Postgres`
- `Drizzle ORM`
- `shadcn/ui`
- optional Redis-backed rate limiting or ephemeral coordination later

Important identity rule:

- account auth lives here through `Auth.js`
- Boreal wallet identity still remains a separate product-layer concern
- imported starter auth currently uses `credentials` plus `guest` flows, not social login by default

## Scope

This workspace should eventually hold Boreal's web surfaces for:

- buyer intake
- request threads
- supply drafting and owner-scoped supply management
- supply discovery
- account and operator surfaces
- public product-facing web experiences that belong to the main Boreal web surface

## Local Structure

- `app/`
- `components/`
- `hooks/`
- `lib/`
- `public/`
- `tests/`
- workspace config files at root such as `next.config.ts`, `proxy.ts`, `drizzle.config.ts`, and `tsconfig.json`

Shared UI note:

- reusable component primitives and shared theme styles now live in `../../packages/ui/`
- local `components/ui/*` files remain compatibility entrypoints for this workspace
- web-specific flows should not copy reusable primitives back into `apps/web`

## Commands

Run from the monorepo root after dependencies are installed:

- `pnpm web:dev`
- `pnpm web:build`
- `pnpm web:db:migrate`
- `pnpm web:test`

Or run directly against the workspace:

- `pnpm --filter @boreal/web dev`
- `pnpm --filter @boreal/web build`
- `pnpm --filter @boreal/web db:migrate`
- `pnpm --filter @boreal/web test`

Account setup notes:

- `Neon` account needed for `POSTGRES_URL`
- `Vercel` account needed for deployment and easiest env flow
- `Auth.js` is package code, not a separate hosted account
- Redis is optional and should not block first local scaffold work

## Canon Boundary

This workspace may implement web-specific flows and UX.
It may not redefine root domain objects, lifecycle states, event meaning, or commercial category.

The first framework and runtime baseline are now recorded in `../../docs/decisions/0004-web-stack-baseline-and-chatbot-starting-point.md`.

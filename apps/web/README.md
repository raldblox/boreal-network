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
- accepted regular-account direction is `username or email + password`
- accepted stronger-factor direction is `WebAuthn` MFA for regular accounts
- resolver approval remains separate from account auth

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
- `pnpm web:build:migrated`
- `pnpm web:db:migrate`
- `pnpm web:seed:character-call-demo`
- `pnpm web:test`

Or run directly against the workspace:

- `pnpm --filter @boreal/web dev`
- `pnpm --filter @boreal/web build`
- `pnpm --filter @boreal/web build:migrated`
- `pnpm --filter @boreal/web db:migrate`
- `pnpm --filter @boreal/web seed:character-call-demo`
- `pnpm --filter @boreal/web eval:request-processing:live`
- `pnpm --filter @boreal/web test`

Build rule:

- `build` is compile-only and should match local and Vercel production builds
- `db:migrate` is explicit and should run separately from the build step
- `build:migrated` is only for operator-controlled environments where applying schema before compile is intentional

Account setup notes:

- `Neon` account needed for `POSTGRES_URL`
- `Vercel` account needed for deployment and easiest env flow
- `Runway` API key needed for Boreal-managed video generation via `RUNWAYML_API_SECRET`
- `Auth.js` is package code, not a separate hosted account
- Redis is optional and should not block first local scaffold work
- `BLOB_READ_WRITE_TOKEN` is required once provider outputs are mirrored into durable Boreal storage

Demo seed notes:

- `seed:character-call-demo` creates or reuses one demo user and idempotently grants settled first-party buyer credit
- set `BOREAL_DEMO_EMAIL`, `BOREAL_DEMO_USERNAME`, `BOREAL_DEMO_PASSWORD`, or `BOREAL_DEMO_CREDIT` to override defaults
- production runs require `ALLOW_BOREAL_DEMO_SEED=true`
- after seeding, sign in and open `/services/character-call-starter/starter-call`

## Canon Boundary

This workspace may implement web-specific flows and UX.
It may not redefine root domain objects, lifecycle states, event meaning, or commercial category.

The first framework and runtime baseline are now recorded in `../../docs/decisions/0004-web-stack-baseline-and-chatbot-starting-point.md`.

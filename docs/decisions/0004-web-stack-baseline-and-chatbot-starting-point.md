# Decision 0004: Web Stack Baseline And Chatbot Starting Point

## Status

Accepted

## Date

2026-05-11

## Context

`apps/web/` was activated as Boreal's first product workspace, but the runtime stack and scaffold were still intentionally undecided.

Boreal needs a fast, modern, investible starting point that is:

- Next.js-native
- Vercel-friendly
- free-enough for MVP
- compatible with Boreal's chat-native surface
- compatible with Boreal's request-native commerce direction
- easy to brand without fighting a closed component system

## Decision

Lock the initial `apps/web/` baseline to:

- `Next.js App Router`
- `Vercel Chatbot` as the starting scaffold
- `Auth.js` as the account-auth baseline
- `Neon Postgres` as the initial database
- `Drizzle ORM` as the schema and query layer
- `shadcn/ui` plus template component primitives as the UI baseline
- `Redis` only as optional rate limiting or ephemeral coordination infrastructure

## Why This Stack

### `Vercel Chatbot`

Use it as the starting scaffold because Boreal's primary surface is chat-native and request-thread oriented.
It gives a production-grade Next.js shell, App Router structure, AI SDK integration, shadcn-compatible components, Neon-ready persistence hooks, and Auth.js wiring without forcing a generic SaaS dashboard first.

### `Auth.js`

Use it now because it is the lower-churn account-auth layer for Boreal's first web surface.
It stays separate from Boreal's wallet identity, `SIWX`, payout wallet, and desktop-connect identity rules.

Important boundary:

- `Auth.js` covers account identity
- it does not replace Boreal wallet identity
- wallet-linked flows still remain explicit product-layer work

### `Neon Postgres` plus `Drizzle`

Use this pair because it is modern, free-enough for MVP, easy to deploy on Vercel, and aligned with request-thread durability.
Neon keeps the initial hosted database simple.
Drizzle keeps the schema explicit and close to SQL.

### `shadcn/ui`

Use it because Boreal needs open code, not a closed design system.
It supports strong brand control and lets Boreal keep a distinctive surface later without a component rewrite.

### Optional `Redis`

Do not make cache or rate-limit infrastructure a day-one dependency unless the product path actually needs it.
If needed, `Upstash` or another Redis-compatible service may be attached later for:

- request throttling
- ephemeral coordination
- cache or replay guards

## Consequences

### Accepted

- `apps/web/` may now use the Vercel Chatbot file layout instead of the previous placeholder `src/`-first shape
- the workspace can scaffold around `app/`, `components/`, `hooks/`, `lib/`, `public/`, and `tests/`
- root docs should no longer describe the web runtime as undecided

### Deferred

- switching account auth to `Neon Auth`
- choosing social providers
- choosing final production file storage requirements
- enabling Redis-backed rate limits in all environments

## Auth UX Note

The imported Vercel Chatbot baseline uses `Auth.js`, but its starter UX is not "full social login by default".
The initial scaffold starts with template-auth behavior and can later be extended with:

- email plus password
- social providers
- passkey or stronger auth variants

Provider choice is a later product decision.

## Follow-Up

- adapt the imported template to Boreal naming and product truth
- keep Boreal wallet identity flows separate from account-auth wiring
- add Boreal-specific env documentation before first real run

# Production MVP Architecture Slice

## Context

The web workspace already has a locked implementation baseline:

- `Next.js App Router`
- `Auth.js`
- `Neon Postgres`
- `Drizzle ORM`
- `shadcn/ui`

The repo also already contains canonical object, event, API, schema, and eval rules for request-native work commerce. A greenfield rebuild would create avoidable drift unless it replaced this baseline through a broader root-canon decision.

## Decision

The production MVP architecture should be built as an incremental slice inside `apps/web`, not as a new top-level app or parallel backend.

The MVP system shape is:

1. Buyer-facing request intake and request-room UI in `apps/web`.
2. Authenticated account identity through Auth.js, with resolver identity kept separate.
3. Durable request-commerce truth in Postgres through Drizzle tables for `Request`, `Supply`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, and `RequestEvent`.
4. Append-only request activity through `RequestEvent`, with current state projected onto root and adjacent records.
5. Provider, workflow, buyer-credit, and desktop-runtime integrations as support layers that attach to canonical objects instead of replacing them.
6. UI surfaces that explain the architecture from the same typed implementation inventory used by the app.

This is a scale path, not a claim that the current deployment has already been load-tested to millions of users.

## Consequences

- Do not create a separate `server/`, `backend/`, `api/`, or `mvp/` workspace for this slice.
- Keep new public architecture UI under `apps/web`.
- Keep database shape aligned with `apps/web/lib/db/schema.ts` and root schema canon.
- Keep API descriptions aligned with existing App Router routes and root API contracts.
- Treat millions-user scale as an architecture target requiring production hardening: horizontal stateless web instances, pooled database connections, cache and queue boundaries, object storage, idempotent mutations, observability, and load testing.
- If the architecture later introduces a new runtime, transport, shared package boundary, or external contract, record that decision separately before implementation.

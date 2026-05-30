# Boreal Web Promptfoo Evals

This suite evaluates the user-facing `apps/web` chat route through a Promptfoo custom provider.

## Command

From the monorepo root:

```bash
pnpm evals
```

The wrapper starts the web app on `127.0.0.1`, logs in through the guest auth route, posts to `/api/chat`, and scores the streamed route output with deterministic JavaScript assertions.

## Environment

The command uses the same app environment as `apps/web`:

- `POSTGRES_URL`
- `AUTH_SECRET`
- existing model gateway credentials required by `/api/chat`

Optional overrides:

- `BOREAL_PROMPTFOO_PORT`
- `BOREAL_PROMPTFOO_BASE_URL`
- `BOREAL_PROMPTFOO_COOKIE`
- `BOREAL_PROMPTFOO_MODEL`

Fixtures must stay synthetic and free of secrets, customer data, and sensitive personal data.

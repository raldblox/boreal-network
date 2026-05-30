# Boreal Web Promptfoo Evals

This suite evaluates the user-facing `apps/web` chat route through a Promptfoo custom provider.

## Command

From the monorepo root:

```bash
pnpm evals
```

The wrapper starts the web app on `127.0.0.1`, runs a guest-auth/database preflight, logs in through the guest auth route, posts to `/api/chat`, and scores the streamed route output with deterministic JavaScript assertions.

Use the deterministic routing suite when you only need to verify model promotion and fallback order:

```bash
pnpm evals:model-routing
```

## Environment

The command uses the same app environment as `apps/web`:

- `POSTGRES_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY` for the preferred direct OpenAI route, or `AI_GATEWAY_API_KEY` for the Vercel AI Gateway fallback used by `/api/chat`

Optional overrides:

- `BOREAL_PROMPTFOO_PORT`
- `BOREAL_PROMPTFOO_BASE_URL`
- `BOREAL_PROMPTFOO_COOKIE`
- `BOREAL_PROMPTFOO_MODEL`
- `BOREAL_PROMPTFOO_RATE_LIMIT_RETRIES` defaults to `1` and also retries transient provider timeouts
- `BOREAL_PROMPTFOO_RATE_LIMIT_DELAY_MS` defaults to `65000`
- `BOREAL_PROMPTFOO_AUTH_RETRIES` defaults to `4` and retries transient guest-auth/database connectivity failures before posting to `/api/chat`
- `BOREAL_PROMPTFOO_AUTH_RETRY_DELAY_MS` defaults to `5000`
- `BOREAL_PROMPTFOO_AUTH_TIMEOUT_MS` defaults to `20000`
- `BOREAL_PROMPTFOO_SKIP_HEALTH_PREFLIGHT=1` skips the wrapper preflight when guest auth and database access were already verified
- `BOREAL_PROMPTFOO_EVAL_NO_DB=1` starts a fresh local eval server with an explicit no-DB eval session and dry-run request-brief tool output. Use only when live Neon auth/database connectivity is unavailable; this scores prompt, model, and tool-call behavior but does not cover persistence, real guest auth, rate-count reads, or replay safety.
- `BOREAL_PROMPTFOO_ROUTE_RETRY_DELAY_MS` defaults to `2000` for transient empty route responses during local server startup or auth refresh
- `BOREAL_PROMPTFOO_MIN_INTERVAL_MS` defaults to `0`; set to `65000` or higher for one-request-per-minute gateway limits
- `BOREAL_CONTEXT_HEAVY_TOKEN_ESTIMATE`, `BOREAL_CONTEXT_HEAVY_MESSAGE_COUNT`, and `BOREAL_CONTEXT_HEAVY_ACTIVITY_COUNT` tune when default nano chat traffic promotes to `openai/gpt-5.4-mini`

Fixtures must stay synthetic and free of secrets, customer data, and sensitive personal data.

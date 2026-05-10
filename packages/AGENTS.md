# Packages Namespace Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\packages` unless a deeper child workspace adds a more specific file.

## Rules

- `packages/*` is for reusable code, not runnable product surfaces.
- Shared semantic contracts still come from the root canon.
- Do not redefine `Request`, `Commitment`, `Fulfillment`, `Transaction`, or `RequestEvent` semantics here.
- If a package becomes runtime-specific or user-facing, it probably belongs in `apps/*` instead.

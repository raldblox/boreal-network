# Skills Namespace Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\skills` unless a deeper child workspace adds a more specific file.

## Rules

- `skills/*` is for reusable agent behavior packages.
- Skills may not introduce conflicting domain objects, lifecycle names, or API semantics.
- Put reusable executable code in `packages/*` and keep the skill-specific layer here.

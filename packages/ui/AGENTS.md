# Boreal UI Package Guidelines

## Scope

This `AGENTS.md` applies to `C:\Users\raldb\boreal-network\packages\ui`.

## Read First

Before changing this package, read:

1. `../../README.md`
2. `../../AGENTS.md`
3. `../../docs/REPO_STRUCTURE.md`
4. `../../docs/WORKSTREAMS.md`
5. `../../docs/OWNERSHIP.md`
6. `../README.md`
7. `../AGENTS.md`
8. this file

## Allowed Here

- shared React primitives
- shared Tailwind styles and tokens
- small app-agnostic hooks or helpers required by those primitives

## Not Allowed Here

- app routing logic
- request, auth, or payment business logic
- server-only utilities
- desktop-only or web-only flow state that should live in the app workspace

## Sync Rule

If a component stops being reusable and starts depending on one app's product logic, move that logic back out into the app workspace instead of growing drift here.

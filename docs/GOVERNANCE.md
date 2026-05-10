# Governance

This file defines how Boreal Network canon changes without drifting.

## Canon Precedence

When documents disagree, the precedence order is:

1. `docs/NETWORK_THESIS.md`
2. `docs/OBJECT_TAXONOMY.md`
3. `docs/STATE_MACHINES.md`
4. `docs/EVENT_MODEL.md`
5. `docs/API_CONTRACTS.md`
6. `docs/SCHEMA_LOGICAL.md`
7. machine-readable schemas in `schemas/`
8. implementation code in downstream repos

Implementation code must not override the canon.

## Change Classes

### Class A: semantic change

Examples:

- new root object
- renamed object
- changed lifecycle state meaning
- changed event meaning
- changed payment or fulfillment boundary

Required updates:

- thesis if the category meaning changed
- taxonomy
- state machines
- event model
- logical schema
- tests
- machine-readable schemas

### Class B: contract change

Examples:

- new endpoint
- changed payload
- changed webhook
- changed event schema

Required updates:

- API contracts
- event model if async behavior changed
- machine-readable schemas
- tests

### Class C: projection or implementation change

Examples:

- new derived view
- new index
- new search strategy
- new projection cache

Required updates:

- logical schema if durable implications exist
- tests if observable behavior changes

## Decision Discipline

If a change introduces a non-trivial tradeoff, record it before or with the change.

Recommended location:

- `docs/decisions/`

Decision files should explain:

- context
- decision
- consequences

## Sync Matrix

### If you change `Request`

Update:

- thesis if the root meaning changed
- taxonomy
- state machines
- event model
- logical schema
- tests

### If you change `Supply`

Update:

- taxonomy
- logical schema
- API contracts if external surfaces changed
- tests

### If you change event names or payloads

Update:

- event model
- AsyncAPI or event schemas
- test matrix

### If you change external APIs

Update:

- API contracts
- OpenAPI
- tests

## Drift Rules

- Do not leave markdown and machine contracts out of sync.
- Do not change names in one file only.
- Do not keep legacy synonyms alive in new core work unless intentionally documented.
- Do not land code first and canon later for semantic changes.

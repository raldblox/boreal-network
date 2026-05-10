# Documentation Map

This repository follows a docs-first operating model.

The documents are organized by purpose, not by chronology.

## Canon

These files define what Boreal Network is:

1. [NETWORK_THESIS.md](NETWORK_THESIS.md)
2. [COMMERCIAL_CANON.md](COMMERCIAL_CANON.md)
3. [OBJECT_TAXONOMY.md](OBJECT_TAXONOMY.md)
4. [STATE_MACHINES.md](STATE_MACHINES.md)
5. [EVENT_MODEL.md](EVENT_MODEL.md)
6. [API_CONTRACTS.md](API_CONTRACTS.md)
7. [SCHEMA_LOGICAL.md](SCHEMA_LOGICAL.md)

## Commercial Canon

These files define what Boreal Network is as a business and what story downstream roast or pitch workflows must preserve:

- [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)
- [ICP_AND_WEDGE.md](ICP_AND_WEDGE.md)
- [WHY_NOW.md](WHY_NOW.md)
- [COMPETITIVE_MAP.md](COMPETITIVE_MAP.md)
- [BUSINESS_MODEL.md](BUSINESS_MODEL.md)
- [PITCH_FACTS.md](PITCH_FACTS.md)
- [LIVE_VS_TARGET.md](LIVE_VS_TARGET.md)

## Governance

These files define how the canon stays aligned:

- [GOVERNANCE.md](GOVERNANCE.md)
- [TEST_MATRIX.md](TEST_MATRIX.md)
- [REPO_STRUCTURE.md](REPO_STRUCTURE.md)

## Decisions

These files record accepted architecture and naming decisions that downstream workspaces must inherit:

- [decisions/README.md](decisions/README.md)

## References

This file records the main standards and pattern sources behind the canon:

- [REFERENCES.md](REFERENCES.md)

## Why This Structure

The structure intentionally separates:

- thesis and explanation
- commercial category and market truth
- live-versus-target claim boundary
- reference taxonomy
- lifecycle behavior
- event contracts
- API contracts
- logical schema
- machine-readable baseline
- verification and governance

This keeps implementation work from redefining the domain accidentally.

## Read Order

Read the canon in this order:

1. thesis
2. commercial canon
3. product positioning
4. ICP and wedge
5. why now
6. competitive map
7. business model
8. pitch facts
9. live versus target
10. taxonomy
11. state machines
12. event model
13. API contracts
14. logical schema
15. repo structure
16. governance
17. tests
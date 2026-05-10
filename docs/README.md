# Documentation Map

This repository follows a docs-first operating model.

The documents are organized by purpose, not by chronology.

## Canon

These files define what Boreal Network is:

1. [NETWORK_THESIS.md](NETWORK_THESIS.md)
2. [OBJECT_TAXONOMY.md](OBJECT_TAXONOMY.md)
3. [STATE_MACHINES.md](STATE_MACHINES.md)
4. [EVENT_MODEL.md](EVENT_MODEL.md)
5. [API_CONTRACTS.md](API_CONTRACTS.md)
6. [SCHEMA_LOGICAL.md](SCHEMA_LOGICAL.md)

## Governance

These files define how the canon stays aligned:

- [GOVERNANCE.md](GOVERNANCE.md)
- [TEST_MATRIX.md](TEST_MATRIX.md)
- [REPO_STRUCTURE.md](REPO_STRUCTURE.md)

## References

This file records the main standards and pattern sources behind the canon:

- [REFERENCES.md](REFERENCES.md)

## Why This Structure

The structure intentionally separates:

- thesis and explanation
- reference taxonomy
- lifecycle behavior
- event contracts
- API contracts
- logical schema
- verification and governance

This keeps implementation work from redefining the domain accidentally.

## Read Order

Read the canon in this order:

1. thesis
2. taxonomy
3. state machines
4. event model
5. API contracts
6. logical schema
7. repo structure
8. governance
9. tests

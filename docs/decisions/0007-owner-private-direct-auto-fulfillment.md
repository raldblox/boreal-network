# 0007 Owner Private Direct Auto Fulfillment

## Context

Boreal's canonical external and public request lane needs an explicit commercial or approval boundary before execution begins.

That boundary is `Commitment`.

But an owned and private request resolved by the same Boreal account through the connected desktop runtime is different:

- the owner already authorized execution
- no external proposer or market acceptance is required
- a visible `Commitment` object adds friction without adding product value

The first desktop auto-resolve lane needs a lower-friction path for owner-private work while preserving the stronger boundary for public or cross-actor work.

## Decision

Adopt two execution authorization paths:

1. `owned + private`
   Allow direct `Request -> Fulfillment -> Artifact` execution without creating a `Commitment`.
   This path is limited to the request owner and Boreal-approved resolver runtimes acting for that owner.

2. `public` or cross-actor
   Preserve the explicit `Request -> Commitment -> Fulfillment -> Artifact` path.
   Public responders and external supply still require proposal or acceptance before execution.

`Commitment` remains canonical.
It becomes conditional by lane, not universal by default.

`Fulfillment.commitmentId` therefore becomes optional in the canonical shape and in web implementation, but only owner-private direct execution may omit it.

## Consequences

- desktop can auto-resolve owned private requests with less friction
- request activity must still show durable fulfillment and artifact events
- public and external work keeps the stronger commercial and approval boundary
- contract tests must verify that no-commitment fulfillment is rejected outside the owner-private lane

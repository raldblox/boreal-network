# Standards Namespace

This namespace holds Boreal-specific implementation standards, protocol profiles, and compatibility rules.

Standards here must inherit root canon rather than replacing it.

## Current Standards

- [workflow-backed-supply-profile.md](workflow-backed-supply-profile.md) - implementation profile for buyable workflow-backed supplies and adapter-backed execution packs
- [workflow-pack-support-objects.md](workflow-pack-support-objects.md) - support-object shapes, relationships, and suggested storage direction
- [first-party-payment-and-credit-profile.md](first-party-payment-and-credit-profile.md) - funding-source model and first-party buyer-credit rules
- [buyer-credit-support-objects.md](buyer-credit-support-objects.md) - support-object shapes for buyer credit accounts and ledger entries
- [agent-protocol-profile.md](agent-protocol-profile.md) - MCP, A2A, and x402 adapter/payment boundaries for agent-native usage
- [request-flow-taxonomy-pipeline.md](request-flow-taxonomy-pipeline.md) - stage/card/action pipeline for human, agent, service, supply, workflow, and drag-action surfaces
- [in-house-boreal-worker-application-lane.md](in-house-boreal-worker-application-lane.md) - in-house worker scanner, application, owner auto-approval, and prompt-asset boundaries
- [n8n-adapter-profile.md](n8n-adapter-profile.md) - import, normalization, readiness, and execution rules for the `n8n` adapter
- [workflow-backed-supply-blueprint-fix-my-broken-n8n-workflow.md](workflow-backed-supply-blueprint-fix-my-broken-n8n-workflow.md) - reference workflow-backed n8n repair blueprint, not the current first shipped supply lane
- [workflow-backed-supply-mvp-implementation-sequence.md](workflow-backed-supply-mvp-implementation-sequence.md) - ordered implementation sequence from support layer to first shipped supply

# Decision Log

Use this directory for durable architecture and modeling decisions that are too important to leave implicit.

Recommended filename pattern:

- `0001-request-is-root.md`
- `0002-commitment-unifies-quote-and-proposal.md`

Each decision file should contain:

- context
- decision
- consequences

Do not use the decision log as a brainstorming dump.
Use it for accepted decisions that governed implementations must respect.

## Lifecycle Rule

Decision age does not make a decision ancient.
A decision is stale only when it contradicts newer canon, implementation truth, or a superseding decision.

Use `../DOC_LIFECYCLE.md` for state definitions.
Do not delete old accepted decisions; amend, supersede, retire, or mark their implementation state in this register.

## State Register

Last reviewed: 2026-05-29.

| Decision | State | Implementation state | Current reading | Review trigger |
| --- | --- | --- | --- | --- |
| [0001-workspace-taxonomy-and-peer-naming.md](0001-workspace-taxonomy-and-peer-naming.md) | `implemented` | Repo topology and naming rules exist. | Still governs workspace naming and peer/gateway/package distinctions. | Review before adding or renaming governed workspaces. |
| [0002-boreal-category-and-commercial-wedge.md](0002-boreal-category-and-commercial-wedge.md) | `accepted` | Reflected in commercial canon and positioning. | Still governs Boreal as request-native work commerce. | Review before changing wedge, category, or fundraising story. |
| [0003-canonical-monorepo-and-workspace-activation.md](0003-canonical-monorepo-and-workspace-activation.md) | `implemented` | Active monorepo topology exists. | Still governs root canon plus governed workspaces. | Review before repo topology changes. |
| [0004-web-stack-baseline-and-chatbot-starting-point.md](0004-web-stack-baseline-and-chatbot-starting-point.md) | `implemented` | `apps/web` uses the accepted baseline. | Still the web stack baseline unless a new decision supersedes it. | Review before web stack replacement. |
| [0005-electron-desktop-and-shared-ui-baseline.md](0005-electron-desktop-and-shared-ui-baseline.md) | `partially_implemented` | `apps/desktop` exists; richer desktop behavior remains scoped. | Still governs desktop as local execution shell, not request truth. | Review before desktop runtime expansion. |
| [0006-resolver-identity-and-device-approval-flow.md](0006-resolver-identity-and-device-approval-flow.md) | `partially_implemented` | Resolver auth contracts exist; implementation may be lane-specific. | Still separates resolver/device approval from account auth. | Review before resolver auth, runtime identity, or supply binding changes. |
| [0007-owner-private-direct-auto-fulfillment.md](0007-owner-private-direct-auto-fulfillment.md) | `partially_implemented` | Owner-private direct fulfillment lanes are allowed but bounded. | Still valid for owner-private automation; not public-market authority. | Review before widening auto-fulfillment to cross-actor work. |
| [0008-ephemeral-realtime-lane-and-peer-runtime-identity.md](0008-ephemeral-realtime-lane-and-peer-runtime-identity.md) | `partially_implemented` | Desktop and peer foundations exist; durable request truth remains separate. | Still governs ephemeral realtime as non-durable transport/runtime state. | Review before peer transport affects request history or artifact truth. |
| [0009-request-bound-execution-and-artifact-model-before-peer-runtime-activation.md](0009-request-bound-execution-and-artifact-model-before-peer-runtime-activation.md) | `accepted` | Acts as a sequencing gate. | Still blocks peer work from becoming business truth before request/artifact foundations. | Review before phase-2 peer activation or peer file/media work. |
| [0010-pear-hyperswarm-peer-foundation-shape.md](0010-pear-hyperswarm-peer-foundation-shape.md) | `partially_implemented` | `apps/peer` and `packages/network-*` exist as foundations. | Still guides peer foundation shape without making transport canon. | Review before changing peer stack or transport package boundaries. |
| [0011-desktop-trust-tiers-and-isolated-worker-mode.md](0011-desktop-trust-tiers-and-isolated-worker-mode.md) | `accepted` | Trust-tier direction is not broad public execution proof. | Still valid as safety direction; treat richer worker isolation as target unless implemented. | Review before untrusted external execution. |
| [0012-request-briefing-assist-profile.md](0012-request-briefing-assist-profile.md) | `implemented` | Request briefing assist exists as planner/intake behavior. | Still governs assist as non-canonical mutation support. | Review before changing request-intake prompt profiles. |
| [0013-embodied-fulfillment-planner-honesty-first.md](0013-embodied-fulfillment-planner-honesty-first.md) | `partially_implemented` | Embodied evals and planner rules exist; broad embodied fulfillment is not the first wedge. | Still requires planner honesty about physical presence and proof. | Review before adding embodied work lanes or proof claims. |
| [0014-request-draft-input-and-readonly-planner-projection.md](0014-request-draft-input-and-readonly-planner-projection.md) | `implemented` | Draft input and read-only planner projection rules are in canon and UI direction. | Still governs buyer-authored fields versus derived planner truth. | Review before changing draft editing or request object panels. |
| [0015-boreal-workers-web-execution-layer-and-video-generation-first.md](0015-boreal-workers-web-execution-layer-and-video-generation-first.md) | `partially_implemented` | First-party worker/service lanes exist, but worker identity is still evolving. | Still allows web execution lanes without introducing A2A as required internal architecture. | Review before worker actor, provider adapter, or execution-layer changes. |
| [0016-open-request-room-as-monitored-workroom.md](0016-open-request-room-as-monitored-workroom.md) | `implemented` | Request workroom UI follows monitored-workroom direction. | Still governs request rooms as state/proof monitors, not planner dashboards. | Review before request-room IA changes. |
| [0017-regular-account-auth-and-webauthn-mfa.md](0017-regular-account-auth-and-webauthn-mfa.md) | `partially_implemented` | Auth direction is accepted; specific MFA/recovery completeness may vary. | Still keeps account auth separate from resolver/runtime identity. | Review before auth, MFA, passkey, or recovery changes. |
| [0018-request-flow-view-as-process-projection.md](0018-request-flow-view-as-process-projection.md) | `implemented` | Flow view exists as process projection. | Still governs flow UI as secondary projection over request truth. | Review before flow canvas or Path Builder semantics change. |
| [0019-workflow-backed-supply-profile-and-adapter-boundary.md](0019-workflow-backed-supply-profile-and-adapter-boundary.md) | `accepted` | Workflow-backed supply direction is documented; adapter depth remains lane-specific. | Still keeps workflows behind `Supply`, not as buyer-facing root objects. | Review before importing workflow templates or adapter standards. |
| [0020-first-party-buyer-credit-and-request-funding-boundary.md](0020-first-party-buyer-credit-and-request-funding-boundary.md) | `partially_implemented` | Credit/payment contracts and v0 solution-run debit path exist. | Still keeps credits narrow and first-party, not a broad marketplace wallet. | Review before checkout, ledger, request-funding, refund, or payout changes. |
| [0021-mode-aware-web-ia-and-service-surfaces.md](0021-mode-aware-web-ia-and-service-surfaces.md) | `partially_implemented` | Web IA and service surfaces are evolving. | Still governs work-type modes and service surfaces as wrappers over `Supply` and `Request`. | Review before sidebar, services, supply, or homepage IA changes. |
| [0022-production-mvp-architecture-slice.md](0022-production-mvp-architecture-slice.md) | `accepted` | Guides production MVP as incremental `apps/web` slice. | Still blocks greenfield rebuild drift unless superseded. | Review before production architecture replacement. |
| [0023-request-grants-and-public-solution-surface.md](0023-request-grants-and-public-solution-surface.md) | `partially_implemented` | Public solution run v0 is modeled; richer grants and marketplace lanes remain bounded. | Still governs grants as optional funding and public solutions as projections with free inspection and paid execution. | Review before grant funding, public-solution, run pricing, payout, or public claim changes. |
| [0024-agent-protocol-gateway-topology.md](0024-agent-protocol-gateway-topology.md) | `accepted` | Gateway and package workspaces are not created yet. | Future MCP/A2A adapters should live behind an agent gateway over existing HTTP contracts, not inside web as a second truth layer. | Review before creating protocol gateway/package workspaces or live MCP/A2A adapters. |

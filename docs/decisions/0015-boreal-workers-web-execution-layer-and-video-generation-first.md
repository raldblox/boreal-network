# 0015. Boreal-workers web execution layer and video-generation-first

## Context

Boreal now has a durable `Supply` object, request routing, commitment, fulfillment, and artifact publication inside `apps/web/`.

The next product move is to add Boreal-managed first-party supplies that run in the same web system and repository instead of treating every managed execution lane as a desktop runtime or an external provider surface.

These managed supplies are multimodal. They need:

- durable Boreal `Supply` identity
- provider-backed execution
- object-backed storage for generated outputs
- artifact publication back into canonical request lanes

The earlier placeholder label `cloud worker` is too generic and downplays that these are Boreal-owned supplies with distinct execution policies.

## Decision

Use `boreal-workers` as the internal execution-layer name inside `apps/web/`.

This name is implementation-local. It does not create a new canonical root object.

The canonical outer model stays:

- `Supply` for published capability
- `Commitment` for commercial or approval boundary
- `Fulfillment` for accepted execution lane
- `Artifact` for durable output and proof

Within `apps/web/`, `boreal-workers` should mean:

- Boreal-managed provider-backed execution modules
- one typed worker definition per managed capability
- multimodal execution policies and storage policies
- artifact publication helpers that mirror transient provider outputs into app-controlled storage

The first implementation should stay inside `apps/web/lib/boreal-workers/`.

Do not create a new top-level workspace or package yet.

Why:

- the first execution surface is still the Boreal web app
- the module can evolve quickly without a premature workspace split
- shared-package extraction can happen later if desktop, peer, or another app truly needs the same runtime code

Use the existing canonical `agent_worker` supply preset for these first-party managed supplies.

Do not invent a new canonical supply kind just to express first-party ownership.

Worker metadata may specialize the supply row with internal fields such as:

- worker key
- provider reference
- multimodal execution mode
- storage policy
- auto-propose policy

These fields belong in implementation metadata and support objects, not as a new root object family.

The first worker is:

- `video-generation`

It should be modeled as:

- Boreal-owned `Supply`
- provider-backed execution
- multimodal output
- blob-mirrored durable artifact delivery

## Consequences

Positive:

- Boreal can publish first-party supplies without confusing runtime identity and supply identity
- multimodal outputs stay under Boreal-controlled storage instead of expiring on provider URLs
- worker definitions remain separate but composable inside one repo and one system
- later workers such as video-call assistant or trading research can follow the same shape

Tradeoffs:

- this still needs a later support-object layer for durable async runs, retries, and provider task tracking
- current request mutation paths are still user-actor centric, so worker actor identity is not fully first-class yet
- A2A is unnecessary inside one repo for now
- LangGraph is optional later for deeper pause or resume orchestration inside one worker, but it is not the first requirement

Follow-on direction:

- add durable support objects for Boreal-managed worker runs
- wire `Commitment.supplyId` end-to-end for managed supplies
- add worker-actor attribution for commitment proposal and fulfillment execution

# Embodied Fulfillment Research And Architecture

Status: exploratory research note

This document is not canon.
It is a research and implementation note for making Boreal's mixed human-AI thesis real when work includes physical presence, local access, field execution, or human verification.

If Boreal adopts new root semantics from this note, root canon must be updated first or in the same patch.

## 1. Problem

The current Boreal thesis says one durable `Request` should survive intake, routing, `Commitment`, `Fulfillment`, proof, and payout.
That thesis is stronger than the current implementation stack.

Today, the main gap is not the root object model.
The gap is that the planner and schema surfaces are still biased toward digitally executable work.

That bias shows up in three places:

1. request briefing is optimized for writing a good digital brief, not for identifying embodied execution requirements
2. `Request` and `Supply` have generic constraint buckets, but no typed representation for presence, geography, access, or verification capability
3. `Artifact` can carry proof, but the repo does not yet define a trustworthy proof pipeline for onsite or human-executed work

The result is a predictable failure mode:

- the planner describes only what digital tools can do
- embodied steps become optional or implicit
- the plan looks complete
- the work is not actually executable or verifiable

This note refers to that failure mode as `generative plan collapse`.

## 2. Current Repo Gap

Current repo truth already supports:

- one durable `Request`
- lead-first planning
- `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, and `RequestEvent`
- proof as a first-class concept
- runtime identity separated from Boreal actor identity
- agent-side and resolver-side execution lanes

Current repo truth does not yet model embodied fulfillment well enough to support the paper thesis:

- `apps/web/lib/ai/prompts.ts` injects geo hints into the prompt, but only as freeform context
- `schemas/json/request.schema.json` uses generic `brief.constraints` with `additionalProperties: true`
- `schemas/json/supply.schema.json` supports generic `capability` and `availability`, but not service geography, mobility, credentials, or field-proof capability
- `schemas/json/artifact.schema.json` supports `evidence`, `receipt`, and `signature`, but not a typed evidence envelope for location, device integrity, witness, or capture-chain metadata

This means the current stack can talk about proof and human work, but it cannot yet reliably route, enforce, or verify them.

## 3. Research Takeaways

### 3.1 Ground plans to feasible actions, not just language

Embodied planning research repeatedly shows that language-only planners produce infeasible action sequences unless they are grounded in environment constraints and actual executable capabilities.

Operational translation for Boreal:

- the planner must know what kinds of execution are actually possible
- the planner must know which steps require a human, a place, equipment, access, or a witness
- the planner must refuse false digital closure when those conditions are missing

### 3.2 Human tasks need first-class orchestration

Production workflow platforms treat manual work as first-class process state, not as informal notes.
That means:

- assignment
- SLA
- escalation
- approval
- audit trail
- reassignment
- completion evidence

must all be modeled explicitly.

### 3.3 Field work is not just "send a human"

Field-service systems model onsite work as:

- a work order with location
- required skills and parts
- routing and scheduling
- mobile worker state
- evidence capture
- supervisor review

Boreal does not need to become a field-service suite first, but it does need those primitives wherever embodied execution becomes part of a request.

### 3.4 Location is signal, not proof

GPS or IP alone is not proof of presence.
Useful evidence is layered:

- user identity
- device integrity
- capture time
- approximate location and accuracy
- app provenance
- media hash
- witness or owner acknowledgment when needed

### 3.5 Media provenance helps, but it is not enough

Standards like C2PA and IPTC are useful for preserving provenance and metadata.
They should be treated as supporting evidence, not as sufficient proof for high-stakes real-world fulfillment on their own.

## 4. Architecture Principles

### 4.1 Keep `Request` as the durable root

Do not introduce a second root object for embodied work.
Embodied work is a fulfillment mode, not a separate product category inside the schema.

### 4.2 Separate three concerns cleanly

1. Boreal truth
   `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, `RequestEvent`
2. Orchestration runtime
   long-running human and machine task coordination
3. Evidence and verification pipeline
   capture, validation, signing, review, and dispute handling

### 4.3 Make manual work explicit

If a step requires a human, an onsite visit, or local access, it must appear as an explicit `FulfillmentStep` or user task.
It must never remain implied in the narrative only.

### 4.4 Planner honesty before planner power

The first win is not automating local work.
The first win is preventing the planner from pretending the work is digital-only.

### 4.5 Expansion must respect the current wedge

Current canon explicitly says the first wedge is high-value digital work, not local physical services.
So embodied architecture should begin as:

- exception handling
- verification-heavy work
- private or curated supply
- narrow high-trust lanes

not as a broad local-services marketplace.

## 5. Recommended Target Architecture

Use five layers.

### Layer A: Request Intake And Embodied Signal Detection

Goal:

- detect when a request cannot be satisfied by digital execution alone

Add new read-only planner outputs:

- `ExecutionProfile`
- `EmbodiedConstraintSet`
- `VerificationPlan`

These can stay derived and rebuildable at first.
They do not need to become new durable roots.

Suggested fields for `ExecutionProfile`:

- `executionModes`: `remote_digital`, `remote_sync`, `onsite_visit`, `field_inspection`, `pickup_dropoff`, `witnessed_handoff`
- `requiresHumanPresence`: boolean
- `requiresLocalAccess`: boolean
- `requiresVerifiedEvidence`: boolean
- `requiresScheduling`: boolean
- `requiresGeography`: boolean
- `riskTier`: `low`, `moderate`, `high`

Suggested fields for `EmbodiedConstraintSet`:

- `serviceAddress`
- `locationNotes`
- `timeWindows`
- `travelRadiusLimit`
- `accessRequirements`
- `equipmentRequirements`
- `credentialRequirements`
- `safetyRequirements`
- `witnessRequirements`

Suggested fields for `VerificationPlan`:

- `requiredArtifactKinds`
- `requiredEvidenceClaims`
- `mustHaveOwnerAcceptance`
- `mustHaveSupervisorReview`
- `mustHaveDeviceAttestation`
- `mustHaveLocationSignal`
- `mustHaveSignature`

Planner behavior change:

- if embodied signals are detected and required fields are missing, policy should prefer `clarify_request` or `block_and_escalate`
- do not continue to `draft_commitment` or `create_fulfillment` on a fake digital-only path

### Layer B: Supply Capability And Local Executor Modeling

Goal:

- represent who can actually do the work

Near-term, canon-preserving approach:

- use typed keys inside existing `capability`, `availability`, `bindings`, and `metadata`

Recommended `Supply` extensions:

- `capability.executionModes`
- `capability.serviceGeographies`
- `capability.mobilityModes`
- `capability.verificationCapabilities`
- `capability.requiredTools`
- `capability.credentials`
- `availability.timeWindows`
- `availability.travelRadiusKm`
- `availability.baseLocation`
- `metadata.trustTier`
- `metadata.backgroundCheckStatus`
- `metadata.insuranceStatus`

This allows Boreal to distinguish:

- digital-only supply
- local field-capable human supply
- human-plus-agent hybrid supply
- verifier or witness supply

### Layer C: Human Task Orchestration Backbone

Goal:

- coordinate long-running mixed human and machine execution safely

This layer should not replace Boreal truth.
It should run execution while Boreal remains the business system of record.

Recommended behavior:

- one `Fulfillment` becomes one orchestration instance
- major `FulfillmentStep` nodes become orchestration tasks
- human tasks are explicit and stateful
- every assignment, reassignment, SLA breach, approval, and completion event syncs back into Boreal activity

Technology options:

1. Boreal-native custom task engine
   Pros:
   - maximum control
   - no new platform dependency
   Cons:
   - you must build assignment, escalation, forms, retries, and auditability yourself

2. Temporal as durable execution backbone
   Pros:
   - very strong reliability for long-running workflows
   - code-first model
   - clean fit for retries, signals, resumable execution
   Cons:
   - human task UX is not first-class out of the box
   - you still need to build task inboxes, forms, and approval surfaces

3. Camunda as human workflow backbone
   Pros:
   - strong human task modeling
   - forms, task lists, assignment patterns, SLA, escalation, audit, BPMN
   - especially good when manual work is central
   Cons:
   - more platform weight
   - BPMN and process design discipline become part of the system

Recommendation:

- if Boreal wants real embodied human execution soon, Camunda is the better plug because human tasks are the missing primitive
- if Boreal wants a code-first orchestration layer and plans to keep human tasks minimal at first, Temporal is the better plug
- LangGraph should stay in the agent-runtime role, not become the business workflow system of record

Pragmatic choice:

- Camunda for human task orchestration
- LangGraph for planner or agent subflows
- Boreal Request model as source of truth

### Layer D: Executor Surface

Goal:

- give human executors a real tool, not just a chat thread

Required executor features:

- assigned task list
- request and fulfillment context
- map and route
- check-in and check-out
- time window visibility
- step instructions
- evidence capture
- signature capture
- offline caching and later sync
- escalation to supervisor
- owner or witness handoff confirmation

Surface options:

1. Boreal mobile app
   Best long-term if embodied work becomes core.
2. Boreal PWA
   Faster to ship, weaker for device trust and background sensing.
3. Third-party field-service integration
   Fastest for serious onsite operations, but highest integration burden.

Important constraint:

- high-trust presence and device-verifiable evidence generally require a native mobile app or native wrapper
- plain web flows are weaker because app integrity attestation is limited

### Layer E: Evidence, Verification, And Trust

Goal:

- make completion depend on proof appropriate to the work mode

Recommended evidence bundle per embodied step:

- `requestId`
- `fulfillmentId`
- `stepId`
- `capturedBy`
- `capturedAt`
- `deviceId`
- `deviceIntegrityVerdict`
- `location`
- `locationAccuracyMeters`
- `geofenceMatch`
- `mediaHashes`
- `signatureRef`
- `witnessRef`
- `claimSet`
- `reviewStatus`

Where it should live:

- durable media or document pointer in `Artifact.container`
- structured verification metadata in `Artifact.metadata`
- summary and lifecycle in `RequestEvent`

Optional stronger model:

- issue a verifier-signed credential after evidence review
- use W3C Verifiable Credentials and Data Integrity for externally portable proof

Do not overclaim:

- VC-based proof is useful for transport and audit
- it does not replace human review, policy checks, or fraud analysis

## 6. Concrete Boreal Data Changes

This section is a proposal, not canon.

### 6.1 Near-term, low-risk path

Keep root object model unchanged.
Add typed conventions within existing extensible fields.

Use:

- `Request.brief.constraints.executionModes`
- `Request.brief.constraints.location`
- `Request.brief.constraints.timeWindows`
- `Request.brief.constraints.accessRequirements`
- `Request.brief.constraints.verificationRequirements`
- `Request.seeking.supplyKinds`
- `Request.seeking.notes`
- `Supply.capability.executionChannels`
- `Supply.metadata`
- `Artifact.metadata`

Pros:

- fastest path
- no canon-breaking migration now

Cons:

- semantics remain weaker and less enforceable
- planner and matcher logic stay more convention-dependent

### 6.2 Medium-term, stronger path

Promote typed structures into canon:

- `Request.execution`
- `Request.verification`
- `Supply.serviceArea`
- `Supply.executionModes`
- `Supply.verificationCapabilities`
- `Artifact.evidence`

Pros:

- better matching, policy, and evaluation
- less ambiguity
- more machine-verifiable

Cons:

- requires Class A or Class C canon work
- requires schema, docs, fixture, and test updates

Recommendation:

- use the near-term path first
- move to the stronger typed path only after one embodied pilot lane proves the fields are necessary

## 7. Planner And Policy Redesign

The current planner stack should add four new read-only decisions.

### 7.1 Embodied Need Detection

Determine whether the request requires:

- physical presence
- geographic routing
- field evidence
- witness or signature
- regulated or safety-sensitive handling

### 7.2 Modality Split

Split work into:

- digital sub-work
- embodied sub-work
- verification sub-work

This lets Boreal keep AI, human, and field tasks in one thread without pretending one agent does all of them.

### 7.3 Closure Gate

Before any `resolve_request` or delivery acceptance, verify:

- required embodied steps exist
- required evidence exists
- required reviewer accepted it

### 7.4 Honest Failure Mode

If the system cannot satisfy the embodied requirements, it must return:

- `show_lead_shortlist`
- `clarify_request`
- or `block_and_escalate`

It must never "complete" the request with a generated plan or summary alone.

## 8. Matching And Dispatch

Matching for embodied work needs more than semantic fit.

Required ranking dimensions:

- skill fit
- credential fit
- geographic fit
- travel time
- time-window fit
- verification capability
- trust or review tier
- equipment fit
- cost

Suggested dispatch flow:

1. semantic shortlist from Boreal matcher
2. availability filter
3. geographic and route feasibility filter
4. travel-time estimate
5. dispatch optimization
6. operator confirmation

For route optimization:

- OR-Tools is a strong first implementation for constrained routing
- Google Route Optimization API is a managed option later

## 9. Proof Stack

Use a layered proof stack.

### Layer 1: Basic audit

- actor identity
- timestamps
- task state changes

### Layer 2: Media and document evidence

- photo
- video
- PDF
- checklist
- signature

### Layer 3: Capture metadata

- device id
- app version
- location
- accuracy radius
- capture hash

### Layer 4: Integrity and provenance

- Android Play Integrity
- Apple App Attest
- media hash
- optional C2PA or IPTC metadata

### Layer 5: Reviewer or witness decision

- supervisor approval
- owner acceptance
- verifier credential

The main design rule:

- no single signal is enough
- trustworthy proof comes from the bundle

## 10. Recommended Product Sequence

### Phase 0: Honesty patch

Goal:

- stop false digital-only plans

Build:

- embodied-signal detector
- new planner warnings
- new policy branch for clarification and escalation
- new evals for embodied-step omission

This phase does not require Boreal to execute local work yet.
It just makes the planner honest.

### Phase 1: Private embodied lane

Goal:

- support owner-private or curated field execution

Build:

- typed embodied constraints inside existing request fields
- local or private field-capable supply
- explicit `FulfillmentStep` generation for human tasks
- manual evidence upload
- owner or supervisor review

This stays aligned with current wedge because it is not a public local-services market.

### Phase 2: Worker mobile and trust stack

Build:

- mobile executor app
- geofence and location capture
- device integrity tokens
- signature capture
- offline sync
- evidence bundle validation

### Phase 3: Human task orchestration backbone

Build:

- Camunda or Temporal integration
- SLAs
- escalations
- assignment patterns
- audit views

### Phase 4: Dispatch and scheduling intelligence

Build:

- route optimization
- time-window scheduling
- reassignment
- crew or team support

### Phase 5: External proof portability

Build:

- verifier-signed evidence packages
- VC-based exported proof for external consumers

## 11. What Boreal Should Build First

If the goal is to support the paper thesis without blowing up the current wedge, build this first:

1. embodied-signal detection in planner
2. explicit `ExecutionProfile` and `VerificationPlan` as derived outputs
3. new eval fixture where the correct plan must include onsite or human-executed work
4. policy that blocks false closure without required evidence
5. one private executor lane with manual evidence and review

This is the shortest path from theory to real product truth.

## 12. What To Avoid

- do not turn Boreal into a generic local-services marketplace immediately
- do not rely on chat transcript as proof of physical completion
- do not trust GPS alone as presence proof
- do not treat media provenance metadata as sufficient in high-stakes flows
- do not let agent frameworks become the source of business truth
- do not create a second durable work root for embodied tasks

## 13. Candidate Technology Stack

Recommended working stack by function:

- Boreal truth: existing `Request` / `Fulfillment` / `Artifact` model
- Agent runtime: LangGraph or equivalent for planner, matcher, and policy loops
- Human workflow orchestration: Camunda first, Temporal alternative
- Route and dispatch: OR-Tools first, managed route optimization later
- Maps and geocoding: Google Maps or equivalent
- Worker mobile: native app or native wrapper, not plain web only
- Device trust: Play Integrity and App Attest
- Media metadata: IPTC
- Content provenance: optional C2PA, but not sole trust basis
- Portable proof: optional VC Data Model + VC Data Integrity

## 14. Sources Used

Official and primary references used for this note:

- Microsoft Dynamics 365 Field Service overview and work order lifecycle
- Android Play Integrity API
- Apple App Attest documentation
- W3C Verifiable Credentials Data Model 2.0
- W3C Verifiable Credential Data Integrity 1.0
- IETF RATS Architecture
- IPTC Photo Metadata Standard
- C2PA specification and explainer
- Google OR-Tools routing and Google Route Optimization API
- LangGraph overview
- Camunda human workflow and Tasklist material
- research on grounded embodied planning and human-agentic workflow modeling

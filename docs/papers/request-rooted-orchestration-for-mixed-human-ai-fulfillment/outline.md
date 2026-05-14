# Outline

## 1. Introduction

Open with the mismatch between what current AI systems can generate and what real work actually requires.
Many systems can interpret requests, browse the web, call APIs, and draft deliverables.
Far fewer can represent the full path from ambiguous demand to verified completion when that path includes human approvals, payments, onsite work, field inspection, access constraints, or witnessed delivery.

Frame the paper around one core systems question:

- what should be the durable root object for mixed human-AI work when the request may span both digital and embodied execution

State the thesis:

- the durable root should be `Request`
- execution continuity should remain attached to that request through commitment, fulfillment, proof, and payout
- planners should not be allowed to silently erase embodied work simply because the available action surface is digitally biased

## 2. Problem

Describe three weak defaults in current systems:

1. chat-first systems
   They preserve conversation but not commercial, execution, or proof structure.
2. listing-first or marketplace-first systems
   They assume the work is already scoped and do not model ambiguous intake well.
3. task-first or tool-first agent planners
   They decompose the work according to callable tools and often omit steps that require a human, a place, access, or physical presence.

Define the failure mode:

- `generative plan collapse`

Definition:

- a planner produces a polished plan that appears complete
- the plan is biased toward digitally executable steps
- required human or embodied steps are weakened, delayed, or removed
- the resulting output is incomplete, unverifiable, or falsely closure-seeking

Examples:

- onsite inspection replaced by a generated checklist
- hardware or facility audit replaced by a summary template
- document pickup or witnessed dropoff replaced by an email draft
- field photography replaced by stock or synthetic imagery

## 3. Design Requirements

State the requirements a real work-orchestration system must satisfy:

- one durable work thread from intake to completion
- explicit commercial boundary for approval and payment
- mixed human, agent, tool, and runtime participation
- explicit support for embodied constraints such as location, access, timing, and presence
- auditable history and replay safety
- proof-bearing completion rather than generated closure
- separation between durable business truth and ephemeral execution feedback
- resistance to premature task explosion

## 4. Request-Rooted Object Model

Introduce the canonical objects and their roles:

- `Actor` as identity
- `Supply` as published capability
- `Request` as durable demand root
- `RequestParticipant` as explicit actor-to-request relation
- `Commitment` as commercial or approval boundary
- `Fulfillment` as accepted execution lane
- `FulfillmentStep` as bounded sub-work
- `Artifact` as output or proof
- `Transaction` as payment state
- `RequestEvent` as append-only ledger

Explain why `Request` is the correct root:

- it begins from demand rather than from a catalog item or isolated chat session
- it survives clarification, routing, approval, execution, and settlement
- it keeps digital work and embodied work inside one accountable thread

## 5. Invariants

Formalize the main invariants:

- one `Request` survives the lifecycle by default
- new business boundaries, not internal sub-work, justify new root requests
- worker decomposition becomes `FulfillmentStep`
- public or cross-actor work should preserve a `Commitment` gate
- current summary state stays on the root, full history stays in `RequestEvent`, `Artifact`, and `Transaction`
- embodied execution must not be treated as optional when the request semantics require it
- completion requires proof appropriate to the execution mode

## 6. Lead-First Orchestration

Describe the Boreal processing rule:

- match the lead first
- plan the work second
- decompose only when needed

Explain why this matters:

- complex work is often coherent only after the lead route is known
- early decomposition causes planner noise and generic task trees
- tool-biased planners tend to decompose into what they can call rather than what the work requires

Show how the lead-first rule improves realism for embodied work:

- the planner can first identify whether a local human or field-capable supply is required
- only then can it assign digital, review, or documentation sub-work around that lead

## 7. Embodied Work Representation

This is the main differentiating section.

Argue that real work needs explicit representation of execution modality.
At minimum, planning and fulfillment should distinguish:

- remote digital execution
- remote synchronous interaction
- onsite visit
- field inspection
- pickup or dropoff
- human review
- witnessed handoff

Additional fields or derived constraints should be able to express:

- location requirement
- travel radius or geography
- time window
- access dependency
- safety requirement
- verification requirement
- acceptable proof type

Explain that the planner should ask for missing physical constraints rather than assume away the need for them.

## 8. Durable Truth vs Ephemeral Streams

Explain why not every runtime signal should become durable truth.

Ephemeral by default:

- typing indicators
- token streams
- progress ticks
- heartbeats
- presence
- transient runtime logs
- raw tool stdout and stderr

Durable by promotion:

- fulfillment state change
- blocker summary
- delivery-ready summary
- proof-bearing artifact
- payment-relevant fact

Tie this back to embodied work:

- a generated progress stream is not proof of onsite execution
- durable `Artifact` references and `RequestEvent` transitions must carry the meaningful evidence

## 9. Boreal Network Artifact

Present Boreal Network as the artifact and implementation baseline.

Summarize the artifact stack:

- canon docs defining the object model and rules
- JSON Schemas for durable shapes
- OpenAPI contracts for request, supply, commitment, and fulfillment surfaces
- event contracts for request activity
- deterministic fixtures for end-to-end threads and eval scenarios
- an evaluation runner for extraction, routing, matching, planning, and mutation safety

Emphasize that Boreal is a prototype and research artifact here, not proof of market dominance.

## 10. Case Studies

Use at least one canonical digital-heavy scenario and one embodied or hybrid scenario.

Digital-heavy scenario:

- the support-triage automation thread already in the repo

Embodied or hybrid scenarios to add:

- onsite property inspection with digital reporting
- local inventory audit with photo evidence and reconciliation
- compliance site visit requiring timestamped and geolocated proof
- hardware installation check with human witness and follow-up documentation

For each scenario, show:

- request intake
- supply selection
- commitment boundary
- fulfillment steps
- proof artifacts
- completion rule

## 11. Evaluation Methodology

Define comparison baselines:

- chat-only agent orchestration
- task-tree-first planner
- direct-tool router
- request-rooted lead-first planner

Proposed metrics:

- lead selection Recall@k
- over-decomposition rate
- forbidden mutation rate
- fulfillment-before-approval rate
- embodied-step recall
- false-completion rate
- verification completeness
- artifact traceability
- reviewer-rated executability

Key evaluation question:

- does request-rooted orchestration reduce generative plan collapse and improve real-world executability for mixed digital and embodied work

## 12. Results Shape

Until real experiments exist, phrase this section as hypotheses and expected analyses, not claims.

Expected patterns:

- request-rooted systems preserve continuity better than chat-first systems
- lead-first planning reduces pointless microtask decomposition
- explicit embodied constraints reduce omission of required human or field work
- proof-bearing completion lowers false closure relative to purely generated summaries

## 13. Related Work

Cover adjacent areas:

- multi-agent planning and orchestration
- workflow systems and BPM
- event-sourced application design
- human-in-the-loop AI
- gig and labor marketplaces
- situated or embodied AI task planning
- verification and provenance systems

The goal is to show that Boreal's contribution is not just another planner, marketplace, or task runner, but a different durable work model.

## 14. Limitations And Ethics

State limits clearly:

- current artifact is a prototype plus contract and eval baseline
- current embodied scenarios may begin as synthetic or curated benchmarks
- real-world logistics, labor regulation, privacy, and geolocation proof have ethical and jurisdictional constraints
- verification systems themselves can create surveillance or trust asymmetries if designed poorly

## 15. Artifact And Reproducibility Package

Describe what a submission package should include:

- schemas
- fixtures
- eval runner
- sample actual outputs
- canonical scenario walkthroughs
- manuscript source
- optional demo video or replay notebook

## 16. Conclusion

Close on the central claim:

- mixed human-AI work needs a durable fulfillment thread
- embodied work makes the limits of purely generative planning obvious
- request-rooted orchestration is one way to keep real execution, proof, and accountability explicit instead of letting the planner optimize them away

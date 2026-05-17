# Request UX Notes

This file captures the desired Boreal UX from request input through planning, execution, proof, and resolution.

It exists to make product design, agent design, planner prompts, and UI implementation inherit the same product thesis:

- Boreal is for work AI cannot responsibly finish alone.
- Systems that delete the human steps, local runtime, or verification layer are incomplete even when the output looks polished.
- Boreal should feel like a completion system, not a prompt box with nicer labels.

Use this note alongside:

- [REQUEST_PROCESSING.md](REQUEST_PROCESSING.md)
- [TOOL_CALLING_CONTRACTS.md](TOOL_CALLING_CONTRACTS.md)
- [API_CONTRACTS.md](API_CONTRACTS.md)
- [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)

## 1. Core UX Reading

The UX should always make the same product belief legible:

- the user is not here to get one answer
- the user is here to get serious work carried through
- planning should help the work become real
- execution should preserve the human steps, local runtime conditions, and proof path when they matter

The product should not read like:

- generic chat
- generic workflow automation
- a no-code builder
- a task explosion machine
- a fake autonomous agent

The product should read like:

- one request
- one route
- one accountable thread
- one path to completion

Use [decisions/0016-open-request-room-as-monitored-workroom.md](decisions/0016-open-request-room-as-monitored-workroom.md) as the accepted reading for the opened request room.

## 2. Root Object Reading

The user-facing flow must stay compatible with the canonical object model:

- `Request` is the durable root
- `Supply` is the candidate or selected opposite-side capability
- `Commitment` is the approval and commercial boundary
- `Fulfillment` is the active execution lane
- `FulfillmentStep` is sub-work when decomposition is justified
- `Artifact` is delivery, proof, evidence, or output
- `Transaction` is funding, settlement, or payout state
- `RequestEvent` is durable visible activity

The UX should make this feel simple even though the model underneath is explicit.

## 3. Desired End-to-End UX

### Input

The owner should start naturally.

The first input surface should feel like:

- describe the work
- describe what done looks like
- mention constraints when known

It should not force the user to think in:

- workflow nodes
- role graphs
- long setup forms
- provider jargon

`New request` mode should stay calm and narrow.
It should feel like opening a serious work thread, not configuring software.

### Draft

Once the first real turn lands, the UX should open exactly one draft `Request`.

In draft:

- the buyer edits only buyer-owned fields
- the system derives planner-owned fields
- the distinction stays visible

Editable draft input should remain limited to:

- `visibility`
- `brief`
- `seeking`
- `budget`
- `deadline`

Derived planner state should remain read-only:

- route family
- `leadRole` interpreted as the lead capability or worker type
- `roleSlots` interpreted as capability slots or worker-type slots
- phases
- execution profile
- embodied constraints
- verification plan
- collapse risk
- clarification needs

The UX should never make buyer and planner authorship ambiguous.

### Planning

The planner should feel like a serious completion assistant.

It should answer:

- what `leadRole` should be, interpreted as the primary capability or worker type
- whether the work needs humans, agents, runtimes, tools, or a mix
- whether local access, scheduling, geography, or verification matter
- whether the ask is simple or needs phases plus extra `roleSlots`
- what must be proven before the work can be considered complete

The planner should not feel like:

- auto-generated PM theater
- fake microtask intelligence
- a rigid hidden state machine

### Open Request Room

Once the request leaves `draft`, the room should stop behaving like intake.

The room should behave like a monitored workroom.
It should render request truth and current work state, not planner-debug state.

The room should shift to:

- commitments
- execution
- artifacts
- proof
- resolution

The user should feel that the request is now live, routed, and operational.

The user should not feel like they have been dropped into an internal planner dashboard.

Default room reading should optimize for:

- what is happening now
- who owns the current work
- what is blocked
- what still needs proof
- what happens next

The room should not default to:

- four large stacked lifecycle cards
- equally weighted planner fact panels
- planner-debug copy
- route graphs as the primary view

Preferred reading:

- compact header
- compact lifecycle progress at the top
- one primary focused content area at a time
- focused tabs or an equivalent main-view switcher
- secondary context in summaries, side rails, or focused drawers
- activity and audit as a supporting view, not the main burden

The four room stages remain conceptual lifecycle labels, not immutable owner-facing copy.

### Execution

Execution should make the active lane obvious:

- who is leading
- who else is involved
- what stage the work is in
- what is blocked
- what proof is still missing

Execution feedback may be live and ephemeral, but the durable room should only promote business-meaningful outcomes.

Familiar work-software patterns should lead the default interaction model:

- tracker-style status and ownership
- execution-board style blockers and next action
- structured deliverable or proof review
- timeline-style audit when needed

Advanced route maps or node-graph views may exist, but they should remain secondary or advanced views.

### Resolution

A request should not feel complete because the model stopped typing.

A request should feel complete only when:

- the required execution happened
- the required evidence exists
- the owner or accepted lane resolves it

## 4. Worker and Execution Types The Planner Must Know

The planner and prompt system must be grounded in the kinds of workers and execution lanes that Boreal actually supports.

At minimum, prompt context should make these categories visible:

- human specialist
- agent worker
- tool or API capability
- provider capability
- desktop or local runtime
- trusted runtime lane today
- peer execution lane in target-direction flows

Current actor kinds:

- `human`
- `agent`
- `tool`
- `organization`
- `runtime`

Current supply presets and lanes:

- `human_service`
- `agent_worker`
- `digital_product`
- `desktop_runtime`
- `provider_capability`

The planner should understand that these categories are not interchangeable.

Examples:

- a `human_service` can handle onsite, judgment-heavy, handoff-heavy, or verification-heavy work
- an `agent_worker` can draft, transform, research, or automate bounded digital work
- a `desktop_runtime` can execute inside a local operator lane and may be the right answer when privacy, local files, or owner-controlled runtime matter
- a `provider_capability` may be useful for one bounded generation or API call, but it is not the same thing as end-to-end completion

Prompt systems should not assume every request is best served by the most generative worker.

## 4A. Capability-First Planning Rule

The planner should qualify the work before it implies assignment.

That means the planner should first decide:

- what kind of worker should lead
- what other `roleSlots` may be needed, interpreted as capability lanes
- whether those extra lanes are required or optional
- whether the request is still too unclear to qualify safely

It should not jump straight to:

- assigning named workers
- implying a matched supply already exists
- treating planner structure as if a marketplace match already happened

Until matching has actually been performed for this request flow, and before a real match is attached, the planner should stay closer to:

- `leadRole` as primary capability
- `roleSlots` as capability lanes
- required versus optional support lane
- bounded phases that move the request closer to completion

The planner output should structure the request so it is easier to:

- qualify
- route
- open to supply
- prefill a job-like request
- or attach a pinned worker or runtime later

For example:

- not `assign a field inspector and documentation specialist`
- better `needs onsite inspection capability plus optional documentation support`

The request should become more executable without pretending execution ownership is already decided.

## 5. Planner Prompt Context Requirements

The planner should receive enough structured context to avoid fake completion.

At minimum, planner context should include:

- raw user ask
- current draft request input
- selected visibility
- selected or pinned `preferredSupplyId` when present
- current `seeking.actorKinds`
- current `seeking.supplyKinds`
- budget and deadline context
- known local runtime availability when relevant
- whether the lane is owner-private, public, or cross-actor
- whether the work implies local access, physical presence, or verification obligations
- currently available supply candidates or supply modalities when retrieval has already happened

The planner should be told explicitly:

- do not flatten embodied or human-required work into digital-only subtasks
- do not treat provider or runtime execution as full completion when human proof still matters
- do not delete the human steps just because a faster generative path exists
- do not rewrite selected supply context into fake buyer-authored brief text

Prompt and planner outputs should support a room that feels simpler than the underlying model.
They should help the UI summarize the route, work, proof, and blockers instead of forcing the UI to expose every derived field with equal visual weight.

## 6. Human, Local, and Verification Compatibility

The UX should always preserve three kinds of reality when they matter:

### Human reality

- a human may need to inspect, decide, intervene, or approve
- a human may need to handle a handoff or final verification
- a human may be the lead even when AI contributes heavily

### Local runtime reality

- some work is best run on a local desktop runtime
- private files, local apps, local auth, or owner-controlled environment may matter
- the desktop runtime is an execution participant, not the request system of record

### Verification reality

- some work needs evidence, not just output
- some work needs signatures, photo proof, timestamps, location signal, or acceptance
- the plan should preserve those obligations from the start

The planner and UI should surface these realities early, not after the work fails.

## 7. Preselected or Chosen Supply UX

Preselected supply should follow the same core UX, but faster.

The system should still create one real request thread.
It should still preserve the same planner and approval boundaries.

What changes is the amount of search and ambiguity.

When a supply is preselected:

- the request still begins as one draft `Request`
- `routing.preferredSupplyId` carries the selected worker context
- the UI should clearly show that one worker or runtime is pinned
- the planner should bias toward that route first
- the system should still ask for clarification when execution, proof, scheduling, access, or commercial boundaries are still unsafe
- the system must not inject synthetic brief text on the buyer's behalf

When no supply is preselected:

- the planner should still qualify the needed capability through `leadRole` and `roleSlots`
- the request should still become structurally clearer
- but the UX should avoid implying that Boreal already assigned a worker

The faster lane should feel like:

- worker already chosen
- route mostly known
- now clarify the work and open the lane

It should not feel like:

- the request was skipped
- the planner was bypassed
- the selected worker automatically makes the work safe

The opened request room should still follow the same monitored-workroom model.
What changes is reduced routing noise, not a separate UX grammar.

## 8. UX Notes For Specific Surfaces

### Request input surface

- keep the compose box natural
- do not front-load too many settings
- allow rough asks
- keep advanced fields secondary

### Draft header or briefing panel

- show draft state clearly
- show whether a worker is pinned
- show whether brief assist is on
- show whether the request is ready to open or still missing critical details

### Tracker

- show the current stage clearly
- make the live stage feel operational
- keep prior stages reviewable
- surface blocked proof or missing human steps clearly

### Activity timeline

- durable events should read like meaningful state changes
- transient model chatter should stay out unless promoted

### Desktop runtime lane

- make local runtime availability visible
- make runtime trust level visible
- make it obvious when the lane is owner-private versus public or external
- do not let desktop execution imply that the local transcript became durable request truth

## 9. What Good Feels Like

The right UX should make the user think:

- this understands the actual work
- this knows AI is useful but not enough
- this keeps the missing human steps visible
- this will not pretend the work is done just because the output looks polished
- this can carry the work from ask to proof

## 10. What Bad Feels Like

The wrong UX will make Boreal feel like:

- chat with extra panels
- a node editor hiding behind chat
- AI theater with route labels
- auto-planned microtasks with no credible owner
- a local runtime demo with no completion discipline

## 11. Implementation Guardrails

Designers and coding agents should preserve these rules:

- keep intake natural
- keep the durable write explicit
- keep buyer-owned fields separate from planner-owned fields
- keep `leadRole` and `roleSlots` visible to the planner
- keep capability qualification earlier than assignment
- keep selected supply in routing, not fake brief prose
- keep embodied and verification-heavy work explicit
- keep local runtime as a real lane, not a decorative toggle
- keep completion stricter than generation
- keep the same UX logic whether supply is unselected, suggested, or preselected

## 12. One-Sentence Product Reading

Boreal should feel like the request-native system that keeps humans, runtimes, tools, proof, and execution in one accountable path until the work is actually complete.

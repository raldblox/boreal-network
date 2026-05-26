# 0018 Request flow view as process projection

## Status

Accepted

## Date

2026-05-24

## Context

Boreal now has a request flow view alongside the main monitored workroom.

That view is useful because it can make the request path legible:

- what the request is
- what plan lanes exist
- what worker or runtime lane is attached
- what delivery or proof state exists

But the current failure mode is obvious.

When the flow view reads like:

- lifecycle tracking first
- repeated planner facts
- decorative card chrome
- stacked noisy labels
- side panels or rails with little extra value
- cards that compete with each other instead of shouting the executable path

the view stops helping.

It becomes visual clutter instead of process clarity.

That is the wrong reading for Boreal.

The flow view should not be:

- a planner-debug dump
- a generic graph playground
- a decorative status tracker
- a noisy card gallery

The flow view should be a secondary process projection over the same durable request truth.

It should help the owner read:

- request
- plan
- worker
- delivery

with as little noise as possible.

This decision must stay compatible with [0016-open-request-room-as-monitored-workroom.md](0016-open-request-room-as-monitored-workroom.md).
The monitored workroom still leads the default owner-facing reading.
The flow view is a focused secondary reading, not a replacement for the whole room model.

## Decision

### 1. The request flow view is a process projection, not a lifecycle tracker

The accepted reading of the flow view is:

- `Request`
- `Plan`
- `Worker`
- `Delivery`

The graph may be built from `Request.derived`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, and `RequestEvent`, but it should present the path as one process reading rather than as a generic lifecycle tracker.

It should answer:

- what work is being attempted
- what plan lanes exist
- who or what lane is attached
- what delivery or proof state exists

### 2. Simplicity is the primary design constraint

The flow view should optimize for:

- low visual noise
- compact readable cards
- direct process language
- obvious execution path
- fast scanning

It should not optimize for:

- maximum field exposure
- repeated planner labels
- large secondary fact panels
- ornamental chrome
- decorative gradients or heavy shadows

### 3. Flat design is the accepted visual direction for this surface

The request flow view should prefer:

- flat surfaces
- restrained borders
- minimal elevation
- sparse accent color
- strong spacing hierarchy

It should avoid making cards feel like glossy widgets.

### 4. Card content should emphasize execution, not metadata exhaust

Cards should foreground the smallest set of fields that help action and understanding.

Examples:

- request card: what the ask is
- plan card: what needs to be executed
- worker card: who or what lane owns execution
- delivery card: what proof or output exists

Cards should de-emphasize or omit:

- repeated status copy
- repeated confidence copy
- repeated planner-debug labels
- secondary metadata that does not change the owner decision

### 5. Secondary context should stay secondary

If extra context exists, prefer:

- tooltips
- compact chips
- collapsible detail
- separate truth or activity views

Do not force secondary context into the main reading of every card.

### 6. The flow view remains downstream of canonical request truth

The flow view must stay a projection.

It does not create a new root object.
It does not replace `Request`.
It does not turn planner guesses into execution truth.

Pinned supply, desktop runtime readiness, active fulfillment, and delivery proof must still be represented truthfully:

- pinned supply is not active execution
- runtime readiness is not fulfillment
- fulfillment is not delivery
- delivery is not accepted closeout

## Consequences

### Accepted

- future flow UI work should optimize for `request -> plan -> worker -> delivery`
- simplification is a product requirement, not only a styling preference
- flat design is the default aesthetic direction for this surface
- request flow cards should be judged by clarity of execution path, not amount of information shown
- later preset, playbook, precedent, or novelty overlays should enter this surface only if they preserve the same low-noise reading

### Rejected

- using the flow view as a lifecycle-stage tracker first
- exposing large amounts of planner metadata directly on every card
- relying on decorative gradients, heavy shadows, or glossy card treatments
- rebuilding the request room around graph novelty before graph clarity exists
- letting the flow surface imply execution truth that the durable objects do not actually support

## Implementation Notes

This decision should guide:

- `apps/web/components/chat/request-flow-canvas.tsx`
- `apps/web/lib/request-flow.ts`
- `apps/web/components/chat/request-tracker.tsx`
- matching-lab workflow-card simplification work when that lab is used to inform request-room design

Canon and product-note surfaces that should stay aligned:

- `docs/REQUEST_UX_NOTES.md`
- `docs/REQUEST_PROCESSING.md`
- [0016-open-request-room-as-monitored-workroom.md](0016-open-request-room-as-monitored-workroom.md)

This decision does not change:

- canonical root objects
- lifecycle states
- planner ownership boundaries
- fulfillment truth model
- API contracts

It changes the accepted product reading and visual priority of the request flow view.

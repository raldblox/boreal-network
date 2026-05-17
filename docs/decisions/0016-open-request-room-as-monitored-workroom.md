# 0016 Open request room as monitored workroom

## Status

Accepted

## Date

2026-05-18

## Context

Boreal's open request room is the main surface where owners watch work move toward completion.

That surface now carries more planner-derived structure:

- lead role
- support roles
- phase plans
- verification planning
- route and readiness summaries

The current risk is not lack of information.
The risk is too much information presented in the wrong reading.

When the room looks like:

- four large stacked stage cards
- repeated fact panels
- repeated activity sections
- planner-heavy labels
- too many simultaneously visible system summaries

the request feels foreign, noisy, and anxiety-inducing.

That is the wrong reading for Boreal.

Boreal is not a workflow builder.
It is not a planner-debug dashboard.
It is not a no-code automation canvas.

The open request room should feel like a serious monitored workroom where the owner can understand:

- what is happening now
- who owns the current work
- what is blocked
- what still needs proof
- what happens next

The room renders request truth and current work state from the `Request` and its adjacent durable objects.
It is not a planner-debug surface.

This matters even more when the request has a pinned or preselected supply.
That path should feel faster and narrower, but it must still preserve the same room model and the same completion honesty.

## Decision

### 1. The open request room is a monitored workroom, not a planner-first dashboard

The default reading of an opened `Request` must optimize for:

- current status
- next action
- ownership
- blockers
- proof and delivery
- confident monitoring

It must not optimize for exposing every derived planner field at once.

### 2. Keep the canonical lifecycle, but do not force it into four always-expanded cards

The canonical four-stage reading still stands:

- ask and terms
- routing and ownership
- execution and delivery
- review and resolve

These stage names are conceptual owner-facing labels for the canonical lifecycle reading.
They are not immutable surface copy.

But that lifecycle should not be presented by default as four large stacked cards with equal visual weight.

The room should use progressive disclosure instead:

- a compact header
- a compact process bar or equivalent top-level progression model
- one primary focused content area at a time
- main tabs or an equivalent focused main-view switcher
- an optional right rail on wide screens or drawer on narrow screens for summarized secondary context

Do not combine that focused main-view model with four equally heavy always-open lifecycle cards.

### 3. Planner-derived structure is secondary to work monitoring

Planner-derived fields remain important.
They stay canonical, read-only, and system-owned.

But the room should expose them through focused views, summarized blocks, or secondary rails instead of making them the primary reading.

Examples:

- route summaries over raw planner dump
- who is doing what over lane jargon
- what still needs proof over abstract verification objects
- delivery risk over collapse-risk language

### 4. Familiar work-software patterns should lead the interaction model

The room should borrow its default interaction reading from familiar work software:

- status and ownership from project trackers
- blockers and next action from execution boards
- deliverables and proof from structured review systems
- activity and audit from timeline-style logs

Advanced route visualizations such as node graphs may exist, but only as secondary or advanced views.
They must not become the default reading of the room.

### 5. Preselected or pinned supply follows the same room model

When `routing.preferredSupplyId` or an equivalent pinned lane exists:

- the room should feel narrower and faster
- generic matching noise should reduce
- route uncertainty should reduce

But the room must still preserve the same truth:

- pinned supply is not the same as active execution
- active execution is not the same as completion
- proof, review, approval, funding, and safety gates still apply when relevant

### 6. User-facing copy should prefer business-readable work language

The default room copy should prefer language such as:

- who is doing what
- still needed
- risk to delivery
- what needs to be shown
- closeout

Canonical planner field names such as `leadRole` and `roleSlots` remain intact in the domain model and technical surfaces, but they should not dominate the default owner-facing reading.

## Consequences

### Accepted

- redesign work should optimize for work monitoring, not planner exposition
- the open room may become visually simpler while preserving the same canonical processing model
- planner state remains durable and useful without becoming the main UI burden
- preselected-supply flows can feel faster without overclaiming assignment or completion
- worker agents now have an explicit decision to inherit when redesigning request-room IA, copy, and hierarchy

### Rejected

- treating the open room as a planner-debug surface
- forcing all four lifecycle stages into equally heavy always-open cards
- using advanced route graphs as the default owner-facing room
- exposing planner-heavy jargon as the primary copy surface
- creating a separate UX model for preselected-supply requests that breaks the main request-room reading

## Implementation Notes

This decision should guide:

- request-room information architecture
- request-room copy hierarchy
- request-room component hierarchy
- planner-surface progressive disclosure
- preselected-supply request-room behavior

Canon and product-note surfaces that should stay aligned with this decision:

- `docs/REQUEST_UX_NOTES.md`
- `docs/REQUEST_PROCESSING.md`
- `apps/web/components/chat/request-tracker.tsx`
- `apps/web/components/chat/request-briefing-panel.tsx`

This decision does not change:

- canonical root objects
- lifecycle states
- API contracts
- mutation-tool boundaries

It changes the accepted product reading of the open request room.

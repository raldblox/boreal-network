# Request Workroom V2 UX Plan

State: `active`
Workstream: `root-canon`
Implementation target: `apps/web` request workroom
Change class: Class C strategy and implementation guidance

This plan is downstream of canon.
It does not introduce a new root object, lifecycle state, event, API contract, or persisted template model.

Use this before changing:

- `apps/web/components/chat/request-tracker.tsx`
- `apps/web/components/chat/request-flow-canvas.tsx`
- `apps/web/lib/request-flow.ts`
- request activity and artifact preview surfaces
- route, worker, supply, or preferred-supply selection UI

## Summary

The opened request room should feel like a buyer-facing monitored workroom.

The user came to Boreal because a request needs completion, not because they want to debug a planner.
The first screen must answer the questions a request owner has under pressure:

- what is the request
- what is happening now
- what path or plan exists
- who or what can do the work
- what is recommended versus actually selected or attached
- what is blocked
- what proof or artifact exists
- what action should happen next
- can this path become easier to reuse next time

The V2 workroom should make those answers visible before the flow canvas.
The flow canvas remains useful, but it becomes a clean process lens rather than the main detail container.

Accepted product reading:

```text
Request -> Plan -> Worker -> Delivery
```

Canonical truth remains:

- `Request` is the durable root object.
- `Plan` or `Path` is UI and process language over request-owned projections.
- `Supply` is a capability lane, not proof of assignment.
- `Commitment` is approval or commercial promise.
- `Fulfillment` is execution truth.
- `Artifact` is delivery, proof, evidence, receipt, media, file, or output.
- `RequestEvent` is durable activity.
- `Transaction` is payment or credit truth.

## Current Problem

The current workroom has too much equally weighted information.
It exposes planner, flow, route, activity, artifact, and runtime concepts in ways that can compete with each other.

The main failure modes are:

- the workroom reads like an internal planner dashboard
- the flow canvas has a side detail panel inside the same container
- status, plan, worker, proof, and action are not separated by buyer priority
- supply appears mostly as a select control instead of a searchable capability decision
- activity is ledger-like but not enough like a current-progress stepper
- artifacts are previewable, but the overall model does not yet feel like a file system
- the user cannot easily see what can be reused or personalized for repeat requests

The fix is not to add more panels.
The fix is to make the room buyer-first, then reveal depth through focused object viewing.

## Buyer-First Hierarchy

### Top Header

The header should be compact and operational.

It should show:

- request title or best available summary
- current canonical request status
- owner/viewer role when useful
- one primary next action
- secondary actions behind a menu or compact action row

It should not show:

- every planner field
- large lifecycle copy
- repeated route summaries
- raw object names unless needed for trust

### Priority Cards

The first visible workroom area should use cards that answer the buyer's real questions.

Recommended card set:

| Card | Job | Canon source |
| --- | --- | --- |
| Status | Show current state and confidence about what is happening now. | `Request.status`, `Request.latest`, active refs |
| Next action | Tell the owner what to do or what Boreal is waiting on. | policy/derived next action, fulfillment status, proof state |
| Plans | Show created paths, baseline path, selected path, and missing details. | `Request.derived`, path builder projection |
| Workers and supply | Show recommended, selected, committed, or active lanes truthfully. | `Supply`, `Commitment`, `Fulfillment`, `routing.preferredSupplyId` |

Cards should be compact.
Keep them to one row on desktop and a single horizontal strip on narrow screens.
Each card should have one dominant value, one short explanation, and one obvious click target.
Overflowing labels, values, and explanations should truncate or clamp instead of changing card height.
Activity counts belong on the Activity tab badge.
Artifact counts belong on the Artifacts tab badge.
Feasibility, risk, proof, human-work, clarification, and preview path chips should not occupy the primary monitor row in V1.
The cards are entry points into the right object viewer, not places to dump full details.

## Flow Interface

### Role

The flow is a secondary process projection.
It should show how the request is expected to move from ask to delivery.
Scrolling over the flow should scroll the workroom.
Panning should happen only from an intentional press-and-drag gesture inside the canvas.

It should answer:

- what is the request
- what plan or phase exists
- what worker, supply, runtime, or route is involved
- what delivery or proof is expected or attached

It should not become:

- a graph playground
- a task explosion UI
- a planner debug dump
- the only navigation system
- a place where selected card detail is embedded in the same container

### Orientation

Use adaptive orientation.

Desktop default:

```text
Request -> Plan -> Worker -> Delivery
```

This should be horizontal because the process is short, left-to-right, and scannable.
It should fit the visible workroom without making the whole page horizontally scroll.
The first row of nodes should share a top baseline.
Connection handles should use a fixed top offset from each card so edges remain straight even when card content or height changes.
Use curved connector lines rather than square elbow lines.
Cards should be draggable inside the workflow canvas.
Dragging from a card connector should surface the predictable next-step picker for that part of the request lifecycle:

| Drag source | Next picker should emphasize |
| --- | --- |
| Request | Path or plan |
| Path or plan | Worker, supply, service, runtime, or human lane |
| Worker or supply | Delivery or proof |
| Delivery | Artifact review, acceptance, or follow-up |

The workflow cards should stay buyer-facing and minimal:

- no icon clutter
- no debug badges
- no dense internal role labels
- one title, one short state line, one plain explanation

For the Flow tab, the area below the sticky header and tabs should behave like a fixed immersive workflow canvas.
Compact tracking should float in the top-left of that canvas so status is found before the path.
Viewport controls should live in the bottom-left of the canvas and include fit view, zoom in, and zoom out.
The canvas should resize and refit when the right object viewer opens or closes so the active workflow stays centered in the remaining width.
The canvas background should use the Boreal theme surface and subtle process texture, not a neutral grey board.
Activity and Artifacts tabs should keep the normal scrolling document behavior when content overflows.

### Canvas Controls And Accessibility

The workflow space should feel operable before it feels decorative.

Required V1 behavior:

- press-and-drag on open canvas space pans the workspace
- scroll wheel should not unexpectedly zoom or pan the workflow
- cards remain draggable for local arrangement
- connector drag opens the predictable next-step picker
- fit view recenters the whole request path after layout changes
- zoom controls are visible without depending on trackpad gestures
- selected-card state uses border, shadow, and focus treatment, not color alone
- floating status uses `aria-live` for status changes
- next-step picker is keyboard focusable and labeled

Mobile default:

```text
Request
  |
Plan
  |
Worker
  |
Delivery
```

Use a vertical stepper or stacked cards for narrow screens.
Do not require horizontal pan as the primary mobile interaction.

Long or multi-phase requests:

- use vertical lanes or a compact swimlane when there are many phases
- keep horizontal overview only when it remains readable
- collapse repeated phases into a count or group when detail would overwhelm

### Flow Card Content

Cards should be minimal.

Each card should show:

- lane label
- title
- one-line state
- one concise summary
- at most three chips

Each card should hide:

- long proof lists
- repeated confidence labels
- raw planner details
- long summaries
- complete activity history

Clicking a flow card should select an object and open the right object viewer.
The flow container should not include a persistent inspector column.

## Right Object Viewer

### Purpose

The right viewer is the focused context and action surface.
It should follow the same interaction feel as the current work object or artifact viewer, but be request-aware.

It should show the selected object:

- request
- plan/path
- worker/supply
- fulfillment or fulfillment step
- artifact
- activity event
- transaction or credit context

It should support actions only when those actions are truthful for the object state.

### Behavior

Desktop:

- uses the same shell-level object viewer pattern as the existing artifact/work object viewer
- is mounted by the chat/workroom shell as a right-side flex sibling, not rendered inside the `RequestTracker` scroll body
- may receive its selected-object content from the flow component, but the container belongs to the shell
- must not be embedded inside the flow canvas or inside a secondary inspector column within the flow container
- consumes right-side width so the main workroom narrows while the selected object remains visible
- slides or reveals with spatial continuity
- should not squeeze the flow into unreadability; reduce graph density before the main workroom becomes cramped
- default width: roughly half of the desktop shell when open
- resizable when screen width allows
- max width: wide enough for dense object detail, code-like previews, artifacts, and activity context
- min width: wide enough that the viewer never reads as a small nested inspector
- preserves the selected object when switching tabs unless the object no longer exists

Mobile:

- becomes an in-flow lower panel or full-width selected-object region
- keeps close/back obvious
- returns focus to the trigger after close

Motion:

- use transform and opacity where possible
- avoid animating width or layout-heavy properties for the reveal
- respect reduced motion
- keep transitions around 150 to 300 ms unless the shared-object animation needs slightly more

Accessibility:

- focus trap while modal on mobile
- keyboard close with Escape
- visible focus states
- icon-only actions must have labels
- selected card state must not rely on color alone

### Viewer Content Contract

Each viewer type should follow the same pattern:

```text
Object label
Primary state
Short explanation
Key facts
Available actions
Related artifacts/activity
```

Do not make every viewer type a custom dashboard.
Consistency matters more than cleverness.

## Plan And Path UX

The plan card is a proposal surface, not assignment truth.

It should show:

- baseline Boreal path
- supporting paths from human, agent, service/supply, or workflow lanes
- source of the path
- feasibility
- risk
- proof readiness
- human work requirement
- step count
- known cost or time only when grounded
- next action

Allowed language:

- `Recommended path`
- `Baseline path`
- `Supporting path`
- `Selected route`
- `Ready to run`
- `Needs proof`
- `Needs clarification`

Avoid:

- `Assigned`
- `Guaranteed`
- `Best`
- `Solved`
- `Completed`

Use `best` only when there is grounded ranking evidence and the reason is shown.

### Personalization

The user should be able to personalize the path without turning Boreal into a no-code workflow builder.

V2 should support:

- edit a step label or note where the user owns the instruction
- reorder manual path steps when it does not contradict canonical lifecycle
- pin a preferred supply or runtime
- mark a step as manual, agent, service, local runtime, or proof
- save route notes for repeat use
- reuse a prior accepted request as a starting pattern

V2 should not persist a new `Template` root without canon.
If persistence is needed before a template model exists, use request-attached artifacts or metadata that clearly remains downstream of `Request`.

Product reading:

```text
Manual now.
Reusable next time.
```

## Worker And Supply UX

Workers and supplies should be understandable as capability decisions.

The current selected or recommended supply must not look like assigned work unless commitment or fulfillment truth exists.

### Recommended State Grammar

Use these states in UI copy:

| UI state | Meaning | Durable backing |
| --- | --- | --- |
| Recommended | Boreal thinks this lane may fit. | planner/matcher projection |
| Selected route | Owner pinned a preferred lane. | `Request.routing.preferredSupplyId` |
| Proposed or invited | A commercial or participation boundary is being requested. | `Commitment` or participant event when implemented |
| Committed | Approval or commercial boundary exists. | `Commitment` |
| Active fulfillment | Work is actually running. | `Fulfillment` |
| Delivered | Output or proof has arrived. | `Artifact`, `Fulfillment.status` |
| Accepted | Owner/reviewer accepted delivery. | request resolution/event |

### Search And Selection

Expose search input instead of only a select menu.

Search should support:

- name
- headline or summary
- supply kind
- actor kind
- tags
- status
- availability
- source or runtime kind when available

V2 implementation can start with owner/private published supplies.
Public or marketplace supply search should come later if the API and public projection are ready.

The route control should make these distinctions visible:

- recommended candidates
- selected route
- currently active fulfillment lane
- unavailable or mismatched selected supply
- desktop default route

Recommended button labels:

- `Select route`
- `Pin capability`
- `Clear route`
- `Open supply`
- `Create supply`

Avoid `Assign` until the action actually creates commitment or fulfillment truth.

## Activity UX

Activity should make progress readable before audit detail.

Use two levels:

### Now Stepper

The Now stepper shows the current completion path.

It should include:

- current stage
- previous completed stage
- next expected stage
- blocker, if any
- owner or worker action, if any

Suggested stage language:

```text
Request shaped -> Route selected -> Work running -> Proof delivered -> Review closed
```

These are UI labels only.
They do not replace canonical states.

### History Timeline

The history timeline shows durable request activity.

It should include:

- event type
- actor
- object affected
- timestamp
- short summary
- linked artifact or fulfillment when present

Filters:

- All
- Decisions
- Worker
- Artifacts
- Payments
- System

Do not promote transient model chatter into durable history unless it was explicitly saved as business-meaningful request truth.

## Artifact UX

Artifacts should feel like a request file system.

Default groups:

- Inputs
- Deliverables
- Proof
- Receipts
- Revisions
- Media
- External links

Each row should show:

- name
- type
- proof or delivery status
- source actor
- updated time
- size or provider when available

Selecting a file should open the right object viewer.
The main artifact tab should stay a browser, not a cramped preview-plus-history stack.

Artifact viewer should show:

- preview when available
- summary
- proof claims
- file metadata
- source event
- related fulfillment
- review action if allowed

Missing proof should be visible as a checklist.
A request should not look complete just because a file exists.

## Reusable Request Iteration

Boreal should make repeat work easier without pretending that every request is a reusable workflow on day one.

V2 should support three levels:

| Level | Behavior | Persistence |
| --- | --- | --- |
| Repeat from request | Prefill a new request from prior brief, selected route, proof needs, and artifact expectations. | New `Request` referencing source request where already supported |
| Save route notes | Keep owner-authored notes about how to run this kind of request again. | Request-attached artifact or metadata until canon adds template support |
| Public reusable solution | Accepted public request and artifact projection can be inspected free and run with credits when live capacity is used. | Existing public solution projection rules |

Reuse should prefill:

- request brief
- done condition
- constraints
- preferred supply when still valid
- path steps
- proof checklist
- expected artifacts
- credit/run explanation when relevant

Reuse should still allow editing.
The new run or repeat request must not mutate the source request.

## Data And API Notes

Current implementation already supports important V2 pieces:

- request tracker workroom state in `request-tracker.tsx`
- request flow projection in `request-flow.ts`
- flow canvas in `request-flow-canvas.tsx`
- activity projection from request activity entries
- artifact previews in request tracker and artifact panel
- preferred supply mutation through `PATCH /api/requests/{id}`
- owner supply listing through `/api/supplies`

Likely later additions:

- search parameters for `/api/supplies`
- a request workroom view-model endpoint if client projection becomes too scattered
- object-viewer selection state in URL or local UI state
- a canon-approved reusable path support object if artifacts/metadata are insufficient

Do not add those later additions silently.
If an implementation needs new durable semantics, update canon and contracts first.

## Implementation Order

### Phase 1: Workroom Priority Cards

Refactor the monitor view so cards lead before the flow.

Acceptance:

- user sees current state and next action above the flow
- plan, worker/supply, blocker, proof, and activity are separately scannable
- each card can select/open a related viewer target

### Phase 2: Right Object Viewer

Extract a request-aware viewer shell.

Acceptance:

- flow card click opens viewer
- artifact row click opens viewer
- activity event click can open viewer
- viewer is smooth, accessible, and resizable on desktop
- mobile viewer is full-screen or sheet-like

### Phase 3: Flow Simplification

Make flow cards low-noise and move detail out.

Acceptance:

- no persistent inline inspector inside the flow container
- desktop flow remains horizontal for short paths
- mobile flow becomes vertical
- long flows avoid unreadable horizontal sprawl

### Phase 4: Worker And Supply Search

Replace select-only route controls with search-driven selection.

Acceptance:

- recommended candidates are visibly recommendations
- search is available where routing can be managed
- selected route updates `preferredSupplyId`
- active fulfillment remains visually distinct from selected route

### Phase 5: Activity And Artifacts

Upgrade supporting tabs.

Acceptance:

- Activity has Now stepper plus History timeline
- Artifacts has file-system grouping and viewer preview
- proof missing state is visible

### Phase 6: Reusable Path Iteration

Add repeat/personalization affordances.

Acceptance:

- user can start from a prior accepted request or path
- source request stays unchanged
- UI explains what will be reused and what must be reviewed again

## Implementation Guardrails

- Keep `Request` as the visual and data root.
- Keep `Plan` and `Path` as UI/process language.
- Keep recommendation, selection, commitment, fulfillment, delivery, and acceptance separate.
- Do not call a selected supply assigned.
- Do not call a generated answer proof unless it is attached as the right artifact.
- Do not hide human, local runtime, or proof obligations.
- Do not make the flow canvas the only way to understand the room.
- Do not charge or imply credit use for inspection.
- Do not introduce new durable object semantics without canon and contract updates.

## External Pattern Basis

The UX direction uses established interaction patterns, not as canon, but as design support:

- NN/g progressive disclosure: reveal detail after the user has enough context.
- NN/g visibility of system status: keep users informed about what is going on and what can be done next.
- Material layout guidance: use predictable regions and avoid slicing the screen into too many competing regions.
- Jira timeline patterns: keep search/filter available and open selected work details in a side panel.
- Atlassian issue view patterns: use right panels for contextual secondary information alongside the main work item.
- Carbon import/file patterns: use side panels or full pages when file handling needs metadata or multi-step review.

## Acceptance Criteria

The V2 workroom is successful when:

- a request owner can understand status, plan, worker/supply, blocker, proof, artifacts, and next action in under ten seconds
- the flow clarifies the process without owning all detail
- selecting a flow node opens a right object viewer
- mobile users do not need horizontal scroll to operate the workroom
- supply recommendations do not look like assignment
- selected supply uses `routing.preferredSupplyId` until deeper truth exists
- activity reads as current progress first and audit history second
- artifacts read as a file/proof system
- reusable request affordances reduce repeat setup without mutating the source request
- every major action remains traceable to `Request`, `Supply`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent`

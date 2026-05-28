# Path Builder V1 UX Plan

This strategy note is downstream of canon.
It defines the V1 request planning experience without introducing a canonical `Plan` or `Path` root.

## Goal

Make Boreal feel like a request-attached path builder:

```text
Post a Request -> compare possible paths -> select a path -> run fulfillment -> verify proof
```

The important product shift is that Boreal's generated route is the baseline path, not the only authority.
Humans, agents, services, supplies, and workflow templates can become supporting paths as the live product earns those capabilities.

## V1 Principles

- `Request` remains the durable root object.
- `Path` is UI language for a request-owned execution proposal.
- The Boreal baseline path comes from existing `Request.derived` fields.
- Supporting paths are visible as slots or grounded candidates, not faked live marketplaces.
- Selection means intended execution, not assignment, fulfillment, proof, or completion.
- Completion still requires accepted fulfillment and proof-bearing artifacts when required.

## Primary Surfaces

| Surface | Job |
| --- | --- |
| Brief | Show the ask, known facts, constraints, and missing inputs. |
| Path Builder | Show the baseline path, supporting path slots, qualitative signals, and open/run actions. |
| Workroom | Show active fulfillment, worker/service state, steps, messages, and status. |
| Proof | Show artifacts, receipts, files, photos, media, delivery evidence, and verification. |
| Activity | Show append-only request history and state changes. |

For V1, evolve existing request components:

- `apps/web/components/chat/request-plan-panel.tsx` becomes the draft/open Path Builder surface.
- `apps/web/components/chat/request-tracker.tsx` remains the monitored workroom after execution begins.
- `apps/web/lib/request-flow.ts` remains a process lens, not the whole UI.

## Path Builder Content

Each visible path card should communicate:

- title
- source: Boreal baseline, human, agent, service/supply, or workflow
- one-sentence completion summary
- major step count
- human-work requirement
- feasibility
- risk
- proof readiness
- grounded cost or time only when known
- next action

Avoid fake ranking.
Do not label a path as best unless Boreal can explain why with grounded data.

## Signals

Use qualitative labels only:

| Signal | Values |
| --- | --- |
| Feasibility | Good, unclear, weak, blocked |
| Risk | Low, moderate, high, unknown |
| Proof readiness | Ready, partial, missing |
| Human work | None, remote, onsite, mixed |
| Clarification | Needed, optional, not needed |

Signals should derive from existing planning truth:

- `Request.derived.readiness`
- `Request.derived.clarificationNeeded`
- `Request.derived.missingDetails`
- `Request.derived.executionProfile`
- `Request.derived.embodiedConstraintSet`
- `Request.derived.verificationPlan`
- `Request.derived.planCollapseRisk`

## Supporting Path Slots

V1 should show room for more than one path without pretending deferred workflows are live.

| Slot | V1 behavior |
| --- | --- |
| Human path | Preview/add affordance only unless a human submission flow exists. |
| Agent path | Preview/ask affordance only unless an attached agent flow exists. |
| Service or supply path | Show grounded candidates or pinned supply when available. |
| Workflow path | Future-compatible slot only. |

If a plan-like submission becomes durable later, start with `Artifact(kind: "plan")` attached to the `Request`.
If it becomes a quote or commercial promise, model it through `Commitment`.
If it runs, model it through `Fulfillment` and `FulfillmentStep`.
If selection or rejection must be audited, record it through `RequestEvent`.

## Acceptance Criteria

- Empty drafts do not show confident fake paths.
- Weak drafts show uncertainty and concrete missing inputs.
- Ready drafts show a baseline path that can open the request.
- Open requests still distinguish proposal, execution, proof, and completion.
- Human, local-runtime, and proof-heavy work remain visible.
- Supporting paths appear as options or slots without implying assignment.
- Mobile does not require a graph-only layout.
- Existing request draft, tracker, and flow surfaces still render.

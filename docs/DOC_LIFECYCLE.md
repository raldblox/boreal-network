# Documentation Lifecycle

This file defines how Boreal keeps strategy notes and decision logs useful after the repo evolves.

The goal is not to erase old thinking.
The goal is to make every durable note readable as current, parked, superseded, or historical.

## Scope

This lifecycle applies to:

- `docs/decisions/`
- `docs/strategy/`
- long-running plans under `docs/`
- navigation files that point agents at those materials

It does not replace domain canon.
When lifecycle notes conflict with root canon, the canon files listed in `docs/GOVERNANCE.md` win.

## Decision Log States

Use decision logs for accepted architecture, naming, product-model, or commercial-model choices.
Do not use them as brainstorming notes.

Decision states:

| State | Meaning | Allowed action |
| --- | --- | --- |
| `accepted` | The decision is accepted and still governs future work. | Keep using it. Review when adjacent canon changes. |
| `implemented` | The decision has landed in docs, schemas, code, tests, or workspace topology. | Keep it as historical authority. Do not delete it. |
| `partially_implemented` | Some parts landed, but target or gated parts remain. | Keep the gaps explicit in the register. |
| `amended` | A later decision changed part of the decision while preserving the original record. | Link the newer decision and keep both. |
| `superseded` | A later decision replaces this decision for new work. | Keep it for history, but do not use it as current guidance. |
| `retired` | The decision describes a direction that is no longer active or intended. | Keep it only if it explains why the direction ended. |

Decision files are append-only by default.
If a decision changes meaning, prefer one of these:

- create a new decision that supersedes or amends the old one
- add a short `Review state` note that points to the newer source of truth
- update `docs/decisions/README.md` so agents see the current state before reading the old file

Do not silently rewrite an old decision so it looks like it always meant the newer thing.

## Strategy Doc States

Use strategy docs for market shaping, packaging, launch planning, messaging, product-quality bars, and worker instructions that are downstream of canon.

Strategy states:

| State | Meaning | Allowed action |
| --- | --- | --- |
| `active` | Current guidance for product, UX, copy, or GTM work. | Keep updated as implementation and canon evolve. |
| `pilot_active` | Current guidance for a narrow pilot or gate. | Update frequently; do not use it for broad launch claims. |
| `reference` | Useful background or quality bar, but not a live queue. | Review on cadence or before major claims. |
| `parked` | Valid direction, but not a current work lane. | Do not let agents implement from it without reactivation. |
| `superseded` | Replaced by newer strategy or canon. | Link the replacement and stop using it as live guidance. |
| `archived` | Kept for history only. | Do not use for planning without a new decision or strategy update. |

Strategy docs may be revised in place when they are tactical plans or working notes.
When a strategy doc implies a semantic, lifecycle, event, API, business-model, or claim-boundary change, update canon first or in the same patch.

## Required Metadata

Each strategy and decision register row should expose:

- current state
- last reviewed date
- implementation state or evidence level
- current reading
- next review trigger

Individual files may also include metadata blocks, but the register is the minimum required surface because agents read README files first.

Use ISO dates: `YYYY-MM-DD`.
Use concrete review triggers instead of vague reminders.

## Review Cadence

Minimum review cadence:

| Doc type | Cadence | Trigger |
| --- | --- | --- |
| Commercial and market evidence | Monthly while fundraising, launching, or changing wedge. | New public claims, investor material, pricing, or ICP change. |
| Active launch plans | Every implementation patch that completes or changes a gate item. | Build, contract, API, auth, payment, or public-surface changes. |
| Active UX and copy briefs | Before homepage, request-room, service, supply, or public-solution UI changes. | New UI worker instructions or shipped UX changes. |
| Decision logs | When adjacent canon, schemas, workspace topology, or implementation behavior changes. | New decision, superseding decision, or implementation landing. |
| Reference checklists | Quarterly or before using them as launch proof. | Pilot, launch, or public claim review. |

## Ancient Or Stale Content Rule

Age alone does not make a document stale.

A document is stale when:

- it contradicts `docs/LIVE_VS_TARGET.md`
- it points agents at a non-existent or replaced surface
- it marks unfinished target work as live
- it omits a newer state-changing decision
- it contains unchecked tactical assumptions after the implementation changed
- it cites market evidence as current without a recent review

A document is ancient when:

- no active work should inherit from it
- it is superseded or retired
- it is kept only to explain prior reasoning

Ancient docs must be marked `archived`, `retired`, or `superseded`.
Do not leave ancient docs in active read paths.

## Audit Rules

The docs audit must check:

- no unresolved merge-conflict markers exist in docs
- every decision file is listed in `docs/decisions/README.md`
- every strategy file is listed in `docs/strategy/README.md`
- decision and strategy README files contain state registers
- active launch and pilot docs stay discoverable from `docs/README.md` and `docs/INDEX.md`

The audit does not decide product truth.
It only catches discoverability and lifecycle hygiene drift.

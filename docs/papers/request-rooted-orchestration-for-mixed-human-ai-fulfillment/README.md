# Request-Rooted Orchestration for Mixed Human-AI Fulfillment

Status: early draft

This manuscript explores Boreal's request-rooted orchestration model as a research contribution rather than a product pitch.

Current emphasis:

- one durable `Request` across intake, routing, `Commitment`, `Fulfillment`, proof, and payout
- lead-first orchestration for ambiguous work
- embodied-work gaps where AI planners omit physical presence, field execution, or human verification steps
- separation of durable business truth from ephemeral runtime signals

Repo-truth sources:

- `docs/NETWORK_THESIS.md`
- `docs/COMMERCIAL_CANON.md`
- `docs/LIVE_VS_TARGET.md`
- `docs/OBJECT_TAXONOMY.md`
- `docs/EVENT_MODEL.md`
- `docs/REQUEST_PROCESSING.md`
- `docs/SCHEMA_LOGICAL.md`
- `fixtures/request/golden-external-ai-automation-thread.json`
- `fixtures/request/eval-complex-human-planning-and-match.json`
- `tests/contracts/run-request-processing-evals.mjs`

Working files:

- `abstract.md` - short-form abstract draft
- `outline.md` - comprehensive paper structure and section notes
- `architecture-research.md` - deep research note on embodied fulfillment and how Boreal could make the thesis operational
- `phase-0-implementation-spec.md` - exact first implementation slice for prompt, planner, policy, and eval upgrades
- `paper.tex` - working two-column LaTeX draft using `IEEEtran` as a temporary layout scaffold
- `references.bib` - initial bibliography stub
- `notes.md` - benchmark and artifact-package notes

This folder should stay aligned with canon.
If the paper needs new semantics, update root docs first.

# Fixture Layout

This directory holds deterministic canonical examples.

Use fixtures here to prove that the canon can be read end to end without guessing missing objects, IDs, or lifecycle steps.

## Current Golden Fixtures

- `request/golden-external-ai-automation-thread.json`
- `request/eval-complex-human-planning-and-match.json`

Request-processing eval fixtures now also carry:

- one runnable `requestPatch`
- full `candidateSupplies` snapshots shaped like real `Supply` drafts

## Current Sample Actual Outputs

- `request/eval-complex-human-planning-and-match.actual.sample.json`
- `request/benchmark-actuals/web-live/*.json`

These fixtures are the current cross-object anchors for:

- `Request`
- `Supply`
- `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`
- `RequestEvent`
- planner and matcher eval baselines

These fixtures should stay stable enough for downstream contract tests, documentation examples, contextless-agent orientation, and deterministic offline evals.

Do not churn IDs, statuses, or event names casually once tests start keying off them.

# Fixture Layout

This directory holds deterministic canonical examples.

Use fixtures here to prove that the canon can be read end to end without guessing missing objects, IDs, or lifecycle steps.

## Current Golden Fixture

- `request/golden-external-ai-automation-thread.json`

This fixture is the current cross-object anchor for:

- `Request`
- `Supply`
- `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`
- `RequestEvent`

It should stay stable enough for downstream contract tests, documentation examples, and contextless-agent orientation.

Do not churn IDs, statuses, or event names casually once tests start keying off them.
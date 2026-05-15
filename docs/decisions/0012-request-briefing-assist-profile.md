# 0012 Request Briefing Assist Profile

## Context

`apps/web` now has an explicit request-mode intake surface where short one-shot asks often need better structure before future workers, tools, or resolver lanes can act on them well.

That creates a tradeoff:

- stronger request drafting from terse input
- versus accidental drift into a second hidden mutation path or fact invention

## Decision

Allow an optional request-briefing assist profile inside the request-mode prompt layer.

Guardrails:

1. the assist profile is read-only and ephemeral
2. it may improve grammar, structure, and buyer-style framing for terse asks
3. it must preserve explicit facts and leave missing facts missing
4. it must not create canonical objects directly
5. explicit request mode before the first durable draft should still end in exactly one `create_request_brief` mutation
6. draft and open request behavior must still respect the canonical split between draft-input mutation and open-room durable activity writes

## Consequences

- Boreal can improve request-body quality for short prompts without adding a second model call by default
- request-mode UX may expose a toggle for this assist profile
- evaluation and test coverage must continue to check that the profile does not invent budget, deadline, deliverables, actor requirements, or other missing request facts
- future work may compare prompt profiles offline, but the live assist layer must stay outside canonical mutation logic
- this decision does not canonize planner-visible role slots, phase plans, or execution-proof planning on the request root by itself

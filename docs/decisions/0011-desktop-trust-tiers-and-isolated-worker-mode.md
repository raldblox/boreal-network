# 0011. Desktop trust tiers and isolated worker mode

## Context

`apps/desktop` can drive a local Codex runtime from Boreal Desktop.

That is useful for:

- local private work
- owner-private request fulfillment
- responder work on public or external requests

But those lanes do not share the same trust boundary.

Public or external requests are untrusted input.
They must not inherit the same host access posture as owner-approved local work.

Desktop also stays an execution participant, not a second system of record.
So request truth remains in Boreal web while desktop-local transcripts stay local unless explicitly promoted.

## Decision

Use two desktop trust tiers for request-bound execution:

1. `owned-private`
   - selected from the owner's private request lane
   - may use `Safe`
   - may use owner-approved `Full`

2. `external`
   - any `public` request
   - any non-owner or otherwise untrusted tracked request lane
   - must not use `Full`

For `external` tracked request lanes:

- block `Full` runtime
- block `danger-full-access`
- force network off
- ignore extra writable roots
- run the turn from a dedicated request workspace under `.boreal-work`, not the app repo root

That dedicated request workspace is a narrowed local boundary, not full host isolation.

## Isolated Worker Mode

The long-term secure execution target for untrusted requests is `isolated worker mode`.

That mode should:

- run untrusted request work in a disposable worker environment
- use one dedicated per-request workspace under `.boreal-work`
- avoid mounting the host home directory or unrelated repos
- avoid reusing local desktop chat history across untrusted requests
- return only selected artifacts, summaries, and durable request mutations back to the main desktop app
- destroy the worker environment after completion or timeout

Preferred host boundary, in order:

1. dedicated OS or VM boundary
2. Windows Sandbox or equivalent disposable environment
3. stricter sidecar runtime with minimal mounts and no host-home access

## Privacy Rules

- desktop-local transcript remains local by default
- raw Codex chat history must not become Boreal request truth by default
- raw tool stdout or stderr must stay ephemeral unless promoted
- external request lanes should minimize retained local traces and should not broaden sharing implicitly

## Consequences

Immediate:

- Boreal Desktop can still serve as a private operator runtime
- Boreal Desktop can still serve as a public resolver surface
- public or external request lanes lose `Full` access

Not yet solved:

- full OS-grade isolation for untrusted requests
- encrypted at-rest storage for all retained external-request traces
- disposable worker packaging and artifact-only egress flow

Those remain follow-on work after the trust-tier boundary is enforced.

# Frontend And Hero Copy Agent Brief

This brief guides frontend and hero-copy workers after the request-grant and public-solution canon update.

It is downstream of canon.
It must not redefine `Request`, `Artifact`, `Commitment`, `Transaction`, or `RequestEvent`.
It inherits [../BRAND_VOICE.md](../BRAND_VOICE.md).

## Read First

Before changing UI or landing-page copy, read:

1. [../COMMERCIAL_CANON.md](../COMMERCIAL_CANON.md)
2. [../LIVE_VS_TARGET.md](../LIVE_VS_TARGET.md)
3. [../BRAND_VOICE.md](../BRAND_VOICE.md)
4. [../REQUEST_PROCESSING.md](../REQUEST_PROCESSING.md)
5. [../SCHEMA_LOGICAL.md](../SCHEMA_LOGICAL.md)
6. [../decisions/0023-request-grants-and-public-solution-surface.md](../decisions/0023-request-grants-and-public-solution-surface.md)
7. [REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md](REQUEST_BOARD_AND_WORKROOM_REVAMP_BLUEPRINT.md)

## Core Rule

Keep the product request-rooted.

The frontend may show:

- request grant
- fund this request
- sponsor this request
- public solution
- solution surface
- free to inspect
- run with credits
- credits pay for inference
- fork this solution into a new request

But implementation truth must stay:

- `Request` is the durable root
- `RequestParticipant` carries requester, solver, reviewer, funder, watcher, and audience-like roles
- `Commitment` carries award, approval, release, and review terms
- `Transaction` carries grant funding, refunds, solver payouts, reviewer fees, solution-run credit debits, and settlement
- public inspection creates no credit debit by default
- running a solution consumes credits only when inference or execution capacity is used
- `Artifact` carries accepted outputs and proof
- `RequestEvent` carries the history

## Frontend Agent Instructions

### Use Request-First IA

Every request-grant and solution surface should visually point back to the source request.

Good UI labels:

- `Request`
- `Grant pool`
- `Funders`
- `Solver`
- `Reviewer`
- `Accepted artifact`
- `Public solution`
- `Free to inspect`
- `Run with credits`
- `Inference credits`
- `Fork as request`

Avoid UI labels that imply a new root:

- `Investments`
- `Assets`
- `Grant object`
- `Bounty object`
- `Solution object`
- `Yield pool`

### Show One Lifecycle

Use one visible flow:

```text
Request opened
-> grant funding optional
-> solver selected or work submitted
-> artifact delivered
-> review or owner acceptance
-> solver grant paid
-> public solution published
-> later users inspect for free
-> later users run with credits when inference or execution is used
-> custom reuse forks into a new request
```

Do not split this into separate product flows unless the user is starting a new custom follow-up request.

### State Copy

Use these status messages:

- `Looking for funders`
- `Grant pool open`
- `Ready for solver proposals`
- `Work in progress`
- `Delivered for review`
- `Accepted artifact`
- `Solution published`
- `Free to inspect`
- `Credits required to run`
- `Running inference`
- `Forked into a new request`

Avoid:

- `Investors earning`
- `Revenue share pending`
- `Yield available`
- `Tax-deductible donation`
- `Solution minted`

### CTA Copy

Use:

- `Fund this request`
- `Add a request grant`
- `Sponsor this request`
- `Help make this solution public`
- `Submit work`
- `Review artifact`
- `Accept artifact`
- `View public solution`
- `Run with credits`
- `Use credits for inference`
- `Fork into new request`

Avoid:

- `Invest now`
- `Earn from this request`
- `Buy yield`
- `Claim dividends`
- `Donate for tax deduction`

### Trust And Proof Requirements

A public solution card should not appear as solved unless it can point to:

- completed or accepted request state
- accepted artifact
- accepted fulfillment or review path
- relevant transaction and payout state when payment was involved
- visible proof or evidence artifact when the request requires proof

If the app does not yet implement those records, mark the surface as target, preview, waitlist, or disabled.
Do not imply live support from canon alone.

### Inspect Versus Run

Use this product split:

```text
Public solutions are free to inspect.
Running them consumes credits.
Credits pay for inference or execution.
Customizing them starts a new request.
```

Inspecting includes reading public plan, proof, explanation, accepted artifacts, and safe request history.
Do not debit credits for inspection by default.

Running includes inference, provider calls, workflow execution, media generation, human review, or service capacity.
When a run is paid, show the source solution and the run request separately.

## Hero Copy Agent Instructions

### Primary Narrative

Boreal is not a generic board, marketplace, or chat app.

The sharper story is:

```text
People bring real requests.
Others can fund them.
Solvers do the work.
Reviewers verify the result.
Accepted artifacts become reusable public solutions.
The same Request remains the truth thread.
Anyone can inspect the public solution.
Credits are spent only when Boreal runs it again.
```

The simplest public story is:

```text
Boreal turns requests into completed work.
Post a request, compare plans, run or fund the work, verify artifacts, and reuse accepted solutions.
```

When an analogy helps, use:

```text
Boreal is air traffic control for work.
The Request is the flight, the plan is the route, artifacts prove arrival, and review gives landing clearance.
```

Do not make the analogy a schema or navigation model.

### Hero Options

Use these when the homepage is a live board or product-shell front door:

- `Boreal turns requests into completed work.`
- `What do you need done?`
- `Post the request. Track the work. Prove the result.`
- `A live work board for humans and AI.`

Use these when the page is about public request grants:

- `Fund the request. Publish the solution.`
- `Free to inspect. Paid to run.`
- `Help solve real requests, then make the accepted work reusable.`
- `Turn public demand into funded work and reusable solutions.`
- `A request board where funding, proof, and accepted answers stay connected.`

Use these when the page is still buyer-pilot focused:

- `One thread from request to done.`
- `Bring the messy ask. Keep the whole job on one track.`
- `For work AI cannot responsibly finish alone.`

### Subheadline Options

Use:

- `Boreal keeps request funding, solver work, review, proof, and payout attached to one durable thread.`
- `Funders help make a request worth solving. Solvers get paid for accepted work. Everyone can reuse the accepted artifact when the request becomes public.`
- `Public solutions are free to inspect. Running one consumes credits when Boreal spends inference, workflow, or review capacity.`
- `Unlike a post, bounty, or chat answer, a Boreal solution points back to the request, participants, proof, and acceptance trail that produced it.`

Avoid:

- `Invest in requests and earn from future unlocks.`
- `A yield marketplace for knowledge.`
- `Tax-deductible donations for every problem.`
- `Every completed request generates passive income for funders.`
- `Pay to reveal the public solution.`

## Page Module Guidance

### Public Request Card

Show:

- title and brief
- age or status line such as `Looking for answers for 6 days`
- grant pool amount when implemented
- participant counts by role
- proof requirements
- current next action

### Grant Panel

Show:

- `Add a request grant`
- amount
- what happens if unsolved
- what happens if accepted
- whether the solution becomes public
- no promise of financial return

### Solution Surface

Show:

- source request link
- accepted artifact summary
- reviewer or requester acceptance
- proof artifacts
- solver attribution
- funder attribution when allowed
- `Free to inspect`
- `Run with credits` when inference or execution exists
- `Fork into new request`

Do not show a solution as independent from its source request.
Do not charge credits to inspect a public solution by default.

### Run Panel

Show:

- source solution
- expected credit cost or estimate
- what uses inference
- what uses provider APIs or workflow execution
- whether human review is included
- run request id after start
- resulting artifact destination

Do not hide a credit debit behind a vague `unlock`.
Say what is being run and what capacity credits pay for.

## Live-Vs-Target Rule

Copy and UI must respect [../LIVE_VS_TARGET.md](../LIVE_VS_TARGET.md).

Safe current canon wording:

- `Canon allows optional request grants.`
- `Canon models public solution surfaces as projections over completed requests and accepted artifacts.`
- `Canon separates free public solution inspection from paid runs that consume credits for inference or execution.`

Unsafe unless implemented and verified:

- `Request grants are live for all users.`
- `Public solution marketplace is fully launched.`
- `Funders earn revenue from future solution unlocks.`
- `Request grants are tax-deductible donations.`
- `Inspecting a public solution consumes credits.`
- `All public solutions already support metered inference runs.`

## Final Checklist

Before shipping frontend or hero-copy changes, verify:

- the page still says or implies `Request` is the root
- `Solution` appears only as public UI language over accepted artifacts
- grant funding is optional
- solver payment is tied to accepted work
- reviewer payment is tied to explicit review work
- funders do not receive promised passive cash upside
- no tax-deductible donation claim appears by default
- any public solution claim is gated by accepted artifact and request closure truth
- public inspection is free by default
- paid runs clearly say credits buy inference or execution capacity
- paid runs create or point to a run request instead of mutating the completed source request

# 0023 Request grants and public solution surface

## Status

Accepted

## Date

2026-05-27

## Context

Boreal needs to support requests that are funded by more than one actor and requests whose accepted output becomes useful to later readers.

The product pressure is:

- a requester opens a problem or work request
- funders may contribute optional money so the request is more likely to be solved
- solvers compete or collaborate to produce accepted work
- reviewers or the requester verify the result
- the accepted artifact may become a public solution surface
- later users may inspect, run, fork, or reference that solution

The modeling risk is that this can easily drift into new roots such as `Solution`, `Grant`, `Bounty`, `Post`, `Issue`, or `Investment`.

That would weaken the accepted Boreal model where one durable `Request` carries demand, routing, commitment, funding, fulfillment, proof, payment, payout, and closure.

## Decision

### 1. `Request` remains the root

The durable root object remains:

- `Request`

Requester, solver, reviewer, funder, and later audience are participant roles or projections around the same request.

They do not create separate canonical flows.

### 2. Request grants are optional request funding

Use the product phrase:

- request grant

Accepted UI language includes:

- fund this request
- sponsor this request
- add a request grant
- contribute to the solution pool
- help make this solution public

Request grants are optional funding attached to one request.

They are not a new canonical aggregate root.

The canonical objects remain:

- `Commitment` for award, approval, eligibility, and release rules
- `Transaction` for grant funding, settlement, refund, and solver payout truth
- `RequestEvent` for durable grant-related activity

### 3. Request grants are not passive profit-sharing

Funders must not be promised automatic cash upside from later runs, reads, or revenue.

First model funder benefits should stay non-investment-like:

- public access to the accepted solution
- early access
- attribution
- voting or prioritization weight
- credits where policy allows
- discounts or notification rights

Solver and reviewer compensation may exist because they perform accepted work or accepted review.

Passive funder cash revenue share is rejected for the first model.

### 4. Do not claim tax-deductible donation status

Do not call request grants tax-deductible donations unless the receiving entity and payment flow qualify under the relevant jurisdiction.

Default product language should use:

- grant
- sponsor
- contribution
- funding

not:

- investment
- yield
- dividend
- passive revenue share
- tax-deductible donation

### 5. Accepted work may project as a public solution

`Solution` or `Solution Capsule` may be used as public UI language.

It is not a canonical root object.

The durable truth remains:

- one completed `Request`
- one or more accepted `Artifact` records
- accepted `Fulfillment` or review truth
- related `Transaction` records
- replayable `RequestEvent` history

The public solution surface is a derived projection over that truth.

### 6. Public inspection is free, execution consumes credits

Public solution inspection should be free by default.

Inspecting a public solution means reading or viewing:

- the accepted plan
- explanation
- proof
- public artifacts
- reusable workflow shape
- request history that is safe to expose

Inspection should not consume credits by itself.

Running the solution is different.

Running means Boreal is spending live capacity or producing a new outcome through:

- model inference
- provider API calls
- workflow execution
- storage or media generation
- human review
- embodied or service capacity

When a solution run consumes those resources, it should consume first-party credits or another approved payment source and create request-attached `Transaction` truth.

Default product language:

- public solutions are free to inspect
- running them consumes credits
- inference is one of the main things credits buy
- customizing or privately applying a solution starts a new `Request`

The source public solution should not be mutated into the reuser's private work thread.
The paid run or fork should create a new `Request` or explicitly accepted execution lane that references the source accepted artifact.

### 7. Review is a phase, role, and event history

Review does not become a separate root object.

Review may be represented through:

- a `RequestParticipant` role
- a `FulfillmentStep`
- artifact metadata
- fulfillment acceptance
- request events
- fixed reviewer compensation through `Commitment` and `Transaction` when needed

### 8. Forks and custom follow-ups create new requests

If a later user wants a custom adaptation, deeper answer, private implementation, or separate paid follow-up, Boreal should create a new `Request` that references the original accepted artifact.

The original public solution remains a projection over the completed source request.

## Consequences

### Accepted

- Boreal can support optional pooled funding without changing the root object model.
- Solvers can receive grant or bounty-like payouts after accepted work.
- Reviewers can be compensated for explicit review work without creating a review root.
- Public solution pages can exist without replacing request truth.
- Later paid run or fork flows can be modeled as request-attached transactions on a new referenced request.

### Rejected

- `Solution` as a new canonical root object in this pass.
- `Grant` or `Bounty` as a new canonical root object in this pass.
- passive funder profit-sharing as the default model.
- investment, yield, dividend, or tax-deductible donation language in default product copy.
- closing a request as solved before accepted artifacts and required review or proof exist.
- charging credits merely to inspect a public solution.

### Tradeoffs

- The public product can say `solution`, but implementation and canon must still point back to `Request` and `Artifact`.
- Funders get weaker direct financial upside in the first model, but Boreal avoids a higher-risk investment framing.
- Detailed grant-pool splitting, refund policy, run pricing, inference metering, and contributor royalties still need later schema and policy design before broad launch.

## Implementation Notes

Initial implementation should prefer:

- `RequestParticipant.role` values for requester, solver, reviewer, funder, watcher, and audience-like participation
- `Commitment.terms` and metadata for grant award and release rules
- request-attached `Transaction` records for funding and payout truth
- accepted `Artifact` records as the source of public solution projections
- `RequestEvent` history for grant funding, artifact submission, review, acceptance, publication, and payout activity
- new run or fork requests for paid reuse that consumes inference, provider APIs, workflow execution, human review, or other live capacity

Do not add a new root object until a later decision proves that existing canonical objects cannot safely carry the behavior.

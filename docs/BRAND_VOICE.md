# Brand Voice

This file defines Boreal's official public voice.

It is downstream of canon and must not redefine `Request`, `Supply`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent`.

Use it for homepage copy, product surfaces, investor applications, demos, social posts, and agent-worker briefs.

## Core Voice

Boreal should sound like a live system for getting work done.

The voice is:

- direct
- practical
- operational
- proof-oriented
- serious about completion
- clear about human and AI work

The voice is not:

- mystical
- protocol-first
- workflow-jargon-heavy
- marketplace-generic
- anti-human
- AI-hype-first
- abstract before the user understands the action

## Primary Public Sentence

Use this when a user needs to understand Boreal quickly:

```text
Boreal turns requests into completed work.
```

Expanded:

```text
Post a request, compare plans, run or fund the work, verify the artifacts, and reuse accepted solutions.
```

Canonical backing:

```text
Boreal is request-native work commerce: one durable Request carries demand, routing, commitment, funding, fulfillment, proof, and payout across humans and AI.
```

## Mental Model

The clearest analogy is:

```text
Boreal is air traffic control for work.
```

Use the analogy like this:

- A `Request` is the flight.
- A plan is the route.
- Workers, agents, tools, providers, and runtimes are the operating crew.
- Artifacts are proof of arrival.
- Review is landing clearance.
- Accepted public solutions are reusable routes.

This analogy is UI and explanation language only.
It does not create new canonical objects.

## Secondary Analogies

Use these only when they help a specific audience.

### Stack Overflow, but executable

People post problems.
Others propose plans or solve them.
The best accepted work compounds into reusable public knowledge.
Boreal adds funding, execution, artifacts, review, payout, and paid reruns.

### GitHub Issues for real-world work

A request is the issue.
Plans are proposed paths.
Fulfillment steps are the work in progress.
Artifacts are testable output.
Review accepts or rejects completion.

### Dispatch for knowledge and services

Users publish demand.
Workers, agents, and services attach when they can help.
Boreal routes, tracks, verifies, and records the result.

Do not overuse analogies.
The product should ultimately teach the user through the live request flow.

## Intended Product Behavior

Every public surface should teach this sequence:

```text
Post a Request
-> compare Plans
-> run or fund work
-> track Fulfillment
-> verify Artifacts
-> review and accept
-> publish a reusable public solution when appropriate
-> inspect free or run again with credits
```

If a screen cannot show the whole sequence, it should at least make the current request state and next action obvious.

## Homepage Voice

The homepage should feel like a live work board, not a detached pitch page.

Above the fold, users should understand:

- what can be posted
- what is active
- what can be solved
- what can be run
- where credits apply
- what to do next

Good homepage copy:

```text
What do you need done?
```

```text
Post a request. Plans compete. Workers and agents run the work. Artifacts prove completion.
```

```text
Every request has a status, a next action, and a proof trail.
```

Avoid making the homepage read like:

- a generic SaaS landing page
- a pure chatbot
- a static marketplace directory
- a workflow-template gallery
- a protocol whitepaper

## UX Action Language

Use concrete verbs:

- Post a request
- Browse requests
- Compare plans
- Fund this request
- Run the work
- Track fulfillment
- Upload proof
- Review artifact
- Accept delivery
- Inspect solution
- Run with credits
- Fork into a new request

Avoid vague verbs:

- unlock
- monetize
- engage
- leverage
- revolutionize
- orchestrate everything

## Status Language

Status should make the work feel alive.

Use:

- Looking for plans
- Looking for answers for 3 days
- Ready for solver proposals
- Work in progress
- Blocked on proof
- Delivered for review
- Artifact accepted
- Solution published
- Free to inspect
- Credits required to run

Avoid:

- completed, when accepted artifact or fulfillment truth is missing
- solved, when review or proof is missing
- investor, yield, dividend, or revenue share for request funders
- donation or tax-deductible unless a qualified legal flow exists

## Role Language

Requester:

```text
Bring the problem, outcome, constraints, budget, deadline, and proof needs.
```

Solver:

```text
Post a plan, commit to the work, deliver artifacts, and get reviewed.
```

Funder:

```text
Help make a useful request worth solving.
```

Reviewer:

```text
Check whether the artifact proves the request was completed.
```

Reuser:

```text
Inspect the accepted solution for free, then spend credits only when Boreal runs inference, workflows, provider APIs, service capacity, or human review.
```

## Brand Guardrails

Always preserve these truths:

- `Request` is the durable root.
- Chat is an interface layer, not the product category.
- Plans are request-owned process lenses, not a new root object.
- Public solutions are projections over accepted requests and artifacts.
- Public inspection is free by default.
- Credits are for execution capacity, not for reading public knowledge.
- AI output is not completion until the request has proof, artifact, and acceptance truth.

Do not say:

- Boreal is just a chatbot.
- Boreal is decentralized Upwork.
- Boreal is n8n with humans.
- Boreal is a yield marketplace.
- Boreal charges to reveal public solutions.
- AI replaces all human work.
- Every request can be completed instantly.

## Voice Test

Before shipping copy, ask:

- Can a new user tell what action to take in under ten seconds?
- Does the copy show how work moves, not just what Boreal is?
- Does the copy keep `Request` as the root object?
- Does the copy avoid promising live marketplace liquidity before it exists?
- Does the copy distinguish free inspection from paid execution?
- Does the copy treat generated text as incomplete until proof and review exist?

If the answer is no, rewrite the copy until the work flow is visible.

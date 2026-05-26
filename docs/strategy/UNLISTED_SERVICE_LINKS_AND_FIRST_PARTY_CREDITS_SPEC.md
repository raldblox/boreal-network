# Unlisted Service Links And First-Party Credits Spec

This file defines a canon-safe launch spec for direct-link service buying in Boreal.

It is a downstream strategy and product-shaping document.
It does not promote new root objects into canon by itself.

## Purpose

Define:

- how a direct service link should work
- how preset plans should map onto current Boreal objects
- how first-party credits can exist without breaking current transaction truth

## Canon Status

Accepted as strategy direction:

- direct-link service buying should use `unlisted` first-party `Supply`
- selected service plans should pin `routing.preferredSupplyId`
- the buyer should land inside one durable `Request`
- first-party credits should be buyer prepay only, not a multi-seller wallet

Not promoted to root canon in this file:

- a new buyer-wallet root object
- marketplace-wide stored-value semantics
- third-party seller credit settlement
- public supply-market liquidity claims

## Goals

- make services directly buyable from a shared link
- keep Boreal service-first instead of SaaS-first
- let multiple branded service pages map back to the same Boreal backbone
- let repeat buyers preload credit for confidence and faster checkout
- preserve request-rooted commercial truth

## Non-Goals

- broad public marketplace browsing
- cross-seller credits
- cash-out or withdrawal for buyers
- credits as a crypto or stored-value product
- replacing request-level transaction truth with an account-balance abstraction

## Core Model

### 1. Family page is a surface concept

A service family page is not a new canonical root.

It is a surface grouping for:

- sibling first-party `Supply` rows
- one shared narrative
- one shared process rail
- several preset plans

### 2. One preset plan equals one `Supply`

To keep pricing truthful:

- every preset plan should map to one unlisted `Supply`
- every plan deep link should resolve to one supply id
- one family page may group several sibling supply ids

### 3. The buyer still creates one `Request`

The buyer should never bypass the durable work thread.

The direct-link lane is:

- link opens service page
- buyer selects one preset plan
- Boreal creates one private draft `Request`
- Boreal sets `routing.preferredSupplyId` to the selected plan supply id
- buyer writes or confirms the ask
- Boreal opens the request
- payment and fulfillment proceed from that same request

## Link Types

### Family link

Example shape:

- `/services/automation-completion-sprint`

Behavior:

- show family promise
- show all preset plans
- let buyer choose one plan

### Plan deep link

Example shape:

- `/services/automation-completion-sprint/one-workflow-completion`

Behavior:

- resolve one exact unlisted supply id
- preselect one exact plan
- open the request flow faster

## Branded Distribution Rule

Different public brand names are allowed.

Examples:

- `FlowFix Sprint`
- `ShipPatch`
- `SignalDesk`

But the internal mapping should stay stable:

- one `serviceFamilyKey`
- one `servicePlanKey`
- one selected `Supply`
- one resulting `Request`

Do not fork the actual commerce model per brand.

## Request Creation Rules

When a buyer starts from a service link:

- create one private draft `Request`
- set `routing.preferredSupplyId`
- seed `seeking.supplyKinds` from the selected supply
- seed `budget` from fixed plan pricing when the plan is fixed-price
- keep `brief` buyer-authored
- keep system-selected plan context in server-owned metadata

Suggested request metadata keys:

- `metadata.serviceFamilyKey`
- `metadata.servicePlanKey`
- `metadata.serviceLinkSlug`
- `metadata.serviceSource = "direct_link"`
- `metadata.serviceBrandKey`

Do not write plan copy into:

- `brief.title`
- `brief.body`
- `brief.summary`

unless the buyer actually authored or confirmed it.

## Commitment And Funding Rules

### Fixed-price direct plans

For fixed-price first-party services:

- selected plan should map to one fixed-price `Supply`
- buyer should see exact plan terms before paying
- payment should create request-level funding truth
- fulfillment should start only after the request is funded or directly authorized by the accepted lane

Suggested flow:

1. private draft request
2. request opened
3. system drafts one fixed-price first-party `Commitment`
4. buyer accepts
5. buyer pays by PayPal or card, or uses credits
6. request enters funded lane
7. fulfillment starts

### Clarification-heavy plans

If a plan still needs real scope confirmation:

- keep the request and preferred supply
- use a quote or proposal style `Commitment`
- do not charge before the real boundary is accepted

The launch set should bias toward fixed-price plans first.

## Fulfillment Rules

After funding:

- one first-party `Fulfillment` lane starts
- worker execution may be human, agent, or mixed
- proof should publish through `Artifact`
- final closeout should happen on the same request

Launch service links should prefer bounded fulfillment with:

- clear deliverables
- clear proof
- clear handoff

## First-Party Credits Model

### Summary

Credits should be a buyer prepay convenience layer for first-party services only.

They should not be marketed as:

- a wallet
- a bank balance
- a cash equivalent
- a multi-seller payout pool

## Support Objects

These may exist as support aggregates later without becoming new Boreal commerce roots:

- `BuyerCreditAccount`
- `BuyerCreditLedgerEntry`

They are support objects in the same sense that auth support objects or resolver support objects can exist without replacing the canonical commerce model.

## Credit Rules

- credits are account-bound
- credits are first-party only
- credits are denominated in USD equivalent
- `1 credit = $1` for the first launch
- credits are non-transferable
- credits are non-withdrawable
- credits may be refundable only under Boreal's first-party service policy
- credits should not be redeemable against third-party supply until a later canon and payout expansion exists

## Top-Up Packs

Suggested launch packs:

| Pack key | Price paid | Credit granted | Intended use |
| --- | ---: | ---: | --- |
| `starter-100` | $100 | 100 credits | one small brief or partial service funding |
| `builder-250` | $250 | 265 credits | repeat buyer confidence pack |
| `operator-500` | $500 | 550 credits | frequent buyer or multi-service testing pack |

Bonus credits should be treated as first-party promotional credit, not as cash liability owed to outside sellers.

## Why This Is Canon-Safe

The current canonical `Transaction` object is request-attached.

A raw account top-up does not naturally map to one request.

So the safer split is:

- top-up event lives in a buyer-credit support ledger
- request consumption creates normal request-level transaction truth

That preserves the existing rule that payment truth for work stays attached to one request.

## Request-Level Credit Consumption

When a buyer uses credits on one service request:

- Boreal debits the buyer-credit ledger
- Boreal creates or updates one request-level `Transaction`
- that transaction should reference credit funding through metadata

Suggested transaction metadata:

- `metadata.fundingSource = "buyer_credit"`
- `metadata.creditLedgerEntryId`
- `metadata.creditAmountApplied`

Suggested direct-payment metadata:

- `metadata.fundingSource = "paypal_direct"`
- `metadata.processor = "paypal"`
- `metadata.processorReference`

This keeps the request ledger authoritative for actual work commerce.

## Refund Rules

Refund order should be:

1. if the request was funded directly by PayPal and the request is refundable, refund through the original processor where possible
2. if the request was funded by buyer credit, restore buyer credit through the support ledger
3. do not let buyer-credit refunds become seller payout obligations

## What Credits Must Not Unlock Yet

Credits should not initially support:

- public request pool funding
- external responder payouts
- third-party seller balances
- partial multi-seller split settlement
- off-platform withdrawal

Those would require a larger canon and compliance decision.

## Page Surface Spec

Every service family page should render:

- family headline
- category tags
- plan cards
- process rail
- proof rail
- direct CTA
- optional credit CTA

Every plan card should render:

- plan name
- exact price
- turnaround
- included deliverables
- revision rule
- ideal use case
- buy now CTA

## Suggested Service-Link API Shape

This is a surface-level product spec, not a committed canon contract.

Suggested reads:

- `GET /api/service-links/{familySlug}`
- `GET /api/service-links/{familySlug}/{planSlug}`

Suggested writes:

- `POST /api/service-links/{familySlug}/{planSlug}/start`
- `POST /api/credit-topups`
- `POST /api/credits/{accountId}/apply`

Under the hood these should still drive:

- supply reads
- request draft creation
- commitment creation
- transaction updates
- fulfillment start

Do not let the surface route invent a second hidden commerce model.

## Acceptance Criteria

- one direct link can start one private draft request with one pinned supply
- one family page can group multiple fixed-price sibling supply rows
- selected plan context stays in metadata and routing, not fake brief text
- one buyer can pay directly without understanding Boreal internals
- one repeat buyer can reuse prepaid first-party credits across first-party service plans
- request-level commerce truth remains visible through canonical request, commitment, fulfillment, artifact, and transaction objects

## Open Questions

- whether credit bonus packs should exist at launch or only after direct-pay demand is proven
- whether service-family pages should live under one Boreal domain or several branded domains on the same backend
- whether first-party service commitments should be auto-drafted on request open or only after the buyer confirms intake fields

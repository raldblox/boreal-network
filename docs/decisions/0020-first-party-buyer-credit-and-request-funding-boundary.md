# 0020 First-party buyer credit and request funding boundary

## Status

Accepted

## Date

2026-05-26

## Context

Boreal now needs a standardized payment reading for first-party service supply and workflow-backed supply.

The immediate pressure comes from:

- direct fixed-price service plans
- first-party top-up or prepaid credits
- PayPal and card as straightforward payment rails
- optional stablecoin rails such as `USDC` or `USDT`

The failure mode is also obvious.

If Boreal treats stored buyer balance as the main commercial truth, the request ledger gets weaker.

If Boreal treats processor or chain events as the only truth, the request ledger also gets weaker.

That breaks the accepted model where payment, proof, and fulfillment stay attached to one durable work thread.

## Decision

### 1. `Transaction` remains request-attached canonical payment truth

The canonical money object remains:

- `Transaction`

`Transaction` stays attached to one `Request`.

Funding, settlement, refund, dispute, and payout truth for work must stay request-attached even when upstream processor or credit support layers exist.

### 2. First-party buyer credits are support objects, not a new commerce root

The accepted support-object names are:

- `BuyerCreditAccount`
- `BuyerCreditLedgerEntry`

These are support funding objects, not Boreal commerce roots.

They exist so Boreal can offer:

- first-party prepay
- repeat-buyer convenience
- promotional credit
- stable top-up accounting

without replacing request-attached transaction truth.

### 3. Credits are first-party only

Buyer credits are accepted only as:

- account-bound
- non-transferable
- non-withdrawable
- first-party only

They must not be treated as:

- multi-seller stored value
- off-platform withdrawal balance
- generic marketplace wallet

### 4. Top-up is support-ledger truth, not request truth

A top-up event should not create standalone request truth by itself.

Top-up belongs in:

- `BuyerCreditLedgerEntry`

When credit is later spent on one request, Boreal must still create or update request-attached `Transaction` truth for that work lane.

### 5. Payment source diversity is allowed behind one request-funding model

The accepted funding-source families are:

- direct processor payment such as card or PayPal
- direct stablecoin payment such as `USDC` or `USDT`
- buyer credit consumption

The outer request-funding model stays the same.

Only the source verification and metadata change.

### 6. Stablecoin use does not make chain state the canonical Boreal ledger

If stablecoin rails are used:

- chain transfer or verification is upstream funding evidence
- request `Transaction` remains Boreal's commercial truth for the work lane
- top-up via stablecoin remains support-ledger truth until credit is spent on a request

### 7. Refund ordering should follow funding source

Accepted refund order:

1. restore through the original processor or chain lane when the request was funded directly through that source and policy allows it
2. restore buyer credit through support ledger when the request was funded by buyer credit
3. do not let buyer-credit restores become external seller payout obligations

## Consequences

### Accepted

- Boreal can add first-party prepaid credit without weakening the request model
- PayPal, card, and stablecoin can coexist behind one consistent funding reading
- first-party services and workflow-backed supplies can share one payment model

### Rejected

- treating buyer credit as a new canonical commerce root
- treating chain or processor state as the only durable truth Boreal needs
- letting buyer credit operate as a broad marketplace wallet before larger payout and compliance design exists

### Tradeoffs

- the funding support layer adds accounting complexity before implementation ships
- credits stay intentionally narrow at first
- direct-request funding and top-up funding must be modeled separately even when the buyer experience tries to keep them simple

## Implementation Notes

The first durable standards should live in:

- `standards/first-party-payment-and-credit-profile.md`
- `standards/buyer-credit-support-objects.md`

Canon files that should stay aligned:

- `docs/SCHEMA_LOGICAL.md`
- `docs/LIVE_VS_TARGET.md`
- `docs/TEST_MATRIX.md`
- `docs/API_CONTRACTS.md` when concrete external surfaces are committed

The first implementation slice should prefer:

- support objects for buyer credit
- typed transaction metadata for funding source and verification references
- narrow first-party service use before any multi-seller expansion

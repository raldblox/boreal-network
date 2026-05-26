# First-party Payment And Credit Profile

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This file defines how Boreal should handle payment sources and first-party buyer credits for first-party supply and workflow-backed supply.

It exists to keep:

- request funding truthful
- top-up support separate from request truth
- payment-source diversity compatible with one commercial model

## Canon Boundary

This standard inherits root canon.

It does not replace:

- `Transaction` as request-attached payment truth
- `Request` as the durable work root
- `Commitment` as approval or commercial boundary

## Core Rule

Every funded request must still have request-attached `Transaction` truth.

Credits and processor events may support that truth.
They do not replace it.

## Funding Source Families

The accepted funding-source families are:

- `processor_direct`
- `stablecoin_direct`
- `buyer_credit`

Recommended concrete metadata values:

- `card_direct`
- `paypal_direct`
- `usdc_direct`
- `usdt_direct`
- `buyer_credit`

## Direct Funding Rule

When a buyer pays a request directly:

- Boreal verifies the source payment
- Boreal creates or updates request-attached `Transaction`
- `Transaction.metadata` records source-specific evidence

Examples:

- processor reference
- chain id
- token contract
- transfer hash
- verified amount

## Credit Top-up Rule

When a buyer tops up first-party credit:

- create one `BuyerCreditLedgerEntry`
- update the derived buyer-credit account balance
- do not treat the top-up itself as request-attached `Transaction` truth

That top-up becomes request-attached truth only later when some of that credit is consumed on one request.

## Credit Consumption Rule

When a buyer spends credit on one request:

- debit the buyer-credit ledger
- create or update request-attached `Transaction`
- record the ledger reference in transaction metadata

Suggested metadata:

- `fundingSource`
- `creditLedgerEntryId`
- `creditAmountApplied`

## Refund Rule

Refund source should mirror original funding source.

### Direct processor or stablecoin funding

When funded directly and refundable:

- attempt restore through the same upstream source or its approved refund lane
- record refund progression on request `Transaction`

### Credit funding

When funded through buyer credit:

- restore buyer credit through ledger
- record refund progression on request `Transaction`

## Payout Boundary Rule

Buyer credit must not directly become:

- external seller withdrawable balance
- multi-seller payout pool
- general marketplace wallet

That is outside the first-party credit scope.

## Request Funding States

Funding states still follow canonical `Transaction` states:

- `pending`
- `authorized`
- `verified`
- `settled`
- `refunded`
- `disputed`
- `failed`

Credit support objects should not invent a separate buyer-facing money state machine that conflicts with request transactions.

## Payment Source Metadata

Recommended request `Transaction.metadata` shape:

```json
{
  "fundingSource": "usdc_direct",
  "processor": null,
  "chainId": "eip155:8453",
  "tokenSymbol": "USDC",
  "tokenContract": "0x...",
  "processorReference": null,
  "transferHash": "0xabc",
  "verifiedAmount": "649.00",
  "creditLedgerEntryId": null,
  "creditAmountApplied": null
}
```

Recommended direct PayPal shape:

```json
{
  "fundingSource": "paypal_direct",
  "processor": "paypal",
  "processorReference": "PAYID-123",
  "chainId": null,
  "tokenSymbol": null,
  "tokenContract": null,
  "transferHash": null,
  "verifiedAmount": "649.00"
}
```

Recommended buyer-credit-funded shape:

```json
{
  "fundingSource": "buyer_credit",
  "creditLedgerEntryId": "bcle_01",
  "creditAmountApplied": "649.00"
}
```

## Stablecoin Rules

Stablecoin rails are allowed as funding sources.

The standard funding reading is:

- chain event proves upstream transfer
- Boreal verifies that transfer
- request `Transaction` remains canonical work-commerce truth

Recommended launch stance:

- support `USDC` first
- support `USDT` only when treasury, compliance, and support burden are acceptable

## Processor Rules

Recommended direct processor sources for first-party supply:

- card
- PayPal

Processor-specific customer abstractions may exist.
They should not replace request-attached transaction truth.

## Credit Policy Rules

Launch credit rules:

- first-party only
- account-bound
- `1 credit = 1 USD equivalent`
- promotional bonus allowed
- non-transferable
- non-withdrawable

## Suggested Top-Up Packs

Suggested packs:

- `starter-100`
- `builder-250`
- `operator-500`

Promotional bonus credit should remain first-party promotional liability, not external seller cash liability.

## Suggested Internal Surfaces

These are implementation suggestions, not root API commitments.

Reads:

- `GET /api/buyer-credits/account`
- `GET /api/buyer-credits/ledger`

Writes:

- `POST /api/buyer-credits/topups`
- `POST /api/buyer-credits/apply`
- `POST /api/request-transactions/verify-source`

## Validation Rules

Implementation should verify:

- one top-up changes buyer credit balance without creating fake request truth
- one credit spend creates request transaction truth
- duplicate payment verification cannot double-settle one request
- credits cannot be spent on non-first-party external supply in the first scope
- chain or processor evidence can be replayed safely without duplication

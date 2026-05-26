# Buyer Credit Support Objects

## Status

Draft implementation standard

## Version

`0.1`

## Purpose

This file defines the support-object layer for first-party buyer credits.

It should make prepay and credit reuse possible without turning credits into a new canonical commerce root.

## Canon Boundary

These are support funding objects.

They do not replace:

- `Transaction`
- `Request`
- `Commitment`

## Object Set

Required support objects:

- `BuyerCreditAccount`
- `BuyerCreditLedgerEntry`

Recommended optional support object:

- `BuyerFundingSourceRecord`

## Responsibility Split

### `BuyerCreditAccount`

Represents the buyer's derived first-party credit balance and policy envelope.

Use it for:

- current balance projection
- account policy flags
- default currency reading
- account status

Do not use it for:

- the immutable history of every money movement

### `BuyerCreditLedgerEntry`

Represents one append-only credit movement.

Use it for:

- top-up
- promotional grant
- debit
- refund restore
- manual adjustment
- reversal

### `BuyerFundingSourceRecord`

Optional source-tracking support object for saved or verified buyer funding rails.

Use it for:

- saved processor identity
- stablecoin address or chain preference
- funding source status

Do not confuse it with actual request funding truth.

## Suggested Shapes

### `BuyerCreditAccount`

```json
{
  "id": "bca_01",
  "ownerActorId": "act_01",
  "currency": "USD",
  "status": "active",
  "availableBalance": "265.00",
  "pendingBalance": "0.00",
  "lifetimePurchased": "250.00",
  "lifetimeGranted": "15.00",
  "lifetimeSpent": "0.00",
  "lifetimeRefunded": "0.00",
  "metadata": {
    "profile": "first_party_credit_v1"
  }
}
```

Suggested statuses:

- `active`
- `paused`
- `closed`

### `BuyerCreditLedgerEntry`

```json
{
  "id": "bcle_01",
  "buyerCreditAccountId": "bca_01",
  "kind": "topup",
  "status": "settled",
  "amount": "250.00",
  "currency": "USD",
  "balanceAfter": "265.00",
  "requestId": null,
  "transactionId": null,
  "reference": "PAYID-123",
  "metadata": {
    "fundingSource": "paypal_direct",
    "bonusAmount": "15.00"
  },
  "createdAt": "2026-05-26T12:00:00Z",
  "updatedAt": "2026-05-26T12:00:00Z"
}
```

Suggested kinds:

- `topup`
- `grant`
- `debit`
- `refund_restore`
- `adjustment`
- `reversal`

Suggested statuses:

- `pending`
- `verified`
- `settled`
- `failed`
- `reversed`

### `BuyerFundingSourceRecord`

```json
{
  "id": "bfsr_01",
  "ownerActorId": "act_01",
  "kind": "stablecoin_wallet",
  "status": "active",
  "label": "Base USDC wallet",
  "metadata": {
    "chainId": "eip155:8453",
    "tokenSymbol": "USDC",
    "address": "0x123"
  }
}
```

Suggested kinds:

- `paypal_profile`
- `card_profile`
- `stablecoin_wallet`

## Ledger Rules

- ledger entries are append-only
- balance is a derived projection
- a debit for request funding should reference the related `Request` and request `Transaction` when available
- duplicate upstream verification must not create duplicate settled ledger entries

## Top-Up Rules

Top-up entry should declare:

- funding source
- verified amount
- promotional bonus amount if any
- upstream processor or chain reference

Top-up should not require a `Request`.

## Debit Rules

When credit is spent on one request:

- create a `debit` ledger entry
- attach `requestId`
- attach request `transactionId` when created
- reduce `availableBalance`

## Refund Restore Rules

When one credit-funded request is refunded:

- create one `refund_restore` entry
- reference the original debit entry when possible
- restore the derived balance

## Adjustment Rules

Manual adjustments should be rare and explicit.

Every adjustment should record:

- who authorized it
- why it happened
- whether it adds or subtracts value

## Currency Rule

Launch assumption:

- one buyer credit account per buyer
- one default currency: `USD`

Delay:

- multi-currency buyer credit
- FX conversion logic

## Stablecoin Top-Up Rule

If buyer tops up via stablecoin:

- ledger entry should record chain id, token symbol, token contract, transfer hash, and verified amount
- derived account balance should update only after verification

Stablecoin top-up does not bypass request-level transaction creation later when credit is spent.

## Ownership And Scope Rule

Buyer credit objects are for first-party Boreal funding only.

They must not be reused for:

- generic seller wallets
- public marketplace withdrawable balances
- external payout accounting

## Recommended MVP Scope

Implement first:

- `BuyerCreditAccount`
- `BuyerCreditLedgerEntry`

Treat `BuyerFundingSourceRecord` as optional if transaction metadata and one-off top-up collection are enough at first.

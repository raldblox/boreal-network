import type { RequestActorRef } from "./request";

export type TransactionKind =
  | "payment_requirement"
  | "authorization"
  | "verification"
  | "settlement"
  | "payout"
  | "refund"
  | "dispute";

export type TransactionStatus =
  | "pending"
  | "authorized"
  | "verified"
  | "settled"
  | "payout_pending"
  | "paid_out"
  | "refunded"
  | "disputed"
  | "failed";

export type PaymentFundingSource =
  | "card_direct"
  | "paypal_direct"
  | "usdc_direct"
  | "usdt_direct"
  | "buyer_credit";

export type RequestTransactionMetadata = {
  fundingSource?: PaymentFundingSource;
  processor?: "card" | "paypal" | null;
  processorReference?: string | null;
  chainId?: string | null;
  tokenSymbol?: "USDC" | "USDT" | null;
  tokenContract?: string | null;
  transferHash?: string | null;
  verifiedAmount?: string | null;
  creditLedgerEntryId?: string | null;
  creditAmountApplied?: string | null;
  [key: string]: unknown;
};

export type RequestTransaction = {
  id: string;
  key: string;
  requestId: string;
  commitmentId?: string | null;
  fulfillmentId?: string | null;
  kind: TransactionKind;
  status: TransactionStatus;
  currency: string;
  amount: string;
  payer: RequestActorRef;
  payee: RequestActorRef;
  reference?: string | null;
  metadata?: RequestTransactionMetadata | null;
  createdAt: string;
  updatedAt: string;
  authorizedAt?: string | null;
  verifiedAt?: string | null;
  settledAt?: string | null;
  payoutPendingAt?: string | null;
  paidOutAt?: string | null;
  refundedAt?: string | null;
  disputedAt?: string | null;
  failedAt?: string | null;
};

export type BuyerCreditAccountStatus = "active" | "paused" | "closed";

export type BuyerCreditLedgerEntryKind =
  | "topup"
  | "grant"
  | "debit"
  | "refund_restore"
  | "adjustment"
  | "reversal";

export type BuyerCreditLedgerEntryStatus =
  | "pending"
  | "verified"
  | "settled"
  | "failed"
  | "reversed";

export type BuyerCreditLedgerMetadata = {
  fundingSource?: PaymentFundingSource;
  bonusAmount?: string;
  originalLedgerEntryId?: string;
  authorizedByActorId?: string;
  reason?: string;
  processor?: "card" | "paypal" | null;
  processorReference?: string | null;
  chainId?: string | null;
  tokenSymbol?: "USDC" | "USDT" | null;
  tokenContract?: string | null;
  transferHash?: string | null;
  verifiedAmount?: string | null;
  [key: string]: unknown;
};

const centsPattern = /^\d+(?:\.\d{1,2})?$/;

export function normalizeMoneyAmount(amount: string | number) {
  const rawAmount =
    typeof amount === "number" ? amount.toFixed(2) : amount.trim();

  if (!centsPattern.test(rawAmount)) {
    throw new Error("Money amount must be a positive decimal with two cents.");
  }

  const [wholePart, centsPart = ""] = rawAmount.split(".");
  const cents = centsPart.padEnd(2, "0").slice(0, 2);
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "");
  const amountInCents = BigInt(normalizedWhole) * 100n + BigInt(cents);

  if (amountInCents <= 0n) {
    throw new Error("Money amount must be greater than zero.");
  }

  return `${normalizedWhole}.${cents}`;
}

export function moneyToCents(amount: string | number) {
  const normalized = normalizeMoneyAmount(amount);
  const [wholePart, centsPart = "00"] = normalized.split(".");

  return BigInt(wholePart) * 100n + BigInt(centsPart);
}

export function centsToMoney(cents: bigint) {
  if (cents < 0n) {
    throw new Error("Money amount cannot be negative.");
  }

  const wholePart = cents / 100n;
  const centsPart = cents % 100n;

  return `${wholePart.toString()}.${centsPart.toString().padStart(2, "0")}`;
}

export function addMoneyAmounts(left: string, right: string) {
  return centsToMoney(moneyToCents(left) + moneyToCents(right));
}

export function subtractMoneyAmounts(left: string, right: string) {
  const nextAmount = moneyToCents(left) - moneyToCents(right);

  if (nextAmount < 0n) {
    throw new Error("Insufficient money balance.");
  }

  return centsToMoney(nextAmount);
}

export function compareMoneyAmounts(left: string, right: string) {
  const leftCents = moneyToCents(left);
  const rightCents = moneyToCents(right);

  if (leftCents === rightCents) {
    return 0;
  }

  return leftCents > rightCents ? 1 : -1;
}

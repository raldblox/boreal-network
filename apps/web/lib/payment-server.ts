import "server-only";

import {
  appendRequestEvent,
  createBuyerCreditLedgerEntry,
  ensureBuyerCreditAccount,
  getBuyerCreditAccountByOwnerId,
  getBuyerCreditLedgerEntryByIdempotencyKey,
  getBuyerCreditLedgerEntriesByAccountId,
  getRequestById,
  getRequestEventByIdempotencyKey,
  getRequestTransactionById,
  saveRequestTransaction,
  toRequestDraft,
  updateBuyerCreditAccountById,
} from "@/lib/db/queries";
import {
  addMoneyAmounts,
  compareMoneyAmounts,
  type BuyerCreditLedgerMetadata,
  type PaymentFundingSource,
  type RequestTransactionMetadata,
  normalizeMoneyAmount,
  subtractMoneyAmounts,
  type TransactionKind,
  type TransactionStatus,
} from "@/lib/payment";
import { type RequestActorRef } from "@/lib/request";
import { persistRequestProjectionPatch } from "@/lib/request-server";
import { generateUUID } from "@/lib/utils";

const firstPartyPayee: RequestActorRef = {
  kind: "organization",
  id: "boreal",
  displayName: "Boreal",
};

function toHumanActorRef(userId: string): RequestActorRef {
  return {
    kind: "human",
    id: userId,
  };
}

function eventTypeForTransactionStatus(status: TransactionStatus) {
  switch (status) {
    case "authorized":
      return "transaction.authorized";
    case "verified":
      return "transaction.verified";
    case "settled":
      return "transaction.settled";
    case "refunded":
      return "transaction.refunded";
    case "disputed":
      return "transaction.disputed";
    case "failed":
      return "transaction.failed";
    default:
      return "transaction.required";
  }
}

function requestStatusAfterFunding(
  currentStatus: ReturnType<typeof toRequestDraft>["status"],
  transactionStatus: TransactionStatus
) {
  if (
    transactionStatus !== "verified" &&
    transactionStatus !== "settled" &&
    transactionStatus !== "authorized"
  ) {
    return currentStatus;
  }

  if (currentStatus === "open" || currentStatus === "funding_required") {
    return "funded";
  }

  return currentStatus;
}

export async function getBuyerCreditSummary({
  ownerId,
  currency = "USD",
}: {
  ownerId: string;
  currency?: string;
}) {
  const account = await ensureBuyerCreditAccount({
    ownerId,
    currency,
    metadata: { profile: "first_party_credit_v1" },
  });
  const ledger = await getBuyerCreditLedgerEntriesByAccountId({
    buyerCreditAccountId: account.id,
  });

  return { account, ledger };
}

export async function createPendingBuyerCreditTopUp({
  ownerId,
  amount,
  fundingSource,
  reference,
  idempotencyKey,
  metadata,
}: {
  ownerId: string;
  amount: string;
  fundingSource: Exclude<PaymentFundingSource, "buyer_credit">;
  reference?: string | null;
  idempotencyKey?: string | null;
  metadata?: BuyerCreditLedgerMetadata | null;
}) {
  const normalizedAmount = normalizeMoneyAmount(amount);
  const account = await ensureBuyerCreditAccount({
    ownerId,
    metadata: { profile: "first_party_credit_v1" },
  });

  if (account.status !== "active") {
    throw new Error("Buyer credit account is not active");
  }

  if (idempotencyKey) {
    const existingLedgerEntry = await getBuyerCreditLedgerEntryByIdempotencyKey({
      buyerCreditAccountId: account.id,
      idempotencyKey,
    });

    if (existingLedgerEntry) {
      return {
        account,
        ledgerEntry: existingLedgerEntry,
      };
    }
  }

  const pendingBalance = addMoneyAmounts(
    account.pendingBalance,
    normalizedAmount
  );

  const updatedAccount = await updateBuyerCreditAccountById({
    id: account.id,
    pendingBalance,
  });

  if (!updatedAccount) {
    throw new Error("Buyer credit account not found");
  }

  const ledgerEntry = await createBuyerCreditLedgerEntry({
    id: generateUUID(),
    buyerCreditAccountId: account.id,
    kind: "topup",
    status: "pending",
    amount: normalizedAmount,
    currency: account.currency,
    balanceAfter: account.availableBalance,
    idempotencyKey,
    reference,
    metadata: {
      ...(metadata ?? {}),
      fundingSource,
      pendingBalanceAfter: pendingBalance,
    },
  });

  return {
    account: updatedAccount,
    ledgerEntry,
  };
}

export async function recordDirectRequestTransaction({
  requestId,
  actorUserId,
  amount,
  currency = "USD",
  fundingSource,
  kind = "verification",
  status = "verified",
  reference,
  metadata,
  idempotencyKey,
  source = "api.requests.transactions.create",
}: {
  requestId: string;
  actorUserId: string;
  amount: string;
  currency?: string;
  fundingSource: PaymentFundingSource;
  kind?: TransactionKind;
  status?: TransactionStatus;
  reference?: string | null;
  metadata?: RequestTransactionMetadata | null;
  idempotencyKey?: string | null;
  source?: string;
}) {
  const existingRequest = await getRequestById({ id: requestId });
  if (!existingRequest) {
    throw new Error("Request not found");
  }

  const requestDraft = toRequestDraft(existingRequest);
  if (requestDraft.ownerId !== actorUserId) {
    throw new Error("Forbidden");
  }

  const normalizedAmount = normalizeMoneyAmount(amount);
  const now = new Date();
  const actor = toHumanActorRef(actorUserId);
  const eventType = eventTypeForTransactionStatus(status);

  if (idempotencyKey) {
    const existingEvent = await getRequestEventByIdempotencyKey({
      requestId,
      idempotencyKey,
      eventType,
    });
    const existingTransactionId = existingEvent?.payload.transactionId;

    if (typeof existingTransactionId === "string") {
      const existingTransaction = await getRequestTransactionById({
        id: existingTransactionId,
      });

      if (existingTransaction) {
        return {
          request: requestDraft,
          transaction: existingTransaction,
        };
      }
    }
  }

  const transaction = await saveRequestTransaction({
    id: generateUUID(),
    key: `txn-${generateUUID().slice(0, 8)}`,
    requestId,
    commitmentId: requestDraft.activeRefs.activeCommitmentId ?? null,
    fulfillmentId: requestDraft.activeRefs.activeFulfillmentId ?? null,
    kind,
    status,
    currency,
    amount: normalizedAmount,
    payer: actor,
    payee: firstPartyPayee,
    reference,
    metadata: {
      ...(metadata ?? {}),
      fundingSource,
      verifiedAmount: metadata?.verifiedAmount ?? normalizedAmount,
    },
    authorizedAt: status === "authorized" ? now : null,
    verifiedAt:
      status === "verified" ||
      status === "settled" ||
      status === "payout_pending" ||
      status === "paid_out"
        ? now
        : null,
    settledAt:
      status === "settled" ||
      status === "payout_pending" ||
      status === "paid_out"
        ? now
        : null,
    payoutPendingAt: status === "payout_pending" ? now : null,
    paidOutAt: status === "paid_out" ? now : null,
    refundedAt: status === "refunded" ? now : null,
    disputedAt: status === "disputed" ? now : null,
    failedAt: status === "failed" ? now : null,
  });

  const nextStatus = requestStatusAfterFunding(requestDraft.status, status);
  const nextRequest = await persistRequestProjectionPatch({
    requestId,
    actorUserId,
    patch: {
      status: nextStatus,
      activeRefs: {
        ...requestDraft.activeRefs,
        latestTransactionId: transaction.id,
      },
      latest: {
        ...requestDraft.latest,
        summary: `Funding ${status}: ${currency} ${normalizedAmount}`,
        lastEventAt: now.toISOString(),
        lastActor: actor,
      },
    },
  });

  await appendRequestEvent({
    eventId: generateUUID(),
    requestId,
    aggregateType: "transaction",
    aggregateId: transaction.id,
    eventType,
    actor,
    correlationId: generateUUID(),
    causationId: transaction.id,
    idempotencyKey: idempotencyKey ?? generateUUID(),
    source,
    payload: {
      transactionId: transaction.id,
      status,
      kind,
      currency,
      amount: normalizedAmount,
      fundingSource,
      requestStatus: nextRequest.status,
    },
    occurredAt: now,
  });

  return {
    request: nextRequest,
    transaction,
  };
}

export async function applyBuyerCreditToRequest({
  requestId,
  actorUserId,
  amount,
  idempotencyKey,
}: {
  requestId: string;
  actorUserId: string;
  amount: string;
  idempotencyKey?: string | null;
}) {
  const account = await getBuyerCreditAccountByOwnerId({
    ownerId: actorUserId,
  });
  if (!account) {
    throw new Error("Buyer credit account not found");
  }

  if (account.status !== "active") {
    throw new Error("Buyer credit account is not active");
  }

  const normalizedAmount = normalizeMoneyAmount(amount);
  if (idempotencyKey) {
    const existingLedgerEntry = await getBuyerCreditLedgerEntryByIdempotencyKey({
      buyerCreditAccountId: account.id,
      idempotencyKey,
    });

    if (existingLedgerEntry) {
      const existingRequest = await getRequestById({ id: requestId });
      const existingTransaction = existingLedgerEntry.transactionId
        ? await getRequestTransactionById({ id: existingLedgerEntry.transactionId })
        : null;

      if (existingRequest && existingTransaction) {
        return {
          request: toRequestDraft(existingRequest),
          transaction: existingTransaction,
          account,
          ledgerEntry: existingLedgerEntry,
        };
      }
    }
  }

  if (compareMoneyAmounts(account.availableBalance, normalizedAmount) < 0) {
    throw new Error("Insufficient buyer credit");
  }

  const ledgerEntryId = generateUUID();
  const nextAvailableBalance = subtractMoneyAmounts(
    account.availableBalance,
    normalizedAmount
  );
  const nextLifetimeSpent = addMoneyAmounts(
    account.lifetimeSpent,
    normalizedAmount
  );

  const directFunding = await recordDirectRequestTransaction({
    requestId,
    actorUserId,
    amount: normalizedAmount,
    fundingSource: "buyer_credit",
    kind: "settlement",
    status: "settled",
    metadata: {
      fundingSource: "buyer_credit",
      creditLedgerEntryId: ledgerEntryId,
      creditAmountApplied: normalizedAmount,
    },
    idempotencyKey,
    source: "api.buyer_credits.apply",
  });

  const updatedAccount = await updateBuyerCreditAccountById({
    id: account.id,
    availableBalance: nextAvailableBalance,
    lifetimeSpent: nextLifetimeSpent,
  });

  if (!updatedAccount) {
    throw new Error("Buyer credit account not found");
  }

  const ledgerEntry = await createBuyerCreditLedgerEntry({
    id: ledgerEntryId,
    buyerCreditAccountId: account.id,
    kind: "debit",
    status: "settled",
    amount: normalizedAmount,
    currency: account.currency,
    balanceAfter: nextAvailableBalance,
    requestId,
    transactionId: directFunding.transaction.id,
    idempotencyKey,
    metadata: {
      fundingSource: "buyer_credit",
      creditAmountApplied: normalizedAmount,
    },
    settledAt: new Date(),
  });

  return {
    ...directFunding,
    account: updatedAccount,
    ledgerEntry,
  };
}

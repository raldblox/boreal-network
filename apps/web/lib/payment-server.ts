import "server-only";

import {
  appendRequestEvent,
  createBuyerCreditLedgerEntry,
  ensureBuyerCreditAccount,
  failBuyerCreditTopUpLedgerEntry,
  getBuyerCreditAccountByOwnerId,
  getBuyerCreditLedgerEntryById,
  getBuyerCreditLedgerEntryByIdempotencyKey,
  getBuyerCreditLedgerEntryByReference,
  getBuyerCreditLedgerEntriesByAccountId,
  getRequestById,
  getRequestEventByIdempotencyKey,
  getRequestTransactionById,
  saveRequestTransaction,
  settleBuyerCreditTopUpLedgerEntry,
  toRequestDraft,
  updateBuyerCreditAccountById,
  updateBuyerCreditLedgerEntryById,
} from "@/lib/db/queries";
import {
  capturePayPalOrder,
  createPayPalCreditTopUpOrder,
  extractCaptureDetailsFromPayPalOrder,
  extractCaptureDetailsFromWebhookEvent,
  type PayPalCaptureDetails,
  type PayPalWebhookEvent,
} from "@/lib/paypal";
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

type BuyerCreditLedgerEntryProjection = NonNullable<
  Awaited<ReturnType<typeof getBuyerCreditLedgerEntryById>>
>;

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
  currency = "USD",
  fundingSource,
  reference,
  ledgerEntryId,
  idempotencyKey,
  metadata,
}: {
  ownerId: string;
  amount: string;
  currency?: string;
  fundingSource: Exclude<PaymentFundingSource, "buyer_credit">;
  reference?: string | null;
  ledgerEntryId?: string | null;
  idempotencyKey?: string | null;
  metadata?: BuyerCreditLedgerMetadata | null;
}) {
  const normalizedAmount = normalizeMoneyAmount(amount);
  const account = await ensureBuyerCreditAccount({
    ownerId,
    currency,
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
    id: ledgerEntryId ?? generateUUID(),
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

function ledgerMetadataValue(
  ledgerEntry: BuyerCreditLedgerEntryProjection,
  key: string
) {
  const metadata = ledgerEntry.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const value = metadata[key];

  return typeof value === "string" ? value : undefined;
}

function assertPayPalCaptureMatchesLedger({
  ledgerEntry,
  capture,
}: {
  ledgerEntry: BuyerCreditLedgerEntryProjection;
  capture: PayPalCaptureDetails;
}) {
  const capturedAmount = capture.amount
    ? normalizeMoneyAmount(capture.amount)
    : undefined;

  if (capturedAmount && capturedAmount !== ledgerEntry.amount) {
    throw new Error("PayPal capture amount does not match top-up amount");
  }

  if (capture.currency && capture.currency !== ledgerEntry.currency) {
    throw new Error("PayPal capture currency does not match top-up currency");
  }
}

async function findPayPalLedgerEntry(capture: PayPalCaptureDetails) {
  if (capture.ledgerEntryId) {
    const ledgerEntry = await getBuyerCreditLedgerEntryById({
      id: capture.ledgerEntryId,
    });

    if (ledgerEntry) {
      return ledgerEntry;
    }
  }

  if (capture.paypalOrderId) {
    return getBuyerCreditLedgerEntryByReference({
      reference: capture.paypalOrderId,
    });
  }

  return null;
}

async function attachPayPalOrderToLedgerEntry({
  account,
  ledgerEntry,
  idempotencyKey,
}: {
  account: Awaited<ReturnType<typeof ensureBuyerCreditAccount>>;
  ledgerEntry: BuyerCreditLedgerEntryProjection;
  idempotencyKey?: string | null;
}) {
  const existingApproveUrl = ledgerMetadataValue(
    ledgerEntry,
    "paypalApproveUrl"
  );
  const existingPayPalOrderId =
    ledgerEntry.reference ?? ledgerMetadataValue(ledgerEntry, "paypalOrderId");

  if (existingApproveUrl && existingPayPalOrderId) {
    return {
      account,
      approveUrl: existingApproveUrl,
      ledgerEntry,
      paypalOrderId: existingPayPalOrderId,
    };
  }

  const { order, approveUrl } = await createPayPalCreditTopUpOrder({
    ledgerEntryId: ledgerEntry.id,
    amount: ledgerEntry.amount,
    currency: ledgerEntry.currency,
    idempotencyKey: idempotencyKey ?? ledgerEntry.id,
  });
  const updatedLedgerEntry = await updateBuyerCreditLedgerEntryById({
    id: ledgerEntry.id,
    reference: order.id,
    metadata: {
      fundingSource: "paypal_direct",
      processor: "paypal",
      processorReference: order.id,
      paypalOrderId: order.id,
      paypalOrderStatus: order.status,
      paypalApproveUrl: approveUrl,
    },
  });

  if (!updatedLedgerEntry) {
    throw new Error("PayPal top-up ledger entry could not be updated");
  }

  return {
    account,
    approveUrl,
    ledgerEntry: updatedLedgerEntry,
    paypalOrderId: order.id,
  };
}

export async function createPayPalBuyerCreditTopUpOrder({
  ownerId,
  amount,
  currency = "USD",
  idempotencyKey,
}: {
  ownerId: string;
  amount: string;
  currency?: string;
  idempotencyKey?: string | null;
}) {
  const normalizedAmount = normalizeMoneyAmount(amount);
  const account = await ensureBuyerCreditAccount({
    ownerId,
    currency,
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
      if (existingLedgerEntry.status === "failed") {
        throw new Error("Existing PayPal top-up failed. Reload and try again.");
      }

      return attachPayPalOrderToLedgerEntry({
        account,
        ledgerEntry: existingLedgerEntry,
        idempotencyKey,
      });
    }
  }

  const ledgerEntryId = generateUUID();
  const result = await createPendingBuyerCreditTopUp({
    ownerId,
    amount: normalizedAmount,
    currency: account.currency,
    fundingSource: "paypal_direct",
    reference: null,
    ledgerEntryId,
    idempotencyKey,
    metadata: {
      fundingSource: "paypal_direct",
      processor: "paypal",
      paypalOrderStatus: "creating",
    },
  });

  try {
    return await attachPayPalOrderToLedgerEntry({
      account: result.account,
      ledgerEntry: result.ledgerEntry,
      idempotencyKey: idempotencyKey ?? ledgerEntryId,
    });
  } catch (error) {
    await failBuyerCreditTopUpLedgerEntry({
      id: result.ledgerEntry.id,
      metadata: {
        fundingSource: "paypal_direct",
        processor: "paypal",
        paypalOrderStatus: "create_failed",
        paypalOrderError:
          error instanceof Error ? error.message.slice(0, 500) : "unknown",
      },
    });

    throw error;
  }
}

export async function capturePayPalBuyerCreditTopUp({
  ownerId,
  ledgerEntryId,
  paypalOrderId,
}: {
  ownerId: string;
  ledgerEntryId?: string | null;
  paypalOrderId: string;
}) {
  const account = await getBuyerCreditAccountByOwnerId({
    ownerId,
  });

  if (!account) {
    throw new Error("Buyer credit account not found");
  }

  const ledgerEntry = ledgerEntryId
    ? await getBuyerCreditLedgerEntryById({ id: ledgerEntryId })
    : await getBuyerCreditLedgerEntryByReference({ reference: paypalOrderId });

  if (!ledgerEntry) {
    throw new Error("Buyer credit ledger entry not found");
  }

  if (ledgerEntry.buyerCreditAccountId !== account.id) {
    throw new Error("Forbidden");
  }

  const expectedPayPalOrderId =
    ledgerEntry.reference ?? ledgerMetadataValue(ledgerEntry, "paypalOrderId");

  if (expectedPayPalOrderId && expectedPayPalOrderId !== paypalOrderId) {
    throw new Error("PayPal order does not match buyer-credit ledger entry");
  }

  if (ledgerEntry.status === "settled") {
    return {
      account,
      ledgerEntry,
      paypalOrderId,
      paypalCaptureId: ledgerMetadataValue(ledgerEntry, "paypalCaptureId"),
    };
  }

  const capturedOrder = await capturePayPalOrder({
    paypalOrderId,
    idempotencyKey: ledgerEntry.id,
  });
  const capture = extractCaptureDetailsFromPayPalOrder(capturedOrder);

  assertPayPalCaptureMatchesLedger({ ledgerEntry, capture });

  if (capture.status !== "COMPLETED" && capturedOrder.status !== "COMPLETED") {
    throw new Error("PayPal order was not completed");
  }

  const settled = await settleBuyerCreditTopUpLedgerEntry({
    id: ledgerEntry.id,
    reference: paypalOrderId,
    metadata: {
      fundingSource: "paypal_direct",
      processor: "paypal",
      processorReference: capture.paypalCaptureId ?? paypalOrderId,
      paypalOrderId,
      paypalOrderStatus: capturedOrder.status,
      paypalCaptureId: capture.paypalCaptureId,
      paypalCaptureStatus: capture.status,
      verifiedAmount: capture.amount ?? ledgerEntry.amount,
    },
  });

  return {
    ...settled,
    paypalOrderId,
    paypalCaptureId: capture.paypalCaptureId,
  };
}

export async function handlePayPalBuyerCreditWebhookEvent(
  event: PayPalWebhookEvent
) {
  const eventType = event.event_type ?? "unknown";

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const capture = extractCaptureDetailsFromWebhookEvent(event);
    const ledgerEntry = await findPayPalLedgerEntry(capture);

    if (!ledgerEntry) {
      return { handled: "ignored:unmatched_capture" };
    }

    assertPayPalCaptureMatchesLedger({ ledgerEntry, capture });

    const settled = await settleBuyerCreditTopUpLedgerEntry({
      id: ledgerEntry.id,
      reference: capture.paypalOrderId ?? ledgerEntry.reference,
      metadata: {
        fundingSource: "paypal_direct",
        processor: "paypal",
        processorReference: capture.paypalCaptureId ?? capture.paypalOrderId,
        paypalOrderId: capture.paypalOrderId,
        paypalCaptureId: capture.paypalCaptureId,
        paypalCaptureStatus: capture.status,
        paypalWebhookEventId: event.id,
        paypalWebhookEventType: eventType,
        verifiedAmount: capture.amount ?? ledgerEntry.amount,
      },
    });

    return {
      handled: "settled",
      ledgerEntry: settled.ledgerEntry,
      account: settled.account,
    };
  }

  if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "PAYMENT.CAPTURE.DECLINED" ||
    eventType === "PAYMENT.CAPTURE.FAILED"
  ) {
    const capture = extractCaptureDetailsFromWebhookEvent(event);
    const ledgerEntry = await findPayPalLedgerEntry(capture);

    if (!ledgerEntry) {
      return { handled: "ignored:unmatched_capture" };
    }

    const failed = await failBuyerCreditTopUpLedgerEntry({
      id: ledgerEntry.id,
      reference: capture.paypalOrderId ?? ledgerEntry.reference,
      metadata: {
        fundingSource: "paypal_direct",
        processor: "paypal",
        processorReference: capture.paypalCaptureId ?? capture.paypalOrderId,
        paypalOrderId: capture.paypalOrderId,
        paypalCaptureId: capture.paypalCaptureId,
        paypalCaptureStatus: capture.status,
        paypalWebhookEventId: event.id,
        paypalWebhookEventType: eventType,
      },
    });

    return {
      handled: "failed",
      ledgerEntry: failed.ledgerEntry,
      account: failed.account,
    };
  }

  return { handled: "ignored:event_type" };
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
  metadata,
  source = "api.buyer_credits.apply",
}: {
  requestId: string;
  actorUserId: string;
  amount: string;
  idempotencyKey?: string | null;
  metadata?: RequestTransactionMetadata | null;
  source?: string;
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
      if (
        existingLedgerEntry.requestId &&
        existingLedgerEntry.requestId !== requestId
      ) {
        throw new Error("Idempotency key already used for another request");
      }

      if (existingLedgerEntry.amount !== normalizedAmount) {
        throw new Error("Idempotency key already used for another amount");
      }

      if (existingLedgerEntry.status !== "settled") {
        throw new Error("Buyer credit application is still settling");
      }

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

      throw new Error("Buyer credit application is missing transaction truth");
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
      ...(metadata ?? {}),
      fundingSource: "buyer_credit",
      creditLedgerEntryId: ledgerEntryId,
      creditAmountApplied: normalizedAmount,
    },
    idempotencyKey,
    source,
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
      ...(metadata ?? {}),
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

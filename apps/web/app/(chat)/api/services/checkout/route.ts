import { z } from "zod";
import {
  getBuyerCreditLedgerEntryByIdempotencyKey,
  getUserById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { compareMoneyAmounts } from "@/lib/payment";
import {
  applyBuyerCreditToRequest,
  getBuyerCreditSummary,
} from "@/lib/payment-server";
import { getRequestActorContext } from "@/lib/resolver-session";
import {
  ensureRequestDraftForChat,
  openRequestDraft,
  persistRequestPatch,
  setRequestPreferredSupply,
} from "@/lib/request-server";
import {
  buildWorkerBackedServiceCheckoutBrief,
  getWorkerBackedServiceCheckoutConfig,
} from "@/lib/service-checkout";
import { getServicePlan } from "@/lib/service-catalog";
import { createBorealWorkerStarterSupply } from "@/lib/supply-server";
import { generateUUID } from "@/lib/utils";

export const maxDuration = 60;

const checkoutSchema = z.object({
  serviceFamilyKey: z.string().trim().min(1).max(120),
  servicePlanKey: z.string().trim().min(1).max(120),
  primaryText: z.string().trim().min(1).max(12_000),
  audience: z.string().trim().max(1000).default(""),
  tone: z.string().trim().max(1000).default(""),
  referenceAssets: z.string().trim().max(2000).default(""),
  constraints: z.string().trim().max(2000).default(""),
  idempotencyKey: z.string().uuid().nullable().optional(),
});

function getCheckoutIdempotencyKey({
  request,
  bodyIdempotencyKey,
}: {
  request: Request;
  bodyIdempotencyKey?: string | null;
}) {
  const headerIdempotencyKey = request.headers.get("Idempotency-Key");

  if (
    headerIdempotencyKey &&
    bodyIdempotencyKey &&
    headerIdempotencyKey !== bodyIdempotencyKey
  ) {
    throw new Error("Idempotency-Key header and body idempotencyKey must match.");
  }

  const rawKey = headerIdempotencyKey ?? bodyIdempotencyKey ?? generateUUID();

  if (!z.string().uuid().safeParse(rawKey).success) {
    throw new Error("Idempotency-Key must be a UUID.");
  }

  return rawKey;
}

function checkoutErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "Forbidden") {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  if (
    error instanceof Error &&
    [
      "Request not found",
      "Supply not found",
      "Buyer credit account not found",
    ].includes(error.message)
  ) {
    return new ChatbotError("not_found:database", error.message).toResponse();
  }

  if (
    error instanceof Error &&
    [
      "Buyer credit account is not active",
      "Insufficient buyer credit",
      "Idempotency key already used for another request",
      "Idempotency key already used for another amount",
      "Buyer credit application is still settling",
      "Buyer credit application is missing transaction truth",
      "Idempotency-Key header and body idempotencyKey must match.",
      "Idempotency-Key must be a UUID.",
      "Money amount must be a positive decimal with two cents.",
      "Money amount must be greater than zero.",
      "Preferred supply is only available for private requests",
      "Supply does not belong to request owner",
      "Published supply required",
      "Request not ready to open",
      "Only draft requests can be opened",
      "Unsupported worker-backed service checkout plan.",
      "Service plan not found.",
      "Retired starter supply cannot be reused",
      "Starter supply factory not found",
    ].includes(error.message)
  ) {
    return new ChatbotError("bad_request:api", error.message).toResponse();
  }

  return new ChatbotError(
    "bad_request:database",
    "Failed to complete worker-backed service checkout."
  ).toResponse();
}

export async function POST(request: Request) {
  const actor = await getRequestActorContext(request);
  if (!actor || actor.kind !== "session") {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const existingUser = await getUserById({ id: actor.userId });
  if (!existingUser) {
    return new ChatbotError(
      "unauthorized:auth",
      "Your local session points to a deleted user record. Sign out, then sign in again."
    ).toResponse();
  }

  let body: z.infer<typeof checkoutSchema>;
  try {
    body = checkoutSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "Invalid worker-backed service checkout body."
    ).toResponse();
  }

  try {
    const idempotencyKey = getCheckoutIdempotencyKey({
      request,
      bodyIdempotencyKey: body.idempotencyKey,
    });
    const config = getWorkerBackedServiceCheckoutConfig({
      serviceFamilyKey: body.serviceFamilyKey,
      servicePlanKey: body.servicePlanKey,
    });
    if (!config) {
      throw new Error("Unsupported worker-backed service checkout plan.");
    }

    const servicePlan = getServicePlan({
      familyKey: config.serviceFamilyKey,
      planKey: config.servicePlanKey,
    });
    if (!servicePlan) {
      throw new Error("Service plan not found.");
    }

    const creditSummary = await getBuyerCreditSummary({
      ownerId: actor.userId,
      currency: config.currency,
    });
    const existingCheckoutLedgerEntry =
      await getBuyerCreditLedgerEntryByIdempotencyKey({
        buyerCreditAccountId: creditSummary.account.id,
        idempotencyKey,
      });

    if (
      !existingCheckoutLedgerEntry &&
      compareMoneyAmounts(
        creditSummary.account.availableBalance,
        config.amount
      ) < 0
    ) {
      throw new Error("Insufficient buyer credit");
    }

    const supply = await createBorealWorkerStarterSupply({
      userId: actor.userId,
      workerKey: config.workerKey,
      publish: true,
    });
    const chatId = idempotencyKey;
    const initialRequest = await ensureRequestDraftForChat({
      chatId,
      userId: actor.userId,
      visibility: "private",
    });

    if (initialRequest.status !== "draft") {
      const creditPayment = await applyBuyerCreditToRequest({
        requestId: initialRequest.id,
        actorUserId: actor.userId,
        amount: config.amount,
        idempotencyKey,
        metadata: {
          serviceFamilyKey: config.serviceFamilyKey,
          servicePlanKey: config.servicePlanKey,
          selectedSupplyId: initialRequest.routing.preferredSupplyId,
          source: "worker_backed_service_checkout",
          usageKind: "first_party_service_checkout",
          workerKey: config.workerKey,
        },
      });

      return Response.json(
        {
          ...creditPayment,
          chatId,
          supply,
          checkout: {
            amount: config.amount,
            currency: config.currency,
            serviceFamilyKey: config.serviceFamilyKey,
            servicePlanKey: config.servicePlanKey,
            workerKey: config.workerKey,
          },
          execution: {
            status: "pending_authorized_fulfillment",
            fulfillmentStarted: false,
            providerCallsAllowedBeforeFulfillment: false,
            nextAction: "open_request_workroom",
          },
        },
        { status: 200 }
      );
    }

    const { family, plan } = servicePlan;
    const patchedRequest = await persistRequestPatch({
      requestId: initialRequest.id,
      userId: actor.userId,
      patch: {
        brief: {
          title: `${family.title}: ${plan.label}`,
          summary: plan.summary,
          body: buildWorkerBackedServiceCheckoutBrief({
            config,
            family,
            input: body,
            plan,
          }),
          constraints: {
            serviceFamilyKey: config.serviceFamilyKey,
            servicePlanKey: config.servicePlanKey,
            checkoutMode: "worker_backed_credit_request",
            checkoutAttachmentMode: "selected_supply_attached_after_checkout",
            providerCallsAllowedBeforeFulfillment: false,
            serviceCheckoutAmount: config.amount,
            serviceCheckoutCurrency: config.currency,
            workerKey: config.workerKey,
          },
          outputKinds: family.requestDefaults.outputKinds,
          tags: [
            ...family.tags,
            "first_party_credit",
            "worker_backed_service",
          ],
        },
        seeking: {
          actorKinds: family.requestDefaults.actorKinds,
          supplyKinds: family.requestDefaults.supplyKinds,
          teamMode: "solo_or_team",
          notes:
            "Checkout pins a first-party Boreal worker Supply; execution still waits for governed Fulfillment and proof.",
        },
        budget: {
          mode: "fixed",
          currency: config.currency,
          fixedAmount: Number.parseFloat(config.amount),
          notes:
            "Paid with first-party Boreal buyer credits for a worker-backed service checkout.",
        },
        deadline: {
          notes: `Target turnaround is ${plan.turnaround} after usable inputs are present.`,
        },
        derived: {
          executionKind: family.requestDefaults.executionKind,
          matchingMode: family.requestDefaults.matchingMode,
          paymentMode: family.requestDefaults.paymentMode,
          routeFamily: family.requestDefaults.routeFamily,
        },
      },
    });
    const routedRequest = await setRequestPreferredSupply({
      requestId: patchedRequest.id,
      userId: actor.userId,
      preferredSupplyId: supply.id,
    });
    const openedRequest = await openRequestDraft({
      requestId: routedRequest.id,
      userId: actor.userId,
    });
    const creditPayment = await applyBuyerCreditToRequest({
      requestId: openedRequest.id,
      actorUserId: actor.userId,
      amount: config.amount,
      idempotencyKey,
      metadata: {
        serviceFamilyKey: config.serviceFamilyKey,
        servicePlanKey: config.servicePlanKey,
        selectedSupplyId: supply.id,
        source: "worker_backed_service_checkout",
        usageKind: "first_party_service_checkout",
        workerKey: config.workerKey,
      },
    });

    return Response.json(
      {
        ...creditPayment,
        chatId,
        supply,
        checkout: {
          amount: config.amount,
          currency: config.currency,
          serviceFamilyKey: config.serviceFamilyKey,
          servicePlanKey: config.servicePlanKey,
          workerKey: config.workerKey,
        },
        execution: {
          status: "pending_authorized_fulfillment",
          fulfillmentStarted: false,
          providerCallsAllowedBeforeFulfillment: false,
          nextAction: "open_request_workroom",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}

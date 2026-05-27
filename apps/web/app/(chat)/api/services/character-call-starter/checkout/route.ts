import { z } from "zod";
import {
  getBuyerCreditLedgerEntryByIdempotencyKey,
  getUserById,
} from "@/lib/db/queries";
import { bootstrapCharacterCallStarterFulfillment } from "@/lib/character-call-fulfillment";
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
import { generateUUID } from "@/lib/utils";
import { createRunwayCharacterCallStarterWorkflowPack } from "@/lib/workflow-pack-server";
import { createCharacterCallStarterSupplyDraft } from "@/lib/workflow-supply-server";

export const maxDuration = 60;

const CHECKOUT_AMOUNT = "1.00";

const callGoalLabels = {
  personal_fun: "Personal fun or fan character",
  sales_demo: "Sales or product demo",
  practice_room: "Practice or roleplay room",
  education_host: "Education or explainer host",
} as const;

const checkoutSchema = z.object({
  characterName: z.string().trim().min(1).max(80),
  callGoal: z
    .enum([
      "personal_fun",
      "sales_demo",
      "practice_room",
      "education_host",
    ])
    .default("personal_fun"),
  personalityNotes: z.string().trim().min(1).max(2000),
  referenceImageDescription: z.string().trim().max(1000).default(""),
  allowedTopics: z.string().trim().max(1000).default(""),
  blockedTopics: z.string().trim().max(1000).default(""),
  firstMessage: z.string().trim().max(500).default(""),
  idempotencyKey: z.string().uuid().nullable().optional(),
});

function getCheckoutIdempotencyKey({
  request,
  bodyIdempotencyKey,
}: {
  request: Request;
  bodyIdempotencyKey?: string | null;
}) {
  const rawKey =
    request.headers.get("Idempotency-Key") ??
    bodyIdempotencyKey ??
    generateUUID();

  if (!z.string().uuid().safeParse(rawKey).success) {
    throw new Error("Idempotency-Key must be a UUID.");
  }

  return rawKey;
}

function buildStarterBriefBody(input: z.infer<typeof checkoutSchema>) {
  const allowedTopics =
    input.allowedTopics || "Buyer will confirm the allowed topics in-thread.";
  const blockedTopics =
    input.blockedTopics ||
    "No celebrity imitation, non-consensual likeness, minors, therapy treatment, regulated advice, or unsafe claims.";
  const referenceAsset =
    input.referenceImageDescription ||
    "Buyer will upload one approved reference image in the request thread.";
  const firstMessage =
    input.firstMessage ||
    "Boreal may draft the first message after persona review.";

  return [
    "Service: Character Call Starter / Starter Call.",
    `Character name: ${input.characterName}.`,
    `Call goal: ${callGoalLabels[input.callGoal]}.`,
    `Reference asset: ${referenceAsset}`,
    `Personality notes: ${input.personalityNotes}`,
    `Allowed topics: ${allowedTopics}`,
    `Blocked topics: ${blockedTopics}`,
    `First message direction: ${firstMessage}`,
    "Done means Boreal delivers a working Runway character-call handoff, persona sheet, one test-call note set, and delivery receipt.",
  ].join("\n");
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
      "Money amount must be a positive decimal with two cents.",
      "Money amount must be greater than zero.",
      "Preferred supply is only available for private requests",
      "Supply does not belong to request owner",
      "Published supply required",
      "Request not ready to open",
      "Only draft requests can be opened",
      "Idempotency-Key must be a UUID.",
    ].includes(error.message)
  ) {
    return new ChatbotError("bad_request:api", error.message).toResponse();
  }

  return new ChatbotError(
    "bad_request:database",
    "Failed to complete Character Call Starter checkout."
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
      "Invalid Character Call Starter checkout body."
    ).toResponse();
  }

  try {
    const idempotencyKey = getCheckoutIdempotencyKey({
      request,
      bodyIdempotencyKey: body.idempotencyKey,
    });
    const creditSummary = await getBuyerCreditSummary({
      ownerId: actor.userId,
      currency: "USD",
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
        CHECKOUT_AMOUNT
      ) < 0
    ) {
      throw new Error("Insufficient buyer credit");
    }

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
        amount: CHECKOUT_AMOUNT,
        idempotencyKey,
      });
      const fulfillmentBootstrap =
        await bootstrapCharacterCallStarterFulfillment({
          requestId: initialRequest.id,
          actorUserId: actor.userId,
          supplyId: initialRequest.routing.preferredSupplyId,
          input: body,
          idempotencyKey,
        }).catch((error) => ({
          error:
            error instanceof Error
              ? error.message
              : "Failed to bootstrap fulfillment.",
        }));

      return Response.json(
        {
          ...creditPayment,
          fulfillmentBootstrap,
          chatId,
          supply: null,
          workflowPack: null,
          workflowPackVersion: null,
          checkout: {
            amount: CHECKOUT_AMOUNT,
            currency: "USD",
            serviceFamilyKey: "character-call-starter",
            servicePlanKey: "starter-call",
          },
        },
        { status: 200 }
      );
    }

    const workflow = await createRunwayCharacterCallStarterWorkflowPack({
      userId: actor.userId,
      packStatus: "active",
      provenance: {
        kind: "first_party",
        sourcePlatform: "boreal",
        licenseNotes: "Boreal-curated Character Call Starter checkout supply.",
      },
    });
    const supply = await createCharacterCallStarterSupplyDraft({
      userId: actor.userId,
      workflowPackVersionId: workflow.workflowPackVersion.id,
      publish: true,
    });

    const patchedRequest = await persistRequestPatch({
      requestId: initialRequest.id,
      userId: actor.userId,
      patch: {
        brief: {
          title: `Character Call Starter: ${body.characterName}`,
          summary:
            "Create a live Runway character-call setup from one approved image and persona brief.",
          body: buildStarterBriefBody(body),
          constraints: {
            serviceFamilyKey: "character-call-starter",
            servicePlanKey: "starter-call",
            providerKey: "runway",
            model: "gwm1_avatars",
            callGoal: body.callGoal,
            characterName: body.characterName,
            referenceImageDescription: body.referenceImageDescription || null,
            firstMessage: body.firstMessage || null,
            safety: {
              noCelebrityImitation: true,
              noNonConsensualLikeness: true,
              noMinorsWithoutGuardianControl: true,
              noTherapyTreatmentOrRegulatedAdvice: true,
            },
          },
          outputKinds: ["media", "handoff_doc", "delivery"],
          tags: [
            "character_call",
            "runway",
            "starter_call",
            "first_party_credit",
          ],
        },
        seeking: {
          actorKinds: ["human", "agent", "tool"],
          supplyKinds: [
            "provider_capability",
            "video_generation",
            "documentation_support",
          ],
          teamMode: "solo_or_team",
          notes:
            "Boreal supplies persona shaping, Runway setup direction, operator review, and delivery proof.",
        },
        budget: {
          mode: "fixed",
          currency: "USD",
          fixedAmount: 1,
          notes:
            "Paid with first-party Boreal buyer credits for Character Call Starter.",
        },
        deadline: {
          notes: "Target turnaround is 24 hours after usable assets are present.",
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
      amount: CHECKOUT_AMOUNT,
      idempotencyKey,
    });
    const fulfillmentBootstrap =
      await bootstrapCharacterCallStarterFulfillment({
        requestId: creditPayment.request.id,
        actorUserId: actor.userId,
        supplyId: supply.id,
        input: body,
        idempotencyKey,
      }).catch((error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Failed to bootstrap fulfillment.",
      }));

    return Response.json(
      {
        ...creditPayment,
        fulfillmentBootstrap,
        chatId,
        supply,
        workflowPack: workflow.workflowPack,
        workflowPackVersion: workflow.workflowPackVersion,
        checkout: {
          amount: CHECKOUT_AMOUNT,
          currency: "USD",
          serviceFamilyKey: "character-call-starter",
          servicePlanKey: "starter-call",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}

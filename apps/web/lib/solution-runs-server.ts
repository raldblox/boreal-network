import "server-only";

import {
  getArtifactById,
  getBuyerCreditLedgerEntryByIdempotencyKey,
  getRequestById,
  toRequestDraft,
} from "@/lib/db/queries";
import {
  compareMoneyAmounts,
  normalizeMoneyAmount,
  type RequestTransactionMetadata,
} from "@/lib/payment";
import {
  applyBuyerCreditToRequest,
  getBuyerCreditSummary,
} from "@/lib/payment-server";
import {
  type BorealRequestDraft,
  hasPublicSolutionProjectionTruth,
  type RequestArtifactKind,
  toPublicRequestPoolEntry,
} from "@/lib/request";
import {
  ensureRequestDraftForChat,
  openRequestDraft,
  persistRequestPatch,
} from "@/lib/request-server";

type SolutionRunInput = {
  actorUserId: string;
  sourceRequestId: string;
  acceptedArtifactId?: string | null;
  amount: string | number;
  customization?: string | null;
  idempotencyKey: string;
};

type SourceArtifactProjection = {
  id: string;
  requestId: string;
  kind: RequestArtifactKind;
  title: string;
  summary?: string | null;
  containerKind: string;
};

function getRunTitle(sourceRequest: BorealRequestDraft) {
  return `Run: ${sourceRequest.brief.title || "Public solution"}`;
}

function buildRunBody({
  sourceArtifact,
  sourceRequest,
  customization,
}: {
  sourceArtifact: SourceArtifactProjection;
  sourceRequest: BorealRequestDraft;
  customization?: string | null;
}) {
  return [
    `Run the accepted public solution from request ${sourceRequest.id}.`,
    `Source request: ${sourceRequest.brief.title || sourceRequest.key}.`,
    `Accepted artifact: ${sourceArtifact.title} (${sourceArtifact.id}).`,
    customization?.trim()
      ? `Customization: ${customization.trim()}`
      : "Customization: reuse the accepted solution as-is unless the worker needs clarifying inputs.",
    "Done means Boreal creates a private run request, spends credits only for live execution capacity, and delivers new artifacts in this request thread.",
  ].join("\n");
}

function projectSourceArtifact(
  artifact: NonNullable<Awaited<ReturnType<typeof getArtifactById>>>,
): SourceArtifactProjection {
  return {
    id: artifact.id,
    requestId: artifact.requestId,
    kind: artifact.kind,
    title: artifact.title,
    summary: artifact.summary,
    containerKind: artifact.container.kind,
  };
}

function buildSolutionRunMetadata({
  amount,
  customization,
  sourceArtifact,
  sourceRequest,
}: {
  amount: string;
  customization?: string | null;
  sourceArtifact: SourceArtifactProjection;
  sourceRequest: BorealRequestDraft;
}): RequestTransactionMetadata {
  return {
    profile: "public_solution_run_v0",
    sourceRequestId: sourceRequest.id,
    sourceRequestKey: sourceRequest.key,
    sourceArtifactId: sourceArtifact.id,
    sourceArtifactKind: sourceArtifact.kind,
    sourceArtifactTitle: sourceArtifact.title,
    creditAmountApplied: amount,
    customization: customization?.trim() || null,
  };
}

async function assertRunnablePublicSolution({
  acceptedArtifactId,
  sourceRequestId,
}: {
  acceptedArtifactId?: string | null;
  sourceRequestId: string;
}) {
  const sourceRecord = await getRequestById({ id: sourceRequestId });
  if (!sourceRecord) {
    throw new Error("Source request not found");
  }

  const sourceRequest = toRequestDraft(sourceRecord);
  if (!hasPublicSolutionProjectionTruth(sourceRequest)) {
    throw new Error("Source request is not a public solution");
  }

  const sourceAcceptedArtifactId = sourceRequest.activeRefs.acceptedArtifactId;
  const normalizedArtifactId =
    acceptedArtifactId?.trim() || sourceAcceptedArtifactId;

  if (
    !sourceAcceptedArtifactId ||
    normalizedArtifactId !== sourceAcceptedArtifactId
  ) {
    throw new Error("Accepted artifact does not match public solution");
  }

  const sourceArtifact = await getArtifactById({ id: normalizedArtifactId });
  if (!sourceArtifact || sourceArtifact.requestId !== sourceRequest.id) {
    throw new Error("Accepted artifact not found");
  }

  return {
    sourceRequest,
    sourceArtifact: projectSourceArtifact(sourceArtifact),
  };
}

export async function createPublicSolutionRunRequest({
  acceptedArtifactId,
  actorUserId,
  amount,
  customization,
  idempotencyKey,
  sourceRequestId,
}: SolutionRunInput) {
  const normalizedAmount = normalizeMoneyAmount(amount);
  const { sourceArtifact, sourceRequest } = await assertRunnablePublicSolution({
    acceptedArtifactId,
    sourceRequestId,
  });
  const creditSummary = await getBuyerCreditSummary({
    ownerId: actorUserId,
    currency: "USD",
  });
  const existingLedgerEntry = await getBuyerCreditLedgerEntryByIdempotencyKey({
    buyerCreditAccountId: creditSummary.account.id,
    idempotencyKey,
  });

  if (
    !existingLedgerEntry &&
    compareMoneyAmounts(
      creditSummary.account.availableBalance,
      normalizedAmount,
    ) < 0
  ) {
    throw new Error("Insufficient buyer credit");
  }

  const runRequest = await ensureRequestDraftForChat({
    chatId: idempotencyKey,
    userId: actorUserId,
    visibility: "private",
  });
  const transactionMetadata = buildSolutionRunMetadata({
    amount: normalizedAmount,
    customization,
    sourceArtifact,
    sourceRequest,
  });

  if (runRequest.status !== "draft") {
    const creditPayment = await applyBuyerCreditToRequest({
      requestId: runRequest.id,
      actorUserId,
      amount: normalizedAmount,
      idempotencyKey,
      metadata: transactionMetadata,
      source: "api.requests.solution_runs.create",
    });

    return {
      ...creditPayment,
      chatId: runRequest.chatId,
      sourceArtifact,
      sourceRequest: toPublicRequestPoolEntry(sourceRequest),
      solutionRun: {
        profile: "public_solution_run_v0",
        amount: normalizedAmount,
        currency: "USD",
        runRequestId: creditPayment.request.id,
        sourceArtifactId: sourceArtifact.id,
        sourceRequestId: sourceRequest.id,
      },
    };
  }

  const sourceOutputKinds = sourceRequest.brief.outputKinds ?? [];
  const sourceActorKinds = sourceRequest.seeking.actorKinds ?? [];
  const sourceSupplyKinds = sourceRequest.seeking.supplyKinds ?? [];
  const patchedRequest = await persistRequestPatch({
    requestId: runRequest.id,
    userId: actorUserId,
    patch: {
      brief: {
        title: getRunTitle(sourceRequest),
        summary: `Credit-metered reuse of accepted public solution: ${sourceRequest.brief.title || sourceRequest.key}.`,
        body: buildRunBody({ sourceArtifact, sourceRequest, customization }),
        constraints: {
          executionModes: ["remote_digital"],
          requiresVerifiedEvidence: false,
          solutionRun: {
            profile: "public_solution_run_v0",
            sourceRequestId: sourceRequest.id,
            sourceRequestKey: sourceRequest.key,
            sourceArtifactId: sourceArtifact.id,
            sourceArtifactKind: sourceArtifact.kind,
            sourceArtifactTitle: sourceArtifact.title,
            customization: customization?.trim() || null,
          },
        },
        outputKinds:
          sourceOutputKinds.length > 0 ? sourceOutputKinds : ["delivery"],
        tags: Array.from(
          new Set([
            ...(sourceRequest.brief.tags ?? []),
            "public_solution_run",
            "solution_reuse",
            "first_party_credit",
          ]),
        ),
      },
      seeking: {
        actorKinds:
          sourceActorKinds.length > 0
            ? sourceActorKinds
            : ["agent", "tool", "human"],
        supplyKinds:
          sourceSupplyKinds.length > 0
            ? sourceSupplyKinds
            : ["agent_worker", "provider_capability", "human_service"],
        teamMode: "solo_or_team",
        notes:
          "Run an accepted public solution as a new private request while preserving source request and artifact references.",
      },
      budget: {
        mode: "fixed",
        currency: "USD",
        fixedAmount: Number(normalizedAmount),
        notes:
          "Paid with first-party Boreal buyer credits for a public solution run.",
      },
      deadline: {
        notes:
          "Run starts after credits settle and any worker-specific input checks pass.",
      },
      derived: {
        routeFamily: "worker_market",
        executionKind: "hybrid_tool_room",
        paymentMode: "fixed_funded_request",
        matchingMode: "lead_first_then_collaborators",
        routeSummary:
          "Run the accepted public solution as a new private request that references the source artifact and writes new proof to the run request.",
      },
    },
  });
  const openedRequest = await openRequestDraft({
    requestId: patchedRequest.id,
    userId: actorUserId,
  });
  const creditPayment = await applyBuyerCreditToRequest({
    requestId: openedRequest.id,
    actorUserId,
    amount: normalizedAmount,
    idempotencyKey,
    metadata: transactionMetadata,
    source: "api.requests.solution_runs.create",
  });

  return {
    ...creditPayment,
    chatId: openedRequest.chatId,
    sourceArtifact,
    sourceRequest: toPublicRequestPoolEntry(sourceRequest),
    solutionRun: {
      profile: "public_solution_run_v0",
      amount: normalizedAmount,
      currency: "USD",
      runRequestId: creditPayment.request.id,
      sourceArtifactId: sourceArtifact.id,
      sourceRequestId: sourceRequest.id,
    },
  };
}

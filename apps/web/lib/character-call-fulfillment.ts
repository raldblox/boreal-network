import "server-only";

import { createHash } from "node:crypto";
import { generateText } from "ai";
import { titleModel } from "@/lib/ai/models";
import { getTitleModel } from "@/lib/ai/providers";
import {
  createFulfillmentForRequestById,
  publishArtifactForRequestById,
  updateFulfillmentForRequestById,
} from "@/lib/request-server";

export type CharacterCallGoal =
  | "personal_fun"
  | "sales_demo"
  | "practice_room"
  | "education_host";

export type CharacterCallStarterFulfillmentInput = {
  characterName: string;
  callGoal: CharacterCallGoal;
  personalityNotes: string;
  referenceImageDescription?: string;
  allowedTopics?: string;
  blockedTopics?: string;
  firstMessage?: string;
};

const callGoalLabels: Record<CharacterCallGoal, string> = {
  personal_fun: "Personal fun or fan character",
  sales_demo: "Sales or product demo",
  practice_room: "Practice or roleplay room",
  education_host: "Education or explainer host",
};

function derivedUuid(baseKey: string, label: string) {
  const hash = createHash("sha256").update(`${baseKey}:${label}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, "0")}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function normalizeLine(value?: string) {
  return value?.trim() || "Not provided yet.";
}

function renderFallbackPersonaSheet(input: CharacterCallStarterFulfillmentInput) {
  return [
    "# Character Persona Sheet",
    "",
    `Character: ${input.characterName}`,
    `Call goal: ${callGoalLabels[input.callGoal]}`,
    "",
    "## Personality",
    normalizeLine(input.personalityNotes),
    "",
    "## Reference Asset",
    normalizeLine(input.referenceImageDescription),
    "",
    "## Allowed Topics",
    normalizeLine(input.allowedTopics),
    "",
    "## Blocked Topics",
    input.blockedTopics?.trim() ||
      "No celebrity imitation, non-consensual likeness, minors, therapy treatment, regulated advice, or unsafe claims.",
    "",
    "## First Message Direction",
    normalizeLine(input.firstMessage),
    "",
    "## Operator Notes",
    "Use this as the source persona for the Runway Character setup. Before session launch, confirm the uploaded image is buyer-approved, clear, centered, and safe to use.",
  ].join("\n");
}

async function generatePersonaSheet(input: CharacterCallStarterFulfillmentInput) {
  const fallback = renderFallbackPersonaSheet(input);

  try {
    const { text } = await Promise.race([
      generateText({
        model: getTitleModel(),
        system:
          "You write concise, production-safe AI character persona sheets for Boreal service fulfillment. Return markdown only. Do not claim that a Runway avatar has already been created.",
        prompt: [
          `Character name: ${input.characterName}`,
          `Call goal: ${callGoalLabels[input.callGoal]}`,
          `Personality notes: ${input.personalityNotes}`,
          `Reference image note: ${normalizeLine(input.referenceImageDescription)}`,
          `Allowed topics: ${normalizeLine(input.allowedTopics)}`,
          `Blocked topics: ${normalizeLine(input.blockedTopics)}`,
          `First message direction: ${normalizeLine(input.firstMessage)}`,
          "Create sections: Character Core, Voice And Behavior, Allowed Topics, Blocked Topics, First Message, Runway Setup Notes, Review Checklist.",
        ].join("\n"),
        providerOptions: {
          gateway: { order: titleModel.gatewayOrder },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OpenAI persona generation timed out")), 8000)
      ),
    ]);

    return text.trim().length > 0 ? text.trim() : fallback;
  } catch {
    return fallback;
  }
}

function renderRunwayLaunchHandoff({
  fulfillmentId,
  input,
  requestId,
}: {
  fulfillmentId: string;
  input: CharacterCallStarterFulfillmentInput;
  requestId: string;
}) {
  return [
    "# Runway Character Launch Handoff",
    "",
    "## Current State",
    "Payment is settled from Boreal buyer credits. The fulfillment lane is open and waiting for the approved character image or existing Runway avatar id.",
    "",
    "## Buyer Inputs",
    `Character: ${input.characterName}`,
    `Goal: ${callGoalLabels[input.callGoal]}`,
    `Reference image note: ${normalizeLine(input.referenceImageDescription)}`,
    "",
    "## Server Session Endpoint",
    "`POST /api/services/character-call-starter/session`",
    "",
    "Body after a Runway avatar exists:",
    "",
    "```json",
    JSON.stringify(
      {
        requestId,
        fulfillmentId,
        avatarId: "runway-avatar-id",
      },
      null,
      2
    ),
    "```",
    "",
    "## Rules",
    "- Runway API keys stay server-side.",
    "- Realtime session credentials are one-time use.",
    "- Session max duration is 5 minutes.",
    "- Do not store session tokens as durable artifacts.",
    "- Create a new session if the WebRTC connection fails after credentials are consumed.",
  ].join("\n");
}

function renderCreditReceipt() {
  return [
    "# Character Call Starter Credit Receipt",
    "",
    "Amount: USD 1.00",
    "Funding source: first-party Boreal buyer credit",
    "Status: settled",
    "",
    "This receipt records the launch-price checkout. It does not claim the Runway avatar session has already been completed.",
  ].join("\n");
}

export async function bootstrapCharacterCallStarterFulfillment({
  actorUserId,
  idempotencyKey,
  input,
  requestId,
  supplyId,
}: {
  actorUserId: string;
  idempotencyKey: string;
  input: CharacterCallStarterFulfillmentInput;
  requestId: string;
  supplyId?: string | null;
}) {
  const fulfillment = await createFulfillmentForRequestById({
    requestId,
    actorUserId,
    summary: "Character Call Starter fulfillment started.",
    supplyId: supplyId ?? undefined,
    initialStatus: "active",
    metadata: {
      serviceFamilyKey: "character-call-starter",
      servicePlanKey: "starter-call",
      providerKey: "runway",
      model: "gwm1_avatars",
      state: "awaiting_reference_asset",
      runwaysSessionMaxMinutes: 5,
    },
    idempotencyKey,
    source: "api.services.character_call_starter.checkout.fulfillment",
  });

  const personaSheet = await generatePersonaSheet(input);
  const personaArtifact = await publishArtifactForRequestById({
    requestId,
    actorUserId,
    artifactKind: "plan",
    title: "Character persona sheet",
    summary: "Persona, call boundaries, and setup notes for the Runway character.",
    fulfillmentId: fulfillment.id,
    documentKind: "text",
    content: personaSheet,
    idempotencyKey: derivedUuid(idempotencyKey, "persona-sheet"),
    source: "api.services.character_call_starter.checkout.persona_sheet",
  });
  const handoffArtifact = await publishArtifactForRequestById({
    requestId,
    actorUserId,
    artifactKind: "link",
    title: "Runway session launch handoff",
    summary:
      "Server-side launch instructions for creating one-time Runway realtime session credentials.",
    fulfillmentId: fulfillment.id,
    documentKind: "text",
    content: renderRunwayLaunchHandoff({
      fulfillmentId: fulfillment.id,
      input,
      requestId,
    }),
    idempotencyKey: derivedUuid(idempotencyKey, "launch-handoff"),
    source: "api.services.character_call_starter.checkout.launch_handoff",
  });
  const receiptArtifact = await publishArtifactForRequestById({
    requestId,
    actorUserId,
    artifactKind: "receipt",
    title: "Character Call Starter credit receipt",
    summary: "The USD 1.00 first-party credit debit was settled.",
    fulfillmentId: fulfillment.id,
    documentKind: "text",
    content: renderCreditReceipt(),
    idempotencyKey: derivedUuid(idempotencyKey, "credit-receipt"),
    source: "api.services.character_call_starter.checkout.credit_receipt",
  });
  const blockedFulfillment = await updateFulfillmentForRequestById({
    fulfillmentId: fulfillment.id,
    actorUserId,
    status: "blocked",
    summary:
      "Character Call Starter is paid and prepared. Upload an approved reference image or provide an existing Runway avatar id to launch the test session.",
    metadata: {
      serviceFamilyKey: "character-call-starter",
      servicePlanKey: "starter-call",
      providerKey: "runway",
      model: "gwm1_avatars",
      state: "awaiting_reference_asset",
      runwaysSessionMaxMinutes: 5,
      artifactIds: [
        personaArtifact.artifactId,
        handoffArtifact.artifactId,
        receiptArtifact.artifactId,
      ],
    },
    idempotencyKey: derivedUuid(idempotencyKey, "awaiting-reference-update"),
    source: "api.services.character_call_starter.checkout.awaiting_reference",
  });

  return {
    fulfillment: blockedFulfillment,
    artifacts: {
      personaSheet: personaArtifact,
      launchHandoff: handoffArtifact,
      creditReceipt: receiptArtifact,
    },
  };
}

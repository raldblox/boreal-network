import { expect, type Page, type Route, test } from "@playwright/test";
import {
  applyRequestPatch,
  createInitialRequestDraft,
} from "../../lib/request";

const ownerId = "user_owner";
const createdAt = "2026-05-31T09:00:00.000Z";
const updatedAt = "2026-05-31T09:10:00.000Z";
const editResendChatId = "11111111-1111-4111-8111-111111111111";
const draftInlineChatId = "22222222-2222-4222-8222-222222222222";

const draftRequestBase = applyRequestPatch(
  createInitialRequestDraft({
    id: "req_draft_inline",
    chatId: draftInlineChatId,
    documentId: "doc_draft_inline",
    userId: ownerId,
    visibility: "public",
    createdAt,
  }),
  {
    brief: {
      title: "Inspect a used car before purchase",
      summary:
        "A local inspector should check the car and attach proof before the buyer commits.",
      body: "Inspect a used car in Quezon City tomorrow. Done means a written condition note, timestamped photos, and video proof that the car was checked before purchase.",
      constraints: {
        location: "Quezon City",
      },
      outputKinds: ["inspection_report", "photo_evidence", "verification_note"],
      tags: ["car", "inspection"],
    },
    seeking: {
      actorKinds: ["human"],
      supplyKinds: ["field_inspection", "field_verification"],
      teamMode: "solo_or_team",
      notes: "Use a local inspection lane with proof.",
    },
    budget: {
      mode: "fixed",
      currency: "USD",
      fixedAmount: 80,
    },
    deadline: {
      targetAt: "2026-06-01T10:00:00.000Z",
      notes: "Before the buyer decides.",
    },
    derived: {
      routeFamily: "worker_market",
      executionKind: "human_request_room",
      paymentMode: "fixed_request",
      matchingMode: "lead_first_then_collaborators",
      routeSummary:
        "Local field-inspection request with timestamped proof and owner review.",
    },
    latest: {
      summary: "Draft plans are ready for owner review.",
      lastEventAt: updatedAt,
      lastActor: {
        id: ownerId,
        kind: "human",
      },
    },
  },
  updatedAt,
);
const draftRequest = {
  ...draftRequestBase,
  derived: {
    ...draftRequestBase.derived,
    leadRole: "field_inspector" as const,
    phases: [
      {
        phaseKey: "scope_route" as const,
        title: "Confirm inspection details",
        summary: "Lock the car location, access, deadline, and proof needs.",
        roleKeys: ["field_inspector" as const],
        requiredEvidenceClaims: ["verification_note" as const],
      },
      {
        phaseKey: "field_execution" as const,
        title: "Inspect the car",
        summary:
          "Visit the car, check visible condition, and capture evidence.",
        roleKeys: ["field_inspector" as const],
        requiredEvidenceClaims: [
          "timestamped_photos" as const,
          "written_report" as const,
        ],
      },
      {
        phaseKey: "proof_delivery" as const,
        title: "Deliver proof package",
        summary: "Attach the report, photos, and buyer-facing recommendation.",
        roleKeys: ["qa_documentation" as const],
        requiredEvidenceClaims: [
          "verification_note" as const,
          "photo_proof" as const,
        ],
      },
    ],
    roleSlots: [
      {
        roleKey: "field_inspector" as const,
        title: "Local inspector",
        requiredActorKinds: ["human" as const],
        preferredSupplyKinds: ["field_inspection" as const],
        required: true,
        summary: "Visits the car and captures proof.",
      },
    ],
    verificationPlan: {
      requiredArtifactKinds: [
        "inspection_report" as const,
        "photo_evidence" as const,
      ],
      requiredEvidenceClaims: [
        "timestamped_photos" as const,
        "written_report" as const,
      ],
      mustHaveOwnerAcceptance: true,
      mustHaveLocationSignal: false,
      mustHaveSignature: false,
    },
    clarificationNeeded: {
      required: false,
      missingDetails: [],
      reasons: [],
    },
    readiness: {
      state: "ready_to_open" as const,
      summary: "Ready to open for a local inspection route.",
      readyForOpen: true,
      readyForMatch: true,
    },
  },
};

async function mockChatEnvelope({
  messages,
  page,
  request,
  chatId,
}: {
  messages: unknown[];
  page: Page;
  request: unknown;
  chatId: string;
}) {
  await page.route(`**/api/messages?chatId=${chatId}`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        messages,
        visibility: "public",
        ownerUserId: ownerId,
        viewerUserId: ownerId,
        isReadonly: false,
        request,
      }),
      contentType: "application/json",
    });
  });
  await page.route(`**/api/vote?chatId=${chatId}`, async (route) => {
    await route.fulfill({
      body: JSON.stringify([]),
      contentType: "application/json",
    });
  });
  await page.route(/\/api\/requests\/[^/]+\/activity$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({ activity: [] }),
      contentType: "application/json",
    });
  });
}

test.describe("Request chat lifecycle", () => {
  test("rejects malformed chat history ids before database lookup", async ({
    page,
  }) => {
    const response = await page.request.get("/api/messages?chatId=undefined");

    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("Valid chatId is required.");
  });

  test("edit and resend sends the replacement prompt and shows pending feedback", async ({
    page,
  }) => {
    const sentBodies: unknown[] = [];
    let releaseChat: () => void = () => {};
    const releaseChatResponse = new Promise<void>((resolve) => {
      releaseChat = resolve;
    });

    await mockChatEnvelope({
      chatId: editResendChatId,
      page,
      request: null,
      messages: [
        {
          id: "msg_user_original",
          role: "user",
          parts: [{ type: "text", text: "Original request" }],
          metadata: { createdAt },
        },
        {
          id: "msg_assistant_original",
          role: "assistant",
          parts: [{ type: "text", text: "Original answer" }],
          metadata: { createdAt: updatedAt },
        },
      ],
    });

    await page.route("**/api/chat", async (route: Route) => {
      sentBodies.push(route.request().postDataJSON());
      await releaseChatResponse;
      await route.fulfill({
        body: JSON.stringify({ message: "Forced test failure after send." }),
        contentType: "application/json",
        status: 503,
      });
    });
    await page.route("**/api/messages/trailing", async (route: Route) => {
      await route.fulfill({
        body: JSON.stringify({ ok: true }),
        contentType: "application/json",
      });
    });

    await page.goto(`/chat/${editResendChatId}`);
    await expect(page.getByText("Original request")).toBeVisible();
    await expect(page.getByText("Original answer")).toBeVisible();

    await page.getByTestId("message-edit-button").click();
    await page
      .getByTestId("multimodal-input")
      .fill("Edited request with proof requirements");
    await page.getByTestId("send-button").click();

    await expect(page.getByTestId("message-assistant-loading")).toBeVisible();
    await expect.poll(() => sentBodies.length).toBe(1);

    const body = sentBodies[0] as {
      message?: { parts?: Array<{ type?: string; text?: string }> };
    };
    expect(
      body.message?.parts?.find((part) => part.type === "text")?.text,
    ).toBe("Edited request with proof requirements");
    await expect(page.getByText("Original answer")).toHaveCount(0);

    releaseChat();
  });

  test("new request submit hides the source turn and shows briefing feedback", async ({
    page,
  }) => {
    const sentBodies: unknown[] = [];
    let releaseChat: () => void = () => {};
    const releaseChatResponse = new Promise<void>((resolve) => {
      releaseChat = resolve;
    });
    const prompt =
      "Need a local inspector to check a used car tomorrow with photo proof.";

    await page.route("**/api/messages?chatId=**", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          messages: [],
          visibility: "private",
          ownerUserId: ownerId,
          viewerUserId: ownerId,
          isReadonly: false,
          request: null,
        }),
        contentType: "application/json",
      });
    });
    await page.route("**/api/vote?chatId=**", async (route) => {
      await route.fulfill({
        body: JSON.stringify([]),
        contentType: "application/json",
      });
    });
    await page.route("**/api/chat", async (route: Route) => {
      sentBodies.push(route.request().postDataJSON());
      await releaseChatResponse;
      await route.fulfill({
        body: JSON.stringify({ message: "Forced test failure after send." }),
        contentType: "application/json",
        status: 503,
      });
    });

    await page.goto("/?mode=new&type=request");
    await page.getByTestId("multimodal-input").fill(prompt);
    await page.getByTestId("send-button").click();

    await expect(page.getByTestId("request-briefing-pending")).toBeVisible();
    await expect(page.getByTestId("multimodal-input")).toHaveValue(prompt);
    await expect(page).toHaveURL(/\/chat\/.+[?&]mode=request/);
    await expect(page.getByTestId("message-assistant-loading")).toHaveCount(0);
    await expect(page.getByTestId("artifact")).not.toBeVisible();
    await expect(
      page
        .locator('[data-testid="message-content"]')
        .filter({ hasText: prompt }),
    ).toHaveCount(0);
    await expect(page.getByText("Untitled request")).toHaveCount(0);
    await expect.poll(() => sentBodies.length).toBe(1);

    const body = sentBodies[0] as {
      message?: {
        metadata?: {
          requestBriefingSource?: { hidden?: boolean; inputHash?: string };
        };
        parts?: Array<{ type?: string; text?: string }>;
      };
      requestMode?: boolean;
    };
    expect(body.requestMode).toBe(true);
    expect(body.message?.metadata?.requestBriefingSource?.hidden).toBe(true);
    expect(
      body.message?.metadata?.requestBriefingSource?.inputHash,
    ).toBeTruthy();
    expect(
      body.message?.parts?.find((part) => part.type === "text")?.text,
    ).toBe(prompt);

    releaseChat();
  });

  test("draft request stays in chat and renders inline plans with stepper and flow review", async ({
    page,
  }) => {
    await mockChatEnvelope({
      chatId: draftInlineChatId,
      page,
      request: draftRequest,
      messages: [
        {
          id: "msg_owner_brief",
          role: "user",
          parts: [
            {
              type: "text",
              text: "Inspect a used car in Quezon City tomorrow with photo proof.",
            },
          ],
          metadata: { createdAt },
        },
      ],
    });

    await page.goto(`/chat/${draftInlineChatId}`);

    await expect(page.getByTestId("draft-plan-message")).toBeVisible();
    await expect(page.getByText("Request briefing")).toHaveCount(0);
    await expect(page.getByTestId("request-preflight-preview")).toHaveCount(0);
    await expect(page.getByText("Plans").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Stepper" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Flow review" }),
    ).toBeVisible();
    await expect(page.getByText("Confirm inspection details")).toBeVisible();
    await expect(page.getByText("Inspect the car")).toBeVisible();
    await expect(
      page.getByText("Package the delivery and proof"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("draft-plan-message")
        .getByRole("button", { name: "Post request", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Flow review" }).click();
    await expect(page.getByLabel("Request workflow canvas")).toBeVisible();
    await expect(page.getByText("Confirm inspection details")).toBeVisible();
    await expect(page.getByText("Deliver proof package")).toBeVisible();
    await expect(page.getByText("Lead lane opens after approval")).toHaveCount(
      0,
    );
    await expect(page.getByText("Proof package", { exact: true })).toHaveCount(
      0,
    );
  });
});

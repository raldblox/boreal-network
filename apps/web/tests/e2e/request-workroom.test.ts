import { expect, test, type Page } from "@playwright/test";
import {
  applyRequestPatch,
  createInitialRequestDraft,
  type RequestActivityEntry,
  type RequestFulfillment,
} from "../../lib/request";

const createdAt = "2026-05-24T10:00:00.000Z";
const deliveredAt = "2026-05-27T10:00:00.000Z";

const baseRequest = createInitialRequestDraft({
  id: "req_workroom",
  chatId: "chat_workroom",
  documentId: "doc_req_workroom",
  userId: "user_owner",
  visibility: "public",
  createdAt,
});

const patchedRequest = applyRequestPatch(
  baseRequest,
  {
    activeRefs: {
      activeFulfillmentId: "ful_workroom",
      latestArtifactId: "art_workroom_delivery",
      latestTransactionId: "txn_workroom_run",
    },
    brief: {
      title: "Verify the avatar launch handoff",
      summary:
        "Review the service handoff, confirm the proof package, and prepare acceptance notes.",
      body:
        "Review the avatar launch service handoff. The done condition is a proof-backed delivery package with a written verification note, timestamped evidence, and owner acceptance ready for review.",
      constraints: {
        serviceFamilyKey: "character-call-starter",
      },
      outputKinds: ["delivery", "verification_note"],
      tags: ["avatar", "handoff"],
    },
    budget: {
      mode: "fixed",
      currency: "USD",
      fixedAmount: 100,
    },
    deadline: {
      targetAt: "2026-05-29T17:00:00.000Z",
      notes: "Review before the launch dry run.",
    },
    derived: {
      executionKind: "human_request_room",
      matchingMode: "lead_first_then_collaborators",
      paymentMode: "fixed_funded_request",
      routeFamily: "worker_market",
      routeSummary:
        "Human-led service review with delivery proof and owner acceptance.",
    },
    seeking: {
      actorKinds: ["human", "agent"],
      supplyKinds: ["human_service", "qa_documentation"],
      teamMode: "solo_or_team",
      notes: "Use the service lane, then keep proof and acceptance on the request.",
    },
    status: "delivered",
  },
  deliveredAt
);

const workroomRequest = {
  ...patchedRequest,
  latest: {
    lastActor: {
      displayName: "Boreal runner",
      id: "actor_runner",
      kind: "human" as const,
    },
    lastEventAt: deliveredAt,
    summary: "Delivery package is ready for owner review.",
  },
};

const activeFulfillment: RequestFulfillment = {
  id: "ful_workroom",
  key: "avatar-launch-handoff-review",
  requestId: "req_workroom",
  status: "delivered",
  lead: {
    displayName: "Service review lane",
    id: "actor_runner",
    kind: "human",
  },
  contributors: [
    {
      displayName: "Proof assistant",
      id: "actor_proof_agent",
      kind: "agent",
    },
  ],
  summary: "Service review lane delivered a proof-backed handoff package.",
  artifactIds: ["art_workroom_delivery"],
  steps: [
    {
      id: "step_review",
      kind: "review",
      status: "done",
      title: "Inspect service handoff",
    },
    {
      id: "step_proof",
      kind: "proof",
      status: "done",
      title: "Attach verification note",
    },
  ],
  createdAt,
  updatedAt: deliveredAt,
  deliveredAt,
};

const activity: RequestActivityEntry[] = [
  {
    eventId: "evt_req_opened",
    requestId: "req_workroom",
    sequence: 1,
    eventType: "request.opened",
    aggregateType: "request",
    aggregateId: "req_workroom",
    occurredAt: "2026-05-24T10:05:00.000Z",
    recordedAt: "2026-05-24T10:05:00.000Z",
    actor: {
      displayName: "Owner",
      id: "user_owner",
      kind: "human",
    },
    summary: "Request opened for avatar launch handoff review.",
    requestStatus: "open",
  },
  {
    eventId: "evt_ful_delivered",
    requestId: "req_workroom",
    sequence: 2,
    eventType: "fulfillment.delivered",
    aggregateType: "fulfillment",
    aggregateId: "ful_workroom",
    occurredAt: deliveredAt,
    recordedAt: deliveredAt,
    actor: {
      displayName: "Service review lane",
      id: "actor_runner",
      kind: "human",
    },
    summary: "Delivery package is ready for owner review.",
    detail: "Includes the handoff note, timestamped proof, and acceptance checklist.",
    requestStatus: "delivered",
    fulfillment: {
      id: "ful_workroom",
      status: "delivered",
      summary: "Proof-backed service review is delivered.",
    },
  },
  {
    eventId: "evt_art_delivery",
    requestId: "req_workroom",
    sequence: 3,
    eventType: "artifact.attached",
    aggregateType: "artifact",
    aggregateId: "art_workroom_delivery",
    occurredAt: deliveredAt,
    recordedAt: deliveredAt,
    actor: {
      displayName: "Proof assistant",
      id: "actor_proof_agent",
      kind: "agent",
    },
    summary: "Accepted handoff proof package attached.",
    detail: "Verification note and timestamped launch handoff proof.",
    requestStatus: "delivered",
    artifact: {
      id: "art_workroom_delivery",
      fulfillmentId: "ful_workroom",
      kind: "delivery",
      title: "Avatar launch handoff proof",
      summary: "Verification note, timestamps, and owner review checklist.",
      container: {
        kind: "external_ref",
        uri: "https://example.com/avatar-launch-handoff-proof",
      },
      metadata: {
        captureTime: deliveredAt,
        evidenceClaims: ["delivery_confirmation", "verification_note"],
        witness: {
          name: "Launch owner",
          note: "Reviewed proof package before acceptance.",
        },
      },
    },
  },
];

async function mockWorkroomApi(page: Page) {
  await page.route(/\/api\/messages\?chatId=chat_workroom$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        messages: [],
        visibility: "public",
        ownerUserId: "user_owner",
        viewerUserId: "user_owner",
        isReadonly: false,
        request: workroomRequest,
      }),
    });
  });

  await page.route(
    /\/api\/requests\/req_workroom\/activity$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ activity }),
      });
    }
  );

  await page.route(/\/api\/fulfillments\/ful_workroom$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ fulfillment: activeFulfillment }),
    });
  });
}

test.describe("Request workroom", () => {
  test("opens on the monitor with process proof review and support chat", async ({
    page,
  }) => {
    await mockWorkroomApi(page);

    await page.goto("/chat/chat_workroom");

    await expect(page.getByText("Workroom monitor")).toBeVisible();
    await expect(
      page.getByLabel("Request workroom monitor summary")
    ).toContainText("Next action");
    await expect(
      page.getByLabel("Request workroom monitor summary")
    ).toContainText("Owner / lane");
    await expect(
      page.getByLabel("Request workroom monitor summary")
    ).toContainText("Artifacts / proof");
    await expect(
      page.getByLabel("Request workroom monitor summary")
    ).toContainText("Credits / transactions");
    await expect(
      page.getByText("Process lens: Request -> Plan -> Worker -> Delivery")
    ).toBeVisible();
    await expect(
      page.getByLabel("Request workroom monitor summary")
    ).toContainText("Avatar launch handoff proof");
    await expect(
      page.getByLabel("Request workroom monitor summary")
    ).toContainText("Review");

    await page.getByRole("button", { name: "Open activity ledger" }).click();
    await expect(page.getByText("Activity").first()).toBeVisible();
    await expect(
      page.getByText("Delivery package is ready for owner review.").first()
    ).toBeVisible();

    await page.getByRole("button", { name: "Artifacts / proof" }).click();
    await expect(page.getByText("Artifacts", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Accepted handoff proof package attached.")
    ).toBeVisible();

    await page.getByRole("button", { name: "Open support chat" }).click();
    await expect(page.getByText("Support chat")).toBeVisible();
    await expect(
      page.getByText(
        "Use chat for clarification and assistance. Durable status, proof, artifacts, and review stay in the main workroom."
      )
    ).toBeVisible();
  });
});

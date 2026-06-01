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

async function mockWorkroomApi(
  page: Page,
  options: {
    isReadonly?: boolean;
    messages?: unknown[];
    viewerUserId?: string;
  } = {}
) {
  const messages =
    options.messages ??
    [
      {
        id: "msg_private_brief",
        role: "user",
        parts: [
          {
            type: "text",
            text: "Private briefing transcript: check the avatar launch handoff.",
          },
        ],
        metadata: {
          createdAt: "2026-05-24T10:00:00.000Z",
        },
      },
      {
        id: "msg_private_answer",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "I will keep this as support context, not durable activity.",
          },
        ],
        metadata: {
          createdAt: "2026-05-24T10:01:00.000Z",
        },
      },
    ];

  await page.route(/\/api\/messages\?chatId=chat_workroom$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        messages,
        visibility: "public",
        ownerUserId: "user_owner",
        viewerUserId: options.viewerUserId ?? "user_owner",
        isReadonly: options.isReadonly ?? false,
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

    await expect(page.getByLabel("Request workflow canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Flow" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByText("Status").first()).toBeVisible();
    await expect(page.getByText("delivered").first()).toBeVisible();
    await expect(
      page.getByText("Owner review should close the loop.")
    ).toBeVisible();
    await expect(
      page.getByText("Avatar launch handoff proof").first()
    ).toBeVisible();
    await expect(page.getByText("Review").first()).toBeVisible();

    await page.getByRole("button", { name: /^Activity\s+3$/ }).click();
    await expect(page.getByText("Activity").first()).toBeVisible();
    await expect(
      page.getByText("Delivery package is ready for owner review.").first()
    ).toBeVisible();

    await page.getByRole("button", { name: /^Artifacts\s+1$/ }).click();
    await expect(
      page.getByText(
        "Files, media, proof, and delivery packages attached to this request."
      )
    ).toBeVisible();
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
    await expect(
      page.getByText("Private briefing transcript: check the avatar launch handoff.")
    ).toBeVisible();
    await expect(
      page.getByText("I will keep this as support context, not durable activity.")
    ).toBeVisible();
  });

  test("public responder can use request-local support chat without seeing owner transcript", async ({
    page,
  }) => {
    await mockWorkroomApi(page, {
      messages: [],
      viewerUserId: "user_responder",
    });

    await page.goto("/chat/chat_workroom");

    await expect(page.getByLabel("Request workflow canvas")).toBeVisible();
    await expect(
      page.getByText("Avatar launch handoff proof").first()
    ).toBeVisible();
    await expect(page.getByText("Still needed: execution modes")).toBeVisible();
    await expect(page.getByText("Private briefing transcript")).toHaveCount(0);
    await expect(
      page.getByText("I will keep this as support context")
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Confirm delivery", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Create mock delivery", exact: true })
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Open support chat" }).click();
    await expect(page.getByText("Support chat")).toBeVisible();
    await expect(page.getByText("Request chat is open.")).toBeVisible();
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
  });

  test("owner can create mock delivery and resolve the public request from the workroom", async ({
    page,
  }) => {
    const lifecycleBase = createInitialRequestDraft({
      id: "req_lifecycle",
      chatId: "chat_lifecycle",
      documentId: "doc_req_lifecycle",
      userId: "user_owner",
      visibility: "public",
      createdAt,
    });
    let lifecycleRequest = {
      ...applyRequestPatch(
        lifecycleBase,
        {
          brief: {
            title: "Lifecycle proof request",
            summary: "Run the full workroom lifecycle with mock proof.",
            body:
              "Complete this request by attaching a proof package and accepting delivery.",
            outputKinds: ["delivery"],
            tags: ["lifecycle"],
          },
          derived: {
            routeFamily: "worker_market",
            executionKind: "human_request_room",
            matchingMode: "lead_first_then_collaborators",
            paymentMode: "fixed_request",
            routeSummary: "Public responder lane with owner review.",
          },
          seeking: {
            actorKinds: ["human"],
            supplyKinds: ["human_service"],
            teamMode: "solo_or_team",
            notes: "Use a roleplay worker lane for frontend lifecycle validation.",
          },
          status: "open",
        },
        createdAt
      ),
      latest: {
        lastActor: {
          displayName: "Owner",
          id: "user_owner",
          kind: "human" as const,
        },
        lastEventAt: createdAt,
        summary: "Request is open and ready for a roleplay delivery.",
      },
    };
    let lifecycleFulfillment: RequestFulfillment | null = null;
    const lifecycleActivity: RequestActivityEntry[] = [
      {
        eventId: "evt_lifecycle_opened",
        requestId: "req_lifecycle",
        sequence: 1,
        eventType: "request.opened",
        aggregateType: "request",
        aggregateId: "req_lifecycle",
        occurredAt: createdAt,
        recordedAt: createdAt,
        actor: {
          displayName: "Owner",
          id: "user_owner",
          kind: "human",
        },
        summary: "Request opened for lifecycle validation.",
        requestStatus: "open",
      },
    ];

    await page.route(/\/api\/messages\?chatId=chat_lifecycle$/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          messages: [],
          visibility: "public",
          ownerUserId: "user_owner",
          viewerUserId: "user_owner",
          isReadonly: false,
          request: lifecycleRequest,
        }),
      });
    });

    await page.route(
      /\/api\/requests\/req_lifecycle\/activity$/,
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ activity: lifecycleActivity }),
        });
      }
    );

    await page.route(
      /\/api\/requests\/req_lifecycle\/commitments$/,
      async (route) => {
        lifecycleRequest = {
          ...lifecycleRequest,
          activeRefs: {
            ...lifecycleRequest.activeRefs,
            activeCommitmentId: "commit_lifecycle",
          },
          latest: {
            ...lifecycleRequest.latest,
            summary:
              "Roleplay worker will complete the request and attach proof for owner review.",
          },
        };
        lifecycleActivity.push({
          eventId: "evt_lifecycle_commitment",
          requestId: "req_lifecycle",
          sequence: lifecycleActivity.length + 1,
          eventType: "commitment.proposed",
          aggregateType: "commitment",
          aggregateId: "commit_lifecycle",
          occurredAt: createdAt,
          recordedAt: createdAt,
          actor: {
            displayName: "Roleplay worker",
            id: "user_owner",
            kind: "human",
          },
          summary: "Roleplay worker proposed a mock delivery lane.",
          requestStatus: "open",
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            requestId: "req_lifecycle",
            commitmentId: "commit_lifecycle",
            summary: "Roleplay worker proposed a mock delivery lane.",
            status: "proposed",
            terms: { fundingRequired: false, amountMode: "none" },
            requestStatus: "open",
          }),
        });
      }
    );

    await page.route(/\/api\/commitments\/commit_lifecycle$/, async (route) => {
      lifecycleRequest = {
        ...lifecycleRequest,
        status: "funded",
        latest: {
          ...lifecycleRequest.latest,
          summary: "Roleplay commitment accepted.",
        },
      };
      lifecycleActivity.push({
        eventId: "evt_lifecycle_commitment_accepted",
        requestId: "req_lifecycle",
        sequence: lifecycleActivity.length + 1,
        eventType: "commitment.accepted",
        aggregateType: "commitment",
        aggregateId: "commit_lifecycle",
        occurredAt: createdAt,
        recordedAt: createdAt,
        actor: {
          displayName: "Owner",
          id: "user_owner",
          kind: "human",
        },
        summary: "Roleplay commitment accepted.",
        requestStatus: "funded",
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          requestId: "req_lifecycle",
          commitmentId: "commit_lifecycle",
          summary: "Roleplay commitment accepted.",
          status: "accepted",
          terms: { fundingRequired: false, amountMode: "none" },
          requestStatus: "funded",
        }),
      });
    });

    await page.route(
      /\/api\/requests\/req_lifecycle\/fulfillments$/,
      async (route) => {
        lifecycleFulfillment = {
          id: "ful_lifecycle",
          key: "lifecycle-roleplay-fulfillment",
          requestId: "req_lifecycle",
          commitmentId: "commit_lifecycle",
          status: "active",
          lead: {
            displayName: "Roleplay worker",
            id: "user_owner",
            kind: "human",
          },
          contributors: [],
          summary:
            "Roleplay fulfillment lane is executing the requested delivery with proof.",
          artifactIds: [],
          steps: [
            {
              id: "step_roleplay_delivery",
              kind: "delivery",
              status: "active",
              title: "Create mock proof package",
            },
          ],
          createdAt,
          updatedAt: createdAt,
          startedAt: createdAt,
        };
        lifecycleRequest = {
          ...lifecycleRequest,
          status: "in_progress",
          activeRefs: {
            ...lifecycleRequest.activeRefs,
            activeFulfillmentId: "ful_lifecycle",
          },
          latest: {
            ...lifecycleRequest.latest,
            summary: lifecycleFulfillment.summary,
          },
        };
        lifecycleActivity.push({
          eventId: "evt_lifecycle_fulfillment",
          requestId: "req_lifecycle",
          sequence: lifecycleActivity.length + 1,
          eventType: "fulfillment.created",
          aggregateType: "fulfillment",
          aggregateId: "ful_lifecycle",
          occurredAt: createdAt,
          recordedAt: createdAt,
          actor: {
            displayName: "Roleplay worker",
            id: "user_owner",
            kind: "human",
          },
          summary: lifecycleFulfillment.summary,
          requestStatus: "in_progress",
        });
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ fulfillment: lifecycleFulfillment }),
        });
      }
    );

    await page.route(/\/api\/requests\/req_lifecycle\/artifacts$/, async (route) => {
      lifecycleRequest = {
        ...lifecycleRequest,
        activeRefs: {
          ...lifecycleRequest.activeRefs,
          latestArtifactId: "art_lifecycle_delivery",
        },
        latest: {
          ...lifecycleRequest.latest,
          summary:
            "Roleplay proof package attached so the owner can review and resolve the request.",
        },
      };
      lifecycleActivity.push({
        eventId: "evt_lifecycle_artifact",
        requestId: "req_lifecycle",
        sequence: lifecycleActivity.length + 1,
        eventType: "artifact.added",
        aggregateType: "artifact",
        aggregateId: "art_lifecycle_delivery",
        occurredAt: deliveredAt,
        recordedAt: deliveredAt,
        actor: {
          displayName: "Roleplay worker",
          id: "user_owner",
          kind: "human",
        },
        summary: "Roleplay proof package attached.",
        requestStatus: "in_progress",
        artifact: {
          id: "art_lifecycle_delivery",
          fulfillmentId: "ful_lifecycle",
          kind: "delivery",
          title: "Mock delivery proof",
          summary:
            "Roleplay proof package attached so the owner can review and resolve the request.",
          container: {
            kind: "document",
            documentId: "doc_art_lifecycle",
            documentKind: "text",
          },
          metadata: {
            captureTime: deliveredAt,
            evidenceClaims: ["delivery_confirmation", "verification_note"],
          },
        },
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          requestId: "req_lifecycle",
          artifactId: "art_lifecycle_delivery",
          fulfillmentId: "ful_lifecycle",
          documentId: "doc_art_lifecycle",
          kind: "text",
          title: "Mock delivery proof",
          summary:
            "Roleplay proof package attached so the owner can review and resolve the request.",
          artifactKind: "delivery",
          requestStatus: "in_progress",
        }),
      });
    });

    await page.route(/\/api\/fulfillments\/ful_lifecycle$/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ fulfillment: lifecycleFulfillment }),
        });
        return;
      }

      const body = await route.request().postDataJSON();
      if (body.status === "delivered" && lifecycleFulfillment) {
        lifecycleFulfillment = {
          ...lifecycleFulfillment,
          status: "delivered",
          artifactIds: ["art_lifecycle_delivery"],
          summary: "Roleplay delivery is ready for owner review.",
          updatedAt: deliveredAt,
          deliveredAt,
        };
        lifecycleRequest = {
          ...lifecycleRequest,
          status: "delivered",
          activeRefs: {
            ...lifecycleRequest.activeRefs,
            activeFulfillmentId: "ful_lifecycle",
            latestArtifactId: "art_lifecycle_delivery",
          },
          latest: {
            ...lifecycleRequest.latest,
            lastEventAt: deliveredAt,
            summary: "Roleplay delivery is ready for owner review.",
          },
        };
        lifecycleActivity.push({
          eventId: "evt_lifecycle_delivered",
          requestId: "req_lifecycle",
          sequence: lifecycleActivity.length + 1,
          eventType: "fulfillment.delivered",
          aggregateType: "fulfillment",
          aggregateId: "ful_lifecycle",
          occurredAt: deliveredAt,
          recordedAt: deliveredAt,
          actor: {
            displayName: "Roleplay worker",
            id: "user_owner",
            kind: "human",
          },
          summary: "Roleplay delivery is ready for owner review.",
          requestStatus: "delivered",
          fulfillment: {
            id: "ful_lifecycle",
            status: "delivered",
            summary: "Roleplay delivery is ready for owner review.",
          },
        });
      } else if (body.status === "accepted" && lifecycleFulfillment) {
        lifecycleFulfillment = {
          ...lifecycleFulfillment,
          status: "accepted",
          summary: "Owner accepted delivery and resolved this request.",
          updatedAt: deliveredAt,
          acceptedAt: deliveredAt,
        };
        const nextActiveRefs = {
          ...lifecycleRequest.activeRefs,
          acceptedArtifactId: "art_lifecycle_delivery",
        };
        delete nextActiveRefs.activeFulfillmentId;
        lifecycleRequest = {
          ...lifecycleRequest,
          status: "completed",
          activeRefs: nextActiveRefs,
          latest: {
            ...lifecycleRequest.latest,
            lastEventAt: deliveredAt,
            summary: "Owner accepted delivery and resolved this request.",
          },
        };
        lifecycleActivity.push({
          eventId: "evt_lifecycle_accepted",
          requestId: "req_lifecycle",
          sequence: lifecycleActivity.length + 1,
          eventType: "fulfillment.accepted",
          aggregateType: "fulfillment",
          aggregateId: "ful_lifecycle",
          occurredAt: deliveredAt,
          recordedAt: deliveredAt,
          actor: {
            displayName: "Owner",
            id: "user_owner",
            kind: "human",
          },
          summary: "Owner accepted delivery and resolved this request.",
          requestStatus: "completed",
          fulfillment: {
            id: "ful_lifecycle",
            status: "accepted",
            summary: "Owner accepted delivery and resolved this request.",
          },
        });
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ fulfillment: lifecycleFulfillment }),
      });
    });

    await page.goto("/chat/chat_lifecycle");

    await expect(
      page.getByText("Create a mock delivery to test the full lifecycle.")
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Create mock delivery", exact: true })
      .click();
    await expect(page.getByText("Owner review should close the loop.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm delivery", exact: true })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Confirm delivery", exact: true })
      .click();

    await expect(page.getByText("The request is resolved.")).toBeVisible();
    await expect(page.getByText("completed").first()).toBeVisible();
  });
});

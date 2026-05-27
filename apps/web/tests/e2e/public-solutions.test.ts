import { expect, test, type Page } from "@playwright/test";

const emptyPublicRequestsResponse = {
  requests: [],
  hasMore: false,
};

const completedSolutionResponse = {
  requests: [
    {
      id: "req_public_solution",
      chatId: "chat_public_solution",
      key: "avatar-launch-handoff-proof",
      status: "completed",
      visibility: "public",
      brief: {
        title: "Reusable avatar launch handoff",
        summary:
          "Accepted proof package for a character-call service launch handoff.",
        body:
          "Accepted proof package for a character-call service launch handoff.",
        constraints: {},
        outputKinds: ["delivery", "verification_note"],
        tags: ["avatar", "handoff"],
      },
      seeking: {
        actorKinds: ["human", "agent"],
        supplyKinds: ["human_service", "qa_documentation"],
        teamMode: "solo_or_team",
        notes: "",
      },
      budget: {
        mode: "fixed",
        currency: "USD",
        fixedAmount: 100,
      },
      deadline: null,
      activeRefs: {
        acceptedArtifactId: "art_public_solution",
        latestArtifactId: "art_public_solution",
        latestTransactionId: "txn_public_solution",
      },
      latest: {
        summary: "Owner accepted the proof package.",
        lastEventAt: "2026-05-27T10:00:00.000Z",
      },
      derived: {
        routeFamily: "worker_market",
        executionKind: "human_request_room",
        paymentMode: "fixed_funded_request",
        matchingMode: "lead_first_then_collaborators",
        missingDetails: [],
        readiness: {
          readyForOpen: true,
          readyForMatch: true,
          state: "ready_to_match",
          summary: "Accepted solution projection.",
        },
        routeSummary: "Human-led service review with accepted proof.",
      },
      createdAt: "2026-05-24T10:00:00.000Z",
      updatedAt: "2026-05-27T10:00:00.000Z",
    },
  ],
  hasMore: false,
};

async function mockHomeShell(page: Page) {
  await page.route(
    /\/api\/requests\?scope=public&limit=20$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(emptyPublicRequestsResponse),
      });
    }
  );

  await page.route(/\/api\/buyer-credits\/account$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        account: {
          availableBalance: "0.00",
          currency: "USD",
        },
      }),
    });
  });
}

test.describe("Public solution preview", () => {
  test("shows accepted public solution projections with free inspection", async ({
    page,
  }) => {
    await mockHomeShell(page);
    await page.route(
      /\/api\/requests\?scope=public_solutions&limit=3$/,
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(completedSolutionResponse),
        });
      }
    );

    await page.goto("/");

    await expect(
      page.getByText("Reusable avatar launch handoff")
    ).toBeVisible();
    await expect(
      page.getByText("Accepted proof", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("accepted artifact linked")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Inspect free" })
    ).toHaveAttribute("href", "/chat/chat_public_solution");
    await expect(
      page.getByRole("link", { name: "Use as reference" })
    ).toHaveAttribute(
      "href",
      "/?mode=request&referenceRequestId=req_public_solution"
    );
  });

  test("keeps an educational empty state when no accepted artifacts exist", async ({
    page,
  }) => {
    await mockHomeShell(page);
    await page.route(
      /\/api\/requests\?scope=public_solutions&limit=3$/,
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(emptyPublicRequestsResponse),
        });
      }
    );

    await page.goto("/");

    await expect(
      page.getByText("No accepted public solutions yet.")
    ).toBeVisible();
    await expect(
      page.getByText("Boreal will not label unfinished work as reusable.")
    ).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

const emptySuppliesResponse = {
  supplies: [],
  hasMore: false,
};

const emptyRequestsResponse = {
  requests: [],
  hasMore: false,
};

const publicRequestResponse = {
  requests: [
    {
      id: "req_onboarding_audit",
      key: "audit-onboarding-flow",
      status: "open",
      visibility: "public",
      brief: {
        title: "Audit an onboarding flow",
        summary: "Review signup friction and return a proof-backed brief.",
        body: "Review signup friction and return a proof-backed brief.",
        constraints: {},
        outputKinds: ["brief"],
        tags: ["ux", "audit"],
      },
      seeking: {
        actorKinds: ["ai_agent"],
        supplyKinds: ["digital"],
        teamMode: "single",
        notes: "",
      },
      budget: {
        mode: "fixed",
        currency: "USD",
        fixedAmount: 50,
      },
      deadline: null,
      activeRefs: {
        acceptedArtifactId: null,
        activeCommitmentId: null,
        activeFulfillmentId: null,
        latestArtifactId: null,
        latestTransactionId: null,
      },
      latest: {
        eventId: null,
        eventType: null,
        message: null,
        at: null,
      },
      derived: {
        routeFamily: "digital",
        executionKind: "ai_workflow",
        paymentMode: "buyer_credit",
        matchingMode: "open_pool",
        missingDetails: [],
        readiness: {
          readyForOpen: true,
          readyForMatch: true,
          state: "ready_to_match",
          summary: "Ready for plan comparison.",
        },
        routeSummary: "Digital review with proof-backed notes.",
      },
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: "2026-05-26T10:00:00.000Z",
    },
    {
      id: "req_launch_teaser",
      key: "launch-teaser-video",
      status: "open",
      visibility: "public",
      brief: {
        title: "Create a launch teaser video",
        summary: "Turn approved product notes into a short launch clip.",
        body: "Generate one public launch teaser video with review handoff.",
        constraints: {},
        outputKinds: ["video"],
        tags: ["video", "launch"],
      },
      seeking: {
        actorKinds: ["human", "agent"],
        supplyKinds: ["human_service", "video_generation"],
        teamMode: "single",
        notes: "",
      },
      budget: null,
      deadline: null,
      activeRefs: {
        acceptedArtifactId: null,
        activeCommitmentId: null,
        activeFulfillmentId: null,
        latestArtifactId: null,
        latestTransactionId: null,
      },
      latest: {
        eventId: null,
        eventType: null,
        message: null,
        at: null,
      },
      derived: {
        routeFamily: "digital",
        executionKind: "provider_api",
        paymentMode: "buyer_credit",
        matchingMode: "open_pool",
        missingDetails: [],
        readiness: {
          readyForOpen: true,
          readyForMatch: true,
          state: "ready_to_match",
          summary: "Ready for worker applications.",
        },
        routeSummary: "Video generation with proof-backed review.",
        workerEligibility: {
          policy: "human_first_agent_support",
          humanRequired: true,
          shouldWakeAgents: true,
          skipProviderOnlyAgents: false,
          preferredActorKinds: ["human", "agent"],
          preferredSupplyKinds: ["human_service", "video_generation"],
          preferredOutputKinds: ["video"],
          roleKeys: ["human_lead", "video_generation"],
          wakeSignals: ["actor:agent", "supply:video_generation", "output:video"],
          skipReasons: [],
          nonAuthority: [
            "not_matching_or_assignment",
            "no_supply_assigned",
            "no_commitment_created",
            "no_fulfillment_started",
            "no_provider_call",
            "no_payment_authorized",
            "no_request_event_written",
          ],
        },
      },
      createdAt: "2026-05-25T10:00:00.000Z",
      updatedAt: "2026-05-28T10:00:00.000Z",
    },
    {
      id: "req_avatar_handoff",
      key: "avatar-launch-handoff",
      status: "open",
      visibility: "public",
      brief: {
        title: "Create an avatar launch handoff",
        summary: "Prepare a character-call setup with approved reference image.",
        body: "Prepare a character-call setup with approved reference image.",
        constraints: {},
        outputKinds: ["delivery"],
        tags: ["avatar", "service"],
      },
      seeking: {
        actorKinds: ["human", "ai_agent"],
        supplyKinds: ["service"],
        teamMode: "single",
        notes: "",
      },
      budget: null,
      deadline: null,
      activeRefs: {
        acceptedArtifactId: null,
        activeCommitmentId: null,
        activeFulfillmentId: null,
        latestArtifactId: null,
        latestTransactionId: null,
      },
      latest: {
        eventId: null,
        eventType: null,
        message: null,
        at: null,
      },
      derived: {
        routeFamily: null,
        executionKind: null,
        paymentMode: null,
        matchingMode: null,
        missingDetails: ["approved_reference_image"],
        readiness: {
          readyForOpen: true,
          readyForMatch: false,
          state: "collecting_brief",
          summary: "Needs an approved reference image before matching.",
        },
        routeSummary: null,
      },
      createdAt: "2026-05-24T10:00:00.000Z",
      updatedAt: "2026-05-27T10:00:00.000Z",
    },
  ],
  hasMore: false,
};

test.describe("Surface async states", () => {
  test("home beta carries worker readiness into showcase workrooms", async ({
    page,
  }) => {
    await page.goto("/home/beta");

    await expect(
      page.getByRole("heading", {
        name: "Explore what Boreal can turn into completed work.",
      })
    ).toBeVisible();
    await expect(page.getByText("Worker readiness").first()).toBeVisible();
    await expect(page.getByText("draft first").first()).toBeVisible();
    await expect(
      page
        .getByText(
          "No worker or Supply attaches from this listing; the buyer opens a Request first."
        )
        .first()
    ).toBeVisible();

    await page
      .locator("a")
      .filter({ hasText: "Human Editorial Polish: Publish Polish" })
      .first()
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Human Editorial Polish: Publish Polish",
      })
    ).toBeVisible();
    await expect(page.getByText("Worker readiness").first()).toBeVisible();
    await expect(page.getByText("Agent lanes")).toBeVisible();
    await expect(page.getByText("Listing mode")).toBeVisible();
    await expect(page.getByText("read-only hint")).toBeVisible();
  });

  test("supply hub exposes an accessible loading state", async ({ page }) => {
    let releaseSupplies: () => void = () => {};
    const suppliesLoaded = new Promise<void>((resolve) => {
      releaseSupplies = resolve;
    });

    await page.route("**/api/supplies?limit=20", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(emptySuppliesResponse),
      });
    });

    await page.route("**/api/supplies?limit=50", async (route) => {
      await suppliesLoaded;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(emptySuppliesResponse),
      });
    });

    await page.goto("/supplies");

    await expect(
      page.getByRole("status", { name: "Active supply lanes" })
    ).toHaveAttribute("aria-busy", "true");
    await expect(
      page.getByRole("button", { name: "Checking supply..." }).first()
    ).toBeDisabled();

    releaseSupplies();

    await expect(
      page.getByRole("status", { name: "Active supply lanes" })
    ).toContainText("No active capability lanes yet");
  });

  test("supply hub renders the empty state and starter list", async ({
    page,
  }) => {
    await page.route("**/api/supplies?*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(emptySuppliesResponse),
      });
    });

    await page.goto("/supplies");

    await expect(
      page.getByRole("status", { name: "Active supply lanes" })
    ).toContainText("No active capability lanes yet");
    await expect(
      page.getByRole("list", { name: "Starter supply lanes" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enable and start" }).first()
    ).toBeVisible();
  });

  test("supply hub renders the API error state", async ({ page }) => {
    await page.route("**/api/supplies?*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced supply failure" }),
      });
    });

    await page.goto("/supplies");

    await expect(
      page.getByRole("alert", { name: "Active supply lanes" })
    ).toContainText("Supply lanes unavailable");
    await expect(
      page.getByRole("button", { name: "Supply lookup unavailable" }).first()
    ).toBeDisabled();
  });

  test("request board exposes an accessible loading state", async ({ page }) => {
    test.setTimeout(30_000);
    let releaseRequests: () => void = () => {};
    const requestsLoaded = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });

    await page.route("**/api/requests?scope=public&limit=20", async (route) => {
      await requestsLoaded;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(emptyRequestsResponse),
      });
    });

    await page.goto("/open-requests");

    await expect(
      page.getByRole("status", { name: "Request board results" })
    ).toHaveAttribute("aria-busy", "true");

    releaseRequests();

    await expect(
      page.getByRole("status", { name: "Request board results" })
    ).toContainText("No public requests yet");
  });

  test("request board renders empty and error states", async ({ page }) => {
    test.setTimeout(30_000);
    await page.route("**/api/requests?scope=public&limit=20", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(emptyRequestsResponse),
      });
    });

    await page.goto("/open-requests");

    await expect(
      page.getByRole("status", { name: "Request board results" })
    ).toContainText("No public requests yet");

    await page.unroute("**/api/requests?scope=public&limit=20");
    await page.route("**/api/requests?scope=public&limit=20", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced request failure" }),
      });
    });

    await page.reload();

    await expect(
      page.getByRole("alert", { name: "Request board results" })
    ).toContainText("Request board unavailable");
  });

  test("request board supports search filters sort and reference links", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.route("**/api/requests?scope=public&limit=20", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(publicRequestResponse),
      });
    });

    await page.goto("/open-requests");

    await expect(
      page.getByRole("heading", {
        name: "Browse the work people are trying to get done.",
      })
    ).toBeVisible();
    await expect(page.getByText("Audit an onboarding flow")).toBeVisible();
    await expect(page.getByText("Create a launch teaser video")).toBeVisible();
    await expect(page.getByText("Create an avatar launch handoff")).toBeVisible();
    await expect(page.getByText("Worker readiness").first()).toBeVisible();
    await expect(page.getByText("Mira Video Agent").first()).toBeVisible();
    await expect(page.getByText("can prepare").first()).toBeVisible();
    await expect(page.getByText("human + agent support")).toBeVisible();
    await expect(
      page
        .getByText("Hints only. No assignment, Commitment, or Fulfillment write.")
        .first()
    ).toBeVisible();

    await page
      .getByRole("searchbox", { name: "Search request board" })
      .fill("agent support");

    await expect(page.getByText("Create a launch teaser video")).toBeVisible();
    await expect(page.getByText("Audit an onboarding flow")).toBeHidden();
    await expect(page.getByText("Create an avatar launch handoff")).toBeHidden();

    await page.getByRole("searchbox", { name: "Search request board" }).fill(
      "avatar"
    );

    await expect(page.getByText("Create an avatar launch handoff")).toBeVisible();
    await expect(page.getByText("Audit an onboarding flow")).toBeHidden();
    await expect(
      page
        .getByText("Public projection points to human-led or local-access")
        .first()
    ).toBeVisible();

    await page.getByRole("button", { name: "Needs details" }).click();
    await expect(page.getByText("Create an avatar launch handoff")).toBeVisible();
    await expect(
      page.getByText("Clarify the ask before plans compete.")
    ).toBeVisible();

    await page.getByRole("searchbox", { name: "Search request board" }).fill("");
    await page.getByRole("button", { name: "All statuses" }).click();
    await page
      .getByRole("combobox", { name: "Sort request board" })
      .selectOption("title");

    await expect(
      page.getByText("Audit an onboarding flow").first()
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Use as starting point" }).first()
    ).toHaveAttribute(
        "href",
        "/?mode=request&referenceRequestId=req_onboarding_audit"
      );
  });
});

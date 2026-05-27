import { expect, test } from "@playwright/test";

test.describe("Startup MVP architecture smoke", () => {
  test("architecture page renders the production MVP map", async ({ page }) => {
    await page.goto("/architecture");

    await expect(page).toHaveTitle(/Architecture/);
    await expect(
      page.getByRole("heading", {
        name: "Boreal production MVP architecture",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "System Architecture" }).last()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Database Schema" }).last()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "API Endpoints" }).last()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "UI Architecture" }).last()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Production Scale Plan" }).last()
    ).toBeVisible();
    await expect(page.getByText("RequestEvent").first()).toBeVisible();
    await expect(
      page.getByText("POST /api/services/character-call-starter/checkout")
    ).toBeVisible();
  });
});

test.describe("Startup MVP service checkout smoke", () => {
  test("Character Call Starter checkout posts credit-backed service details", async ({
    page,
  }) => {
    let checkoutPayload: Record<string, unknown> | null = null;
    let checkoutIdempotencyKey: string | undefined;

    await page.route("**/api/buyer-credits/account", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          account: {
            availableBalance: "1.00",
            currency: "USD",
          },
        }),
      });
    });

    await page.route(
      "**/api/services/character-call-starter/checkout",
      async (route) => {
        checkoutPayload = JSON.parse(route.request().postData() ?? "{}");
        checkoutIdempotencyKey = route.request().headers()["idempotency-key"];

        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            chatId: "chat_smoke_character_call",
            request: {
              id: "req_smoke_character_call",
              status: "open",
            },
            transaction: {
              id: "txn_smoke_character_call",
              amount: "1.00",
              currency: "USD",
              status: "succeeded",
            },
            ledgerEntry: {
              id: "ledger_smoke_character_call",
              balanceAfter: "0.00",
            },
            account: {
              availableBalance: "0.00",
            },
            fulfillmentBootstrap: {
              fulfillment: {
                id: "ful_smoke_character_call",
                status: "active",
              },
            },
          }),
        });
      }
    );

    await page.goto("/services/character-call-starter/starter-call");

    await expect(
      page.getByRole("heading", { name: "Character Call Starter" }).first()
    ).toBeVisible();
    await expect(page.getByText("Payment")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pay and start request" })
    ).toBeVisible();

    await page.getByLabel("Character name").fill("Mira the clocksmith");
    await page.getByLabel("Call goal").selectOption("sales_demo");
    await page
      .getByLabel("Personality notes")
      .fill("Warm, precise, and focused on explaining a launch offer.");
    await page
      .getByLabel("Reference image note")
      .fill("Approved original founder character reference.");
    await page.getByLabel("Allowed topics").fill("Product FAQ and onboarding.");
    await page
      .getByLabel("Blocked topics")
      .fill("Medical advice and celebrity imitation.");
    await page
      .getByLabel("First message direction")
      .fill("Welcome the visitor and ask what they want to learn.");

    await page.getByRole("button", { name: "Pay and start request" }).click();

    await expect(
      page.getByText("Request funded and ready for proof.")
    ).toBeVisible();
    await expect(
      page.getByText("Transaction: txn_smoke_character_call")
    ).toBeVisible();
    await expect(page.getByText("Credit balance: $0.00")).toBeVisible();
    await expect(page.getByText("Fulfillment: active")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open Request workroom" })
    ).toBeVisible();

    expect(checkoutIdempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(checkoutPayload).toMatchObject({
      characterName: "Mira the clocksmith",
      callGoal: "sales_demo",
      personalityNotes:
        "Warm, precise, and focused on explaining a launch offer.",
      referenceImageDescription: "Approved original founder character reference.",
      allowedTopics: "Product FAQ and onboarding.",
      blockedTopics: "Medical advice and celebrity imitation.",
      firstMessage: "Welcome the visitor and ask what they want to learn.",
      idempotencyKey: checkoutIdempotencyKey,
    });
  });
});

import { expect, test } from "@playwright/test";

const emptySuppliesResponse = {
  supplies: [],
  hasMore: false,
};

test.describe("Surface async states", () => {
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
    ).toContainText("No active supplies yet");
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
    ).toContainText("No active supplies yet");
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
});

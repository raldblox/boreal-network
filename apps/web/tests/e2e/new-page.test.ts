import { expect, test } from "@playwright/test";

test.describe("New page composer", () => {
  test("uses a minimal chat/request toggle with supply actions", async ({
    page,
  }) => {
    await page.goto("/?mode=new");

    await expect(page.getByText("What needs to get done?")).toBeVisible();
    await expect(page.getByTestId("new-mode-controls")).toBeVisible();
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("suggested-actions")).toHaveCount(0);
    await expect(page.getByText("Quick start")).toHaveCount(0);

    await page.getByTestId("new-mode-request").click();
    await expect(page).toHaveURL(/mode=new&type=request/);
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute(
      "placeholder",
      /Describe the work/,
    );

    await page.getByTestId("new-supply-menu").click();
    await expect(
      page.getByRole("menuitem", { name: /New supply/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /Join supply whitelist/ }),
    ).toBeVisible();
  });
});

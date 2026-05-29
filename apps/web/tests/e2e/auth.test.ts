import { expect, test } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("auth-shell")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with passkey" }),
    ).toBeVisible();
    await expect(page.getByTestId("auth-status")).toContainText(
      "Use passkey first",
    );
    await expect(
      page.getByPlaceholder("your-name or you@team.com"),
    ).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Sign in" }),
    ).toBeVisible();
    await expect(page.getByText("New to Boreal?")).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("auth-shell")).toBeVisible();
    await expect(page.getByTestId("auth-status")).toContainText(
      "Create the account",
    );
    await expect(page.getByPlaceholder("your-name")).toBeVisible();
    await expect(page.getByPlaceholder("you@team.com")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
    await expect(page.getByText("Already inside Boreal?")).toBeVisible();
  });

  test("can navigate from login to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL("/register?callbackUrl=%2F");
  });

  test("can navigate from register to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login?callbackUrl=%2F");
  });

  test("password visibility can be toggled", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByLabel("Password", { exact: true });

    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("auth shell stays centered on mobile without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="auth-shell"]');
      const rect = shell?.getBoundingClientRect();

      return {
        innerWidth: window.innerWidth,
        shellLeft: rect?.left ?? -1,
        shellRight: rect?.right ?? Number.POSITIVE_INFINITY,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.shellLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.shellRight).toBeLessThanOrEqual(metrics.innerWidth);
  });
});

import { expect, type Page, test } from "@playwright/test";

test.describe("New page composer", () => {
  test("uses an elevated composer with compact chat/request controls", async ({
    page,
  }) => {
    await page.goto("/?mode=new");

    await expect(page.getByText("What needs to get done?")).toBeVisible();
    await expect(page.getByTestId("new-mode-controls")).toBeVisible();
    await expect(page.getByTestId("new-supply-menu")).toHaveCount(0);
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    await expect(page.getByTestId("suggested-actions")).toHaveCount(0);
    await expect(page.getByText("Quick start")).toHaveCount(0);

    const initialGeometry = await page.evaluate(() => {
      const input = document.querySelector("[data-testid='multimodal-input']");
      const composer = input?.closest("form")?.getBoundingClientRect();
      return {
        composerTop: composer?.top ?? null,
        viewportHeight: window.innerHeight,
      };
    });
    expect(initialGeometry.composerTop).not.toBeNull();
    expect(initialGeometry.composerTop ?? 0).toBeLessThan(
      initialGeometry.viewportHeight * 0.6,
    );

    const firstFooterGeometry = await readComposerFooterGeometry(page);
    expect(firstFooterGeometry.modelRight).toBeLessThan(
      firstFooterGeometry.sendLeft,
    );
    expect(
      Math.abs(
        firstFooterGeometry.modelCenterY - firstFooterGeometry.sendCenterY,
      ),
    ).toBeLessThan(24);

    await page.getByTestId("new-mode-request").click();
    await expect(page).toHaveURL(/mode=new&type=request/);
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute(
      "placeholder",
      /Describe the work/,
    );

    const secondFooterGeometry = await readComposerFooterGeometry(page);
    expect(secondFooterGeometry.modelRight).toBeLessThan(
      secondFooterGeometry.sendLeft,
    );
  });
});

async function readComposerFooterGeometry(page: Page) {
  return page.evaluate(() => {
    const model = document
      .querySelector("[data-testid='model-selector']")
      ?.getBoundingClientRect();
    const send = document
      .querySelector("[data-testid='send-button']")
      ?.getBoundingClientRect();

    if (!model || !send) {
      throw new Error("Composer model selector or send button is missing.");
    }

    return {
      modelCenterY: model.top + model.height / 2,
      modelRight: model.right,
      sendCenterY: send.top + send.height / 2,
      sendLeft: send.left,
    };
  });
}

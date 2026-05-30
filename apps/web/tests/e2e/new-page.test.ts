import { expect, type Page, test } from "@playwright/test";

test.describe("New page composer", () => {
  test("uses an elevated composer with compact chat/request controls", async ({
    page,
  }) => {
    await page.goto("/?mode=new");

    await expect(page.getByText("What needs to get done?")).toBeVisible();
    await expect(page.getByTestId("new-mode-controls")).toBeVisible();
    await expect(page.getByTestId("new-supply-menu")).toHaveCount(0);
    await expect(page.getByTestId("attachment-support-hint")).toHaveCount(0);
    await expect(page.getByText("Images, PDF")).toHaveCount(0);
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    await expect(page.getByTestId("new-mode-chat")).toContainText("New chat");
    await expect(page.getByTestId("new-mode-request")).toContainText(
      "Post request",
    );
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    await expect(page.getByTestId("sidebar-new-chat")).toContainText(
      "New chat",
    );
    await expect(page.getByTestId("sidebar-post-request")).toContainText(
      "Post request",
    );
    await page.getByTestId("sidebar-post-request").click();
    await expect(page).toHaveURL(/mode=new&type=request/);
    await expect(page.getByTestId("new-mode-request")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("sidebar-new-chat").click();
    await expect(page).toHaveURL(/mode=new&type=chat/);
    await expect(page.getByTestId("new-mode-chat")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(250);
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
    await expect(page.getByTestId("new-composer-description")).toBeVisible();
    const firstLayoutGeometry = await readInitialLayoutGeometry(page);
    expect(firstLayoutGeometry.composerTop).toBeGreaterThan(
      firstLayoutGeometry.headlineBottom,
    );
    expect(
      Math.abs(
        firstLayoutGeometry.composerCenterY - firstLayoutGeometry.shellCenterY,
      ),
    ).toBeLessThan(36);
    expect(firstLayoutGeometry.descriptionTop).toBeGreaterThan(
      firstLayoutGeometry.composerBottom,
    );
    expect(
      firstLayoutGeometry.composerTop - firstLayoutGeometry.headlineBottom,
    ).toBeGreaterThan(12);
    expect(
      firstLayoutGeometry.composerTop - firstLayoutGeometry.headlineBottom,
    ).toBeLessThan(96);
    expect(
      firstLayoutGeometry.descriptionTop - firstLayoutGeometry.composerBottom,
    ).toBeGreaterThan(12);

    const firstFooterGeometry = await readComposerFooterGeometry(page);
    expect(firstFooterGeometry.modelRight).toBeLessThan(
      firstFooterGeometry.sendLeft,
    );
    expect(
      Math.abs(
        firstFooterGeometry.modelCenterY - firstFooterGeometry.sendCenterY,
      ),
    ).toBeLessThan(24);
    const firstComposerVisuals = await readComposerVisuals(page);
    expect(firstComposerVisuals.activeModeBackground).toBe(
      firstComposerVisuals.inputSurfaceBackground,
    );

    const chatTextareaHeight = await readTextareaHeight(page);
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
    await page.waitForTimeout(250);
    await expect(page.getByText("Images, PDF")).toHaveCount(0);
    const requestTextareaHeight = await readTextareaHeight(page);
    expect(requestTextareaHeight).toBe(chatTextareaHeight);

    const secondFooterGeometry = await readComposerFooterGeometry(page);
    expect(secondFooterGeometry.modelRight).toBeLessThan(
      secondFooterGeometry.sendLeft,
    );
    const secondComposerVisuals = await readComposerVisuals(page);
    expect(secondComposerVisuals.activeModeBackground).toBe(
      secondComposerVisuals.inputSurfaceBackground,
    );
  });
});

async function readInitialLayoutGeometry(page: Page) {
  return page.evaluate(() => {
    const headline = document.querySelector(
      "[data-testid='empty-chat-headline']",
    );
    const input = document.querySelector("[data-testid='multimodal-input']");
    const description = document.querySelector(
      "[data-testid='new-composer-description']",
    );
    const shell = document.querySelector("[data-testid='chat-shell-surface']");
    const composer = input?.closest("form")?.getBoundingClientRect();
    const headlineRect = headline?.getBoundingClientRect();
    const descriptionRect = description?.getBoundingClientRect();
    const shellRect = shell?.getBoundingClientRect();

    if (!composer || !headlineRect || !descriptionRect || !shellRect) {
      throw new Error("Initial composer layout is missing.");
    }

    return {
      composerBottom: composer.bottom,
      composerCenterY: composer.top + composer.height / 2,
      composerTop: composer.top,
      descriptionTop: descriptionRect.top,
      headlineBottom: headlineRect.bottom,
      shellCenterY: shellRect.top + shellRect.height / 2,
    };
  });
}

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

async function readTextareaHeight(page: Page) {
  return page.evaluate(() => {
    const textarea = document
      .querySelector("[data-testid='multimodal-input']")
      ?.getBoundingClientRect();

    if (!textarea) {
      throw new Error("Composer textarea is missing.");
    }

    return textarea.height;
  });
}

async function readComposerVisuals(page: Page) {
  return page.evaluate(() => {
    const input = document.querySelector("[data-testid='multimodal-input']");
    const surface = input?.closest("form")?.firstElementChild;
    const activeMode = document.querySelector(
      "[data-testid='new-mode-controls'] [aria-pressed='true']",
    );

    if (!surface || !activeMode) {
      throw new Error("Composer surface or active mode is missing.");
    }

    return {
      activeModeBackground: window.getComputedStyle(activeMode).backgroundColor,
      inputSurfaceBackground: window.getComputedStyle(surface).backgroundColor,
    };
  });
}

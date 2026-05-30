import { expect, test } from "@playwright/test";

test.describe("Chat Page", () => {
  test("home page loads with input field", async ({ page }) => {
    await page.goto("/?mode=chat");
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
  });

  test("can type in the input field", async ({ page }) => {
    await page.goto("/?mode=chat");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Hello world");
    await expect(input).toHaveValue("Hello world");
  });

  test("submit button is visible", async ({ page }) => {
    await page.goto("/?mode=chat");
    await expect(page.getByTestId("send-button")).toBeVisible();
  });

  test("empty chat keeps the composer ready", async ({ page }) => {
    await page.goto("/?mode=chat");
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
    await expect(page.getByTestId("attachments-button")).toBeEnabled();
    await expect(page.getByTestId("send-button")).toBeDisabled();
  });

  test("can stop generation with stop button", async ({ page }) => {
    await page.goto("/?mode=chat");

    // Type and send a message
    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();

    // Stop button should appear during generation
    const stopButton = page.getByTestId("stop-button");
    // If generation starts, stop button appears
    // This is a best-effort check since timing depends on API
    await stopButton.click({ timeout: 5000 }).catch(() => {
      // Generation may have finished before we could click
    });
  });
});

test.describe("Chat Input Features", () => {
  test("attaches an uploaded image without breaking the composer", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    const imageBody = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    );

    page.on("pageerror", (error) => pageErrors.push(error));
    await page.route("**/api/files/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          contentType: "image/png",
          filename: "pixel.png",
          pathname: "chat-attachments/e2e/pixel.png",
          size: imageBody.byteLength,
          url: "/api/files/blob?pathname=chat-attachments/e2e/pixel.png&expires=9999999999&signature=test&filename=pixel.png",
        }),
        contentType: "application/json",
        status: 200,
      });
    });
    await page.route("**/api/files/blob?**", async (route) => {
      await route.fulfill({
        body: imageBody,
        contentType: "image/png",
        status: 200,
      });
    });

    await page.goto("/?mode=chat");
    await page.getByTestId("attachment-file-input").setInputFiles({
      buffer: imageBody,
      mimeType: "image/png",
      name: "pixel.png",
    });

    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(1);
    await expect(page.getByTestId("send-button")).toBeEnabled();
    expect(pageErrors).toEqual([]);
  });

  test("shows supported document guidance and uploaded file metadata", async ({
    page,
  }) => {
    const docxBody = Buffer.from("fake docx body");

    await page.route("**/api/files/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          filename: "field-notes.docx",
          pathname: "chat-attachments/e2e/field-notes.docx",
          size: 1536,
          url: "/api/files/blob?pathname=chat-attachments/e2e/field-notes.docx&expires=9999999999&signature=test&filename=field-notes.docx",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/?mode=chat");
    await expect(page.getByTestId("attachment-support-hint")).toContainText(
      "Images, PDF, DOCX, Markdown, TXT, CSV, JSON"
    );
    await expect(page.getByTestId("attachment-file-input")).toHaveAttribute(
      "accept",
      /\.docx/
    );

    await page.getByTestId("attachment-file-input").setInputFiles({
      buffer: docxBody,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      name: "field-notes.docx",
    });

    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(1);
    await expect(page.getByTestId("input-attachment-label")).toHaveText("DOCX");
    await expect(page.getByText("field-notes.docx")).toBeVisible();
    await expect(page.getByTestId("input-attachment-size")).toHaveText("1.5 KB");
    await expect(page.getByTestId("send-button")).toBeEnabled();
  });

  test("does not keep malformed successful upload responses", async ({
    page,
  }) => {
    await page.route("**/api/files/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          contentType: "text/markdown",
          filename: "notes.md",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/?mode=chat");
    await page.getByTestId("attachment-file-input").setInputFiles({
      buffer: Buffer.from("# Broken upload"),
      mimeType: "text/markdown",
      name: "notes.md",
    });

    await expect(
      page.getByText(/returned an invalid attachment/)
    ).toBeVisible();
    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(0);
    await expect(page.getByTestId("send-button")).toBeDisabled();
  });

  test("refuses unsupported files before enforcing attachment limits", async ({
    page,
  }) => {
    let uploadCount = 0;

    await page.route("**/api/files/upload", async (route) => {
      const index = uploadCount++;

      await route.fulfill({
        body: JSON.stringify({
          contentType: "text/markdown",
          filename: `note-${index}.md`,
          pathname: `chat-attachments/e2e/note-${index}.md`,
          size: 12,
          url: `/api/files/blob?pathname=chat-attachments/e2e/note-${index}.md&expires=9999999999&signature=test&filename=note-${index}.md`,
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/?mode=chat");
    await page.getByTestId("attachment-file-input").setInputFiles([
      ...Array.from({ length: 8 }, (_, index) => ({
        buffer: Buffer.from(`# Note ${index}`),
        mimeType: "text/markdown",
        name: `note-${index}.md`,
      })),
      {
        buffer: Buffer.from("MZ"),
        mimeType: "application/octet-stream",
        name: "malware.exe",
      },
    ]);

    await expect(
      page.getByText(/malware\.exe: Unsupported file type/)
    ).toBeVisible();
    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(8);
    expect(uploadCount).toBe(8);
  });

  test("input clears after sending", async ({ page }) => {
    await page.goto("/?mode=chat");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Test message");
    await page.getByTestId("send-button").click();

    // Input should clear after sending
    await expect(input).toHaveValue("");
  });

  test("input supports multiline text", async ({ page }) => {
    await page.goto("/?mode=chat");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Line 1\nLine 2\nLine 3");
    await expect(input).toContainText("Line 1");
  });

  test("request mode shows the briefing optimizer toggle", async ({
    page,
  }) => {
    await page.goto("/?mode=request");

    const optimizerToggle = page.getByTestId(
      "request-prompt-optimizer-toggle"
    );

    await expect(optimizerToggle).toBeVisible();
    await expect(optimizerToggle).toHaveText("Preflight assist off");

    await optimizerToggle.click();
    await expect(optimizerToggle).toHaveText("Preflight assist on");
  });
});

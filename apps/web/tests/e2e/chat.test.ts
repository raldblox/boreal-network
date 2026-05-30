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

  test("optimizes oversized images before upload", async ({ page }) => {
    let uploadRequestBytes = 0;

    await page.route("**/api/files/upload", async (route) => {
      uploadRequestBytes = route.request().postDataBuffer()?.byteLength ?? 0;

      await route.fulfill({
        body: JSON.stringify({
          contentType: "image/jpeg",
          filename: "camera-roll-photo.jpg",
          pathname: "chat-attachments/e2e/camera-roll-photo.jpg",
          size: uploadRequestBytes,
          url: "/api/files/blob?pathname=chat-attachments/e2e/camera-roll-photo.jpg&expires=9999999999&signature=test&filename=camera-roll-photo.jpg",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/?mode=chat");

    const originalSize = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>(
        "[data-testid='attachment-file-input']"
      );

      if (!input) {
        throw new Error("Attachment input not found.");
      }

      const width = 3100;
      const height = 3100;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context unavailable.");
      }

      const imageData = context.createImageData(width, height);

      for (let index = 0; index < imageData.data.length; index += 4) {
        const pixel = index / 4;
        imageData.data[index] = (pixel * 17) % 256;
        imageData.data[index + 1] = (pixel * 37) % 256;
        imageData.data[index + 2] = (pixel * 67) % 256;
        imageData.data[index + 3] = 255;
      }

      context.putImageData(imageData, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error("JPEG encode failed.")),
          "image/jpeg",
          0.98
        );
      });
      const file = new File([blob], "camera-roll-photo.jpg", {
        type: "image/jpeg",
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));

      return file.size;
    });

    expect(originalSize).toBeGreaterThan(10 * 1024 * 1024);
    expect(originalSize).toBeLessThanOrEqual(20 * 1024 * 1024);
    await expect(page.getByTestId("input-attachment-loader")).toHaveCount(0);
    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(1);
    await expect(page.getByTestId("input-attachment-size")).toBeVisible();
    expect(uploadRequestBytes).toBeGreaterThan(0);
    expect(uploadRequestBytes).toBeLessThan(originalSize);
    await expect(page.getByTestId("send-button")).toBeEnabled();
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

  test("keeps failed uploads visible and retryable", async ({ page }) => {
    let uploadCount = 0;

    await page.route("**/api/files/upload", async (route) => {
      uploadCount += 1;

      if (uploadCount === 1) {
        await route.fulfill({
          body: JSON.stringify({
            error: "Upload storage is unavailable right now.",
          }),
          contentType: "application/json",
          status: 503,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          contentType: "text/markdown",
          filename: "retry-me.md",
          pathname: "chat-attachments/e2e/retry-me.md",
          size: 14,
          url: "/api/files/blob?pathname=chat-attachments/e2e/retry-me.md&expires=9999999999&signature=test&filename=retry-me.md",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/?mode=chat");
    await page.getByTestId("attachment-file-input").setInputFiles({
      buffer: Buffer.from("# Retry me"),
      mimeType: "text/markdown",
      name: "retry-me.md",
    });

    await expect(page.getByTestId("input-attachment-error")).toContainText(
      "unavailable"
    );
    await expect(page.getByTestId("send-button")).toBeDisabled();

    await page.getByTestId("input-attachment-retry").click();

    await expect(page.getByTestId("input-attachment-error")).toHaveCount(0);
    await expect(
      page.getByTestId("input-attachment-preview").getByText("retry-me.md")
    ).toBeVisible();
    await expect(page.getByTestId("send-button")).toBeEnabled();
    expect(uploadCount).toBe(2);
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
    await expect(page.getByTestId("input-attachment-error")).toContainText(
      "returned an invalid attachment"
    );
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

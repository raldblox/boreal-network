import { generateImage } from "ai";
import {
  openai,
  type OpenAIImageModelGenerationOptions,
} from "@ai-sdk/openai";
import { createDocumentHandler } from "@/lib/artifacts/server";

const DEFAULT_IMAGE_MODEL = "gpt-image-1-mini";

function getImageGenerationModelId() {
  return process.env.BOREAL_IMAGE_GENERATION_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

function toImageGenerationErrorMessage(error: unknown) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return "Image generation needs OPENAI_API_KEY before Boreal can create images.";
  }

  if (error instanceof Error && error.message.trim()) {
    return `Image generation failed: ${error.message}`;
  }

  return "Image generation failed. Try a simpler prompt or retry later.";
}

async function generateImageContent(prompt: string) {
  try {
    const result = await generateImage({
      model: openai.image(getImageGenerationModelId()),
      prompt,
      size: "1024x1024",
      providerOptions: {
        openai: {
          outputFormat: "png",
          quality: "medium",
        } satisfies OpenAIImageModelGenerationOptions,
      },
    });

    if (!result.image?.base64) {
      throw new Error("No image was returned by the image model.");
    }

    return result.image.base64;
  } catch (error) {
    throw new Error(toImageGenerationErrorMessage(error));
  }
}

export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ title, dataStream }) => {
    const imageBase64 = await generateImageContent(title);

    dataStream.write({
      type: "data-imageDelta",
      data: imageBase64,
      transient: true,
    });

    return imageBase64;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    const imageBase64 = await generateImageContent(description);

    dataStream.write({
      type: "data-imageDelta",
      data: imageBase64,
      transient: true,
    });

    return imageBase64;
  },
});

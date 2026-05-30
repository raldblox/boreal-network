import { toast } from "sonner";
import { Artifact } from "@/components/chat/create-artifact";
import { CopyIcon, RedoIcon, UndoIcon } from "@/components/chat/icons";
import { ImageEditor } from "@/components/chat/image-editor";

function getGeneratedImageSrc(content: string) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return null;
  }

  if (trimmedContent.startsWith("data:image/")) {
    return trimmedContent;
  }

  return `data:image/png;base64,${trimmedContent}`;
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Generated image could not be decoded."));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Generated image could not be copied."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

async function copyImageContentToClipboard(content: string) {
  const imageSrc = getGeneratedImageSrc(content);

  if (!imageSrc) {
    throw new Error("Image content is not available.");
  }

  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Image clipboard copy is not supported in this browser.");
  }

  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image canvas is not available.");
  }

  context.drawImage(image, 0, 0);
  const blob = await canvasToPngBlob(canvas);

  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export const imageArtifact = new Artifact({
  kind: "image",
  description: "Useful for image generation",
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-imageDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ImageEditor,
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy image to clipboard",
      onClick: async ({ content }) => {
        try {
          await copyImageContentToClipboard(content);
          toast.success("Copied image to clipboard!");
        } catch (error) {
          toast.error(
            error instanceof Error && error.message.trim()
              ? error.message
              : "Could not copy image to clipboard."
          );
        }
      },
      isDisabled: ({ content }) => {
        return !content.trim();
      },
    },
  ],
  toolbar: [],
});

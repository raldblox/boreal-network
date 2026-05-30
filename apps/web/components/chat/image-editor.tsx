import cn from "classnames";
import { useEffect, useMemo, useState } from "react";
import { LoaderIcon } from "./icons";

type ImageEditorProps = {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
};

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

export function ImageEditor({
  title,
  content,
  status,
  isInline,
}: ImageEditorProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = useMemo(() => getGeneratedImageSrc(content), [content]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  return (
    <div
      className={cn("flex w-full flex-row items-center justify-center", {
        "h-[calc(100dvh-60px)]": !isInline,
        "h-[200px]": isInline,
      })}
    >
      {status === "streaming" ? (
        <div className="flex flex-row items-center gap-4">
          {!isInline && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
          <div>Generating Image...</div>
        </div>
      ) : !content ? (
        <div className="max-w-sm text-center text-muted-foreground text-sm">
          Image generation did not return an image. Try again with a simpler
          prompt.
        </div>
      ) : imageFailed || !imageSrc ? (
        <div
          className="max-w-sm text-center text-muted-foreground text-sm"
          data-testid="image-artifact-error"
        >
          Generated image data could not be displayed. Try regenerating it with
          a simpler prompt.
        </div>
      ) : (
        <picture>
          <img
            alt={title}
            className={cn("h-fit w-full max-w-[800px]", {
              "p-0 md:p-20": !isInline,
            })}
            onError={() => setImageFailed(true)}
            src={imageSrc}
          />
        </picture>
      )}
    </div>
  );
}

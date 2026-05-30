import { useState } from "react";
import {
  formatAttachmentBytes,
  getChatAttachmentKind,
  getChatAttachmentLabel,
} from "@/lib/chat-attachment-policy";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";
import { CrossSmallIcon, FileIcon } from "./icons";

export const PreviewAttachment = ({
  attachment,
  errorMessage,
  isUploading = false,
  onRemove,
  onRetry,
}: {
  attachment: Attachment;
  errorMessage?: string;
  isUploading?: boolean;
  onRemove?: () => void;
  onRetry?: () => void;
}) => {
  const { name, url, contentType, size } = attachment;
  const [imageFailed, setImageFailed] = useState(false);
  const kind = getChatAttachmentKind(contentType);
  const label = getChatAttachmentLabel({ name, type: contentType });
  const sizeLabel = typeof size === "number" ? formatAttachmentBytes(size) : null;
  const showImage = kind === "image" && url && !imageFailed;
  const removeLabel = isUploading
    ? `Cancel ${name ?? "attachment"}`
    : `Remove ${name ?? "attachment"}`;

  return (
    <div
      className={cn(
        "group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted",
        errorMessage
          ? "border-destructive/50 bg-destructive/5"
          : "border-border/40"
      )}
      data-testid="input-attachment-preview"
      title={errorMessage ?? name}
    >
      {showImage ? (
        <img
          alt={name ?? "attachment"}
          className="size-full object-cover"
          draggable={false}
          onError={() => setImageFailed(true)}
          src={url}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground text-xs">
          <FileIcon size={20} />
          <span
            className="rounded-full bg-background/80 px-2 py-0.5 font-medium text-[10px] text-foreground"
            data-testid="input-attachment-label"
          >
            {label}
          </span>
          {name ? (
            <span className="line-clamp-2 max-w-full break-all text-[10px] leading-3">
              {name}
            </span>
          ) : null}
          {errorMessage ? (
            <span
              className="line-clamp-2 text-[9px] leading-3 text-destructive"
              data-testid="input-attachment-error"
            >
              {errorMessage}
            </span>
          ) : sizeLabel ? (
            <span
              className="text-[9px] leading-3 text-muted-foreground/70"
              data-testid="input-attachment-size"
            >
              {sizeLabel}
            </span>
          ) : null}
        </div>
      )}

      {showImage && sizeLabel ? (
        <span
          className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white backdrop-blur-sm"
          data-testid="input-attachment-size"
        >
          {sizeLabel}
        </span>
      ) : null}

      {errorMessage && onRetry && !isUploading ? (
        <button
          aria-label={`Retry ${name ?? "attachment"}`}
          className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 font-medium text-[10px] text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
          data-testid="input-attachment-retry"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm"
          data-testid="input-attachment-loader"
        >
          <Spinner className="size-5" />
        </div>
      )}

      {onRemove && (
        <button
          aria-label={removeLabel}
          className={cn(
            "absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80",
            isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          data-testid="input-attachment-remove"
          onClick={onRemove}
          type="button"
        >
          <CrossSmallIcon size={10} />
        </button>
      )}
    </div>
  );
};

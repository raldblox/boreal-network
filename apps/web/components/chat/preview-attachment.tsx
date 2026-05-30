import { useState } from "react";
import {
  formatAttachmentBytes,
  getChatAttachmentKind,
  getChatAttachmentLabel,
} from "@/lib/chat-attachment-policy";
import type { Attachment } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { CrossSmallIcon, FileIcon } from "./icons";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType, size } = attachment;
  const [imageFailed, setImageFailed] = useState(false);
  const kind = getChatAttachmentKind(contentType);
  const label = getChatAttachmentLabel({ name, type: contentType });
  const sizeLabel = typeof size === "number" ? formatAttachmentBytes(size) : null;
  const showImage = kind === "image" && url && !imageFailed;

  return (
    <div
      className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted"
      data-testid="input-attachment-preview"
      title={name}
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
          {sizeLabel ? (
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

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm"
          data-testid="input-attachment-loader"
        >
          <Spinner className="size-5" />
        </div>
      )}

      {onRemove && !isUploading && (
        <button
          aria-label={`Remove ${name ?? "attachment"}`}
          className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
          onClick={onRemove}
          type="button"
        >
          <CrossSmallIcon size={10} />
        </button>
      )}
    </div>
  );
};

"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ExternalLinkIcon,
  FileTextIcon,
  HardDriveDownloadIcon,
  PlayCircleIcon,
} from "lucide-react";
import { useMemo } from "react";
import { MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { useArtifact } from "@/hooks/use-artifact";
import type { RequestActivityEntry } from "@/lib/request";
import { cn } from "@/lib/utils";
import { DocumentPreview } from "./document-preview";
import { SparklesIcon } from "./icons";

export function RequestActivityTimeline({
  activities,
  ownerUserId,
  isReadonly,
}: {
  activities: RequestActivityEntry[];
  ownerUserId: string | null;
  isReadonly: boolean;
}) {
  const orderedActivities = useMemo(
    () => [...activities].sort((left, right) => left.sequence - right.sequence),
    [activities]
  );

  if (orderedActivities.length === 0) {
    return null;
  }

  return (
    <>
      {orderedActivities.map((activity, index) => (
        <RequestActivityMessage
          activity={activity}
          index={index}
          isReadonly={isReadonly}
          key={activity.eventId}
          ownerUserId={ownerUserId}
          totalCount={orderedActivities.length}
          variant="timeline"
        />
      ))}
    </>
  );
}

export function RequestActivityMessage({
  activity,
  ownerUserId,
  isReadonly,
  index,
  totalCount,
  variant = "timeline",
}: {
  activity: RequestActivityEntry;
  ownerUserId: string | null;
  isReadonly: boolean;
  index: number;
  totalCount: number;
  variant?: "timeline" | "stage";
}) {
  const isOwnerActivity =
    Boolean(ownerUserId) && activity.actor.id === ownerUserId;
  const text = getPrimaryActivityText(activity);
  const secondaryDetail = getSecondaryActivityDetail(activity);
  const documentArtifact = getDocumentArtifactPreview(activity);
  const artifactPreview = documentArtifact ? (
    <DocumentPreview isReadonly={isReadonly} result={documentArtifact} />
  ) : activity.artifact ? (
    <NonDocumentArtifactButton activity={activity} isReadonly={isReadonly} />
  ) : null;
  const showArtifactFirst = Boolean(activity.artifact);

  const content = (
    <>
      {showArtifactFirst ? artifactPreview : null}

      {text ? (
        <MessageContent
          className="text-[13px] leading-6"
          data-testid="request-activity-content"
        >
          <MessageResponse>{text}</MessageResponse>
        </MessageContent>
      ) : null}

      {secondaryDetail ? (
        <div className="text-[11px] leading-5.5 text-muted-foreground">
          <MessageResponse>{secondaryDetail}</MessageResponse>
        </div>
      ) : null}

      {!showArtifactFirst ? artifactPreview : null}

      <div className="text-[10px] text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        {formatDistanceToNow(new Date(activity.occurredAt), {
          addSuffix: true,
        })}
      </div>
    </>
  );

  if (variant === "stage") {
    return (
      <div className="group/message w-full" data-role="assistant">
        <div className="rounded-[16px] border border-border/60 bg-background/92 px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.025)]">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/68">
            <span>{formatActivityLabel(activity.eventType)}</span>
            <span className="text-border">/</span>
            <span>{formatLabel(activity.aggregateType)}</span>
          </div>
          <div className="space-y-2">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="group/message w-full" data-role="assistant">
      <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-2.5">
        <div className="relative">
          {index > 0 ? (
            <div className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-border/70" />
          ) : null}
          {index < totalCount - 1 ? (
            <div className="absolute left-1/2 top-6 -bottom-2.5 w-px -translate-x-1/2 bg-border/70" />
          ) : null}
          <div className="relative z-10 flex h-6 items-center justify-center">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full border shadow-sm",
                isOwnerActivity
                  ? "border-foreground/10 bg-foreground text-background"
                  : "border-border/70 bg-background text-muted-foreground"
              )}
            >
              <SparklesIcon size={11} />
            </div>
          </div>
        </div>

        <div className="min-w-0 pb-2.5 pt-0.5">
          <div className="rounded-[16px] border border-border/60 bg-background/92 px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.025)]">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/68">
              <span>{formatActivityLabel(activity.eventType)}</span>
              <span className="text-border">/</span>
              <span>{formatLabel(activity.aggregateType)}</span>
            </div>
            <div className="space-y-2">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NonDocumentArtifactButton({
  activity,
  isReadonly,
}: {
  activity: RequestActivityEntry;
  isReadonly: boolean;
}) {
  const artifact = activity.artifact;
  const { setArtifact } = useArtifact();

  if (!artifact) {
    return null;
  }

  const container = artifact.container;

  if (container.kind !== "document") {
    const mediaPreviewUrl = getMediaPreviewUrl(activity);
    const isVideoPreview = isVideoArtifact(activity);

    return (
      <div className="overflow-hidden rounded-[18px] border border-border/70 bg-muted/[0.22] text-xs text-muted-foreground">
        {isVideoPreview && mediaPreviewUrl ? (
          <div className="border-b border-border/60 bg-black">
            <video
              className="aspect-video w-full bg-black object-contain"
              controls
              preload="metadata"
              src={mediaPreviewUrl}
            >
              <track
                kind="captions"
                label="No captions"
                src="data:text/vtt,WEBVTT"
                srcLang="en"
              />
            </video>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 px-3 py-3">
          <div className="flex items-center gap-2 text-foreground">
            {isVideoPreview ? (
              <PlayCircleIcon className="size-4 text-emerald-300" />
            ) : (
              <HardDriveDownloadIcon className="size-4" />
            )}
            <span className="font-medium">{artifact.title}</span>
          </div>
          {isVideoPreview ? (
            <div className="text-[11px] leading-5 text-muted-foreground">
              Video delivery is attached to this request. Preview it here before
              accepting the work.
            </div>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border/60 px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 px-2 py-0.5">
              {artifact.kind}
            </span>
            {container.mediaKind ? (
              <span className="rounded-full border border-border/70 px-2 py-0.5">
                {container.mediaKind}
              </span>
            ) : null}
            {container.mimeType ? (
              <span className="rounded-full border border-border/70 px-2 py-0.5">
                {container.mimeType}
              </span>
            ) : null}
          </div>

          {container.kind === "external_ref" ? (
            <a
              className="inline-flex w-fit items-center gap-1 text-primary hover:underline"
              href={container.uri}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon className="size-3.5" />
              Open external artifact
            </a>
          ) : (
            <div className="space-y-1">
              <div>Provider: {container.storageProvider}</div>
              {mediaPreviewUrl ? (
                <a
                  className="inline-flex w-fit items-center gap-1 text-primary hover:underline"
                  href={mediaPreviewUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  Open media file
                </a>
              ) : (
                <div className="break-all">Key: {container.objectKey}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const documentContainer = container;

  return (
    <Button
      className="w-fit rounded-2xl border-border/70 bg-background shadow-none"
      onClick={(event) => {
        if (isReadonly) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          documentId: documentContainer.documentId,
          kind: documentContainer.documentKind,
          title: artifact.title,
          isVisible: true,
          status: "idle",
          boundingBox: {
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          },
        }));
      }}
      type="button"
      variant="outline"
    >
      <FileTextIcon className="mr-2 size-4" />
      Open {artifact.kind}
    </Button>
  );
}

function isVideoArtifact(activity: RequestActivityEntry) {
  const artifact = activity.artifact;
  const container = artifact?.container;

  if (!artifact || !container || container.kind === "document") {
    return false;
  }

  return (
    (artifact.kind === "media" &&
      "mediaKind" in container &&
      container.mediaKind === "video") ||
    ("mimeType" in container &&
      typeof container.mimeType === "string" &&
      container.mimeType.toLowerCase().startsWith("video/"))
  );
}

function getMediaPreviewUrl(activity: RequestActivityEntry) {
  const artifact = activity.artifact;
  const container = artifact?.container;

  if (!artifact || !container || container.kind === "document") {
    return null;
  }

  if (container.kind === "external_ref") {
    return container.uri;
  }

  if (container.storageProvider !== "vercel_blob") {
    return null;
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests/${
    activity.requestId
  }/artifacts/${artifact.id}/media`;
}

function getPrimaryActivityText(activity: RequestActivityEntry) {
  return activity.summary.trim();
}

function getSecondaryActivityDetail(activity: RequestActivityEntry) {
  const detail = activity.detail?.trim();
  const artifactProofDetail = formatArtifactProofDetail(activity);

  if (!detail) {
    return artifactProofDetail;
  }

  if (
    activity.eventType === "request.opened" ||
    activity.eventType.startsWith("fulfillment.")
  ) {
    return artifactProofDetail;
  }

  if (detail === activity.summary.trim()) {
    return artifactProofDetail;
  }

  return artifactProofDetail ? `${detail} | ${artifactProofDetail}` : detail;
}

function getDocumentArtifactPreview(activity: RequestActivityEntry) {
  const artifact = activity.artifact;

  if (!artifact || artifact.container.kind !== "document") {
    return null;
  }

  if (
    artifact.container.documentKind !== "text" &&
    artifact.container.documentKind !== "code" &&
    artifact.container.documentKind !== "sheet" &&
    artifact.container.documentKind !== "image"
  ) {
    return null;
  }

  return {
    id: artifact.container.documentId,
    title: artifact.title,
    kind: artifact.container.documentKind,
  } as const;
}

function formatActivityLabel(value: string) {
  return value.replace(/\./g, " ");
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatArtifactProofDetail(activity: RequestActivityEntry) {
  const metadata = activity.artifact?.metadata;
  if (!metadata) {
    return null;
  }

  const parts = [
    metadata.evidenceClaims?.length
      ? `Evidence: ${metadata.evidenceClaims.map(formatLabel).join(", ")}`
      : null,
    metadata.locationSignal?.label?.trim()
      ? `Location: ${metadata.locationSignal.label.trim()}`
      : null,
    metadata.witness?.name?.trim()
      ? `Witness: ${metadata.witness.name.trim()}`
      : null,
    metadata.captureTime?.trim()
      ? `Captured: ${formatCaptureTime(metadata.captureTime)}`
      : null,
    metadata.captureIntegrity?.method?.trim()
      ? `Integrity: ${metadata.captureIntegrity.method.trim()}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function formatCaptureTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

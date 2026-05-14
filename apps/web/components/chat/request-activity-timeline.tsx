"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ExternalLinkIcon,
  FileTextIcon,
  HardDriveDownloadIcon,
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
          ownerUserId={ownerUserId}
          isReadonly={isReadonly}
          index={index}
          key={activity.eventId}
          totalCount={orderedActivities.length}
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
}: {
  activity: RequestActivityEntry;
  ownerUserId: string | null;
  isReadonly: boolean;
  index: number;
  totalCount: number;
}) {
  const isOwnerActivity =
    Boolean(ownerUserId) && activity.actor.id === ownerUserId;
  const text = getPrimaryActivityText(activity);
  const secondaryDetail = getSecondaryActivityDetail(activity);
  const documentArtifact = getDocumentArtifactPreview(activity);
  const artifactPreview = documentArtifact ? (
    <DocumentPreview
      isReadonly={isReadonly}
      result={documentArtifact}
    />
  ) : activity.artifact ? (
    <NonDocumentArtifactButton
      activity={activity}
      isReadonly={isReadonly}
    />
  ) : null;
  const showArtifactFirst = Boolean(activity.artifact);

  const content = (
    <>
      {showArtifactFirst ? artifactPreview : null}

      {text ? (
        <MessageContent
          className="text-[14px] leading-7"
          data-testid="request-activity-content"
        >
          <MessageResponse>{text}</MessageResponse>
        </MessageContent>
      ) : null}

      {secondaryDetail ? (
        <div className="text-[12px] leading-6 text-muted-foreground">
          <MessageResponse>{secondaryDetail}</MessageResponse>
        </div>
      ) : null}

      {!showArtifactFirst ? artifactPreview : null}

      <div className="text-[11px] text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        {formatDistanceToNow(new Date(activity.occurredAt), {
          addSuffix: true,
        })}
      </div>
    </>
  );

  return (
    <div
      className="group/message w-full"
      data-role="assistant"
    >
      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
        <div className="relative">
          {index > 0 ? (
            <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-border/70" />
          ) : null}
          {index < totalCount - 1 ? (
            <div className="absolute left-1/2 top-7 -bottom-3 w-px -translate-x-1/2 bg-border/70" />
          ) : null}
          <div className="relative z-10 flex h-7 items-center justify-center">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full border shadow-sm",
                isOwnerActivity
                  ? "border-foreground/10 bg-foreground text-background"
                  : "border-border/70 bg-background text-muted-foreground"
              )}
            >
              <SparklesIcon size={11} />
            </div>
          </div>
        </div>

        <div className="min-w-0 pb-3 pt-0.5">
          <div className="rounded-[20px] border border-border/60 bg-background/92 px-4 py-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/68">
              <span>{formatActivityLabel(activity.eventType)}</span>
              <span className="text-border">•</span>
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
    return (
      <div className="flex flex-col gap-2 rounded-[18px] border border-border/70 bg-muted/[0.22] px-3 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <HardDriveDownloadIcon className="size-4" />
          <span className="font-medium">{artifact.title}</span>
        </div>
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
            <div className="break-all">Key: {container.objectKey}</div>
          </div>
        )}
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

function getPrimaryActivityText(activity: RequestActivityEntry) {
  return activity.summary.trim();
}

function getSecondaryActivityDetail(activity: RequestActivityEntry) {
  const detail = activity.detail?.trim();

  if (!detail) {
    return null;
  }

  if (
    activity.eventType === "request.opened" ||
    activity.eventType.startsWith("fulfillment.")
  ) {
    return null;
  }

  if (detail === activity.summary.trim()) {
    return null;
  }

  return detail;
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

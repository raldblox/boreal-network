"use client";

import { formatDistanceToNow } from "date-fns";
import { FileTextIcon } from "lucide-react";
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
      {orderedActivities.map((activity) => (
        <RequestActivityMessage
          activity={activity}
          ownerUserId={ownerUserId}
          isReadonly={isReadonly}
          key={activity.eventId}
        />
      ))}
    </>
  );
}

export function RequestActivityMessage({
  activity,
  ownerUserId,
  isReadonly,
}: {
  activity: RequestActivityEntry;
  ownerUserId: string | null;
  isReadonly: boolean;
}) {
  const isOwnerActivity =
    Boolean(ownerUserId) && activity.actor.id === ownerUserId;
  const text = getPrimaryActivityText(activity);
  const secondaryDetail = getSecondaryActivityDetail(activity);
  const documentArtifact = getDocumentArtifactPreview(activity);

  const content = (
    <>
      {text ? (
        <MessageContent
          className="text-[13px] leading-[1.65]"
          data-testid="request-activity-content"
        >
          <MessageResponse>{text}</MessageResponse>
        </MessageContent>
      ) : null}

      {secondaryDetail ? (
        <div className="px-1 text-[12px] text-muted-foreground">
          <MessageResponse>{secondaryDetail}</MessageResponse>
        </div>
      ) : null}

      {documentArtifact ? (
        <DocumentPreview
          isReadonly={isReadonly}
          result={documentArtifact}
        />
      ) : activity.artifact ? (
        <NonDocumentArtifactButton
          activity={activity}
          isReadonly={isReadonly}
        />
      ) : null}

      <div className="px-1 text-[11px] text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
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
      <div className="flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-lg ring-1 ring-border/50",
              isOwnerActivity
                ? "bg-secondary/80 text-foreground"
                : "bg-muted/60 text-muted-foreground"
            )}
          >
            <SparklesIcon size={13} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">{content}</div>
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

  if (!artifact || artifact.container.kind !== "document") {
    return null;
  }

  return (
    <Button
      className="w-fit rounded-xl"
      onClick={(event) => {
        if (isReadonly) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          documentId: artifact.container.documentId,
          kind: artifact.container.documentKind,
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

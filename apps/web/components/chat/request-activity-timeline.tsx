"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckSquare2Icon,
  FileTextIcon,
  HandCoinsIcon,
  SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useArtifact } from "@/hooks/use-artifact";
import type { RequestActivityEntry } from "@/lib/request";

export function RequestActivityTimeline({
  activities,
}: {
  activities: RequestActivityEntry[];
}) {
  const { setArtifact } = useArtifact();

  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 px-4 py-4 text-sm text-muted-foreground">
        No request activity yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">Request activity</div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          latest first
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {activities.map((activity) => {
          const artifact = activity.artifact;

          return (
            <div
              className="rounded-2xl border border-border/50 bg-card/35 px-4 py-3"
              key={activity.eventId}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
                    {activity.aggregateType === "commitment" ? (
                      <HandCoinsIcon className="size-4" />
                    ) : activity.aggregateType === "artifact" ? (
                      <FileTextIcon className="size-4" />
                    ) : activity.eventType === "request.opened" ? (
                      <CheckSquare2Icon className="size-4" />
                    ) : (
                      <SparklesIcon className="size-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-sm">{activity.summary}</div>
                      <Badge className="rounded-full" variant="secondary">
                        {formatActivityLabel(activity)}
                      </Badge>
                    </div>

                    {activity.detail ? (
                      <div className="mt-1 text-[13px] text-muted-foreground">
                        {activity.detail}
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span>{activity.actor.id}</span>
                      <span>/</span>
                      <span>
                        {formatDistanceToNow(new Date(activity.occurredAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {activity.requestStatus ? (
                        <>
                          <span>/</span>
                          <span>{activity.requestStatus.replace(/_/g, " ")}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {artifact ? (
                  <Button
                    className="shrink-0"
                    onClick={() => {
                      setArtifact((currentArtifact) => ({
                        ...currentArtifact,
                        documentId: artifact.container.documentId,
                        title: artifact.title,
                        kind: artifact.container.documentKind,
                        isVisible: true,
                        status: "idle",
                      }));
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Open artifact
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatActivityLabel(activity: RequestActivityEntry) {
  if (activity.aggregateType === "commitment" && activity.commitment) {
    return `${activity.commitment.kind} ${activity.commitment.status}`;
  }

  if (activity.aggregateType === "artifact" && activity.artifact) {
    return activity.artifact.kind;
  }

  return activity.eventType.replace(/\./g, " ");
}

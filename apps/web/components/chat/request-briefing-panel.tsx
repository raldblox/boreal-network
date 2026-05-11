"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BorealRequestDraft } from "@/lib/request";
import { toast } from "./toast";

type RequestBriefingPanelProps = {
  request: BorealRequestDraft | null;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  isRequestMode: boolean;
  onCreateRequest: () => Promise<BorealRequestDraft | null>;
  onOpenRequest: () => Promise<void>;
  onOpenDocument: () => void;
};

export function RequestBriefingPanel({
  request,
  isReadonly,
  isArtifactVisible,
  isRequestMode,
  onCreateRequest,
  onOpenRequest,
  onOpenDocument,
}: RequestBriefingPanelProps) {
  if (isReadonly) {
    return null;
  }

  if (!request) {
    return (
      <div className="border-b border-border/50 bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-dashed border-border/60 bg-card/40 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {isRequestMode
                ? "Opening request draft"
                : "Request mode stays explicit"}
            </div>
            <div className="text-[13px] text-muted-foreground">
              {isRequestMode
                ? "Boreal is creating an untitled request object and loading its live brief beside the chat."
                : "Start a durable Request when this thread should become real work."}
            </div>
          </div>
          {!isRequestMode && (
            <Button className="w-full md:w-auto" onClick={onCreateRequest}>
              New request
            </Button>
          )}
        </div>
      </div>
    );
  }

  const canOpenRequest =
    request.status === "draft" && request.derived.readiness.readyForOpen;

  return (
    <div className="border-b border-border/50 bg-background/95 px-4 py-3">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">Request briefing mode</span>
              <Badge className="rounded-full" variant="secondary">
                {request.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="text-lg leading-tight">
              {request.brief.title?.trim() || "Untitled request"}
            </div>
            <div className="text-[13px] text-muted-foreground">
              {request.derived.readiness.summary}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onOpenDocument} variant="outline">
              {isArtifactVisible ? "Focus brief" : "Open brief"}
            </Button>
            <Button
              onClick={() =>
                toast({
                  type: "success",
                  description: "Draft already saved.",
                })
              }
              variant="outline"
            >
              Save draft
            </Button>
            <Button disabled={!canOpenRequest} onClick={onOpenRequest}>
              Open request
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(request.derived.missingDetails.length > 0
            ? request.derived.missingDetails
            : ["No blocking gaps"]).map((detail) => (
            <Badge className="rounded-full" key={detail} variant="secondary">
              {detail.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

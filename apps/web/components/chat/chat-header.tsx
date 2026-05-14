"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import type { RequestStatus } from "@/lib/request";
import { SparklesIcon } from "./icons";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  requestId,
  selectedVisibilityType,
  isReadonly,
  isRequestMode,
  requestStatus,
}: {
  chatId: string;
  requestId?: string | null;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isRequestMode: boolean;
  requestStatus?: RequestStatus | null;
}) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 px-3 md:px-4">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <Link
        className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-muted/55"
        href="/"
      >
        <div className="flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background text-foreground shadow-sm">
          <SparklesIcon size={14} />
        </div>
        <div className="hidden min-w-0 flex-col leading-none sm:flex">
          <span className="truncate text-[13px] font-medium text-foreground">
            Boreal
          </span>
          <span className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground/[0.7]">
            {requestStatus === "draft"
              ? "Request drafting"
              : requestStatus
                ? "Request room"
                : isRequestMode
                  ? "Request"
                  : "Chat"}
          </span>
        </div>
        <span className="text-[13px] font-medium text-foreground sm:hidden">
          Boreal
        </span>
      </Link>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          requestId={requestId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.requestId === nextProps.requestId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.isRequestMode === nextProps.isRequestMode &&
    prevProps.requestStatus === nextProps.requestStatus
  );
});

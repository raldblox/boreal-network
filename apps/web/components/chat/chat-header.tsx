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
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <Link
        className="flex items-center gap-3 rounded-xl px-1.5 py-1 transition-colors hover:bg-sidebar-accent/40"
        href="/"
      >
        <div className="flex size-8 items-center justify-center rounded-xl border border-sidebar-border/60 bg-background/60 text-sidebar-foreground shadow-sm">
          <SparklesIcon size={14} />
        </div>
        <div className="hidden min-w-0 flex-col leading-none sm:flex">
          <span className="truncate text-[13px] font-medium text-sidebar-foreground">
            Boreal
          </span>
          <span className="truncate text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/[0.45]">
            {requestStatus === "draft"
              ? "Request drafting"
              : requestStatus
                ? "Request room"
                : isRequestMode
                  ? "Request"
                  : "Chat"}
          </span>
        </div>
        <span className="text-[13px] font-medium text-sidebar-foreground sm:hidden">
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

"use client";

import { memo } from "react";
import type { RequestStatus } from "@/lib/request";
import {
  buildSurfaceTopNavLinks,
  SidebarSurfaceTopNav,
} from "./surface-top-nav";
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
  return (
    <SidebarSurfaceTopNav
      links={buildSurfaceTopNavLinks(isRequestMode ? "request" : undefined)}
      rightSlot={
        !isReadonly ? (
          <VisibilitySelector
            chatId={chatId}
            requestId={requestId}
            selectedVisibilityType={selectedVisibilityType}
          />
        ) : undefined
      }
      subtitle={
        requestStatus === "draft"
          ? "Drafting request"
          : requestStatus
            ? "Live request"
            : isRequestMode
              ? "Start request"
              : "Chat"
      }
    />
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

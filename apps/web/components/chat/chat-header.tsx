"use client";

import { memo } from "react";
import type { RequestStatus } from "@/lib/request";
import { SidebarSurfaceTopNav } from "./surface-top-nav";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  requestId,
  requestTitle,
  selectedVisibilityType,
  isReadonly,
  isRequestMode,
  isNewMode,
  requestStatus,
}: {
  chatId: string;
  requestId?: string | null;
  requestTitle?: string | null;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isRequestMode: boolean;
  isNewMode?: boolean;
  requestStatus?: RequestStatus | null;
}) {
  return (
    <SidebarSurfaceTopNav
      rightSlot={
        !isReadonly ? (
          <VisibilitySelector
            chatId={chatId}
            requestId={requestId}
            selectedVisibilityType={selectedVisibilityType}
          />
        ) : undefined
      }
      title={
        requestTitle?.trim() ||
        (isNewMode
          ? isRequestMode
            ? "Request Preflight"
            : "New"
          : requestStatus === "draft"
            ? "Request Preflight"
            : isRequestMode
              ? "Request Preflight"
              : "Chat")
      }
    />
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.requestId === nextProps.requestId &&
    prevProps.requestTitle === nextProps.requestTitle &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.isRequestMode === nextProps.isRequestMode &&
    prevProps.isNewMode === nextProps.isNewMode &&
    prevProps.requestStatus === nextProps.requestStatus
  );
});

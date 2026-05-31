import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import type { BorealRequestDraft } from "@/lib/request";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { CopyIcon, ShareIcon, TrashIcon } from "./icons";
import { toast } from "./toast";

const PureSidebarRequestItem = ({
  request,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  request: BorealRequestDraft;
  isActive: boolean;
  onDelete: (requestId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const requestTitle = request.brief.title?.trim() || "Untitled request";
  const requestStatusLabel = request.status.replace(/_/g, " ");
  const [isNavigating, setIsNavigating] = useState(false);
  const previousChatIdRef = useRef(request.chatId);
  const isVisuallyActive = isActive || isNavigating;

  useEffect(() => {
    if (isActive && isNavigating) {
      setIsNavigating(false);
    }
  }, [isActive, isNavigating]);

  useEffect(() => {
    if (previousChatIdRef.current !== request.chatId) {
      previousChatIdRef.current = request.chatId;
      setIsNavigating(false);
    }
  }, [request.chatId]);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsNavigating(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  const copyRequestLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${request.chatId}`,
    );

    toast({
      type: "success",
      description: "Request link copied.",
    });
  };

  const copyRequestId = async () => {
    await navigator.clipboard.writeText(request.id);

    toast({
      type: "success",
      description: "Request ID copied.",
    });
  };

  return (
    <SidebarMenuItem className="group/requestitem relative">
      <SidebarMenuButton
        asChild
        className="h-8 rounded-lg bg-transparent pr-2.5 text-[13px] text-sidebar-foreground/68 transition-[color,background-color,padding] duration-150 hover:bg-sidebar-accent/24 hover:text-sidebar-foreground data-active:bg-sidebar-accent/34 data-active:font-medium data-active:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/34 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground group-focus-within/requestitem:pr-[5.8rem] group-hover/requestitem:pr-[5.8rem]"
        isActive={isVisuallyActive}
      >
        <Link
          href={`/chat/${request.chatId}`}
          onClick={() => {
            setIsNavigating(true);
            setOpenMobile(false);
          }}
          title={`${requestTitle} - ${requestStatusLabel}`}
        >
          <span className="min-w-0 flex-1 truncate">{requestTitle}</span>
          <span
            aria-label={`Status: ${requestStatusLabel}`}
            className={cn(
              "status-dot ml-2 size-2 shrink-0 rounded-full bg-current transition-opacity duration-150 group-focus-within/requestitem:opacity-0 group-hover/requestitem:opacity-0",
              getRequestStatusDotClassName(request.status),
            )}
            title={requestStatusLabel}
          />
        </Link>
      </SidebarMenuButton>

      <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within/requestitem:pointer-events-auto group-focus-within/requestitem:opacity-100 group-hover/requestitem:pointer-events-auto group-hover/requestitem:opacity-100">
        <button
          aria-label="Copy request link"
          className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
          onClick={() => void copyRequestLink()}
          title="Copy link"
          type="button"
        >
          <ShareIcon size={12} />
        </button>
        <button
          aria-label="Copy request ID"
          className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
          onClick={() => void copyRequestId()}
          title="Copy request ID"
          type="button"
        >
          <CopyIcon size={12} />
        </button>
        <button
          aria-label={
            request.status === "draft" ? "Delete draft" : "Delete request"
          }
          className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-35"
          disabled={isActive}
          onClick={() => onDelete(request.id)}
          title={request.status === "draft" ? "Delete draft" : "Delete request"}
          type="button"
        >
          <TrashIcon size={12} />
        </button>
      </div>
    </SidebarMenuItem>
  );
};

export const SidebarRequestItem = memo(
  PureSidebarRequestItem,
  (prevProps, nextProps) => {
    if (prevProps.isActive !== nextProps.isActive) {
      return false;
    }

    if (prevProps.request.updatedAt !== nextProps.request.updatedAt) {
      return false;
    }

    if (prevProps.request.brief.title !== nextProps.request.brief.title) {
      return false;
    }

    if (prevProps.request.status !== nextProps.request.status) {
      return false;
    }

    return true;
  },
);

function getRequestStatusDotClassName(status: BorealRequestDraft["status"]) {
  switch (status) {
    case "draft":
      return "text-status-draft";
    case "open":
      return "text-status-open";
    case "in_progress":
      return "text-status-active";
    case "funding_required":
    case "waiting_for_owner":
      return "text-status-waiting";
    case "funded":
      return "text-status-funded";
    case "completed":
      return "text-status-success";
    case "delivered":
      return "text-status-delivered";
    case "failed":
      return "text-status-danger";
    case "cancelled":
      return "text-status-cancelled";
    default:
      return "text-status-muted";
  }
}

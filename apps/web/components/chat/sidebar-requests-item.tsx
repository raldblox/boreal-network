import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import type { BorealRequestDraft } from "@/lib/request";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { CopyIcon, MoreHorizontalIcon, TrashIcon } from "./icons";
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
  const requestStatus = request.status.replace(/_/g, " ");
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
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="h-auto min-h-8 rounded-lg bg-transparent px-2 py-1.5 text-[13px] text-sidebar-foreground/68 transition-colors duration-150 hover:bg-sidebar-accent/24 hover:text-sidebar-foreground data-active:bg-sidebar-accent/34 data-active:font-medium data-active:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/34 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
        isActive={isVisuallyActive}
      >
        <Link
          href={`/chat/${request.chatId}`}
          onClick={() => {
            setIsNavigating(true);
            setOpenMobile(false);
          }}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">{requestTitle}</span>
            <span className="inline-flex items-center gap-1 truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  getRequestStatusDotClassName(request.status),
                )}
              />
              {requestStatus}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 rounded-md text-sidebar-foreground/50 ring-0 transition-colors duration-150 focus-visible:ring-0 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover={!isVisuallyActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            onSelect={() => {
              void copyRequestLink();
            }}
          >
            <CopyIcon />
            <span>Copy link</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              void copyRequestId();
            }}
          >
            <CopyIcon />
            <span>Copy request ID</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isActive}
            onSelect={() => onDelete(request.id)}
            variant="destructive"
          >
            <TrashIcon />
            <span>
              {request.status === "draft" ? "Delete draft" : "Delete request"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
      return "bg-zinc-400";
    case "open":
    case "in_progress":
      return "bg-sky-400";
    case "funding_required":
    case "waiting_for_owner":
      return "bg-amber-400";
    case "funded":
    case "completed":
      return "bg-emerald-400";
    case "delivered":
      return "bg-violet-400";
    case "failed":
      return "bg-rose-400";
    case "cancelled":
      return "bg-zinc-500";
    default:
      return "bg-zinc-400";
  }
}

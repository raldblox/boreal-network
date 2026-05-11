import Link from "next/link";
import { memo } from "react";
import type { BorealRequestDraft } from "@/lib/request";
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

  const copyRequestLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${request.chatId}`
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
        className="h-auto min-h-8 rounded-none py-1.5 text-[13px] text-sidebar-foreground/50 transition-all duration-150 hover:bg-transparent hover:text-sidebar-foreground data-active:bg-transparent data-active:font-normal data-active:text-sidebar-foreground/50 data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium data-[active=true]:border-b data-[active=true]:border-dashed data-[active=true]:border-sidebar-foreground/50"
        isActive={isActive}
      >
        <Link href={`/chat/${request.chatId}`} onClick={() => setOpenMobile(false)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">{requestTitle}</span>
            <span className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">
              {requestStatus}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 rounded-md text-sidebar-foreground/50 ring-0 transition-colors duration-150 focus-visible:ring-0 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover={!isActive}
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
            <span>{request.status === "draft" ? "Delete draft" : "Delete request"}</span>
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
  }
);

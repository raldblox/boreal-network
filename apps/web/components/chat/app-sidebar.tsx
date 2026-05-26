"use client";

import {
  DownloadIcon,
  FilePenLineIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PackageIcon,
  PanelLeftIcon,
  PenSquareIcon,
  StoreIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import {
  getRequestHistoryPaginationKey,
  SidebarRequests,
} from "@/components/chat/sidebar-requests";
import { SidebarSupplies } from "@/components/chat/sidebar-supplies";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const hasUser = Boolean(user);
  const isGuest = guestRegex.test(user?.email ?? "");
  const isRegularUser = hasUser && !isGuest;
  const canShowHistory = hasUser;
  const isRootView = pathname === "/";
  const isHomeMode = isRootView && !searchParams.get("mode");
  const isChatMode = isRootView && searchParams.get("mode") === "chat";
  const isSuppliesView =
    pathname === "/supplies" || pathname.startsWith("/supplies/");
  const isServicesView =
    pathname === "/services" || pathname.startsWith("/services/");
  const isOpenRequestsView = pathname === "/open-requests";
  const isNewRequestMode =
    isRootView && searchParams.get("mode") === "request";
  const isScratchChatMode = isRootView && searchParams.get("mode") === "chat";
  const isWhitelistMode =
    pathname === "/supplies/new" && searchParams.get("entry") === "whitelist";
  const isNewSupplyMode = pathname === "/supplies/new";
  const isDesktopMode =
    pathname === "/download/boreal-desktop" || pathname === "/download/desktop";

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    router.replace("/?mode=chat");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });
    mutate(unstable_serialize(getRequestHistoryPaginationKey));

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("History cleared");
  };

  const sidebarListMode = getSidebarListMode({
    isScratchChatMode,
    isSuppliesView,
    isOpenRequestsView,
    isServicesView,
    isDesktopMode,
    pathname,
    searchMode: searchParams.get("mode"),
  });

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-between">
              <div className="group/logo relative flex items-center justify-center">
                <SidebarMenuButton
                  asChild
                  className="size-8 !px-0 items-center justify-center group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                  tooltip="Boreal"
                >
                  <Link href="/" onClick={() => setOpenMobile(false)}>
                    <MessageSquareIcon className="size-4 text-sidebar-foreground/50" />
                  </Link>
                </SidebarMenuButton>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className="pointer-events-none absolute inset-0 size-8 opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100"
                      onClick={() => toggleSidebar()}
                    >
                      <PanelLeftIcon className="size-4" />
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block" side="right">
                    Open sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
              Work
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isHomeMode}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/");
                    }}
                    tooltip="Home"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isChatMode}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/?mode=chat");
                    }}
                    tooltip="New chat"
                  >
                    <MessageSquareIcon className="size-4" />
                    <span className="font-medium">Scratch chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isNewRequestMode}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/?mode=request");
                    }}
                    tooltip="Post request"
                  >
                    <FilePenLineIcon className="size-4" />
                    <span className="font-medium">Post request</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isOpenRequestsView}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/open-requests");
                    }}
                    tooltip="Open requests"
                  >
                    <ListChecksIcon className="size-4" />
                    <span className="font-medium">Open requests</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="pt-1">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
              Services
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isServicesView}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/services");
                    }}
                    tooltip="Services"
                  >
                    <StoreIcon className="size-4" />
                    <span className="font-medium">Services</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {!isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isWhitelistMode}
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/supplies/new?entry=whitelist");
                      }}
                      tooltip="Supply whitelist"
                    >
                      <PackageIcon className="size-4" />
                      <span className="font-medium">Supply whitelist</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isSuppliesView}
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/supplies");
                      }}
                      tooltip="Supplies"
                    >
                      <PackageIcon className="size-4" />
                      <span className="font-medium">Supply studio</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isNewSupplyMode}
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/supplies/new");
                      }}
                      tooltip="New supply"
                    >
                      <PackageIcon className="size-4" />
                      <span className="font-medium">New supply</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="pt-1">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
              Runtime
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isDesktopMode}
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/download/boreal-desktop");
                      }}
                      tooltip="Boreal Desktop"
                    >
                      <DownloadIcon className="size-4" />
                      <span className="font-medium">Desktop</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDeleteAllDialog(true)}
                      tooltip="Clear scratch chats"
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[13px]">Clear chats</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isRegularUser && sidebarListMode === "supplies" ? (
            <SidebarSupplies user={user} />
          ) : null}
          {canShowHistory && sidebarListMode === "requests" ? (
            <SidebarRequests user={user} />
          ) : null}
          {canShowHistory && sidebarListMode === "chats" ? (
            <SidebarHistory user={user} />
          ) : null}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          <SidebarUserNav user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear saved chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It removes saved chats from your
              account, including any request drafts attached to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Clear chats
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getSidebarListMode({
  isScratchChatMode,
  isSuppliesView,
  isOpenRequestsView,
  isServicesView,
  isDesktopMode,
  pathname,
  searchMode,
}: {
  isScratchChatMode: boolean;
  isSuppliesView: boolean;
  isOpenRequestsView: boolean;
  isServicesView: boolean;
  isDesktopMode: boolean;
  pathname: string;
  searchMode: string | null;
}): "requests" | "supplies" | "chats" | "none" {
  if (isSuppliesView) {
    return "supplies";
  }

  if (isScratchChatMode) {
    return "chats";
  }

  if (searchMode === "request" || pathname.startsWith("/chat/")) {
    return "requests";
  }

  if (isServicesView || isOpenRequestsView || isDesktopMode || pathname === "/") {
    return "none";
  }

  return "none";
}

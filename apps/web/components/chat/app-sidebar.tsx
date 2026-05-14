"use client";

import {
  DownloadIcon,
  FilePenLineIcon,
  MessageSquareIcon,
  PackageIcon,
  PanelLeftIcon,
  PenSquareIcon,
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
  const isRootView = pathname === "/";
  const isNewRequestMode =
    isRootView && searchParams.get("mode") === "request";
  const isNewSupplyMode = pathname === "/supplies/new";
  const isDesktopMode =
    pathname === "/download/boreal-desktop" || pathname === "/download/desktop";
  const isNewChatMode = isRootView && !isNewRequestMode;

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });
    mutate(unstable_serialize(getRequestHistoryPaginationKey));

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("History cleared");
  };

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
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isNewChatMode}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/");
                    }}
                    tooltip="New chat"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">New chat</span>
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
                    tooltip="New request"
                  >
                    <FilePenLineIcon className="size-4" />
                    <span className="font-medium">New request</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user && (
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
                )}
                {user && (
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
                )}
                {user && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDeleteAllDialog(true)}
                      tooltip="Clear chat history"
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[13px]">Clear history</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSupplies user={user} />
          <SidebarRequests user={user} />
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          {user && <SidebarUserNav user={user} />}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This removes every saved Boreal
              chat from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
import { useCallback, useEffect, useState, useTransition } from "react";
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
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const [, startNavigationTransition] = useTransition();
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
  const routeArrived = useCallback(
    (href: string) => {
      switch (href) {
        case "/":
          return isHomeMode;
        case "/?mode=chat":
          return isChatMode;
        case "/?mode=request":
          return isNewRequestMode;
        case "/open-requests":
          return isOpenRequestsView;
        case "/services":
          return isServicesView;
        case "/supplies/new?entry=whitelist":
          return isWhitelistMode;
        case "/supplies":
          return isSuppliesView && !isNewSupplyMode;
        case "/supplies/new":
          return isNewSupplyMode && !isWhitelistMode;
        case "/download/boreal-desktop":
          return isDesktopMode;
        default:
          return false;
      }
    },
    [
      isHomeMode,
      isChatMode,
      isNewRequestMode,
      isOpenRequestsView,
      isServicesView,
      isWhitelistMode,
      isSuppliesView,
      isNewSupplyMode,
      isDesktopMode,
    ]
  );
  const navigateSidebar = useCallback(
    (href: string) => {
      setOpenMobile(false);
      setOptimisticHref(href);
      startNavigationTransition(() => {
        router.push(href);
      });
    },
    [router, setOpenMobile, startNavigationTransition]
  );
  const isNavActive = (href: string, fallback: boolean) =>
    optimisticHref ? optimisticHref === href : fallback;
  const isNavPending = (href: string) =>
    optimisticHref === href && !routeArrived(href);

  useEffect(() => {
    if (optimisticHref && routeArrived(optimisticHref)) {
      setOptimisticHref(null);
    }
  }, [optimisticHref, routeArrived]);

  useEffect(() => {
    if (!optimisticHref) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setOptimisticHref(null);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [optimisticHref]);

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    setOptimisticHref("/?mode=chat");
    startNavigationTransition(() => {
      router.replace("/?mode=chat");
    });
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
                    isActive={isNavActive("/", isHomeMode)}
                    onClick={() => navigateSidebar("/")}
                    tooltip="Home"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">Home</span>
                    <SidebarNavPendingDot visible={isNavPending("/")} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isNavActive("/?mode=chat", isChatMode)}
                    onClick={() => navigateSidebar("/?mode=chat")}
                    tooltip="New chat"
                  >
                    <MessageSquareIcon className="size-4" />
                    <span className="font-medium">Scratch chat</span>
                    <SidebarNavPendingDot visible={isNavPending("/?mode=chat")} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isNavActive("/?mode=request", isNewRequestMode)}
                    onClick={() => navigateSidebar("/?mode=request")}
                    tooltip="Start request"
                  >
                    <FilePenLineIcon className="size-4" />
                    <span className="font-medium">Start request</span>
                    <SidebarNavPendingDot visible={isNavPending("/?mode=request")} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                    isActive={isNavActive("/open-requests", isOpenRequestsView)}
                    onClick={() => navigateSidebar("/open-requests")}
                    tooltip="Open requests"
                  >
                    <ListChecksIcon className="size-4" />
                    <span className="font-medium">Open requests</span>
                    <SidebarNavPendingDot visible={isNavPending("/open-requests")} />
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
                    isActive={isNavActive("/services", isServicesView)}
                    onClick={() => navigateSidebar("/services")}
                    tooltip="Services"
                  >
                    <StoreIcon className="size-4" />
                    <span className="font-medium">Services</span>
                    <SidebarNavPendingDot visible={isNavPending("/services")} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {!isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isNavActive(
                        "/supplies/new?entry=whitelist",
                        isWhitelistMode
                      )}
                      onClick={() =>
                        navigateSidebar("/supplies/new?entry=whitelist")
                      }
                      tooltip="Supply whitelist"
                    >
                      <PackageIcon className="size-4" />
                      <span className="font-medium">Supply whitelist</span>
                      <SidebarNavPendingDot
                        visible={isNavPending(
                          "/supplies/new?entry=whitelist"
                        )}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isNavActive("/supplies", isSuppliesView)}
                      onClick={() => navigateSidebar("/supplies")}
                      tooltip="Supply studio"
                    >
                      <PackageIcon className="size-4" />
                      <span className="font-medium">Supply studio</span>
                      <SidebarNavPendingDot visible={isNavPending("/supplies")} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {isRegularUser ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                      isActive={isNavActive("/supplies/new", isNewSupplyMode)}
                      onClick={() => navigateSidebar("/supplies/new")}
                      tooltip="New supply"
                    >
                      <PackageIcon className="size-4" />
                      <span className="font-medium">New supply</span>
                      <SidebarNavPendingDot visible={isNavPending("/supplies/new")} />
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
                      isActive={isNavActive(
                        "/download/boreal-desktop",
                        isDesktopMode
                      )}
                      onClick={() => navigateSidebar("/download/boreal-desktop")}
                      tooltip="Boreal Desktop"
                    >
                      <DownloadIcon className="size-4" />
                      <span className="font-medium">Desktop</span>
                      <SidebarNavPendingDot
                        visible={isNavPending("/download/boreal-desktop")}
                      />
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

  if (
    isServicesView ||
    isOpenRequestsView ||
    isDesktopMode ||
    pathname === "/" ||
    pathname.startsWith("/account")
  ) {
    return "none";
  }

  return "none";
}

function SidebarNavPendingDot({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="ml-auto size-1.5 shrink-0 animate-pulse rounded-full bg-sidebar-foreground/55 group-data-[collapsible=icon]:hidden"
    />
  );
}

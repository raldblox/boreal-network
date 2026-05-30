"use client";

import {
  ChevronDownIcon,
  CompassIcon,
  FilePenLineIcon,
  HomeIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PackageIcon,
  PanelLeftIcon,
  StoreIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "next-auth";
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { SidebarHistory } from "@/components/chat/sidebar-history";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const EXPLORE_HREFS = new Set([
  "/",
  "/services",
  "/open-requests",
  "/supplies",
  "/supplies/new",
  "/supplies/new?entry=whitelist",
]);

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [, startNavigationTransition] = useTransition();
  const hasUser = Boolean(user);
  const isGuest = guestRegex.test(user?.email ?? "");
  const isRegularUser = hasUser && !isGuest;
  const canShowHistory = hasUser;
  const isRootView = pathname === "/";
  const isHomeMode = isRootView && !searchParams.get("mode");
  const isChatMode = isRootView && searchParams.get("mode") === "chat";
  const isChatsArea = isChatMode || pathname.startsWith("/chat/");
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
  const isBorealWorkActive =
    isHomeMode || isServicesView || isSuppliesView || isOpenRequestsView;
  const isExploreNavActive = optimisticHref
    ? EXPLORE_HREFS.has(optimisticHref)
    : isBorealWorkActive;

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
  const isExplorePending =
    Boolean(optimisticHref && EXPLORE_HREFS.has(optimisticHref)) &&
    !routeArrived(optimisticHref ?? "");

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

  useEffect(() => {
    if (isBorealWorkActive) {
      setIsExploreOpen(true);
    }
  }, [isBorealWorkActive]);

  const sidebarListMode = getSidebarListMode({
    isScratchChatMode,
    pathname,
  });

  return (
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
                  <BorealSidebarMark className="size-5" />
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
        <SidebarGroup className="pt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem className="group/explore">
                <SidebarMenuButton
                  className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                  isActive={isExploreNavActive}
                  onClick={() => setIsExploreOpen((open) => !open)}
                  tooltip="Explore"
                >
                  <CompassIcon className="size-4" />
                  <span className="font-medium">Explore</span>
                  <span className="ml-auto flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                    {isExplorePending ? (
                      <span
                        aria-hidden="true"
                        className="size-1.5 animate-pulse rounded-full bg-sidebar-foreground/55"
                      />
                    ) : null}
                    <ChevronDownIcon
                      className={`size-3.5 text-sidebar-foreground/45 transition-transform duration-200 ${
                        isExploreOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </SidebarMenuButton>

                <div
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 group-data-[collapsible=icon]:hidden ${
                    isExploreOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div
                    className={`flex min-h-0 flex-col gap-1 pl-0 transition-[padding] duration-200 ${
                      isExploreOpen ? "pt-1" : "pt-0"
                    }`}
                  >
                    <ExploreChildButton
                      icon={<HomeIcon className="size-3.5" />}
                      isActive={isNavActive("/", isHomeMode)}
                      isPending={isNavPending("/")}
                      label="Home"
                      onClick={() => navigateSidebar("/")}
                    />
                    <ExploreChildButton
                      icon={<StoreIcon className="size-3.5" />}
                      isActive={isNavActive("/services", isServicesView)}
                      isPending={isNavPending("/services")}
                      label="Services"
                      onClick={() => navigateSidebar("/services")}
                    />
                    <ExploreChildButton
                      icon={<ListChecksIcon className="size-3.5" />}
                      isActive={isNavActive("/open-requests", isOpenRequestsView)}
                      isPending={isNavPending("/open-requests")}
                      label="Open requests"
                      onClick={() => navigateSidebar("/open-requests")}
                    />
                    {isRegularUser ? (
                      <ExploreChildButton
                        icon={<PackageIcon className="size-3.5" />}
                        isActive={isNavActive("/supplies", isSuppliesView)}
                        isPending={isNavPending("/supplies")}
                        label="Supply studio"
                        onClick={() => navigateSidebar("/supplies")}
                      />
                    ) : null}
                    {!isRegularUser ? (
                      <ExploreChildButton
                        icon={<PackageIcon className="size-3.5" />}
                        isActive={isNavActive(
                          "/supplies/new?entry=whitelist",
                          isWhitelistMode
                        )}
                        isPending={isNavPending(
                          "/supplies/new?entry=whitelist"
                        )}
                        label="Supply whitelist"
                        onClick={() =>
                          navigateSidebar("/supplies/new?entry=whitelist")
                        }
                      />
                    ) : null}
                    {isRegularUser ? (
                      <ExploreChildButton
                        icon={<PackageIcon className="size-3.5" />}
                        isActive={isNavActive("/supplies/new", isNewSupplyMode)}
                        isPending={isNavPending("/supplies/new")}
                        label="New supply"
                        onClick={() => navigateSidebar("/supplies/new")}
                      />
                    ) : null}
                  </div>
                </div>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                  isActive={isNavActive("/?mode=request", isNewRequestMode)}
                  onClick={() => navigateSidebar("/?mode=request")}
                  tooltip="New request"
                >
                  <FilePenLineIcon className="size-4" />
                  <span className="font-medium">Request</span>
                  <SidebarNavPendingDot visible={isNavPending("/?mode=request")} />
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-8 rounded-lg border-0 bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground"
                  isActive={isNavActive("/?mode=chat", isChatsArea)}
                  onClick={() => navigateSidebar("/?mode=chat")}
                  tooltip="New chat"
                >
                  <MessageSquareIcon className="size-4" />
                  <span className="font-medium">Chats</span>
                  <SidebarNavPendingDot visible={isNavPending("/?mode=chat")} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canShowHistory && sidebarListMode === "chats" ? (
          <SidebarHistory user={user} />
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
        <SidebarUserNav user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function getSidebarListMode({
  isScratchChatMode,
  pathname,
}: {
  isScratchChatMode: boolean;
  pathname: string;
}): "chats" | "none" {
  if (isScratchChatMode || pathname.startsWith("/chat/")) {
    return "chats";
  }

  return "none";
}

function ExploreChildButton({
  icon,
  isActive,
  isPending,
  label,
  onClick,
}: {
  icon: ReactNode;
  isActive: boolean;
  isPending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[12px] transition-colors duration-150 ${
        isActive
          ? "bg-sidebar-accent/34 text-sidebar-foreground"
          : "text-sidebar-foreground/55 hover:bg-sidebar-accent/24 hover:text-sidebar-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-sidebar-foreground/55">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <SidebarNavPendingDot visible={isPending} />
    </button>
  );
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

function BorealSidebarMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 634 548"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M488.037 72.815 272.879 144.222 273.887 0l214.15 72.815Z"
        fill="#62FFCE"
      />
      <path
        d="M503.367 282.669 196.443 179.869 503.367 78.021v204.648Z"
        fill="#01FDFF"
      />
      <path
        d="M617.035 330.546 181.039 476.958V184.981l435.996 145.565Z"
        fill="#23C1F0"
      />
      <path
        d="M0 547.782 632.372 335.667l1.445 212.115H0Z"
        fill="#3D73CB"
      />
    </svg>
  );
}

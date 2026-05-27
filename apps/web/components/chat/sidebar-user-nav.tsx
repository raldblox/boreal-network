"use client";

import { ChevronUp, UserRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

export function SidebarUserNav({ user }: { user?: User }) {
  const router = useRouter();
  const { data, status } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const sessionUser = data?.user ?? user;
  const isGuest = guestRegex.test(sessionUser?.email ?? "");
  const isPublicVisitor = !sessionUser;
  const displayEmail = sessionUser?.email ?? "Guest or sign in";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === "loading" ? (
              <SidebarMenuButton className="h-10 justify-between rounded-lg bg-transparent text-sidebar-foreground/50 transition-colors duration-150 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex flex-row items-center gap-2">
                  <div className="size-6 animate-pulse rounded-full bg-sidebar-foreground/10" />
                  <span className="animate-pulse rounded-md bg-sidebar-foreground/10 text-transparent text-[13px]">
                    Loading...
                  </span>
                </div>
                <div className="animate-spin text-sidebar-foreground/50">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                className="h-8 rounded-lg bg-transparent px-2 text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                data-testid="user-nav-button"
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-sidebar-border/70 bg-sidebar-accent/45 text-sidebar-foreground/70">
                  <UserRoundIcon className="size-3" />
                </div>
                <span
                  className="truncate text-[13px] group-data-[collapsible=icon]:hidden"
                  data-testid="user-email"
                >
                  {isPublicVisitor ? "Guest or sign in" : isGuest ? "Guest access" : displayEmail}
                </span>
                <ChevronUp className="ml-auto size-3.5 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width) rounded-lg border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)]"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem
              className="cursor-pointer text-[13px]"
              data-testid="user-nav-item-theme"
              onSelect={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            {isPublicVisitor ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-testid="user-nav-item-guest">
                  <button
                    className="w-full cursor-pointer text-[13px]"
                    onClick={() => {
                      router.push("/?mode=chat");
                    }}
                    type="button"
                  >
                    Continue as guest
                  </button>
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            {!isPublicVisitor && !isGuest ? (
              <>
                <DropdownMenuItem asChild data-testid="user-nav-item-account">
                  <button
                    className="w-full cursor-pointer text-[13px]"
                    onClick={() => {
                      router.push("/account");
                    }}
                    type="button"
                  >
                    Manage account
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-testid="user-nav-item-security">
                  <button
                    className="w-full cursor-pointer text-[13px]"
                    onClick={() => {
                      router.push("/account/security");
                    }}
                    type="button"
                  >
                    Account security
                  </button>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                className="w-full cursor-pointer text-[13px]"
                onClick={() => {
                  if (status === "loading") {
                    toast({
                      type: "error",
                      description:
                        "Checking account status. Try again in a moment.",
                    });

                    return;
                  }

                  if (isPublicVisitor || isGuest) {
                    router.push("/login");
                  } else {
                    signOut({
                      redirectTo: "/",
                    });
                  }
                }}
                type="button"
              >
                {isPublicVisitor || isGuest ? "Sign in to Boreal" : "Sign out"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

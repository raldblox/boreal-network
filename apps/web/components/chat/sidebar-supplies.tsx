"use client";

import { usePathname } from "next/navigation";
import type { User } from "next-auth";
import useSWR from "swr";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { BorealSupplyDraft } from "@/lib/supply";
import { fetcher } from "@/lib/utils";
import { SidebarSupplyItem } from "./sidebar-supplies-item";

type SupplyHistory = {
  supplies: BorealSupplyDraft[];
  hasMore: boolean;
};

export const SUPPLY_HISTORY_KEY = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/supplies?limit=20`;

export function SidebarSupplies({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const activeSupplyId = pathname?.startsWith("/supplies/")
    ? pathname.split("/")[2]
    : null;

  const { data, isLoading } = useSWR<SupplyHistory>(
    user ? SUPPLY_HISTORY_KEY : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
          Capabilities
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-1 px-3">
            {[52, 38].map((item) => (
              <div
                className="flex h-10 items-center gap-2 rounded-xl border border-sidebar-border/35 bg-sidebar-accent/12 px-3"
                key={item}
              >
                <div
                  className="h-3 animate-pulse rounded-md bg-sidebar-foreground/[0.08]"
                  style={{ width: `${item}%` }}
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (!data || data.supplies.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
          Capabilities
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="mx-3 rounded-2xl border border-sidebar-border/35 bg-sidebar-accent/12 px-3 py-3 text-[12px] leading-6 text-sidebar-foreground/58">
            Start a capability draft and it will appear here.
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
        Capabilities
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {data.supplies.map((supply) => (
            <SidebarSupplyItem
              isActive={supply.id === activeSupplyId}
              key={supply.id}
              setOpenMobile={setOpenMobile}
              supply={supply}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

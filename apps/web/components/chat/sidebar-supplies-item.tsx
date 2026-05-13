import Link from "next/link";
import { memo } from "react";
import type { BorealSupplyDraft } from "@/lib/supply";
import { cn } from "@/lib/utils";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

const PureSidebarSupplyItem = ({
  supply,
  isActive,
  setOpenMobile,
}: {
  supply: BorealSupplyDraft;
  isActive: boolean;
  setOpenMobile: (open: boolean) => void;
}) => {
  const supplyTitle = supply.profile.displayName.trim() || "Untitled supply";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="h-auto min-h-8 rounded-lg bg-transparent py-1.5 text-[13px] text-sidebar-foreground/55 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-active:bg-sidebar-accent/38 data-active:font-medium data-active:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
        isActive={isActive}
      >
        <Link href={`/supplies/${supply.id}`} onClick={() => setOpenMobile(false)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">{supplyTitle}</span>
            <span className="inline-flex items-center gap-1 truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  getSupplyStatusDotClassName(supply.status)
                )}
              />
              {supply.status}
              <span className="text-sidebar-foreground/40">/</span>
              {supply.visibility}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const SidebarSupplyItem = memo(
  PureSidebarSupplyItem,
  (prevProps, nextProps) => {
    return (
      prevProps.isActive === nextProps.isActive &&
      prevProps.supply.updatedAt === nextProps.supply.updatedAt &&
      prevProps.supply.profile.displayName === nextProps.supply.profile.displayName &&
      prevProps.supply.status === nextProps.supply.status &&
      prevProps.supply.visibility === nextProps.supply.visibility
    );
  }
);

function getSupplyStatusDotClassName(status: BorealSupplyDraft["status"]) {
  switch (status) {
    case "draft":
      return "bg-zinc-400";
    case "published":
      return "bg-emerald-400";
    case "paused":
      return "bg-amber-400";
    case "retired":
      return "bg-zinc-500";
    default:
      return "bg-zinc-400";
  }
}

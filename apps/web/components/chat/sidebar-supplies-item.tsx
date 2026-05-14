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
  const supplyTitle =
    supply.profile.displayName.trim() || "Untitled capability";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="h-auto min-h-10 rounded-xl bg-transparent px-3 py-2 text-[13px] text-sidebar-foreground/58 transition-colors duration-150 hover:bg-sidebar-accent/24 hover:text-sidebar-foreground data-active:bg-sidebar-accent/30 data-active:font-medium data-active:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/30 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
        isActive={isActive}
      >
        <Link href={`/supplies/${supply.id}`} onClick={() => setOpenMobile(false)}>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate">{supplyTitle}</span>
            <span className="inline-flex items-center gap-1.5 truncate text-[11px] text-sidebar-foreground/55">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  getSupplyStatusDotClassName(supply.status)
                )}
              />
              {formatSupplyLabel(supply.status)}
              <span className="text-sidebar-foreground/28">|</span>
              {formatSupplyLabel(supply.visibility)}
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

function formatSupplyLabel(value: string) {
  return value.replace(/_/g, " ");
}

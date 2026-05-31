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
    supply.profile.displayName.trim() || "Untitled supply";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="h-auto min-h-8 rounded-lg bg-transparent px-2 py-1.5 text-[13px] text-sidebar-foreground/55 transition-colors duration-150 hover:bg-sidebar-accent/32 hover:text-sidebar-foreground data-active:bg-sidebar-accent/38 data-active:font-medium data-active:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/38 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
        isActive={isActive}
      >
        <Link href={`/supplies/${supply.id}`} onClick={() => setOpenMobile(false)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">{supplyTitle}</span>
            <span className="inline-flex items-center gap-1 truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">
              <span
                className={cn(
                  "status-dot size-1.5 shrink-0 rounded-full bg-current",
                  getSupplyStatusDotClassName(supply.status)
                )}
              />
              {formatSupplyLabel(supply.status)}
              <span className="text-sidebar-foreground/28">/</span>
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
      return "text-status-draft";
    case "published":
      return "text-status-success";
    case "paused":
      return "text-status-waiting";
    case "retired":
      return "text-status-cancelled";
    default:
      return "text-status-muted";
  }
}

function formatSupplyLabel(value: string) {
  return value.replace(/_/g, " ");
}

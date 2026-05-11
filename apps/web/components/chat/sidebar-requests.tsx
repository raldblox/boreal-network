"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { User } from "next-auth";
import type { CSSProperties } from "react";
import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { BorealRequestDraft } from "@/lib/request";
import { fetcher } from "@/lib/utils";
import { LoaderIcon } from "./icons";
import { SidebarRequestItem } from "./sidebar-requests-item";
import { toast } from "./toast";

type GroupedRequests = {
  today: BorealRequestDraft[];
  yesterday: BorealRequestDraft[];
  lastWeek: BorealRequestDraft[];
  lastMonth: BorealRequestDraft[];
  older: BorealRequestDraft[];
};

export type RequestHistory = {
  requests: BorealRequestDraft[];
  hasMore: boolean;
};

const PAGE_SIZE = 20;

const groupRequestsByDate = (
  requests: BorealRequestDraft[]
): GroupedRequests => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return requests.reduce(
    (groups, request) => {
      const requestDate = new Date(request.updatedAt);

      if (isToday(requestDate)) {
        groups.today.push(request);
      } else if (isYesterday(requestDate)) {
        groups.yesterday.push(request);
      } else if (requestDate > oneWeekAgo) {
        groups.lastWeek.push(request);
      } else if (requestDate > oneMonthAgo) {
        groups.lastMonth.push(request);
      } else {
        groups.older.push(request);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedRequests
  );
};

export function getRequestHistoryPaginationKey(
  pageIndex: number,
  previousPageData: RequestHistory
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) {
    return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests?limit=${PAGE_SIZE}`;
  }

  const lastRequestFromPage = previousPageData.requests.at(-1);

  if (!lastRequestFromPage) {
    return null;
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/requests?ending_before=${lastRequestFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarRequests({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const activeChatId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const {
    data: paginatedRequestHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<RequestHistory>(
    user ? getRequestHistoryPaginationKey : () => null,
    fetcher,
    { fallbackData: [], revalidateOnFocus: false }
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedRequestHistories
    ? paginatedRequestHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyRequestHistory = paginatedRequestHistories
    ? paginatedRequestHistories.every((page) => page.requests.length === 0)
    : false;

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          Requests
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-0.5 px-1">
            {[42, 30, 56].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-lg px-2"
                key={item}
              >
                <div
                  className="h-3 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-sidebar-foreground/[0.06]"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyRequestHistory) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          Requests
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-[13px] text-sidebar-foreground/60">
            Your request drafts appear here after you start one.
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const requestsFromHistory =
    paginatedRequestHistories?.flatMap((page) => page.requests) ?? [];
  const groupedRequests = groupRequestsByDate(requestsFromHistory);

  const handleDelete = () => {
    const requestToDelete = deleteId;
    setShowDeleteDialog(false);

    mutate((requestHistories) => {
      if (!requestHistories) {
        return requestHistories;
      }

      return requestHistories.map((requestHistory) => ({
        ...requestHistory,
        requests: requestHistory.requests.filter(
          (request) => request.id !== requestToDelete
        ),
      }));
    });

    const requestToDeleteRecord = requestsFromHistory.find(
      (request) => request.id === requestToDelete
    );

    if (requestToDeleteRecord) {
      void fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${requestToDeleteRecord.chatId}`,
        { method: "DELETE" }
      );
    }

    toast({
      type: "success",
      description: "Request deleted.",
    });
  };

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          Requests
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <div className="flex flex-col gap-4">
              {groupedRequests.today.length > 0 && (
                <SidebarRequestSection
                  activeChatId={activeChatId}
                  label="Today"
                  onDelete={(requestId) => {
                    setDeleteId(requestId);
                    setShowDeleteDialog(true);
                  }}
                  requests={groupedRequests.today}
                  setOpenMobile={setOpenMobile}
                />
              )}
              {groupedRequests.yesterday.length > 0 && (
                <SidebarRequestSection
                  activeChatId={activeChatId}
                  label="Yesterday"
                  onDelete={(requestId) => {
                    setDeleteId(requestId);
                    setShowDeleteDialog(true);
                  }}
                  requests={groupedRequests.yesterday}
                  setOpenMobile={setOpenMobile}
                />
              )}
              {groupedRequests.lastWeek.length > 0 && (
                <SidebarRequestSection
                  activeChatId={activeChatId}
                  label="Last 7 days"
                  onDelete={(requestId) => {
                    setDeleteId(requestId);
                    setShowDeleteDialog(true);
                  }}
                  requests={groupedRequests.lastWeek}
                  setOpenMobile={setOpenMobile}
                />
              )}
              {groupedRequests.lastMonth.length > 0 && (
                <SidebarRequestSection
                  activeChatId={activeChatId}
                  label="Last 30 days"
                  onDelete={(requestId) => {
                    setDeleteId(requestId);
                    setShowDeleteDialog(true);
                  }}
                  requests={groupedRequests.lastMonth}
                  setOpenMobile={setOpenMobile}
                />
              )}
              {groupedRequests.older.length > 0 && (
                <SidebarRequestSection
                  activeChatId={activeChatId}
                  label="Older"
                  onDelete={(requestId) => {
                    setDeleteId(requestId);
                    setShowDeleteDialog(true);
                  }}
                  requests={groupedRequests.older}
                  setOpenMobile={setOpenMobile}
                />
              )}
            </div>
          </SidebarMenu>

          <motion.div
            onViewportEnter={() => {
              if (!isValidating && !hasReachedEnd) {
                setSize((size) => size + 1);
              }
            }}
          />

          {hasReachedEnd ? null : (
            <div className="mt-1 flex flex-row items-center gap-2 px-4 py-2 text-sidebar-foreground/50">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div className="text-[11px]">Loading requests...</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the request object and its linked request lane.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SidebarRequestSection({
  label,
  requests,
  activeChatId,
  onDelete,
  setOpenMobile,
}: {
  label: string;
  requests: BorealRequestDraft[];
  activeChatId: string | null;
  onDelete: (requestId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) {
  return (
    <div>
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
        {label}
      </div>
      {requests.map((request) => (
        <SidebarRequestItem
          isActive={request.chatId === activeChatId}
          key={request.id}
          onDelete={onDelete}
          request={request}
          setOpenMobile={setOpenMobile}
        />
      ))}
    </div>
  );
}

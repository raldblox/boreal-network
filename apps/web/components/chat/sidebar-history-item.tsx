import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Chat } from "@/lib/db/schema";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { CopyIcon, GlobeIcon, LockIcon, TrashIcon } from "./icons";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibilityType: chat.visibility,
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const previousChatIdRef = useRef(chat.id);
  const isVisuallyActive = isActive || isNavigating;

  useEffect(() => {
    if (isActive && isNavigating) {
      setIsNavigating(false);
    }
  }, [isActive, isNavigating]);

  useEffect(() => {
    if (previousChatIdRef.current !== chat.id) {
      previousChatIdRef.current = chat.id;
      setIsNavigating(false);
    }
  }, [chat.id]);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsNavigating(false);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  const copyChatLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chat.id}`,
    );

    toast.success("Chat link copied");
  };

  const toggleVisibility = async () => {
    const nextVisibilityType =
      visibilityType === "public" ? "private" : "public";

    await setVisibilityType(nextVisibilityType);
    toast.success(
      nextVisibilityType === "public"
        ? "Chat is now public"
        : "Chat is now private",
    );
  };

  return (
    <SidebarMenuItem className="group/chatitem relative">
      <SidebarMenuButton
        asChild
        className="h-8 rounded-lg bg-transparent pr-2.5 text-[13px] text-sidebar-foreground/68 transition-[color,background-color,padding] duration-150 hover:bg-sidebar-accent/24 hover:text-sidebar-foreground data-active:bg-sidebar-accent/34 data-active:font-medium data-active:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/34 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground group-focus-within/chatitem:pr-[5.8rem] group-hover/chatitem:pr-[5.8rem]"
        isActive={isVisuallyActive}
      >
        <Link
          href={`/chat/${chat.id}`}
          onClick={() => {
            setIsNavigating(true);
            setOpenMobile(false);
          }}
        >
          <span className="min-w-0 flex-1 truncate">{chat.title}</span>
          <span className="ml-2 shrink-0 text-[10px] tabular-nums text-sidebar-foreground/38 transition-opacity duration-150 group-focus-within/chatitem:opacity-0 group-hover/chatitem:opacity-0">
            {formatChatDate(chat.createdAt)}
          </span>
        </Link>
      </SidebarMenuButton>

      <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within/chatitem:pointer-events-auto group-focus-within/chatitem:opacity-100 group-hover/chatitem:pointer-events-auto group-hover/chatitem:opacity-100">
        <button
          aria-label="Copy chat link"
          className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
          onClick={() => void copyChatLink()}
          title="Copy link"
          type="button"
        >
          <CopyIcon size={12} />
        </button>
        <button
          aria-label={
            visibilityType === "public"
              ? "Make chat private"
              : "Make chat public"
          }
          className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
          onClick={() => void toggleVisibility()}
          title={visibilityType === "public" ? "Make private" : "Make public"}
          type="button"
        >
          {visibilityType === "public" ? (
            <GlobeIcon size={12} />
          ) : (
            <LockIcon size={12} />
          )}
        </button>
        <button
          aria-label="Delete chat"
          className="flex size-6 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(chat.id)}
          title="Delete chat"
          type="button"
        >
          <TrashIcon size={12} />
        </button>
      </div>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});

function formatChatDate(value: Chat["createdAt"]) {
  const date = new Date(value);
  const now = new Date();
  const isSameYear = date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(isSameYear ? {} : { year: "2-digit" }),
  }).format(date);
}

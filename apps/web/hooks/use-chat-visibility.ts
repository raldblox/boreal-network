"use client";

import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { updateChatVisibility } from "@/app/(chat)/actions";
import {
  type ChatHistory,
  getChatHistoryPaginationKey,
} from "@/components/chat/sidebar-history";
import { getRequestHistoryPaginationKey } from "@/components/chat/sidebar-requests";
import type { VisibilityType } from "@/components/chat/visibility-selector";

export function useChatVisibility({
  chatId,
  initialVisibilityType,
  requestId,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
  requestId?: string | null;
}) {
  const { mutate, cache } = useSWRConfig();
  const chatDataKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`;
  const visibilityCacheKey = requestId
    ? `${requestId}-visibility`
    : `${chatId}-visibility`;
  const history: ChatHistory = cache.get(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`
  )?.data;

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    visibilityCacheKey,
    null,
    {
      fallbackData: initialVisibilityType,
    }
  );

  const visibilityType = useMemo(() => {
    if (requestId) {
      return localVisibility ?? initialVisibilityType;
    }

    if (!history) {
      return localVisibility;
    }
    const chat = history.chats.find((currentChat) => currentChat.id === chatId);
    if (!chat) {
      return localVisibility ?? "private";
    }
    return chat.visibility;
  }, [history, chatId, initialVisibilityType, localVisibility, requestId]);

  const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
    const previousVisibilityType = visibilityType;

    await setLocalVisibility(updatedVisibilityType, { revalidate: false });
    await mutate(
      chatDataKey,
      (
        current:
          | {
              isReadonly: boolean;
              messages: unknown[];
              request: { visibility: VisibilityType } | null;
              userId: string | null;
              visibility: VisibilityType;
            }
          | undefined
      ) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          request: current.request
            ? {
                ...current.request,
                visibility: updatedVisibilityType,
              }
            : current.request,
          visibility: updatedVisibilityType,
        };
      },
      { revalidate: false }
    );

    try {
      await updateChatVisibility({
        chatId,
        requestId,
        visibility: updatedVisibilityType,
      });

      if (requestId) {
        mutate(unstable_serialize(getRequestHistoryPaginationKey));
      } else {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
      }
    } catch (_error) {
      await setLocalVisibility(previousVisibilityType, { revalidate: false });
      await mutate(
        chatDataKey,
        (
          current:
            | {
                isReadonly: boolean;
                messages: unknown[];
                request: { visibility: VisibilityType } | null;
                userId: string | null;
                visibility: VisibilityType;
              }
            | undefined
        ) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            request: current.request
              ? {
                  ...current.request,
                  visibility: previousVisibilityType,
                }
              : current.request,
            visibility: previousVisibilityType,
          };
        },
        { revalidate: false }
      );

      mutate(chatDataKey);
    }
  };

  return { visibilityType, setVisibilityType };
}

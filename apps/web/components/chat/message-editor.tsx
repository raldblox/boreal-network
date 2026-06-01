"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { flushSync } from "react-dom";
import type { ChatMessage } from "@/lib/types";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

export async function submitEditedMessage({
  message,
  sendMessage,
  text,
  setMessages,
}: {
  message: ChatMessage;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  text: string;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  await fetchWithErrorHandlers(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages/trailing`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messageId: message.id }),
    }
  );

  flushSync(() => {
    setMessages((messages) => {
      const index = messages.findIndex((m) => m.id === message.id);
      if (index === -1) {
        return messages;
      }

      return messages.slice(0, index);
    });
  });

  await sendMessage({
    id: generateUUID(),
    role: "user",
    parts: [{ type: "text" as const, text }],
  });
}

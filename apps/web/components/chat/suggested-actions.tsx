"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo } from "react";
import type { RequestStatus } from "@/lib/request";
import {
  newRequestSuggestions,
  openRequestSuggestions,
  requestDraftSuggestions,
  suggestions,
} from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../ai-elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  setInput: (value: string) => void;
  onRequestSuggestionSelect?: (value: string) => void;
  selectedVisibilityType: VisibilityType;
  isRequestMode: boolean;
  requestStatus?: RequestStatus | null;
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  setInput,
  onRequestSuggestionSelect,
  isRequestMode,
  requestStatus,
}: SuggestedActionsProps) {
  const isRequestSuggestionMode = isRequestMode || Boolean(requestStatus);
  const promptLabel = requestStatus
    ? requestStatus === "draft"
      ? "Draft prompt"
      : "Room prompt"
    : isRequestMode
      ? "Request prompt"
      : "Quick start";
  const suggestedActions = requestStatus
    ? requestStatus === "draft"
      ? requestDraftSuggestions
      : openRequestSuggestions
    : isRequestMode
      ? newRequestSuggestions
      : suggestions;

  return (
    <div
      className="grid w-full grid-cols-1 gap-3 pb-1 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
          exit={{ opacity: 0, y: 16 }}
          initial={{ opacity: 0, y: 16 }}
          key={suggestedAction}
          transition={{
            delay: 0.06 * index,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal rounded-[24px] border border-border/60 bg-background/92 px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground shadow-[0_12px_35px_rgba(15,23,42,0.04)] transition-all duration-200 sm:p-4 sm:text-[13px] hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-background hover:text-foreground hover:shadow-[0_16px_45px_rgba(15,23,42,0.08)]"
            onClick={(suggestion) => {
              if (isRequestSuggestionMode) {
                onRequestSuggestionSelect?.(suggestion);
                if (!onRequestSuggestionSelect) {
                  setInput(suggestion);
                }
                return;
              }

              window.history.pushState(
                {},
                "",
                `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
              );
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            <div className="flex flex-col items-start gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/62">
                {promptLabel}
              </span>
              <span className="text-left leading-6">{suggestedAction}</span>
            </div>
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.setInput !== nextProps.setInput) {
      return false;
    }
    if (
      prevProps.onRequestSuggestionSelect !==
      nextProps.onRequestSuggestionSelect
    ) {
      return false;
    }
    if (prevProps.isRequestMode !== nextProps.isRequestMode) {
      return false;
    }
    if (prevProps.requestStatus !== nextProps.requestStatus) {
      return false;
    }

    return true;
  }
);

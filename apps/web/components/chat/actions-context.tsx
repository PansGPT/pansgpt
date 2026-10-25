"use client";

import { createContext, useContext } from "react";

export interface ChatActions {
  sessionId: string | null;
  submitFeedback: (messageId: string, rating: "positive" | "negative") => Promise<void>;
}
export const ChatActionsContext = createContext<ChatActions | null>(null);
export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (!actions) throw new Error("Chat actions require their conversation provider.");
  return actions;
}

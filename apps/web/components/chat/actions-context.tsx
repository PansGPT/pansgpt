"use client";

import { createContext, useContext } from "react";

export interface ChatActions {
  sessionId: string | null;
  /** Only server-confirmed ratings are displayed; native actions dispatch through the adapter. */
  feedbackPending: ReadonlySet<string>;
}
export const ChatActionsContext = createContext<ChatActions | null>(null);
export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (!actions) throw new Error("Chat actions require their conversation provider.");
  return actions;
}

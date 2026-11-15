"use client";

import { createContext, useContext } from "react";
import type { CitationItem } from "@pansgpt/types";

export interface ChatActions {
  sessionId: string | null;
  /** Only server-confirmed ratings are displayed; native actions dispatch through the adapter. */
  feedbackPending: ReadonlySet<string>;
  onCitation?: (citation: CitationItem) => void;
  hideSources?: boolean;
  online?: boolean;
  retryMessage?: (id: string) => Promise<void>;
  retryVoice?: () => Promise<void>;
  canRetryVoice?: boolean;
}
export const ChatActionsContext = createContext<ChatActions | null>(null);
export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (!actions) throw new Error("Chat actions require their conversation provider.");
  return actions;
}

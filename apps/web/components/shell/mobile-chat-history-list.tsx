"use client";

import { MessageCircle, Pin } from "lucide-react";
import type { ChatSessionSummary } from "@/lib/chat-sessions";
import { ChatSessionMenu } from "@/components/chat/session-menu";

/** The same conversation rows and menus on Home and in document study. */
export function MobileChatHistoryList({
  chats,
  onChoose,
  onChanged,
}: {
  chats: ChatSessionSummary[];
  onChoose: (id: string) => void;
  onChanged?: (chat: ChatSessionSummary | null) => void;
}): React.ReactElement {
  return (
    <>
      {chats.map((chat) => (
        <div className="mobile-home-history-item" key={chat.id}>
          <button
            type="button"
            className="mobile-home-history-row"
            onClick={() => onChoose(chat.id)}
          >
            {chat.is_pinned ? (
              <Pin size={18} aria-label="Pinned" />
            ) : (
              <MessageCircle size={19} aria-hidden="true" />
            )}
            <span>{chat.title}</span>
          </button>
          <ChatSessionMenu chat={chat} onChanged={onChanged} />
        </div>
      ))}
    </>
  );
}

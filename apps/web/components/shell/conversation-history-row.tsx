"use client";

import Link from "next/link";
import { MessageCircle, Pin } from "lucide-react";
import type { ChatSessionSummary } from "@/lib/chat-sessions";
import { ChatSessionMenu } from "@/components/chat/session-menu";

export function ConversationHistoryRow({
  chat,
  href,
  onChoose,
  onChanged,
  current = false,
}: {
  chat: ChatSessionSummary;
  href?: string;
  onChoose: () => void;
  onChanged?: (chat: ChatSessionSummary | null) => void;
  current?: boolean;
}): React.ReactElement {
  const content = (
    <>
      {chat.is_pinned ? (
        <Pin size={16} aria-label="Pinned" />
      ) : (
        <MessageCircle size={16} aria-hidden="true" />
      )}
      <span>{chat.title || "New chat"}</span>
    </>
  );
  return (
    <div className="shell-chat-row">
      {href ? (
        <Link href={href} onClick={onChoose}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className="shell-conversation-select"
          aria-current={current ? "true" : undefined}
          onClick={onChoose}
        >
          {content}
        </button>
      )}
      <ChatSessionMenu chat={chat} onChanged={onChanged} />
    </div>
  );
}

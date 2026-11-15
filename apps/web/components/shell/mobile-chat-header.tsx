"use client";

import type { ReactNode } from "react";
import { ChevronRight, History, Search, SquarePen } from "lucide-react";

export function MobileChatHeader({
  historyOpen,
  onToggleHistory,
  onSearch,
  onNew,
  historyId,
  showNew,
  controls,
}: {
  historyOpen: boolean;
  onToggleHistory: () => void;
  onSearch: () => void;
  onNew: () => void;
  historyId: string;
  showNew: boolean;
  controls?: ReactNode;
}): React.ReactElement {
  return (
    <header className="mobile-home-chat-header">
      <button
        type="button"
        className="shell-icon-button mobile-home-chat-history-toggle"
        aria-label={historyOpen ? "Back to conversation" : "Show chat history"}
        aria-expanded={historyOpen}
        aria-controls={historyId}
        onClick={onToggleHistory}
      >
        {historyOpen ? (
          <ChevronRight size={25} aria-hidden="true" />
        ) : (
          <History size={25} aria-hidden="true" />
        )}
      </button>
      {historyOpen ? (
        <button
          type="button"
          className="shell-icon-button mobile-home-chat-history-toggle"
          aria-label="Search conversations"
          onClick={onSearch}
        >
          <Search size={24} aria-hidden="true" />
        </button>
      ) : showNew ? (
        <div className="mobile-home-chat-actions">
          <button type="button" className="shell-icon-button" aria-label="New chat" onClick={onNew}>
            <SquarePen size={25} aria-hidden="true" />
          </button>
          {controls}
        </div>
      ) : null}
    </header>
  );
}

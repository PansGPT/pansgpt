"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, MoreHorizontal, Search, SquarePen, Pin } from "lucide-react";
import { destinations, mobileDestinations, isCurrentDestination } from "./navigation";
import { useDashboard, useRecentChats } from "./dashboard-data";
import { sampleDocuments } from "./sample-data";
import { SamplePreview } from "./sample-preview";
import { ArchivedChats, ChatSessionMenu } from "@/components/chat/session-menu";
import { useChatDraft } from "./chat-draft";
import type { ChatSessionSummary } from "@/lib/chat-sessions";

export function SidebarLinks({
  close,
  openSearch,
  mobile = false,
}: {
  mobile?: boolean;
  close: () => void;
  openSearch: () => void;
}): React.ReactElement {
  const pathname = usePathname();
  const { startNewChat } = useChatDraft();
  const recentTitle = useId();
  const pinnedTitle = useId();
  const { chats, loading, error } = useRecentChats();
  const { reload } = useDashboard();
  const [expanded, setExpanded] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const examples = !loading && !error && !chats.length;
  const pinned = chats.filter((chat) => chat.is_pinned);
  const recent = chats.filter((chat) => !chat.is_pinned);
  const chatRow = (chat: ChatSessionSummary) => (
    <div className="shell-chat-row" key={chat.id}>
      <Link href={`/app/chat?session=${encodeURIComponent(chat.id)}`} onClick={close}>
        {chat.is_pinned ? (
          <Pin size={16} aria-label="Pinned" />
        ) : (
          <FileText size={17} aria-hidden="true" />
        )}
        <span>{chat.title || "New chat"}</span>
      </Link>
      <ChatSessionMenu chat={chat} />
    </div>
  );
  const exampleChats = [
    ...sampleDocuments.map((item) => item.title),
    "Revision checklist",
    "Study plan for the week",
  ];
  return (
    <div className="reference-sidebar">
      <div className="shell-links">
        {(mobile ? mobileDestinations : destinations)
          .filter((item) => item.href !== "/app/chat")
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="shell-nav-link"
              aria-label={label}
              aria-current={isCurrentDestination(pathname, href) ? "page" : undefined}
              onClick={close}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
      </div>
      <div className="shell-new-chat-section">
        <Link
          href="/app/chat"
          className="shell-nav-link shell-new-chat"
          aria-label="New chat"
          onClick={() => {
            startNewChat();
            close();
          }}
        >
          <SquarePen size={19} aria-hidden="true" />
          <span>New chat</span>
        </Link>
      </div>
      <section className="shell-sidebar-group shell-chat-history" aria-labelledby={recentTitle}>
        <div className="shell-recent-heading">
          <h2 id={recentTitle}>
            Recent chats {examples && <span className="dashboard-sample-badge">Sample</span>}
          </h2>
          <ArchivedChats onNavigate={close} />
          <button
            aria-label="Quick search"
            onClick={() => {
              close();
              openSearch();
            }}
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="shell-chat-list" role="region" aria-label="Chat history" tabIndex={0}>
          {!!pinned.length && (
            <section className="shell-pinned-chats" aria-labelledby={pinnedTitle}>
              <h2 id={pinnedTitle}>Pinned</h2>
              {pinned.map(chatRow)}
            </section>
          )}
          {loading ? (
            <p className="shell-sidebar-hint">Loading chats…</p>
          ) : error ? (
            <>
              <p className="shell-sidebar-hint">Chat history is unavailable.</p>
              <button className="shell-history-more" onClick={reload}>
                Try again
              </button>
            </>
          ) : examples ? (
            exampleChats.slice(0, expanded ? exampleChats.length : 6).map((title, index) => (
              <div className="shell-chat-row" key={title}>
                <button className="shell-sample-chat" onClick={() => setSample(title)}>
                  <FileText size={17} aria-hidden="true" />
                  <span>{title}</span>
                </button>
                <ChatSessionMenu
                  chat={{ id: `sample-${index}`, title, is_pinned: false, archived_at: null }}
                  disabled
                />
              </div>
            ))
          ) : (
            recent.slice(0, expanded ? 30 : 6).map(chatRow)
          )}
          {!loading && !error && (examples ? exampleChats.length : recent.length) > 6 && (
            <button
              className="shell-history-more"
              onClick={() => {
                setExpanded((value) => !value);
              }}
            >
              <MoreHorizontal size={18} aria-hidden="true" />
              <span>{expanded ? "Less" : "More"}</span>
            </button>
          )}
        </div>
      </section>
      <SamplePreview title={sample} onClose={() => setSample(null)}>
        <p className="sample-chat-bubble">
          Help me organise my revision for {sample?.toLowerCase()}.
        </p>
        <p className="sample-chat-bubble" data-role="assistant">
          We can start with your course notes, then make a short revision checklist.
        </p>
        <p>
          This is an example conversation. Your own chats will appear here when you start studying
          with PansGPT.
        </p>
        <Link
          href="/app/chat"
          onClick={() => {
            setSample(null);
            close();
          }}
        >
          Start a new chat
        </Link>
      </SamplePreview>
    </div>
  );
}

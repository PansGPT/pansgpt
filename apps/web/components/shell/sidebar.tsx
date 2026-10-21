"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, MoreHorizontal, Search } from "lucide-react";
import { destinations, isCurrentDestination } from "./navigation";
import { useDashboard, useRecentChats } from "./dashboard-data";
import { sampleDocuments } from "./sample-data";
import { SamplePreview } from "./sample-preview";

export function SidebarLinks({
  close,
  openSearch,
}: {
  close: () => void;
  openSearch: () => void;
}): React.ReactElement {
  const pathname = usePathname();
  const recentTitle = useId();
  const { chats, loading, error } = useRecentChats();
  const { reload } = useDashboard();
  const [expanded, setExpanded] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const examples = !loading && !error && !chats.length;
  const exampleChats = [
    ...sampleDocuments.map((item) => item.title),
    "Revision checklist",
    "Study plan for the week",
  ];
  return (
    <div className="reference-sidebar">
      <div className="shell-links">
        {destinations
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
      <section className="shell-sidebar-group" aria-labelledby={recentTitle}>
        <div className="shell-recent-heading">
          <h2 id={recentTitle}>
            Recent chats {examples && <span className="dashboard-sample-badge">Sample</span>}
          </h2>
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
        {loading ? (
          <p className="shell-sidebar-hint">Loading chats…</p>
        ) : error ? (
          <>
            <p className="shell-sidebar-hint">Chat history is unavailable.</p>
            <button onClick={reload}>Try again</button>
          </>
        ) : examples ? (
          exampleChats.slice(0, expanded ? exampleChats.length : 6).map((title) => (
            <button key={title} onClick={() => setSample(title)}>
              <FileText size={17} aria-hidden="true" />
              <span>{title}</span>
            </button>
          ))
        ) : (
          chats.slice(0, expanded ? 30 : 6).map((chat) => (
            <Link
              key={chat.id}
              href={`/app/chat?session=${encodeURIComponent(chat.id)}`}
              onClick={close}
            >
              <FileText size={17} aria-hidden="true" />
              <span>{chat.title || "Untitled chat"}</span>
            </Link>
          ))
        )}
        {!loading && !error && (
          <button
            onClick={() => {
              setExpanded((value) => !value);
            }}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
            <span>{expanded ? "Less" : "More"}</span>
          </button>
        )}
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

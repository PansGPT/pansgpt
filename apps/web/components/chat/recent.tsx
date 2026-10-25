"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  MessageCircle,
  NotebookPen,
  FileQuestion,
  MoreHorizontal,
} from "lucide-react";
import { useDashboard, useRecentChats } from "@/components/shell/dashboard-data";
import { SamplePreview } from "@/components/shell/sample-preview";

const examples = [
  {
    id: "sample-chat",
    title: "Malaria drug management",
    kind: "Chat",
    detail: "2 hours ago",
    href: null,
  },
  {
    id: "sample-library",
    title: "Goodman & Gilman",
    kind: "Library",
    detail: "5 hours ago",
    href: null,
  },
  {
    id: "sample-quiz",
    title: "Antimicrobials Quiz",
    kind: "Quiz",
    detail: "9 hours ago",
    href: null,
  },
  {
    id: "sample-notes",
    title: "Pharmacokinetics Notes",
    kind: "Notes",
    detail: "1 day ago",
    href: null,
  },
  {
    id: "sample-chat-2",
    title: "Autonomic pharmacology",
    kind: "Chat",
    detail: "2 days ago",
    href: null,
  },
  {
    id: "sample-library-2",
    title: "Renal revision notes",
    kind: "Library",
    detail: "3 days ago",
    href: null,
  },
] as const;
type RecentItem = { id: string; title: string; kind: string; detail: string; href: string | null };
export function ChatRecent(): React.ReactElement {
  const router = useRouter();
  const documents = useDashboard();
  const history = useRecentChats();
  const [preview, setPreview] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const real: RecentItem[] = [
    ...history.chats.map((chat) => ({
      id: chat.id,
      title: chat.title || "Untitled chat",
      kind: "Chat",
      detail: "Saved conversation",
      href: `/app/chat?session=${encodeURIComponent(chat.id)}`,
    })),
    ...documents.recent.map((document) => ({
      id: document.documents.id,
      title: document.documents.title,
      kind: "Library",
      detail: new Date(document.updated_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      href: `/app/library?q=${encodeURIComponent(document.documents.title)}`,
    })),
  ];
  const loading = documents.loading || history.loading;
  const error = documents.recentError || history.error;
  const sample = !loading && !error && !real.length;
  const items: readonly RecentItem[] = sample ? examples : real;
  return (
    <section className="study-chat-recent" aria-labelledby="chat-recent-title">
      <header>
        <h2 id="chat-recent-title">Recent</h2>
        {sample && <span className="dashboard-sample-badge">Sample</span>}
        {items.length > 4 && (
          <button onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show less" : "See all"}
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </header>
      {loading ? (
        <p role="status">Loading recent activity…</p>
      ) : (
        <>
          {error && (
            <p className="study-chat-recent-error" role="alert">
              Some recent activity couldn&apos;t be loaded.{" "}
              <button onClick={documents.reload}>Try again</button>
            </p>
          )}
          <div className="study-chat-recent-grid">
            {items.slice(0, expanded ? items.length : 4).map((item) => {
              const Icon =
                item.kind === "Chat"
                  ? MessageCircle
                  : item.kind === "Library"
                    ? BookOpen
                    : item.kind === "Quiz"
                      ? FileQuestion
                      : NotebookPen;
              return (
                <button
                  key={item.id}
                  className="study-chat-recent-card"
                  onClick={() => {
                    if (item.href) router.push(item.href);
                    else setPreview(item.title);
                  }}
                >
                  <span className="study-chat-recent-icon" data-kind={item.kind}>
                    <Icon size={25} aria-hidden="true" />
                  </span>
                  <span className="study-chat-recent-copy">
                    <strong>{item.title}</strong>
                    <small>
                      {item.kind} · {item.detail}
                    </small>
                  </span>
                  <MoreHorizontal size={16} className="study-chat-recent-more" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {!items.length && <p>Your chats and opened documents will appear here.</p>}
        </>
      )}
      <SamplePreview title={preview} onClose={() => setPreview(null)}>
        <p>
          This is a sample {examples.find((item) => item.title === preview)?.kind.toLowerCase()}{" "}
          card for the chat layout. Your own study activity will replace these examples.
        </p>
      </SamplePreview>
    </section>
  );
}

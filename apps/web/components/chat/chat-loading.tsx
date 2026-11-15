import { Skeleton } from "@pansgpt/ui/shell";
import "@/app/app/chat/chat.css";

/** Conversation placeholder stays inside the mounted workspace or mobile sheet. */
export function ChatLoading(): React.ReactElement {
  return (
    <section
      className="study-chat-loading"
      role="status"
      aria-label="Loading conversation"
      aria-busy="true"
    >
      <span className="p-sr-only">Loading conversation…</span>
      <div className="study-chat-loading-heading" aria-hidden="true">
        <Skeleton className="study-chat-loading-title" />
        <Skeleton className="study-chat-loading-control" />
      </div>
      <div className="study-chat-loading-body" aria-hidden="true">
        <Skeleton className="study-chat-loading-question" />
        <div className="study-chat-loading-answer">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
        <Skeleton className="study-chat-loading-composer" />
      </div>
    </section>
  );
}

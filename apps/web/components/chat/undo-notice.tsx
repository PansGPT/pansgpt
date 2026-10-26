"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "@/components/shell/dashboard-data";
import { requestSession, restoreSession } from "@/lib/chat-sessions";
import "./conversation-controls.css";

interface UndoNotice {
  id: string;
  title: string;
  operation: "archive" | "delete";
  owner: string;
  wasCurrent: boolean;
}
export function offerConversationUndo(notice: UndoNotice): void {
  window.dispatchEvent(new CustomEvent("pansgpt-chat-undo", { detail: notice }));
}
export function ConversationUndo(): React.ReactElement | null {
  const { session, profile } = useAuth();
  const { reload } = useDashboard();
  const router = useRouter();
  const owner = `${profile?.id}:${profile?.university_id}`;
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      const item = (event as CustomEvent<UndoNotice>).detail;
      if (item.owner !== owner) return;
      request.current?.abort();
      setBusy(false);
      setError(undefined);
      setNotice(item);
    };
    window.addEventListener("pansgpt-chat-undo", receive);
    return () => {
      window.removeEventListener("pansgpt-chat-undo", receive);
      request.current?.abort();
    };
  }, [owner]);
  useEffect(() => {
    if (!notice || busy || error) return;
    const timer = setTimeout(() => setNotice(null), 10000);
    return () => clearTimeout(timer);
  }, [notice, busy, error]);
  if (!notice || notice.owner !== owner) return null;
  return (
    <div className="study-chat-undo" role="status" aria-live="polite">
      <span>
        {error ?? `Conversation ${notice.operation === "delete" ? "deleted" : "archived"}.`}
      </span>
      <button
        disabled={busy}
        onClick={() => {
          const controller = new AbortController();
          request.current = controller;
          setBusy(true);
          setError(undefined);
          const restore =
            notice.operation === "delete"
              ? restoreSession(session?.access_token, notice.id, controller.signal)
              : requestSession(
                  session?.access_token,
                  notice.id,
                  { archived: false },
                  controller.signal
                );
          void restore
            .then(() => {
              if (controller.signal.aborted) return;
              reload();
              if (notice.wasCurrent) router.push(`/app/chat?session=${notice.id}`);
              setNotice(null);
            })
            .catch((failure: unknown) => {
              if (!controller.signal.aborted)
                setError(failure instanceof Error ? failure.message : "Undo failed. Please retry.");
            })
            .finally(() => {
              if (!controller.signal.aborted) setBusy(false);
            });
        }}
      >
        {busy ? "Restoring…" : error ? "Retry undo" : "Undo"}
      </button>
      <button
        aria-label="Dismiss conversation update"
        disabled={busy}
        onClick={() => setNotice(null)}
      >
        <X size={15} />
      </button>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatDraft } from "@/components/shell/chat-draft";
import { WorkspaceLoading } from "@/components/shell/loading";
import { ChatContent, ChatHistory } from "@/components/chat/surface";
import { PresentationWorkspace } from "@/components/artifacts/PresentationWorkspace";

const desktopQuery = "(min-width: 861px)";
function subscribeDesktop(notify: () => void): () => void {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

function ChatRoute(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id =
    searchParams.get("session") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("session")
      : null);
  const { revision } = useChatDraft();
  const { profile } = useAuth();

  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => true
  );

  useEffect(() => {
    if (
      !desktop &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/app/chat")
    ) {
      const target = id ? `/app?session=${encodeURIComponent(id)}` : "/app?chat=new";
      router.replace(target);
    }
  }, [desktop, id, router]);

  if (
    !desktop &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/app/chat")
  ) {
    return <WorkspaceLoading />;
  }

  return (
    <PresentationWorkspace
      key={`${profile?.id}:${profile?.university_id}:${id || "new"}:${revision}`}
    >
      {id ? <ChatHistory id={id} /> : <ChatContent />}
    </PresentationWorkspace>
  );
}

export default function ChatPage(): React.ReactElement {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <ChatRoute />
    </Suspense>
  );
}

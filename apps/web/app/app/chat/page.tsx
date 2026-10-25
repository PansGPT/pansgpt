"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatDraft } from "@/components/shell/chat-draft";
import { WorkspaceLoading } from "@/components/shell/loading";
import { ChatContent, ChatHistory } from "@/components/chat/surface";
import { PresentationWorkspace } from "@/components/artifacts/PresentationWorkspace";

function ChatRoute(): React.ReactElement {
  const id = useSearchParams().get("session");
  const { revision } = useChatDraft();
  const { profile } = useAuth();
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

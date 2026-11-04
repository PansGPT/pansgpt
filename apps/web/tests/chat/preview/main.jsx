import React from "react";
import { createRoot } from "react-dom/client";
import "@pansgpt/ui/styles.css";
import "@/components/shell/shell.css";
import { AppShell } from "@/components/shell/app-shell";
import ChatPage from "@/app/app/chat/page";
import { ChatContent, ChatHistory } from "@/components/chat/surface";
import { PresentationWorkspace } from "@/components/artifacts/PresentationWorkspace";
import { useChatDraft } from "@/components/shell/chat-draft";
import { StudyDashboard } from "@/components/shell/dashboard";
import { WorkspaceLibrary } from "@/components/shell/library";
import { usePathname, useSearchParams, useAuth } from "./fixtures";
const exercisePublicRoute = new URLSearchParams(location.search).get("route_contract") === "1";
// Component contracts cover both viewport sizes independently of the public route redirect.
// The actual ChatPage route is exercised explicitly by the route-contract browser journey.
function ComponentChatPreview() {
  const id = useSearchParams().get("session");
  const { revision } = useChatDraft();
  const { profile } = useAuth();
  return (
    <PresentationWorkspace
      key={`${profile.id}:${profile.university_id}:${id || "new"}:${revision}`}
    >
      {id ? <ChatHistory id={id} /> : <ChatContent />}
    </PresentationWorkspace>
  );
}
function Preview() {
  const pathname = usePathname();
  return (
    <AppShell>
      {pathname === "/app" ? (
        <StudyDashboard />
      ) : pathname === "/app/library" ? (
        <WorkspaceLibrary />
      ) : exercisePublicRoute ? (
        <ChatPage />
      ) : (
        <ComponentChatPreview />
      )}
    </AppShell>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>
);

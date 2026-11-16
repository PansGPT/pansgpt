import React, { useState } from "react";
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
import { ReaderWorkspace } from "@/components/reader/reader-workspace";
import { ProfileError } from "@/components/shell/profile-error";
import { requestProfile } from "@/lib/profile-verification";
import { ThemeProvider } from "@pansgpt/ui/shell";
import { env } from "./fixtures";
import { usePathname, useSearchParams, useAuth } from "./fixtures";
import { AuthCachePreview } from "./auth-cache-preview";
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
      ) : /^\/app\/library\/[^/]+\/read$/.test(pathname) ? (
        <ReaderWorkspace documentId={pathname.split("/")[3]} />
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
function ProfileRecoveryPreview() {
  const code = new URLSearchParams(location.search).get("profile_failure");
  const [result, setResult] = useState({
    status: "error",
    error: { code, retryable: !["session_expired", "forbidden"].includes(code) },
  });
  return (
    <>
      <small>Synthetic profile recovery preview</small>
      {result.status === "ready" ? (
        <p role="status">Synthetic profile verified</p>
      ) : (
        <ProfileError
          error={result.error}
          onRetry={async () => {
            setResult(
              await requestProfile(
                env.NEXT_PUBLIC_API_URL,
                {
                  userId: "00000000-0000-4000-8000-000000000001",
                  accessToken: "synthetic-profile-token",
                },
                new AbortController().signal
              )
            );
          }}
          onSignOut={async () => {}}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("auth_cache_recovery") ? (
      <AuthCachePreview />
    ) : new URLSearchParams(location.search).has("profile_failure") ? (
      <ThemeProvider initialTheme="dark">
        <ProfileRecoveryPreview />
      </ThemeProvider>
    ) : (
      <Preview />
    )}
  </React.StrictMode>
);

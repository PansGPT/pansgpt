import React from "react";
import { createRoot } from "react-dom/client";
import "@pansgpt/ui/styles.css";
import "@/components/shell/shell.css";
import { AppShell } from "@/components/shell/app-shell";
import ChatPage from "@/app/app/chat/page";
import { StudyDashboard } from "@/components/shell/dashboard";
import { WorkspaceLibrary } from "@/components/shell/library";
import { usePathname } from "./fixtures";
function Preview() {
  const pathname = usePathname();
  return (
    <AppShell>
      {pathname === "/app" ? (
        <StudyDashboard />
      ) : pathname === "/app/library" ? (
        <WorkspaceLibrary />
      ) : (
        <ChatPage />
      )}
    </AppShell>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>
);

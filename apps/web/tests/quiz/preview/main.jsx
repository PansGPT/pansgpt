import React from "react";
import { createRoot } from "react-dom/client";
import "@pansgpt/ui/styles.css";
import { ThemeProvider } from "@pansgpt/ui/shell";
import { QuizWorkspace } from "@/components/quiz/workspace";
const theme = new URLSearchParams(location.search).get("theme") || "light";
createRoot(document.getElementById("root")).render(
  <ThemeProvider initialTheme={theme}>
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary-900)",
      }}
    >
      <div
        style={{
          padding: "8px 20px",
          borderBottom: "1px solid var(--border-secondary)",
          fontFamily: "var(--font-body)",
          fontSize: 10,
          color: "var(--text-tertiary-600)",
        }}
      >
        PansGPT · Synthetic quiz test workspace
      </div>
      <QuizWorkspace />
    </div>
  </ThemeProvider>
);

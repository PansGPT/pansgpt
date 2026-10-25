"use client";

import { useState } from "react";
import { useAui } from "@assistant-ui/react";
import {
  Brain,
  ChartNoAxesCombined,
  ChevronDown,
  FileDown,
  FileText,
  Layers,
  NotebookPen,
  Presentation,
  FlaskConical,
} from "lucide-react";

// Matches implementation_plan.md §8.5. These prepare requests, never execute tools.
const tools = [
  {
    name: "Create a document",
    detail: "Word documents and assignments",
    icon: FileText,
    prompt: "Create a downloadable Word document about: ",
  },
  {
    name: "Make slides",
    detail: "Presentation decks for your topic",
    icon: Presentation,
    prompt: "Create a PowerPoint presentation about: ",
  },
  {
    name: "Create flashcards",
    detail: "Turn a topic into recall practice",
    icon: Layers,
    prompt: "Create a flashcard deck to help me revise: ",
  },
  {
    name: "Plot a graph",
    detail: "Visualise data and relationships",
    icon: ChartNoAxesCombined,
    prompt: "Plot a graph to explain the following data or relationship: ",
  },
  {
    name: "Create study notes",
    detail: "Structured Markdown notes",
    icon: NotebookPen,
    prompt: "Create structured Markdown study notes about: ",
  },
  {
    name: "Make a revision sheet",
    detail: "Printable PDF summaries",
    icon: FileDown,
    prompt: "Create a downloadable PDF revision sheet about: ",
  },
  {
    name: "Create mnemonics",
    detail: "Make difficult details memorable",
    icon: Brain,
    prompt: "Create memorable study mnemonics for: ",
  },
  {
    name: "Chemical structures",
    detail: "Interactive SMILES and mechanism drawer",
    icon: FlaskConical,
    prompt: null,
  },
] as const;

export function ChatTools(): React.ReactElement {
  const aui = useAui();
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="study-chat-tools" aria-labelledby="chat-tools-title">
      <header>
        <div>
          <h2 id="chat-tools-title">Tools</h2>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="chat-tools-grid"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "See all"}
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </header>
      <div id="chat-tools-grid" className="study-chat-tools-grid">
        {tools.slice(0, expanded ? tools.length : 4).map(({ name, detail, icon: Icon, prompt }) => (
          <button
            key={name}
            type="button"
            className="study-chat-tool-card"
            title={prompt === null ? "Coming later" : detail}
            disabled={prompt === null}
            onClick={() => {
              if (prompt === null) return;
              aui.composer().setText(prompt);
              document.querySelector<HTMLTextAreaElement>(".study-chat-welcome textarea")?.focus();
            }}
          >
            <span className="study-chat-tool-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="study-chat-tool-copy">
              <strong>{name}</strong>
              <small className="p-sr-only">{prompt === null ? "Coming later" : detail}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

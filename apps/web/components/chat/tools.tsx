"use client";

import { useState } from "react";
import type { ChatActionMode } from "@pansgpt/types";
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

// These select a composer mode; the backend owns action execution.
export const chatActionTools = [
  {
    actionMode: "create_document",
    modeLabel: "Document",
    placeholder: "What should the document cover?",
    name: "Create a document",
    detail: "Word documents and assignments",
    icon: FileText,
  },
  {
    actionMode: "make_slides",
    modeLabel: "Slides",
    placeholder: "What should I include in the slides?",
    name: "Make slides",
    detail: "Presentation decks for your topic",
    icon: Presentation,
  },
  {
    actionMode: "create_flashcards",
    modeLabel: "Flashcards",
    placeholder: "What topic should I make flashcards about?",
    name: "Create flashcards",
    detail: "Turn a topic into recall practice",
    icon: Layers,
  },
  {
    actionMode: "plot_graph",
    modeLabel: "Graph",
    placeholder: "Describe the data or relationship to plot",
    name: "Plot a graph",
    detail: "Visualise data and relationships",
    icon: ChartNoAxesCombined,
  },
  {
    actionMode: "create_study_notes",
    modeLabel: "Study notes",
    placeholder: "What topic should I turn into study notes?",
    name: "Create study notes",
    detail: "Structured Markdown notes",
    icon: NotebookPen,
  },
  {
    actionMode: "make_revision_sheet",
    modeLabel: "Revision sheet",
    placeholder: "What should the revision sheet cover?",
    name: "Make a revision sheet",
    detail: "Printable PDF summaries",
    icon: FileDown,
  },
  {
    actionMode: "create_mnemonics",
    modeLabel: "Mnemonics",
    placeholder: "What should I help you remember?",
    name: "Create mnemonics",
    detail: "Make difficult details memorable",
    icon: Brain,
  },
  {
    actionMode: null,
    modeLabel: "Chemical structures",
    placeholder: "",
    name: "Chemical structures",
    detail: "Interactive SMILES and mechanism drawer",
    icon: FlaskConical,
  },
] as const;

export const primaryChatActions = [
  chatActionTools[1],
  chatActionTools[2],
  chatActionTools[3],
  chatActionTools[0],
] as const;
export const moreChatActions = chatActionTools.slice(4);

export function ChatTools({
  onActionSelect,
}: {
  onActionSelect: (actionMode: ChatActionMode) => void;
}): React.ReactElement {
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
        {chatActionTools
          .slice(0, expanded ? chatActionTools.length : 4)
          .map(({ name, detail, icon: Icon, actionMode }) => (
            <button
              key={name}
              type="button"
              className="study-chat-tool-card"
              title={actionMode === null ? "Coming later" : detail}
              disabled={actionMode === null}
              onClick={() => {
                if (actionMode === null) return;
                onActionSelect(actionMode);
                document
                  .querySelector<HTMLTextAreaElement>(".study-chat-welcome textarea")
                  ?.focus();
              }}
            >
              <span className="study-chat-tool-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="study-chat-tool-copy">
                <strong>{name}</strong>
                <small className="p-sr-only">{actionMode === null ? "Coming later" : detail}</small>
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}

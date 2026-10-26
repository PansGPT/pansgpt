"use client";

// Adapted from assistant-ui's MIT-licensed reasoning element (see assistant-ui.LICENSE).
import { useLayoutEffect, useRef, useState } from "react";
import {
  useAuiState,
  getExternalStoreMessages,
  useScrollLock,
  type ReasoningMessagePartComponent,
} from "@assistant-ui/react";
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from "@pansgpt/ui/shell";
import type { ChatMessageView } from "@pansgpt/types";
import { publicProgressLines } from "@/lib/chat-message";
import { Brain, ChevronDown } from "lucide-react";

export const ChatReasoning: ReasoningMessagePartComponent = ({ text }) => {
  const streaming = useAuiState((state) => state.message.status?.type === "running");
  const message = useAuiState(
    (state) => getExternalStoreMessages<ChatMessageView>(state.message)[0]
  );
  const labels: Record<string, string> = {
    create_pptx: "Create presentation",
    create_doc: "Create document",
    create_pdf: "Create PDF",
    create_md: "Create notes",
    web_search: "Search sources",
    read_document: "Read document",
    analyse_image: "Analyse image",
    generate_flashcards: "Create flashcards",
    generate_mnemonics: "Create mnemonics",
    plot_graph: "Plot graph",
  };
  const tools = message?.tools ?? [];
  const steps = publicProgressLines(text);
  const progress = message?.progress ?? [];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const previousStreaming = useRef(streaming);
  const lockScroll = useScrollLock(root, 200);
  useLayoutEffect(() => {
    if (previousStreaming.current !== streaming) lockScroll();
    previousStreaming.current = streaming;
  }, [streaming, lockScroll]);
  useLayoutEffect(() => {
    if (!open || !streaming || !pinned.current) return;
    const frame = requestAnimationFrame(() => {
      if (scroll.current && pinned.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [text, progress.length, tools.length, open, streaming]);
  if (!steps.length && !tools.length && !progress.length) return null;
  return (
    <CollapsibleRoot
      ref={root}
      className="aui-reasoning-root"
      open={open}
      onOpenChange={(next) => {
        lockScroll();
        setOpen(next);
      }}
    >
      <CollapsibleTrigger className="aui-reasoning-trigger" aria-label="Steps">
        <Brain size={16} aria-hidden="true" />
        <span>Steps</span>
        <ChevronDown size={14} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="aui-reasoning-content" aria-busy={streaming}>
        <div
          ref={scroll}
          className="aui-reasoning-scroll"
          onScroll={() => {
            const element = scroll.current;
            if (element)
              pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24;
          }}
        >
          <ol>
            {(progress.length ? progress.map((update) => update.label) : steps).map(
              (step, index) => (
                <li key={`${index}:${step}`}>{step}</li>
              )
            )}
            {tools.map((tool) => (
              <li key={tool.call_id}>
                {labels[tool.tool_name] || "Study tool"}
                {": "}
                {tool.status === "running"
                  ? streaming
                    ? "Working"
                    : "Stopped"
                  : tool.status === "error"
                    ? "Failed"
                    : "Completed"}
              </li>
            ))}
          </ol>
        </div>
      </CollapsibleContent>
    </CollapsibleRoot>
  );
};

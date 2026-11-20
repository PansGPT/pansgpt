"use client";
import {
  Check,
  CircleAlert,
  Search,
  FileText,
  Image as ImageIcon,
  WandSparkles,
  Circle,
} from "lucide-react";
import type { ToolExecutionState } from "@pansgpt/types";
import { RichDisclosure } from "@/components/artifacts/RichCard";
const labels: Record<string, { label: string; icon: typeof Search }> = {
  rag_search: { label: "Course material search", icon: Search },
  web_search: { label: "Web search", icon: Search },
  read_document: { label: "Document reading", icon: FileText },
  vision_analyze: { label: "Image analysis", icon: ImageIcon },
  create_doc: { label: "Word document", icon: FileText },
  create_pdf: { label: "Revision PDF", icon: FileText },
  create_md: { label: "Study notes", icon: FileText },
  create_pptx: { label: "Presentation", icon: WandSparkles },
  plot_graph: { label: "Graph or diagram", icon: WandSparkles },
  generate_flashcards: { label: "Flashcards", icon: WandSparkles },
  generate_mnemonics: { label: "Memory aid", icon: WandSparkles },
  draw_chemical_structure: { label: "Chemical structure", icon: WandSparkles },
};
export function ToolActivity({
  tools,
  running,
}: {
  tools?: ToolExecutionState[];
  running: boolean;
}) {
  if (!tools?.length) return null;
  const failed = tools.some((tool) => tool.status === "error");
  return (
    <div className="chat-tool-activity">
      <RichDisclosure
        label={
          running
            ? "Study tools in use"
            : failed
              ? "Study tools · some unavailable"
              : `Used ${tools.length} study ${tools.length === 1 ? "tool" : "tools"}`
        }
      >
        <ul>
          {tools.map((tool) => {
            const item = labels[tool.tool_name] || { label: "Study tool", icon: WandSparkles };
            const Icon = item.icon;
            const state =
              tool.status === "running"
                ? running
                  ? "In progress"
                  : "Stopped"
                : tool.status === "error"
                  ? "Unavailable"
                  : "Complete";
            return (
              <li key={tool.call_id}>
                <Icon size={15} />
                <span>{item.label}</span>
                <span className="chat-tool-state">
                  {state}
                  {state === "Complete" ? (
                    <Check size={13} />
                  ) : state === "Unavailable" ? (
                    <CircleAlert size={13} />
                  ) : (
                    <Circle size={10} />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </RichDisclosure>
    </div>
  );
}

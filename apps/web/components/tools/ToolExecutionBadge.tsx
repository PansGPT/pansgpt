"use client";

import React, { useEffect, useState } from "react";
import {
  Database,
  Globe,
  FileText,
  Eye,
  Presentation,
  Layers,
  Sparkles,
  FlaskConical,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ToolExecutionState } from "@/lib/sse-parser";

interface ToolExecutionBadgeProps {
  tool: ToolExecutionState;
}

const TOOL_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  rag_search: { label: "Searching Syllabus Library", icon: Database },
  read_document: { label: "Reading Course Slides", icon: FileText },
  web_search: { label: "Searching Biomedical Literature", icon: Globe },
  vision_analyze: { label: "Analyzing Medical Image", icon: Eye },
  create_doc: { label: "Compiling Word Monograph", icon: FileText },
  create_pdf: { label: "Synthesizing PDF Guide", icon: FileText },
  create_pptx: { label: "Building Slide Presentation", icon: Presentation },
  generate_flashcards: { label: "Generating Study Flashcards", icon: Layers },
  generate_mnemonics: { label: "Formulating Mnemonics", icon: Sparkles },
  draw_chemical_structure: { label: "Drawing Chemical Structure", icon: FlaskConical },
};

export const ToolExecutionBadge: React.FC<ToolExecutionBadgeProps> = ({ tool }) => {
  const [elapsedMs, setElapsedMs] = useState<number>(tool.duration_ms || 0);

  useEffect(() => {
    if (tool.status !== "running") return;

    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 100);

    return () => clearInterval(timer);
  }, [tool.status]);

  const config = TOOL_CONFIG[tool.tool_name] || {
    label: tool.tool_name.replace(/_/g, " "),
    icon: Sparkles,
  };
  const IconComponent = config.icon;

  const seconds = (tool.duration_ms ? tool.duration_ms / 1000 : elapsedMs / 1000).toFixed(1);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
        tool.status === "running"
          ? "border-emerald-500/30 bg-emerald-50/50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
          : tool.status === "error"
            ? "border-red-500/30 bg-red-50/50 text-red-800 dark:border-red-500/20 dark:bg-red-950/40 dark:text-red-300"
            : "border-neutral-200 bg-neutral-100/70 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300"
      }`}
    >
      <IconComponent className="h-3.5 w-3.5" />
      <span>{config.label}</span>

      {tool.status === "running" && (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{seconds}s</span>
        </span>
      )}

      {tool.status === "success" && (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>{seconds}s</span>
        </span>
      )}

      {tool.status === "error" && (
        <span className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          <span>Failed</span>
        </span>
      )}
    </div>
  );
};

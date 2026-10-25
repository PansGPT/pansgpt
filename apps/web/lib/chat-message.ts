import type {
  ChatMessageView,
  SSEParsedEvent,
  ChatProgressCode,
  CitationItem,
} from "@pansgpt/types";

export const CHAT_PROGRESS_LABELS: Record<ChatProgressCode, string> = {
  reviewing_request: "Reviewing your request.",
  checking_materials: "Checking your course materials.",
  searching_sources: "Checking external sources.",
  reading_document: "Reading the selected document.",
  analysing_image: "Analysing the attached image.",
  creating_materials: "Preparing your study materials.",
  using_tool: "Running a study tool.",
  writing_response: "Preparing your response.",
  planning_presentation: "Planning your presentation.",
  creating_presentation: "Designing and validating your slides.",
  presentation_ready: "Presentation ready to preview.",
};

export function publicProgressLines(text: string | undefined): string[] {
  const allowed = new Set(Object.values(CHAT_PROGRESS_LABELS));
  return [
    ...new Set(
      (text || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => allowed.has(line))
    ),
  ];
}

export function documentSources(citations: CitationItem[]): CitationItem[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key =
      citation.source_type === "web"
        ? `web:${citation.url || citation.title}`
        : `doc:${citation.document_id || citation.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Apply only parser-validated events. A terminal error survives a later done frame. */
export function applyChatEvent(message: ChatMessageView, event: SSEParsedEvent): ChatMessageView {
  switch (event.event) {
    case "text_chunk":
      return {
        ...message,
        content: message.content + (event.data.token ?? event.data.delta ?? ""),
      };
    case "thinking_chunk": {
      const label = Object.entries(CHAT_PROGRESS_LABELS).find(
        ([code]) => code === event.data.code
      )?.[1];
      const incoming = label ? [label] : publicProgressLines(event.data.token ?? event.data.delta);
      const progress = [...new Set([...publicProgressLines(message.thinking), ...incoming])];
      return incoming.length ? { ...message, thinking: progress.join("\n") } : message;
    }
    case "citations":
      return { ...message, citations: event.data };
    case "tool_start": {
      const tool = { ...event.data, status: "running" as const };
      const others = (message.tools ?? []).filter((item) => item.call_id !== tool.call_id);
      return { ...message, tools: [...others, tool] };
    }
    case "tool_end": {
      const previous = message.tools?.find((item) => item.call_id === event.data.call_id);
      const tool = {
        ...previous,
        ...event.data,
        tool_name: event.data.tool_name ?? previous?.tool_name ?? "tool",
        status: event.data.status === "error" ? ("error" as const) : ("success" as const),
      };
      return {
        ...message,
        tools: [...(message.tools ?? []).filter((item) => item.call_id !== tool.call_id), tool],
      };
    }
    case "artifact_ready":
      return { ...message, artifacts: [...(message.artifacts ?? []), event.data] };
    case "error":
      return {
        ...message,
        status: "error",
        error: event.data.error || "The response could not be completed.",
      };
    case "done":
      return {
        ...message,
        content: event.data.full_text ?? message.content,
        status: message.status === "error" ? "error" : "complete",
      };
    default:
      return message;
  }
}

export function finishChatMessage(message: ChatMessageView, aborted: boolean): ChatMessageView {
  if (message.status !== "running") return message;
  return aborted
    ? { ...message, status: "cancelled" }
    : {
        ...message,
        status: "error",
        error:
          "The connection ended before the response finished. Your partial answer is still here.",
      };
}

/** Response images never initiate network requests; links accept web URLs only. */
export function safeChatLink(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

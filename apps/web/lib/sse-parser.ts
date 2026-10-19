// ==============================================================================
// PansGPT 2.0 Client-Side SSE Stream Parser (Roadmap 6B.16 & Section 9)
// ==============================================================================

export type SSEEventType =
  | "init"
  | "citations"
  | "thinking_chunk"
  | "tool_start"
  | "tool_end"
  | "artifact_ready"
  | "text_chunk"
  | "done"
  | "error";

export interface BoundingBoxCoordinates {
  page: number;
  bbox: [number, number, number, number];
  rects?: Array<[number, number, number, number]>;
}

export interface CitationItem {
  chunk_id?: string | null; // [CHAT FIX 2]
  document_id?: string | null;
  source_type?: "document" | "web";
  url?: string | null;
  title: string;
  course_code?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  snippet?: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | "WEB_FALLBACK" | string;
  bounding_box?: BoundingBoxCoordinates | null;
}

export interface ToolExecutionState {
  call_id: string;
  tool_name: string;
  arguments?: Record<string, unknown>;
  status: "running" | "success" | "error";
  duration_ms?: number;
  result?: unknown;
}

export interface ArtifactItem {
  skill_name: string;
  title: string;
  file_extension?: string;
  storage_key?: string;
  download_url?: string;
  content?: Record<string, unknown>;
}

// [CHAT FIX 2] Keep payload types paired with their event; no identity or `any` casts.
interface SSEEventData {
  init: { session_id?: string };
  citations: CitationItem[];
  text_chunk: { token?: string; delta?: string };
  thinking_chunk: { token?: string; delta?: string };
  tool_start: Omit<ToolExecutionState, "status">;
  tool_end: Partial<ToolExecutionState> & { call_id: string };
  artifact_ready: ArtifactItem;
  done: { full_text?: string };
  error: { error?: string; code?: string; retryable?: boolean };
}

export type SSEParsedEvent = {
  [Kind in SSEEventType]: { event: Kind; data: SSEEventData[Kind] };
}[SSEEventType];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function externalSourceUrl(citation: CitationItem): string | undefined {
  if (citation.source_type !== "web" || !citation.url) return undefined;
  try {
    const url = new URL(citation.url);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function isCitation(value: unknown): value is CitationItem {
  if (!isRecord(value) || typeof value.title !== "string") return false;
  // [CHAT FIX 2] Reject malformed optional fields before they reach React.
  for (const field of ["course_code", "snippet", "confidence", "url"]) {
    if (value[field] != null && typeof value[field] !== "string") return false;
  }
  for (const field of ["page_start", "page_end"]) {
    if (
      value[field] != null &&
      (typeof value[field] !== "number" || !Number.isInteger(value[field]) || value[field] < 1)
    ) {
      return false;
    }
  }
  if (value.source_type === "web") {
    return (
      typeof value.url === "string" &&
      externalSourceUrl({ title: value.title, source_type: "web", url: value.url }) !== undefined
    );
  }
  return (
    (value.source_type === undefined || value.source_type === "document") &&
    typeof value.document_id === "string" &&
    typeof value.chunk_id === "string"
  );
}

function parseEvent(event: string, value: unknown): SSEParsedEvent | undefined {
  if (event === "citations") {
    return Array.isArray(value) ? { event, data: value.filter(isCitation) } : undefined;
  }
  if (!isRecord(value)) return undefined;
  switch (event) {
    case "init":
      return {
        event,
        data: { session_id: typeof value.session_id === "string" ? value.session_id : undefined },
      };
    case "text_chunk":
    case "thinking_chunk":
      return {
        event,
        data: {
          token: typeof value.token === "string" ? value.token : undefined,
          delta: typeof value.delta === "string" ? value.delta : undefined,
        },
      };
    case "done":
      return {
        event,
        data: { full_text: typeof value.full_text === "string" ? value.full_text : undefined },
      };
    case "error":
      return {
        event,
        data: {
          error: typeof value.error === "string" ? value.error : undefined,
          code: typeof value.code === "string" ? value.code : undefined,
          retryable: typeof value.retryable === "boolean" ? value.retryable : undefined,
        },
      };
    case "tool_start":
    case "tool_end": {
      if (typeof value.call_id !== "string") return undefined;
      const data = {
        call_id: value.call_id,
        tool_name: typeof value.tool_name === "string" ? value.tool_name : "tool",
        arguments: isRecord(value.arguments) ? value.arguments : undefined,
        status: value.status === "error" ? ("error" as const) : ("success" as const),
        duration_ms: typeof value.duration_ms === "number" ? value.duration_ms : undefined,
        result: value.result,
      };
      return event === "tool_start" ? { event, data } : { event, data };
    }
    case "artifact_ready":
      if (typeof value.skill_name !== "string") return undefined;
      return {
        event,
        data: {
          skill_name: value.skill_name,
          title: typeof value.title === "string" ? value.title : "Generated Artifact",
          file_extension:
            typeof value.file_extension === "string" ? value.file_extension : undefined,
          storage_key: typeof value.storage_key === "string" ? value.storage_key : undefined,
          download_url: typeof value.download_url === "string" ? value.download_url : undefined,
          content: isRecord(value.content) ? value.content : undefined,
        },
      };
  }
}

/**
 * Parses raw text chunks from a ReadableStream into discrete typed Server-Sent Events.
 */
export class SSEEventStreamReader {
  private buffer: string = "";

  /**
   * Pushes raw decoded chunk and returns any complete parsed SSE events.
   */
  public push(chunk: string): SSEParsedEvent[] {
    this.buffer += chunk;
    const blocks = this.buffer.split("\n\n");
    // Preserve the incomplete trailing segment in the buffer
    this.buffer = blocks.pop() || "";

    const events: SSEParsedEvent[] = [];

    for (const block of blocks) {
      if (!block.trim()) continue;

      let eventType = "text_chunk";
      let dataStr = "";

      const lines = block.split("\n");
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.replace("event:", "").trim();
        } else if (line.startsWith("data:")) {
          dataStr = line.replace("data:", "").trim();
        }
      }

      if (!dataStr) continue;

      try {
        const parsed: unknown = JSON.parse(dataStr);
        const event = parseEvent(eventType, parsed);
        if (event) events.push(event);
      } catch {
        // [CHAT FIX 2] Malformed frames cannot supply trusted event payloads.
      }
    }

    return events;
  }

  /**
   * Flushes any remaining content upon stream termination.
   */
  public flush(): SSEParsedEvent[] {
    if (!this.buffer.trim()) {
      this.buffer = "";
      return [];
    }
    const remaining = this.buffer;
    this.buffer = "";
    return this.push(remaining + "\n\n");
  }
}

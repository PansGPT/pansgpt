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
  chunk_id?: string;
  document_id?: string;
  title: string;
  course_code?: string;
  page_start?: number;
  page_end?: number;
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

export interface SSEParsedEvent {
  event: SSEEventType;
  data: Record<string, unknown> | unknown[];
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

      let eventType: SSEEventType = "text_chunk";
      let dataStr = "";

      const lines = block.split("\n");
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.replace("event:", "").trim() as SSEEventType;
        } else if (line.startsWith("data:")) {
          dataStr = line.replace("data:", "").trim();
        }
      }

      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        events.push({
          event: eventType,
          data: parsed,
        });
      } catch (err) {
        // Fallback for unescaped plain string data
        events.push({
          event: eventType,
          data: { raw: dataStr },
        });
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

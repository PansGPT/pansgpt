import type {
  ArtifactItem,
  CitationItem,
  PublicProgressUpdate,
  ToolExecutionState,
  ChatProgressCode,
} from "./chat";

/** Owned background run state; reading this never starts or repeats generation. */
export interface ChatRunSnapshot {
  run_id: string | null;
  status: "idle" | "running" | "complete" | "error" | "cancelled" | "interrupted";
  request_id?: string | null;
  user_message_id?: string | null;
  assistant_message_id?: string | null;
  content: string;
  citations: CitationItem[];
  tools: ToolExecutionState[];
  artifacts: ArtifactItem[];
  public_progress: PublicProgressUpdate[];
  error_code?: string | null;
  completion_warning?: "additional_work_incomplete" | null;
  retryable: boolean;
  tool_started: boolean;
  /** Explicit replay fence; absent on older servers, where tool_started is conservative. */
  retry_blocked?: boolean;
  activity?: ChatProgressCode | null;
  elapsed_ms?: number;
}

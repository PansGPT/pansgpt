export type SSEEventType =
  | "init"
  | "citations"
  | "thinking_chunk"
  | "public_progress"
  | "tool_start"
  | "tool_end"
  | "artifact_ready"
  | "text_chunk"
  | "done"
  | "error";

export type ChatProgressCode =
  | "reviewing_request"
  | "checking_materials"
  | "searching_sources"
  | "reading_document"
  | "analysing_image"
  | "creating_materials"
  | "using_tool"
  | "writing_response"
  | "planning_presentation"
  | "creating_presentation"
  | "presentation_ready";
// Presentation stages describe public workflow, never private provider reasoning.

/** Model-authored public copy emitted only for an activity the backend actually starts. */
export interface PublicProgressUpdate {
  code: ChatProgressCode;
  label: string;
  source: "model";
}

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
export interface SSEEventData {
  init: { session_id?: string; user_message_id?: string; assistant_message_id?: string };
  citations: CitationItem[];
  text_chunk: { token?: string; delta?: string };
  thinking_chunk: { code?: string; token?: string; delta?: string };
  public_progress: PublicProgressUpdate;
  tool_start: Omit<ToolExecutionState, "status">;
  tool_end: Partial<ToolExecutionState> & { call_id: string };
  artifact_ready: ArtifactItem;
  done: { full_text?: string };
  error: { error?: string; code?: string; retryable?: boolean };
}

export type SSEParsedEvent = {
  [Kind in SSEEventType]: { event: Kind; data: SSEEventData[Kind] };
}[SSEEventType];

/** The existing FastAPI stream request; clients never supply provider configuration. */
export interface ChatStreamRequest {
  message: string;
  parent_message_id?: string | null;
  document_id?: string | null;
  course_code?: string | null;
  enable_rag?: boolean;
  expand_full_segment?: boolean;
  enable_tools?: boolean;
  edit_message_id?: string;
  regenerate_message_id?: string;
  attachment_ids?: string[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  content_type: string;
  size: number;
}

export interface ChatBranchRequest {
  message_id: string;
}
export interface ChatFeedbackRequest {
  rating: "positive" | "negative";
  comment?: string;
}

/** Client presentation of a saved or streaming turn; not a database row. */
export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  parentId?: string | null;
  isActive?: boolean;
  attachments?: ChatAttachment[];
  feedback?: "positive" | "negative";
  isSaved?: boolean;
  /** Public allowlisted workflow labels only; never provider scratchpad text. */
  thinking?: string;
  progress?: PublicProgressUpdate[];
  citations?: CitationItem[];
  tools?: ToolExecutionState[];
  artifacts?: ArtifactItem[];
  status: "running" | "complete" | "cancelled" | "error";
  error?: string;
}

/** Owner-authorized conversation organization; mutation responses are authoritative. */
export interface ChatSessionCreateRequest {
  title?: string | null;
  document_id?: string | null;
}
export interface ChatSessionMetadata {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  archived_at: string | null;
  document_id?: string | null;
  summary?: string | null;
  created_at: string;
  updated_at: string;
  title_source: "pending" | "generated" | "manual";
  last_message_at: string | null;
}
export interface ChatSearchResult {
  session_id: string;
  title: string;
  message_id: string | null;
  snippet: string;
  is_archived: boolean;
  last_message_at: string | null;
}
export interface ChatSearchResponse {
  results: ChatSearchResult[];
  next_offset: number | null;
}
export interface DeletedChatSession extends ChatSessionMetadata {
  deleted_at: string;
}
export interface ChatTrashResponse {
  sessions: DeletedChatSession[];
  next_offset: number | null;
}
export interface ChatSessionUpdateRequest {
  title?: string;
  is_pinned?: boolean;
  archived?: boolean;
}

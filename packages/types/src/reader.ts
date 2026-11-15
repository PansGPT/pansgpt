import type { LibraryDocument } from "./library";
import type { ChatSessionMetadata } from "./chat";

export interface ReaderResponse {
  document: LibraryDocument;
  /** Reader opens a new chat; retained for compatibility and returned as null. */
  chat_session_id: string | null;
}

export interface ReaderConversationsResponse {
  sessions: ChatSessionMetadata[];
  next_offset: number | null;
}

export interface ReaderProgressRequest {
  page: number;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

/** Fractions of the unrotated displayed PDF page, independent of zoom. */
export interface ReaderRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReaderHighlightRequest {
  page_number: number;
  color: HighlightColor;
  selected_text: string;
  rects: ReaderRect[];
}

export interface ReaderHighlight extends ReaderHighlightRequest {
  id: string;
  document_id: string;
  created_at: string;
}

export interface ReaderHighlightsResponse {
  items: ReaderHighlight[];
  next_offset: number | null;
}

export interface ReaderSelection {
  page: number;
  text: string;
  rects: ReaderRect[];
}

/** Server renders this crop from the owned session's bound PDF; no image URL or key is accepted. */
export interface ReaderSnipRequest {
  document_id: string;
  page_number: number;
  rect: ReaderRect;
}

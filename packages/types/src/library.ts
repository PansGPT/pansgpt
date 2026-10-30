/** University library HTTP contracts, separate from generated database rows. */
export interface LibraryDocument {
  id: string;
  title: string;
  course_code: string;
  course_title: string;
  topic: string | null;
  lecturer_name: string | null;
  page_count: number;
  file_size_bytes: number;
  mime_type: string;
  status: "pending_review" | "active" | "rejected" | "archived";
  embedding_status: string;
  target_levels: string[];
  academic_session: string | null;
  semester: "first" | "second" | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  last_page_read: number | null;
}

export interface LibraryCourse {
  code: string;
  title: string;
  document_count: number;
}

export interface LibraryCatalogResponse {
  items: LibraryDocument[];
  total: number;
  limit: number;
  offset: number;
  courses: LibraryCourse[];
  academic_sessions: string[];
}

export interface LibraryPdfLinkResponse {
  document_id: string;
  presigned_url: string;
  expires_in_seconds: number;
}

export interface LibraryOpenedResponse {
  document_id: string;
  last_opened_at: string;
  last_page_read: number;
  total_pages: number;
}

export interface LibraryUploadRequest {
  title: string;
  course_code: string;
  course_title: string;
  target_levels: string[];
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
}

export interface LibraryUploadResponse {
  document_id: string;
  storage_key: string;
  presigned_upload_url: string;
  expires_in_seconds: number;
}

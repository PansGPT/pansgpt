// ==============================================================================
// PansGPT 2.0 Supabase Database TypeScript Definitions
// Auto-aligned with Phase 4 Migrations (27 Tables)
// ==============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UniversityLevel = "100" | "200" | "300" | "400" | "500" | "600";
export type UserRole = "student" | "lecturer" | "university_admin" | "super_admin";
export type DocumentStatus = "pending_review" | "active" | "rejected" | "archived";
export type AiProvider = "google" | "groq" | "openrouter";
export type InteractionRole = "user" | "assistant";
export type SkillType = "prompt" | "python_tool" | "api_webhook";
export type QuizJobStatus =
  "queued" | "retrieving" | "generating" | "saving" | "completed" | "failed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          slug: string;
          state: string;
          country: string;
          status: string;
          logo_url: string | null;
          primary_color: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["universities"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["universities"]["Insert"]>;
      };
      academic_terms: {
        Row: {
          id: string;
          university_id: string;
          session_name: string;
          semester: string;
          is_current: boolean;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["academic_terms"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_terms"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          university_id: string | null;
          level: UniversityLevel | null;
          faculty: string | null;
          department: string | null;
          avatar_url: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      invitations: {
        Row: {
          id: string;
          university_id: string;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invitations"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
      };
      documents: {
        Row: {
          id: string;
          university_id: string;
          uploaded_by: string | null;
          title: string;
          course_code: string;
          course_title: string;
          topic: string | null;
          lecturer_name: string | null;
          storage_key: string;
          converted_key: string | null;
          file_size_bytes: number;
          mime_type: string;
          page_count: number;
          status: DocumentStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          target_levels: UniversityLevel[];
          academic_session: string | null;
          semester: string | null;
          embedding_status: string;
          embedding_progress: number;
          total_chunks: number;
          ingestion_lock_id: string | null;
          ingestion_heartbeat: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["documents"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          content: string;
          content_fts: unknown;
          page_start: number | null;
          page_end: number | null;
          chunk_index: number;
          embedding: number[];
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["document_chunks"]["Row"],
          "id" | "content_fts" | "created_at"
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_chunks"]["Insert"]>;
      };
      document_sections: {
        Row: {
          id: string;
          document_id: string;
          section_index: number;
          title: string;
          page_start: number;
          page_end: number;
          summary: string;
          explanation: string | null;
          check_questions: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["document_sections"]["Row"],
          "id" | "created_at"
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_sections"]["Insert"]>;
      };
      document_notes: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          storage_key: string;
          ai_explanation: string | null;
          category: string | null;
          page_number: number | null;
          user_annotation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["document_notes"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_notes"]["Insert"]>;
      };
      document_highlights: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          page_number: number;
          color: string;
          selected_text: string;
          rects: Json;
          note_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["document_highlights"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_highlights"]["Insert"]>;
      };
      study_progress: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          last_page_read: number;
          completion_percentage: number;
          total_seconds_spent: number;
          last_studied_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["study_progress"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["study_progress"]["Insert"]>;
      };
      quizzes: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          title: string;
          question_count: number;
          time_limit_minutes: number | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["quizzes"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quizzes"]["Insert"]>;
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_text: string;
          question_type: string;
          options: Json | null;
          correct_answer: string;
          explanation: string;
          points: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quiz_questions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_questions"]["Insert"]>;
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          score: number;
          total_possible: number;
          time_spent_seconds: number;
          answers: Json;
          completed_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quiz_attempts"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_attempts"]["Insert"]>;
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["chat_sessions"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_sessions"]["Insert"]>;
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          parent_message_id: string | null;
          role: InteractionRole;
          content: string;
          citations: Json | null;
          tool_calls: Json | null;
          reasoning_content: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chat_messages"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
      };
      ai_skills: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          instructions: string;
          skill_type: SkillType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ai_skills"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_skills"]["Insert"]>;
      };
      timetables: {
        Row: {
          id: string;
          university_id: string;
          level: UniversityLevel;
          course_code: string;
          course_title: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          venue: string;
          lecturer_name: string | null;
          semester: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["timetables"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["timetables"]["Insert"]>;
      };
      student_tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["student_tasks"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_tasks"]["Insert"]>;
      };
      course_knowledge: {
        Row: {
          id: string;
          university_id: string;
          course_code: string;
          course_title: string;
          level: UniversityLevel;
          semester: number;
          credit_units: number;
          lecturer_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["course_knowledge"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_knowledge"]["Insert"]>;
      };
      general_notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: Json;
          course_code: string | null;
          tags: string[];
          is_pinned: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["general_notes"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["general_notes"]["Insert"]>;
      };
      system_settings: {
        Row: {
          id: number;
          system_prompt: string;
          temperature: number;
          maintenance_mode: boolean;
          web_search_enabled: boolean;
          rag_threshold: number;
          updated_at: string;
        };
        Insert: Database["public"]["Tables"]["system_settings"]["Row"];
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          target_entity: string;
          target_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
    };
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          doc_id: string;
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          page_start: number;
          page_end: number;
          chunk_index: number;
          similarity: number;
        }[];
      };
      match_documents_global: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          doc_ids: string[];
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          page_start: number;
          page_end: number;
          chunk_index: number;
          similarity: number;
        }[];
      };
      claim_document_ingestion: {
        Args: {
          doc_id: string;
          worker_id: string;
        };
        Returns: boolean;
      };
      heartbeat_document_ingestion: {
        Args: {
          doc_id: string;
          worker_id: string;
        };
        Returns: boolean;
      };
      purge_soft_deleted_records: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
  };
}

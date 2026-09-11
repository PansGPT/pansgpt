// ==============================================================================
// PansGPT 2.0 Supabase Database TypeScript Definitions
// Auto-generated & Verified against Staging Database (45 Tables)
// ==============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AiProvider = "google" | "groq" | "openrouter";
export type CreditTxType =
  | "signup_grant"
  | "monthly_grant"
  | "purchase"
  | "ai_chat"
  | "rag_search"
  | "quiz_generation"
  | "doc_export"
  | "admin_adjustment"
  | "refund";
export type DocumentStatus = "pending_review" | "active" | "rejected" | "archived";
export type FlashcardCardType = "standard" | "monograph" | "adverse_effect" | "clinical_case";
export type InteractionRole = "user" | "assistant" | "system";
export type QuizJobStatus =
  "queued" | "retrieving" | "generating" | "saving" | "completed" | "failed" | "cancelled";
export type SkillType = "prompt" | "python_tool" | "api_webhook";
export type UniversityLevel = "100" | "200" | "300" | "400" | "500" | "600";
export type UserRole = "student" | "lecturer" | "university_admin" | "super_admin";

export interface Database {
  public: {
    Tables: {
      academic_level_history: {
        Row: {
          id: string;
          user_id: string;
          academic_session: string;
          level: UniversityLevel;
          promoted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          academic_session: string;
          level: UniversityLevel;
          promoted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_level_history"]["Insert"]>;
      };
      academic_terms: {
        Row: {
          id: string;
          university_id: string;
          academic_session: string;
          semester: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          academic_session: string;
          semester: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_terms"]["Insert"]>;
      };
      ai_skills: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          instructions: string;
          parameters_schema: Json | null;
          skill_type: SkillType;
          target_levels: UniversityLevel[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          instructions: string;
          parameters_schema?: Json | null;
          skill_type?: SkillType;
          target_levels?: UniversityLevel[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_skills"]["Insert"]>;
      };
      ai_telemetry: {
        Row: {
          id: string;
          user_id: string | null;
          university_id: string | null;
          provider: AiProvider;
          model_id: string;
          request_type: string;
          prompt_tokens: number;
          completion_tokens: number;
          latency_ms: number;
          tools_invoked: string[] | null;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          university_id?: string | null;
          provider: AiProvider;
          model_id: string;
          request_type: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms?: number;
          tools_invoked?: string[] | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_telemetry"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          actor_email: string | null;
          actor_role: string | null;
          university_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          university_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          parent_message_id: string | null;
          branch_index: number;
          is_active_branch: boolean;
          role: InteractionRole;
          content: string;
          image_keys: string[] | null;
          extracted_image_text: string | null;
          image_hash: string | null;
          image_metadata: Json | null;
          tool_calls: Json | null;
          citations: Json | null;
          thinking_text: string | null;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          parent_message_id?: string | null;
          branch_index?: number;
          is_active_branch?: boolean;
          role: InteractionRole;
          content: string;
          image_keys?: string[] | null;
          extracted_image_text?: string | null;
          image_hash?: string | null;
          image_metadata?: Json | null;
          tool_calls?: Json | null;
          citations?: Json | null;
          thinking_text?: string | null;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          title: string;
          summary: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id?: string | null;
          title?: string;
          summary?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_sessions"]["Insert"]>;
      };
      course_knowledge: {
        Row: {
          id: string;
          university_id: string;
          level: UniversityLevel;
          course_code: string | null;
          knowledge_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          level: UniversityLevel;
          course_code?: string | null;
          knowledge_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_knowledge"]["Insert"]>;
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          tx_type: CreditTxType;
          reference_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          tx_type: CreditTxType;
          reference_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credit_ledger"]["Insert"]>;
      };
      credit_pricing: {
        Row: {
          action_key: string;
          credit_cost: number;
          description: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          action_key: string;
          credit_cost?: number;
          description: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credit_pricing"]["Insert"]>;
      };
      credit_purchases: {
        Row: {
          id: string;
          user_id: string;
          package_key: string;
          credits_amount: number;
          amount_kobo: number;
          currency: string;
          payment_provider: string;
          transaction_ref: string;
          status: string;
          metadata: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_key: string;
          credits_amount: number;
          amount_kobo: number;
          currency?: string;
          payment_provider: string;
          transaction_ref: string;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["credit_purchases"]["Insert"]>;
      };
      csat_survey_responses: {
        Row: {
          id: string;
          user_id: string;
          rating: number;
          feedback: string | null;
          feature_area: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rating: number;
          feedback?: string | null;
          feature_area: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["csat_survey_responses"]["Insert"]>;
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          content: string;
          content_fts: unknown | null;
          page_start: number | null;
          page_end: number | null;
          chunk_index: number;
          embedding: number[];
          created_at: string;
          segment_id: string | null;
          element_id: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          content: string;
          content_fts?: unknown | null;
          page_start?: number | null;
          page_end?: number | null;
          chunk_index: number;
          embedding: number[];
          created_at?: string;
          segment_id?: string | null;
          element_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["document_chunks"]["Insert"]>;
      };
      document_elements: {
        Row: {
          id: string;
          segment_id: string;
          document_id: string;
          page_number: number;
          content_type: string;
          extraction_method: string;
          raw_content: string;
          table_data: Json | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          segment_id: string;
          document_id: string;
          page_number: number;
          content_type: string;
          extraction_method: string;
          raw_content: string;
          table_data?: Json | null;
          order_index: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_elements"]["Insert"]>;
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
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          page_number: number;
          color?: string;
          selected_text: string;
          rects: Json;
          note_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_highlights"]["Insert"]>;
      };
      document_learn_pending_retests: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          origin_section_index: number;
          target_section_index: number;
          question: Json;
          resolved: boolean;
          resolved_correct: boolean | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          origin_section_index: number;
          target_section_index: number;
          question: Json;
          resolved?: boolean;
          resolved_correct?: boolean | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["document_learn_pending_retests"]["Insert"]>;
      };
      document_learn_progress: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          section_index: number;
          status: string;
          last_score: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          section_index: number;
          status?: string;
          last_score?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_learn_progress"]["Insert"]>;
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
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          storage_key: string;
          ai_explanation?: string | null;
          category?: string | null;
          page_number?: number | null;
          user_annotation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_notes"]["Insert"]>;
      };
      document_pages: {
        Row: {
          id: string;
          document_id: string;
          page_number: number;
          has_text_layer: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          page_number: number;
          has_text_layer?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_pages"]["Insert"]>;
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
        Insert: {
          id?: string;
          document_id: string;
          section_index: number;
          title: string;
          page_start: number;
          page_end: number;
          summary: string;
          explanation?: string | null;
          check_questions?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_sections"]["Insert"]>;
      };
      document_segments: {
        Row: {
          id: string;
          document_id: string;
          title: string;
          title_source: string;
          start_page: number;
          end_page: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          title: string;
          title_source: string;
          start_page: number;
          end_page: number;
          order_index: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_segments"]["Insert"]>;
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
        Insert: {
          id?: string;
          university_id: string;
          uploaded_by?: string | null;
          title: string;
          course_code: string;
          course_title: string;
          topic?: string | null;
          lecturer_name?: string | null;
          storage_key: string;
          converted_key?: string | null;
          file_size_bytes?: number;
          mime_type?: string;
          page_count?: number;
          status?: DocumentStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          target_levels?: UniversityLevel[];
          academic_session?: string | null;
          semester?: string | null;
          embedding_status?: string;
          embedding_progress?: number;
          total_chunks?: number;
          ingestion_lock_id?: string | null;
          ingestion_heartbeat?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      email_logs: {
        Row: {
          id: string;
          user_id: string | null;
          recipient_email: string;
          template_name: string;
          provider_message_id: string | null;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          recipient_email: string;
          template_name: string;
          provider_message_id?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_logs"]["Insert"]>;
      };
      email_suppressions: {
        Row: {
          email: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          email: string;
          reason: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_suppressions"]["Insert"]>;
      };
      exam_restrictions: {
        Row: {
          id: string;
          university_id: string;
          created_by: string;
          title: string;
          course_code: string | null;
          level: UniversityLevel;
          start_time: string;
          end_time: string;
          reason: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          created_by: string;
          title: string;
          course_code?: string | null;
          level: UniversityLevel;
          start_time: string;
          end_time: string;
          reason?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_restrictions"]["Insert"]>;
      };
      exam_timetables: {
        Row: {
          id: string;
          university_id: string;
          course_code: string;
          course_title: string;
          exam_date: string;
          start_time: string;
          end_time: string;
          venue: string;
          target_level: UniversityLevel;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          course_code: string;
          course_title: string;
          exam_date: string;
          start_time: string;
          end_time: string;
          venue: string;
          target_level: UniversityLevel;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_timetables"]["Insert"]>;
      };
      flashcards: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          section_id: string | null;
          front_content: string;
          back_content: string;
          card_type: FlashcardCardType;
          ease_factor: number;
          interval_days: number;
          repetitions: number;
          next_review_at: string;
          mastery_level: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id?: string | null;
          section_id?: string | null;
          front_content: string;
          back_content: string;
          card_type?: FlashcardCardType;
          ease_factor?: number;
          interval_days?: number;
          repetitions?: number;
          next_review_at?: string;
          mastery_level?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["flashcards"]["Insert"]>;
      };
      general_notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          is_pinned: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content?: string;
          is_pinned?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["general_notes"]["Insert"]>;
      };
      invitations: {
        Row: {
          id: string;
          token: string;
          university_id: string;
          issued_by: string;
          grant_roles: UserRole[];
          target_level: UniversityLevel | null;
          max_uses: number;
          current_uses: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token?: string;
          university_id: string;
          issued_by: string;
          grant_roles?: UserRole[];
          target_level?: UniversityLevel | null;
          max_uses?: number;
          current_uses?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          score: number;
          max_score: number;
          percentage: number;
          time_taken_sec: number | null;
          answers: Json;
          completed_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          user_id: string;
          score: number;
          max_score: number;
          percentage: number;
          time_taken_sec?: number | null;
          answers: Json;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_attempts"]["Insert"]>;
      };
      quiz_generation_jobs: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          request_payload: Json;
          status: QuizJobStatus;
          progress: number;
          current_step: string | null;
          error_message: string | null;
          quiz_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id?: string | null;
          request_payload: Json;
          status?: QuizJobStatus;
          progress?: number;
          current_step?: string | null;
          error_message?: string | null;
          quiz_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_generation_jobs"]["Insert"]>;
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_order: number;
          question_type: string;
          prompt: string;
          options: Json | null;
          correct_answer: string;
          explanation: string | null;
          points: number;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_order: number;
          question_type: string;
          prompt: string;
          options?: Json | null;
          correct_answer: string;
          explanation?: string | null;
          points?: number;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_questions"]["Insert"]>;
      };
      quizzes: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          title: string;
          course_code: string;
          course_title: string;
          level: UniversityLevel;
          difficulty: string;
          num_questions: number;
          time_limit_sec: number | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id?: string | null;
          title: string;
          course_code: string;
          course_title: string;
          level: UniversityLevel;
          difficulty?: string;
          num_questions: number;
          time_limit_sec?: number | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quizzes"]["Insert"]>;
      };
      student_tasks: {
        Row: {
          id: string;
          user_id: string;
          university_id: string;
          title: string;
          subtitle: string | null;
          course_code: string | null;
          task_type: string;
          due_date: string;
          due_time: string | null;
          is_completed: boolean;
          completed_at: string | null;
          source: string;
          linked_resource_type: string;
          linked_resource_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          university_id: string;
          title: string;
          subtitle?: string | null;
          course_code?: string | null;
          task_type?: string;
          due_date: string;
          due_time?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          source?: string;
          linked_resource_type?: string;
          linked_resource_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_tasks"]["Insert"]>;
      };
      study_progress: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          last_page_read: number;
          total_pages: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          last_page_read?: number;
          total_pages?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["study_progress"]["Insert"]>;
      };
      support_ticket_replies: {
        Row: {
          id: string;
          ticket_id: string;
          sender_id: string;
          message: string;
          is_internal_note: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender_id: string;
          message: string;
          is_internal_note?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["support_ticket_replies"]["Insert"]>;
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          category: string;
          status: string;
          priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          category: string;
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["support_tickets"]["Insert"]>;
      };
      system_settings: {
        Row: {
          id: number;
          system_prompt: string;
          temperature: number;
          maintenance_mode: boolean;
          web_search_enabled: boolean;
          rag_threshold: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          system_prompt: string;
          temperature?: number;
          maintenance_mode?: boolean;
          web_search_enabled?: boolean;
          rag_threshold?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Insert"]>;
      };
      system_settings_history: {
        Row: {
          id: string;
          system_prompt: string | null;
          temperature: number | null;
          maintenance_mode: boolean | null;
          web_search_enabled: boolean | null;
          rag_threshold: number | null;
          changed_by: string | null;
          change_reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          system_prompt?: string | null;
          temperature?: number | null;
          maintenance_mode?: boolean | null;
          web_search_enabled?: boolean | null;
          rag_threshold?: number | null;
          changed_by?: string | null;
          change_reason: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_settings_history"]["Insert"]>;
      };
      timetables: {
        Row: {
          id: string;
          university_id: string;
          level: UniversityLevel;
          day: string;
          time_slot: string;
          start_time: string | null;
          course_code: string;
          course_title: string;
          venue: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          level: UniversityLevel;
          day: string;
          time_slot: string;
          start_time?: string | null;
          course_code: string;
          course_title: string;
          venue?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["timetables"]["Insert"]>;
      };
      universities: {
        Row: {
          id: string;
          name: string;
          short_name: string | null;
          slug: string;
          country: string;
          state: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string | null;
          slug: string;
          country?: string;
          state?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["universities"]["Insert"]>;
      };
      user_credits: {
        Row: {
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          last_grant_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          last_grant_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_credits"]["Insert"]>;
      };
      user_email_preferences: {
        Row: {
          user_id: string;
          marketing: boolean;
          weekly_digest: boolean;
          academic_alerts: boolean;
          quiz_reminders: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          marketing?: boolean;
          weekly_digest?: boolean;
          academic_alerts?: boolean;
          quiz_reminders?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_email_preferences"]["Insert"]>;
      };
      user_preferences: {
        Row: {
          user_id: string;
          theme: string;
          default_ai_model: string;
          font_size: string;
          email_notifications: boolean;
          push_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          default_ai_model?: string;
          font_size?: string;
          email_notifications?: boolean;
          push_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string | null;
          avatar_key: string | null;
          university_id: string | null;
          current_level: UniversityLevel | null;
          roles: UserRole[];
          subscription_tier: string;
          terms_accepted_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name?: string | null;
          avatar_key?: string | null;
          university_id?: string | null;
          current_level?: UniversityLevel | null;
          roles?: UserRole[];
          subscription_tier?: string;
          terms_accepted_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
    };
    Functions: {
      match_documents_hybrid: {
        Args: {
          query_embedding: number[];
          query_text: string;
          p_university_id: string;
          match_count?: number;
          rrf_k?: number;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          document_title: string;
          course_code: string;
          content: string;
          page_start: number | null;
          page_end: number | null;
          chunk_index: number;
          combined_score: number;
        }[];
      };
      deduct_user_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_tx_type: CreditTxType;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: boolean;
      };
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
          page_start: number | null;
          page_end: number | null;
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
          page_start: number | null;
          page_end: number | null;
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

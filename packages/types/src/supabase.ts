export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      quiz_result_shares: {
        Row: {
          created_at: string;
          id: string;
          result_id: string;
          revoked_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          result_id: string;
          revoked_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          result_id?: string;
          revoked_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_result_shares_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_result_shares_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_sessions: {
        Row: {
          answers: Json;
          deadline_at: string | null;
          flagged_ids: string[];
          grading_lease: string | null;
          grading_until: string | null;
          id: string;
          quiz_id: string;
          result_id: string | null;
          revision: number;
          started_at: string;
          status: string;
          submitted_at: string | null;
          university_id: string;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          deadline_at?: string | null;
          flagged_ids?: string[];
          grading_lease?: string | null;
          grading_until?: string | null;
          id?: string;
          quiz_id: string;
          result_id?: string | null;
          revision?: number;
          started_at?: string;
          status?: string;
          submitted_at?: string | null;
          university_id: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          deadline_at?: string | null;
          flagged_ids?: string[];
          grading_lease?: string | null;
          grading_until?: string | null;
          id?: string;
          quiz_id?: string;
          result_id?: string | null;
          revision?: number;
          started_at?: string;
          status?: string;
          submitted_at?: string | null;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_sessions_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_sessions_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_message_feedback: {
        Row: {
          comment: string | null;
          id: string;
          message_id: string;
          rating: string;
          session_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          id?: string;
          message_id: string;
          rating: string;
          session_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          id?: string;
          message_id?: string;
          rating?: string;
          session_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_message_feedback_message_id_session_id_fkey";
            columns: ["message_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id", "session_id"];
          },
          {
            foreignKeyName: "chat_message_feedback_session_id_user_id_fkey";
            columns: ["session_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      chat_attachments: {
        Row: {
          byte_size: number;
          content_type: string;
          created_at: string;
          extracted_text: string;
          filename: string;
          id: string;
          message_id: string | null;
          object_key: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          byte_size: number;
          content_type: string;
          created_at?: string;
          extracted_text: string;
          filename: string;
          id?: string;
          message_id?: string | null;
          object_key: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          byte_size?: number;
          content_type?: string;
          created_at?: string;
          extracted_text?: string;
          filename?: string;
          id?: string;
          message_id?: string | null;
          object_key?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_session_id_fkey";
            columns: ["message_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id", "session_id"];
          },
          {
            foreignKeyName: "chat_attachments_session_id_user_id_fkey";
            columns: ["session_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      academic_level_history: {
        Row: {
          academic_session: string;
          id: string;
          level: Database["public"]["Enums"]["university_level"];
          promoted_at: string;
          user_id: string;
        };
        Insert: {
          academic_session: string;
          id?: string;
          level: Database["public"]["Enums"]["university_level"];
          promoted_at?: string;
          user_id: string;
        };
        Update: {
          academic_session?: string;
          id?: string;
          level?: Database["public"]["Enums"]["university_level"];
          promoted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_level_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_terms: {
        Row: {
          academic_session: string;
          id: string;
          semester: string;
          university_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          academic_session: string;
          id?: string;
          semester: string;
          university_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          academic_session?: string;
          id?: string;
          semester?: string;
          university_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_terms_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: true;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_skills: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          instructions: string;
          is_active: boolean;
          name: string;
          parameters_schema: Json | null;
          skill_type: Database["public"]["Enums"]["skill_type"];
          slug: string;
          target_levels: Database["public"]["Enums"]["university_level"][] | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          instructions: string;
          is_active?: boolean;
          name: string;
          parameters_schema?: Json | null;
          skill_type?: Database["public"]["Enums"]["skill_type"];
          slug: string;
          target_levels?: Database["public"]["Enums"]["university_level"][] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          instructions?: string;
          is_active?: boolean;
          name?: string;
          parameters_schema?: Json | null;
          skill_type?: Database["public"]["Enums"]["skill_type"];
          slug?: string;
          target_levels?: Database["public"]["Enums"]["university_level"][] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_telemetry: {
        Row: {
          completion_tokens: number;
          created_at: string;
          error_message: string | null;
          id: string;
          latency_ms: number;
          model_id: string;
          prompt_tokens: number;
          provider: Database["public"]["Enums"]["ai_provider"];
          request_type: string;
          status: string;
          tools_invoked: string[] | null;
          university_id: string | null;
          usage_source: string;
          user_id: string | null;
        };
        Insert: {
          completion_tokens?: number;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          latency_ms?: number;
          model_id: string;
          prompt_tokens?: number;
          provider: Database["public"]["Enums"]["ai_provider"];
          request_type: string;
          status?: string;
          tools_invoked?: string[] | null;
          university_id?: string | null;
          usage_source?: string;
          user_id?: string | null;
        };
        Update: {
          completion_tokens?: number;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          latency_ms?: number;
          model_id?: string;
          prompt_tokens?: number;
          provider?: Database["public"]["Enums"]["ai_provider"];
          request_type?: string;
          status?: string;
          tools_invoked?: string[] | null;
          university_id?: string | null;
          usage_source?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_telemetry_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_telemetry_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_role: string | null;
          actor_user_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          target_id: string | null;
          target_type: string;
          university_id: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_role?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type: string;
          university_id?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_role?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type?: string;
          university_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      background_jobs: {
        Row: {
          created_at: string;
          dispatched_at: string | null;
          document_id: string;
          id: string;
          job_name: string;
          status: string;
          storage_key: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dispatched_at?: string | null;
          document_id: string;
          id?: string;
          job_name: string;
          status?: string;
          storage_key: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dispatched_at?: string | null;
          document_id?: string;
          id?: string;
          job_name?: string;
          status?: string;
          storage_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "background_jobs_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          branch_index: number;
          citations: Json | null;
          content: string;
          created_at: string;
          edited_at: string | null;
          extracted_image_text: string | null;
          id: string;
          image_hash: string | null;
          image_keys: string[] | null;
          image_metadata: Json | null;
          is_active_branch: boolean;
          parent_message_id: string | null;
          role: Database["public"]["Enums"]["interaction_role"];
          search_vector: unknown | null;
          session_id: string;
          thinking_text: string | null;
          tool_calls: Json | null;
        };
        Insert: {
          branch_index?: number;
          citations?: Json | null;
          content: string;
          created_at?: string;
          edited_at?: string | null;
          extracted_image_text?: string | null;
          id?: string;
          image_hash?: string | null;
          image_keys?: string[] | null;
          image_metadata?: Json | null;
          is_active_branch?: boolean;
          parent_message_id?: string | null;
          role: Database["public"]["Enums"]["interaction_role"];
          search_vector?: never;
          session_id: string;
          thinking_text?: string | null;
          tool_calls?: Json | null;
        };
        Update: {
          branch_index?: number;
          citations?: Json | null;
          content?: string;
          created_at?: string;
          edited_at?: string | null;
          extracted_image_text?: string | null;
          id?: string;
          image_hash?: string | null;
          image_keys?: string[] | null;
          image_metadata?: Json | null;
          is_active_branch?: boolean;
          parent_message_id?: string | null;
          role?: Database["public"]["Enums"]["interaction_role"];
          search_vector?: never;
          session_id?: string;
          thinking_text?: string | null;
          tool_calls?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey";
            columns: ["parent_message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_parent_same_session";
            columns: ["parent_message_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id", "session_id"];
          },
        ];
      };
      chat_sessions: {
        Row: {
          active_run_id: string | null;
          active_run_started_at: string | null;
          archived_at: string | null;
          created_at: string;
          deleted_at: string | null;
          document_id: string | null;
          id: string;
          is_pinned: boolean;
          last_message_at: string | null;
          search_vector: unknown | null;
          summary: string | null;
          title: string;
          title_source: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_run_id?: string | null;
          active_run_started_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          document_id?: string | null;
          id?: string;
          is_pinned?: boolean;
          last_message_at?: string | null;
          search_vector?: never;
          summary?: string | null;
          title?: string;
          title_source?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_run_id?: string | null;
          active_run_started_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          document_id?: string | null;
          id?: string;
          is_pinned?: boolean;
          last_message_at?: string | null;
          search_vector?: never;
          summary?: string | null;
          title?: string;
          title_source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      course_knowledge: {
        Row: {
          course_code: string | null;
          created_at: string;
          id: string;
          knowledge_text: string;
          level: Database["public"]["Enums"]["university_level"];
          university_id: string;
          updated_at: string;
        };
        Insert: {
          course_code?: string | null;
          created_at?: string;
          id?: string;
          knowledge_text: string;
          level: Database["public"]["Enums"]["university_level"];
          university_id: string;
          updated_at?: string;
        };
        Update: {
          course_code?: string | null;
          created_at?: string;
          id?: string;
          knowledge_text?: string;
          level?: Database["public"]["Enums"]["university_level"];
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_knowledge_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_ledger: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          metadata: Json | null;
          reference_id: string | null;
          tx_type: Database["public"]["Enums"]["credit_tx_type"];
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          reference_id?: string | null;
          tx_type: Database["public"]["Enums"]["credit_tx_type"];
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          reference_id?: string | null;
          tx_type?: Database["public"]["Enums"]["credit_tx_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
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
        Update: {
          action_key?: string;
          credit_cost?: number;
          description?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_purchases: {
        Row: {
          amount_kobo: number;
          completed_at: string | null;
          created_at: string;
          credits_amount: number;
          currency: string;
          id: string;
          metadata: Json | null;
          package_key: string;
          payment_provider: string;
          status: string;
          transaction_ref: string;
          user_id: string;
        };
        Insert: {
          amount_kobo: number;
          completed_at?: string | null;
          created_at?: string;
          credits_amount: number;
          currency?: string;
          id?: string;
          metadata?: Json | null;
          package_key: string;
          payment_provider: string;
          status?: string;
          transaction_ref: string;
          user_id: string;
        };
        Update: {
          amount_kobo?: number;
          completed_at?: string | null;
          created_at?: string;
          credits_amount?: number;
          currency?: string;
          id?: string;
          metadata?: Json | null;
          package_key?: string;
          payment_provider?: string;
          status?: string;
          transaction_ref?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      csat_survey_responses: {
        Row: {
          created_at: string;
          feature_area: string;
          feedback: string | null;
          id: string;
          rating: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feature_area: string;
          feedback?: string | null;
          id?: string;
          rating: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feature_area?: string;
          feedback?: string | null;
          id?: string;
          rating?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "csat_survey_responses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          bounding_box: Json | null;
          chunk_index: number;
          content: string;
          content_fts: unknown;
          created_at: string;
          document_id: string;
          element_id: string | null;
          embedding: string;
          id: string;
          page_end: number | null;
          page_start: number | null;
          segment_id: string | null;
        };
        Insert: {
          bounding_box?: Json | null;
          chunk_index: number;
          content: string;
          content_fts?: unknown;
          created_at?: string;
          document_id: string;
          element_id?: string | null;
          embedding: string;
          id?: string;
          page_end?: number | null;
          page_start?: number | null;
          segment_id?: string | null;
        };
        Update: {
          bounding_box?: Json | null;
          chunk_index?: number;
          content?: string;
          content_fts?: unknown;
          created_at?: string;
          document_id?: string;
          element_id?: string | null;
          embedding?: string;
          id?: string;
          page_end?: number | null;
          page_start?: number | null;
          segment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_chunks_element_id_fkey";
            columns: ["element_id"];
            isOneToOne: false;
            referencedRelation: "document_elements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_chunks_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "document_segments";
            referencedColumns: ["id"];
          },
        ];
      };
      document_elements: {
        Row: {
          bounding_box: Json | null;
          content_type: string;
          created_at: string;
          document_id: string;
          extraction_method: string;
          id: string;
          order_index: number;
          page_number: number;
          raw_content: string;
          segment_id: string;
          table_data: Json | null;
        };
        Insert: {
          bounding_box?: Json | null;
          content_type: string;
          created_at?: string;
          document_id: string;
          extraction_method: string;
          id?: string;
          order_index: number;
          page_number: number;
          raw_content: string;
          segment_id: string;
          table_data?: Json | null;
        };
        Update: {
          bounding_box?: Json | null;
          content_type?: string;
          created_at?: string;
          document_id?: string;
          extraction_method?: string;
          id?: string;
          order_index?: number;
          page_number?: number;
          raw_content?: string;
          segment_id?: string;
          table_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_elements_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_elements_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "document_segments";
            referencedColumns: ["id"];
          },
        ];
      };
      document_highlights: {
        Row: {
          color: string;
          created_at: string;
          document_id: string;
          id: string;
          note_text: string | null;
          page_number: number;
          rects: Json;
          selected_text: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          document_id: string;
          id?: string;
          note_text?: string | null;
          page_number: number;
          rects: Json;
          selected_text: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          note_text?: string | null;
          page_number?: number;
          rects?: Json;
          selected_text?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_highlights_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_highlights_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_images: {
        Row: {
          attempts: number;
          content_hash: string;
          created_at: string;
          description: string | null;
          document_id: string;
          element_id: string | null;
          height: number | null;
          id: string;
          last_error: string | null;
          page_number: number;
          route: string | null;
          source: string;
          status: string;
          updated_at: string;
          width: number | null;
        };
        Insert: {
          attempts?: number;
          content_hash: string;
          created_at?: string;
          description?: string | null;
          document_id: string;
          element_id?: string | null;
          height?: number | null;
          id?: string;
          last_error?: string | null;
          page_number: number;
          route?: string | null;
          source: string;
          status?: string;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          attempts?: number;
          content_hash?: string;
          created_at?: string;
          description?: string | null;
          document_id?: string;
          element_id?: string | null;
          height?: number | null;
          id?: string;
          last_error?: string | null;
          page_number?: number;
          route?: string | null;
          source?: string;
          status?: string;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_images_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      document_learn_pending_retests: {
        Row: {
          created_at: string;
          document_id: string;
          id: string;
          origin_section_index: number;
          question: Json;
          resolved: boolean;
          resolved_at: string | null;
          resolved_correct: boolean | null;
          target_section_index: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          id?: string;
          origin_section_index: number;
          question: Json;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_correct?: boolean | null;
          target_section_index: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          id?: string;
          origin_section_index?: number;
          question?: Json;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_correct?: boolean | null;
          target_section_index?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_learn_pending_retests_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_learn_pending_retests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_learn_progress: {
        Row: {
          document_id: string;
          id: string;
          last_score: number | null;
          section_index: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          document_id: string;
          id?: string;
          last_score?: number | null;
          section_index: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          document_id?: string;
          id?: string;
          last_score?: number | null;
          section_index?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_learn_progress_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_learn_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_notes: {
        Row: {
          ai_explanation: string | null;
          category: string | null;
          created_at: string;
          document_id: string;
          id: string;
          page_number: number | null;
          storage_key: string;
          updated_at: string;
          user_annotation: string | null;
          user_id: string;
        };
        Insert: {
          ai_explanation?: string | null;
          category?: string | null;
          created_at?: string;
          document_id: string;
          id?: string;
          page_number?: number | null;
          storage_key: string;
          updated_at?: string;
          user_annotation?: string | null;
          user_id: string;
        };
        Update: {
          ai_explanation?: string | null;
          category?: string | null;
          created_at?: string;
          document_id?: string;
          id?: string;
          page_number?: number | null;
          storage_key?: string;
          updated_at?: string;
          user_annotation?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_notes_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_pages: {
        Row: {
          created_at: string;
          document_id: string;
          has_text_layer: boolean;
          id: string;
          page_number: number;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          has_text_layer?: boolean;
          id?: string;
          page_number: number;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          has_text_layer?: boolean;
          id?: string;
          page_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      document_sections: {
        Row: {
          check_questions: Json | null;
          created_at: string;
          document_id: string;
          explanation: string | null;
          id: string;
          page_end: number;
          page_start: number;
          section_index: number;
          summary: string;
          title: string;
        };
        Insert: {
          check_questions?: Json | null;
          created_at?: string;
          document_id: string;
          explanation?: string | null;
          id?: string;
          page_end: number;
          page_start: number;
          section_index: number;
          summary: string;
          title: string;
        };
        Update: {
          check_questions?: Json | null;
          created_at?: string;
          document_id?: string;
          explanation?: string | null;
          id?: string;
          page_end?: number;
          page_start?: number;
          section_index?: number;
          summary?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_sections_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      document_segments: {
        Row: {
          created_at: string;
          document_id: string;
          end_page: number;
          id: string;
          order_index: number;
          start_page: number;
          title: string;
          title_source: string;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          end_page: number;
          id?: string;
          order_index: number;
          start_page: number;
          title: string;
          title_source: string;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          end_page?: number;
          id?: string;
          order_index?: number;
          start_page?: number;
          title?: string;
          title_source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_segments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          academic_session: string | null;
          converted_key: string | null;
          course_code: string;
          course_title: string;
          created_at: string;
          deleted_at: string | null;
          embedding_progress: number;
          embedding_status: string;
          file_size_bytes: number;
          id: string;
          ingestion_heartbeat: string | null;
          ingestion_lock_id: string | null;
          lecturer_name: string | null;
          mime_type: string;
          page_count: number;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          semester: string | null;
          status: Database["public"]["Enums"]["document_status"];
          storage_key: string;
          target_levels: Database["public"]["Enums"]["university_level"][];
          title: string;
          topic: string | null;
          total_chunks: number;
          university_id: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          academic_session?: string | null;
          converted_key?: string | null;
          course_code: string;
          course_title: string;
          created_at?: string;
          deleted_at?: string | null;
          embedding_progress?: number;
          embedding_status?: string;
          file_size_bytes?: number;
          id?: string;
          ingestion_heartbeat?: string | null;
          ingestion_lock_id?: string | null;
          lecturer_name?: string | null;
          mime_type?: string;
          page_count?: number;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          semester?: string | null;
          status?: Database["public"]["Enums"]["document_status"];
          storage_key: string;
          target_levels?: Database["public"]["Enums"]["university_level"][];
          title: string;
          topic?: string | null;
          total_chunks?: number;
          university_id: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          academic_session?: string | null;
          converted_key?: string | null;
          course_code?: string;
          course_title?: string;
          created_at?: string;
          deleted_at?: string | null;
          embedding_progress?: number;
          embedding_status?: string;
          file_size_bytes?: number;
          id?: string;
          ingestion_heartbeat?: string | null;
          ingestion_lock_id?: string | null;
          lecturer_name?: string | null;
          mime_type?: string;
          page_count?: number;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          semester?: string | null;
          status?: Database["public"]["Enums"]["document_status"];
          storage_key?: string;
          target_levels?: Database["public"]["Enums"]["university_level"][];
          title?: string;
          topic?: string | null;
          total_chunks?: number;
          university_id?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          provider_message_id: string | null;
          recipient_email: string;
          status: string;
          template_name: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          provider_message_id?: string | null;
          recipient_email: string;
          status?: string;
          template_name: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          provider_message_id?: string | null;
          recipient_email?: string;
          status?: string;
          template_name?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_suppressions: {
        Row: {
          created_at: string;
          email: string;
          reason: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          reason?: string;
        };
        Relationships: [];
      };
      exam_restrictions: {
        Row: {
          course_code: string | null;
          created_at: string;
          created_by: string | null;
          end_time: string;
          id: string;
          level: Database["public"]["Enums"]["university_level"];
          reason: string | null;
          start_time: string;
          status: string;
          title: string;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          course_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          end_time: string;
          id?: string;
          level: Database["public"]["Enums"]["university_level"];
          reason?: string | null;
          start_time: string;
          status?: string;
          title: string;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          course_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          end_time?: string;
          id?: string;
          level?: Database["public"]["Enums"]["university_level"];
          reason?: string | null;
          start_time?: string;
          status?: string;
          title?: string;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_restrictions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_restrictions_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_timetables: {
        Row: {
          course_code: string;
          course_title: string;
          created_at: string;
          end_time: string;
          exam_date: string;
          id: string;
          start_time: string;
          target_level: Database["public"]["Enums"]["university_level"];
          university_id: string;
          updated_at: string;
          venue: string;
        };
        Insert: {
          course_code: string;
          course_title: string;
          created_at?: string;
          end_time: string;
          exam_date: string;
          id?: string;
          start_time: string;
          target_level: Database["public"]["Enums"]["university_level"];
          university_id: string;
          updated_at?: string;
          venue: string;
        };
        Update: {
          course_code?: string;
          course_title?: string;
          created_at?: string;
          end_time?: string;
          exam_date?: string;
          id?: string;
          start_time?: string;
          target_level?: Database["public"]["Enums"]["university_level"];
          university_id?: string;
          updated_at?: string;
          venue?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_timetables_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcards: {
        Row: {
          back_content: string;
          card_type: Database["public"]["Enums"]["flashcard_card_type"];
          created_at: string;
          deleted_at: string | null;
          document_id: string | null;
          ease_factor: number;
          front_content: string;
          id: string;
          interval_days: number;
          mastery_level: number;
          next_review_at: string;
          repetitions: number;
          section_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          back_content: string;
          card_type?: Database["public"]["Enums"]["flashcard_card_type"];
          created_at?: string;
          deleted_at?: string | null;
          document_id?: string | null;
          ease_factor?: number;
          front_content: string;
          id?: string;
          interval_days?: number;
          mastery_level?: number;
          next_review_at?: string;
          repetitions?: number;
          section_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          back_content?: string;
          card_type?: Database["public"]["Enums"]["flashcard_card_type"];
          created_at?: string;
          deleted_at?: string | null;
          document_id?: string | null;
          ease_factor?: number;
          front_content?: string;
          id?: string;
          interval_days?: number;
          mastery_level?: number;
          next_review_at?: string;
          repetitions?: number;
          section_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flashcards_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "document_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flashcards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      general_notes: {
        Row: {
          content: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_pinned: boolean;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "general_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invitation_redemptions: {
        Row: {
          created_at: string;
          id: string;
          invitation_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invitation_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invitation_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitation_redemptions_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitation_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          created_at: string;
          current_uses: number;
          expires_at: string | null;
          grant_roles: Database["public"]["Enums"]["user_role"][];
          id: string;
          is_active: boolean;
          issued_by: string | null;
          max_uses: number;
          target_level: Database["public"]["Enums"]["university_level"] | null;
          token: string;
          university_id: string;
        };
        Insert: {
          created_at?: string;
          current_uses?: number;
          expires_at?: string | null;
          grant_roles?: Database["public"]["Enums"]["user_role"][];
          id?: string;
          is_active?: boolean;
          issued_by?: string | null;
          max_uses?: number;
          target_level?: Database["public"]["Enums"]["university_level"] | null;
          token?: string;
          university_id: string;
        };
        Update: {
          created_at?: string;
          current_uses?: number;
          expires_at?: string | null;
          grant_roles?: Database["public"]["Enums"]["user_role"][];
          id?: string;
          is_active?: boolean;
          issued_by?: string | null;
          max_uses?: number;
          target_level?: Database["public"]["Enums"]["university_level"] | null;
          token?: string;
          university_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          completed_at: string;
          feedback: Json;
          id: string;
          max_score: number;
          percentage: number;
          quiz_id: string;
          score: number;
          session_id: string | null;
          time_taken_sec: number | null;
          user_id: string;
        };
        Insert: {
          answers: Json;
          completed_at?: string;
          feedback?: Json;
          id?: string;
          max_score: number;
          percentage: number;
          quiz_id: string;
          score: number;
          session_id?: string | null;
          time_taken_sec?: number | null;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string;
          feedback?: Json;
          id?: string;
          max_score?: number;
          percentage?: number;
          quiz_id?: string;
          score?: number;
          session_id?: string | null;
          time_taken_sec?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "quiz_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_generation_jobs: {
        Row: {
          attempts: number;
          completed_at: string | null;
          created_at: string;
          current_step: string | null;
          document_id: string | null;
          error_message: string | null;
          id: string;
          lease_id: string | null;
          lease_until: string | null;
          progress: number;
          quiz_id: string | null;
          request_key: string | null;
          request_payload: Json;
          status: Database["public"]["Enums"]["quiz_job_status"];
          university_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          document_id?: string | null;
          error_message?: string | null;
          id?: string;
          lease_id?: string | null;
          lease_until?: string | null;
          progress?: number;
          quiz_id?: string | null;
          request_key?: string | null;
          request_payload: Json;
          status?: Database["public"]["Enums"]["quiz_job_status"];
          university_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          document_id?: string | null;
          error_message?: string | null;
          id?: string;
          lease_id?: string | null;
          lease_until?: string | null;
          progress?: number;
          quiz_id?: string | null;
          request_key?: string | null;
          request_payload?: Json;
          status?: Database["public"]["Enums"]["quiz_job_status"];
          university_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_generation_jobs_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_generation_jobs_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_generation_jobs_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_generation_jobs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          answer_key: Json;
          concept: string;
          correct_answer: string;
          explanation: string | null;
          id: string;
          options: Json | null;
          points: number;
          prompt: string;
          question_order: number;
          question_type: string;
          quiz_id: string;
          sources: Json;
        };
        Insert: {
          answer_key?: Json;
          concept?: string;
          correct_answer: string;
          explanation?: string | null;
          id?: string;
          options?: Json | null;
          points?: number;
          prompt: string;
          question_order: number;
          question_type: string;
          quiz_id: string;
          sources?: Json;
        };
        Update: {
          answer_key?: Json;
          concept?: string;
          correct_answer?: string;
          explanation?: string | null;
          id?: string;
          options?: Json | null;
          points?: number;
          prompt?: string;
          question_order?: number;
          question_type?: string;
          quiz_id?: string;
          sources?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          course_code: string;
          course_title: string;
          created_at: string;
          deleted_at: string | null;
          difficulty: string;
          document_id: string | null;
          id: string;
          level: Database["public"]["Enums"]["university_level"];
          num_questions: number;
          question_format: string;
          time_limit_sec: number | null;
          title: string;
          topic: string;
          university_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          course_code: string;
          course_title: string;
          created_at?: string;
          deleted_at?: string | null;
          difficulty?: string;
          document_id?: string | null;
          id?: string;
          level: Database["public"]["Enums"]["university_level"];
          num_questions: number;
          question_format?: string;
          time_limit_sec?: number | null;
          title: string;
          topic?: string;
          university_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          course_code?: string;
          course_title?: string;
          created_at?: string;
          deleted_at?: string | null;
          difficulty?: string;
          document_id?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["university_level"];
          num_questions?: number;
          question_format?: string;
          time_limit_sec?: number | null;
          title?: string;
          topic?: string;
          university_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      storage_cleanup_jobs: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          is_prefix: boolean;
          object_key: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          is_prefix?: boolean;
          object_key: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          is_prefix?: boolean;
          object_key?: string;
        };
        Relationships: [];
      };
      student_tasks: {
        Row: {
          completed_at: string | null;
          course_code: string | null;
          created_at: string;
          due_date: string;
          due_time: string | null;
          id: string;
          is_completed: boolean;
          linked_resource_id: string | null;
          linked_resource_type: string;
          source: string;
          subtitle: string | null;
          task_type: string;
          title: string;
          university_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_code?: string | null;
          created_at?: string;
          due_date: string;
          due_time?: string | null;
          id?: string;
          is_completed?: boolean;
          linked_resource_id?: string | null;
          linked_resource_type?: string;
          source?: string;
          subtitle?: string | null;
          task_type?: string;
          title: string;
          university_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_code?: string | null;
          created_at?: string;
          due_date?: string;
          due_time?: string | null;
          id?: string;
          is_completed?: boolean;
          linked_resource_id?: string | null;
          linked_resource_type?: string;
          source?: string;
          subtitle?: string | null;
          task_type?: string;
          title?: string;
          university_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_tasks_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      study_progress: {
        Row: {
          document_id: string;
          id: string;
          last_page_read: number;
          total_pages: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          document_id: string;
          id?: string;
          last_page_read?: number;
          total_pages?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          document_id?: string;
          id?: string;
          last_page_read?: number;
          total_pages?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_progress_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      support_ticket_replies: {
        Row: {
          created_at: string;
          id: string;
          is_internal_note: boolean;
          message: string;
          sender_id: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_internal_note?: boolean;
          message: string;
          sender_id: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_internal_note?: boolean;
          message?: string;
          sender_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          priority: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          id: number;
          maintenance_mode: boolean;
          rag_threshold: number;
          system_prompt: string;
          temperature: number;
          updated_at: string;
          updated_by: string | null;
          web_search_enabled: boolean;
        };
        Insert: {
          id?: number;
          maintenance_mode?: boolean;
          rag_threshold?: number;
          system_prompt: string;
          temperature?: number;
          updated_at?: string;
          updated_by?: string | null;
          web_search_enabled?: boolean;
        };
        Update: {
          id?: number;
          maintenance_mode?: boolean;
          rag_threshold?: number;
          system_prompt?: string;
          temperature?: number;
          updated_at?: string;
          updated_by?: string | null;
          web_search_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings_history: {
        Row: {
          change_reason: string;
          changed_by: string | null;
          created_at: string;
          id: string;
          maintenance_mode: boolean | null;
          rag_threshold: number | null;
          system_prompt: string | null;
          temperature: number | null;
          web_search_enabled: boolean | null;
        };
        Insert: {
          change_reason: string;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          maintenance_mode?: boolean | null;
          rag_threshold?: number | null;
          system_prompt?: string | null;
          temperature?: number | null;
          web_search_enabled?: boolean | null;
        };
        Update: {
          change_reason?: string;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          maintenance_mode?: boolean | null;
          rag_threshold?: number | null;
          system_prompt?: string | null;
          temperature?: number | null;
          web_search_enabled?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "system_settings_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      timetables: {
        Row: {
          course_code: string;
          course_title: string;
          created_at: string;
          day: string;
          id: string;
          level: Database["public"]["Enums"]["university_level"];
          start_time: string | null;
          time_slot: string;
          university_id: string;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          course_code: string;
          course_title: string;
          created_at?: string;
          day: string;
          id?: string;
          level: Database["public"]["Enums"]["university_level"];
          start_time?: string | null;
          time_slot: string;
          university_id: string;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          course_code?: string;
          course_title?: string;
          created_at?: string;
          day?: string;
          id?: string;
          level?: Database["public"]["Enums"]["university_level"];
          start_time?: string | null;
          time_slot?: string;
          university_id?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "timetables_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      universities: {
        Row: {
          country: string;
          created_at: string;
          id: string;
          name: string;
          short_name: string | null;
          slug: string;
          state: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          country?: string;
          created_at?: string;
          id?: string;
          name: string;
          short_name?: string | null;
          slug: string;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          country?: string;
          created_at?: string;
          id?: string;
          name?: string;
          short_name?: string | null;
          slug?: string;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_credits: {
        Row: {
          balance: number;
          created_at: string;
          last_grant_at: string;
          lifetime_earned: number;
          lifetime_spent: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          created_at?: string;
          last_grant_at?: string;
          lifetime_earned?: number;
          lifetime_spent?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          last_grant_at?: string;
          lifetime_earned?: number;
          lifetime_spent?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_email_preferences: {
        Row: {
          academic_alerts: boolean;
          created_at: string;
          marketing: boolean;
          quiz_reminders: boolean;
          updated_at: string;
          user_id: string;
          weekly_digest: boolean;
        };
        Insert: {
          academic_alerts?: boolean;
          created_at?: string;
          marketing?: boolean;
          quiz_reminders?: boolean;
          updated_at?: string;
          user_id: string;
          weekly_digest?: boolean;
        };
        Update: {
          academic_alerts?: boolean;
          created_at?: string;
          marketing?: boolean;
          quiz_reminders?: boolean;
          updated_at?: string;
          user_id?: string;
          weekly_digest?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "user_email_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          default_ai_model: string;
          email_notifications: boolean;
          font_size: string;
          push_notifications: boolean;
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          default_ai_model?: string;
          email_notifications?: boolean;
          font_size?: string;
          push_notifications?: boolean;
          theme?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          default_ai_model?: string;
          email_notifications?: boolean;
          font_size?: string;
          push_notifications?: boolean;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_key: string | null;
          created_at: string;
          current_level: Database["public"]["Enums"]["university_level"] | null;
          deleted_at: string | null;
          email: string;
          first_name: string;
          id: string;
          last_name: string | null;
          roles: Database["public"]["Enums"]["user_role"][];
          subscription_tier: string;
          terms_accepted_at: string | null;
          university_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_key?: string | null;
          created_at?: string;
          current_level?: Database["public"]["Enums"]["university_level"] | null;
          deleted_at?: string | null;
          email: string;
          first_name: string;
          id: string;
          last_name?: string | null;
          roles?: Database["public"]["Enums"]["user_role"][];
          subscription_tier?: string;
          terms_accepted_at?: string | null;
          university_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_key?: string | null;
          created_at?: string;
          current_level?: Database["public"]["Enums"]["university_level"] | null;
          deleted_at?: string | null;
          email?: string;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          roles?: Database["public"]["Enums"]["user_role"][];
          subscription_tier?: string;
          terms_accepted_at?: string | null;
          university_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      web_search_usage: {
        Row: {
          count: number;
          created_at: string;
          date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          count?: number;
          created_at?: string;
          date?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          count?: number;
          created_at?: string;
          date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "web_search_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_document_ingestion: {
        Args: { doc_id: string; worker_id: string };
        Returns: boolean;
      };
      current_user_has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] };
        Returns: boolean;
      };
      current_user_university_id: { Args: never; Returns: string };
      deduct_user_credits: {
        Args: {
          p_action_key: string;
          p_metadata?: Json;
          p_reference_id?: string;
          p_user_id: string;
        };
        Returns: number;
      };
      deduct_user_credits_internal: {
        Args: {
          p_action_key: string;
          p_metadata?: Json;
          p_reference_id?: string;
          p_user_id: string;
        };
        Returns: number;
      };
      heartbeat_document_ingestion: {
        Args: { doc_id: string; worker_id: string };
        Returns: boolean;
      };
      increment_web_search_usage: {
        Args: { p_date: string; p_user_id: string };
        Returns: number;
      };
      match_document_chunks: {
        Args: {
          doc_id: string;
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          bounding_box: Json;
          chunk_index: number;
          content: string;
          document_id: string;
          id: string;
          page_end: number;
          page_start: number;
          similarity: number;
        }[];
      };
      match_documents_global: {
        Args: {
          doc_ids: string[];
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          chunk_index: number;
          content: string;
          document_id: string;
          id: string;
          page_end: number;
          page_start: number;
          similarity: number;
        }[];
      };
      match_documents_hybrid: {
        Args: {
          filter_doc_ids?: string[];
          filter_levels?: Database["public"]["Enums"]["university_level"][];
          filter_university_id?: string;
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
          query_text: string;
        };
        Returns: {
          bounding_box: Json;
          chunk_id: string;
          chunk_index: number;
          content: string;
          content_type: string;
          dense_score: number;
          document_id: string;
          fts_score: number;
          page_end: number;
          page_start: number;
          rrf_score: number;
          section_id: string;
          segment_id: string;
          trgm_score: number;
        }[];
      };
      prepare_document_reembed: { Args: { doc_id: string }; Returns: undefined };
      purge_soft_deleted_records: { Args: never; Returns: undefined };
      reconcile_chat_credits: { Args: never; Returns: undefined };
      refund_chat_credit: {
        Args: { p_reference_id: string; p_user_id: string };
        Returns: undefined;
      };
      reserve_web_search_quota: {
        Args: { p_date: string; p_limit: number; p_user_id: string };
        Returns: number;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      uuid_generate_v7: { Args: never; Returns: string };
    };
    Enums: {
      ai_provider: "google" | "groq" | "openrouter";
      credit_tx_type:
        | "signup_grant"
        | "monthly_grant"
        | "purchase"
        | "ai_chat"
        | "rag_search"
        | "quiz_generation"
        | "doc_export"
        | "admin_adjustment"
        | "refund";
      document_status: "pending_review" | "active" | "rejected" | "archived";
      flashcard_card_type: "standard" | "monograph" | "adverse_effect" | "clinical_case";
      interaction_role: "user" | "assistant" | "system";
      quiz_job_status:
        "queued" | "retrieving" | "generating" | "saving" | "completed" | "failed" | "cancelled";
      skill_type: "prompt" | "python_tool" | "api_webhook";
      university_level: "100" | "200" | "300" | "400" | "500" | "600";
      user_role: "student" | "lecturer" | "university_admin" | "super_admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_provider: ["google", "groq", "openrouter"],
      credit_tx_type: [
        "signup_grant",
        "monthly_grant",
        "purchase",
        "ai_chat",
        "rag_search",
        "quiz_generation",
        "doc_export",
        "admin_adjustment",
        "refund",
      ],
      document_status: ["pending_review", "active", "rejected", "archived"],
      flashcard_card_type: ["standard", "monograph", "adverse_effect", "clinical_case"],
      interaction_role: ["user", "assistant", "system"],
      quiz_job_status: [
        "queued",
        "retrieving",
        "generating",
        "saving",
        "completed",
        "failed",
        "cancelled",
      ],
      skill_type: ["prompt", "python_tool", "api_webhook"],
      university_level: ["100", "200", "300", "400", "500", "600"],
      user_role: ["student", "lecturer", "university_admin", "super_admin"],
    },
  },
} as const;

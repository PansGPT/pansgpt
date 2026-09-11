-- ==============================================================================
-- Migration: 20260911010001_phase4_database_foundation_complete.sql
-- Purpose: Complete Phase 4 Database Foundation (tables, RLS policies, 
--          extensions, updated_at triggers, 3-pool hybrid search, and credit RPCs).
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE public.credit_tx_type AS ENUM (
        'signup_grant', 'monthly_grant', 'purchase', 'ai_chat', 'rag_search',
        'quiz_generation', 'doc_export', 'admin_adjustment', 'refund'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.flashcard_card_type AS ENUM (
        'standard', 'monograph', 'adverse_effect', 'clinical_case'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Missing Core Tables
-- ------------------------------------------------------------------------------

-- Flashcards
CREATE TABLE IF NOT EXISTS public.flashcards (
    id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id     uuid REFERENCES public.documents(id) ON DELETE SET NULL,
    section_id      uuid REFERENCES public.document_sections(id) ON DELETE SET NULL,
    front_content   text NOT NULL,
    back_content    text NOT NULL,
    card_type       public.flashcard_card_type NOT NULL DEFAULT 'standard',
    ease_factor     double precision NOT NULL DEFAULT 2.5,
    interval_days   integer NOT NULL DEFAULT 1,
    repetitions     integer NOT NULL DEFAULT 0,
    next_review_at  timestamptz NOT NULL DEFAULT now(),
    mastery_level   integer NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
    deleted_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_review ON public.flashcards(user_id, next_review_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_flashcards_doc ON public.flashcards(document_id);

-- User Credits (Double-Entry Balance State)
CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    balance         integer NOT NULL DEFAULT 50 CHECK (balance >= 0),
    lifetime_earned integer NOT NULL DEFAULT 50 CHECK (lifetime_earned >= 0),
    lifetime_spent  integer NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
    last_grant_at   timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Credit Ledger (Double-Entry Audit Journal)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount          integer NOT NULL,
    balance_after   integer NOT NULL CHECK (balance_after >= 0),
    tx_type         public.credit_tx_type NOT NULL,
    reference_id    text,
    metadata        jsonb DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id, created_at DESC);

-- Credit Pricing Configuration
CREATE TABLE IF NOT EXISTS public.credit_pricing (
    action_key      text PRIMARY KEY,
    credit_cost     integer NOT NULL DEFAULT 1 CHECK (credit_cost >= 0),
    description     text NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Insert Default Credit Pricing Actions
INSERT INTO public.credit_pricing (action_key, credit_cost, description, is_active)
VALUES
    ('ai_chat_turn', 1, 'Standard conversational AI query with course grounding', true),
    ('rag_search', 2, 'Deep 3-pool hybrid retrieval across multiple course monographs', true),
    ('quiz_generation_5', 3, 'Generate 5-question adaptive assessment', true),
    ('quiz_generation_10', 5, 'Generate 10-question adaptive assessment with clinical explanations', true),
    ('flashcard_generation', 2, 'AI synthesis of monograph into 10 active-recall flashcards', true),
    ('doc_export_pdf', 2, 'Compile study notes and monographs into high-resolution PDF', true)
ON CONFLICT (action_key) DO UPDATE
SET credit_cost = EXCLUDED.credit_cost,
    description = EXCLUDED.description,
    updated_at = now();

-- Credit Purchases (Paystack / Flutterwave Records)
CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    package_key         text NOT NULL,
    credits_amount      integer NOT NULL CHECK (credits_amount > 0),
    amount_kobo         integer NOT NULL CHECK (amount_kobo > 0),
    currency            text NOT NULL DEFAULT 'NGN',
    payment_provider    text NOT NULL CHECK (payment_provider IN ('paystack', 'flutterwave')),
    transaction_ref     text NOT NULL UNIQUE,
    status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    metadata            jsonb DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_ref ON public.credit_purchases(transaction_ref);

-- Exam Timetables
CREATE TABLE IF NOT EXISTS public.exam_timetables (
    id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    university_id   uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    course_code     text NOT NULL,
    course_title    text NOT NULL,
    exam_date       date NOT NULL,
    start_time      time NOT NULL,
    end_time        time NOT NULL,
    venue           text NOT NULL,
    target_level    public.university_level NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_timetables_uni_level ON public.exam_timetables(university_id, target_level, exam_date);

-- User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id             uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    theme               text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'oled_dark', 'sepia')),
    default_ai_model    text NOT NULL DEFAULT 'gemma-4-31b-it',
    font_size           text NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    email_notifications boolean NOT NULL DEFAULT true,
    push_notifications  boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Academic Level History
CREATE TABLE IF NOT EXISTS public.academic_level_history (
    id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    academic_session    text NOT NULL,
    level               public.university_level NOT NULL,
    promoted_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academic_level_history_user ON public.academic_level_history(user_id);

-- Support Tickets & Feedback
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject         text NOT NULL,
    category        text NOT NULL CHECK (category IN ('bug', 'account', 'content', 'billing', 'other')),
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority        text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
    id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    ticket_id           uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message             text NOT NULL,
    is_internal_note    boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON public.support_ticket_replies(ticket_id);

CREATE TABLE IF NOT EXISTS public.csat_survey_responses (
    id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback        text,
    feature_area    text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Email Logs & Suppressions
CREATE TABLE IF NOT EXISTS public.email_logs (
    id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id             uuid REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_email     text NOT NULL,
    template_name       text NOT NULL,
    provider_message_id text,
    status              text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
    error_message       text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_suppressions (
    email       text PRIMARY KEY,
    reason      text NOT NULL CHECK (reason IN ('bounce', 'spam_complaint', 'manual_unsubscribe')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_email_preferences (
    user_id             uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    marketing           boolean NOT NULL DEFAULT false,
    weekly_digest       boolean NOT NULL DEFAULT true,
    academic_alerts     boolean NOT NULL DEFAULT true,
    quiz_reminders      boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Trigram Index for Fast Fuzzy Search on Document Chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_trgm ON public.document_chunks USING gin (content gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 4. Attach Missing updated_at Triggers
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TRIGGER trg_study_progress_updated_at BEFORE UPDATE ON public.study_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_doc_learn_progress_updated_at BEFORE UPDATE ON public.document_learn_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_course_knowledge_updated_at BEFORE UPDATE ON public.course_knowledge FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_exam_restrictions_updated_at BEFORE UPDATE ON public.exam_restrictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_user_credits_updated_at BEFORE UPDATE ON public.user_credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_credit_pricing_updated_at BEFORE UPDATE ON public.credit_pricing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_exam_timetables_updated_at BEFORE UPDATE ON public.exam_timetables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_user_email_preferences_updated_at BEFORE UPDATE ON public.user_email_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 5. Row-Level Security (RLS) Coverage
-- ------------------------------------------------------------------------------

-- Enable RLS on all newly added tables
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_level_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Document Sections
DROP POLICY IF EXISTS sections_select ON public.document_sections;
CREATE POLICY sections_select ON public.document_sections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_sections.document_id
              AND d.deleted_at IS NULL
              AND (
                  d.university_id = public.current_user_university_id()
                  OR d.uploaded_by = auth.uid()
                  OR public.current_user_has_role('super_admin')
              )
        )
    );

-- Learn Mode Mastery & Retest Queue
DROP POLICY IF EXISTS learn_progress_owner ON public.document_learn_progress;
CREATE POLICY learn_progress_owner ON public.document_learn_progress
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS learn_retests_owner ON public.document_learn_pending_retests;
CREATE POLICY learn_retests_owner ON public.document_learn_pending_retests
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Academic Terms
DROP POLICY IF EXISTS terms_select ON public.academic_terms;
CREATE POLICY terms_select ON public.academic_terms
    FOR SELECT TO authenticated
    USING (university_id = public.current_user_university_id() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS terms_admin_write ON public.academic_terms;
CREATE POLICY terms_admin_write ON public.academic_terms
    FOR ALL TO authenticated
    USING (
        public.current_user_has_role('super_admin')
        OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
    );

-- Invitations
DROP POLICY IF EXISTS invitations_admin ON public.invitations;
CREATE POLICY invitations_admin ON public.invitations
    FOR ALL TO authenticated
    USING (
        public.current_user_has_role('super_admin')
        OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
    );

-- Course Knowledge & Exam Restrictions
DROP POLICY IF EXISTS course_knowledge_select ON public.course_knowledge;
CREATE POLICY course_knowledge_select ON public.course_knowledge
    FOR SELECT TO authenticated
    USING (university_id = public.current_user_university_id() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS course_knowledge_admin_write ON public.course_knowledge;
CREATE POLICY course_knowledge_admin_write ON public.course_knowledge
    FOR ALL TO authenticated
    USING (
        public.current_user_has_role('super_admin')
        OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
    );

DROP POLICY IF EXISTS exam_restrictions_select ON public.exam_restrictions;
CREATE POLICY exam_restrictions_select ON public.exam_restrictions
    FOR SELECT TO authenticated
    USING (university_id = public.current_user_university_id() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS exam_restrictions_admin_write ON public.exam_restrictions;
CREATE POLICY exam_restrictions_admin_write ON public.exam_restrictions
    FOR ALL TO authenticated
    USING (
        public.current_user_has_role('super_admin')
        OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
    );

-- AI Telemetry & Audit Logs
DROP POLICY IF EXISTS telemetry_insert_user ON public.ai_telemetry;
CREATE POLICY telemetry_insert_user ON public.ai_telemetry
    FOR INSERT TO authenticated
    WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS telemetry_select_admin ON public.ai_telemetry;
CREATE POLICY telemetry_select_admin ON public.ai_telemetry
    FOR SELECT TO authenticated
    USING (public.current_user_has_role('super_admin') OR user_id = auth.uid());

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS system_settings_history_admin ON public.system_settings_history;
CREATE POLICY system_settings_history_admin ON public.system_settings_history
    FOR ALL TO authenticated
    USING (public.current_user_has_role('super_admin'));

-- Admin Write Policies for Universities, Timetables, Skills, Settings
DROP POLICY IF EXISTS uni_admin_write ON public.universities;
CREATE POLICY uni_admin_write ON public.universities
    FOR ALL TO authenticated
    USING (public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS timetables_admin_write ON public.timetables;
CREATE POLICY timetables_admin_write ON public.timetables
    FOR ALL TO authenticated
    USING (
        public.current_user_has_role('super_admin')
        OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
    );

DROP POLICY IF EXISTS skills_admin_write ON public.ai_skills;
CREATE POLICY skills_admin_write ON public.ai_skills
    FOR ALL TO authenticated
    USING (public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS settings_admin_write ON public.system_settings;
CREATE POLICY settings_admin_write ON public.system_settings
    FOR UPDATE TO authenticated
    USING (public.current_user_has_role('super_admin'));

-- User Self-Registration Policy on public.users
DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Flashcards RLS
DROP POLICY IF EXISTS flashcards_owner ON public.flashcards;
CREATE POLICY flashcards_owner ON public.flashcards
    FOR ALL TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (user_id = auth.uid());

-- Credits RLS
DROP POLICY IF EXISTS user_credits_owner ON public.user_credits;
CREATE POLICY user_credits_owner ON public.user_credits
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS credit_ledger_owner ON public.credit_ledger;
CREATE POLICY credit_ledger_owner ON public.credit_ledger
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS credit_pricing_select ON public.credit_pricing;
CREATE POLICY credit_pricing_select ON public.credit_pricing
    FOR SELECT TO authenticated
    USING (is_active = true OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS credit_purchases_owner ON public.credit_purchases;
CREATE POLICY credit_purchases_owner ON public.credit_purchases
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.current_user_has_role('super_admin'));

CREATE POLICY credit_purchases_insert ON public.credit_purchases
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Preferences & Academic History RLS
DROP POLICY IF EXISTS user_preferences_owner ON public.user_preferences;
CREATE POLICY user_preferences_owner ON public.user_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS academic_history_owner ON public.academic_level_history;
CREATE POLICY academic_history_owner ON public.academic_level_history
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.current_user_has_role('super_admin'));

-- Exam Timetables RLS
DROP POLICY IF EXISTS exam_timetables_select ON public.exam_timetables;
CREATE POLICY exam_timetables_select ON public.exam_timetables
    FOR SELECT TO authenticated
    USING (university_id = public.current_user_university_id() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS exam_timetables_admin ON public.exam_timetables;
CREATE POLICY exam_timetables_admin ON public.exam_timetables
    FOR ALL TO authenticated
    USING (
        public.current_user_has_role('super_admin')
        OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
    );

-- Support Tickets RLS
DROP POLICY IF EXISTS support_tickets_owner ON public.support_tickets;
CREATE POLICY support_tickets_owner ON public.support_tickets
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.current_user_has_role('super_admin'))
    WITH CHECK (user_id = auth.uid() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS ticket_replies_party ON public.support_ticket_replies;
CREATE POLICY ticket_replies_party ON public.support_ticket_replies
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t
            WHERE t.id = support_ticket_replies.ticket_id
              AND (t.user_id = auth.uid() OR public.current_user_has_role('super_admin'))
        )
    );

CREATE POLICY ticket_replies_insert ON public.support_ticket_replies
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS csat_owner ON public.csat_survey_responses;
CREATE POLICY csat_owner ON public.csat_survey_responses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Email Logs & Preferences RLS
DROP POLICY IF EXISTS email_logs_admin ON public.email_logs;
CREATE POLICY email_logs_admin ON public.email_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.current_user_has_role('super_admin'));

DROP POLICY IF EXISTS email_pref_owner ON public.user_email_preferences;
CREATE POLICY email_pref_owner ON public.user_email_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 6. Stored Procedures & Functions
-- ------------------------------------------------------------------------------

-- Atomic Credit Deduction Function
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
    p_user_id uuid,
    p_action_key text,
    p_reference_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost integer;
    v_current_bal integer;
    v_new_bal integer;
BEGIN
    -- 1. Retrieve cost for action
    SELECT credit_cost INTO v_cost
    FROM public.credit_pricing
    WHERE action_key = p_action_key AND is_active = true;

    IF v_cost IS NULL THEN
        v_cost := 1;
    END IF;

    -- If action is free, return current balance
    IF v_cost = 0 THEN
        SELECT balance INTO v_current_bal FROM public.user_credits WHERE user_id = p_user_id;
        RETURN COALESCE(v_current_bal, 0);
    END IF;

    -- 2. Lock and fetch user credit balance
    SELECT balance INTO v_current_bal
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Auto-initialize if user row doesn't exist yet
    IF v_current_bal IS NULL THEN
        INSERT INTO public.user_credits (user_id, balance, lifetime_earned, lifetime_spent)
        VALUES (p_user_id, 50, 50, 0)
        RETURNING balance INTO v_current_bal;
    END IF;

    -- 3. Verify sufficient credits
    IF v_current_bal < v_cost THEN
        RAISE EXCEPTION 'Insufficient credits: user has %, but % required for %', v_current_bal, v_cost, p_action_key;
    END IF;

    v_new_bal := v_current_bal - v_cost;

    -- 4. Update user credit balance
    UPDATE public.user_credits
    SET balance = v_new_bal,
        lifetime_spent = lifetime_spent + v_cost,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- 5. Record journal entry in credit_ledger
    INSERT INTO public.credit_ledger (
        user_id,
        amount,
        balance_after,
        tx_type,
        reference_id,
        metadata
    ) VALUES (
        p_user_id,
        -v_cost,
        v_new_bal,
        'ai_chat'::public.credit_tx_type,
        p_reference_id,
        p_metadata
    );

    RETURN v_new_bal;
END;
$$;

-- 3-Pool Hybrid Search RPC with Reciprocal Rank Fusion (RRF k=60)
CREATE OR REPLACE FUNCTION public.match_documents_hybrid(
    query_text text,
    query_embedding vector(3072),
    match_threshold double precision DEFAULT 0.25,
    match_count integer DEFAULT 10,
    filter_university_id uuid DEFAULT NULL,
    filter_levels public.university_level[] DEFAULT NULL,
    filter_doc_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    chunk_index integer,
    content text,
    content_type text,
    page_start integer,
    page_end integer,
    bounding_box jsonb,
    section_id uuid,
    segment_id uuid,
    dense_score double precision,
    fts_score double precision,
    trgm_score double precision,
    rrf_score double precision
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    k CONSTANT double precision := 60.0;
BEGIN
    RETURN QUERY
    WITH
    candidate_docs AS (
        SELECT d.id
        FROM public.documents d
        WHERE d.deleted_at IS NULL
          AND d.status = 'active'
          AND (filter_university_id IS NULL OR d.university_id = filter_university_id)
          AND (filter_doc_ids IS NULL OR d.id = ANY(filter_doc_ids))
    ),
    vector_pool AS (
        SELECT
            c.id,
            1.0 - (c.embedding <=> query_embedding) AS score,
            ROW_NUMBER() OVER (ORDER BY (c.embedding <=> query_embedding) ASC) AS rank
        FROM public.document_chunks c
        JOIN candidate_docs cd ON cd.id = c.document_id
        WHERE c.embedding IS NOT NULL
          AND (1.0 - (c.embedding <=> query_embedding)) >= match_threshold
        ORDER BY c.embedding <=> query_embedding ASC
        LIMIT 40
    ),
    fts_pool AS (
        SELECT
            c.id,
            ts_rank_cd(c.content_fts, plainto_tsquery('english', query_text))::double precision AS score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.content_fts, plainto_tsquery('english', query_text)) DESC) AS rank
        FROM public.document_chunks c
        JOIN candidate_docs cd ON cd.id = c.document_id
        WHERE c.content_fts @@ plainto_tsquery('english', query_text)
        ORDER BY score DESC
        LIMIT 40
    ),
    trgm_pool AS (
        SELECT
            c.id,
            word_similarity(query_text, c.content)::double precision AS score,
            ROW_NUMBER() OVER (ORDER BY word_similarity(query_text, c.content) DESC) AS rank
        FROM public.document_chunks c
        JOIN candidate_docs cd ON cd.id = c.document_id
        WHERE word_similarity(query_text, c.content) >= 0.20
        ORDER BY score DESC
        LIMIT 40
    ),
    combined_ids AS (
        SELECT id FROM vector_pool
        UNION
        SELECT id FROM fts_pool
        UNION
        SELECT id FROM trgm_pool
    ),
    ranked_chunks AS (
        SELECT
            cid.id,
            COALESCE(vp.score, 0.0) AS dense_score,
            COALESCE(fp.score, 0.0) AS fts_score,
            COALESCE(tp.score, 0.0) AS trgm_score,
            (
                COALESCE(1.0 / (k + vp.rank), 0.0) +
                COALESCE(1.0 / (k + fp.rank), 0.0) +
                COALESCE(1.0 / (k + tp.rank), 0.0)
            ) AS rrf_score
        FROM combined_ids cid
        LEFT JOIN vector_pool vp ON vp.id = cid.id
        LEFT JOIN fts_pool fp ON fp.id = cid.id
        LEFT JOIN trgm_pool tp ON tp.id = cid.id
    )
    SELECT
        c.id AS chunk_id,
        c.document_id,
        c.chunk_index,
        c.content,
        c.content_type,
        c.page_start,
        c.page_end,
        c.bounding_box,
        c.section_id,
        c.segment_id,
        rc.dense_score,
        rc.fts_score,
        rc.trgm_score,
        rc.rrf_score
    FROM ranked_chunks rc
    JOIN public.document_chunks c ON c.id = rc.id
    ORDER BY rc.rrf_score DESC
    LIMIT match_count;
END;
$$;

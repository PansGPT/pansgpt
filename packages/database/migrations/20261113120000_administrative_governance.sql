-- Governance is API-only. Existing university administrators remain standard.
BEGIN;
ALTER TABLE public.users ADD COLUMN account_status text NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active','suspended','banned','pending_verification','pending','rejected'));
ALTER TABLE public.users ADD COLUMN status_reason text;
ALTER TABLE public.users ADD COLUMN academic_title text;
ALTER TABLE public.users ADD COLUMN phone text;
ALTER TABLE public.invitations ADD COLUMN target_email text;
ALTER TABLE public.invitations ADD COLUMN grant_admin_level text CHECK (grant_admin_level IN ('senior','standard'));
ALTER TABLE public.invitations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.universities DROP CONSTRAINT universities_status_check;
ALTER TABLE public.universities ADD CONSTRAINT universities_status_check
  CHECK (status IN ('provisioning','active','suspended','read_only','archived'));
ALTER TABLE public.universities ADD COLUMN max_storage_bytes bigint NOT NULL DEFAULT 16106127360 CHECK (max_storage_bytes > 0);
ALTER TABLE public.universities ADD COLUMN monthly_token_quota bigint NOT NULL DEFAULT 100000000 CHECK (monthly_token_quota > 0);

CREATE TABLE public.admin_memberships (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  admin_level text NOT NULL CHECK (admin_level IN ('senior','standard')),
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_memberships ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_memberships(user_id, university_id, admin_level)
SELECT id, university_id, 'standard' FROM public.users
WHERE 'university_admin'=ANY(roles) AND university_id IS NOT NULL;

CREATE TABLE public.lecturer_course_assignments (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  course_code text NOT NULL,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, university_id, course_code)
);
ALTER TABLE public.lecturer_course_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.documents ADD COLUMN parent_submission_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX documents_one_resubmission ON public.documents(parent_submission_id) WHERE parent_submission_id IS NOT NULL;
ALTER TABLE public.documents ADD COLUMN submission_cancelled_at timestamptz;
ALTER TABLE public.timetables ADD COLUMN end_time text;
ALTER TABLE public.timetables ADD COLUMN academic_session text;
ALTER TABLE public.timetables ADD COLUMN semester text CHECK (semester IN ('first','second'));
ALTER TABLE public.exam_timetables ADD COLUMN academic_session text;
ALTER TABLE public.exam_timetables ADD COLUMN semester text CHECK (semester IN ('first','second'));
ALTER TABLE public.timetables ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.exam_timetables ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.course_knowledge ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL;
UPDATE public.support_tickets t SET university_id=u.university_id FROM public.users u WHERE u.id=t.user_id;
CREATE INDEX support_tickets_university ON public.support_tickets(university_id,updated_at DESC);
CREATE POLICY governance_timetable_live ON public.timetables AS RESTRICTIVE FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (public.current_user_has_role('university_admin') OR public.current_user_has_role('super_admin')
  OR (academic_session IS NULL AND semester IS NULL) OR EXISTS(SELECT 1 FROM public.academic_terms t
    WHERE t.university_id=timetables.university_id AND (timetables.academic_session IS NULL OR t.academic_session=timetables.academic_session)
    AND (timetables.semester IS NULL OR t.semester=timetables.semester)))
);
CREATE POLICY governance_exams_live ON public.exam_timetables AS RESTRICTIVE FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (public.current_user_has_role('university_admin') OR public.current_user_has_role('super_admin')
  OR (academic_session IS NULL AND semester IS NULL) OR EXISTS(SELECT 1 FROM public.academic_terms t
    WHERE t.university_id=exam_timetables.university_id AND (exam_timetables.academic_session IS NULL OR t.academic_session=exam_timetables.academic_session)
    AND (exam_timetables.semester IS NULL OR t.semester=exam_timetables.semester)))
);
CREATE POLICY governance_knowledge_live ON public.course_knowledge AS RESTRICTIVE FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE TABLE public.governance_proposals (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  proposed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  before_values jsonb NOT NULL,
  proposed_values jsonb NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.governance_proposals ENABLE ROW LEVEL SECURITY;

-- Direct browser roles cannot bypass server-side senior/standard controls.
REVOKE INSERT, UPDATE, DELETE ON public.universities, public.academic_terms,
  public.invitations,
  public.timetables, public.exam_timetables, public.exam_restrictions,
  public.course_knowledge, public.documents, public.system_settings,
  public.system_settings_history, public.audit_logs, public.admin_memberships,
  public.lecturer_course_assignments, public.governance_proposals
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_memberships, public.lecturer_course_assignments,
  public.governance_proposals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_memberships, public.lecturer_course_assignments,
  public.governance_proposals TO service_role;

CREATE FUNCTION public.prevent_audit_rewrite() RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp AS $$
BEGIN
  -- FK anonymisation on account/tenant removal remains possible; events do not.
  IF TG_OP='UPDATE' AND NEW.id=OLD.id AND NEW.action=OLD.action
    AND NEW.target_type=OLD.target_type AND NEW.target_id IS NOT DISTINCT FROM OLD.target_id
    AND NEW.metadata=OLD.metadata AND NEW.created_at=OLD.created_at
    AND NEW.actor_email IS NOT DISTINCT FROM OLD.actor_email
    AND NEW.actor_role IS NOT DISTINCT FROM OLD.actor_role
    AND (NEW.actor_user_id IS NOT DISTINCT FROM OLD.actor_user_id OR NEW.actor_user_id IS NULL)
    AND (NEW.university_id IS NOT DISTINCT FROM OLD.university_id OR NEW.university_id IS NULL)
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Audit events are immutable';
END $$;
REVOKE ALL ON FUNCTION public.prevent_audit_rewrite() FROM PUBLIC;
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_rewrite();
CREATE INDEX governance_proposals_pending ON public.governance_proposals(created_at DESC) WHERE status='pending';
CREATE INDEX ai_telemetry_governance_university_time ON public.ai_telemetry(university_id,created_at DESC);
CREATE POLICY governance_internal_support_replies ON public.support_ticket_replies AS RESTRICTIVE FOR SELECT TO authenticated
USING (NOT is_internal_note OR public.current_user_has_role('super_admin') OR (
  public.current_user_has_role('university_admin') AND EXISTS(SELECT 1 FROM public.support_tickets t
  WHERE t.id=ticket_id AND t.university_id=public.current_user_university_id())
));
COMMIT;

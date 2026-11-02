-- Add typed recurrence details, bounded task lookups and persisted task favorites.
-- Existing legacy timetable text fields remain available for rows that cannot be parsed safely.
BEGIN;

ALTER TABLE public.timetables
    ADD COLUMN IF NOT EXISTS start_time_local time,
    ADD COLUMN IF NOT EXISTS end_time_local time,
    ADD COLUMN IF NOT EXISTS effective_from date,
    ADD COLUMN IF NOT EXISTS effective_until date;

ALTER TABLE public.student_tasks
    ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

ALTER TABLE public.timetables
    ADD CONSTRAINT timetables_local_time_order
        CHECK (
            (start_time_local IS NULL AND end_time_local IS NULL)
            OR (
                start_time_local IS NOT NULL
                AND end_time_local IS NOT NULL
                AND end_time_local > start_time_local
            )
        ),
    ADD CONSTRAINT timetables_effective_date_order
        CHECK (effective_from IS NULL OR effective_until IS NULL OR effective_until >= effective_from);

CREATE INDEX IF NOT EXISTS idx_timetables_effective_lookup
    ON public.timetables(university_id, level, day, effective_from, effective_until);

CREATE INDEX IF NOT EXISTS idx_student_tasks_due_lookup
    ON public.student_tasks(user_id, university_id, due_date, due_time)
    WHERE is_completed IS FALSE;

-- Keep client reads behind the existing RLS scopes and route all app mutations through FastAPI.
DROP POLICY IF EXISTS student_tasks_owner ON public.student_tasks;
CREATE POLICY student_tasks_owner ON public.student_tasks
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS timetables_admin_write ON public.timetables;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON TABLE public.student_tasks, public.timetables FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_tasks, public.timetables TO authenticated;

COMMIT;

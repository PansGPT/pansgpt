-- Application data mutations belong to the API, not distributed client roles.
BEGIN;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.users FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS users_update_self ON public.users;
DROP POLICY IF EXISTS users_insert_self ON public.users;
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users FOR SELECT TO authenticated
USING (deleted_at IS NULL AND (
  id = auth.uid() OR public.current_user_has_role('super_admin') OR
  (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
));
REVOKE ALL ON FUNCTION public.deduct_user_credits(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.deduct_user_credits(uuid, text, text, jsonb) SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits(uuid, text, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.increment_web_search_usage(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_web_search_usage(uuid, date) TO service_role;
COMMIT;

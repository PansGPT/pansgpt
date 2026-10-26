BEGIN;
CREATE OR REPLACE FUNCTION public.reserve_web_search_quota(p_user_id uuid, p_date date, p_limit integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, pg_temp AS $$
DECLARE reserved integer;
BEGIN
  IF p_limit < 1 THEN RETURN NULL; END IF;
  INSERT INTO public.web_search_usage(user_id,date,count) VALUES(p_user_id,p_date,0)
    ON CONFLICT(user_id,date) DO NOTHING;
  UPDATE public.web_search_usage SET count=count+1, updated_at=now()
    WHERE user_id=p_user_id AND date=p_date AND count<p_limit RETURNING count INTO reserved;
  RETURN reserved;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_web_search_quota(uuid,date,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_web_search_quota(uuid,date,integer) TO service_role;
COMMIT;

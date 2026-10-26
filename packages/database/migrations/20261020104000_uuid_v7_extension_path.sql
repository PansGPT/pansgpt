-- UUID defaults must also work inside RPCs with a restricted search_path.
-- Resolve pgcrypto from its installed extension schema, rather than inheriting
-- the caller's path or assuming pgcrypto lives in public.
DO $$
DECLARE
    crypto_schema text;
BEGIN
    SELECT n.nspname INTO STRICT crypto_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto';

    EXECUTE format(
        'ALTER FUNCTION public.uuid_generate_v7() SET search_path = pg_catalog, %I',
        crypto_schema
    );
END;
$$;

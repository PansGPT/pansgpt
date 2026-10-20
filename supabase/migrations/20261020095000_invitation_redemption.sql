BEGIN;
CREATE TABLE public.invitation_redemptions (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invitation_id,user_id)
);
ALTER TABLE public.invitation_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_redemptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.invitation_redemptions TO service_role;
COMMIT;

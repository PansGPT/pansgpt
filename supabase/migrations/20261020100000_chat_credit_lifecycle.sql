BEGIN;
CREATE UNIQUE INDEX credit_ledger_operation ON public.credit_ledger(user_id,reference_id,tx_type) WHERE reference_id IS NOT NULL;
ALTER FUNCTION public.deduct_user_credits(uuid,text,text,jsonb) RENAME TO deduct_user_credits_internal;
REVOKE ALL ON FUNCTION public.deduct_user_credits_internal(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.deduct_user_credits(p_user_id uuid,p_action_key text,p_reference_id text DEFAULT NULL,p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE balance_now integer;
BEGIN
  IF p_reference_id IS NULL THEN RAISE EXCEPTION 'An idempotency reference is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  IF EXISTS(SELECT 1 FROM public.credit_ledger WHERE user_id=p_user_id AND reference_id=p_reference_id AND tx_type='ai_chat') THEN
    SELECT balance INTO balance_now FROM public.user_credits WHERE user_id=p_user_id;
    RETURN balance_now;
  END IF;
  RETURN public.deduct_user_credits_internal(p_user_id,p_action_key,p_reference_id,p_metadata || '{"state":"reserved"}'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.deduct_user_credits(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits(uuid,text,text,jsonb) TO service_role;

CREATE FUNCTION public.refund_chat_credit(p_user_id uuid,p_reference_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE charge integer; resulting_balance integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  IF EXISTS(SELECT 1 FROM public.credit_ledger WHERE user_id=p_user_id AND reference_id=p_reference_id AND tx_type='refund') THEN RETURN; END IF;
  SELECT -amount INTO charge FROM public.credit_ledger WHERE user_id=p_user_id AND reference_id=p_reference_id AND tx_type='ai_chat' AND metadata->>'state'='reserved';
  IF charge IS NULL THEN RETURN; END IF;
  UPDATE public.user_credits SET balance=balance+charge,lifetime_spent=lifetime_spent-charge,updated_at=now()
    WHERE user_id=p_user_id RETURNING balance INTO resulting_balance;
  INSERT INTO public.credit_ledger(user_id,amount,balance_after,tx_type,reference_id,metadata)
    VALUES(p_user_id,charge,resulting_balance,'refund',p_reference_id,'{"reason":"incomplete_chat"}');
  UPDATE public.credit_ledger SET metadata=metadata || '{"state":"released"}'::jsonb WHERE user_id=p_user_id AND reference_id=p_reference_id AND tx_type='ai_chat';
END; $$;
REVOKE ALL ON FUNCTION public.refund_chat_credit(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_chat_credit(uuid,text) TO service_role;

CREATE FUNCTION public.reconcile_chat_credits() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pending record;
BEGIN
  FOR pending IN SELECT user_id,reference_id FROM public.credit_ledger WHERE tx_type='ai_chat' AND metadata->>'state'='reserved' AND created_at<now()-interval '15 minutes' LOOP
    IF EXISTS(SELECT 1 FROM public.chat_messages WHERE id::text=pending.reference_id AND role='assistant' AND length(content)>0) THEN
      UPDATE public.credit_ledger SET metadata=metadata || '{"state":"settled"}'::jsonb WHERE user_id=pending.user_id AND reference_id=pending.reference_id AND tx_type='ai_chat';
    ELSE
      PERFORM public.refund_chat_credit(pending.user_id,pending.reference_id);
    END IF;
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_chat_credits() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_chat_credits() TO service_role;
COMMIT;

-- R10: all fixtures are rolled back; no external Auth or hosted DB.
BEGIN;
DO $claim$
DECLARE
  v_unconfirmed uuid := 'f1000000-0000-4000-8000-000000000001';
  v_confirmed uuid := 'f1000000-0000-4000-8000-000000000002';
  v_wrong uuid := 'f1000000-0000-4000-8000-000000000003';
  v_access public.renderlab_account_access%rowtype;
  v_claim_count integer;
  v_claimed_at timestamptz;
BEGIN
  IF NOT has_function_privilege('service_role', 'public.renderlab_claim_beta_invitation(uuid,text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.renderlab_claim_beta_invitation(uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.renderlab_claim_beta_invitation(uuid,text)', 'EXECUTE')
  THEN RAISE EXCEPTION 'R10 invitation grant boundary drift'; END IF;
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
    (v_unconfirmed,'r10.waiting@example.invalid',NULL),
    (v_confirmed,'r10.verified@example.invalid',now()),
    (v_wrong,'r10.other@example.invalid',now());
  INSERT INTO public.renderlab_beta_invitations(normalized_email, expires_at) VALUES
    ('r10.waiting@example.invalid',now()+interval '1 day'),
    ('r10.verified@example.invalid',now()+interval '1 day');

  SELECT count(*) INTO v_claim_count FROM public.renderlab_claim_beta_invitation(
    v_unconfirmed,'r10.waiting@example.invalid');
  IF v_claim_count<>0 THEN RAISE EXCEPTION 'R10 unconfirmed email acquired access'; END IF;
  IF EXISTS (SELECT 1 FROM public.renderlab_account_access WHERE user_id=v_unconfirmed)
    OR EXISTS (SELECT 1 FROM public.renderlab_beta_invitations
      WHERE normalized_email='r10.waiting@example.invalid' AND claimed_at IS NOT NULL)
  THEN RAISE EXCEPTION 'R10 unconfirmed email consumed invitation'; END IF;

  SELECT count(*) INTO v_claim_count FROM public.renderlab_claim_beta_invitation(
    v_wrong,'r10.verified@example.invalid');
  IF v_claim_count<>0 THEN RAISE EXCEPTION 'R10 mismatched confirmed email acquired access'; END IF;

  SELECT * INTO v_access FROM public.renderlab_claim_beta_invitation(
    v_confirmed,'r10.verified@example.invalid');
  IF v_access.user_id IS DISTINCT FROM v_confirmed OR v_access.status<>'active'
  THEN RAISE EXCEPTION 'R10 confirmed matching email failed claim'; END IF;
  SELECT claimed_at INTO v_claimed_at FROM public.renderlab_beta_invitations
    WHERE normalized_email='r10.verified@example.invalid';
  IF v_claimed_at IS NULL THEN RAISE EXCEPTION 'R10 verified claim did not consume invitation'; END IF;

  UPDATE public.renderlab_account_access SET status='suspended' WHERE user_id=v_confirmed;
  SELECT * INTO v_access FROM public.renderlab_claim_beta_invitation(
    v_confirmed,'r10.verified@example.invalid');
  IF v_access.status<>'suspended' THEN RAISE EXCEPTION 'R10 claim reactivated suspended access'; END IF;
  IF (SELECT claimed_at FROM public.renderlab_beta_invitations
     WHERE normalized_email='r10.verified@example.invalid') IS DISTINCT FROM v_claimed_at
  THEN RAISE EXCEPTION 'R10 repeated claim mutated invitation'; END IF;
  RAISE NOTICE 'R10 verified-email invitation claim and grant conformance passed';
END
$claim$;
ROLLBACK;

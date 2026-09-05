-- ============================================================================
-- Feature: Tradesperson / company verification & trust layer
-- Date: 2026-09-06
--
-- ADDITIVE ONLY. This migration:
--   • creates 2 new tables (company_verification, company_verification_items)
--   • adds RLS on those new tables
--   • adds 3 functions (1 public read, 1 owner request, 1 admin review)
--
-- It does NOT touch company_profiles (columns, data, RLS, triggers, views),
-- jobs, messages, storage, the map query, or any existing function. Every
-- existing profile keeps working with zero verification rows — the read
-- function simply returns nothing and the UI shows no badge.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_review_verification_item(uuid,text,text,date,text,text);
--   DROP FUNCTION IF EXISTS public.request_company_verification();
--   DROP FUNCTION IF EXISTS public.get_company_public_verification(uuid);
--   DROP TABLE IF EXISTS public.company_verification_items;
--   DROP TABLE IF EXISTS public.company_verification;
-- ============================================================================

-- ── 1. Envelope: one review request per company ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_verification (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL UNIQUE REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'not_requested'
                     CHECK (status IN ('not_requested','pending','verified','rejected','expired','revoked')),
  requested_at     timestamptz,
  reviewed_at      timestamptz,
  reviewed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,   -- internal, shown to the tradesperson but never to the public
  admin_notes      text,   -- internal only — NEVER exposed anywhere public-facing
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.company_verification IS
  'One row per company_profiles.id — tracks the manual verification review request. Additive trust layer; a company with no row here is simply "not requested".';

-- ── 2. Per-category verified state (source of truth for public badges) ──────
CREATE TABLE IF NOT EXISTS public.company_verification_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  type               text NOT NULL
                       CHECK (type IN ('business','company_registration','insurance')),
  status             text NOT NULL DEFAULT 'not_verified'
                       CHECK (status IN ('not_verified','pending','verified','rejected','expired','revoked')),
  verified_at        timestamptz,
  expires_at         date,          -- e.g. insurance policy expiry
  verified_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_reference text,          -- e.g. 'companies_house:12345678' or the insurance doc path at review time
  rejection_reason   text,          -- internal
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, type)
);

COMMENT ON TABLE public.company_verification_items IS
  'Per-category verification status. New `type` values can be added later (e.g. gas_safe, cscs) without schema change beyond the CHECK.';

CREATE INDEX IF NOT EXISTS idx_cvi_company   ON public.company_verification_items (company_id);
CREATE INDEX IF NOT EXISTS idx_cvi_verified  ON public.company_verification_items (company_id) WHERE status = 'verified';

-- ── 3. updated_at touch trigger (local helper, safe if it already exists) ───
CREATE OR REPLACE FUNCTION public.tsv_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_company_verification_touch ON public.company_verification;
CREATE TRIGGER trg_company_verification_touch
  BEFORE UPDATE ON public.company_verification
  FOR EACH ROW EXECUTE FUNCTION public.tsv_touch_updated_at();

DROP TRIGGER IF EXISTS trg_cvi_touch ON public.company_verification_items;
CREATE TRIGGER trg_cvi_touch
  BEFORE UPDATE ON public.company_verification_items
  FOR EACH ROW EXECUTE FUNCTION public.tsv_touch_updated_at();

-- ── 4. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.company_verification       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_verification_items ENABLE ROW LEVEL SECURITY;

-- company_verification: owner may see their own row and open/re-open a request.
-- They can never write reviewed_* or a 'verified' status (WITH CHECK blocks it).
DROP POLICY IF EXISTS cv_select_own ON public.company_verification;
CREATE POLICY cv_select_own ON public.company_verification
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS cv_insert_own ON public.company_verification;
CREATE POLICY cv_insert_own ON public.company_verification
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())
    AND status IN ('not_requested','pending')
    AND reviewed_by IS NULL AND reviewed_at IS NULL
  );

DROP POLICY IF EXISTS cv_update_own_request ON public.company_verification;
CREATE POLICY cv_update_own_request ON public.company_verification
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()))
  WITH CHECK (
    company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())
    AND status IN ('not_requested','pending')
    AND reviewed_by IS NULL
  );
-- (no owner DELETE; no public SELECT — admin_notes/rejection_reason are internal.
--  Admin access is via the service-role client after getAdminUser(), and via the
--  SECURITY DEFINER RPCs below.)

-- company_verification_items: owner reads their own; only admin writes (RPC / service role).
DROP POLICY IF EXISTS cvi_select_own ON public.company_verification_items;
CREATE POLICY cvi_select_own ON public.company_verification_items
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
-- (no owner INSERT/UPDATE/DELETE — a tradesperson can never mark themselves verified.
--  no public SELECT — public reads go through get_company_public_verification().)

-- ── 5. Public read — only verified categories, expiry computed on the fly ───
CREATE OR REPLACE FUNCTION public.get_company_public_verification(p_company_id uuid)
RETURNS TABLE (type text, status text, verified_at timestamptz, expires_at date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    i.type,
    CASE
      WHEN i.type = 'insurance'
       AND i.expires_at IS NOT NULL
       AND i.expires_at < CURRENT_DATE
      THEN 'expired'
      ELSE 'verified'
    END AS status,
    i.verified_at,
    i.expires_at
  FROM public.company_verification_items i
  WHERE i.company_id = p_company_id
    AND i.status = 'verified';   -- rejected / revoked / pending are never exposed publicly
$$;
GRANT EXECUTE ON FUNCTION public.get_company_public_verification(uuid) TO anon, authenticated;

-- ── 6. Owner: request verification (blocks duplicate pending) ──────────────
CREATE OR REPLACE FUNCTION public.request_company_verification()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id uuid;
  v_status     text;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company_profiles WHERE user_id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company profile for this user';
  END IF;

  SELECT status INTO v_status FROM public.company_verification WHERE company_id = v_company_id;
  IF v_status = 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_pending');
  END IF;

  INSERT INTO public.company_verification (company_id, status, requested_at)
  VALUES (v_company_id, 'pending', now())
  ON CONFLICT (company_id) DO UPDATE SET
    status = 'pending', requested_at = now(),
    reviewed_at = NULL, reviewed_by = NULL, rejection_reason = NULL;

  -- Seed / re-open category items as pending. Never downgrade an already-verified
  -- item (re-requesting must not un-verify existing checks).
  INSERT INTO public.company_verification_items (company_id, type, status)
  SELECT v_company_id, t.type, 'pending'
  FROM (VALUES ('business'), ('insurance')) AS t(type)
  ON CONFLICT (company_id, type) DO UPDATE SET
    status = CASE WHEN public.company_verification_items.status = 'verified'
                  THEN public.company_verification_items.status ELSE 'pending' END;

  -- company_registration only applies to limited companies that gave a number.
  INSERT INTO public.company_verification_items (company_id, type, status)
  SELECT v_company_id, 'company_registration', 'pending'
  FROM public.company_profiles cp
  WHERE cp.id = v_company_id
    AND cp.business_type = 'limited_company'
    AND COALESCE(cp.company_registration_number, '') <> ''
  ON CONFLICT (company_id, type) DO UPDATE SET
    status = CASE WHEN public.company_verification_items.status = 'verified'
                  THEN public.company_verification_items.status ELSE 'pending' END;

  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END $$;
GRANT EXECUTE ON FUNCTION public.request_company_verification() TO authenticated;

-- ── 7. Admin: review one category, then roll up the envelope status ────────
CREATE OR REPLACE FUNCTION public.admin_review_verification_item(
  p_company_id uuid,
  p_type       text,
  p_decision   text,               -- 'approve' | 'reject' | 'revoke' | 'pending'
  p_expires_at date  DEFAULT NULL,
  p_reason     text  DEFAULT NULL,
  p_evidence   text  DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin   boolean;
  v_new_status text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND active = true
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF p_type NOT IN ('business','company_registration','insurance') THEN
    RAISE EXCEPTION 'Unknown verification type: %', p_type;
  END IF;

  v_new_status := CASE p_decision
    WHEN 'approve' THEN 'verified'
    WHEN 'reject'  THEN 'rejected'
    WHEN 'revoke'  THEN 'revoked'
    WHEN 'pending' THEN 'pending'
    ELSE NULL END;
  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'Unknown decision: %', p_decision;
  END IF;

  INSERT INTO public.company_verification_items
    (company_id, type, status, verified_at, expires_at, verified_by, evidence_reference, rejection_reason)
  VALUES
    (p_company_id, p_type, v_new_status,
     CASE WHEN v_new_status = 'verified' THEN now() ELSE NULL END,
     p_expires_at, auth.uid(), p_evidence,
     CASE WHEN v_new_status = 'rejected' THEN p_reason ELSE NULL END)
  ON CONFLICT (company_id, type) DO UPDATE SET
    status             = EXCLUDED.status,
    verified_at        = CASE WHEN EXCLUDED.status = 'verified' THEN now()
                              ELSE public.company_verification_items.verified_at END,
    expires_at         = COALESCE(EXCLUDED.expires_at, public.company_verification_items.expires_at),
    verified_by        = auth.uid(),
    evidence_reference = COALESCE(EXCLUDED.evidence_reference, public.company_verification_items.evidence_reference),
    rejection_reason   = EXCLUDED.rejection_reason;

  -- Envelope roll-up: verified if any item verified, else pending if any pending,
  -- else rejected if any rejected, else leave as-is.
  UPDATE public.company_verification cv SET
    status = CASE
      WHEN EXISTS (SELECT 1 FROM public.company_verification_items i
                   WHERE i.company_id = p_company_id AND i.status = 'verified') THEN 'verified'
      WHEN EXISTS (SELECT 1 FROM public.company_verification_items i
                   WHERE i.company_id = p_company_id AND i.status = 'pending')  THEN 'pending'
      WHEN EXISTS (SELECT 1 FROM public.company_verification_items i
                   WHERE i.company_id = p_company_id AND i.status = 'rejected') THEN 'rejected'
      ELSE cv.status END,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE cv.company_id = p_company_id;

  RETURN jsonb_build_object('ok', true, 'type', p_type, 'status', v_new_status);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_review_verification_item(uuid,text,text,date,text,text) TO authenticated;

DO $$ BEGIN RAISE NOTICE '✅ 20260906000001 company verification layer installed (additive)'; END $$;

-- ============================================================
-- Restore UPDATE RLS policy on reviews
-- ============================================================
-- Migration 20260304000002 dropped the UPDATE policy to make
-- reviews "immutable", but the product requires a 24-hour edit
-- window. The API handler enforces the time limit; RLS just needs
-- to allow the reviewer to update their own row.
-- ============================================================

CREATE POLICY "Reviewer can update own review"
  ON public.reviews FOR UPDATE
  USING  (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

DO $$ BEGIN
  RAISE NOTICE '✓ Review UPDATE policy restored (24-hour window enforced at API layer)';
END; $$;

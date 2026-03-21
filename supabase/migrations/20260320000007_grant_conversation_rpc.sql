-- Fix: get_or_create_conversation was rebuilt in 20260320000005 but
-- the GRANT EXECUTE was not included, so authenticated users (homeowners,
-- professionals, companies) could not call it → "Error creating conversation".

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID, TEXT)
  TO authenticated, anon;

DO $$ BEGIN
  RAISE NOTICE '✓ get_or_create_conversation — EXECUTE granted to authenticated + anon';
END $$;

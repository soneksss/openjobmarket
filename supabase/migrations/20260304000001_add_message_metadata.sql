-- ============================================================
-- Migration: Add metadata JSONB to messages
-- ============================================================
-- Enables structured message types beyond plain text.
-- Currently used for:
--   message_type = 'quote' → metadata = { amount: 150.00, currency: 'GBP' }
--
-- Intentionally a single nullable JSONB column so future
-- message types (e.g. 'file', 'location') can be added
-- without further schema changes.
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NULL;

COMMENT ON COLUMN public.messages.metadata IS
  'Structured payload for non-text message types. '
  'For message_type=''quote'': { "amount": 150.00, "currency": "GBP" }';

DO $$ BEGIN
  RAISE NOTICE '✓ messages.metadata JSONB column added';
END; $$;

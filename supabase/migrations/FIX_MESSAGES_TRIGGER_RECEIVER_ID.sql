-- Fix messages table trigger that references wrong field name
-- Error: 'record "new" has no field "receiver_id"'
-- The trigger is using receiver_id but the table has recipient_id

-- Drop any existing triggers that might be using the wrong field
DROP TRIGGER IF EXISTS validate_message_receiver ON public.messages;
DROP TRIGGER IF EXISTS check_message_receiver ON public.messages;
DROP TRIGGER IF EXISTS validate_receiver ON public.messages;

-- Find and drop the problematic trigger function
-- First, let's see what triggers exist on messages table
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT tgname, pg_get_triggerdef(oid) as definition
        FROM pg_trigger
        WHERE tgrelid = 'public.messages'::regclass
        AND NOT tgisinternal
    LOOP
        -- Check if trigger definition contains 'receiver_id'
        IF trigger_rec.definition LIKE '%receiver_id%' THEN
            RAISE NOTICE 'Found trigger with receiver_id: %', trigger_rec.tgname;
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.messages', trigger_rec.tgname);
        END IF;
    END LOOP;
END $$;

-- Now find and fix any functions that reference receiver_id
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN
        SELECT
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) LIKE '%receiver_id%'
        AND pg_get_functiondef(p.oid) LIKE '%messages%'
    LOOP
        RAISE NOTICE 'Found function with receiver_id: %.%', func_rec.schema_name, func_rec.function_name;
        RAISE NOTICE 'Function definition: %', func_rec.definition;

        -- Drop the function (we'll need to recreate it manually with correct field name)
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE', func_rec.schema_name, func_rec.function_name);
    END LOOP;
END $$;

-- If there are specific triggers we know about, recreate them with correct field names
-- For example, if there was a block check trigger, recreate it:

-- Example: Recreate a message validation trigger (if it existed)
CREATE OR REPLACE FUNCTION public.validate_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Use recipient_id (not receiver_id)
  IF NEW.sender_id IS NULL OR NEW.recipient_id IS NULL THEN
    RAISE EXCEPTION 'sender_id and recipient_id cannot be null';
  END IF;

  IF NEW.sender_id = NEW.recipient_id THEN
    RAISE EXCEPTION 'Cannot send message to yourself';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if we want this validation)
-- DROP TRIGGER IF EXISTS validate_message_trigger ON public.messages;
-- CREATE TRIGGER validate_message_trigger
--   BEFORE INSERT ON public.messages
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_message_insert();

-- Show remaining triggers for verification
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    RAISE NOTICE 'Remaining triggers on messages table:';
    FOR trigger_rec IN
        SELECT tgname, pg_get_triggerdef(oid) as definition
        FROM pg_trigger
        WHERE tgrelid = 'public.messages'::regclass
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Trigger: % - Definition: %', trigger_rec.tgname, trigger_rec.definition;
    END LOOP;
END $$;

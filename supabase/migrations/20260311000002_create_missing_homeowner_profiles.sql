-- Migration: Create missing homeowner_profiles for existing homeowner users
-- This fixes accounts created before the profile auto-creation was working correctly.

DO $$
DECLARE
  v_user RECORD;
  v_meta JSONB;
  v_first_name TEXT;
  v_last_name TEXT;
  v_location TEXT;
BEGIN
  -- Find all homeowners in the users table who have no homeowner_profiles row
  FOR v_user IN
    SELECT u.id, au.email, au.raw_user_meta_data
    FROM public.users u
    JOIN auth.users au ON au.id = u.id
    WHERE u.user_type = 'homeowner'
      AND NOT EXISTS (
        SELECT 1 FROM public.homeowner_profiles hp WHERE hp.user_id = u.id
      )
  LOOP
    v_meta := v_user.raw_user_meta_data;

    -- Extract names from auth metadata (set during signup)
    v_first_name := COALESCE(NULLIF(TRIM(v_meta->>'first_name'), ''), 'User');
    v_last_name  := COALESCE(NULLIF(TRIM(v_meta->>'last_name'),  ''), SPLIT_PART(v_user.email, '@', 1));
    v_location   := COALESCE(NULLIF(TRIM(v_meta->>'location'),   ''), NULL);

    INSERT INTO public.homeowner_profiles (
      user_id,
      first_name,
      last_name,
      location,
      created_at,
      updated_at
    ) VALUES (
      v_user.id,
      v_first_name,
      v_last_name,
      v_location,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Created homeowner_profiles for user % (%)', v_user.id, v_user.email;
  END LOOP;
END;
$$;
